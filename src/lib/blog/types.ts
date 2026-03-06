export type BlogCategory =
  | "weekly_roundup"
  | "warning_letter_analysis"
  | "regulatory_trends"
  | "breaking_analysis";

export const CATEGORY_LABELS: Record<BlogCategory, string> = {
  weekly_roundup: "Weekly Roundup",
  warning_letter_analysis: "Warning Letter Analysis",
  regulatory_trends: "Regulatory Trends",
  breaking_analysis: "Breaking Analysis",
};

export const BLOG_CATEGORIES = Object.keys(CATEGORY_LABELS) as [BlogCategory, ...BlogCategory[]];

/** Full blog post row — use only with select("*") queries. */
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: BlogCategory;
  status: "draft" | "published";
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  cover_image_url: string | null;
  word_count: number;
  created_at: string;
  updated_at: string;
}

/** Partial projection for list/index queries (no content or SEO fields). */
export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  published_at: string | null;
  cover_image_url: string | null;
  word_count: number;
}

/** Minimal projection for RSS feed. */
export interface BlogPostRSS {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  published_at: string | null;
  cover_image_url: string | null;
}

/** Calculate reading time in minutes (230 WPM for technical content). */
export function calculateReadingTime(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 230));
}
