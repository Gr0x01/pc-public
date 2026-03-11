import Link from "next/link";
import Image from "next/image";
import type { IntelligencePageSummary } from "@/lib/intelligence/types";
import {
  PAGE_TYPE_LABELS,
  PAGE_TYPE_ROUTES,
  calculateReadingTime,
} from "@/lib/intelligence/types";

export function IntelPageCard({ page }: { page: IntelligencePageSummary }) {
  const date = page.published_at
    ? new Date(page.published_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const readingTime = calculateReadingTime(page.word_count);
  const href = `/${PAGE_TYPE_ROUTES[page.page_type]}/${page.slug}`;

  return (
    <Link
      href={href}
      className="group block rounded border border-border bg-white hover:border-amber/40 hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      {page.cover_image_url && (
        <div className="relative w-full aspect-video">
          <Image
            src={page.cover_image_url}
            alt={page.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1440px) 50vw, 33vw"
          />
        </div>
      )}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-medium text-amber-text bg-amber-muted px-2.5 py-1 rounded">
            {PAGE_TYPE_LABELS[page.page_type]}
          </span>
          {date && page.published_at && (
            <time
              dateTime={page.published_at}
              className="text-xs text-text-secondary"
            >
              {date}
            </time>
          )}
          <span className="text-xs text-text-secondary">
            {readingTime} min
          </span>
        </div>
        <h3 className="text-lg font-semibold text-text-primary group-hover:text-amber transition-colors duration-150 mb-2">
          {page.title}
        </h3>
        <p className="text-sm text-text-secondary line-clamp-3 mb-3">
          {page.excerpt}
        </p>
        <span className="text-sm font-medium text-amber">
          Read more &rarr;
        </span>
      </div>
    </Link>
  );
}
