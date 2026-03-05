import "server-only";
import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import { geminiFlash } from "@/lib/ai/gemini";
import { gpt4oMini } from "@/lib/ai/openai";
import { claudeHaiku } from "@/lib/ai/anthropic";

// ---------------------------------------------------------------------------
// Vision model fallback chain: Gemini Flash → GPT-4o-mini → Claude Haiku
// Each model gets 1 retry before falling through to the next.
// ---------------------------------------------------------------------------

const VISION_MODELS: { name: string; model: LanguageModel; retries: number }[] = [
  { name: "gemini-flash", model: geminiFlash as LanguageModel, retries: 1 },
  { name: "gpt-4o-mini", model: gpt4oMini as LanguageModel, retries: 1 },
  { name: "claude-haiku", model: claudeHaiku as LanguageModel, retries: 1 },
];

// ---------------------------------------------------------------------------
// Output schema
// ---------------------------------------------------------------------------

const IngredientSchema = z.object({
  name: z.string().describe("Ingredient name as printed on the label"),
  amount: z.string().optional().describe("Amount per serving if listed (e.g. '500', '1.5')"),
  unit: z.string().optional().describe("Unit for the amount (e.g. 'mg', 'g', 'mcg', 'IU')"),
});

const LabelExtractionSchema = z.object({
  product_name: z.string().optional().describe("Product name if visible on the label"),
  brand: z.string().optional().describe("Brand name if visible on the label"),
  ingredients: z.array(IngredientSchema).describe("All ingredients found on the label"),
});

export type LabelExtraction = z.infer<typeof LabelExtractionSchema>;
export type ExtractedIngredient = z.infer<typeof IngredientSchema>;

export interface VisionResult {
  data: LabelExtraction;
  model: string;
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert at reading product labels. Extract the INGREDIENTS LIST from one or more product label images.

IMPORTANT: Look for the section labeled "Ingredients:" — a comma-separated list of what the product is made from.

DO NOT extract from the "Nutrition Facts" panel. Nutrients like Protein, Sodium, Total Fat, Cholesterol are NOT ingredients.

For "Supplement Facts" panels, extract the nutrient rows (e.g. Vitamin C 500mg, Biotin 5000mcg) — those ARE the active ingredients.

CRITICAL — We use this list to match against FDA regulatory actions. Every item you return must be an individual substance that the FDA would regulate or reference (e.g. a chemical, food additive, vitamin, mineral, plant extract).

When ingredients contain parenthetical sub-ingredients, return only the individual substances from within — not the branded group name. Flatten recursively if nested.

Rules:
- Return a flat list of individual substances, in the order they appear on the label
- For supplement facts nutrients, include the amount and unit
- Deduplicate: if the same substance appears in multiple sub-groups, list it only once
- If you can read the product name or brand, include them
- Combine information across all images — they may show different sides of the same product
- Do not guess or infer ingredients that aren't visible
- If the images are blurry or unreadable, return an empty ingredients list`;

export async function extractIngredientsFromImages(
  images: { base64: string; mimeType: string }[]
): Promise<VisionResult> {
  const errors: string[] = [];

  const imageParts: Array<{ type: "image"; image: string; mediaType: string }> =
    images.map((img) => ({
      type: "image" as const,
      image: img.base64,
      mediaType: img.mimeType,
    }));

  for (const { name, model, retries } of VISION_MODELS) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const { object } = await generateObject({
          model,
          schema: LabelExtractionSchema,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: SYSTEM_PROMPT },
                ...imageParts,
              ],
            },
          ],
        });

        return { data: object, model: name };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${name} attempt ${attempt + 1}: ${msg}`);
      }
    }
  }

  throw new Error(
    `All vision models failed to extract ingredients.\n${errors.join("\n")}`
  );
}
