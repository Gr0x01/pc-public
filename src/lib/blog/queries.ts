import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import type { BlogPost, BlogPostSummary, BlogPostRSS, BlogCategory } from "./types";

/**
 * Published posts for the blog index page.
 * Optionally filtered by category.
 */
export async function getPublishedPosts(
  category?: BlogCategory
): Promise<BlogPostSummary[]> {
  let query = adminClient
    .from("blog_posts")
    .select("id, slug, title, excerpt, category, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[blog] getPublishedPosts error:", error);
    return [];
  }

  return data as BlogPostSummary[];
}

/**
 * Single post by slug — only published posts.
 */
export async function getPostBySlug(
  slug: string
): Promise<BlogPost | null> {
  const { data, error } = await adminClient
    .from("blog_posts")
    .select("id, slug, title, excerpt, content, category, status, published_at, seo_title, seo_description, created_at, updated_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("[blog] getPostBySlug error:", error);
    return null;
  }

  return data as BlogPost | null;
}

/**
 * Posts for the RSS feed — last 50 published, minimal columns.
 */
export async function getPostsForRSS(): Promise<BlogPostRSS[]> {
  const { data, error } = await adminClient
    .from("blog_posts")
    .select("slug, title, excerpt, category, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[blog] getPostsForRSS error:", error);
    return [];
  }

  return data as BlogPostRSS[];
}
