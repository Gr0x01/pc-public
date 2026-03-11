import type { IntelligencePageSummary } from "@/lib/intelligence/types";
import { PAGE_TYPE_LABELS, type IntelPageType } from "@/lib/intelligence/types";
import { IntelPageCard } from "./IntelPageCard";

export function CrossLinkSection({
  pages,
}: {
  pages: IntelligencePageSummary[];
}) {
  if (pages.length === 0) return null;

  // Group by page type
  const grouped = pages.reduce(
    (acc, page) => {
      const type = page.page_type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(page);
      return acc;
    },
    {} as Record<IntelPageType, IntelligencePageSummary[]>
  );

  return (
    <section className="max-w-6xl mx-auto px-6 pb-16">
      <h2 className="font-serif text-2xl font-bold text-text-primary mb-6">
        Related Intelligence
      </h2>
      {Object.entries(grouped).map(([type, groupPages]) => (
        <div key={type} className="mb-8 last:mb-0">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-4">
            {PAGE_TYPE_LABELS[type as IntelPageType]}
          </h3>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {groupPages.map((page) => (
              <IntelPageCard key={page.id} page={page} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
