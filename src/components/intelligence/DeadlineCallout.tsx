import { DeadlineTimeline } from "./DeadlineTimeline";

interface Deadline {
  date: string;
  label: string;
}

export function DeadlineCallout({ deadlines }: { deadlines: Deadline[] }) {
  if (deadlines.length === 0) return null;

  return (
    <div
      id="timeline"
      className="border border-border border-l-4 border-l-amber bg-white rounded-r-lg p-5 mb-8 scroll-mt-24"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4">
        Key Deadlines
      </h3>
      <DeadlineTimeline deadlines={deadlines} />
    </div>
  );
}
