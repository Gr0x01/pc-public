import Link from "next/link";
import type { FeedItemEnriched } from "@/lib/mock/app-data";
import ItemTypeTag from "./ItemTypeTag";
import ProductMatchBadge from "./ProductMatchBadge";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface FeedItemCardProps {
  item: FeedItemEnriched;
}

export default function FeedItemCard({ item }: FeedItemCardProps) {
  const hasEnrichment = item.summary !== null;
  const isUrgent = item.urgency_score !== null && item.urgency_score >= 70;

  return (
    <Link href={`/app/items/${item.id}`} className="block group">
      <div className="border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 rounded p-4 transition-all duration-150 cursor-pointer">
        {/* Top row: type tag + date */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <ItemTypeTag type={item.item_type} />
            {isUrgent && (
              <span className="h-2 w-2 rounded-full bg-urgent shrink-0" />
            )}
          </div>
          <span className="font-mono text-[11px] text-slate-500 shrink-0">
            {formatDate(item.published_date)}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-serif text-sm font-semibold text-white leading-snug line-clamp-2 mb-1.5">
          {item.title}
        </h3>

        {/* Issuing office */}
        {item.issuing_office && (
          <p className="font-mono text-[10px] text-slate-500 mb-2">
            {item.issuing_office}
          </p>
        )}

        {/* Impact summary (only if enriched) */}
        {hasEnrichment && item.impact_summary && (
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-2">
            {item.impact_summary}
          </p>
        )}

        {/* Product match badge */}
        {item.matched_products.length > 0 && (
          <div className="mt-2">
            <ProductMatchBadge products={item.matched_products} />
          </div>
        )}
      </div>
    </Link>
  );
}
