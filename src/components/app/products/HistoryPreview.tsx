"use client";

import type { ResolvedHistoryItem } from "@/lib/mock/products-data";

const STATUS_BORDER_COLORS: Record<string, string> = {
  action_required: "border-l-urgent",
  under_review: "border-l-amber",
  watch: "border-l-watch",
};

export default function HistoryPreview({ items }: { items: ResolvedHistoryItem[] }) {
  const shown = items.slice(0, 3);

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

      <div className="space-y-1.5">
        {shown.map((item) => {
          const date = new Date(item.resolvedAt);
          const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const borderColor = STATUS_BORDER_COLORS[item.originalStatus] ?? "border-l-slate-300";
          const resolutionLabel =
            item.resolution === "resolved" ? "Resolved" : `Not Applicable${item.reason ? `: ${item.reason}` : ""}`;

          return (
            <div
              key={item.id}
              className={`border border-border ${borderColor} border-l-2 rounded bg-white px-3 py-2.5 hover:bg-surface-muted transition-colors cursor-pointer`}
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
            </div>
          );
        })}
      </div>
    </section>
  );
}
