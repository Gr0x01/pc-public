import Link from "next/link";
import type { SubscriberProduct } from "@/types/database";

type ProductStatus = "urgent" | "review" | "clear";

const STATUS_CONFIG: Record<
  ProductStatus,
  { dot: string; label: string; text: string }
> = {
  urgent: { dot: "bg-urgent", label: "Action Required", text: "text-urgent" },
  review: { dot: "bg-amber", label: "Under Review", text: "text-amber" },
  clear: { dot: "bg-clear", label: "All Clear", text: "text-clear" },
};

const TYPE_STYLES: Record<string, string> = {
  supplement: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  food: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  cosmetic: "bg-purple-500/10 text-purple-700 border-purple-500/20",
};

function formatProductType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

interface ProductStatusCardProps {
  product: SubscriberProduct;
  matchCount: number;
  status: ProductStatus;
}

export default function ProductStatusCard({
  product,
  matchCount,
  status,
}: ProductStatusCardProps) {
  const cfg = STATUS_CONFIG[status];
  const typeStyle =
    TYPE_STYLES[product.product_type] ??
    "bg-slate-500/10 text-slate-600 border-slate-500/20";

  return (
    <Link href={`/app/feed?myProducts=true`} className="block group">
      <div className="border border-border bg-white hover:bg-surface-muted hover:border-border-strong rounded p-4 transition-all duration-150">
        <div className="flex items-start gap-3">
          <span
            className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`}
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-text-primary leading-snug mb-1">
              {product.name}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-block rounded px-2 py-0.5 border font-mono text-[10px] leading-relaxed ${typeStyle}`}
              >
                {formatProductType(product.product_type)}
              </span>
              <span className={`font-mono text-[10px] ${cfg.text}`}>
                {cfg.label}
              </span>
            </div>
            {product.brand && (
              <p className="font-mono text-[10px] text-text-secondary mb-1">
                {product.brand}
              </p>
            )}
            <p className="font-mono text-[11px] text-text-secondary">
              {matchCount} regulatory match{matchCount !== 1 ? "es" : ""}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
