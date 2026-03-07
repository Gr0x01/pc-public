import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";
import { BLOG_CATEGORIES } from "@/lib/blog/types";
import { checkRateLimit } from "@/lib/rate-limit";

const BlogPostSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  title: z.string().min(1).max(300),
  excerpt: z.string().min(1).max(1000),
  content: z.string().min(1).max(500_000),
  category: z.enum(BLOG_CATEGORIES),
  status: z.enum(["draft", "published"]).default("draft"),
  seo_title: z.string().max(200).nullish(),
  seo_description: z.string().max(500).nullish(),
  cover_image_url: z.string().url().nullish(),
});

function isValidApiKey(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function POST(request: Request) {
  // 1. Auth — API key check
  const BLOG_API_KEY = process.env.BLOG_API_KEY;
  if (!BLOG_API_KEY) {
    console.error("[blog] BLOG_API_KEY is not configured");
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

  if (!(await checkRateLimit(`blog:${apiKey.slice(-8)}`, 5))) {
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

  const result = BlogPostSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: result.error.flatten() },
      { status: 400 }
    );
  }

  const { slug, title, excerpt, content, category, status, seo_title, seo_description, cover_image_url } =
    result.data;

  // 3. Check if post already exists (to preserve published_at)
  const { data: existing } = await adminClient
    .from("blog_posts")
    .select("id, published_at")
    .eq("slug", slug)
    .maybeSingle();

  // Determine published_at: preserve existing, or set on first publish
  let published_at: string | null = null;
  if (existing?.published_at) {
    published_at = existing.published_at;
  } else if (status === "published") {
    published_at = new Date().toISOString();
  }

  const word_count = content.trim().split(/\s+/).length;

  const postData = {
    slug,
    title,
    excerpt,
    content,
    category,
    status,
    published_at,
    seo_title: seo_title ?? null,
    seo_description: seo_description ?? null,
    cover_image_url: cover_image_url ?? null,
    word_count,
  };

  // 4. Upsert on slug
  const { data, error } = await adminClient
    .from("blog_posts")
    .upsert(postData, { onConflict: "slug" })
    .select("id, slug, status, published_at")
    .single();

  if (error) {
    console.error("[blog] upsert error:", error);
    return Response.json(
      { error: { message: "Failed to save post" } },
      { status: 500 }
    );
  }

  return Response.json({ data, error: null });
}
