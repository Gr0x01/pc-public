/**
 * Cross-Reference Inference Layer (Steps 1b + 1c)
 *
 * Step 1b: Deterministic use-context derivation from GSRS substance codes.
 *   Maps code systems (CFR, CODEX, DSLD, CIR, etc.) to use-context categories.
 *   Pure TypeScript — no LLM. GSRS codes are ground truth.
 *
 * Step 1c: LLM cross-category inference using Gemini 2.5 Pro with thinking.
 *   Given a regulatory action + known use contexts for extracted substances,
 *   reasons about which additional product categories are genuinely implicated.
 *
 * This is the single biggest product differentiator.
 * Without it, we're a summarizer. With it, we provide intelligence.
 */

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { PRODUCT_CATEGORY_SLUGS, type EnrichmentOutput } from "./prompts";
import { trackLLM } from "@/lib/analytics";

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
// Step 1c: Cross-Category Inference (LLM — Gemini 2.5 Pro + thinking)
// ---------------------------------------------------------------------------

export const SubstanceRole = z.enum([
  "regulatory_target",
  "contaminant_pathogen",
  "undeclared_allergen",
  "adulterant",
  "incidental",
]);

export const CrossReferenceOutputSchema = z.object({
  substance_analyses: z.array(
    z.object({
      substance_name: z.string(),
      role: SubstanceRole,
      role_reasoning: z.string(),
      new_product_categories: z.array(z.string()),
    })
  ),
  should_expand: z.boolean(),
  reasoning: z.string(),
});

export type CrossReferenceOutput = z.infer<typeof CrossReferenceOutputSchema>;

const CROSS_REF_SYSTEM_PROMPT = `You are a regulatory document analyst determining whether a regulatory action on one product category has genuine implications for other categories.

## YOUR TASK

You receive:
1. A regulatory action (from Step 1 analysis) with its type, summary, and directly affected product categories.
2. GSRS use-context data showing where each extracted substance is used across FDA-regulated sectors.

You must decide: does this action genuinely extend to product categories NOT already identified?

## STEP 1: CLASSIFY EACH SUBSTANCE'S ROLE

Before deciding on expansion, you MUST classify each substance's role in this regulatory action:

| Role | Definition | Expansion Rule |
|------|-----------|---------------|
| **regulatory_target** | The substance IS the subject of the action (banned, GRAS revoked, safety finding about the substance itself) | EXPAND to other categories where GSRS shows the substance is used, IF the safety concern applies via that exposure route |
| **contaminant_pathogen** | A biological/chemical hazard found IN a product (Listeria, Salmonella, E. coli, lead, cadmium) | DO NOT EXPAND beyond closely related food/supplement categories sharing supply chains. NEVER expand to pharma/devices/biologics — a Listeria food recall has zero relevance to vaccine research using attenuated Listeria |
| **undeclared_allergen** | A known allergen present but not declared on the label (milk, wheat, egg, soy, peanut, tree nuts, fish, shellfish, sesame) | DO NOT EXPAND. This is a labeling/facility-specific issue, not a substance safety signal |
| **adulterant** | A regulated substance found where it should NOT be (sildenafil in supplements, diclofenac in cosmetics, DMAA in sports products) | EXPAND to the pharma/regulated categories the adulterant belongs to — the signal is that a controlled substance is appearing in unregulated channels |
| **incidental** | A substance present in the product but NOT the cause of the action (citric acid in a product recalled for Listeria; sodium chloride in a product recalled for allergens) | NEVER EXPAND. This substance is irrelevant to the regulatory action |

## STEP 2: APPLY EXPANSION ONLY WHERE JUSTIFIED

After classifying roles, apply expansion ONLY for regulatory_target and adulterant roles. For those:
- The safety mechanism must apply across the exposure route (oral→oral is strong; oral→dermal is weak; oral→injectable is almost never valid)
- The GSRS use context must show actual use in the target category
- Common dual-use substances (salt, citric acid, glycerin, water) having pharma codes does NOT mean a food action extends to pharma

## CRITICAL RULES

1. **Pharma codes for common substances are NOT expansion signals.** RXCUI/DRUG BANK/DAILYMED entries for salt, citric acid, ascorbic acid, glycerin, etc. reflect their use as pharmaceutical excipients. A food recall involving these substances NEVER extends to pharma categories.

2. **Pathogens in food do not extend to biologics.** Listeria, Salmonella, E. coli having codes in vaccine/biologic databases reflects research use. A food contamination recall does not create risk for vaccines or cell_gene_therapy.

3. **Supply chain adjacency is the ONLY valid path for contaminant expansion.** A contaminated raw ingredient (e.g., a spice with lead) MAY extend to supplements using the same ingredient. It does NOT extend to pharma, devices, or cosmetics unless the FDA notice explicitly identifies a shared raw material supplier.

4. **When in doubt, do NOT expand.** False negatives (missing a cross-reference) are far less damaging than false positives (alerting a pharma company about a frozen waffle recall).

## IMMUTABILITY

You are ONLY adding new product categories. Never remove or modify categories already assigned in Step 1. Use ONLY slugs from the provided PRODUCT CATEGORY SLUGS list.`;

