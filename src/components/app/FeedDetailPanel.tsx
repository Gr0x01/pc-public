import Link from "next/link";
import type { FeedItemEnriched } from "@/lib/mock/app-data";
import { formatDate } from "@/lib/utils/format";
import ItemTypeTag from "./ItemTypeTag";
import ProductMatchBadge from "./ProductMatchBadge";

function urgencyBadge(score: number): { label: string; className: string } | null {
  if (score >= 80) return { label: "Urgent", className: "bg-urgent/10 text-urgent border-urgent/30" };
  if (score >= 60) return { label: "Watch", className: "bg-amber/10 text-amber border-amber/30" };
  return null;
}

interface FeedDetailPanelProps {
  item: FeedItemEnriched | null;
  onClose: () => void;
}

export default function FeedDetailPanel({ item, onClose }: FeedDetailPanelProps) {
  if (!item) return null;

  const badge = item.urgency_score != null ? urgencyBadge(item.urgency_score) : null;

  return (
    <div className="px-6 py-6">

      {/* Top row: badges + close button */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <ItemTypeTag type={item.item_type} />
          {badge && (
            <span className={`inline-block rounded px-2 py-0.5 border font-mono text-[10px] uppercase tracking-wide leading-relaxed ${badge.className}`}>
              {badge.label}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-text-secondary hover:text-text-primary transition-colors p-1 -mr-1 rounded hover:bg-surface-subtle"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Title + meta */}
      <h1 className="font-serif text-xl font-bold text-text-primary leading-snug mb-2">
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
          className="inline-flex items-center gap-1 font-mono text-xs text-text-secondary hover:text-amber transition-colors mb-6"
        >
          View on FDA.gov <span aria-hidden="true">&nearr;</span>
        </a>
      )}

      {/* Deadline bar */}
      {item.deadline && (
        <div className="border border-amber/20 bg-amber/5 rounded px-4 py-3 mb-6">
          <p className="font-semibold text-sm text-amber">
            Deadline: {formatDate(item.deadline)}
          </p>
        </div>
      )}

      {/* What happened */}
      {item.summary && (
        <section className="mb-6">
          <h2 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-2">
            What Happened
          </h2>
          <p className="text-sm text-text-body leading-relaxed">{item.summary}</p>
        </section>
      )}

      {/* Why it matters + action items */}
      {item.impact_summary && (
        <section className="mb-6">
          <h2 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-2">
            Why It Matters
          </h2>
          <p className="text-sm text-text-body leading-relaxed mb-3">{item.impact_summary}</p>
          {item.action_items && item.action_items.length > 0 && (
            <ol className="space-y-2 border-t border-border pt-3">
              {item.action_items.map((action, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="font-mono text-amber font-semibold shrink-0 w-4">{i + 1}.</span>
                  <span className="text-text-body">{action}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {/* Your products affected */}
      {item.matched_products.length > 0 && (
        <section className="mb-6">
          <h2 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-2">
            Your Products Affected
          </h2>
          <ProductMatchBadge products={item.matched_products} />
        </section>
      )}

      {/* No enrichment yet */}
      {!item.summary && !item.impact_summary && (
        <div className="border border-border rounded px-4 py-4 bg-surface-subtle mb-6">
          <p className="text-sm text-text-secondary font-mono">
            Analysis pending — enrichment in progress.
          </p>
        </div>
      )}

      {/* View full detail */}
      <div className="border-t border-border pt-4 mt-2">
        <Link
          href={`/app/items/${item.id}`}
          className="inline-flex items-center gap-1 font-mono text-xs text-text-secondary hover:text-amber transition-colors"
        >
          View full detail &rarr;
        </Link>
        {item.source_url && (
          <p className="font-mono text-xs text-text-secondary mt-2 break-all">
            Published {formatDate(item.published_date)}
            {" · "}
            <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-amber transition-colors">
              {item.source_url}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
