import { z } from "zod";

/**
 * FDA guidance documents static JSON endpoint response.
 *
 * URL: https://www.fda.gov/files/api/datatables/static/search-for-guidance.json
 * Returns a flat array of objects (not paginated — all ~2,786 records in one request).
 *
 * Fields contain HTML strings (links, <time> tags, &amp; entities).
 */
export const GuidanceDocumentSchema = z.object({
  title: z.string(),                             // HTML: <a href="/path">Title</a>
  field_issue_datetime: z.string(),              // "MM/DD/YYYY"
  field_issuing_office_taxonomy: z.string(),     // "Human Foods Program", etc.
  field_final_guidance_1: z.string(),            // "Final", "Draft", "Withdrawn"
  field_comment_close_date: z.string(),          // "MM/DD/YYYY" or empty
  field_docket_number: z.string(),               // HTML: <a href="...">FDA-2020-D-1954</a> or empty
  field_regulated_product_field: z.string(),     // "Food &amp; Beverages", etc.
  // Fields we capture but don't map to regulatory_items columns
  "topics-product": z.string().optional(),       // comma-separated topics
  "open-comment": z.string().optional(),         // "  Yes " / "  No "
  field_center: z.string().optional(),           // center name (often same as issuing_office)
  changed: z.string().optional(),                // <time> last updated
});

export const GuidanceResponseSchema = z.array(GuidanceDocumentSchema);

export type GuidanceDocument = z.infer<typeof GuidanceDocumentSchema>;
