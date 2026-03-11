interface Deadline {
  date: string;
  label: string;
}

export function DeadlineTimeline({ deadlines }: { deadlines: Deadline[] }) {
  if (deadlines.length === 0) return null;

  const now = new Date();
  const sorted = [...deadlines].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

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
              <div className="absolute left-[7px] top-4 bottom-0 w-px bg-border" />
            )}
            {/* Dot */}
            <div
              className={`w-[15px] h-[15px] rounded-full border-2 flex-shrink-0 mt-0.5 ${
                isFuture
                  ? "border-amber bg-amber/20"
                  : "border-slate-300 bg-slate-100"
              }`}
            />
            {/* Content */}
            <div className="pb-4">
              <p
                className={`text-xs font-medium ${
                  isFuture ? "text-amber" : "text-text-secondary"
                }`}
              >
                {dateStr}
              </p>
              <p className="text-sm text-text-primary">{d.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
