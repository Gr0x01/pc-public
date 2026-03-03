import { z } from "zod";

// ---------------------------------------------------------------------------
// Single enforcement record from openFDA food enforcement endpoint
// ---------------------------------------------------------------------------

export const EnforcementRecordSchema = z.object({
  recall_number: z.string().optional(),
  event_id: z.string().optional(),
  status: z.string(),
  recalling_firm: z.string(),
  product_description: z.string(),
  reason_for_recall: z.string(),
  report_date: z.string(),              // "YYYYMMDD"
  recall_initiation_date: z.string().optional(),
  classification: z.string().optional(), // "Class I", "Class II", "Class III"
  voluntary_mandated: z.string().optional(),
  distribution_pattern: z.string().optional(),
  product_quantity: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  address_1: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Paginated API response wrapper
// ---------------------------------------------------------------------------

export const EnforcementResponseSchema = z.object({
  meta: z.object({
    results: z.object({
      total: z.number(),
      skip: z.number(),
      limit: z.number(),
    }),
  }),
  results: z.array(EnforcementRecordSchema),
});

export type EnforcementRecord = z.infer<typeof EnforcementRecordSchema>;
