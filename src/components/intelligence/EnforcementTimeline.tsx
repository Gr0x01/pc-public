import type { EnforcementAction } from "@/lib/intelligence/types";

const ACTION_TYPE_STYLES: Record<string, string> = {
  warning_letter: "border-red-400 bg-red-50",
  recall: "border-orange-400 bg-orange-50",
  import_alert: "border-amber-400 bg-amber-50",
  "483_observation": "border-yellow-400 bg-yellow-50",
};

function formatActionType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/483/g, "483")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function EnforcementTimeline({
  actions,
}: {
  actions: EnforcementAction[];
}) {
  if (actions.length === 0) return null;

  const sorted = [...actions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-0">
      {sorted.map((action, i) => {
        const dateStr = new Date(action.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const styles =
          ACTION_TYPE_STYLES[action.type] ?? "border-slate-300 bg-slate-50";

        return (
          <div key={i} className="flex gap-4 relative">
            {/* Vertical line */}
            {i < sorted.length - 1 && (
              <div className="absolute left-[7px] top-6 bottom-0 w-px bg-border" />
            )}
            {/* Dot */}
            <div
              className={`w-[15px] h-[15px] rounded-full border-2 flex-shrink-0 mt-1.5 ${styles}`}
            />
            {/* Content */}
            <div className="pb-5 flex-1">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-xs font-medium text-text-secondary">
                  {dateStr}
                </span>
                <span className="text-xs text-text-secondary">
                  {formatActionType(action.type)}
                </span>
              </div>
              {action.url ? (
                <a
                  href={action.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-text-primary hover:text-amber transition-colors"
                >
                  {action.title}
                </a>
              ) : (
                <p className="text-sm text-text-primary">{action.title}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
