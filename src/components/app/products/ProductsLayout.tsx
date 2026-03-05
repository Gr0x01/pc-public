"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ProductSidebarItem, ProductDetailData } from "@/lib/mock/products-data";
import type { ProductDetail } from "@/lib/products/types";
import type { SubscriberProduct } from "@/types/database";
import ProductSidebar from "./ProductSidebar";
import IntelligencePanel from "./IntelligencePanel";
import ProductContextPanel from "./ProductContextPanel";
import AddProductPanel from "./AddProductPanel";

interface ProductsLayoutProps {
  sidebarItems: ProductSidebarItem[];
  maxProducts: number;
}

/** Map API ProductDetail → the ProductDetailData shape used by Intelligence/Context panels */
function toDetailData(detail: ProductDetail): ProductDetailData {
  const product: SubscriberProduct = {
    id: detail.id,
    user_id: "", // Not needed client-side; API doesn't expose it
    name: detail.name,
    brand: detail.brand,
    product_type: detail.product_type as SubscriberProduct["product_type"],
    product_category_id: detail.product_category_id,
    data_source: detail.data_source as SubscriberProduct["data_source"],
    external_id: detail.external_id,
    upc_barcode: null,
    label_image_url: null,
    raw_ingredients_text: detail.raw_ingredients_text,
    product_metadata: null,
    is_active: detail.is_active,
    created_at: detail.created_at,
    updated_at: detail.updated_at,
  };

  return {
    product,
    status: "all_clear",
    activeMatches: [],
    resolvedHistory: [],
    lastScannedAt: new Date().toISOString(),
    ingredients: detail.ingredients,
  };
}

