import type { MetadataRoute } from "next";
import { adminClient } from "@/lib/supabase/admin";
import { PAGE_TYPE_ROUTES, type IntelPageType } from "@/lib/intelligence/types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: "https://policycanary.io", priority: 1.0, changeFrequency: "weekly" },
    { url: "https://policycanary.io/blog", priority: 0.8, changeFrequency: "weekly" },
    { url: "https://policycanary.io/ingredients", priority: 0.8, changeFrequency: "weekly" },
    { url: "https://policycanary.io/enforcement", priority: 0.8, changeFrequency: "weekly" },
    { url: "https://policycanary.io/regulations", priority: 0.8, changeFrequency: "weekly" },
    { url: "https://policycanary.io/pricing", priority: 0.5, changeFrequency: "monthly" },
    { url: "https://policycanary.io/sample", priority: 0.5, changeFrequency: "monthly" },
    { url: "https://policycanary.io/privacy", priority: 0.5, changeFrequency: "monthly" },
    { url: "https://policycanary.io/terms", priority: 0.5, changeFrequency: "monthly" },
  ];

  const { data: posts } = await adminClient
    .from("blog_posts")
    .select("slug, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const blogPages: MetadataRoute.Sitemap = (posts ?? []).map((post) => ({
    url: `https://policycanary.io/blog/${post.slug}`,
    lastModified: post.published_at ?? undefined,
    priority: 0.6,
    changeFrequency: "monthly" as const,
  }));

  const { data: intelPages } = await adminClient
    .from("intelligence_pages")
    .select("page_type, slug, published_at")
    .eq("status", "published");

  const intelUrls: MetadataRoute.Sitemap = (intelPages ?? []).map((p) => ({
    url: `https://policycanary.io/${PAGE_TYPE_ROUTES[p.page_type as IntelPageType]}/${p.slug}`,
    lastModified: p.published_at ?? undefined,
    priority: 0.7,
    changeFrequency: "weekly" as const,
  }));

  return [...staticPages, ...blogPages, ...intelUrls];
}
