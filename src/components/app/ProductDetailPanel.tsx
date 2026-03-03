import Link from "next/link";
import type { SubscriberProduct } from "@/types/database";
import type { FeedItemEnriched } from "@/lib/mock/app-data";
import { MOCK_FEED_ITEMS } from "@/lib/mock/app-data";
import ItemTypeTag from "./ItemTypeTag";

type ProductStatus = "urgent" | "review" | "clear";

const STATUS_CONFIG: Record<ProductStatus, { dot: string; label: string; text: string }> = {
  urgent: { dot: "bg-urgent", label: "Action Required", text: "text-urgent" },
  review: { dot: "bg-amber", label: "Under Review", text: "text-amber" },
  clear: { dot: "bg-clear", label: "All Clear", text: "text-clear" },
};

const TYPE_LABELS: Record<string, string> = {
  supplement: "Supplement",
  food: "Food",
  cosmetic: "Cosmetic",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface ProductDetailPanelProps {
  product: SubscriberProduct | null;
  status: ProductStatus | null;
  onClose: () => void;
}

export default function ProductDetailPanel({ product, status, onClose }: ProductDetailPanelProps) {
  if (!product || !status) return null;

  const cfg = STATUS_CONFIG[status];

  // Find all feed items that match this product
  const matches: FeedItemEnriched[] = MOCK_FEED_ITEMS.filter((item) =>
    item.matched_products.some((p) => p.id === product.id)
  );

  return (
    <div className="px-6 py-6">

      {/* Top row: status + close */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
          <span className={`font-mono text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
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

      {/* Product name + meta */}
      <h1 className="font-serif text-xl font-bold text-text-primary leading-snug mb-1">
        {product.name}
      </h1>
      <div className="flex items-center gap-2 mb-6">
        {product.brand && (
          <span className="font-mono text-xs text-text-secondary">{product.brand}</span>
        )}
        {product.brand && <span className="text-border-strong text-xs">·</span>}
        <span className="font-mono text-xs text-text-secondary">
          {TYPE_LABELS[product.product_type] ?? product.product_type}
        </span>
      </div>

      {/* Regulatory matches */}
      <section>
        <h2 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-3">
          Regulatory Matches ({matches.length})
        </h2>

        {matches.length === 0 ? (
          <div className="border border-border rounded px-4 py-4 bg-surface-subtle">
            <p className="text-sm text-text-secondary">No regulatory matches yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map((item) => (
              <Link
                key={item.id}
                href={`/app/feed?item=${item.id}`}
                className="block border border-border rounded p-3 bg-white hover:bg-surface-muted hover:border-border-strong transition-all duration-100"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <ItemTypeTag type={item.item_type} />
                  <span className="font-mono text-[10px] text-text-secondary shrink-0">
                    {formatDate(item.published_date)}
                  </span>
                </div>
                <p className="text-sm font-serif font-semibold text-text-primary leading-snug line-clamp-2 mb-1">
                  {item.title}
                </p>
                {item.impact_summary && (
                  <p className="text-xs text-text-body leading-relaxed line-clamp-2">
                    {item.impact_summary}
                  </p>
                )}
                {item.action_items && item.action_items.length > 0 && (
                  <p className="font-mono text-[10px] text-amber mt-1.5">
                    {item.action_items.length} action item{item.action_items.length > 1 ? "s" : ""}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
