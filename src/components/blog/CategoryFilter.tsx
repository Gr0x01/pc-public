"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { BLOG_CATEGORIES, CATEGORY_LABELS } from "@/lib/blog/types";

export function CategoryFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("category");

  function handleFilter(category: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (category) {
      params.set("category", category);
    } else {
      params.delete("category");
    }
    const qs = params.toString();
    router.push(qs ? `/blog?${qs}` : "/blog");
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
      <button
        onClick={() => handleFilter(null)}
        className={`text-sm px-4 py-1.5 rounded border transition-colors duration-150 whitespace-nowrap ${
          !active
            ? "bg-surface-dark text-white border-surface-dark"
            : "bg-white text-text-secondary border-border hover:border-amber/40"
        }`}
      >
        All
      </button>
      {BLOG_CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => handleFilter(cat)}
          className={`text-sm px-4 py-1.5 rounded border transition-colors duration-150 whitespace-nowrap ${
            active === cat
              ? "bg-surface-dark text-white border-surface-dark"
              : "bg-white text-text-secondary border-border hover:border-amber/40"
          }`}
        >
          {CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  );
}
