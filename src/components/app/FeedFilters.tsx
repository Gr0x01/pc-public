"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useState, useRef, useEffect } from "react";

const TYPE_FILTERS = [
  { value: "", label: "All Types" },
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
  { value: "", label: "All" },
] as const;

export default function FeedFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [typeOpen, setTypeOpen] = useState(false);
  const typeRef = useRef<HTMLDivElement>(null);

  const currentType = searchParams.get("type") ?? "";
  const currentRange = searchParams.get("range") ?? "";
  const myProducts = searchParams.get("myProducts") === "true";
  const showArchived = searchParams.get("showArchived") === "true";

  const currentTypeLabel =
    TYPE_FILTERS.find((f) => f.value === currentType)?.label ?? "All Types";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) {
        setTypeOpen(false);
      }
    }
    if (typeOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [typeOpen]);

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

  const toggleParam = useCallback(
    (key: string, isActive: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (isActive) {
        params.delete(key);
      } else {
        params.set(key, "true");
      }
      router.push(`/app/feed?${params.toString()}`);
    },
    [searchParams, router]
  );

  const pillBase =
    "px-3 py-1.5 rounded border text-xs font-sans font-medium transition-colors duration-100 cursor-pointer";
  const pillActive = "bg-surface-dark text-white border-surface-dark";
  const pillInactive =
    "bg-white text-text-secondary border-border hover:bg-surface-muted hover:border-border-strong";
  const myProductsActive = "bg-amber/15 text-amber border-amber/40";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Type dropdown */}
      <div ref={typeRef} className="relative">
        <button
          onClick={() => setTypeOpen((p) => !p)}
          className={`${pillBase} inline-flex items-center gap-1.5 ${
            currentType ? pillActive : pillInactive
          }`}
        >
          {currentTypeLabel}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
            className={`transition-transform duration-150 ${typeOpen ? "rotate-180" : ""}`}
          >
            <path
              d="M2.5 3.75L5 6.25L7.5 3.75"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {typeOpen && (
          <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-border rounded shadow-[0_4px_12px_rgba(0,0,0,0.08)] z-20 py-1">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  updateParams("type", f.value);
                  setTypeOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-sans transition-colors ${
                  currentType === f.value
                    ? "text-text-primary font-semibold bg-surface-muted"
                    : "text-text-secondary hover:bg-surface-muted hover:text-text-primary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="w-px h-4 bg-border mx-0.5" />

      {/* Range pills */}
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

      <span className="w-px h-4 bg-border mx-0.5" />

      {/* My Products — amber when active */}
      <button
        onClick={() => toggleParam("myProducts", myProducts)}
        className={`${pillBase} inline-flex items-center gap-1 ${
          myProducts ? myProductsActive : pillInactive
        }`}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
          className="opacity-70"
        >
          <path d="M8 1.5l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 12.2 3.8 14.5l.8-4.7L1.2 6.5l4.7-.7z" />
        </svg>
        My Products
      </button>

      <span className="w-px h-4 bg-border mx-0.5" />

      {/* Show archived — subtle text toggle, not a pill */}
      <button
        onClick={() => toggleParam("showArchived", showArchived)}
        className={`text-xs font-sans transition-colors duration-100 cursor-pointer ${
          showArchived
            ? "text-text-primary font-medium"
            : "text-text-secondary hover:text-text-primary"
        }`}
      >
        {showArchived ? "Hiding archived" : "Show archived"}
      </button>
    </div>
  );
}
