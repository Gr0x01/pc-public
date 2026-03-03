import Link from "next/link";
import type { BlogPostSummary } from "@/lib/blog/types";
import { CATEGORY_LABELS } from "@/lib/blog/types";

export function PostCard({ post }: { post: BlogPostSummary }) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block rounded-xl border border-border bg-white p-6 hover:border-amber/40 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-medium text-amber-text bg-amber-muted px-2.5 py-1 rounded-full">
          {CATEGORY_LABELS[post.category]}
        </span>
        {date && post.published_at && (
          <time dateTime={post.published_at} className="text-xs text-text-secondary">
            {date}
          </time>
        )}
      </div>
      <h3 className="text-lg font-semibold text-text-primary group-hover:text-amber transition-colors duration-150 mb-2">
        {post.title}
      </h3>
      <p className="text-sm text-text-secondary line-clamp-3">
        {post.excerpt}
      </p>
    </Link>
  );
}
