import "server-only";
import { adminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProductMatch {
  item_id: string;
  title: string;
  item_type: string;
  published_date: string;
  source_url: string | null;
  summary: string | null;
  regulatory_action_type: string | null;
  deadline: string | null;
  relevance: number; // 0-1, higher = more relevant to the user
  match_type: "substance" | "category" | "both";
  matched_products: Array<{
    product_id: string;
    product_name: string;
    matched_substances: string[];
    matched_categories: string[];
  }>;
}

// ---------------------------------------------------------------------------
// Cache — simple TTL map, keyed by userId + since
// ---------------------------------------------------------------------------

const cache = new Map<string, { data: ProductMatch[]; expires: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getCached(key: string): ProductMatch[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: ProductMatch[]) {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

/** Clear cached matches for a user (call when they add/remove products). */
export function invalidateUserMatches(userId: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(userId)) cache.delete(key);
  }
}

/** Clear all cached matches (call after enrichment batch completes). */
export function invalidateAllMatches() {
  cache.clear();
}

// ---------------------------------------------------------------------------
// RPC result row types
// ---------------------------------------------------------------------------

interface SubstanceRow {
  item_id: string;
  title: string;
  item_type: string;
  published_date: string;
  source_url: string | null;
  product_id: string;
  product_name: string;
  ingredient_name: string;
  substance_id: string;
  summary: string | null;
  regulatory_action_type: string | null;
  deadline: string | null;
  substance_item_count: number; // how many reg items mention this substance
}

interface CategoryRow {
  item_id: string;
  title: string;
  item_type: string;
  published_date: string;
  source_url: string | null;
  product_id: string;
  product_name: string;
  category_slug: string;
  category_label: string;
  summary: string | null;
  regulatory_action_type: string | null;
  deadline: string | null;
}

// ---------------------------------------------------------------------------
// Relevance scoring
// ---------------------------------------------------------------------------

/**
 * Substance specificity: inverse of how common a substance is across
 * regulatory items. A substance appearing in 1 item scores 1.0.
 * One appearing in 500+ items scores near 0.
 *
 * Uses log scale: 1/log2(count+1). This gives:
 *   count=1  → 1.0
 *   count=5  → 0.39
 *   count=20 → 0.23
 *   count=100 → 0.15
 *   count=500 → 0.11
 */
function substanceSpecificity(itemCount: number): number {
  return 1 / Math.log2(itemCount + 1);
}

/**
 * Compute relevance score for an item match.
 *
 * Factors:
 * - Best substance specificity among matched substances (0-1)
 * - Whether category also matches (boost)
 * - Action type (bans/restrictions boost, recalls of unrelated products don't)
 */
function computeRelevance(
  substanceSpecificities: number[],
  hasCategory: boolean,
  actionType: string | null
): number {
  const bestSpecificity = substanceSpecificities.length > 0
    ? Math.max(...substanceSpecificities)
    : 0;

  // Base: best substance specificity, or 0.3 for category-only matches
  let score = substanceSpecificities.length > 0 ? bestSpecificity : 0.3;

  // Category overlap boosts substance matches
  if (hasCategory && substanceSpecificities.length > 0) {
    score = Math.min(1, score * 1.5);
  }

  // Bans and restrictions are universally relevant when substances match
  if (actionType === "ban_restriction" && substanceSpecificities.length > 0) {
    score = Math.max(score, 0.8);
  }

  return Math.round(score * 100) / 100;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get all regulatory items that match a user's products.
 * Combines substance matches (ingredient-level) and category matches,
 * scored by relevance (substance specificity + category overlap + action type).
 *
 * Results are cached for 15 minutes per user and sorted by relevance desc.
 */
export async function getMatchesForUser(
  userId: string,
  since?: Date
): Promise<ProductMatch[]> {
  const cacheKey = `${userId}:${since?.toISOString() ?? "all"}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const sinceParam = since ? since.toISOString().split("T")[0] : null;

  const [substanceRes, categoryRes] = await Promise.all([
    adminClient.rpc("get_substance_matches", {
      p_user_id: userId,
      p_since: sinceParam,
    }),
    adminClient.rpc("get_category_matches", {
      p_user_id: userId,
      p_since: sinceParam,
    }),
  ]);

  if (substanceRes.error) {
    console.error("[matches] substance RPC error:", substanceRes.error);
  }
  if (categoryRes.error) {
    console.error("[matches] category RPC error:", categoryRes.error);
  }

  const substanceRows = (substanceRes.data ?? []) as SubstanceRow[];
  const categoryRows = (categoryRes.data ?? []) as CategoryRow[];

  // Group by item_id → product_id, tracking specificity per substance
  const itemMap = new Map<
    string,
    {
      title: string;
      item_type: string;
      published_date: string;
      source_url: string | null;
      summary: string | null;
      regulatory_action_type: string | null;
      deadline: string | null;
      substanceSpecificities: number[];
      products: Map<
        string,
        { product_name: string; substances: Set<string>; categories: Set<string> }
      >;
    }
  >();

  function ensureItem(row: SubstanceRow | CategoryRow) {
    if (!itemMap.has(row.item_id)) {
      itemMap.set(row.item_id, {
        title: row.title,
        item_type: row.item_type,
        published_date: row.published_date,
        source_url: row.source_url,
        summary: row.summary,
        regulatory_action_type: row.regulatory_action_type,
        deadline: row.deadline,
        substanceSpecificities: [],
        products: new Map(),
      });
    }
    const item = itemMap.get(row.item_id)!;
    if (!item.products.has(row.product_id)) {
      item.products.set(row.product_id, {
        product_name: row.product_name,
        substances: new Set(),
        categories: new Set(),
      });
    }
    return item.products.get(row.product_id)!;
  }

  for (const row of substanceRows) {
    ensureItem(row).substances.add(row.ingredient_name);
    const item = itemMap.get(row.item_id)!;
    item.substanceSpecificities.push(substanceSpecificity(row.substance_item_count));
  }
  for (const row of categoryRows) {
    ensureItem(row).categories.add(row.category_label);
  }

  // Build results
  const results: ProductMatch[] = [];
  for (const [itemId, item] of itemMap) {
    const matchedProducts: ProductMatch["matched_products"] = [];
    let hasSubstance = false;
    let hasCategory = false;

    for (const [productId, pMatch] of item.products) {
      if (pMatch.substances.size > 0) hasSubstance = true;
      if (pMatch.categories.size > 0) hasCategory = true;
      matchedProducts.push({
        product_id: productId,
        product_name: pMatch.product_name,
        matched_substances: [...pMatch.substances],
        matched_categories: [...pMatch.categories],
      });
    }

    const relevance = computeRelevance(
      item.substanceSpecificities,
      hasCategory,
      item.regulatory_action_type
    );

    results.push({
      item_id: itemId,
      title: item.title,
      item_type: item.item_type,
      published_date: item.published_date,
      source_url: item.source_url,
      summary: item.summary,
      regulatory_action_type: item.regulatory_action_type,
      deadline: item.deadline,
      relevance,
      match_type: hasSubstance && hasCategory ? "both" : hasSubstance ? "substance" : "category",
      matched_products: matchedProducts,
    });
  }

  // Sort by relevance desc, then date desc
  results.sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance;
    return new Date(b.published_date).getTime() - new Date(a.published_date).getTime();
  });

  setCache(cacheKey, results);
  return results;
}

