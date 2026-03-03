/**
 * Shared formatting utilities for date display.
 */

export function formatDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" }
): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", options);
}

export function formatDateShort(dateStr: string): string {
  return formatDate(dateStr, { month: "short", day: "numeric", year: "numeric" });
}
