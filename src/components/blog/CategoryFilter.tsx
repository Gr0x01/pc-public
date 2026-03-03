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
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => handleFilter(null)}
        className={`text-sm px-4 py-1.5 rounded-full border transition-colors duration-150 ${
          !active
            ? "bg-accent text-white border-accent"
            : "bg-white text-text-secondary border-border hover:border-accent/40"
        }`}
      >
        All
      </button>
      {BLOG_CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => handleFilter(cat)}
          className={`text-sm px-4 py-1.5 rounded-full border transition-colors duration-150 ${
            active === cat
              ? "bg-accent text-white border-accent"
              : "bg-white text-text-secondary border-border hover:border-accent/40"
          }`}
        >
          {CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  );
}
