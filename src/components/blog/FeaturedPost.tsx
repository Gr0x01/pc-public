import Link from "next/link";
import Image from "next/image";
import type { BlogPostSummary } from "@/lib/blog/types";
import { CATEGORY_LABELS, calculateReadingTime } from "@/lib/blog/types";

export function FeaturedPost({ post }: { post: BlogPostSummary }) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-US", {
        month: "long",
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
      <div className="flex flex-col md:flex-row">
        {/* Text */}
        <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-medium text-amber-text bg-amber-muted px-2.5 py-1 rounded">
              {CATEGORY_LABELS[post.category]}
            </span>
            {date && post.published_at && (
              <time dateTime={post.published_at} className="text-xs text-text-secondary">
                {date}
              </time>
            )}
            <span className="text-xs text-text-secondary">{readingTime} min read</span>
          </div>
          <h2 className="font-serif text-3xl font-bold text-text-primary group-hover:text-amber transition-colors duration-150 mb-3">
            {post.title}
          </h2>
          <p className="text-base text-text-secondary line-clamp-3 mb-4">
            {post.excerpt}
          </p>
          <span className="text-sm font-medium text-amber">
            Read article &rarr;
          </span>
        </div>

        {/* Image */}
        <div className="md:w-[400px] lg:w-[480px] flex-shrink-0">
          {post.cover_image_url ? (
            <div className="relative w-full h-[240px] md:h-full">
              <Image
                src={post.cover_image_url}
                alt={post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 480px"
                priority
              />
            </div>
          ) : (
            <div className="w-full h-[240px] md:h-full bg-gradient-to-br from-amber/10 via-amber/5 to-surface-muted" />
          )}
        </div>
      </div>
    </Link>
  );
}
