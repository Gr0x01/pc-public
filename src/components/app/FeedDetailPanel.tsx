import type { FeedItemEnriched } from "@/lib/mock/app-data";
import ItemTypeTag from "./ItemTypeTag";
import ProductMatchBadge from "./ProductMatchBadge";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDeadline(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function urgencyBadge(score: number): { label: string; className: string } | null {
  if (score >= 80) return { label: "Urgent", className: "bg-urgent/10 text-urgent border-urgent/30" };
  if (score >= 60) return { label: "Watch", className: "bg-amber/10 text-amber border-amber/30" };
  return null;
}

interface FeedDetailPanelProps {
  item: FeedItemEnriched | null;
}

export default function FeedDetailPanel({ item }: FeedDetailPanelProps) {
  if (!item) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary text-sm">Select an item to see details.</p>
        </div>
      </div>
    );
  }

  const badge = item.urgency_score != null ? urgencyBadge(item.urgency_score) : null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <ItemTypeTag type={item.item_type} />
            {badge && (
              <span className={`inline-block rounded px-2 py-0.5 border font-mono text-[10px] uppercase tracking-wide leading-relaxed ${badge.className}`}>
                {badge.label}
              </span>
            )}
          </div>

          <h1 className="font-serif text-xl font-bold text-text-primary leading-snug mb-3">
            {item.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
            <span className="font-mono text-xs text-text-secondary">
              {formatDate(item.published_date)}
            </span>
            {item.issuing_office && (
              <>
                <span className="text-border-strong text-xs">·</span>
                <span className="font-mono text-xs text-text-secondary">
                  {item.issuing_office}
                </span>
              </>
            )}
          </div>

          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-xs text-text-secondary hover:text-amber transition-colors"
            >
              View on FDA.gov
              <span aria-hidden="true">&nearr;</span>
            </a>
          )}
        </div>

        {/* Deadline bar */}
        {item.deadline && (
          <div className="border border-amber/20 bg-amber/5 rounded px-4 py-3 mb-6">
            <p className="font-semibold text-sm text-amber">
              Deadline: {formatDeadline(item.deadline)}
            </p>
          </div>
        )}

        {/* What happened */}
        {item.summary && (
          <section className="mb-6">
            <h2 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-2">
              What Happened
            </h2>
            <p className="text-sm text-text-body leading-relaxed">
              {item.summary}
            </p>
          </section>
        )}

        {/* Impact + action items */}
        {item.impact_summary && (
          <section className="mb-6">
            <h2 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-2">
              Why It Matters
            </h2>
            <p className="text-sm text-text-body leading-relaxed mb-3">
              {item.impact_summary}
            </p>

            {item.action_items && item.action_items.length > 0 && (
              <ol className="space-y-2 border-t border-border pt-3">
                {item.action_items.map((action, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="font-mono text-amber font-semibold shrink-0 w-4">
                      {i + 1}.
                    </span>
                    <span className="text-text-body">{action}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {/* Your products */}
        {item.matched_products.length > 0 && (
          <section className="mb-6">
            <h2 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-3">
              Your Products Affected
            </h2>
            <ProductMatchBadge products={item.matched_products} />
          </section>
        )}

        {/* No enrichment state */}
        {!item.summary && !item.impact_summary && (
          <section className="mb-6">
            <div className="border border-border rounded px-4 py-4 bg-surface-subtle">
              <p className="text-sm text-text-secondary font-mono">
                Analysis pending — enrichment in progress.
              </p>
            </div>
          </section>
        )}

        {/* Source footer */}
        <div className="border-t border-border pt-4 mt-4">
          <p className="font-mono text-xs text-text-secondary">
            Published {formatDate(item.published_date)}
            {item.source_url && (
              <>
                {" · "}
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber transition-colors"
                >
                  {item.source_url}
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
