"use client";

import { useState, Suspense } from "react";
import type { FeedItemEnriched } from "@/lib/mock/app-data";
import FeedFilters from "./FeedFilters";
import FeedItemCard from "./FeedItemCard";
import FeedDetailPanel from "./FeedDetailPanel";

interface FeedPageClientProps {
  items: FeedItemEnriched[];
  initialSelectedId?: string | null;
}

export default function FeedPageClient({ items, initialSelectedId = null }: FeedPageClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);

  const selectedItem = items.find((i) => i.id === selectedId) ?? null;
  const sidebarOpen = selectedId !== null;

  function handleSelect(id: string) {
    // Toggle: clicking the selected item closes the sidebar
    setSelectedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Feed — always the primary surface */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="font-serif text-2xl font-bold text-text-primary mb-3">
              Regulatory Feed
            </h1>
            <Suspense fallback={null}>
              <FeedFilters />
            </Suspense>
          </div>

          {items.length === 0 ? (
            <div className="border border-border rounded p-8 text-center">
              <p className="text-text-secondary text-sm">No items match your filters.</p>
              <p className="text-text-secondary text-xs mt-1 font-mono">
                Try adjusting the type or date range.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <FeedItemCard
                  key={item.id}
                  item={item}
                  isSelected={item.id === selectedId}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar — slides in from the right when an item is selected */}
      <div
        className={`flex-shrink-0 border-l border-border bg-white overflow-hidden transition-all duration-200 ease-in-out ${
          sidebarOpen ? "w-[480px]" : "w-0"
        }`}
      >
        <div className="w-[480px] h-full overflow-y-auto">
          <FeedDetailPanel
            item={selectedItem}
            onClose={() => setSelectedId(null)}
          />
        </div>
      </div>
    </div>
  );
}
