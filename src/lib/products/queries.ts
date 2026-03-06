import "server-only";
import { cache } from "react";
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
import type { FeedItemEnriched, ItemDetailData } from "@/lib/mock/app-data";
import { getLifecycleState, isLiveState, type LifecycleState } from "@/lib/utils/lifecycle";

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

export const getUserProducts = cache(async function getUserProducts(userId: string): Promise<ProductSummary[]> {
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
});

export const getProductById = cache(async function getProductById(
  productId: string,
  userId: string
): Promise<ProductDetail | null> {
  const { data: product, error } = await adminClient
    .from("subscriber_products")
    .select(
      "id, name, brand, product_type, product_category_id, data_source, external_id, raw_ingredients_text, manufacturer_name, manufacturer_fei, is_active, created_at, updated_at"
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
});

export const countActiveProducts = cache(async function countActiveProducts(userId: string): Promise<number> {
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
});

export const getMaxProducts = cache(async function getMaxProducts(userId: string): Promise<number> {
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
});

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

export interface FeedFilters {
  type?: string | null;
  range?: string | null;
  myProducts?: boolean;
  showArchived?: boolean;
}

export interface FeedPage {
  items: FeedItemEnriched[];
  hasMore: boolean;
}

const TYPE_GROUPS: Record<string, string[]> = {
  rule: ["rule", "proposed_rule"],
  notice: ["notice", "guidance", "draft_guidance"],
};

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

/**
 * Fetch a page of regulatory feed items with DB-level filtering.
 * Filters are applied in the SQL query so pagination is correct.
 */
export async function getFeedItems(
  userId: string,
  options: { limit?: number; offset?: number; filters?: FeedFilters } = {}
): Promise<FeedPage> {
  const { limit = 25, offset = 0, filters = {} } = options;
  const { type, range, myProducts, showArchived } = filters;

  // When myProducts is on, pre-fetch item IDs that have relevant verdicts
  let myProductItemIds: string[] | null = null;
  if (myProducts) {
    const { data: verdictRows } = await adminClient
      .from("product_match_verdicts")
      .select("item_id")
      .eq("user_id", userId)
      .eq("relevant", true);

    myProductItemIds = [...new Set((verdictRows ?? []).map((r) => r.item_id))];
    if (myProductItemIds.length === 0) {
      return { items: [], hasMore: false };
    }
  }

  // Build query
  let query = adminClient
    .from("regulatory_items")
    .select(`
      id, title, item_type, published_date, source_url, issuing_office,
      item_enrichments(summary, regulatory_action_type, deadline, raw_response)
    `)
    .not("item_enrichments", "is", null)
    .order("published_date", { ascending: false })
    .range(offset, offset + limit); // fetch limit+1 to detect hasMore

  // Date floor — 120d unless showing archived
  if (!showArchived) {
    const floor = new Date();
    floor.setDate(floor.getDate() - 120);
    query = query.gte("published_date", floor.toISOString().slice(0, 10));
  }

  // Type filter
  if (type) {
    const types = TYPE_GROUPS[type] ?? [type];
    query = types.length === 1
      ? query.eq("item_type", types[0])
      : query.in("item_type", types);
  }

  // Date range filter
  if (range && RANGE_DAYS[range]) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range]);
    query = query.gte("published_date", cutoff.toISOString().slice(0, 10));
  }

  // My Products filter — restrict to items with relevant verdicts
  if (myProductItemIds) {
    query = query.in("id", myProductItemIds);
  }

  const { data: rawItems, error } = await query;

  if (error || !rawItems) {
    console.error("[feed] query error:", error);
    return { items: [], hasMore: false };
  }

  // We fetched limit+1 rows — if we got more than limit, there's another page
  const hasMore = rawItems.length > limit;
  const items = hasMore ? rawItems.slice(0, limit) : rawItems;

  // Fetch verdicts for display (matched product badges)
  const itemIds = items.map((i) => i.id);
  const verdictMap = new Map<string, Array<{ id: string; name: string }>>();

  if (itemIds.length > 0) {
    const { data: verdicts } = await adminClient
      .from("product_match_verdicts")
      .select("item_id, product_id, relevant, reasoning, subscriber_products(id, name)")
      .eq("user_id", userId)
      .eq("relevant", true)
      .in("item_id", itemIds);

    for (const v of verdicts ?? []) {
      const product = v.subscriber_products as unknown as { id: string; name: string } | null;
      if (!product) continue;
      const list = verdictMap.get(v.item_id) ?? [];
      list.push({ id: product.id, name: product.name });
      verdictMap.set(v.item_id, list);
    }
  }

  const enrichedItems = items.map((item) => {
    const enrichment = parseEnrichment(item.item_enrichments);
    const raw = enrichment?.raw_response;
    const actionItems = (raw?.action_items as string[] | undefined) ?? null;
    const deadline = enrichment?.deadline ?? null;
    const lifecycle_state = getLifecycleState(
      { item_type: item.item_type, published_date: item.published_date, deadline },
    );

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
      deadline,
      lifecycle_state,
      matched_products: verdictMap.get(item.id) ?? [],
    };
  });

  return { items: enrichedItems, hasMore };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ParsedEnrichment {
  id: string;
  summary: string | null;
  regulatory_action_type: string | null;
  deadline: string | null;
  raw_response: Record<string, unknown> | null;
  confidence: number | null;
  enrichment_model: string | null;
  enrichment_version: number;
  verification_status: string | null;
  key_regulations: string[] | null;
  key_entities: string[] | null;
}

