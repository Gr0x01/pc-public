import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import type {
  DSLDSearchResult,
  DSLDProductDetail,
  DSLDIngredient,
  ProductSummary,
  ProductDetail,
  ProductIngredientRow,
} from "./types";
import type { NormalizationStatus, ItemType } from "@/types/enums";
import type { FeedItemEnriched } from "@/lib/mock/app-data";

// ---------------------------------------------------------------------------
// DSLD Search
// ---------------------------------------------------------------------------

export async function searchDSLDProducts(
  query: string,
  limit: number
): Promise<DSLDSearchResult[]> {
  const { data, error } = await adminClient
    .from("dsld_products")
    .select("dsld_id, product_name, brand_name")
    .eq("market_status", "On Market")
    .ilike("product_name", `${query}%`)
    .order("product_name")
    .limit(limit);

  if (error) {
    console.error("[dsld-search] query error:", error);
    return [];
  }

  return data as DSLDSearchResult[];
}

// ---------------------------------------------------------------------------
// DSLD Product Detail
// ---------------------------------------------------------------------------

export async function getDSLDProduct(
  dsldId: number
): Promise<DSLDProductDetail | null> {
  const [productRes, ingredientsRes, otherRes] = await Promise.all([
    adminClient
      .from("dsld_products")
      .select(
        "dsld_id, product_name, brand_name, net_contents, serving_size, product_type, supplement_form, market_status"
      )
      .eq("dsld_id", dsldId)
      .maybeSingle(),
    adminClient
      .from("dsld_ingredients")
      .select("ingredient_name, amount, unit, group_name")
      .eq("dsld_id", dsldId)
      .order("id"),
    adminClient
      .from("dsld_other_ingredients")
      .select("other_ingredients")
      .eq("dsld_id", dsldId)
      .maybeSingle(),
  ]);

  if (productRes.error || !productRes.data) {
    if (productRes.error) console.error("[dsld-detail] product error:", productRes.error);
    return null;
  }

  return {
    ...productRes.data,
    ingredients: (ingredientsRes.data ?? []) as DSLDIngredient[],
    other_ingredients: otherRes.data?.other_ingredients ?? null,
  } as DSLDProductDetail;
}

// ---------------------------------------------------------------------------
// User Products
// ---------------------------------------------------------------------------

export async function getUserProducts(userId: string): Promise<ProductSummary[]> {
  const { data, error } = await adminClient
    .from("subscriber_products")
    .select("id, name, brand, product_type, data_source, external_id, is_active, created_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[products] getUserProducts error:", error);
    return [];
  }

  // Single extra query to count ingredients across all products — avoids N+1
  const productIds = data.map((p) => p.id);
  if (productIds.length === 0) return data.map((p) => ({ ...p, ingredient_count: 0 }));

  const countMap = new Map<string, number>();
  const { data: counts } = await adminClient
    .from("product_ingredients")
    .select("product_id")
    .in("product_id", productIds);

  if (counts) {
    for (const row of counts) {
      countMap.set(row.product_id, (countMap.get(row.product_id) ?? 0) + 1);
    }
  }

  return data.map((p) => ({
    ...p,
    ingredient_count: countMap.get(p.id) ?? 0,
  })) as ProductSummary[];
}

export async function getProductById(
  productId: string,
  userId: string
): Promise<ProductDetail | null> {
  const { data: product, error } = await adminClient
    .from("subscriber_products")
    .select(
      "id, name, brand, product_type, product_category_id, data_source, external_id, raw_ingredients_text, is_active, created_at, updated_at"
    )
    .eq("id", productId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !product) {
    if (error) console.error("[products] getProductById error:", error);
    return null;
  }

  const [ingredientsRes, imagesRes] = await Promise.all([
    adminClient
      .from("product_ingredients")
      .select(
        "id, name, normalized_name, substance_id, amount, unit, sort_order, normalization_status, normalization_confidence"
      )
      .eq("product_id", productId)
      .order("sort_order"),
    adminClient
      .from("product_images")
      .select("id, storage_path, sort_order")
      .eq("product_id", productId)
      .order("sort_order"),
  ]);

  return {
    ...product,
    ingredients: (ingredientsRes.data ?? []) as ProductIngredientRow[],
    images: (imagesRes.data ?? []) as { id: string; storage_path: string; sort_order: number }[],
  } as ProductDetail;
}

