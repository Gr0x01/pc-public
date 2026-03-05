import Link from "next/link";
import { MOCK_ITEM_DETAIL, MOCK_FEED_ITEMS } from "@/lib/mock/app-data";
import type { ItemDetailData } from "@/lib/mock/app-data";
import { formatDate } from "@/lib/utils/format";
import ItemTypeTag from "@/components/app/ItemTypeTag";

const USE_MOCK = true;

function urgencyLabel(score: number | null | undefined): string | null {
  if (score == null) return null;
  if (score >= 80) return "Urgent";
  if (score >= 60) return "Watch";
  return null;
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
  searchParams: Promise<{ from?: string }>;
}

export default async function ItemDetailPage({ params, searchParams }: ItemDetailPageProps) {
  const { id } = await params;
  const { from } = await searchParams;

  const backHref = from === "products" ? "/app/products" : "/app/feed";
  const backLabel = from === "products" ? "Products" : "Feed";

  let detail: ItemDetailData | null = null;
  // urgency_score comes from FeedItemEnriched directly; ItemEnrichment uses confidence
  let urgencyScore: number | null = null;

  if (USE_MOCK) {
    const feedItem = MOCK_FEED_ITEMS.find((i) => i.id === id);
    if (feedItem) {
      urgencyScore = feedItem.urgency_score;
      detail = {
        item: {
          id: feedItem.id,
          source_id: "mock",
          source_ref: feedItem.id,
          title: feedItem.title,
          item_type: feedItem.item_type,
          published_date: feedItem.published_date,
          source_url: feedItem.source_url,
          issuing_office: feedItem.issuing_office,
          action_text: feedItem.summary,
          cfr_references: null,
          raw_content: null,
          jurisdiction: "federal",
          jurisdiction_state: null,
          effective_date: null,
          comment_deadline: null,
          docket_number: null,
          fr_citation: null,
          page_views: null,
          significant: null,
          processing_status: "ok",
          processing_error: null,
          enforcement_company_name: null,
          enforcement_company_address: null,
          enforcement_products: null,
          enforcement_violation_types: null,
          enforcement_cited_regulations: null,
          enforcement_fei_number: null,
          enforcement_marcs_cms_number: null,
          enforcement_recipient_name: null,
          enforcement_recipient_title: null,
          enforcement_response_received: null,
          enforcement_closeout: null,
          enforcement_recall_classification: null,
          enforcement_recall_status: null,
          enforcement_voluntary_mandated: null,
          enforcement_distribution_pattern: null,
          enforcement_product_quantity: null,
          created_at: feedItem.published_date,
          updated_at: feedItem.published_date,
        },
        enrichment: feedItem.summary
          ? {
              id: `enr-${feedItem.id}`,
              item_id: feedItem.id,
              summary: feedItem.summary,
              key_regulations: null,
              key_entities: null,
              enrichment_model: "mock",
              enrichment_version: 1,
              confidence: feedItem.urgency_score ? feedItem.urgency_score / 100 : null,
              verification_status: "unverified",
              raw_response: null,
              regulatory_action_type: null,
              deadline: feedItem.deadline ?? null,
              created_at: feedItem.published_date,
            }
          : null,
        relevance: feedItem.relevance ?? null,
        action_items: feedItem.action_items ?? null,
        substances: [],
        matched_products: feedItem.matched_products,
      };
    } else {
      // Fallback for IDs not in MOCK_FEED_ITEMS
      detail = MOCK_ITEM_DETAIL;
      urgencyScore = detail.enrichment?.confidence
        ? Math.round(detail.enrichment.confidence * 100)
        : null;
    }
  }

  if (!detail) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link
          href={backHref}
          className="font-mono text-sm text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-1 mb-6"
        >
          &larr; {backLabel}
        </Link>
        <div className="border border-border rounded p-8 text-center">
          <p className="text-text-secondary">Item not found.</p>
        </div>
      </div>
    );
  }

  const { item, enrichment, relevance, action_items, substances, matched_products } = detail;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <Link
        href={backHref}
        className="font-mono text-sm text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-1 mb-6"
      >
        &larr; {backLabel}
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
          {relevance && (
            <span className="inline-block rounded px-2 py-0.5 border bg-slate-500/10 text-slate-600 border-slate-500/25 font-mono text-[10px] uppercase tracking-wide leading-relaxed">
              {relevanceLabel(relevance)}
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
      {enrichment?.deadline && (
        <div className="border border-amber/20 bg-amber/5 rounded px-4 py-3 mb-6">
          <p className="font-semibold text-sm text-amber">
            Deadline: {formatDate(enrichment.deadline)}
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
              : "Analysis pending — enrichment in progress."}
        </div>
      </section>

      {/* 4. Action items */}
      {action_items && action_items.length > 0 && (
        <section className="mb-6">
          <h2 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-3">
            Action Items
          </h2>
          <ol className="space-y-2 border-t border-border pt-3">
            {action_items.map((action, i) => (
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
      {item.enforcement_company_name && (
        <section className="mb-6">
          <h2 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-3">
            Enforcement Details
          </h2>
          <div className="border border-border bg-surface-muted rounded p-4 space-y-3 text-sm">
            <div>
              <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wide">
                Company
              </span>
              <p className="text-text-body mt-0.5">{item.enforcement_company_name}</p>
              {item.enforcement_company_address && (
                <p className="font-mono text-xs text-text-secondary mt-0.5">
                  {item.enforcement_company_address}
                </p>
              )}
            </div>
            {item.enforcement_products && item.enforcement_products.length > 0 && (
              <div>
                <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wide">
                  Products Cited
                </span>
                <ul className="mt-1 space-y-1">
                  {(item.enforcement_products as string[]).map((p, i) => (
                    <li key={i} className="text-text-body text-sm">
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {item.enforcement_violation_types && item.enforcement_violation_types.length > 0 && (
              <div>
                <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wide">
                  Violations
                </span>
                <ul className="mt-1 space-y-1">
                  {item.enforcement_violation_types.map((v, i) => (
                    <li key={i} className="text-text-body text-sm">
                      {v}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {item.enforcement_recall_classification && (
              <div>
                <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wide">
                  Recall Classification
                </span>
                <p className="text-text-body mt-0.5">
                  {item.enforcement_recall_classification}
                </p>
              </div>
            )}
            {item.enforcement_fei_number && (
              <div className="flex gap-4">
                <div>
                  <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wide">
                    FEI
                  </span>
                  <p className="font-mono text-xs text-text-secondary mt-0.5">
                    {item.enforcement_fei_number}
                  </p>
                </div>
                {item.enforcement_marcs_cms_number && (
                  <div>
                    <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wide">
                      MARCS-CMS
                    </span>
                    <p className="font-mono text-xs text-text-secondary mt-0.5">
                      {item.enforcement_marcs_cms_number}
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