function parseEnrichment(raw: unknown): ParsedEnrichment | null {
  if (!raw) return null;
  // Supabase returns nested relations as array; handle single object too
  const e = Array.isArray(raw) ? raw[0] : raw;
  if (!e || typeof e !== "object") return null;
  return {
    id: (e.id as string) ?? "",
    summary: (e.summary as string) ?? null,
    regulatory_action_type: (e.regulatory_action_type as string) ?? null,
    deadline: (e.deadline as string) ?? null,
    raw_response: (e.raw_response as Record<string, unknown>) ?? null,
    confidence: (e.confidence as number) ?? null,
    enrichment_model: (e.enrichment_model as string) ?? null,
    enrichment_version: (e.enrichment_version as number) ?? 1,
    verification_status: (e.verification_status as string) ?? null,
    key_regulations: (e.key_regulations as string[]) ?? null,
    key_entities: (e.key_entities as string[]) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Item detail: single regulatory item with full enrichment + verdicts
// ---------------------------------------------------------------------------

export const getItemDetail = cache(async function getItemDetail(
  itemId: string,
  userId: string
): Promise<ItemDetailData | null> {
  const { data: item, error } = await adminClient
    .from("regulatory_items")
    .select(`
      id, title, item_type, published_date, source_url, issuing_office,
      action_text, cfr_references, jurisdiction, jurisdiction_state,
      effective_date, comment_deadline, docket_number, fr_citation,
      processing_status,
      enforcement_company_name, enforcement_company_address,
      enforcement_products, enforcement_violation_types,
      enforcement_cited_regulations, enforcement_fei_number,
      enforcement_marcs_cms_number, enforcement_recall_classification,
      enforcement_recall_status, enforcement_distribution_pattern,
      enforcement_product_quantity,
      created_at, updated_at,
      item_enrichments(
        id, summary, key_regulations, key_entities, enrichment_model,
        enrichment_version, confidence, verification_status, raw_response,
        regulatory_action_type, deadline, created_at
      )
    `)
    .eq("id", itemId)
    .maybeSingle();

  if (error || !item) return null;

  // Substances
  const { data: substances } = await adminClient
    .from("regulatory_item_substances")
    .select("raw_substance_name")
    .eq("regulatory_item_id", itemId);

  // Verdicts for this user
  const { data: verdicts } = await adminClient
    .from("product_match_verdicts")
    .select("product_id, relevant, subscriber_products(id, name)")
    .eq("item_id", itemId)
    .eq("user_id", userId)
    .eq("relevant", true);

  const matchedProducts = (verdicts ?? [])
    .map((v) => {
      const p = v.subscriber_products as unknown as { id: string; name: string } | null;
      return p ? { id: p.id, name: p.name } : null;
    })
    .filter((p): p is { id: string; name: string } => p !== null);

  const enrichmentRaw = parseEnrichment(item.item_enrichments);
  const raw = enrichmentRaw?.raw_response;
  const actionItems = Array.isArray(raw?.action_items) ? (raw!.action_items as string[]) : null;

  const enrichment = enrichmentRaw
    ? {
        id: enrichmentRaw.id,
        item_id: itemId,
        summary: enrichmentRaw.summary ?? "",
        key_regulations: enrichmentRaw.key_regulations,
        key_entities: enrichmentRaw.key_entities,
        enrichment_model: enrichmentRaw.enrichment_model ?? "unknown",
        enrichment_version: enrichmentRaw.enrichment_version,
        confidence: enrichmentRaw.confidence,
        verification_status: (enrichmentRaw.verification_status ?? "unverified") as "unverified" | "verified" | "rejected",
        raw_response: enrichmentRaw.raw_response,
        regulatory_action_type: enrichmentRaw.regulatory_action_type,
        deadline: enrichmentRaw.deadline,
        created_at: item.created_at,
      }
    : null;

  return {
    item: item as unknown as ItemDetailData["item"],
    enrichment,
    relevance: matchedProducts.length > 0 ? "high" : null,
    action_items: actionItems,
    substances: (substances ?? []).map((s) => ({ raw_substance_name: s.raw_substance_name })),
    matched_products: matchedProducts,
  };
});

// ---------------------------------------------------------------------------
// Product verdicts: regulatory items with relevant verdicts for a product
// ---------------------------------------------------------------------------

export type VerdictResolution = "resolved" | "not_applicable" | "watching" | null;

export interface ProductVerdictItem {
  id: string; // verdict composite key: item_id
  item_id: string;
  reasoning: string;
  evaluated_at: string;
  resolution: VerdictResolution;
  resolved_at: string | null;
  title: string;
  item_type: string;
  published_date: string;
  source_url: string | null;
  issuing_office: string | null;
  summary: string | null;
  action_items: string[] | null;
  deadline: string | null;
  regulatory_action_type: string | null;
  lifecycle_state: LifecycleState;
  substance_ids: string[];
  has_cross_reference: boolean;
}

export const getProductVerdicts = cache(async function getProductVerdicts(
  productId: string,
  userId: string
): Promise<ProductVerdictItem[]> {
  const { data: verdicts, error } = await adminClient
    .from("product_match_verdicts")
    .select(`
      item_id, reasoning, evaluated_at, resolution, resolved_at,
      regulatory_items(
        id, title, item_type, published_date, source_url, issuing_office,
        item_enrichments(summary, regulatory_action_type, deadline, raw_response),
        regulatory_item_substances(substance_id),
        item_enrichment_tags(signal_source)
      )
    `)
    .eq("product_id", productId)
    .eq("user_id", userId)
    .eq("relevant", true)
    .order("evaluated_at", { ascending: false });

  if (error || !verdicts) {
    console.error("[products] getProductVerdicts error:", error);
    return [];
  }

  return verdicts
    .map((v) => {
      const item = v.regulatory_items as unknown as {
        id: string;
        title: string;
        item_type: string;
        published_date: string;
        source_url: string | null;
        issuing_office: string | null;
        item_enrichments: Array<{
          summary: string | null;
          regulatory_action_type: string | null;
          deadline: string | null;
          raw_response: Record<string, unknown> | null;
        }> | null;
        regulatory_item_substances: Array<{ substance_id: string }> | null;
        item_enrichment_tags: Array<{ signal_source: string | null }> | null;
      } | null;
      if (!item) return null;

      const enrichment = item.item_enrichments?.[0] ?? null;
      const raw = enrichment?.raw_response;
      const actionItems = Array.isArray(raw?.action_items) ? (raw!.action_items as string[]) : null;

      const deadline = enrichment?.deadline ?? null;
      const lifecycle_state = getLifecycleState(
        { item_type: item.item_type, published_date: item.published_date, deadline },
      );

      return {
        id: v.item_id,
        item_id: v.item_id,
        reasoning: v.reasoning,
        evaluated_at: v.evaluated_at,
        resolution: (v.resolution as VerdictResolution) ?? null,
        resolved_at: v.resolved_at ?? null,
        title: item.title,
        item_type: item.item_type,
        published_date: item.published_date,
        source_url: item.source_url,
        issuing_office: item.issuing_office,
        summary: enrichment?.summary ?? null,
        action_items: actionItems,
        deadline,
        regulatory_action_type: enrichment?.regulatory_action_type ?? null,
        lifecycle_state,
        substance_ids: (item.regulatory_item_substances ?? []).map((s) => s.substance_id),
        has_cross_reference: (item.item_enrichment_tags ?? []).some(
          (t) => t.signal_source === "cross_reference"
        ),
      };
    })
    .filter((v): v is ProductVerdictItem => v !== null);
});

/**
 * Get verdict counts per product for deriving sidebar status.
 */
export const getProductVerdictCounts = cache(async function getProductVerdictCounts(
  userId: string
): Promise<Map<string, { total: number; urgent: number; watching: number }>> {
  const { data, error } = await adminClient.rpc("get_live_verdict_counts", {
    p_user_id: userId,
  });

  if (error || !data) return new Map();

  const counts = new Map<string, { total: number; urgent: number; watching: number }>();
  for (const row of data as Array<{ product_id: string; total: number; urgent: number; watching: number }>) {
    counts.set(row.product_id, { total: row.total, urgent: row.urgent, watching: row.watching });
  }
  return counts;
});

// ---------------------------------------------------------------------------
// Ingredient Use Codes (from GSRS substance_codes)
// ---------------------------------------------------------------------------

const RELEVANT_CODE_SYSTEMS = [
  "CFR", "DSLD", "JECFA", "CODEX", "RXCUI", "DRUG BANK", "DAILYMED", "EPA PESTICIDE",
];

const CODE_SYSTEM_LABELS: Record<string, string> = {
  CFR: "CFR",
  DSLD: "Supplement (DSLD)",
  JECFA: "Food Additive (JECFA)",
  CODEX: "Codex Alimentarius",
  RXCUI: "Pharmaceutical (RxNorm)",
  "DRUG BANK": "Drug (DrugBank)",
  DAILYMED: "Drug Label (DailyMed)",
  "EPA PESTICIDE": "Pesticide (EPA)",
};

export async function getIngredientUseCodes(
  substanceIds: string[]
): Promise<Map<string, string[]>> {
  if (substanceIds.length === 0) return new Map();

  const { data, error } = await adminClient
    .from("substance_codes")
    .select("substance_id, code_system")
    .in("substance_id", substanceIds)
    .in("code_system", RELEVANT_CODE_SYSTEMS);

  if (error || !data) return new Map();

  const result = new Map<string, string[]>();
  for (const row of data) {
    const label = CODE_SYSTEM_LABELS[row.code_system] ?? row.code_system;
    const existing = result.get(row.substance_id) ?? [];
    if (!existing.includes(label)) {
      existing.push(label);
      result.set(row.substance_id, existing);
    }
  }
  return result;
}
