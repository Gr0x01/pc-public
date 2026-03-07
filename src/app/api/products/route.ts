import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import {
  getUserProducts,
  countActiveProducts,
  getMaxProducts,
  checkDuplicateProduct,
  ingestDSLDIngredients,
  ingestParsedIngredients,
} from "@/lib/products/queries";
import { CreateProductSchema } from "@/lib/products/types";
import { evaluateProductHistory } from "@/lib/products/verdicts";
import { invalidateUserMatches } from "@/lib/products/matches";
import { classifyProduct } from "@/lib/products/classify";
import { checkRateLimit } from "@/lib/rate-limit";
import { track } from "@/lib/analytics";
import { isDev, DEV_USER_ID } from "@/lib/dev";
import { compileWelcome } from "@/lib/email/compiler";
import { sendEmail } from "@/lib/email/sender";

// ---------------------------------------------------------------------------
// GET /api/products — list user's products
// ---------------------------------------------------------------------------

export async function GET() {
  let userId: string;
  if (isDev) {
    userId = DEV_USER_ID;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json(
        { error: { message: "Authentication required." } },
        { status: 401 }
      );
    }
    userId = user.id;
  }

  if (!(await checkRateLimit(`products:list:${userId}`, 30))) {
    return Response.json(
      { error: { message: "Too many requests. Please wait a moment." } },
      { status: 429 }
    );
  }

  const data = await getUserProducts(userId);
  return Response.json({ data });
}

