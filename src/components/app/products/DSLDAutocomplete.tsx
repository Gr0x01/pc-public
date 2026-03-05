"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { DSLDSearchResult } from "@/lib/products/types";

interface DSLDAutocompleteProps {
  onSelect: (result: DSLDSearchResult) => void;
}

export default function DSLDAutocomplete({ onSelect }: DSLDAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DSLDSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/dsld/search?q=${encodeURIComponent(q)}&limit=10`);
      if (!res.ok) throw new Error("Search failed");
      const { data } = (await res.json()) as { data: DSLDSearchResult[] };
      setResults(data);
      setIsOpen(data.length > 0);
      setHighlightIdx(-1);
    } catch {
      setResults([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(val), 300);
    },
    [search]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIdx((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIdx((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === "Enter" && highlightIdx >= 0) {
        e.preventDefault();
        onSelect(results[highlightIdx]);
        setIsOpen(false);
        setQuery("");
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    [isOpen, results, highlightIdx, onSelect]
  );

  return (
    <div className="relative">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Delay to allow dropdown clicks to fire
            setTimeout(() => setIsOpen(false), 150);
          }}
          onFocus={() => {
            if (results.length > 0 && query.length >= 2) setIsOpen(true);
          }}
          placeholder="Search DSLD supplements..."
          autoFocus
          className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber/50 placeholder:text-text-secondary/60"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-text-secondary" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={r.dsld_id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(r);
                setIsOpen(false);
                setQuery("");
              }}
              className={`w-full text-left px-3 py-2.5 border-b border-border/50 last:border-b-0 transition-colors ${
                i === highlightIdx ? "bg-amber/5" : "hover:bg-slate-50"
              }`}
            >
              <p className="text-sm font-medium text-text-primary truncate">{r.product_name}</p>
              {r.brand_name && (
                <p className="text-xs text-text-secondary truncate">{r.brand_name}</p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Empty state hint */}
      {query.length > 0 && query.length < 2 && (
        <p className="text-xs text-text-secondary mt-1.5 ml-1">Type at least 2 characters to search</p>
      )}
      {!loading && query.length >= 2 && results.length === 0 && !isOpen && (
        <p className="text-xs text-text-secondary mt-1.5 ml-1">No results found for &ldquo;{query}&rdquo;</p>
      )}
    </div>
  );
}
