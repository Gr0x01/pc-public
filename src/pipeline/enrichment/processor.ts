/**
 * Enrichment processor.
 *
 * enrichItem() takes a single regulatory item and:
 * 1. Routes to the appropriate Gemini model
 * 2. Calls generateObject() with the enrichment schema
 * 3. Applies rule-based validators (CDER, animal drugs)
 * 4. Writes all enrichment data to the DB
 */

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  EnrichmentOutputSchema,
  SYSTEM_PROMPT,
  TOPIC_SLUGS,
  buildEnrichmentPrompt,
  type EnrichmentOutput,
} from "./prompts";
import type { RegulatoryItem } from "../../types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CategoryIdMap {
  // slug → category_id
  segments: Record<string, string>;
  topics: Record<string, string>;
}

export interface EnrichItemResult {
  ok: boolean;
  enrichmentId?: string;
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
// Rule-based validators (post-LLM, deterministic overrides)
// ---------------------------------------------------------------------------

function applyRuleValidators(
  output: EnrichmentOutput,
  item: RegulatoryItem
): EnrichmentOutput {
  let { segments } = output;

  // Rule 1: CDER or CDRH → pharmaceutical/device domain → clear all segments
  const office = item.issuing_office?.toLowerCase() ?? "";
  if (
    office.includes("center for drug evaluation") ||
    office.includes("cder") ||
    office.includes("center for devices") ||
    office.includes("cdrh")
  ) {
    segments = [];
  }

  // Rule 2: CFR Parts 500-599 = animal drugs → clear all segments
  const hasAnimalDrugCfr = item.cfr_references?.some(
    (r) => r.part >= 500 && r.part <= 599
  );
  if (hasAnimalDrugCfr) {
    segments = [];
  }

  // Rule 3: Infer recall segment from raw content if segments empty and item_type is recall
  // (catches cases where LLM under-classified an obvious food recall)
  if (
    segments.length === 0 &&
    item.item_type === "recall" &&
    output.regulatory_action_type === "recall"
  ) {
    const contentLower = (item.raw_content ?? item.title ?? "").toLowerCase();
    const foodKeywords = [
      "food",
      "beverage",
      "produce",
      "dairy",
      "meat",
      "poultry",
      "fish",
      "vegetable",
      "fruit",
      "grain",
      "bakery",
    ];
    const supplementKeywords = [
      "supplement",
      "vitamin",
      "mineral",
      "herb",
      "botanical",
      "protein powder",
    ];

    if (foodKeywords.some((kw) => contentLower.includes(kw))) {
      segments = [
        {
          segment: "food",
          relevance: "high",
          impact_summary: "Food product recall.",
          action_items: [],
          who_affected: "Food manufacturers and distributors",
        },
      ];
    } else if (supplementKeywords.some((kw) => contentLower.includes(kw))) {
      segments = [
        {
          segment: "supplements",
          relevance: "high",
          impact_summary: "Dietary supplement recall.",
          action_items: [],
          who_affected: "Dietary supplement manufacturers and distributors",
        },
      ];
    }
  }

  return { ...output, segments };
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

async function lookupSubstance(
  name: string,
  supabase: SupabaseClient
): Promise<{ substance_id: string | null; match_status: string }> {
  if (!name.trim()) return { substance_id: null, match_status: "pending" };

  try {
    const { data, error } = await supabase.rpc("find_substance_by_name", {
      query_name: name,
    });

    if (error) {
      // RPC error — distinct from "no match found"
      console.warn(`GSRS lookup RPC error for "${name}": ${error.message}`);
      return { substance_id: null, match_status: "pending" };
    }

    if (!data || data.length === 0) {
      // Clean no-match — substance is not in GSRS
      return { substance_id: null, match_status: "unresolved" };
    }

    // Take best match (highest similarity_score)
    const best = data.reduce(
      (a: { similarity_score: number; substance_id: string }, b: { similarity_score: number; substance_id: string }) =>
        b.similarity_score > a.similarity_score ? b : a
    );

    return {
      substance_id: best.substance_id,
      match_status: best.similarity_score >= 0.9 ? "resolved" : "pending",
    };
  } catch (err) {
    console.warn(`GSRS lookup exception for "${name}": ${err instanceof Error ? err.message : String(err)}`);
    return { substance_id: null, match_status: "pending" };
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
    // 0. Clean up any partial/stale v1 enrichment (makes retries idempotent)
    const { data: existing } = await supabase
      .from("item_enrichments")
      .select("id")
      .eq("item_id", item.id)
      .eq("enrichment_version", 1)
      .maybeSingle();

    if (existing) {
      await supabase.from("item_citations").delete().eq("enrichment_id", existing.id);
      await supabase.from("item_enrichments").delete().eq("id", existing.id);
      await supabase.from("segment_impacts").delete().eq("item_id", item.id);
      await supabase.from("regulatory_item_substances").delete().eq("regulatory_item_id", item.id);
      await supabase.from("item_enrichment_tags").delete().eq("item_id", item.id);
      await supabase.from("item_categories").delete().eq("item_id", item.id);
    }

    // 1. Build prompt + select model
    const prompt = buildEnrichmentPrompt(item);
    const model = routeModel(item, google);

    // 2. Call LLM
    const { object: rawOutput } = await generateObject({
      model,
      schema: EnrichmentOutputSchema,
      system: SYSTEM_PROMPT,
      prompt,
    });

    // 3. Apply rule validators
    const output = applyRuleValidators(rawOutput, item);

    // 3b. Normalize deadline to ISO date or null
    if (output.deadline) {
      const isoMatch = output.deadline.match(/\d{4}-\d{2}-\d{2}/);
      output.deadline = isoMatch ? isoMatch[0] : null;
    }

    // 4. Filter topics to controlled vocab only
    const validTopicSlugs = new Set<string>(TOPIC_SLUGS);
    const validTopics = output.topics.filter((t) => validTopicSlugs.has(t.slug));

    // 5. Verify citations
    const verifiedCitations = verifyCitations(output, item.raw_content ?? item.title);

    // ── DB writes ──────────────────────────────────────────────────────────

    // 5a. INSERT item_enrichments
    const { data: enrichmentRow, error: enrichErr } = await supabase
      .from("item_enrichments")
      .insert({
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
        raw_response: output as unknown as Record<string, unknown>,
      })
      .select("id")
      .single();

    if (enrichErr || !enrichmentRow) {
      return { ok: false, error: `item_enrichments insert: ${enrichErr?.message}` };
    }

    const enrichmentId = enrichmentRow.id as string;

    // 5b. INSERT segment_impacts
    for (const seg of output.segments) {
      const categoryId = categoryIdMap.segments[seg.segment];
      if (!categoryId) continue;

      const { error: segErr } = await supabase.from("segment_impacts").insert({
        item_id: item.id,
        category_id: categoryId,
        relevance: seg.relevance,
        impact_summary: seg.impact_summary,
        action_items: seg.action_items,
        who_affected: seg.who_affected,
        published_date: item.published_date,
        verification_status: "unverified",
      });
      if (segErr) throw new Error(`segment_impacts insert (${seg.segment}): ${segErr.message}`);
    }

    // 5c. UPSERT item_categories (topic tags)
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

    // 5d. INSERT regulatory_item_substances (ingredient-level signals)
    for (const ingredient of output.affected_ingredients) {
      if (!ingredient.trim()) continue;

      const { substance_id, match_status } = await lookupSubstance(ingredient, supabase);

      const { error: subErr } = await supabase.from("regulatory_item_substances").insert({
        regulatory_item_id: item.id,
        substance_id,
        raw_substance_name: ingredient,
        match_status,
        extraction_method: "llm_extraction",
        confidence: output.confidence,
      });
      if (subErr) {
        // Non-fatal: substance resolution is best-effort; log and continue
        console.warn(`  substance insert failed (${ingredient}): ${subErr.message}`);
      }
    }

    // 5e. INSERT item_enrichment_tags (category-level signals — all 4 dimensions)
    const tagInserts: Array<{ item_id: string; tag_dimension: string; tag_value: string; confidence: number | null }> = [];

    for (const v of output.affected_product_types) {
      if (v.trim()) tagInserts.push({ item_id: item.id, tag_dimension: "product_type", tag_value: v.trim(), confidence: output.confidence });
    }
    for (const v of output.affected_facility_types) {
      if (v.trim()) tagInserts.push({ item_id: item.id, tag_dimension: "facility_type", tag_value: v.trim(), confidence: output.confidence });
    }
    for (const v of output.affected_claims) {
      if (v.trim()) tagInserts.push({ item_id: item.id, tag_dimension: "claims", tag_value: v.trim(), confidence: output.confidence });
    }
    for (const v of output.affected_regulations) {
      if (v.trim()) tagInserts.push({ item_id: item.id, tag_dimension: "regulation", tag_value: v.trim(), confidence: output.confidence });
    }

    if (tagInserts.length > 0) {
      const { error: tagErr } = await supabase.from("item_enrichment_tags").insert(tagInserts);
      if (tagErr) throw new Error(`item_enrichment_tags insert: ${tagErr.message}`);
    }

    // 5f. INSERT item_citations
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

    // 5g. UPDATE regulatory_items processing_status → enriched
    const { error: statusErr } = await supabase
      .from("regulatory_items")
      .update({ processing_status: "enriched" })
      .eq("id", item.id);
    if (statusErr) throw new Error(`processing_status update: ${statusErr.message}`);

    return { ok: true, enrichmentId };
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
    .select("id, slug, category_type");

  if (error || !data) {
    throw new Error(`Failed to load regulatory_categories: ${error?.message}`);
  }

  const segments: Record<string, string> = {};
  const topics: Record<string, string> = {};

  for (const row of data as Array<{ id: string; slug: string; category_type: string }>) {
    if (row.category_type === "segment") {
      segments[row.slug] = row.id;
    } else if (row.category_type === "topic") {
      topics[row.slug] = row.id;
    }
  }

  return { segments, topics };
}
