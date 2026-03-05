import type { FeedItemEnriched } from "@/lib/mock/app-data";
import { formatDateShort } from "@/lib/utils/format";
import ItemTypeTag from "./ItemTypeTag";
import ProductMatchBadge from "./ProductMatchBadge";

interface FeedItemCardProps {
  item: FeedItemEnriched;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export default function FeedItemCard({ item, isSelected, onSelect }: FeedItemCardProps) {
  const hasEnrichment = item.summary !== null;
  const ls = item.lifecycle_state;
  const isReduced = ls === "grace" || ls === "archived";

  return (
    <button
      onClick={() => onSelect(item.id)}
      className={`group w-full text-left rounded bg-white p-3 transition-all duration-150 ease-out border ${
        isSelected
          ? "border-border-strong border-l-amber border-l-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
          : "border-border hover:border-border-strong hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
      } ${isReduced ? "opacity-60" : ""}`}
    >
      {/* Top row: type tag + date */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <ItemTypeTag type={item.item_type} />
        <span className="font-mono text-[10px] text-text-secondary shrink-0">
          {formatDateShort(item.published_date)}
        </span>
      </div>

      {/* Title with urgency dot */}
      <div className="flex items-start gap-1.5 mb-1">
        {ls === "urgent" && (
          <span className="h-2 w-2 rounded-full bg-urgent shrink-0 mt-1" />
        )}
        {ls === "grace" && (
          <span className="h-2 w-2 rounded-full bg-amber shrink-0 mt-1" />
        )}
        <h3 className="font-serif text-sm font-semibold text-text-primary leading-snug line-clamp-2">
          {item.title}
        </h3>
      </div>

      {/* Product match badge — right under title for scan priority */}
      {item.matched_products.length > 0 && (
        <div className="mb-1.5 ml-3.5">
          <ProductMatchBadge products={item.matched_products} />
        </div>
      )}

      {/* Issuing office */}
      {item.issuing_office && (
        <p className="font-mono text-[10px] text-text-secondary mb-1.5 truncate">
          {item.issuing_office}
        </p>
      )}

      {/* Impact summary (only if enriched) */}
      {hasEnrichment && item.impact_summary && (
        <p className="text-xs text-text-body leading-relaxed line-clamp-2">
          {item.impact_summary}
        </p>
      )}
    </button>
  );
}
