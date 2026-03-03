import { z } from "zod";

// ---------------------------------------------------------------------------
// List endpoint response (~8 fields from the documents list)
// ---------------------------------------------------------------------------

export const FRListDocumentSchema = z.object({
  document_number: z.string(),
  title: z.string(),
  type: z.enum([
    "Rule",
    "Proposed Rule",
    "Notice",
    "Presidential Document",
    "Executive Order",
    "Proclamation",
    "Administrative Order",
  ]),
  publication_date: z.string(), // "YYYY-MM-DD"
  abstract: z.string().nullable().optional(),
  html_url: z.string().url(),
  page_views: z.object({ count: z.number() }).optional(),
  significant: z.boolean().nullable().optional(),
});

export const FRListResponseSchema = z.object({
  count: z.number(),
  total_pages: z.number(),
  results: z.array(FRListDocumentSchema),
});

// ---------------------------------------------------------------------------
// Detail endpoint response (extends list with supplementary fields)
// ---------------------------------------------------------------------------

export const FRDetailDocumentSchema = FRListDocumentSchema.extend({
  cfr_references: z
    .array(z.object({ title: z.number(), part: z.number() }))
    .optional(),
  docket_ids: z.array(z.string()).optional(),
  effective_on: z.string().nullable().optional(),       // "YYYY-MM-DD"
  comments_close_on: z.string().nullable().optional(),  // "YYYY-MM-DD"
  action: z.string().nullable().optional(),
  raw_text_url: z.string().url().nullable().optional(),
});

export type FRListDocument = z.infer<typeof FRListDocumentSchema>;
export type FRDetailDocument = z.infer<typeof FRDetailDocumentSchema>;
