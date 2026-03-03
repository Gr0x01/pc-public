import { z } from "zod";

/**
 * DataTables AJAX response from the FDA warning letters endpoint.
 *
 * `data` is an array of arrays — each inner array is one row with 7 columns (0-indexed):
 *   0: posted_date  — <time datetime="...">MM/DD/YYYY</time>
 *   1: issue_date   — same format
 *   2: company_html — raw HTML containing <a href="/path-to-letter">Company Name</a>
 *   3: issuing_office
 *   4: subject
 *   5: response_letter  — "Yes"/"No" or HTML link
 *   6: closeout_letter  — "Yes"/"No" or HTML link
 *
 * Per-row validation is done by array index access + row.length guard in the fetcher,
 * not by a separate row schema.
 */
export const WLAjaxResponseSchema = z.object({
  data: z.array(z.array(z.string())),
  recordsTotal: z.number(),
  recordsFiltered: z.number(),
});

export type WLAjaxResponse = z.infer<typeof WLAjaxResponseSchema>;
