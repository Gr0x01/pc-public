/**
 * Cross-Reference Inference Layer (Steps 1b + 1c)
 *
 * Step 1b: Deterministic use-context derivation from GSRS substance codes.
 *   Maps code systems (CFR, CODEX, DSLD, CIR, etc.) to use-context categories.
 *   Pure TypeScript — no LLM. GSRS codes are ground truth.
 *
 * Step 1c: LLM cross-segment inference using Gemini 2.5 Pro with thinking.
 *   Given a regulatory action + known use contexts for extracted substances,
 *   reasons about which additional segments are genuinely implicated.
 *   Only fires when use contexts reveal segments beyond Step 1's direct extraction.
 *
 * This is the single biggest product differentiator.
 * Without it, we're a summarizer. With it, we provide intelligence.
 */

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { PRODUCT_CATEGORY_SLUGS, type EnrichmentOutput } from "./prompts";

// ---------------------------------------------------------------------------
// Step 1b: Use-Context Categories (deterministic)
// ---------------------------------------------------------------------------

export type UseContextCategory =
  | "food_additive"
  | "food_contact"
  | "color_additive"
  | "supplement_ingredient"
  | "cosmetic_ingredient"
  | "pharmaceutical"
  | "otc_drug"
  | "pesticide";

export interface UseContext {
  category: UseContextCategory;
  detail: string | null;
  source: string;
  code_value: string;
}

// Maps GSRS code systems → UseContextCategory
// CFR has nuanced Part-based mapping (see deriveCfrCategory)

function cfrPartToCategory(part: number): UseContextCategory | null {
  // food_contact (175-178) is a subset of food_additive (170-189) — check first
  if (part >= 175 && part <= 178) return "food_contact";
  if (part >= 170 && part <= 189) return "food_additive";
  if (part >= 73 && part <= 82) return "color_additive";
  if (part >= 310 && part <= 369) return "otc_drug";
  if (part >= 700 && part <= 740) return "cosmetic_ingredient";
  return null;
}

function deriveCfrCategory(codeValue: string): UseContextCategory | null {
  // CFR codes: "21 CFR 172.110", "172", "Part 172", "172.110"
  // Must skip the title number (21) and extract the Part number
  const fullCfrMatch = codeValue.match(/CFR\s+(\d+)/);
  if (fullCfrMatch) {
    return cfrPartToCategory(parseInt(fullCfrMatch[1], 10));
  }
  // Fallback: "Part 172" or bare "172" / "172.110"
  const partMatch = codeValue.match(/(?:Part\s+)?(\d{2,3})(?:\.|$)/);
  if (!partMatch) return null;
  return cfrPartToCategory(parseInt(partMatch[1], 10));
}

function parseFunctionalClass(comments: string | null): string | null {
  if (!comments) return null;
  // CODEX/JECFA comments: "Functional Classification|Antioxidant" or "ANTIOXIDANT"
  const pipeMatch = comments.match(/Functional Classification\|(.+)/i);
  if (pipeMatch) return pipeMatch[1].trim();
  // Sometimes just the class name
  if (comments.length < 60 && /^[A-Z\s,]+$/i.test(comments.trim())) {
    return comments.trim();
  }
  return null;
}

interface SubstanceCodeRow {
  substance_id: string;
  code_system: string;
  code_value: string;
  code_type: string | null;
  is_classification: boolean;
  comments: string | null;
}

/**
 * Step 1b: Look up use contexts for resolved substances.
 * Pure DB query + deterministic TypeScript mapping. No LLM.
 *
 * @param substanceIds - substance_ids with high-confidence resolution (>= 0.95)
 * @param supabase - Supabase client
 * @returns Map of substance_id → UseContext[]
 */
