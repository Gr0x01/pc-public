import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";
import { INTEL_PAGE_TYPES, LINK_TYPES } from "@/lib/intelligence/types";
import { checkRateLimit } from "@/lib/rate-limit";

const IntelPageSchema = z.object({
  page_type: z.enum(INTEL_PAGE_TYPES),
  slug: z
    .string()
    .min(1)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase alphanumeric with hyphens"
    ),
  title: z.string().min(1).max(300),
  excerpt: z.string().min(1).max(1000),
  content: z.string().min(1).max(500_000),
  structured_data: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(["draft", "published", "needs_refresh"]).default("draft"),
  seo_title: z.string().max(200).nullish(),
  seo_description: z.string().max(500).nullish(),
  cover_image_url: z.string().url().nullish(),
  linked_item_ids: z
    .array(z.object({ item_id: z.string().uuid(), relevance: z.enum(["primary", "supporting", "mentioned"]).default("supporting") }))
    .optional(),
  linked_pages: z
    .array(z.object({ page_type: z.enum(INTEL_PAGE_TYPES), slug: z.string(), link_type: z.enum(LINK_TYPES) }))
    .optional(),
});

function isValidApiKey(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function POST(request: Request) {
  // 1. Auth
  const BLOG_API_KEY = process.env.BLOG_API_KEY;
  if (!BLOG_API_KEY) {
    console.error("[intelligence] BLOG_API_KEY is not configured");
    return Response.json(
      { error: { message: "Server misconfigured" } },
      { status: 500 }
    );
  }

  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || !isValidApiKey(apiKey, BLOG_API_KEY)) {
    return Response.json(
      { error: { message: "Unauthorized" } },
      { status: 401 }
    );
  }

  if (!(await checkRateLimit("intelligence:write", 10))) {
    return Response.json(
      { error: { message: "Too many requests. Please wait a moment." } },
      { status: 429 }
    );
  }

  // 2. Validate input
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const result = IntelPageSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }

  const {
    page_type,
    slug,
    title,
    excerpt,
    content,
    structured_data,
    status,
    seo_title,
    seo_description,
    cover_image_url,
    linked_item_ids,
    linked_pages,
  } = result.data;

  // 3. Check existing to preserve published_at
  const { data: existing } = await adminClient
    .from("intelligence_pages")
    .select("id, published_at")
    .eq("page_type", page_type)
    .eq("slug", slug)
    .maybeSingle();

  let published_at: string | null = null;
  if (existing?.published_at) {
    published_at = existing.published_at;
  } else if (status === "published") {
    published_at = new Date().toISOString();
  }

  const word_count = content.trim().split(/\s+/).length;

  const pageData = {
    page_type,
    slug,
    title,
    excerpt,
    content,
    structured_data,
    status,
    published_at,
    seo_title: seo_title ?? null,
    seo_description: seo_description ?? null,
    cover_image_url: cover_image_url ?? null,
    word_count,
    ...(status === "published" && existing
      ? { last_refreshed_at: new Date().toISOString() }
      : {}),
    // Clear refresh_reason when publishing (page is now up to date)
    ...(status === "published" ? { refresh_reason: null } : {}),
  };

  // 4. Upsert on (page_type, slug)
  const { data, error } = await adminClient
    .from("intelligence_pages")
    .upsert(pageData, { onConflict: "page_type,slug" })
    .select("id, page_type, slug, status, published_at")
    .single();

  if (error) {
    console.error("[intelligence] upsert error:", error);
    return Response.json(
      { error: { message: "Failed to save page" } },
      { status: 500 }
    );
  }

  const pageId = data.id;

  // 5. Handle linked regulatory items
  if (linked_item_ids && linked_item_ids.length > 0) {
    // Clear existing links and re-insert
    await adminClient
      .from("intelligence_page_items")
      .delete()
      .eq("page_id", pageId);

    const itemRows = linked_item_ids.map((link) => ({
      page_id: pageId,
      item_id: link.item_id,
      relevance: link.relevance,
    }));

    const { error: itemErr } = await adminClient
      .from("intelligence_page_items")
      .insert(itemRows);

    if (itemErr) {
      console.error("[intelligence] linked items error:", itemErr);
    }
  }

  // 6. Handle linked pages (cross-references)
  if (linked_pages && linked_pages.length > 0) {
    // Clear existing outgoing links
    await adminClient
      .from("intelligence_page_links")
      .delete()
      .eq("source_page_id", pageId);

    // Batch-resolve all target page IDs
    const targetResults = await Promise.all(
      linked_pages.map((link) =>
        adminClient
          .from("intelligence_pages")
          .select("id")
          .eq("page_type", link.page_type)
          .eq("slug", link.slug)
          .maybeSingle()
      )
    );

    const linkRows = linked_pages
      .map((link, i) => {
        const target = targetResults[i].data;
        if (!target) return null;
        return {
          source_page_id: pageId,
          target_page_id: target.id,
          link_type: link.link_type,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (linkRows.length > 0) {
      const { error: linkErr } = await adminClient
        .from("intelligence_page_links")
        .insert(linkRows);

      if (linkErr) {
        console.error("[intelligence] linked pages error:", linkErr);
      }
    }
  }

  return Response.json({ data, error: null });
}