function buildCrossRefPrompt(
  output: EnrichmentOutput,
  substanceContexts: Map<string, { name: string; unii: string | null; contexts: UseContext[] }>
): string {
  const parts: string[] = [];

  parts.push("## Initial Analysis (from source document — Step 1)");
  parts.push(`Action type: ${output.regulatory_action_type}`);
  parts.push(`Summary: ${output.summary}`);
  parts.push(`Direct product categories: ${output.affected_product_categories.join(", ") || "none"}`);
  parts.push(`Affected ingredients (from Step 1): ${output.affected_ingredients.join(", ") || "none"}`);
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
    "Analyze whether this regulatory action creates genuine risk for product categories NOT already covered by Step 1. " +
    "Only expand to categories where the substance is actually used (per GSRS data above) AND the regulatory mechanism applies. " +
    "Use ONLY slugs from the product category list above."
  );

  return parts.join("\n");
}

/**
 * Step 1c: Infer cross-category implications using Gemini 2.5 Pro.
 *
 * Only fires when:
 * 1. Step 1 extracted substances (affected_ingredients non-empty)
 * 2. At least one substance resolved with similarity >= 0.95
 * 3. Use contexts found for resolved substances
 *
 * Returns null if cross-reference is not needed or fails.
 * Failure is NON-FATAL — the item proceeds with direct-only signals.
 */
export async function inferCrossCategories(
  output: EnrichmentOutput,
  useContextMap: Map<string, UseContext[]>,
  resolvedSubstances: Map<string, { name: string; unii: string | null }>,
  google: ReturnType<typeof createGoogleGenerativeAI>
): Promise<CrossReferenceOutput | null> {
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

    const { object } = await trackLLM(null, "cross_reference", "gemini-pro", () =>
      generateObject({
        model: google("gemini-3.1-pro-preview"),
        schema: CrossReferenceOutputSchema,
        system: CROSS_REF_SYSTEM_PROMPT,
        prompt,
        providerOptions: {
          google: { thinkingConfig: { thinkingBudget: 4096 } },
        },
      }),
      { substance_count: substanceContexts.size }
    );

    if (!object.should_expand) return null;

    // Only allow expansion from regulatory_target and adulterant roles
    const expandableRoles = new Set(["regulatory_target", "adulterant"]);
    const directCategories = new Set(output.affected_product_categories);

    for (const analysis of object.substance_analyses) {
      // Belt-and-suspenders: strip categories from non-expandable roles
      if (!expandableRoles.has(analysis.role)) {
        analysis.new_product_categories = [];
        continue;
      }
      // Deduplicate: remove categories already in Step 1's direct output
      analysis.new_product_categories = analysis.new_product_categories.filter(
        (cat) => !directCategories.has(cat)
      );
    }

    // Remove empty analyses
    object.substance_analyses = object.substance_analyses.filter(
      (a) => a.new_product_categories.length > 0
    );

    if (object.substance_analyses.length === 0) return null;

    return object;
  } catch (err) {
    console.warn(
      `Step 1c error: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }
}
