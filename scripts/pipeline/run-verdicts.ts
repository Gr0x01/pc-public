#!/usr/bin/env npx tsx
/**
 * One-off script: generate verdicts for existing products.
 * Usage: npx tsx scripts/run-verdicts.ts [--user <userId>]
 */
import { createClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import pLimit from "p-limit";

// Inline Supabase client (bypasses server-only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const google = createGoogleGenerativeAI();

const args = process.argv.slice(2);
const userIdx = args.indexOf("--user");
const userId = userIdx >= 0 ? args[userIdx + 1] : "70360df8-4888-4401-9aa0-b2b15da354b0";

// ---------------------------------------------------------------------------
// Types & schema (mirrored from verdicts.ts to avoid server-only import)
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
  key_entities: string[];
  reasoning: string | null;
}

interface ProductData {
  product_id: string;
  name: string;
  brand: string | null;
  product_type: string;
  category_slug: string | null;
  ingredients: string[];
}

const VerdictOutputSchema = z.object({
  verdicts: z.array(
    z.object({
      product_id: z.string(),
      relevant: z.boolean(),
      reasoning: z.string(),
    })
  ),
});

const VERDICT_SYSTEM_PROMPT = `You are a regulatory compliance analyst. Given an FDA regulatory action and subscriber products, determine: does the product owner need to take action because of this?

## RELEVANT — flag these

- Industry-wide rules, bans, or regulations that apply to the product's category or an ingredient it actually contains (e.g., "FDA bans Red No. 3" affects any product with Red No. 3 in its ingredient list)
- Systemic contamination affecting an ingredient supply broadly across multiple suppliers
- New labeling, testing, or registration requirements for the product's category
- Genuine gray areas — but ONLY when there is a plausible connection based on the product's actual listed ingredients, its category, or its stated purpose. Never speculate about ingredients the product might contain.

## NOT RELEVANT — these are obvious noise, filter them out

- Recalls of a specific company's product. Read the title: if it names a brand, UPC, lot number, or package description, it is that company's problem — not every product sharing an ingredient.
- Facility-specific warning letters or GMP violations at another company
- Allergen mislabeling at another company — their labeling failure does not affect your product
- Coincidental ingredient overlap. Both products contain cinnamon, sugar, whey, etc., but the action is about one company's specific product — not the ingredient supply.
- Actions about a substance the product does NOT contain. If the product's ingredients are listed and the banned/flagged substance is not among them, it is NOT relevant — even if the product is in the same broad category.

## HANDLING "INGREDIENTS: NOT SPECIFIED"

If a product's ingredients are listed as "not specified," evaluate based on the product's name, brand, type, and category ONLY. Do NOT assume the product might contain any particular ingredient. If the FDA action targets a specific substance and you cannot confirm the product contains it, mark NOT relevant.

## KEY TEST

"Is this about a systemic risk to an ingredient THIS PRODUCT ACTUALLY CONTAINS or a category THIS PRODUCT BELONGS TO? Or is it about one specific company's failure or an ingredient this product doesn't have?"

If it names a specific company, product, UPC, lot number, or facility — and the subscriber's product is from a different company — it is NOT relevant.

Keep reasoning to ONE sentence. Return a verdict for EVERY product.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPrompt(item: EnrichmentData, products: ProductData[]): string {
  const parts: string[] = [];
  parts.push("## Regulatory Item");
  parts.push(`Title: ${item.title}`);
  parts.push(`Type: ${item.item_type}`);
  parts.push(`Summary: ${item.summary}`);
  if (item.regulatory_action_type) parts.push(`Action: ${item.regulatory_action_type}`);
  if (item.affected_ingredients.length > 0)
    parts.push(`Affected ingredients: ${item.affected_ingredients.join(", ")}`);
  if (item.affected_product_categories.length > 0)
    parts.push(`Affected categories: ${item.affected_product_categories.join(", ")}`);
  if (item.key_entities.length > 0)
    parts.push(`Companies/entities named: ${item.key_entities.join(", ")}`);
  if (item.reasoning)
    parts.push(`Analysis: ${item.reasoning}`);
  parts.push("");
  parts.push("## Products to evaluate");
  for (const p of products) {
    parts.push(`\nProduct ID: ${p.product_id}`);
    parts.push(`  Name: ${p.name}${p.brand ? ` (${p.brand})` : ""}`);
    parts.push(`  Type: ${p.product_type}${p.category_slug ? ` / ${p.category_slug}` : ""}`);
    if (p.ingredients.length > 0) {
      parts.push(`  Ingredients: ${p.ingredients.join(", ")}`);
    } else {
      parts.push(`  Ingredients: not specified`);
    }
  }
  return parts.join("\n");
}

async function getEnrichmentDataBatch(itemIds: string[]): Promise<EnrichmentData[]> {
  if (itemIds.length === 0) return [];

  const [itemsRes, enrichmentsRes] = await Promise.all([
    supabase.from("regulatory_items").select("id, title, item_type").in("id", itemIds),
    supabase
      .from("item_enrichments")
      .select("item_id, summary, regulatory_action_type, deadline, raw_response")
      .in("item_id", itemIds),
  ]);

  const enrichmentMap = new Map((enrichmentsRes.data ?? []).map((e) => [e.item_id, e]));

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
        key_entities: Array.isArray(raw?.key_entities)
          ? (raw!.key_entities as string[])
          : [],
        reasoning: typeof raw?.reasoning === "string" ? raw.reasoning : null,
      };
    })
    .filter((e): e is EnrichmentData => e !== null);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  console.log(`Running verdicts for user: ${userId}\n`);

  // Get products
  const { data: rawProducts } = await supabase
    .from("subscriber_products")
    .select(`
      id, name, brand, product_type,
      product_categories(slug),
      product_ingredients(name, normalized_name, substances(canonical_name))
    `)
    .eq("user_id", userId)
    .eq("is_active", true);

  if (!rawProducts?.length) {
    console.log("No products found");
    return;
  }

  const products: ProductData[] = rawProducts.map((p: any) => ({
    product_id: p.id,
    name: p.name,
    brand: p.brand,
    product_type: p.product_type,
    category_slug: p.product_categories?.slug ?? null,
    ingredients: (p.product_ingredients ?? [])
      .map((pi: any) => pi.substances?.canonical_name ?? pi.normalized_name ?? pi.name)
      .filter(Boolean),
  }));

  console.log(`Found ${products.length} products:`);
  for (const p of products) {
    console.log(`  - ${p.name} (${p.ingredients.length} ingredients, category: ${p.category_slug ?? "none"})`);
  }

  let totalVerdicts = 0;

  for (const product of products) {
    console.log(`\n=== ${product.name} ===`);

    // Find candidate items by substance overlap
    const { data: productSubstances } = await supabase
      .from("product_ingredients")
      .select("substance_id")
      .eq("product_id", product.product_id)
      .not("substance_id", "is", null);

    const substanceIds = (productSubstances ?? []).map((r: any) => r.substance_id).filter(Boolean);

    const { data: substanceItems } =
      substanceIds.length > 0
        ? await supabase
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
      const { data: categoryItems } = await supabase
        .from("item_enrichment_tags")
        .select("item_id")
        .eq("tag_dimension", "product_type")
        .eq("tag_value", product.category_slug);

      for (const row of categoryItems ?? []) {
        candidateItemIds.add(row.item_id);
      }
    }

    console.log(`  Candidates: ${candidateItemIds.size} items`);
    if (candidateItemIds.size === 0) continue;

    // Skip already evaluated
    const { data: existing } = await supabase
      .from("product_match_verdicts")
      .select("item_id")
      .eq("product_id", product.product_id)
      .in("item_id", [...candidateItemIds]);

    const alreadyDone = new Set((existing ?? []).map((e: any) => e.item_id));
    const newItemIds = [...candidateItemIds].filter((id) => !alreadyDone.has(id));
    console.log(`  New (unevaluated): ${newItemIds.length}`);
    if (newItemIds.length === 0) continue;

    // Fetch enrichment data in batches
    const FETCH_BATCH = 50;
    const allItems: EnrichmentData[] = [];
    for (let i = 0; i < newItemIds.length; i += FETCH_BATCH) {
      const batch = newItemIds.slice(i, i + FETCH_BATCH);
      const results = await getEnrichmentDataBatch(batch);
      allItems.push(...results);
    }

    console.log(`  Enriched items to evaluate: ${allItems.length}`);

    // Evaluate concurrently
    const CONCURRENCY = 15;
    const limit = pLimit(CONCURRENCY);
    let productVerdicts = 0;
    let completed = 0;

    await Promise.all(
      allItems.map((item) =>
        limit(async () => {
          try {
            const { object } = await generateObject({
              model: google("gemini-3-flash-preview"),
              schema: VerdictOutputSchema,
              system: VERDICT_SYSTEM_PROMPT,
              prompt: buildPrompt(item, [product]),
            });

            const verdict = object.verdicts.find((v) => v.product_id === product.product_id);
            if (verdict) {
              await supabase.from("product_match_verdicts").upsert(
                {
                  item_id: item.item_id,
                  product_id: product.product_id,
                  user_id: userId,
                  relevant: verdict.relevant,
                  reasoning: verdict.reasoning,
                  evaluated_at: new Date().toISOString(),
                },
                { onConflict: "item_id,product_id" }
              );
              productVerdicts++;
              if (verdict.relevant) {
                console.log(`  ✓ RELEVANT: ${item.title}`);
                console.log(`    Reason: ${verdict.reasoning}`);
              }
            }
          } catch (err: any) {
            console.error(`  Error evaluating "${item.title}": ${err.message}`);
          } finally {
            completed++;
            if (completed % 50 === 0) {
              console.log(`  Progress: ${completed}/${allItems.length}`);
            }
          }
        })
      )
    );

    totalVerdicts += productVerdicts;
    console.log(`  Done: ${productVerdicts} verdicts stored`);
  }

  console.log(`\nTotal: ${totalVerdicts} verdicts stored`);
}

run().then(() => process.exit(0));
