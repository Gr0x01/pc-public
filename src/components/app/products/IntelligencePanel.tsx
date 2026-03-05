"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { ProductDetailData } from "@/lib/mock/products-data";
import type { VerdictResolution } from "@/lib/products/queries";
import { StatusDot, STATUS_LABELS, STATUS_TEXT_COLORS } from "./ProductsLayout";
import MatchCard from "./MatchCard";
import AllClearCard from "./AllClearCard";
import ProductContextInline from "./ProductContextInline";
import HistoryPreview from "./HistoryPreview";

interface IntelligencePanelProps {
  detail: ProductDetailData;
  onHighlight: (substanceIds: string[]) => void;
  onClearHighlight: () => void;
  onResolveVerdict: (itemId: string, productId: string, resolution: VerdictResolution) => void;
  isWideLayout: boolean;
}

export default function IntelligencePanel({
  detail,
  onHighlight,
  onClearHighlight,
  onResolveVerdict,
}: IntelligencePanelProps) {
  const { product, status, activeMatches, lastScannedAt } = detail;
  const shouldReduceMotion = useReducedMotion();
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(
    activeMatches[0]?.match.id ?? null
  );

  const scannedAgo = getTimeAgo(lastScannedAt);

  function handleExpand(matchId: string, substanceIds: string[]) {
    if (expandedMatchId === matchId) {
      setExpandedMatchId(null);
      onClearHighlight();
    } else {
      setExpandedMatchId(matchId);
      onHighlight(substanceIds);
    }
  }

  return (
    <motion.div
      className="h-full"
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      key={product.id}
    >
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-6">
        {/* Product header */}
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-bold text-text-primary leading-tight mb-1">
            {product.name}
          </h1>
          <div className="flex items-center gap-2 text-text-secondary">
            {product.brand && (
              <>
                <span className="font-mono text-xs">{product.brand}</span>
                <span className="text-xs text-border-strong">·</span>
              </>
            )}
            <span className="font-mono text-xs capitalize">{product.product_type}</span>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <StatusDot status={status} size="md" />
              <span className={`font-mono text-xs font-medium uppercase tracking-wide ${STATUS_TEXT_COLORS[status]}`}>
                {STATUS_LABELS[status]}
              </span>
            </div>
            <span className="font-mono text-[11px] text-text-secondary">
              Last scanned: {scannedAgo}
            </span>
          </div>
        </div>

        {/* Active matches OR all-clear */}
        {activeMatches.length > 0 ? (
          <section className="mb-8">
            <h2 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-3">
              Active Regulatory Items ({activeMatches.length})
            </h2>
            <motion.div
              className="space-y-3"
              variants={shouldReduceMotion ? undefined : { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
              initial="hidden"
              animate="show"
            >
              {activeMatches.map((m) => (
                <motion.div
                  key={m.match.id}
                  variants={shouldReduceMotion ? undefined : { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } } }}
                >
                  <MatchCard
                    matchWithItem={m}
                    productId={product.id}
                    isExpanded={expandedMatchId === m.match.id}
                    onToggle={() => handleExpand(m.match.id, m.substanceIds)}
                    onResolve={(resolution) => onResolveVerdict(m.item.id, product.id, resolution)}
                  />
                </motion.div>
              ))}
            </motion.div>
          </section>
        ) : (
          <AllClearCard lastScannedAt={lastScannedAt} />
        )}

        {/* Product details — inline at <1440px (hidden at ≥1440px where right panel shows) */}
        <div className="3col:hidden">
          <ProductContextInline detail={detail} />
        </div>

        {/* History preview */}
        {detail.resolvedHistory.length > 0 && (
          <HistoryPreview key={product.id} items={detail.resolvedHistory} />
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Time ago helper
// ---------------------------------------------------------------------------

function getTimeAgo(isoDate: string): string {
  const now = new Date();
  const then = new Date(isoDate);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
