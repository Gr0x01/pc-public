"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback } from "react";

const TYPE_FILTERS = [
  { value: "", label: "All" },
  { value: "warning_letter", label: "Warning Letters" },
  { value: "recall", label: "Recalls" },
  { value: "rule", label: "Rules" },
  { value: "notice", label: "Notices" },
  { value: "safety_alert", label: "Safety Alerts" },
] as const;

const RANGE_FILTERS = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "", label: "All time" },
] as const;

export default function FeedFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentType = searchParams.get("type") ?? "";
  const currentRange = searchParams.get("range") ?? "";
  const myProducts = searchParams.get("myProducts") === "true";

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/app/feed?${params.toString()}`);
    },
    [searchParams, router]
  );

  const toggleMyProducts = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (myProducts) {
      params.delete("myProducts");
    } else {
      params.set("myProducts", "true");
    }
    router.push(`/app/feed?${params.toString()}`);
  }, [searchParams, router, myProducts]);

  const pillBase =
    "px-2.5 py-1 rounded border font-mono text-[11px] transition-colors duration-100 cursor-pointer";
  const pillActive =
    "bg-amber/20 text-amber border-amber/40";
  const pillInactive =
    "bg-white text-text-secondary border-border hover:bg-surface-muted hover:border-border-strong";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Source type pills */}
      {TYPE_FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => updateParams("type", f.value)}
          className={`${pillBase} ${
            currentType === f.value ? pillActive : pillInactive
          }`}
        >
          {f.label}
        </button>
      ))}

      <span className="w-px h-4 bg-border mx-1" />

      {/* Date range pills */}
      {RANGE_FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => updateParams("range", f.value)}
          className={`${pillBase} ${
            currentRange === f.value ? pillActive : pillInactive
          }`}
        >
          {f.label}
        </button>
      ))}

      <span className="w-px h-4 bg-border mx-1" />

      {/* My Products toggle */}
      <button
        onClick={toggleMyProducts}
        className={`${pillBase} ${
          myProducts ? pillActive : pillInactive
        }`}
      >
        My Products
      </button>
    </div>
  );
}
