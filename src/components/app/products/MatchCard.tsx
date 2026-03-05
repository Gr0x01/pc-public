"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { ProductMatchWithItem } from "@/lib/mock/products-data";
import type { VerdictResolution } from "@/lib/products/queries";
import type { LifecycleState } from "@/lib/utils/lifecycle";
import { StatusDot, type ProductStatusType } from "./ProductsLayout";
import { formatDateShort } from "@/lib/utils/format";

interface MatchCardProps {
  matchWithItem: ProductMatchWithItem;
  productId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onResolve: (resolution: VerdictResolution) => void;
}

const LIFECYCLE_TO_STATUS: Record<LifecycleState, ProductStatusType> = {
  urgent: "action_required",
  active: "under_review",
  grace: "watch",
  archived: "all_clear",
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  warning_letter: "Warning Letter",
  recall: "Recall",
  rule: "Rule Final",
  proposed_rule: "Proposed Rule",
  draft_guidance: "Draft Guidance",
  notice: "Notice",
  safety_alert: "Safety Alert",
  press_release: "Press Release",
};

const RESOLUTION_LABELS: Record<string, string> = {
  watching: "Watching",
  resolved: "Resolved",
  not_applicable: "Not Applicable",
};

export default function MatchCard({ matchWithItem, isExpanded, onToggle, onResolve }: MatchCardProps) {
  const { match, item, resolution } = matchWithItem;
  const matchStatus = LIFECYCLE_TO_STATUS[item.lifecycle_state];
  const typeLabel = ACTION_TYPE_LABELS[item.item_type] ?? item.item_type;
  const isWatching = resolution === "watching";
  const shouldReduceMotion = useReducedMotion();
  const [pending, setPending] = useState(false);

  async function handleResolve(res: VerdictResolution) {
    setPending(true);
    // Toggle off if clicking the same resolution
    const next = resolution === res ? null : res;
    onResolve(next);
    // pending will clear when parent refetches and remounts
  }

  return (
    <motion.div
      whileHover={shouldReduceMotion || isExpanded ? undefined : { y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={`border border-border rounded bg-white ${isExpanded ? "shadow-sm" : ""}`}
    >
      {/* Header — always visible, clickable */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        <StatusDot status={isWatching ? "watch" : matchStatus} />
        <div className="flex-1 min-w-0">
          <p className={`text-[14px] font-serif font-semibold leading-snug transition-colors duration-150 ${
            isWatching ? "text-text-body" : "text-text-primary"
          } ${isExpanded ? "line-clamp-2" : "line-clamp-1"}`}>
            {item.title}
          </p>
          {!isExpanded && (
            <div className="flex items-center gap-2 mt-1">
              {resolution === "watching" && (
                <span className="font-mono text-[10px] font-medium text-watch bg-watch/10 border border-watch/20 rounded px-1.5 py-0.5 uppercase tracking-wide">
                  Watching
                </span>
              )}
              {item.deadline && (
                <span className="font-mono text-[11px] font-medium text-amber">
                  Deadline: {formatDateShort(item.deadline)}
                </span>
              )}
              {item.action_items && item.action_items.length > 0 && (
                <>
                  {item.deadline && <span className="text-border-strong text-[10px]">·</span>}
                  <span className="font-mono text-[11px] text-text-secondary">
                    {item.action_items.length} action item{item.action_items.length > 1 ? "s" : ""}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {matchWithItem.hasCrossReference && (
            <span className="font-mono text-[10px] font-medium text-amber bg-amber/10 border border-amber/25 rounded px-2 py-0.5 uppercase tracking-wide">
              Cross-sector
            </span>
          )}
          <span className="font-mono text-[10px] text-text-secondary bg-surface-muted border border-border rounded px-2 py-0.5 uppercase tracking-wide">
            {typeLabel}
          </span>
        </div>
      </button>

      {/* Expanded body */}
      <AnimatePresence initial={false}>
      {isExpanded && (
        <motion.div
          key="expanded"
          initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden"
        >
        <div className="px-4 pb-4 space-y-4">
          {/* Meta row */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-text-secondary">
            <span>{formatDateShort(item.published_date)}</span>
            {item.issuing_office && (
              <>
                <span className="text-border-strong">·</span>
                <span>{item.issuing_office}</span>
              </>
            )}
          </div>

          {/* Impact analysis */}
          {match.impact_summary && (
            <p className="text-[14px] leading-relaxed text-text-body">
              {match.impact_summary}
            </p>
          )}

          {/* Action items */}
          {match.action_items && match.action_items.length > 0 && (
            <div className="bg-surface-muted rounded-lg p-4 border border-surface-subtle">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2.5">
                Action Items
              </p>
              <ul className="space-y-2">
                {match.action_items.map((action, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-white border border-border shadow-sm flex items-center justify-center text-[10px] font-medium text-text-secondary mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-[13px] text-text-body leading-snug pt-0.5">
                      {action}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Deadline */}
          {item.deadline && (
            <p className="font-semibold text-sm text-amber">
              Deadline: {formatDateShort(item.deadline)}
            </p>
          )}

          {/* Source */}
          {item.source_url && (
            <div>
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-text-secondary hover:text-amber transition-colors"
              >
                Source: {new URL(item.source_url).hostname}
              </a>
            </div>
          )}

          {/* Resolution actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-border flex-wrap">
            <ResolutionButton
              label="Resolve"
              activeLabel="Resolved"
              active={resolution === "resolved"}
              activeColor="clear"
              disabled={pending}
              onClick={() => handleResolve("resolved")}
              variant="outlined"
            />
            <ResolutionButton
              label="Watch"
              activeLabel="Watching"
              active={resolution === "watching"}
              activeColor="watch"
              disabled={pending}
              onClick={() => handleResolve("watching")}
              variant="text"
            />
            <ResolutionButton
              label="Not Applicable"
              activeLabel="Not Applicable"
              active={resolution === "not_applicable"}
              activeColor="clear"
              disabled={pending}
              onClick={() => handleResolve("not_applicable")}
              variant="text"
            />
            <span className="flex-1" />
            <a
              href={`/app/items/${item.id}?from=products`}
              className="text-[13px] text-amber hover:underline flex items-center gap-1"
            >
              Full Report
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Resolution button
// ---------------------------------------------------------------------------

const ACTIVE_COLORS = {
  clear: "text-clear bg-clear/10 border-clear/30",
  watch: "text-watch bg-watch/10 border-watch/30",
};

function ResolutionButton({
  label,
  activeLabel,
  active,
  activeColor,
  disabled,
  onClick,
  variant,
}: {
  label: string;
  activeLabel: string;
  active: boolean;
  activeColor: keyof typeof ACTIVE_COLORS;
  disabled: boolean;
  onClick: () => void;
  variant: "outlined" | "text";
}) {
  const base = "text-[12px] font-medium transition-colors disabled:opacity-50";
  const activeClass = ACTIVE_COLORS[activeColor];

  if (variant === "outlined") {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${base} border rounded px-3 py-1.5 ${
          active
            ? activeClass
            : "text-text-secondary border-border hover:text-text-primary hover:bg-surface-muted"
        }`}
      >
        {active ? activeLabel : label}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} px-2 py-1.5 rounded ${
        active
          ? activeClass + " border"
          : "text-text-secondary hover:text-text-primary"
      }`}
    >
      {active ? activeLabel : label}
    </button>
  );
}
