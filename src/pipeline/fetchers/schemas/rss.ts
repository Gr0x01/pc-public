import { z } from "zod";

/**
 * Represents a single <item> from an RSS 2.0 feed.
 *
 * fast-xml-parser may return guid as a plain string or as an object
 * with a '#text' key when attributes are present (e.g. isPermaLink="false").
 */
export const RssItemSchema = z.object({
  title: z.string(),
  link: z.string(),
  pubDate: z.string().optional(),
  description: z.string().optional(),
  guid: z
    .union([z.string(), z.object({ "#text": z.string() })])
    .optional(),
});

export type RssItem = z.infer<typeof RssItemSchema>;
