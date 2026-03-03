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
  const isUrgent = item.urgency_score !== null && item.urgency_score >= 80;

  return (
    <button
      onClick={() => onSelect(item.id)}
      className={`w-full text-left rounded p-3 transition-all duration-100 border ${
        isSelected
          ? "border-amber/40 bg-amber/5"
          : "border-transparent hover:border-border hover:bg-white"
      }`}
    >
      {/* Top row: type tag + urgency dot + date */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <ItemTypeTag type={item.item_type} />
          {isUrgent && (
            <span className="h-1.5 w-1.5 rounded-full bg-urgent shrink-0" />
          )}
        </div>
        <span className="font-mono text-[10px] text-text-secondary shrink-0">
          {formatDateShort(item.published_date)}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-serif text-sm font-semibold text-text-primary leading-snug line-clamp-2 mb-1">
        {item.title}
      </h3>

      {/* Issuing office */}
      {item.issuing_office && (
        <p className="font-mono text-[10px] text-text-secondary mb-1.5 truncate">
          {item.issuing_office}
        </p>
      )}

      {/* Impact summary (only if enriched) */}
      {hasEnrichment && item.impact_summary && (
        <p className="text-xs text-text-body leading-relaxed line-clamp-2 mb-1.5">
          {item.impact_summary}
        </p>
      )}

      {/* Product match badge */}
      {item.matched_products.length > 0 && (
        <div className="mt-1.5">
          <ProductMatchBadge products={item.matched_products} />
        </div>
      )}
    </button>
  );
}
