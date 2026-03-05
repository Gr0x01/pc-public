"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ProductSidebarItem, ProductDetailData } from "@/lib/mock/products-data";
import type { FeedItemEnriched } from "@/lib/mock/app-data";
import type { ProductDetail } from "@/lib/products/types";
import type { ProductVerdictItem } from "@/lib/products/queries";
import type { SubscriberProduct } from "@/types/database";
import { isLiveState } from "@/lib/utils/lifecycle";
import ProductSidebar from "./ProductSidebar";
import IntelligencePanel from "./IntelligencePanel";
import ProductContextPanel from "./ProductContextPanel";
import AddProductPanel from "./AddProductPanel";

interface ProductsLayoutProps {
  sidebarItems: ProductSidebarItem[];
  maxProducts: number;
}

/** Map API ProductDetail + verdicts → the ProductDetailData shape used by Intelligence/Context panels */
function toDetailData(detail: ProductDetail, verdicts: ProductVerdictItem[]): ProductDetailData {
  const product: SubscriberProduct = {
    id: detail.id,
    user_id: "",
    name: detail.name,
    brand: detail.brand,
    product_type: detail.product_type as SubscriberProduct["product_type"],
    product_category_id: detail.product_category_id,
    data_source: detail.data_source as SubscriberProduct["data_source"],
    external_id: detail.external_id,
    upc_barcode: null,
    raw_ingredients_text: detail.raw_ingredients_text,
    product_metadata: null,
    is_active: detail.is_active,
    created_at: detail.created_at,
    updated_at: detail.updated_at,
  };

  const liveVerdicts = verdicts.filter((v) => isLiveState(v.lifecycle_state));
  const archivedVerdicts = verdicts.filter((v) => !isLiveState(v.lifecycle_state));

  // Derive status from live verdicts only
  let status: "action_required" | "under_review" | "watch" | "all_clear" = "all_clear";
  if (liveVerdicts.length > 0) {
    const hasUrgent = liveVerdicts.some((v) => v.lifecycle_state === "urgent");
    status = hasUrgent ? "action_required" : "under_review";
  }

  function verdictToMatch(v: ProductVerdictItem) {
    return {
      match: {
        id: v.item_id,
        product_id: detail.id,
        regulatory_item_id: v.item_id,
        match_type: "direct_substance" as const,
        match_method: "verdict",
        confidence: 1,
        matched_substances: null,
        matched_tags: null,
        impact_summary: v.reasoning,
        action_items: v.action_items,
        is_dismissed: false,
        reviewed_at: null,
        created_at: v.evaluated_at,
        updated_at: v.evaluated_at,
      },
      item: {
        id: v.item_id,
        title: v.title,
        item_type: v.item_type as FeedItemEnriched["item_type"],
        published_date: v.published_date,
        source_url: v.source_url,
        issuing_office: v.issuing_office,
        summary: v.summary,
        urgency_score: null,
        relevance: "high" as const,
        impact_summary: v.reasoning,
        action_items: v.action_items,
        deadline: v.deadline,
        lifecycle_state: v.lifecycle_state,
        matched_products: [],
      },
      substanceIds: [],
    };
  }

  const activeMatches = liveVerdicts.map(verdictToMatch);

  const resolvedHistory = archivedVerdicts.map((v) => ({
    id: v.item_id,
    title: v.title,
    resolvedAt: v.evaluated_at,
    resolution: "resolved" as const,
    originalStatus: "under_review" as const,
  }));

  return {
    product,
    status,
    activeMatches,
    resolvedHistory,
    lastScannedAt: verdicts[0]?.evaluated_at ?? new Date().toISOString(),
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
  const [mode, setMode] = useState<"view" | "add">(initialItems.length === 0 ? "add" : "view");
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [currentDetail, setCurrentDetail] = useState<ProductDetailData | null>(null);
  const detailCache = useRef(new Map<string, ProductDetailData>());

  const [highlightedSubstanceIds, setHighlightedSubstanceIds] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

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
      const { data, verdicts } = (await res.json()) as { data: ProductDetail; verdicts: ProductVerdictItem[] };
      const detail = toDetailData(data, verdicts ?? []);
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
    (newProduct: { id: string; name: string; brand?: string | null; productType: string }) => {
      const newItem: ProductSidebarItem = {
        id: newProduct.id,
        name: newProduct.name,
        brand: newProduct.brand ?? null,
        productType: newProduct.productType,
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
        <AnimatePresence mode="wait">
          {mode === "add" ? (
            <motion.div
              key="add"
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <AddProductPanel
                onCancel={handleCancelAdd}
                onProductAdded={handleProductAdded}
              />
            </motion.div>
          ) : loadingDetail ? (
            <motion.div
              key="skeleton"
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <DetailSkeleton />
            </motion.div>
          ) : currentDetail ? (
            <motion.div
              key={`detail-${currentDetail.product.id}`}
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <IntelligencePanel
                detail={currentDetail}
                onHighlight={handleHighlight}
                onClearHighlight={handleClearHighlight}
                isWideLayout={false}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-full"
            >
              <p className="text-sm text-text-secondary">Select a product to view.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Product context panel (right, >=1440px only) — hidden during add mode */}
      {mode !== "add" && (
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
      )}
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
