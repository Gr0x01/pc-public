"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import ItemTypeTag from "@/components/app/ItemTypeTag";
import type { SearchCitationCard } from "@/lib/mock/app-data";
import type { ItemType } from "@/types/enums";

const EXAMPLE_QUERIES = [
  "What's FDA's posture on identity testing?",
  "Recent collagen enforcement actions",
  "CGMP requirements for dietary supplements",
] as const;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<SearchCitationCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K / Ctrl+K focus
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      const q = searchQuery.trim();
      if (!q || q.length < 3) return;

      setQuery(q);
      setAnswer("");
      setCitations([]);
      setError(null);
      setIsLoading(true);

      try {
        const res = await fetch("/api/search", {
          method: "POST",
          body: JSON.stringify({ query: q }),
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(
            errData?.error?.message ?? `Search failed (${res.status})`
          );
        }

        // Check for citations in header
        const citationsHeader = res.headers.get("x-citations");
        if (citationsHeader) {
          try {
            setCitations(JSON.parse(citationsHeader));
          } catch {
            // citations parsing failed, continue without them
          }
        }

        // Check content-type to determine streaming vs JSON
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          setAnswer(data.answer ?? "");
          if (data.citations) {
            setCitations(data.citations);
          }
        } else {
          // Stream text response
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let accumulated = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += decoder.decode(value, { stream: true });
            setAnswer(accumulated);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred."
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const hasResults = answer.length > 0 || citations.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold text-text-primary mb-1">
          Search
        </h1>
        <p className="text-sm text-text-secondary">
          Ask questions about FDA regulatory intelligence.
        </p>
      </div>

      {/* Search input */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search regulatory intelligence..."
            className="w-full bg-white border border-border rounded px-4 py-3 pr-20 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-amber/50 focus:ring-0 transition-colors"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <kbd className="hidden sm:inline-block font-mono text-[10px] text-text-secondary bg-surface-subtle border border-border rounded px-1.5 py-0.5">
              {typeof navigator !== "undefined" &&
              /Mac/i.test(navigator.userAgent)
                ? "\u2318K"
                : "Ctrl+K"}
            </kbd>
          </div>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="border border-urgent/20 bg-urgent/5 rounded px-4 py-3 mb-6">
          <p className="text-sm text-urgent">{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && !answer && (
        <div className="space-y-3 mb-8">
          <div className="h-4 bg-surface-subtle rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-surface-subtle rounded w-full animate-pulse" />
          <div className="h-4 bg-surface-subtle rounded w-5/6 animate-pulse" />
          <div className="h-4 bg-surface-subtle rounded w-2/3 animate-pulse" />
        </div>
      )}

      {/* Answer */}
      {answer && (
        <section className="mb-8">
          <h2 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-3">
            Answer
          </h2>
          <div className="text-sm text-text-body leading-relaxed whitespace-pre-wrap">
            {answer}
          </div>
        </section>
      )}

      {/* Citations */}
      {citations.length > 0 && (
        <section className="mb-8">
          <h2 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-3">
            Sources ({citations.length})
          </h2>
          <div className="space-y-2">
            {citations.map((c, i) => (
              <Link
                key={`${c.item_id}-${i}`}
                href={`/app/items/${c.item_id}`}
                className="block border border-border bg-white hover:bg-surface-muted hover:border-border-strong rounded p-3 transition-all"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <ItemTypeTag type={c.item_type as ItemType} />
                  <span className="font-mono text-[10px] text-text-secondary">
                    {formatDate(c.published_date)}
                  </span>
                </div>
                <p className="text-sm text-text-primary font-medium leading-snug line-clamp-2 mb-1">
                  {c.title}
                </p>
                <p className="text-xs text-text-body line-clamp-2">
                  {c.chunk_content}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty/suggested state */}
      {!hasResults && !isLoading && !error && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-3">
            Try a question
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((eq) => (
              <button
                key={eq}
                onClick={() => {
                  setQuery(eq);
                  handleSearch(eq);
                }}
                className="px-3 py-2 rounded border border-border bg-white hover:bg-surface-muted hover:border-border-strong text-sm text-text-body transition-all text-left"
              >
                {eq}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
