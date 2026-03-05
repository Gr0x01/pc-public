import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod schemas for API validation
// ---------------------------------------------------------------------------

export const CreateProductSchema = z.object({
  name: z.string().min(1).max(500),
  brand: z.string().max(300).nullish(),
  product_type: z.enum([
    "supplement",
    "food",
    "cosmetic",
    "drug",
    "medical_device",
    "biologic",
    "tobacco",
    "veterinary",
  ]),
  data_source: z.enum(["dsld", "fdc", "manual", "openfoodfacts", "label_scan"]),
  external_id: z.string().max(100).nullish(),
  raw_ingredients_text: z.string().max(50_000).nullish(),
  image_paths: z.array(z.string().max(500)).max(5).nullish(),
  parsed_ingredients: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        amount: z.string().max(50).optional(),
        unit: z.string().max(20).optional(),
      })
    )
    .max(200)
    .nullish(),
}).refine(
  (data) => {
    if (data.data_source === "dsld" && data.external_id) {
      return /^\d+$/.test(data.external_id);
    }
    return true;
  },
  { message: "DSLD external_id must be numeric", path: ["external_id"] }
);

export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  brand: z.string().max(300).nullish(),
});

export const DSLDSearchSchema = z.object({
  q: z.string().min(2).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface DSLDSearchResult {
  dsld_id: number;
  product_name: string;
  brand_name: string | null;
}

export interface DSLDProductDetail {
  dsld_id: number;
  product_name: string;
  brand_name: string | null;
  net_contents: string | null;
  serving_size: string | null;
  product_type: string | null;
  supplement_form: string | null;
  market_status: string | null;
  ingredients: DSLDIngredient[];
  other_ingredients: string | null;
}

export interface DSLDIngredient {
  ingredient_name: string;
  amount: string | null;
  unit: string | null;
  group_name: string | null;
}

export interface ProductSummary {
  id: string;
  name: string;
  brand: string | null;
  product_type: string;
  data_source: string;
  external_id: string | null;
  is_active: boolean;
  ingredient_count: number;
  created_at: string;
}

export interface ProductDetail {
  id: string;
  name: string;
  brand: string | null;
  product_type: string;
  product_category_id: string | null;
  data_source: string;
  external_id: string | null;
  raw_ingredients_text: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  ingredients: ProductIngredientRow[];
  images: { id: string; storage_path: string; sort_order: number }[];
}

export interface ParsedLabel {
  imageUrls: string[];
  imagePaths: string[];
  isLabelScan: boolean;
  ingredients: { name: string; amount?: string; unit?: string }[];
  productName: string | null;
  brand: string | null;
}

export interface ProductIngredientRow {
  id: string;
  name: string;
  normalized_name: string | null;
  substance_id: string | null;
  amount: string | null;
  unit: string | null;
  sort_order: number;
  normalization_status: string;
  normalization_confidence: number | null;
}
