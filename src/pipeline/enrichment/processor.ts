/**
 * Enrichment processor.
 *
 * enrichItem() takes a single regulatory item and:
 * 1. Routes to the appropriate Gemini model
 * 2. Calls generateObject() with the enrichment schema
 * 3. Writes all enrichment data to the DB
 */

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { type SupabaseClient } from "@supabase/supabase-js";
import {
  EnrichmentOutputSchema,
  SYSTEM_PROMPT,
  TOPIC_SLUGS,
  PRODUCT_CATEGORY_SLUGS,
  buildEnrichmentPrompt,
  type EnrichmentOutput,
} from "./prompts";
import { lookupUseContexts, inferCrossCategories, type CrossReferenceOutput } from "./cross-reference";
import type { RegulatoryItem } from "../../types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CategoryIdMap {
  // slug → category_id
  topics: Record<string, string>;
}

export interface EnrichItemResult {
  ok: boolean;
  enrichmentId?: string;
  crossReferenced?: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Model routing
// ---------------------------------------------------------------------------

/**
 * Flash = high volume, cost-efficient. Pro = complex regulatory nuance.
 * Flash: short/simple items (recalls, safety alerts, RSS press releases, short notices)
 * Pro:   complex items (rules, proposed rules, warning letters, guidance, long notices)
 */
function routeModel(item: RegulatoryItem, google: ReturnType<typeof createGoogleGenerativeAI>) {
  const simpleTypes = new Set(["recall", "safety_alert", "press_release"]);
  const contentLength = (item.raw_content ?? "").length;

  if (simpleTypes.has(item.item_type) || (item.item_type === "notice" && contentLength < 2000)) {
    return google("gemini-2.5-flash");
  }
  return google("gemini-2.5-pro");
}

// ---------------------------------------------------------------------------
// Citation verification
// ---------------------------------------------------------------------------

function verifyCitations(
  output: EnrichmentOutput,
  rawContent: string
): Array<{ claim_text: string; quote_text: string; source_section: string; verified: boolean }> {
  const contentLower = rawContent.toLowerCase();
  return output.citations.map((c) => ({
    claim_text: c.claim_text,
    quote_text: c.quote_text,
    source_section: c.source_section,
    // Check a substantial portion of the quote (first 120 chars) to reduce false positives
    verified: c.quote_text.length > 10 &&
      contentLower.includes(c.quote_text.toLowerCase().slice(0, 120)),
  }));
}

// ---------------------------------------------------------------------------
// GSRS substance lookup
// ---------------------------------------------------------------------------

interface SubstanceLookupResult {
  substance_id: string | null;
  match_status: string;
  similarity: number;
}

async function lookupSubstance(
  name: string,
  supabase: SupabaseClient
): Promise<SubstanceLookupResult> {
  if (!name.trim()) return { substance_id: null, match_status: "pending", similarity: 0 };

  try {
    const { data, error } = await supabase.rpc("find_substance_by_name", {
      query_name: name,
    });

    if (error) {
      console.warn(`GSRS lookup RPC error for "${name}": ${error.message}`);
      return { substance_id: null, match_status: "pending", similarity: 0 };
    }

    if (!data || data.length === 0) {
      return { substance_id: null, match_status: "unresolved", similarity: 0 };
    }

    const best = data.reduce(
      (a: { similarity_score: number; substance_id: string }, b: { similarity_score: number; substance_id: string }) =>
        b.similarity_score > a.similarity_score ? b : a
    );

    return {
      substance_id: best.substance_id,
      match_status: best.similarity_score >= 0.9 ? "resolved" : "pending",
      similarity: best.similarity_score,
    };
  } catch (err) {
    console.warn(`GSRS lookup exception for "${name}": ${err instanceof Error ? err.message : String(err)}`);
    return { substance_id: null, match_status: "pending", similarity: 0 };
  }
}

// ---------------------------------------------------------------------------
// Main: enrichItem
// ---------------------------------------------------------------------------

export async function enrichItem(
  item: RegulatoryItem,
  supabase: SupabaseClient,
  categoryIdMap: CategoryIdMap,
  google: ReturnType<typeof createGoogleGenerativeAI>
): Promise<EnrichItemResult> {
  try {
    // ── 0. Clean up any partial/stale v1 enrichment (makes retries idempotent) ──
    const { data: existing } = await supabase
      .from("item_enrichments")
      .select("id")
      .eq("item_id", item.id)
      .eq("enrichment_version", 1)
      .maybeSingle();

    if (existing) {
      await supabase.from("item_citations").delete().eq("enrichment_id", existing.id);
      await supabase.from("item_enrichments").delete().eq("id", existing.id);
      await supabase.from("regulatory_item_substances").delete().eq("regulatory_item_id", item.id);
      await supabase.from("item_enrichment_tags").delete().eq("item_id", item.id);
      await supabase.from("item_categories").delete().eq("item_id", item.id);
    }

    // ── 1. Build prompt + select model ──────────────────────────────────────
    const prompt = buildEnrichmentPrompt(item);
    const model = routeModel(item, google);

    // ── 2. Call LLM — Step 1 extraction ─────────────────────────────────────
    let rawOutput: EnrichmentOutput;
    try {
      const result = await generateObject({
        model,
        schema: EnrichmentOutputSchema,
        system: SYSTEM_PROMPT,
        prompt,
        maxRetries: 2,
      });
      rawOutput = result.object;
    } catch (llmErr) {
      // Log diagnostic info for schema validation failures
      const errMsg = llmErr instanceof Error ? llmErr.message : String(llmErr);
      const cause = llmErr instanceof Error && 'cause' in llmErr ? String((llmErr as unknown as Record<string, unknown>).cause) : undefined;
      const value = llmErr instanceof Error && 'value' in llmErr ? JSON.stringify((llmErr as unknown as Record<string, unknown>).value)?.slice(0, 500) : undefined;
      console.error(`LLM schema error for "${item.title.slice(0, 60)}": ${errMsg}`);
      if (cause) console.error(`  cause: ${cause}`);
      if (value) console.error(`  partial value: ${value}`);
      throw llmErr;
    }

    // ── 3. Output (no post-LLM filtering — classify all categories honestly) ──
    const output = rawOutput;

    // ── 4. Normalize deadline to ISO date or null ───────────────────────────
    if (output.deadline) {
      const isoMatch = output.deadline.match(/\d{4}-\d{2}-\d{2}/);
      output.deadline = isoMatch ? isoMatch[0] : null;
    }

    // ── 5. Filter topics to controlled vocab only ───────────────────────────
    const validTopicSlugs = new Set<string>(TOPIC_SLUGS);
    const validTopics = output.topics.filter((t) => validTopicSlugs.has(t.slug));

    // ── 5b. Filter product categories to controlled vocab only ──────────────
    const validCategorySlugs = new Set<string>(PRODUCT_CATEGORY_SLUGS);
    const validProductCategories = output.affected_product_categories.filter(
      (slug) => validCategorySlugs.has(slug)
    );

    // ── 6. Verify citations ─────────────────────────────────────────────────
    const verifiedCitations = verifyCitations(output, item.raw_content ?? item.title);

    // ── 7. Resolve substances (moved up for cross-reference) ────────────────
    // Collect substance lookup results: we need them for DB writes AND for
    // determining which substances qualify for cross-reference inference.
    const resolvedSubstances = await Promise.all(
      output.affected_ingredients
        .filter((i) => i.trim())
        .map(async (ingredient) => {
          const result = await lookupSubstance(ingredient, supabase);
          return { ingredient, ...result };
        })
    );

    // ── 8. Step 1b: Use-context lookup (deterministic) ──────────────────────
    // Stricter threshold than general resolution (0.90): cross-referencing
    // the wrong substance is worse than no cross-reference at all.
    const highConfidenceIds = resolvedSubstances
      .filter((r) => r.substance_id && r.match_status === "resolved" && r.similarity >= 0.95)
      .map((r) => r.substance_id!);

    const useContextMap = await lookupUseContexts(highConfidenceIds, supabase);

    // ── 9. Step 1c: Cross-category inference (LLM) ────────────────────────
    // Only fires if use contexts exist for resolved substances.
    // Non-fatal: if this fails, proceed with direct-only signals.
    let crossRefResult: CrossReferenceOutput | null = null;
    let crossReferenced = false;

    if (useContextMap.size > 0 && output.affected_ingredients.length > 0) {
      // Build the substance info map for Step 1c (single batched query)
      const substanceInfoMap = new Map<string, { name: string; unii: string | null }>();
      if (highConfidenceIds.length > 0) {
        const { data: subRows } = await supabase
          .from("substances")
          .select("id, canonical_name, unii")
          .in("id", highConfidenceIds);
        for (const row of subRows ?? []) {
          substanceInfoMap.set(row.id, { name: row.canonical_name, unii: row.unii });
        }
      }

      try {
        crossRefResult = await inferCrossCategories(
          output,
          useContextMap,
          substanceInfoMap,
          google
        );
        if (crossRefResult) {
          crossReferenced = true;
          console.log(`cross-ref expanded... `);
        }
      } catch (err) {
        // Non-fatal — log and continue with direct-only signals
        console.warn(
          `Step 1c failed (non-fatal): ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // ── DB WRITES ───────────────────────────────────────────────────────────

    // 10. INSERT item_enrichments
    const rawResponseData: Record<string, unknown> = {
      ...(output as unknown as Record<string, unknown>),
    };
    if (crossRefResult) {
      rawResponseData.cross_reference = crossRefResult;
    } else if (useContextMap.size > 0 && output.affected_ingredients.length > 0) {
      rawResponseData.cross_reference = { triggered: false, reason: "no expansion needed" };
    }

    const { data: enrichmentRow, error: enrichErr } = await supabase
      .from("item_enrichments")
      .upsert({
        item_id: item.id,
        summary: output.summary,
        key_regulations: output.key_regulations,
        key_entities: output.key_entities,
        enrichment_model: model.modelId,
        enrichment_version: 1,
        confidence: output.confidence,
        regulatory_action_type: output.regulatory_action_type,
        deadline: output.deadline,
        verification_status: "unverified",
        raw_response: rawResponseData,
      }, { onConflict: "item_id,enrichment_version" })
      .select("id")
      .single();

    if (enrichErr || !enrichmentRow) {
      return { ok: false, error: `item_enrichments insert: ${enrichErr?.message}` };
    }

    const enrichmentId = enrichmentRow.id as string;

    // 11. UPSERT item_categories (topic tags)
    for (const topic of validTopics) {
      const categoryId = categoryIdMap.topics[topic.slug];
      if (!categoryId) continue;

      const { error: catErr } = await supabase.from("item_categories").upsert(
        {
          item_id: item.id,
          category_id: categoryId,
          confidence: topic.confidence,
        },
        { onConflict: "item_id,category_id" }
      );
      if (catErr) throw new Error(`item_categories upsert (${topic.slug}): ${catErr.message}`);
    }

    // 13. INSERT regulatory_item_substances
    for (const resolved of resolvedSubstances) {
      const { error: subErr } = await supabase.from("regulatory_item_substances").insert({
        regulatory_item_id: item.id,
        substance_id: resolved.substance_id,
        raw_substance_name: resolved.ingredient,
        match_status: resolved.match_status,
        extraction_method: "llm_extraction",
        confidence: output.confidence,
      });
      if (subErr) {
        console.warn(`  substance insert failed (${resolved.ingredient}): ${subErr.message}`);
      }
    }

    // 14. INSERT item_enrichment_tags (direct from Step 1)
    const tagInserts: Array<{
      item_id: string;
      tag_dimension: string;
      tag_value: string;
      confidence: number | null;
      signal_source: string;
    }> = [];

    for (const v of validProductCategories) {
      if (v.trim()) tagInserts.push({ item_id: item.id, tag_dimension: "product_type", tag_value: v.trim(), confidence: output.confidence, signal_source: "direct" });
    }
    for (const v of output.affected_facility_types) {
      if (v.trim()) tagInserts.push({ item_id: item.id, tag_dimension: "facility_type", tag_value: v.trim(), confidence: output.confidence, signal_source: "direct" });
    }
    for (const v of output.affected_claims) {
      if (v.trim()) tagInserts.push({ item_id: item.id, tag_dimension: "claims", tag_value: v.trim(), confidence: output.confidence, signal_source: "direct" });
    }
    for (const v of output.affected_regulations) {
      if (v.trim()) tagInserts.push({ item_id: item.id, tag_dimension: "regulation", tag_value: v.trim(), confidence: output.confidence, signal_source: "direct" });
    }

    // 14b. Add cross-reference product categories from Step 1c (deduplicated + validated)
    if (crossRefResult) {
      const existingTagKeys = new Set(
        tagInserts.map((t) => `${t.tag_dimension}::${t.tag_value}`)
      );
      for (const ref of crossRefResult.cross_references) {
        for (const pc of ref.new_product_categories) {
          if (pc.trim() && validCategorySlugs.has(pc.trim())) {
            const key = `product_type::${pc.trim()}`;
            if (!existingTagKeys.has(key)) {
              existingTagKeys.add(key);
              tagInserts.push({
                item_id: item.id,
                tag_dimension: "product_type",
                tag_value: pc.trim(),
                confidence: output.confidence,
                signal_source: "cross_reference",
              });
            }
          }
        }
      }
    }

    if (tagInserts.length > 0) {
      const { error: tagErr } = await supabase.from("item_enrichment_tags").insert(tagInserts);
      if (tagErr) throw new Error(`item_enrichment_tags insert: ${tagErr.message}`);
    }

    // 15. INSERT item_citations
    for (const citation of verifiedCitations) {
      const { error: citErr } = await supabase.from("item_citations").insert({
        item_id: item.id,
        enrichment_id: enrichmentId,
        claim_text: citation.claim_text,
        quote_text: citation.quote_text,
        source_section: citation.source_section,
        quote_verified: citation.verified,
      });
      if (citErr) throw new Error(`item_citations insert: ${citErr.message}`);
    }

    // 16. UPDATE regulatory_items processing_status → enriched
    const { error: statusErr } = await supabase
      .from("regulatory_items")
      .update({ processing_status: "enriched" })
      .eq("id", item.id);
    if (statusErr) throw new Error(`processing_status update: ${statusErr.message}`);

    return { ok: true, enrichmentId, crossReferenced };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Load category ID map (call once per run, not per item)
// ---------------------------------------------------------------------------

export async function loadCategoryIdMap(supabase: SupabaseClient): Promise<CategoryIdMap> {
  const { data, error } = await supabase
    .from("regulatory_categories")
    .select("id, slug, category_type")
    .eq("category_type", "topic");

  if (error || !data) {
    throw new Error(`Failed to load regulatory_categories: ${error?.message}`);
  }

  const topics: Record<string, string> = {};

  for (const row of data as Array<{ id: string; slug: string; category_type: string }>) {
    topics[row.slug] = row.id;
  }

  return { topics };
}
