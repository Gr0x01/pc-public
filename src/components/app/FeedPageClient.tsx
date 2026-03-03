"use client";

import { useState, Suspense } from "react";
import type { FeedItemEnriched } from "@/lib/mock/app-data";
import FeedFilters from "./FeedFilters";
import FeedItemCard from "./FeedItemCard";
import FeedDetailPanel from "./FeedDetailPanel";

interface FeedPageClientProps {
  items: FeedItemEnriched[];
}

export default function FeedPageClient({ items }: FeedPageClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    items.length > 0 ? items[0].id : null
  );

  const selectedItem = items.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Left: feed list */}
      <div className="w-[400px] flex-shrink-0 border-r border-border flex flex-col overflow-hidden bg-surface-muted">
        {/* List header + filters */}
        <div className="px-4 pt-5 pb-4 border-b border-border shrink-0">
          <h1 className="font-serif text-lg font-bold text-text-primary mb-3">
            Regulatory Feed
          </h1>
          <Suspense fallback={null}>
            <FeedFilters />
          </Suspense>
        </div>

        {/* Scrollable list */}
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {items.length === 0 ? (
            <div className="px-1 py-8 text-center">
              <p className="text-text-secondary text-sm">No items match your filters.</p>
              <p className="text-text-secondary text-xs mt-1 font-mono">
                Try adjusting the type or date range.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <FeedItemCard
                key={item.id}
                item={item}
                isSelected={item.id === selectedId}
                onSelect={setSelectedId}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: detail panel */}
      <div className="flex-1 overflow-hidden bg-white">
        <FeedDetailPanel item={selectedItem} />
      </div>
    </div>
  );
}
