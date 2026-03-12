interface Deadline {
  date: string;
  label: string;
}

export function DeadlineTimeline({
  deadlines,
  compact = false,
}: {
  deadlines: Deadline[];
  compact?: boolean;
}) {
  if (deadlines.length === 0) return null;

  const now = new Date();
  const sorted = [...deadlines].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const dotSize = compact ? "w-2 h-2" : "w-2.5 h-2.5";
  const lineLeft = compact ? "left-[3.5px]" : "left-[4.5px]";

  return (
    <div className="space-y-0">
      {sorted.map((d, i) => {
        const isFuture = new Date(d.date) > now;
        const dateStr = new Date(d.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        return (
          <div key={i} className="flex gap-3 relative">
            {/* Vertical line */}
            {i < sorted.length - 1 && (
              <div
                className={`absolute ${lineLeft} top-3 bottom-0 w-px bg-slate-200`}
              />
            )}
            {/* Dot */}
            <div
              className={`${dotSize} rounded-full flex-shrink-0 mt-1.5 ${
                isFuture ? "bg-amber" : "bg-slate-300"
              }`}
            />
            {/* Content */}
            <div className={compact ? "pb-3" : "pb-4"}>
              <p
                className={`text-xs font-medium font-mono ${
                  isFuture ? "text-amber" : "text-text-secondary"
                }`}
              >
                {dateStr}
              </p>
              <p
                className={`${compact ? "text-xs" : "text-sm"} text-text-primary`}
              >
                {d.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
