import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getProductById, getProductVerdicts, getIngredientUseCodes, ingestParsedIngredients } from "@/lib/products/queries";
import { UpdateProductSchema } from "@/lib/products/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { invalidateUserMatches } from "@/lib/products/matches";
import { evaluateProductHistory } from "@/lib/products/verdicts";
import { classifyProduct } from "@/lib/products/classify";
import { track } from "@/lib/analytics";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
import { isDev, DEV_USER_ID } from "@/lib/dev";

// ---------------------------------------------------------------------------
// GET /api/products/[id]
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return Response.json(
      { error: { message: "Invalid product ID." } },
      { status: 400 }
    );
  }

  const data = await getProductById(id, userId);
  if (!data) {
    return Response.json(
      { error: { message: "Product not found." } },
      { status: 404 }
    );
  }

  const verdicts = await getProductVerdicts(id, userId);

  // Fetch use context codes for ingredients with resolved substances
  const substanceIds = (data.ingredients ?? [])
    .map((ing) => ing.substance_id)
    .filter((sid): sid is string => sid !== null);
  const useCodesMap = await getIngredientUseCodes(substanceIds);
  const use_codes = Object.fromEntries(useCodesMap);

  return Response.json({ data, verdicts, use_codes });
}

// ---------------------------------------------------------------------------
// PATCH /api/products/[id]
// ---------------------------------------------------------------------------

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth first — so we can rate-limit on userId, not IP
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

  // Rate limit (10/min per user for mutations)
  if (!(await checkRateLimit(`products:patch:${userId}`, 10))) {
    return Response.json(
      { error: { message: "Too many requests. Please wait a moment." } },
      { status: 429 }
    );
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return Response.json(
      { error: { message: "Invalid product ID." } },
      { status: 400 }
    );
  }

  // Validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: "Invalid request body." } },
      { status: 400 }
    );
  }

  const parsed = UpdateProductSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Build update object
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.brand !== undefined) updates.brand = parsed.data.brand;
  if (parsed.data.product_type !== undefined) updates.product_type = parsed.data.product_type;
  if (parsed.data.manufacturer_name !== undefined) updates.manufacturer_name = parsed.data.manufacturer_name || null;
  if (parsed.data.manufacturer_fei !== undefined) updates.manufacturer_fei = parsed.data.manufacturer_fei || null;
  if (parsed.data.raw_ingredients_text !== undefined) updates.raw_ingredients_text = parsed.data.raw_ingredients_text;

  const hasProductUpdates = Object.keys(updates).length > 0;
  const hasIngredientUpdates = parsed.data.parsed_ingredients !== undefined;

  if (!hasProductUpdates && !hasIngredientUpdates) {
    return Response.json(
      { error: { message: "No fields to update." } },
      { status: 400 }
    );
  }

  // Ownership check + update (updated_at handled by DB trigger)
  if (hasProductUpdates) {
    const { data, error } = await adminClient
      .from("subscriber_products")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[products] update error:", error);
      return Response.json(
        { error: { message: "Failed to update product." } },
        { status: 500 }
      );
    }

    if (!data) {
      return Response.json(
        { error: { message: "Product not found." } },
        { status: 404 }
      );
    }
  }

  // Replace ingredients if provided
  let ingredientCount: number | undefined;
  if (hasIngredientUpdates && parsed.data.parsed_ingredients) {
    try {
      // Delete existing ingredients then insert new ones
      await adminClient
        .from("product_ingredients")
        .delete()
        .eq("product_id", id);

      ingredientCount = await ingestParsedIngredients(id, parsed.data.parsed_ingredients);
    } catch (err) {
      console.error("[products] ingredient replacement failed:", err);
      return Response.json(
        { error: { message: "Failed to update ingredients. Previous ingredients may be lost. Please re-save." } },
        { status: 500 }
      );
    }

    // Re-evaluate verdicts with new ingredients (non-blocking)
    invalidateUserMatches(userId);
    if (ingredientCount > 0) {
      evaluateProductHistory(id, userId).catch((err) =>
        console.error("[products] verdict re-evaluation error:", err)
      );
    }
  }

  // Reclassify product category if relevant fields changed (non-blocking)
  const needsReclassification =
    parsed.data.product_type !== undefined ||
    parsed.data.name !== undefined ||
    hasIngredientUpdates;

  if (needsReclassification) {
    (async () => {
      const { data: current } = await adminClient
        .from("subscriber_products")
        .select("name, brand, product_type")
        .eq("id", id)
        .single();

      if (!current) return;

      let ingredientNames: string[];
      if (hasIngredientUpdates && parsed.data.parsed_ingredients) {
        ingredientNames = parsed.data.parsed_ingredients.map((i) => i.name);
      } else {
        const { data: rows } = await adminClient
          .from("product_ingredients")
          .select("name")
          .eq("product_id", id);
        ingredientNames = (rows ?? []).map((r) => r.name);
      }

      await classifyProduct(
        id,
        { name: current.name, brand: current.brand, product_type: current.product_type, ingredients: ingredientNames },
        userId
      );
    })().catch((err) => console.error("[products] reclassification error:", err));
  }

  // Fetch updated product to return
  const { data: updated, error: fetchError } = await adminClient
    .from("subscriber_products")
    .select("id, name, brand, product_type, is_active, updated_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError || !updated) {
    return Response.json(
      { error: { message: "Product not found." } },
      { status: 404 }
    );
  }

  track(userId, "product_updated", {
    product_id: id,
    fields_updated: Object.keys(updates),
    ingredients_replaced: hasIngredientUpdates,
  });

  return Response.json({
    data: updated,
    ...(ingredientCount !== undefined ? { ingredient_count: ingredientCount } : {}),
  });
}

// ---------------------------------------------------------------------------
// DELETE /api/products/[id] — soft delete (is_active = false)
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth first — so we can rate-limit on userId, not IP
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

  // Rate limit (10/min per user for mutations)
  if (!(await checkRateLimit(`products:delete:${userId}`, 10))) {
    return Response.json(
      { error: { message: "Too many requests. Please wait a moment." } },
      { status: 429 }
    );
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return Response.json(
      { error: { message: "Invalid product ID." } },
      { status: 400 }
    );
  }

  // Soft delete (updated_at handled by DB trigger)
  const { data, error } = await adminClient
    .from("subscriber_products")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("is_active", true)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[products] soft delete error:", error);
    return Response.json(
      { error: { message: "Failed to delete product." } },
      { status: 500 }
    );
  }

  if (!data) {
    return Response.json(
      { error: { message: "Product not found." } },
      { status: 404 }
    );
  }

  invalidateUserMatches(userId);

  track(userId, "product_deleted", { product_id: id });

  return Response.json({ data: { id: data.id, deleted: true } });
}
