"use client";

import { useState } from "react";
import type { SubscriberProduct } from "@/types/database";
import type { FeedItemEnriched } from "@/lib/mock/app-data";
import ProductStatusCard from "./ProductStatusCard";
import ProductDetailPanel from "./ProductDetailPanel";

type ProductStatus = "urgent" | "review" | "clear";

interface ProductWithStatus {
  product: SubscriberProduct;
  matchCount: number;
  status: ProductStatus;
  matches: FeedItemEnriched[];
}

interface ProductsPageClientProps {
  sections: Array<{ title: string; items: ProductWithStatus[]; key: string }>;
  isEmpty: boolean;
}

export default function ProductsPageClient({ sections, isEmpty }: ProductsPageClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allProducts = sections.flatMap((s) => s.items);
  const selectedEntry = allProducts.find((p) => p.product.id === selectedId) ?? null;
  const sidebarOpen = selectedId !== null;

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Products list — primary surface */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="font-serif text-2xl font-bold text-text-primary mb-1">
              Your Products
            </h1>
            <p className="text-sm text-text-secondary">
              Monitored products and their regulatory status.
            </p>
          </div>

          {isEmpty ? (
            <div className="border border-border rounded p-8 text-center">
              <p className="text-text-secondary text-sm">No products added yet.</p>
              <p className="text-text-secondary text-xs mt-1 font-mono">
                Product onboarding coming soon.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {sections.map((section) => (
                <div key={section.key}>
                  <h2 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-3">
                    {section.title}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {section.items.map((item) => (
                      <ProductStatusCard
                        key={item.product.id}
                        product={item.product}
                        matchCount={item.matchCount}
                        status={item.status}
                        isSelected={item.product.id === selectedId}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar — slides in when a product is selected */}
      <div
        className={`flex-shrink-0 border-l border-border bg-white overflow-hidden transition-all duration-200 ease-in-out ${
          sidebarOpen ? "w-[480px]" : "w-0"
        }`}
      >
        <div className="w-[480px] h-full overflow-y-auto">
          <ProductDetailPanel
            product={selectedEntry?.product ?? null}
            status={selectedEntry?.status ?? null}
            matches={selectedEntry?.matches ?? []}
            onClose={() => setSelectedId(null)}
          />
        </div>
      </div>
    </div>
  );
}
