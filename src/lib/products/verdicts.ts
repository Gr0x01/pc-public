import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EnrichmentData {
  item_id: string;
  title: string;
  item_type: string;
  summary: string;
  regulatory_action_type: string | null;
  deadline: string | null;
  affected_ingredients: string[];
  affected_product_categories: string[];
}

interface ProductData {
  product_id: string;
  name: string;
  brand: string | null;
  product_type: string;
  category_slug: string | null;
  ingredients: string[]; // canonical substance names
}

export interface Verdict {
  item_id: string;
  product_id: string;
  user_id: string;
  relevant: boolean;
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Schema for Flash output
// ---------------------------------------------------------------------------

const VerdictOutputSchema = z.object({
  verdicts: z.array(
    z.object({
      product_id: z.string(),
      relevant: z.boolean(),
      reasoning: z.string(),
    })
  ),
});

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const VERDICT_SYSTEM_PROMPT = `You are a regulatory document analyst. You receive an FDA regulatory action and a list of subscriber products. For each product, decide: does this action ACTUALLY affect this specific product?

## RULES

1. A product is affected ONLY if:
   - The action targets a substance that is IN the product (ingredient match), OR
   - The action targets the product's category directly (e.g., "all dairy facilities must register" affects a dairy product), OR
   - The action creates a supply chain risk for the product's ingredients

2. A product is NOT affected when:
   - The only overlap is a common substance (salt, water, sugar, citric acid) that is incidental to both the action and the product
   - The action is about a specific company/facility and the product is from a different company
   - The action is about a different product type even if they share an ingredient
   - The overlap is purely coincidental (e.g., both mention "milk" but the action is about mislabeled milk at one factory, not a milk safety issue)

3. When in doubt, say NOT relevant. False alarms erode trust.

4. Keep reasoning to ONE sentence explaining why or why not.

Return a verdict for EVERY product in the list.`;

function buildVerdictPrompt(
  item: EnrichmentData,
  products: ProductData[]
): string {
  const parts: string[] = [];

  parts.push("## FDA Action");
  parts.push(`Title: ${item.title}`);
  parts.push(`Type: ${item.item_type}`);
  parts.push(`Action: ${item.regulatory_action_type ?? "unknown"}`);
  parts.push(`Summary: ${item.summary}`);
  if (item.deadline) parts.push(`Deadline: ${item.deadline}`);
  if (item.affected_ingredients.length > 0) {
    parts.push(`Substances involved: ${item.affected_ingredients.join(", ")}`);
  }
  if (item.affected_product_categories.length > 0) {
    parts.push(`Product categories affected: ${item.affected_product_categories.join(", ")}`);
  }
  parts.push("");

  parts.push("## Subscriber Products");
  for (const p of products) {
    parts.push(`- **${p.name}**${p.brand ? ` (${p.brand})` : ""} [id: ${p.product_id}]`);
    parts.push(`  Type: ${p.product_type}${p.category_slug ? ` / ${p.category_slug}` : ""}`);
    if (p.ingredients.length > 0) {
      parts.push(`  Ingredients: ${p.ingredients.join(", ")}`);
    } else {
      parts.push(`  Ingredients: not specified`);
    }
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Data fetching helpers
// ---------------------------------------------------------------------------

async function getEnrichmentData(itemId: string): Promise<EnrichmentData | null> {
  const results = await getEnrichmentDataBatch([itemId]);
  return results[0] ?? null;
}

async function getEnrichmentDataBatch(itemIds: string[]): Promise<EnrichmentData[]> {
  if (itemIds.length === 0) return [];

  const [itemsRes, enrichmentsRes] = await Promise.all([
    adminClient
      .from("regulatory_items")
      .select("id, title, item_type")
      .in("id", itemIds),
    adminClient
      .from("item_enrichments")
      .select("item_id, summary, regulatory_action_type, deadline, raw_response")
      .in("item_id", itemIds),
  ]);

  const enrichmentMap = new Map(
    (enrichmentsRes.data ?? []).map((e) => [e.item_id, e])
  );

  return (itemsRes.data ?? [])
    .map((item) => {
      const enrichment = enrichmentMap.get(item.id);
      if (!enrichment) return null;
      const raw = enrichment.raw_response as Record<string, unknown> | null;
      return {
        item_id: item.id,
        title: item.title,
        item_type: item.item_type,
        summary: enrichment.summary,
        regulatory_action_type: enrichment.regulatory_action_type,
        deadline: enrichment.deadline,
        affected_ingredients: Array.isArray(raw?.affected_ingredients)
          ? (raw!.affected_ingredients as string[])
          : [],
        affected_product_categories: Array.isArray(raw?.affected_product_categories)
          ? (raw!.affected_product_categories as string[])
          : [],
      };
    })
    .filter((e): e is EnrichmentData => e !== null);
}

async function getProductData(productIds: string[]): Promise<ProductData[]> {
  if (productIds.length === 0) return [];

  const { data: products } = await adminClient
    .from("subscriber_products")
    .select(`
      id, name, brand, product_type,
      product_categories(slug),
      product_ingredients(substances(canonical_name))
    `)
    .in("id", productIds)
    .eq("is_active", true);

  if (!products) return [];

  return products.map((p) => {
    // Supabase returns FK relations as objects (single) or arrays (multiple)
    const category = p.product_categories as unknown as { slug: string } | null;
    const ingredients = (p.product_ingredients ?? []) as unknown as Array<{
      substances: { canonical_name: string } | null;
    }>;

    return {
      product_id: p.id,
      name: p.name,
      brand: p.brand,
      product_type: p.product_type,
      category_slug: category?.slug ?? null,
      ingredients: ingredients
        .map((pi) => pi.substances?.canonical_name)
        .filter((name): name is string => !!name),
    };
  });
}

// ---------------------------------------------------------------------------
// Core: evaluate one item against a batch of products
// ---------------------------------------------------------------------------

const MAX_PRODUCTS_PER_CALL = 20;

async function evaluateBatch(
  item: EnrichmentData,
  products: ProductData[],
  userId: string,
  google: ReturnType<typeof createGoogleGenerativeAI>
): Promise<Verdict[]> {
  const prompt = buildVerdictPrompt(item, products);

  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: VerdictOutputSchema,
    system: VERDICT_SYSTEM_PROMPT,
    prompt,
  });

  // Map Flash output back to full verdicts, filtering out any hallucinated product_ids
  const productIds = new Set(products.map((p) => p.product_id));
  const valid = object.verdicts.filter((v) => productIds.has(v.product_id));

  if (valid.length !== products.length) {
    console.warn(
      `[verdicts] Flash returned ${valid.length}/${products.length} valid verdicts for item ${item.item_id}`
    );
  }

  return valid.map((v) => ({
    item_id: item.item_id,
    product_id: v.product_id,
    user_id: userId,
    relevant: v.relevant,
    reasoning: v.reasoning,
  }));
}

// ---------------------------------------------------------------------------
// Store verdicts (upsert)
// ---------------------------------------------------------------------------

async function storeVerdicts(verdicts: Verdict[]): Promise<number> {
  if (verdicts.length === 0) return 0;

  const rows = verdicts.map((v) => ({
    item_id: v.item_id,
    product_id: v.product_id,
    user_id: v.user_id,
    relevant: v.relevant,
    reasoning: v.reasoning,
    evaluated_at: new Date().toISOString(),
  }));

  const { error } = await adminClient
    .from("product_match_verdicts")
    .upsert(rows, { onConflict: "item_id,product_id" });

  if (error) {
    throw new Error(`[verdicts] store error: ${error.message}`);
  }

  return rows.length;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate a newly enriched item against all users' products that have
 * substance or category overlap. Called after enrichment completes.
 */
export async function evaluateItemForAllUsers(itemId: string): Promise<number> {
  const google = createGoogleGenerativeAI();
  const item = await getEnrichmentData(itemId);
  if (!item) return 0;

  // Find candidate products via substance + category overlap
  const [substanceRes, categoryRes] = await Promise.all([
    adminClient.rpc("check_urgent_matches", { p_item_id: itemId }),
    adminClient
      .from("item_enrichment_tags")
      .select("tag_value")
      .eq("item_id", itemId)
      .eq("tag_dimension", "product_type"),
  ]);

  // Collect candidate product IDs from substance matches
  const candidateProductIds = new Set<string>();
  const productUserMap = new Map<string, string>(); // product_id → user_id

  const substanceRows = (substanceRes.data ?? []) as Array<{
    user_id: string;
    product_id: string;
    product_name: string;
    ingredient_name: string;
  }>;
  for (const row of substanceRows) {
    candidateProductIds.add(row.product_id);
    productUserMap.set(row.product_id, row.user_id);
  }

  // Also find products matching by category
  const categoryTags = (categoryRes.data ?? []).map(
    (t: { tag_value: string }) => t.tag_value
  );
  if (categoryTags.length > 0) {
    const { data: catProducts } = await adminClient
      .from("subscriber_products")
      .select("id, user_id, product_categories!inner(slug)")
      .eq("is_active", true)
      .in("product_categories.slug", categoryTags);

    for (const p of catProducts ?? []) {
      candidateProductIds.add(p.id);
      productUserMap.set(p.id, p.user_id);
    }
  }

  if (candidateProductIds.size === 0) return 0;

  // Skip products that already have a verdict for this item
  const { data: existing } = await adminClient
    .from("product_match_verdicts")
    .select("product_id")
    .eq("item_id", itemId)
    .in("product_id", [...candidateProductIds]);

  const alreadyEvaluated = new Set((existing ?? []).map((e) => e.product_id));
  const newProductIds = [...candidateProductIds].filter((id) => !alreadyEvaluated.has(id));
  if (newProductIds.length === 0) return 0;

  // Fetch product data and evaluate in batches
  const products = await getProductData(newProductIds);
  let totalVerdicts = 0;

  // Group by user for batching
  const byUser = new Map<string, ProductData[]>();
  for (const p of products) {
    const userId = productUserMap.get(p.product_id);
    if (!userId) continue;
    const list = byUser.get(userId) ?? [];
    list.push(p);
    byUser.set(userId, list);
  }

  for (const [userId, userProducts] of byUser) {
    // Batch into groups of MAX_PRODUCTS_PER_CALL
    for (let i = 0; i < userProducts.length; i += MAX_PRODUCTS_PER_CALL) {
      const batch = userProducts.slice(i, i + MAX_PRODUCTS_PER_CALL);
      try {
        const verdicts = await evaluateBatch(item, batch, userId, google);
        await storeVerdicts(verdicts);
        totalVerdicts += verdicts.length;
      } catch (err) {
        console.error(
          `[verdicts] batch error for item ${itemId}:`,
          err instanceof Error ? err.message : err
        );
      }
    }
  }

  return totalVerdicts;
}

/**
 * Evaluate all historical regulatory items against a newly added product.
 * Called after a user adds a product.
 */
export async function evaluateProductHistory(
  productId: string,
  userId: string
): Promise<number> {
  const google = createGoogleGenerativeAI();

  // Get the product data
  const products = await getProductData([productId]);
  if (products.length === 0) return 0;
  const product = products[0];

  // Find candidate items: substance overlap
  // First get the product's substance IDs, then find items mentioning them
  const { data: productSubstances } = await adminClient
    .from("product_ingredients")
    .select("substance_id")
    .eq("product_id", productId)
    .not("substance_id", "is", null);

  const substanceIds = (productSubstances ?? [])
    .map((r) => r.substance_id as string)
    .filter(Boolean);

  const { data: substanceItems } = substanceIds.length > 0
    ? await adminClient
        .from("regulatory_item_substances")
        .select("regulatory_item_id")
        .in("substance_id", substanceIds)
    : { data: [] };

  const candidateItemIds = new Set<string>();
  for (const row of substanceItems ?? []) {
    candidateItemIds.add(row.regulatory_item_id);
  }

  // Also find items matching by category
  if (product.category_slug) {
    const { data: categoryItems } = await adminClient
      .from("item_enrichment_tags")
      .select("item_id")
      .eq("tag_dimension", "product_type")
      .eq("tag_value", product.category_slug);

    for (const row of categoryItems ?? []) {
      candidateItemIds.add(row.item_id);
    }
  }

  if (candidateItemIds.size === 0) return 0;

  // Skip items that already have a verdict for this product
  const { data: existing } = await adminClient
    .from("product_match_verdicts")
    .select("item_id")
    .eq("product_id", productId)
    .in("item_id", [...candidateItemIds]);

  const alreadyEvaluated = new Set((existing ?? []).map((e) => e.item_id));
  const newItemIds = [...candidateItemIds].filter((id) => !alreadyEvaluated.has(id));
  if (newItemIds.length === 0) return 0;

  // Fetch all enrichment data in batches (2 queries per batch, not 2 per item)
  const FETCH_BATCH = 50;
  const allItems: EnrichmentData[] = [];
  for (let i = 0; i < newItemIds.length; i += FETCH_BATCH) {
    const batch = newItemIds.slice(i, i + FETCH_BATCH);
    const results = await getEnrichmentDataBatch(batch);
    allItems.push(...results);
  }

  // Evaluate each item against this one product
  let totalVerdicts = 0;
  for (const item of allItems) {
    try {
      const verdicts = await evaluateBatch(item, [product], userId, google);
      await storeVerdicts(verdicts);
      totalVerdicts += verdicts.length;
    } catch (err) {
      console.error(
        `[verdicts] history error for item ${item.item_id}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return totalVerdicts;
}
