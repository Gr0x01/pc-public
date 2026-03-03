import type { ItemType } from "@/types/enums";

const TAG_STYLES: Record<string, { className: string; label: string }> = {
  warning_letter: {
    className: "bg-urgent/15 text-urgent border-urgent/30",
    label: "Warning Letter",
  },
  recall: {
    className: "bg-amber/15 text-amber border-amber/30",
    label: "Recall",
  },
  rule: {
    className: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    label: "Rule",
  },
  proposed_rule: {
    className: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    label: "Proposed Rule",
  },
  notice: {
    className: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    label: "Notice",
  },
  guidance: {
    className: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    label: "Guidance",
  },
  draft_guidance: {
    className: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    label: "Draft Guidance",
  },
  press_release: {
    className: "bg-slate-500/15 text-slate-400 border-slate-500/20",
    label: "Press Release",
  },
  safety_alert: {
    className: "bg-urgent/15 text-urgent border-urgent/30",
    label: "Safety Alert",
  },
  import_alert: {
    className: "bg-amber/15 text-amber border-amber/30",
    label: "Import Alert",
  },
  "483_observation": {
    className: "bg-amber/15 text-amber border-amber/30",
    label: "483 Observation",
  },
  state_regulation: {
    className: "bg-slate-500/15 text-slate-400 border-slate-500/20",
    label: "State Regulation",
  },
};

function formatType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ItemTypeTagProps {
  type: ItemType;
}

export default function ItemTypeTag({ type }: ItemTypeTagProps) {
  const config = TAG_STYLES[type] ?? {
    className: "bg-slate-500/15 text-slate-400 border-slate-500/20",
    label: formatType(type),
  };

  return (
    <span
      className={`inline-block rounded px-2 py-0.5 border font-mono text-[10px] uppercase tracking-wide leading-relaxed ${config.className}`}
    >
      {config.label}
    </span>
  );
}
