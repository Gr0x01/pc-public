import type { IntelPageType } from "@/lib/intelligence/types";

const INGREDIENT_STATUS_STYLES: Record<string, string> = {
  banned: "bg-red-100 text-red-700",
  under_review: "bg-amber-100 text-amber-700",
  gras: "bg-green-100 text-green-700",
  restricted: "bg-yellow-100 text-yellow-700",
};

const REGULATION_STATUS_STYLES: Record<string, string> = {
  enacted: "bg-green-100 text-green-700",
  proposed: "bg-amber-100 text-amber-700",
  comment_period: "bg-blue-100 text-blue-700",
};

function formatStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({
  status,
  pageType,
}: {
  status: string;
  pageType: IntelPageType;
}) {
  let styles = "bg-slate-100 text-slate-600";

  if (pageType === "ingredient") {
    styles = INGREDIENT_STATUS_STYLES[status] ?? styles;
  } else if (pageType === "regulation") {
    styles = REGULATION_STATUS_STYLES[status] ?? styles;
  } else if (pageType === "enforcement") {
    // Enforcement doesn't have a fixed status; use default
  }

  return (
    <span
      className={`inline-block text-xs font-medium px-2.5 py-1 rounded ${styles}`}
    >
      {formatStatus(status)}
    </span>
  );
}
