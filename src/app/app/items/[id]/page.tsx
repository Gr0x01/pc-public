import Link from "next/link";
import { MOCK_ITEM_DETAIL } from "@/lib/mock/app-data";
import type { ItemDetailData } from "@/lib/mock/app-data";
import ItemTypeTag from "@/components/app/ItemTypeTag";

const USE_MOCK = true;

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

function urgencyLabel(score: number | null | undefined): string | null {
  if (score == null) return null;
  if (score >= 80) return "Urgent";
  if (score >= 60) return "Watch";
  return "Informational";
}

function urgencyColor(score: number | null | undefined): string {
  if (score == null) return "";
  if (score >= 80) return "bg-urgent/15 text-urgent border-urgent/30";
  if (score >= 60) return "bg-amber/15 text-amber border-amber/30";
  return "bg-slate-500/10 text-slate-600 border-slate-500/20";
}

function relevanceLabel(rel: string | null): string | null {
  if (!rel) return null;
  return rel.charAt(0).toUpperCase() + rel.slice(1) + " Relevance";
}

interface ItemDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { id } = await params;
  let detail: ItemDetailData | null = null;

  if (USE_MOCK) {
    detail = MOCK_ITEM_DETAIL;
  }

  if (!detail) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link
          href="/app/feed"
          className="font-mono text-sm text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-1 mb-6"
        >
          &larr; Feed
        </Link>
        <div className="border border-border rounded p-8 text-center">
          <p className="text-text-secondary">Item not found.</p>
        </div>
      </div>
    );
  }

  const { item, enrichment, segment_impact, substances, enforcement, matched_products } =
    detail;

  // Derive urgency from enrichment confidence or a mock score
  // In the mock, we derive it from the feed item's urgency_score
  const urgencyScore = enrichment?.confidence
    ? Math.round(enrichment.confidence * 100)
    : 92; // fallback for the mock collagen item

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <Link
        href="/app/feed"
        className="font-mono text-sm text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-1 mb-6"
      >
        &larr; Feed
      </Link>

      {/* 1. Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <ItemTypeTag type={item.item_type} />
          {urgencyLabel(urgencyScore) && (
            <span
              className={`inline-block rounded px-2 py-0.5 border font-mono text-[10px] uppercase tracking-wide leading-relaxed ${urgencyColor(urgencyScore)}`}
            >
              {urgencyLabel(urgencyScore)}
            </span>
          )}
          {segment_impact?.relevance && (
            <span className="inline-block rounded px-2 py-0.5 border bg-slate-500/10 text-slate-600 border-slate-500/25 font-mono text-[10px] uppercase tracking-wide leading-relaxed">
              {relevanceLabel(segment_impact.relevance)}
            </span>
          )}
        </div>

        <h1 className="font-serif text-xl md:text-2xl font-bold text-text-primary leading-snug mb-2">
          {item.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-text-secondary">
          <span className="font-mono text-xs">
            {formatDate(item.published_date)}
          </span>
          {item.issuing_office && (
            <>
              <span className="text-border-strong">|</span>
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
            className="inline-flex items-center gap-1 mt-3 font-mono text-xs text-text-secondary hover:text-amber transition-colors"
          >
            View on FDA.gov
            <span aria-hidden="true">&nearr;</span>
          </a>
        )}
      </div>

      {/* 2. Status bar (deadline) */}
      {segment_impact?.deadline && (
        <div className="border border-amber/20 bg-amber/5 rounded px-4 py-3 mb-6">
          <p className="font-semibold text-sm text-amber">
            Deadline: {formatDeadline(segment_impact.deadline)}
          </p>
        </div>
      )}

      {/* 3. What happened */}
      <section className="mb-6">
        <h2 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-2">
          What Happened
        </h2>
        <div className="text-sm text-text-body leading-relaxed">
          {enrichment?.summary
            ? enrichment.summary
            : item.action_text
              ? item.action_text
              : "Analysis pending -- enrichment in progress."}
        </div>
      </section>

      {/* 4. Action items */}
      {segment_impact?.action_items && segment_impact.action_items.length > 0 && (
        <section className="mb-6">
          <h2 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-3">
            Action Items
          </h2>
          <ol className="space-y-2 border-t border-border pt-3">
            {segment_impact.action_items.map((action, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="font-mono text-amber font-semibold shrink-0 w-4">
                  {i + 1}.
                </span>
                <span className="text-text-body">{action}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 5. Your products affected */}
      {matched_products.length > 0 && (
        <section className="mb-6">
          <h2 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-3">
            Your Products Affected
          </h2>
          <div className="flex flex-wrap gap-2">
            {matched_products.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 bg-canary/10 border border-canary/20 rounded px-3 py-1.5 text-sm font-semibold text-canary"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-canary shrink-0" />
                {p.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 6. Substances */}
      {substances.length > 0 && (
        <section className="mb-6">
          <h2 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-3">
            Substances
          </h2>
          <div className="flex flex-wrap gap-2">
            {substances.map((s, i) => (
              <span
                key={i}
                className="font-mono text-xs bg-surface-subtle border border-border rounded px-2.5 py-1 text-text-body"
              >
                {s.raw_substance_name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 7. Enforcement details */}
      {enforcement && (
        <section className="mb-6">
          <h2 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-3">
            Enforcement Details
          </h2>
          <div className="border border-border bg-surface-muted rounded p-4 space-y-3 text-sm">
            {enforcement.company_name && (
              <div>
                <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wide">
                  Company
                </span>
                <p className="text-text-body mt-0.5">{enforcement.company_name}</p>
                {enforcement.company_address && (
                  <p className="font-mono text-xs text-text-secondary mt-0.5">
                    {enforcement.company_address}
                  </p>
                )}
              </div>
            )}
            {enforcement.products && enforcement.products.length > 0 && (
              <div>
                <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wide">
                  Products Cited
                </span>
                <ul className="mt-1 space-y-1">
                  {enforcement.products.map((p, i) => (
                    <li key={i} className="text-text-body text-sm">
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {enforcement.violation_types && enforcement.violation_types.length > 0 && (
              <div>
                <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wide">
                  Violations
                </span>
                <ul className="mt-1 space-y-1">
                  {enforcement.violation_types.map((v, i) => (
                    <li key={i} className="text-text-body text-sm">
                      {v}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {enforcement.recall_classification && (
              <div>
                <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wide">
                  Recall Classification
                </span>
                <p className="text-text-body mt-0.5">
                  {enforcement.recall_classification}
                </p>
              </div>
            )}
            {enforcement.fei_number && (
              <div className="flex gap-4">
                <div>
                  <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wide">
                    FEI
                  </span>
                  <p className="font-mono text-xs text-text-secondary mt-0.5">
                    {enforcement.fei_number}
                  </p>
                </div>
                {enforcement.marcs_cms_number && (
                  <div>
                    <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wide">
                      MARCS-CMS
                    </span>
                    <p className="font-mono text-xs text-text-secondary mt-0.5">
                      {enforcement.marcs_cms_number}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 8. Source footer */}
      <div className="border-t border-border pt-4 mt-8">
        <p className="font-mono text-xs text-text-secondary">
          Source:{" "}
          {item.source_url ? (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-amber transition-colors"
            >
              {item.source_url}
            </a>
          ) : (
            "N/A"
          )}
          {" "}
          <span className="text-border-strong">|</span>{" "}
          Published {formatDate(item.published_date)}
        </p>
        {item.cfr_references && item.cfr_references.length > 0 && (
          <p className="font-mono text-xs text-text-secondary mt-1">
            CFR References:{" "}
            {item.cfr_references
              .map((ref) => `${ref.title} CFR Part ${ref.part}`)
              .join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
