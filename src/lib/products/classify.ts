import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";
import { trackLLM } from "@/lib/analytics";
import { PRODUCT_CATEGORY_SLUGS } from "@/pipeline/enrichment/prompts";

// ---------------------------------------------------------------------------
// Gemini Flash (own instance — no server-only, callable from CLI scripts)
// ---------------------------------------------------------------------------

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const ClassificationSchema = z.object({
  category_slug: z
    .string()
    .describe("The single best-matching product category slug from the provided list."),
});

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an FDA product classifier. Given a product's name, brand, type, and ingredients, select the single most specific product category from the controlled vocabulary list.

Rules:
- Pick exactly ONE category slug from the list provided.
- Choose the most specific match — e.g. "protein_powders" over "other_supplement" for a whey protein product.
- Use the product_type as a guide for which group of slugs to focus on, but cross-category is allowed if the product clearly fits better elsewhere.
- If nothing fits well, use the "other_" category for that product type (e.g. "other_food", "other_supplement", "other_cosmetic").`;

function buildPrompt(product: {
  name: string;
  brand?: string | null;
  product_type: string;
  ingredients?: string[];
}): string {
  const parts = [
    `Product Name: ${product.name}`,
    product.brand ? `Brand: ${product.brand}` : null,
    `Product Type: ${product.product_type}`,
    product.ingredients && product.ingredients.length > 0
      ? `Ingredients: ${product.ingredients.join(", ")}`
      : null,
    "",
    "Available category slugs:",
    PRODUCT_CATEGORY_SLUGS.join(", "),
  ];
  return parts.filter((p) => p !== null).join("\n");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classify a product into a product_category and update the DB row.
 * Non-fatal — logs errors but never throws.
 */
export async function classifyProduct(
  productId: string,
  product: {
    name: string;
    brand?: string | null;
    product_type: string;
    ingredients?: string[];
  },
  userId?: string | null
): Promise<string | null> {
  try {
    const prompt = buildPrompt(product);

    const { object } = await trackLLM(
      userId ?? null,
      "product_classification",
      "gemini-flash",
      () =>
        generateObject({
          model: google("gemini-2.5-flash"),
          schema: ClassificationSchema,
          system: SYSTEM_PROMPT,
          prompt,
        })
    );

    const slug = object.category_slug;

    // Validate against controlled vocab
    if (!(PRODUCT_CATEGORY_SLUGS as readonly string[]).includes(slug)) {
      console.warn(`[classify] LLM returned unknown slug "${slug}" for product ${productId}`);
      return null;
    }

    // Look up category ID
    const { data: category } = await adminClient
      .from("product_categories")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!category) {
      console.warn(`[classify] slug "${slug}" not found in product_categories table`);
      return null;
    }

    // Update product row
    const { error } = await adminClient
      .from("subscriber_products")
      .update({ product_category_id: category.id })
      .eq("id", productId);

    if (error) {
      console.error("[classify] update error:", error);
      return null;
    }

    return slug;
  } catch (err) {
    console.error("[classify] classification failed for product", productId, err);
    return null;
  }
}
