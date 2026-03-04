import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import {
  getUserProducts,
  countActiveProducts,
  getMaxProducts,
  checkDuplicateProduct,
  ingestDSLDIngredients,
} from "@/lib/products/queries";
import { CreateProductSchema } from "@/lib/products/types";

// ---------------------------------------------------------------------------
// GET /api/products — list user's products
// ---------------------------------------------------------------------------

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { error: { message: "Authentication required." } },
      { status: 401 }
    );
  }

  const data = await getUserProducts(user.id);
  return Response.json({ data });
}

// ---------------------------------------------------------------------------
// POST /api/products — create a new product
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // 1. Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { error: { message: "Authentication required." } },
      { status: 401 }
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

  const { name, brand, product_type, data_source, external_id, raw_ingredients_text } =
    parsed.data;

  // 3. Plan limit check (fast-path rejection; DB trigger is the authoritative guard)
  let maxProducts: number;
  try {
    const [activeCount, max] = await Promise.all([
      countActiveProducts(user.id),
      getMaxProducts(user.id),
    ]);
    maxProducts = max;

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
    const isDuplicate = await checkDuplicateProduct(user.id, data_source, external_id);
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
      user_id: user.id,
      name,
      brand: brand ?? null,
      product_type,
      data_source,
      external_id: external_id ?? null,
      raw_ingredients_text: raw_ingredients_text ?? null,
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

  // 6. Ingest ingredients if DSLD
  let ingredientCount = 0;
  if (data_source === "dsld" && external_id) {
    ingredientCount = await ingestDSLDIngredients(product.id, parseInt(external_id, 10));
  }

  return Response.json(
    {
      data: { id: product.id, name: product.name, ingredient_count: ingredientCount },
      ...(data_source === "dsld" && ingredientCount === 0 && external_id
        ? { warning: "Ingredients could not be loaded. The product was saved but may not generate alerts." }
        : {}),
    },
    { status: 201 }
  );
}
