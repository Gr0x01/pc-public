"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ResolvedHistoryItem } from "@/lib/mock/products-data";

const STATUS_BORDER_COLORS: Record<string, string> = {
  action_required: "border-l-urgent",
  under_review: "border-l-amber",
  watch: "border-l-watch",
};

export default function HistoryPreview({ items }: { items: ResolvedHistoryItem[] }) {
  const shown = items.slice(0, 3);
  const shouldReduceMotion = useReducedMotion();

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">
          History ({items.length} resolved item{items.length !== 1 ? "s" : ""})
        </h2>
        {items.length > 3 && (
          <button className="text-[12px] text-amber hover:underline flex items-center gap-1">
            View all
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      <motion.div
        className="space-y-1.5"
        variants={shouldReduceMotion ? undefined : { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        initial="hidden"
        animate="show"
      >
        {shown.map((item) => {
          const date = new Date(item.resolvedAt);
          const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const borderColor = STATUS_BORDER_COLORS[item.originalStatus] ?? "border-l-slate-300";
          const resolutionLabel =
            item.resolution === "resolved" ? "Resolved" : `Not Applicable${item.reason ? `: ${item.reason}` : ""}`;

          return (
            <motion.div
              key={item.id}
              variants={shouldReduceMotion ? undefined : { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } } }}
              whileHover={shouldReduceMotion ? undefined : { y: -1, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className={`border border-border ${borderColor} border-l-2 rounded bg-white px-3 py-2.5 cursor-pointer`}
            >
              <div className="flex items-start gap-3">
                <span className="font-mono text-[11px] text-text-secondary shrink-0 w-12">
                  {dateStr}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-serif font-semibold text-slate-700 leading-snug truncate">
                    {item.title}
                  </p>
                  <p className="font-mono text-[10px] text-text-secondary mt-0.5">
                    {resolutionLabel}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
