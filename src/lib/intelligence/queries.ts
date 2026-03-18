import "server-only";
import { cache } from "react";
import { adminClient } from "@/lib/supabase/admin";
import type {
  IntelPageType,
  IntelligencePage,
  IntelligencePageSummary,
} from "./types";

const SUMMARY_COLUMNS =
  "id, page_type, slug, title, excerpt, structured_data, cover_image_url, word_count, published_at";

const FULL_COLUMNS =
  "id, page_type, slug, title, excerpt, content, structured_data, status, seo_title, seo_description, cover_image_url, word_count, published_at, last_refreshed_at, refresh_reason, created_at, updated_at";

/**
 * Single page by type and slug — only published pages.
 * Wrapped in cache() to deduplicate generateMetadata + page component calls.
 */
export const getPageByTypeAndSlug = cache(async function getPageByTypeAndSlug(
  type: IntelPageType,
  slug: string
): Promise<IntelligencePage | null> {
  const { data, error } = await adminClient
    .from("intelligence_pages")
    .select(FULL_COLUMNS)
    .eq("page_type", type)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("[intelligence] getPageByTypeAndSlug error:", error);
    return null;
  }

  return data as IntelligencePage | null;
});

/**
 * Published pages for index. Optionally filtered by type.
 */
export async function getPublishedPages(
  type?: IntelPageType,
  limit?: number
): Promise<IntelligencePageSummary[]> {
  let query = adminClient
    .from("intelligence_pages")
    .select(SUMMARY_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (type) {
    query = query.eq("page_type", type);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[intelligence] getPublishedPages error:", error);
    return [];
  }

  return data as IntelligencePageSummary[];
}

/**
 * Cross-referenced pages linked to a given page (both directions).
 */
export async function getLinkedPages(
  pageId: string
): Promise<IntelligencePageSummary[]> {
  // Get pages linked in both directions (parallel)
  const [
    { data: outgoing, error: outErr },
    { data: incoming, error: inErr },
  ] = await Promise.all([
    adminClient
      .from("intelligence_page_links")
      .select("target_page_id")
      .eq("source_page_id", pageId),
    adminClient
      .from("intelligence_page_links")
      .select("source_page_id")
      .eq("target_page_id", pageId),
  ]);

  if (outErr || inErr) {
    console.error("[intelligence] getLinkedPages error:", outErr || inErr);
    return [];
  }

  const linkedIds = new Set<string>();
  for (const row of outgoing ?? []) linkedIds.add(row.target_page_id);
  for (const row of incoming ?? []) linkedIds.add(row.source_page_id);

  if (linkedIds.size === 0) return [];

  const { data, error } = await adminClient
    .from("intelligence_pages")
    .select(SUMMARY_COLUMNS)
    .eq("status", "published")
    .in("id", Array.from(linkedIds));

  if (error) {
    console.error("[intelligence] getLinkedPages fetch error:", error);
    return [];
  }

  return data as IntelligencePageSummary[];
}

/**
 * Source regulatory items linked to a page.
 */
export async function getPageItems(
  pageId: string
): Promise<{ item_id: string; relevance: string }[]> {
  const { data, error } = await adminClient
    .from("intelligence_page_items")
    .select("item_id, relevance")
    .eq("page_id", pageId)
    .order("relevance", { ascending: true }); // primary first

  if (error) {
    console.error("[intelligence] getPageItems error:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Published pages for RSS feed — minimal projection.
 */
export async function getPagesForRSS(): Promise<
  {
    page_type: IntelPageType;
    slug: string;
    title: string;
    excerpt: string;
    cover_image_url: string | null;
    published_at: string | null;
  }[]
> {
  const { data, error } = await adminClient
    .from("intelligence_pages")
    .select("page_type, slug, title, excerpt, cover_image_url, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[intelligence] getPagesForRSS error:", error);
    return [];
  }

  return data as {
    page_type: IntelPageType;
    slug: string;
    title: string;
    excerpt: string;
    cover_image_url: string | null;
    published_at: string | null;
  }[];
}

/**
 * Related pages — same type, excluding current slug.
 */
export async function getRelatedPages(
  type: IntelPageType,
  excludeSlug: string,
  limit = 6
): Promise<IntelligencePageSummary[]> {
  const { data, error } = await adminClient
    .from("intelligence_pages")
    .select(SUMMARY_COLUMNS)
    .eq("status", "published")
    .eq("page_type", type)
    .neq("slug", excludeSlug)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[intelligence] getRelatedPages error:", error);
    return [];
  }

  return data as IntelligencePageSummary[];
}
