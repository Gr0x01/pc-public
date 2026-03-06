import Link from "next/link";
import Image from "next/image";
import type { BlogPostSummary } from "@/lib/blog/types";
import { CATEGORY_LABELS, calculateReadingTime } from "@/lib/blog/types";

export function PostCard({ post }: { post: BlogPostSummary }) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const readingTime = calculateReadingTime(post.word_count);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block rounded border border-border bg-white hover:border-amber/40 hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      {post.cover_image_url && (
        <div className="relative w-full aspect-video">
          <Image
            src={post.cover_image_url}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1440px) 50vw, 33vw"
          />
        </div>
      )}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-medium text-amber-text bg-amber-muted px-2.5 py-1 rounded">
            {CATEGORY_LABELS[post.category]}
          </span>
          {date && post.published_at && (
            <time dateTime={post.published_at} className="text-xs text-text-secondary">
              {date}
            </time>
          )}
          <span className="text-xs text-text-secondary">{readingTime} min</span>
        </div>
        <h3 className="text-lg font-semibold text-text-primary group-hover:text-amber transition-colors duration-150 mb-2">
          {post.title}
        </h3>
        <p className="text-sm text-text-secondary line-clamp-3 mb-3">
          {post.excerpt}
        </p>
        <span className="text-sm font-medium text-amber">
          Read more &rarr;
        </span>
      </div>
    </Link>
  );
}
