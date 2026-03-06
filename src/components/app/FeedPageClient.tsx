"use client";

import { useState, useRef, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";
import type { FeedItemEnriched } from "@/lib/mock/app-data";
import FeedFilters from "./FeedFilters";
import FeedItemCard from "./FeedItemCard";
import FeedDetailPanel from "./FeedDetailPanel";
import { trackEvent } from "@/lib/analytics-client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByDate(items: FeedItemEnriched[]): Map<string, FeedItemEnriched[]> {
  const groups = new Map<string, FeedItemEnriched[]>();
  for (const item of items) {
    const key = item.published_date;
    const arr = groups.get(key);
    if (arr) arr.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today.getTime() - target.getTime()) / 86_400_000;

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Motion variants
// ---------------------------------------------------------------------------

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

const noMotion = { hidden: {}, show: {} };
const noMotionItem = { hidden: {}, show: {} };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;

interface FeedPageClientProps {
  initialItems: FeedItemEnriched[];
  initialHasMore: boolean;
  productCount: number;
}

export default function FeedPageClient({ initialItems, initialHasMore, productCount }: FeedPageClientProps) {
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Accumulated items from server + API pages
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const offsetRef = useRef(initialItems.length);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const filterQsRef = useRef("");

  // Reset when server re-renders with new filters (initialItems identity changes)
  useEffect(() => {
    setItems(initialItems);
    setHasMore(initialHasMore);
    offsetRef.current = initialItems.length;
  }, [initialItems, initialHasMore]);

  // Build query string from current filters for API calls
  const filterQs = useMemo(() => {
    const params = new URLSearchParams();
    const type = searchParams.get("type");
    const range = searchParams.get("range");
    const myProducts = searchParams.get("myProducts");
    const showArchived = searchParams.get("showArchived");
    if (type) params.set("type", type);
    if (range) params.set("range", range);
    if (myProducts === "true") params.set("myProducts", "true");
    if (showArchived === "true") params.set("showArchived", "true");
    return params.toString();
  }, [searchParams]);

  // Keep ref in sync so observer closure always has latest value
  filterQsRef.current = filterQs;

  const myProducts = searchParams.get("myProducts") === "true";

  // Lazy load: IntersectionObserver on sentinel div.
  // Mutable values via refs so the observer stays stable.
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);
        try {
          const qs = filterQsRef.current ? `${filterQsRef.current}&` : "";
          const res = await fetch(`/api/feed?${qs}offset=${offsetRef.current}&limit=${PAGE_SIZE}`);
          if (res.ok) {
            const data = await res.json();
            setItems((prev) => [...prev, ...data.items]);
            setHasMore(data.hasMore);
            offsetRef.current += data.items.length;
          }
        } finally {
          loadingRef.current = false;
          setLoading(false);
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  const selectedItem = items.find((i) => i.id === selectedId) ?? null;
  const sidebarOpen = selectedId !== null;

  const dateGroups = useMemo(() => groupByDate(items), [items]);

  // Set --header-h CSS variable on the scroll container so date headers
  // can position themselves below the sticky filter bar via pure CSS.
  const headerCallbackRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || !contentRef.current) return;
    const update = () => {
      contentRef.current?.style.setProperty(
        "--header-h",
        `${node.offsetHeight + 2}px`
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
  }, []);

  // Detect scroll to show border/shadow on sticky header
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  function handleSelect(id: string) {
    setSelectedId((prev) => {
      if (prev === id) return null;
      const item = items.find((i) => i.id === id);
      if (item) {
        trackEvent("feed_item_clicked", {
          item_id: id,
          item_type: item.item_type,
          has_matched_products: item.matched_products.length > 0,
        });
      }
      return id;
    });
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Feed */}
      <div ref={contentRef} className="flex-1 overflow-y-auto min-w-0" style={{ "--header-h": "90px" } as React.CSSProperties}>
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Onboarding banner — scrolls away, above sticky zone */}
          {productCount === 0 && (
            <div className="mb-4 px-4 py-3 bg-amber/5 border border-amber/20 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Add products to get personalized alerts
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Policy Canary matches regulatory changes to your specific ingredients.
                </p>
              </div>
              <Link
                href="/app/products"
                className="shrink-0 ml-4 px-3 py-1.5 text-sm font-semibold text-white bg-amber rounded hover:bg-amber-action transition-colors"
              >
                Add Products
              </Link>
            </div>
          )}

          {/* Scroll sentinel */}
          <div ref={sentinelRef} className="h-0" />

          {/* Sticky header: title + filters */}
          <div
            ref={headerCallbackRef}
            className={`sticky top-0 z-10 -mx-6 px-6 pt-2 pb-3 transition-[border-color,box-shadow] duration-200 ${
              isScrolled
                ? "border-b border-border bg-surface-muted backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                : "border-b border-transparent bg-surface-muted"
            }`}
          >
            <h1 className="font-sans text-lg font-semibold text-text-primary mb-2.5">
              Regulatory Feed
            </h1>
            <Suspense fallback={null}>
              <FeedFilters />
            </Suspense>
          </div>

          {/* Feed content */}
          <div className="mt-4">
            {items.length === 0 && !loading ? (
              myProducts ? (
                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                  className="border border-clear/20 bg-clear-muted rounded-lg p-8 text-center mt-6"
                >
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-clear/10 mb-3">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M6 10l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-clear" />
                    </svg>
                  </div>
                  <p className="font-semibold text-clear text-sm">All Clear</p>
                  <p className="text-text-secondary text-xs mt-1">
                    No active regulatory items match your monitored products.
                  </p>
                </motion.div>
              ) : (
                <div className="border border-border rounded-lg p-8 text-center mt-6">
                  <p className="text-text-secondary text-sm">No items match your filters.</p>
                  <p className="text-text-secondary text-xs mt-1">
                    Try adjusting the type or date range.
                  </p>
                </div>
              )
            ) : (
              <div>
                {Array.from(dateGroups.entries()).map(([date, groupItems]) => (
                  <div key={date}>
                    {/* Sticky date header — sits just below sticky filter bar */}
                    <div
                      className="sticky z-[5] flex items-center gap-3 pt-3 pb-2 -mt-0.5 bg-surface-muted"
                      style={{ top: "calc(var(--header-h, 90px) - 2px)" }}
                    >
                      <span className="font-sans text-xs font-semibold uppercase tracking-wide text-text-secondary shrink-0">
                        {formatDateLabel(date)}
                      </span>
                      <span className="flex-1 h-px bg-border" />
                    </div>
                    <div className="space-y-1.5 pb-2">
                      {groupItems.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                          <FeedItemCard
                            item={item}
                            isSelected={item.id === selectedId}
                            onSelect={handleSelect}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
                {/* Lazy load sentinel */}
                {hasMore && (
                  <div ref={loadMoreRef} className="py-4 text-center">
                    {loading && (
                      <span className="text-xs text-text-secondary font-mono">Loading...</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && selectedItem && (
          <motion.div
            key={selectedItem.id}
            initial={shouldReduceMotion ? { opacity: 1 } : { width: 0, opacity: 0 }}
            animate={{ width: 480, opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative flex-shrink-0 overflow-hidden border-l border-border bg-white"
          >
            <div className="w-[480px] h-full overflow-y-auto">
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, ease: "easeOut", delay: 0.05 }}
              >
                <FeedDetailPanel
                  item={selectedItem}
                  onClose={() => setSelectedId(null)}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
