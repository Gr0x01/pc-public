import type { ItemType } from "@/types/enums";

export type LifecycleState = "urgent" | "active" | "grace" | "archived";

/** Days an item without a deadline stays "active", by item_type. */
const ACTIVE_WINDOWS: Partial<Record<ItemType, number>> = {
  recall: 90,
  safety_alert: 90,
  import_alert: 90,
  warning_letter: 60,
  "483_observation": 60,
};
const DEFAULT_ACTIVE_WINDOW = 30;

/**
 * Pure lifecycle classification from existing DB fields.
 * Decision tree:
 *   Has deadline → >90d away = active, ≤90d = urgent, passed <30d = grace, passed ≥30d = archived
 *   No deadline  → within active window by type = active, else archived
 */
export function getLifecycleState(
  input: { item_type: string; published_date: string; deadline: string | null },
  now: Date = new Date()
): LifecycleState {
  if (input.deadline) {
    const dl = new Date(input.deadline + "T00:00:00Z");
    const diffMs = dl.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays > 90) return "active";
    if (diffDays > 0) return "urgent";
    if (diffDays > -30) return "grace";
    return "archived";
  }

  // No deadline — use active window based on item_type
  const windowDays = ACTIVE_WINDOWS[input.item_type as ItemType] ?? DEFAULT_ACTIVE_WINDOW;
  const pub = new Date(input.published_date + "T00:00:00Z");
  const ageDays = (now.getTime() - pub.getTime()) / (1000 * 60 * 60 * 24);

  return ageDays <= windowDays ? "active" : "archived";
}

/** True for states that represent "live" / not-yet-resolved items. */
export function isLiveState(state: LifecycleState): boolean {
  return state === "urgent" || state === "active" || state === "grace";
}