// ---------------------------------------------------------------------------
// POST /api/products — create a new product
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // 1. Auth
  let userId: string;
  if (isDev) {
    userId = DEV_USER_ID;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json(
        { error: { message: "Authentication required." } },
        { status: 401 }
      );
    }
    userId = user.id;
  }

  if (!(await checkRateLimit(`products:create:${userId}`, 10))) {
    return Response.json(
      { error: { message: "Too many requests. Please wait a moment." } },
      { status: 429 }
    );
  }

  // 2. Validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: "Invalid request body." } },
      { status: 400 }
    );
  }

  const parsed = CreateProductSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    name, brand, product_type, data_source, external_id,
    raw_ingredients_text, image_paths, parsed_ingredients,
    manufacturer_name, manufacturer_fei,
  } = parsed.data;

  // 3. Plan limit check (fast-path rejection; DB trigger is the authoritative guard)
  let maxProducts: number;
  let activeCountBefore: number;
  try {
    const [activeCount, max] = await Promise.all([
      countActiveProducts(userId),
      getMaxProducts(userId),
    ]);
    maxProducts = max;
    activeCountBefore = activeCount;

    if (activeCount >= maxProducts) {
      return Response.json(
        {
          error: {
            message: `Product limit reached (${maxProducts}). Upgrade your plan to add more products.`,
            code: "PLAN_LIMIT",
          },
        },
        { status: 403 }
      );
    }
  } catch (err) {
    console.error("[products] plan limit check failed:", err);
    return Response.json(
      { error: { message: "Unable to verify product limit. Please try again." } },
      { status: 500 }
    );
  }

  // 4. Duplicate check for external-source products (fast-path; unique index is the guard)
  if (data_source !== "manual" && external_id) {
    const isDuplicate = await checkDuplicateProduct(userId, data_source, external_id);
    if (isDuplicate) {
      return Response.json(
        {
          error: {
            message: "This product has already been added to your account.",
            code: "DUPLICATE",
          },
        },
        { status: 409 }
      );
    }
  }

  // 5. Insert product
  const { data: product, error: insertError } = await adminClient
    .from("subscriber_products")
    .insert({
      user_id: userId,
      name,
      brand: brand ?? null,
      product_type,
      data_source,
      external_id: external_id ?? null,
      raw_ingredients_text: raw_ingredients_text ?? null,
      manufacturer_name: manufacturer_name ?? null,
      manufacturer_fei: manufacturer_fei || null,
    })
    .select("id, name")
    .single();

  if (insertError || !product) {
    // DB trigger "enforce_max_products" raises check_violation (23514) on plan limit race
    if (insertError?.code === "23514") {
      return Response.json(
        {
          error: {
            message: `Product limit reached (${maxProducts}). Upgrade your plan to add more products.`,
            code: "PLAN_LIMIT",
          },
        },
        { status: 403 }
      );
    }
    // Unique constraint violation (23505) on (user_id, data_source, external_id) race
    if (insertError?.code === "23505") {
      return Response.json(
        {
          error: {
            message: "This product has already been added to your account.",
            code: "DUPLICATE",
          },
        },
        { status: 409 }
      );
    }
    console.error("[products] insert error:", insertError);
    return Response.json(
      { error: { message: "Failed to create product." } },
      { status: 500 }
    );
  }

  // 6. Insert product images (if any)
  if (image_paths && image_paths.length > 0) {
    const imageRows = image_paths.map((path, i) => ({
      product_id: product.id,
      storage_path: path,
      sort_order: i,
    }));
    const { error: imgError } = await adminClient
      .from("product_images")
      .insert(imageRows);
    if (imgError) {
      console.error("[products] product_images insert error:", imgError);
      // Non-fatal — product already created
    }
  }

  // 7. Ingest ingredients
  let ingredientCount = 0;
  if (data_source === "dsld" && external_id) {
    ingredientCount = await ingestDSLDIngredients(product.id, parseInt(external_id, 10));
  } else if (parsed_ingredients && parsed_ingredients.length > 0) {
    ingredientCount = await ingestParsedIngredients(product.id, parsed_ingredients);
  }

  // 8. Invalidate match cache + evaluate historical regulatory items (non-blocking)
  invalidateUserMatches(userId);
  if (ingredientCount > 0) {
    evaluateProductHistory(product.id, userId).catch((err) =>
      console.error("[products] verdict evaluation error:", err)
    );
  }

  // 8b. Classify product into a product category (non-blocking)
  (async () => {
    let ingredientNames: string[];
    if (parsed_ingredients && parsed_ingredients.length > 0) {
      ingredientNames = parsed_ingredients.map((i) => i.name);
    } else if (ingredientCount > 0) {
      // DSLD products: ingredients were ingested in step 7, fetch them
      const { data: rows } = await adminClient
        .from("product_ingredients")
        .select("name")
        .eq("product_id", product.id);
      ingredientNames = (rows ?? []).map((r) => r.name);
    } else {
      ingredientNames = [];
    }
    await classifyProduct(product.id, { name, brand, product_type, ingredients: ingredientNames }, userId);
  })().catch((err) => console.error("[products] classification error:", err));

  const ingredientsFailed =
    (data_source === "dsld" && ingredientCount === 0 && external_id) ||
    (parsed_ingredients && parsed_ingredients.length > 0 && ingredientCount === 0);

  // Track time since signup for activation metrics
  const { data: userData } = await adminClient
    .from("users")
    .select("created_at")
    .eq("id", userId)
    .single();

  const signupToProductMs = userData?.created_at
    ? Date.now() - new Date(userData.created_at).getTime()
    : undefined;

  track(userId, "product_created", {
    product_id: product.id,
    product_type,
    data_source,
    ingredient_count: ingredientCount,
    is_first_product: activeCountBefore === 0,
    ...(activeCountBefore === 0 && signupToProductMs !== undefined
      ? { time_to_first_product_hours: Math.round(signupToProductMs / 3_600_000 * 10) / 10 }
      : {}),
  });

  // 9. Send monitoring-active confirmation on first product (non-blocking)
  if (activeCountBefore === 0) {
    sendMonitoringActiveEmail(userId, maxProducts).catch((err) =>
      console.error("[products] monitoring-active email error:", err)
    );
  }

  return Response.json(
    {
      data: { id: product.id, name: product.name, ingredient_count: ingredientCount },
      ...(ingredientsFailed
        ? { warning: "Ingredients could not be saved. The product was created but may not generate alerts." }
        : {}),
    },
    { status: 201 }
  );
}

// ---------------------------------------------------------------------------
// Monitoring-active email — fires once after the user's first product is added
// ---------------------------------------------------------------------------

async function sendMonitoringActiveEmail(userId: string, maxProducts: number) {
  const [{ data: user }, { data: products }] = await Promise.all([
    adminClient
      .from("users")
      .select("first_name, email")
      .eq("id", userId)
      .single(),
    adminClient
      .from("subscriber_products")
      .select("id, name")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
  ]);

  if (!user?.email || !user?.first_name || !products?.length) return;

  const { subject, html } = await compileWelcome({
    first_name: user.first_name,
    products: products.map((p) => ({ id: p.id, name: p.name })),
    max_products: maxProducts,
  });

  const result = await sendEmail({
    to: user.email,
    subject,
    html,
    tags: [{ name: "email_type", value: "monitoring_active" }],
  });

  if (result.success) {
    track(userId, "monitoring_active_email_sent", { product_count: products.length });
  } else {
    console.error("[products] monitoring-active email send failed:", result.error);
  }
}
