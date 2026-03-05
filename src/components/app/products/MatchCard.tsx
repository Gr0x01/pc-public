"use client";

import type { ProductMatchWithItem } from "@/lib/mock/products-data";
import type { LifecycleState } from "@/lib/utils/lifecycle";
import { StatusDot, type ProductStatusType } from "./ProductsLayout";
import { formatDateShort } from "@/lib/utils/format";

interface MatchCardProps {
  matchWithItem: ProductMatchWithItem;
  isExpanded: boolean;
  onToggle: () => void;
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

export default function MatchCard({ matchWithItem, isExpanded, onToggle }: MatchCardProps) {
  const { match, item } = matchWithItem;
  const matchStatus = LIFECYCLE_TO_STATUS[item.lifecycle_state];
  const typeLabel = ACTION_TYPE_LABELS[item.item_type] ?? item.item_type;

  return (
    <div
      className={`border border-border rounded bg-white transition-shadow duration-150 ${
        isExpanded ? "shadow-sm" : "hover:shadow-sm hover:-translate-y-px"
      }`}
    >
      {/* Header — always visible, clickable */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        <StatusDot status={matchStatus} />
        <div className="flex-1 min-w-0">
          <p className={`text-[14px] font-serif font-semibold text-text-primary leading-snug ${
            isExpanded ? "line-clamp-2" : "line-clamp-1"
          }`}>
            {item.title}
          </p>
          {!isExpanded && (
            <div className="flex items-center gap-2 mt-1">
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
        <span className="shrink-0 font-mono text-[10px] text-text-secondary bg-surface-muted border border-border rounded px-2 py-0.5 uppercase tracking-wide">
          {typeLabel}
        </span>
      </button>

      {/* Expanded body */}
      {isExpanded && (
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
            <div className="pt-2 border-t border-border">
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
          <div className="flex items-center gap-3 pt-1">
            <button className="text-[13px] font-medium text-text-secondary hover:text-text-primary border border-border rounded px-3 py-1.5 hover:bg-surface-muted transition-colors">
              Mark Resolved
            </button>
            <button className="text-[13px] text-text-secondary hover:text-text-primary transition-colors">
              Not Applicable
            </button>
            <span className="flex-1" />
            <a
              href={`/app/items/${item.id}`}
              className="text-[13px] text-amber hover:underline flex items-center gap-1"
            >
              View Full Report
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
