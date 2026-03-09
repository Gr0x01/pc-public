import { z } from "zod";

/**
 * Regulations.gov API v4 document list response.
 *
 * Each document has attributes with metadata about the regulatory action.
 * See: https://open.gsa.gov/api/regulationsgov/
 */

const RegulationsGovDocumentSchema = z.object({
  id: z.string(),
  attributes: z.object({
    documentType: z.string().nullable().optional(),
    title: z.string(),
    frDocNum: z.string().nullable().optional(),
    postedDate: z.string().nullable().optional(),
    commentEndDate: z.string().nullable().optional(),
    docketId: z.string().nullable().optional(),
    agencyId: z.string().nullable().optional(),
    objectId: z.string().nullable().optional(),
    highlightedContent: z.string().nullable().optional(),
  }),
  links: z.object({
    self: z.string(),
  }).optional(),
});

export const RegulationsGovResponseSchema = z.object({
  data: z.array(RegulationsGovDocumentSchema),
  meta: z.object({
    hasNextPage: z.boolean(),
    totalElements: z.number().optional(),
    pageNumber: z.number().optional(),
  }).optional(),
});

export type RegulationsGovDocument = z.infer<typeof RegulationsGovDocumentSchema>;
export type RegulationsGovResponse = z.infer<typeof RegulationsGovResponseSchema>;