export async function lookupUseContexts(
  substanceIds: string[],
  supabase: SupabaseClient
): Promise<Map<string, UseContext[]>> {
  const result = new Map<string, UseContext[]>();
  if (substanceIds.length === 0) return result;

  // Batch query all codes for these substances
  const { data: codes, error } = await supabase
    .from("substance_codes")
    .select("substance_id, code_system, code_value, code_type, is_classification, comments")
    .in("substance_id", substanceIds);

  if (error || !codes) {
    console.warn(`Step 1b: substance_codes query error: ${error?.message}`);
    return result;
  }

  for (const code of codes as SubstanceCodeRow[]) {
    const contexts = result.get(code.substance_id) ?? [];

    let category: UseContextCategory | null = null;
    let detail: string | null = null;

    // All code systems are stored in substance_codes (no ingestion filter).
    // This switch maps the systems we know how to interpret to UseContextCategories.
    switch (code.code_system) {
      case "CFR":
        category = deriveCfrCategory(code.code_value);
        break;

      case "CODEX ALIMENTARIUS (GSFA)":
        category = "food_additive";
        detail = parseFunctionalClass(code.comments);
        break;

      case "JECFA EVALUATION":
        category = "food_additive";
        detail = parseFunctionalClass(code.comments);
        break;

      case "DSLD":
        category = "supplement_ingredient";
        break;

      // NOTE: CIR does not exist in GSRS. Cosmetic data needs a separate source.

      case "RXCUI":
      case "DRUG BANK":
      case "DAILYMED":
        category = "pharmaceutical";
        break;

      case "EPA PESTICIDE CODE":
        category = "pesticide";
        break;

      case "Food Contact Sustance Notif, (FCN No.)":
        category = "food_contact";
        break;
    }

    if (category) {
      // Deduplicate: don't add same category twice for same substance
      if (!contexts.some((c) => c.category === category && c.source === code.code_system)) {
        contexts.push({
          category,
          detail,
          source: code.code_system,
          code_value: code.code_value,
        });
      }
      result.set(code.substance_id, contexts);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Step 1c: Cross-Segment Inference (LLM — Gemini 2.5 Pro + thinking)
// ---------------------------------------------------------------------------

export const CrossReferenceOutputSchema = z.object({
  cross_references: z.array(
    z.object({
      substance_name: z.string(),
      new_segments: z.array(
        z.object({
          segment: z.enum(["food", "supplements", "cosmetics"]),
          relevance: z.enum(["critical", "high", "medium", "low"]),
          impact_summary: z.string().max(500),
          action_items: z.array(z.string()),
          who_affected: z.string().max(200),
        })
      ),
      new_product_categories: z.array(z.string()),
    })
  ),
  should_expand: z.boolean(),
  reasoning: z.string(),
});

export type CrossReferenceOutput = z.infer<typeof CrossReferenceOutputSchema>;

const CROSS_REF_SYSTEM_PROMPT = `You are an expert FDA regulatory compliance analyst specializing in cross-segment risk assessment.

Your task: Given a regulatory action affecting a substance in one segment, determine whether the same substance's presence in OTHER segments creates genuine regulatory risk for those segments.

## CORE PRINCIPLES

1. **Substance identity is ground truth.** The GSRS use-context data tells you where this substance is actually used. Do not speculate about use contexts not listed.

2. **The regulatory action's MECHANISM determines cross-segment relevance.**
   - Cancer risk from oral exposure → extends to ALL oral contexts (food ↔ supplements)
   - GRAS revocation → check DSHEA implications for supplements
   - Contamination concern → extends to any context where the substance is present
   - Labeling-only changes → segment-specific, do NOT extend
   - One company's GMP violation → does NOT generalize across segments
   - Import/trade compliance → segment-specific, do NOT extend
   - Administrative actions (meetings, notices) → do NOT extend

3. **Exposure route matters.**
   - Oral exposure risks (food additives, supplements) are bidirectional
   - Dermal exposure (cosmetics) has a different risk profile than oral
   - If the regulatory concern is about systemic toxicity, dermal absorption may still be relevant (but at lower confidence)
   - If the concern is about ingestion-specific effects (GI tract, liver metabolism), cosmetic dermal use is less relevant

4. **Confidence thresholds are strict.**
   - Only include cross-segment expansions where confidence >= 0.7
   - "critical" = the regulatory action's core concern directly applies (e.g., cancer risk for same oral exposure route)
   - "high" = strong regulatory precedent for cross-segment application (e.g., FDA historically extends food bans to supplements)
   - "medium" = plausible but different risk profile (e.g., dermal vs oral exposure for a systemic toxicant)
   - "low" = tangential connection, may warrant monitoring but not alerting

5. **DO NOT EXTEND when:**
   - The regulatory action is about labeling, not safety
   - The action is company-specific (one firm's violation)
   - The substance role is fundamentally different across contexts (e.g., used as active ingredient in pharma but only as trace preservative in food)
   - Import/trade restrictions (segment-specific)
   - Administrative actions

6. **Immutability rule:** You are ONLY adding new segments. Never modify or remove the existing direct segments from Step 1.

7. **Product categories:** Use ONLY slugs from the provided PRODUCT CATEGORY SLUGS list for new_product_categories. Do not invent new slugs.`;

function buildCrossRefPrompt(
  output: EnrichmentOutput,
  substanceContexts: Map<string, { name: string; unii: string | null; contexts: UseContext[] }>
): string {
  const parts: string[] = [];

  parts.push("## Initial Analysis (from source document — Step 1)");
  parts.push(`Action type: ${output.regulatory_action_type}`);
  parts.push(`Summary: ${output.summary}`);

  const directSegments = output.segments.map((s) => s.segment).join(", ") || "none";
  parts.push(`Segments already identified: ${directSegments}`);
  parts.push("");

  parts.push("## Substance Use Contexts (from FDA GSRS — ground truth)");
  parts.push("");

  for (const [substanceId, info] of substanceContexts) {
    parts.push(`**${info.name}**${info.unii ? ` (UNII: ${info.unii})` : ""} [id: ${substanceId}]`);

    // Group contexts by category for readability
    const byCategory = new Map<UseContextCategory, UseContext[]>();
    for (const ctx of info.contexts) {
      const list = byCategory.get(ctx.category) ?? [];
      list.push(ctx);
      byCategory.set(ctx.category, list);
    }

    const categoryLabels: Record<UseContextCategory, string> = {
      food_additive: "Food additive",
      food_contact: "Food-contact material",
      color_additive: "Color additive",
      supplement_ingredient: "Dietary supplement ingredient",
      cosmetic_ingredient: "Cosmetic ingredient",
      pharmaceutical: "Pharmaceutical",
      otc_drug: "OTC drug",
      pesticide: "Pesticide",
    };

    for (const [cat, ctxList] of byCategory) {
      const details = ctxList
        .map((c) => {
          const codeParts = [c.code_value];
          if (c.detail) codeParts.push(c.detail);
          return codeParts.join(", ");
        })
        .join("; ");
      parts.push(`- ${categoryLabels[cat]}: Yes (${details})`);
    }
    parts.push("");
  }

  parts.push("## Product Category Slugs (controlled vocabulary)");
  parts.push(
    "Only assign product categories from this list: " +
      PRODUCT_CATEGORY_SLUGS.join(", ")
  );
  parts.push("");

  parts.push("## Task");
  parts.push(
    "Analyze whether this regulatory action creates genuine risk for segments NOT already identified in Step 1. " +
    "Only expand to segments where the substance is actually used (per GSRS data above) AND the regulatory mechanism applies. " +
    "For new_product_categories, use ONLY slugs from the product category list above."
  );

  return parts.join("\n");
}

/**
 * Determines which segments are already covered by Step 1's direct extraction.
 */
function getDirectSegments(output: EnrichmentOutput): Set<string> {
  return new Set(output.segments.map((s) => s.segment));
}

/**
 * Maps UseContextCategory to the corresponding segment for cross-reference checking.
 */
function categoryToSegment(category: UseContextCategory): string | null {
  switch (category) {
    case "food_additive":
    case "food_contact":
    case "color_additive":
      return "food";
    case "supplement_ingredient":
      return "supplements";
    case "cosmetic_ingredient":
      return "cosmetics";
    default:
      return null; // pharmaceutical, otc_drug, pesticide don't map to our segments
  }
}

/**
 * Step 1c: Infer cross-segment implications using Gemini 2.5 Pro.
 *
 * Only fires when:
 * 1. Step 1 extracted substances (affected_ingredients non-empty)
 * 2. At least one substance resolved with similarity >= 0.95
 * 3. Use contexts reveal segments BEYOND what Step 1 already found
 *
 * Returns null if cross-reference is not needed or fails.
 * Failure is NON-FATAL — the item proceeds with direct-only signals.
 */
export async function inferCrossSegments(
  output: EnrichmentOutput,
  useContextMap: Map<string, UseContext[]>,
  resolvedSubstances: Map<string, { name: string; unii: string | null }>,
  google: ReturnType<typeof createGoogleGenerativeAI>
): Promise<CrossReferenceOutput | null> {
  // Gate check: are there segments beyond what Step 1 found?
  const directSegments = getDirectSegments(output);
  let hasNewSegments = false;

  for (const [substanceId, contexts] of useContextMap) {
    for (const ctx of contexts) {
      const seg = categoryToSegment(ctx.category);
      if (seg && !directSegments.has(seg)) {
        hasNewSegments = true;
        break;
      }
    }
    if (hasNewSegments) break;
  }

  if (!hasNewSegments) {
    return null; // No cross-segment expansion needed
  }

  // Build substance context map for the prompt
  const substanceContexts = new Map<string, { name: string; unii: string | null; contexts: UseContext[] }>();
  for (const [substanceId, contexts] of useContextMap) {
    const info = resolvedSubstances.get(substanceId);
    if (info) {
      substanceContexts.set(substanceId, { ...info, contexts });
    }
  }

  if (substanceContexts.size === 0) return null;

  try {
    const prompt = buildCrossRefPrompt(output, substanceContexts);

    const { object } = await generateObject({
      model: google("gemini-2.5-pro"),
      schema: CrossReferenceOutputSchema,
      system: CROSS_REF_SYSTEM_PROMPT,
      prompt,
      providerOptions: {
        google: { thinkingConfig: { thinkingBudget: 4096 } },
      },
    });

    if (!object.should_expand) return null;

    // Apply confidence floor: drop segments with relevance below our threshold
    // "low" is our floor — we keep low+ but drop anything the LLM explicitly didn't include
    // The confidence threshold is enforced by prompt instruction (>= 0.7 confidence to include)
    // Here we filter out any cross-references that only add segments already in direct
    for (const ref of object.cross_references) {
      ref.new_segments = ref.new_segments.filter(
        (seg) => !directSegments.has(seg.segment)
      );
    }

    // Remove empty cross-references
    object.cross_references = object.cross_references.filter(
      (ref) => ref.new_segments.length > 0 || ref.new_product_categories.length > 0
    );

    if (object.cross_references.length === 0) return null;

    return object;
  } catch (err) {
    console.warn(
      `Step 1c error: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }
}
