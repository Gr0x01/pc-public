"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { ProductSidebarItem, ProductDetailData } from "@/lib/mock/products-data";
import ProductSidebar from "./ProductSidebar";
import IntelligencePanel from "./IntelligencePanel";
import ProductContextPanel from "./ProductContextPanel";

interface ProductsLayoutProps {
  sidebarItems: ProductSidebarItem[];
  productDetails: Record<string, ProductDetailData>;
  initialProductId?: string;
}

export default function ProductsLayout({
  sidebarItems,
  productDetails,
  initialProductId,
}: ProductsLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Determine selected product from URL or default to first
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (initialProductId && productDetails[initialProductId]) return initialProductId;
    return sidebarItems[0]?.id ?? null;
  });

  const [highlightedSubstanceIds, setHighlightedSubstanceIds] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const detail = selectedId ? productDetails[selectedId] ?? null : null;

  const handleSelectProduct = useCallback(
    (id: string) => {
      setSelectedId(id);
      setIsEditing(false);
      setHighlightedSubstanceIds(new Set());
      setIsMobileSidebarOpen(false);
      // Update URL without full reload
      router.push(`/app/products/${id}`, { scroll: false });
    },
    [router]
  );

  const handleHighlight = useCallback((ids: string[]) => {
    setHighlightedSubstanceIds(new Set(ids));
  }, []);

  const handleClearHighlight = useCallback(() => {
    setHighlightedSubstanceIds(new Set());
  }, []);

  // Empty state: no products at all
  if (sidebarItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="text-center max-w-md px-6">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-slate-400">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Add your first product to start monitoring.
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            Policy Canary watches every FDA regulatory change and tells you which ones affect your specific products.
          </p>
          <button className="bg-amber text-white font-semibold text-sm px-5 py-2.5 rounded hover:bg-amber-action transition-colors">
            + Add Your First Product
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Mobile product selector bar */}
      <div className="lg:hidden fixed top-14 left-0 right-0 z-30 bg-white border-b border-border px-4 py-2.5">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="flex items-center gap-2 w-full text-left"
        >
          {detail && (
            <>
              <StatusDot status={detail.status} />
              <span className="text-sm font-semibold text-text-primary truncate flex-1">
                {detail.product.name}
              </span>
            </>
          )}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-text-secondary shrink-0">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setIsMobileSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[300px] bg-white shadow-xl">
            <ProductSidebar
              items={sidebarItems}
              selectedId={selectedId}
              onSelect={handleSelectProduct}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0 w-[280px] 3col:w-[300px] border-r border-border bg-surface-muted">
        <ProductSidebar
          items={sidebarItems}
          selectedId={selectedId}
          onSelect={handleSelectProduct}
        />
      </div>

      {/* Intelligence panel (center) */}
      <div className="flex-1 min-w-0 overflow-y-auto lg:mt-0 mt-12">
        {detail ? (
          <IntelligencePanel
            detail={detail}
            onHighlight={handleHighlight}
            onClearHighlight={handleClearHighlight}
            isWideLayout={false} // Will be overridden by CSS — content stacks at <1440px
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-text-secondary">Select a product to view.</p>
          </div>
        )}
      </div>

      {/* Product context panel (right, ≥1440px only) */}
      <div className="hidden 3col:flex flex-shrink-0 w-[360px] min-[1600px]:w-[400px] border-l border-border bg-white overflow-y-auto">
        {detail && (
          <ProductContextPanel
            detail={detail}
            highlightedSubstanceIds={highlightedSubstanceIds}
            isEditing={isEditing}
            onStartEdit={() => setIsEditing(true)}
            onStopEdit={() => setIsEditing(false)}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared status dot component
// ---------------------------------------------------------------------------

export type ProductStatusType = "action_required" | "under_review" | "watch" | "all_clear";

const STATUS_DOT_COLORS: Record<ProductStatusType, string> = {
  action_required: "bg-urgent",
  under_review: "bg-amber",
  watch: "bg-watch",
  all_clear: "bg-clear",
};

export function StatusDot({ status, size = "sm" }: { status: ProductStatusType; size?: "sm" | "md" }) {
  const sizeClass = size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";
  return <span className={`${sizeClass} rounded-full shrink-0 ${STATUS_DOT_COLORS[status]}`} />;
}

export const STATUS_LABELS: Record<ProductStatusType, string> = {
  action_required: "Action Required",
  under_review: "Under Review",
  watch: "Watch",
  all_clear: "All Clear",
};

export const STATUS_TEXT_COLORS: Record<ProductStatusType, string> = {
  action_required: "text-urgent",
  under_review: "text-amber",
  watch: "text-watch",
  all_clear: "text-clear",
};