export async function countActiveProducts(userId: string): Promise<number> {
  const { count, error } = await adminClient
    .from("subscriber_products")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    console.error("[products] countActiveProducts error:", error);
    throw new Error("Failed to count products");
  }

  return count ?? 0;
}

export async function getMaxProducts(userId: string): Promise<number> {
  const { data, error } = await adminClient
    .from("users")
    .select("max_products")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("[products] getMaxProducts error:", error);
    throw new Error("Failed to fetch product limit");
  }
  if (!data) return 1; // genuinely missing user row
  return data.max_products;
}

export async function checkDuplicateProduct(
  userId: string,
  dataSource: string,
  externalId: string
): Promise<boolean> {
  const { count } = await adminClient
    .from("subscriber_products")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("data_source", dataSource)
    .eq("external_id", externalId)
    .eq("is_active", true);

  return (count ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Substance Resolution (reuses find_substance_by_name RPC)
// ---------------------------------------------------------------------------

interface SubstanceMatch {
  substance_id: string | null;
  normalized_name: string | null;
  normalization_status: NormalizationStatus;
  normalization_confidence: number | null;
}

export async function resolveSubstance(name: string): Promise<SubstanceMatch> {
  if (!name.trim()) {
    return {
      substance_id: null,
      normalized_name: null,
      normalization_status: "unmatched",
      normalization_confidence: null,
    };
  }

  try {
    const { data, error } = await adminClient.rpc("find_substance_by_name", {
      query_name: name,
    });

    if (error || !data || data.length === 0) {
      return {
        substance_id: null,
        normalized_name: null,
        normalization_status: "unmatched",
        normalization_confidence: null,
      };
    }

    const best = data.reduce(
      (
        a: { similarity_score: number; substance_id: string; canonical_name: string },
        b: { similarity_score: number; substance_id: string; canonical_name: string }
      ) => (b.similarity_score > a.similarity_score ? b : a)
    );

    const score = best.similarity_score;
    let status: NormalizationStatus;
    if (score >= 0.8) status = "matched";
    else if (score >= 0.5) status = "ambiguous";
    else status = "unmatched";

    return {
      substance_id: status === "unmatched" ? null : best.substance_id,
      normalized_name: best.canonical_name,
      normalization_status: status,
      normalization_confidence: score,
    };
  } catch (err) {
    console.warn(`[products] substance resolution error for "${name}":`, err);
    return {
      substance_id: null,
      normalized_name: null,
      normalization_status: "unmatched",
      normalization_confidence: null,
    };
  }
}

// ---------------------------------------------------------------------------
// Ingredient Ingestion (from DSLD data)
// ---------------------------------------------------------------------------

export async function ingestDSLDIngredients(
  productId: string,
  dsldId: number
): Promise<number> {
  // Fetch DSLD ingredients
  const { data: dsldIngredients } = await adminClient
    .from("dsld_ingredients")
    .select("ingredient_name, amount, unit")
    .eq("dsld_id", dsldId)
    .order("id");

  if (!dsldIngredients || dsldIngredients.length === 0) return 0;

  // Resolve all substances in parallel
  const resolutions = await Promise.all(
    dsldIngredients.map((ing) => resolveSubstance(ing.ingredient_name))
  );

  // Build ingredient rows
  const rows = dsldIngredients.map((ing, i) => ({
    product_id: productId,
    name: ing.ingredient_name,
    normalized_name: resolutions[i].normalized_name,
    substance_id: resolutions[i].substance_id,
    amount: ing.amount,
    unit: ing.unit,
    sort_order: i + 1,
    normalization_status: resolutions[i].normalization_status,
    normalization_confidence: resolutions[i].normalization_confidence,
    normalization_method: resolutions[i].substance_id ? "fuzzy" : null,
  }));

  const { error } = await adminClient
    .from("product_ingredients")
    .insert(rows);

  if (error) {
    console.error("[products] ingestDSLDIngredients error:", error);
    return 0;
  }

  return rows.length;
}

// ---------------------------------------------------------------------------
// Ingredient Ingestion (from vision-parsed or manual entry)
// ---------------------------------------------------------------------------

export async function ingestParsedIngredients(
  productId: string,
  ingredients: { name: string; amount?: string; unit?: string }[]
): Promise<number> {
  if (ingredients.length === 0) return 0;

  // Resolve substances in batches of 25 to avoid overwhelming the connection pool
  const BATCH_SIZE = 25;
  const resolutions: Awaited<ReturnType<typeof resolveSubstance>>[] = [];
  for (let i = 0; i < ingredients.length; i += BATCH_SIZE) {
    const batch = ingredients.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((ing) => resolveSubstance(ing.name)));
    resolutions.push(...results);
  }

  const rows = ingredients.map((ing, i) => ({
    product_id: productId,
    name: ing.name,
    normalized_name: resolutions[i].normalized_name,
    substance_id: resolutions[i].substance_id,
    amount: ing.amount ?? null,
    unit: ing.unit ?? null,
    sort_order: i + 1,
    normalization_status: resolutions[i].normalization_status,
    normalization_confidence: resolutions[i].normalization_confidence,
    normalization_method: resolutions[i].substance_id ? "fuzzy" : null,
  }));

  const { error } = await adminClient
    .from("product_ingredients")
    .insert(rows);

  if (error) {
    console.error("[products] ingestParsedIngredients error:", error);
    return 0;
  }

  return rows.length;
}

// ---------------------------------------------------------------------------
// Feed: regulatory items with verdict data for a user
// ---------------------------------------------------------------------------

/**
 * Fetch recent regulatory items for the feed, enriched with verdict data.
 * Items the user's products match get `matched_products` populated.
 * Returns most recent items first, up to `limit`.
 */
export async function getFeedItems(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<FeedItemEnriched[]> {
  const { limit = 50, offset = 0 } = options;

  // Fetch recent enriched items
  const { data: items, error } = await adminClient
    .from("regulatory_items")
    .select(`
      id, title, item_type, published_date, source_url, issuing_office,
      item_enrichments(summary, regulatory_action_type, deadline, raw_response)
    `)
    .not("item_enrichments", "is", null)
    .order("published_date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !items) {
    console.error("[feed] query error:", error);
    return [];
  }

  // Fetch verdicts for this user for these items
  const itemIds = items.map((i) => i.id);
  const { data: verdicts } = await adminClient
    .from("product_match_verdicts")
    .select("item_id, product_id, relevant, reasoning, subscriber_products(id, name)")
    .eq("user_id", userId)
    .eq("relevant", true)
    .in("item_id", itemIds);

  // Group verdicts by item_id
  const verdictMap = new Map<string, Array<{ id: string; name: string }>>();
  for (const v of verdicts ?? []) {
    const product = v.subscriber_products as unknown as { id: string; name: string } | null;
    if (!product) continue;
    const list = verdictMap.get(v.item_id) ?? [];
    list.push({ id: product.id, name: product.name });
    verdictMap.set(v.item_id, list);
  }

  return items.map((item) => {
    const enrichment = (item.item_enrichments as unknown as Array<{
      summary: string | null;
      regulatory_action_type: string | null;
      deadline: string | null;
      raw_response: Record<string, unknown> | null;
    }> | null)?.[0] ?? null;

    const raw = enrichment?.raw_response;
    const actionItems = (raw?.action_items as string[] | undefined) ?? null;

    return {
      id: item.id,
      title: item.title,
      item_type: item.item_type as ItemType,
      published_date: item.published_date,
      source_url: item.source_url,
      issuing_office: item.issuing_office,
      summary: enrichment?.summary ?? null,
      urgency_score: null,
      relevance: verdictMap.has(item.id) ? "high" as const : null,
      impact_summary: null,
      action_items: actionItems,
      deadline: enrichment?.deadline ?? null,
      matched_products: verdictMap.get(item.id) ?? [],
    };
  });
}
