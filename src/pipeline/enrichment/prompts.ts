/**
 * Enrichment prompts and Zod schema.
 *
 * DESIGN: Two signal types, both first-class.
 * - Ingredient-level: affected_ingredients → regulatory_item_substances → substance_id matching
 * - Category-level: affected_product_categories / facility_type_tags / claims_tags / regulation_tags
 *   → item_enrichment_tags (4 dimensions) → category_overlap matching
 *
 * ────────────────────────────────────────────────────────────────────────────
 * REDACTED FOR THE PUBLIC MIRROR
 * Three things are part of Policy Canary's classification moat and are kept
 * private here:
 *   1. The production SYSTEM_PROMPT — the regulatory-analyst instructions,
 *      anti-hallucination rules, and confidence-scoring rubric.
 *   2. The per-field extraction guidance in the schema below (trimmed to
 *      neutral one-line descriptions).
 *   3. The full controlled vocabularies — TOPIC_SLUGS and PRODUCT_CATEGORY_SLUGS
 *      ship as a representative sample, not the complete taxonomy.
 * The schema shape, model wiring (processor.ts), and prompt-assembly scaffolding
 * are intact so the pipeline's architecture is fully legible.
 * ────────────────────────────────────────────────────────────────────────────
 */

import { z } from "zod";
import type { RegulatoryItem } from "../../types/database";

// ---------------------------------------------------------------------------
// Output schema (drives generateObject + DB writes)
// ---------------------------------------------------------------------------

export const EnrichmentOutputSchema = z.object({
  /** Chain-of-thought analysis of the document (model's own reasoning field). */
  reasoning: z.string(),

  /** What regulatory action is happening (drives product matching + email priority). */
  regulatory_action_type: z.enum([
    "recall",
    "ban_restriction",
    "proposed_restriction",
    "safety_alert",
    "cgmp_violation",
    "compliance_requirement",
    "testing_requirement",
    "labeling_change",
    "import_violation",
    "guidance_update",
    "adverse_event_signal",
    "administrative",
  ]),

  /** Signal Type 1 — ingredient-level matching. [] if none. */
  affected_ingredients: z.array(z.string()),

  /** Signal Type 2 — product categories affected (slugs from PRODUCT_CATEGORY_SLUGS). */
  affected_product_categories: z.array(z.string()),

  /** Facility types affected (item_enrichment_tags[facility_type]). */
  affected_facility_types: z.array(z.string()),

  /** Regulatory claims affected (item_enrichment_tags[claims]). */
  affected_claims: z.array(z.string()),

  /** Specific regulations / CFR parts (item_enrichment_tags[regulation]). */
  affected_regulations: z.array(z.string()),

  /** Compliance or response deadline (ISO YYYY-MM-DD), or null. */
  deadline: z.string().nullable(),

  /** 2-3 sentence plain-language summary for dashboard display. */
  summary: z.string().max(1000),

  /** CFR citations and key regulatory references. */
  key_regulations: z.array(z.string()),

  /** Company names, ingredients, products mentioned. */
  key_entities: z.array(z.string()),

  /** Confidence in overall classification quality (0-1). */
  confidence: z.number().min(0).max(1),

  /** Topic tags from the controlled vocabulary (slug + confidence). */
  topics: z.array(
    z.object({
      slug: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),

  /** Supporting citations — verbatim quotes from the source document. */
  citations: z.array(
    z.object({
      claim_text: z.string(),
      quote_text: z.string(),
      source_section: z.string(),
    })
  ),
});

export type EnrichmentOutput = z.infer<typeof EnrichmentOutputSchema>;

// ---------------------------------------------------------------------------
// Controlled vocabulary
//
// NOTE: Representative sample only. The production vocabularies cover the full
// FDA-regulated spectrum (~40 topics, ~130 product categories across food,
// supplements, cosmetics, pharma, devices, biologics, tobacco, veterinary).
// The complete taxonomy is part of the classification moat and is kept private.
// ---------------------------------------------------------------------------

export const TOPIC_SLUGS = [
  "cgmp-violations",
  "mocra",
  "food-additives",
  "gras-notices",
  "recalls",
  "warning-letters",
  "import-alerts",
  "guidance-documents",
  // …full topic taxonomy private
] as const;

export const PRODUCT_CATEGORY_SLUGS = [
  // Cosmetics
  "skin_care",
  "fragrance",
  // Food
  "fresh_fruits_vegetables",
  "dietary_conventional_foods",
  // Supplements
  "botanicals_herbal",
  "protein_powders",
  // Pharma / Devices / Biologics / Tobacco / Veterinary
  "otc_drugs",
  "in_vitro_diagnostics",
  "vaccines",
  "vape_e_cigarettes",
  "veterinary_drugs",
  // …full product-category taxonomy private
] as const;

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

/**
 * [REDACTED FOR PUBLIC MIRROR]
 *
 * The production system prompt — a high-precision regulatory-analyst persona
 * with detailed reasoning instructions, two-signal extraction rules,
 * anti-hallucination guardrails, action-type definitions, and a confidence-
 * scoring rubric — has been removed from this public mirror. It is the core
 * of Policy Canary's enrichment quality and is kept private.
 */
const SYSTEM_PROMPT =
  "[redacted — production enrichment system prompt removed from the public mirror]";

export function buildEnrichmentPrompt(item: RegulatoryItem): string {
  const parts: string[] = [];

  // Structured context (helps LLM before seeing raw content)
  parts.push("## Item Context");
  parts.push(`Item type: ${item.item_type}`);
  parts.push(`Published: ${item.published_date}`);

  if (item.issuing_office) {
    parts.push(`Issuing office: ${item.issuing_office}`);
  }

  if (item.cfr_references && item.cfr_references.length > 0) {
    const refs = item.cfr_references
      .map((r) => `21 CFR Part ${r.part}`)
      .join(", ");
    parts.push(`CFR references: ${refs}`);
  }

  if (item.effective_date) {
    parts.push(`Effective date: ${item.effective_date}`);
  }

  if (item.comment_deadline) {
    parts.push(`Comment deadline: ${item.comment_deadline}`);
  }

  parts.push("");
  parts.push("## Document Content");
  parts.push(item.title);

  if (item.action_text) {
    parts.push("");
    parts.push(item.action_text);
  }

  if (item.raw_content) {
    // Send full content. Gemini Pro/Flash both support 1M tokens.
    parts.push("");
    parts.push(item.raw_content);
  }

  parts.push("");
  parts.push("## Topic Slugs (controlled vocabulary)");
  parts.push(
    "Only assign topics from this list: " + TOPIC_SLUGS.join(", ")
  );

  parts.push("");
  parts.push("## Product Category Slugs (controlled vocabulary)");
  parts.push(
    "Only assign product categories from this list: " +
      PRODUCT_CATEGORY_SLUGS.join(", ")
  );

  return parts.join("\n");
}

export { SYSTEM_PROMPT };