export default function ProductsLayout({
  sidebarItems: initialItems,
  maxProducts,
}: ProductsLayoutProps) {
  const [sidebarItems, setSidebarItems] = useState(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialItems[0]?.id ?? null
  );
  const [mode, setMode] = useState<"view" | "add">("view");
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [currentDetail, setCurrentDetail] = useState<ProductDetailData | null>(null);
  const detailCache = useRef(new Map<string, ProductDetailData>());

  const [highlightedSubstanceIds, setHighlightedSubstanceIds] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // C2 fix: track intended selection to prevent stale fetch from overwriting
  const intendedIdRef = useRef<string | null>(selectedId);

  // W4 fix: remember previous selection for cancel-add
  const prevSelectedIdRef = useRef<string | null>(null);

  const fetchDetail = useCallback(async (id: string) => {
    intendedIdRef.current = id;

    // Check cache first
    const cached = detailCache.current.get(id);
    if (cached) {
      setCurrentDetail(cached);
      return;
    }

    setLoadingDetail(true);
    setCurrentDetail(null);
    try {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) throw new Error("Failed to fetch product detail");
      const { data } = (await res.json()) as { data: ProductDetail };
      const detail = toDetailData(data);
      detailCache.current.set(id, detail);
      // C2 fix: only apply if user hasn't navigated away during fetch
      if (intendedIdRef.current === id) {
        setCurrentDetail(detail);
      }
    } catch (err) {
      console.error("[ProductsLayout] fetch detail error:", err);
      if (intendedIdRef.current === id) {
        setCurrentDetail(null);
      }
    } finally {
      if (intendedIdRef.current === id) {
        setLoadingDetail(false);
      }
    }
  }, []);

  const handleSelectProduct = useCallback(
    (id: string) => {
      setSelectedId(id);
      setMode("view");
      setIsEditing(false);
      setHighlightedSubstanceIds(new Set());
      setIsMobileSidebarOpen(false);
      fetchDetail(id);
    },
    [fetchDetail]
  );

  const handleAdd = useCallback(() => {
    prevSelectedIdRef.current = selectedId;
    setMode("add");
    setSelectedId(null);
    setCurrentDetail(null);
  }, [selectedId]);

  const handleCancelAdd = useCallback(() => {
    setMode("view");
    // W4 fix: return to previously selected product, not index 0
    const returnTo = prevSelectedIdRef.current ?? sidebarItems[0]?.id ?? null;
    if (returnTo) {
      setSelectedId(returnTo);
      fetchDetail(returnTo);
    }
  }, [sidebarItems, fetchDetail]);

  const handleProductAdded = useCallback(
    (newProduct: { id: string; name: string; brand?: string | null }) => {
      const newItem: ProductSidebarItem = {
        id: newProduct.id,
        name: newProduct.name,
        brand: newProduct.brand ?? null,
        productType: "supplement",
        status: "all_clear",
        activeMatchCount: 0,
        lastScannedAt: new Date().toISOString(),
      };
      setSidebarItems((prev) => [newItem, ...prev]);
      setMode("view");
      setSelectedId(newProduct.id);
      detailCache.current.delete(newProduct.id);
      fetchDetail(newProduct.id);
    },
    [fetchDetail]
  );

  const handleHighlight = useCallback((ids: string[]) => {
    setHighlightedSubstanceIds(new Set(ids));
  }, []);

  const handleClearHighlight = useCallback(() => {
    setHighlightedSubstanceIds(new Set());
  }, []);

  // W2 fix: auto-fetch first product in useEffect, not during render
  const hasAutoFetched = useRef(false);
  useEffect(() => {
    if (!hasAutoFetched.current && selectedId) {
      hasAutoFetched.current = true;
      fetchDetail(selectedId);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Empty state: no products at all
  if (sidebarItems.length === 0 && mode !== "add") {
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
          <button
            onClick={handleAdd}
            className="bg-amber text-white font-semibold text-sm px-5 py-2.5 rounded hover:bg-amber-action transition-colors"
          >
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
          {currentDetail && (
            <>
              <StatusDot status={currentDetail.status} />
              <span className="text-sm font-semibold text-text-primary truncate flex-1">
                {currentDetail.product.name}
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
              onAdd={handleAdd}
              maxProducts={maxProducts}
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
          onAdd={handleAdd}
          maxProducts={maxProducts}
        />
      </div>

      {/* Center panel */}
      <div className="flex-1 min-w-0 overflow-y-auto lg:mt-0 mt-12">
        {mode === "add" ? (
          <AddProductPanel
            onCancel={handleCancelAdd}
            onProductAdded={handleProductAdded}
          />
        ) : loadingDetail ? (
          <DetailSkeleton />
        ) : currentDetail ? (
          <IntelligencePanel
            detail={currentDetail}
            onHighlight={handleHighlight}
            onClearHighlight={handleClearHighlight}
            isWideLayout={false}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-text-secondary">Select a product to view.</p>
          </div>
        )}
      </div>

      {/* Product context panel (right, >=1440px only) */}
      <div className="hidden 3col:flex flex-shrink-0 w-[360px] min-[1600px]:w-[400px] border-l border-border bg-white overflow-y-auto">
        {loadingDetail ? (
          <ContextSkeleton />
        ) : currentDetail ? (
          <ProductContextPanel
            detail={currentDetail}
            highlightedSubstanceIds={highlightedSubstanceIds}
            isEditing={isEditing}
            onStartEdit={() => setIsEditing(true)}
            onStopEdit={() => setIsEditing(false)}
          />
        ) : null}
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

// ---------------------------------------------------------------------------
// Loading skeletons
// ---------------------------------------------------------------------------

const SKELETON_WIDTHS = [85, 72, 91, 78, 83, 69];

function DetailSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-6 w-48 bg-slate-200 rounded" />
      <div className="h-4 w-32 bg-slate-100 rounded" />
      <div className="mt-8 space-y-3">
        <div className="h-20 bg-slate-100 rounded" />
        <div className="h-20 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

function ContextSkeleton() {
  return (
    <div className="p-5 space-y-4 animate-pulse w-full">
      <div className="h-5 w-32 bg-slate-200 rounded" />
      <div className="space-y-2">
        {SKELETON_WIDTHS.map((w, i) => (
          <div key={i} className="h-4 bg-slate-100 rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}
