/**
 * Mock data shaped for the three-panel Products view.
 * Derives from the existing MOCK_PRODUCTS, MOCK_PRODUCT_MATCHES, MOCK_FEED_ITEMS.
 */

import {
  MOCK_PRODUCTS,
  MOCK_PRODUCT_MATCHES,
  MOCK_FEED_ITEMS,
  type FeedItemEnriched,
} from "./app-data";
import type { SubscriberProduct, ProductMatch } from "@/types/database";
import type { ProductIngredientRow } from "@/lib/products/types";
import type { VerdictResolution } from "@/lib/products/queries";

// ---------------------------------------------------------------------------
// Types for the Products view
// ---------------------------------------------------------------------------

export type ProductStatus = "action_required" | "under_review" | "watch" | "all_clear";

export interface ProductMatchWithItem {
  match: ProductMatch;
  item: FeedItemEnriched;
  substanceIds: string[]; // substance IDs from the match for ingredient highlighting
  resolution?: VerdictResolution;
}

export interface ProductSidebarItem {
  id: string;
  name: string;
  brand: string | null;
  productType: string;
  status: ProductStatus;
  activeMatchCount: number;
  lastScannedAt: string;
}

export interface ProductDetailData {
  product: SubscriberProduct;
  status: ProductStatus;
  activeMatches: ProductMatchWithItem[];
  resolvedHistory: ResolvedHistoryItem[];
  lastScannedAt: string;
  /** Structured ingredients from product_ingredients table (when available) */
  ingredients?: ProductIngredientRow[];
}

export interface ResolvedHistoryItem {
  id: string;
  title: string;
  item_type?: string;
  resolvedAt: string;
  resolution: "resolved" | "not_applicable";
  reason?: string;
  originalStatus: "action_required" | "under_review" | "watch";
}

// ---------------------------------------------------------------------------
// Status derivation (four states)
// ---------------------------------------------------------------------------

function deriveProductStatus(productId: string): ProductStatus {
  const matches = MOCK_PRODUCT_MATCHES.filter((m) => m.product_id === productId);
  if (matches.length === 0) return "all_clear";

  const items = matches.map((m) => MOCK_FEED_ITEMS.find((fi) => fi.id === m.regulatory_item_id));
  const maxUrgency = Math.max(...items.map((i) => i?.urgency_score ?? 0));

  if (maxUrgency >= 80) return "action_required";
  if (maxUrgency >= 60) return "under_review";
  return "watch";
}

// ---------------------------------------------------------------------------
// Build sidebar items (sorted by severity)
// ---------------------------------------------------------------------------

const STATUS_SORT_ORDER: Record<ProductStatus, number> = {
  action_required: 0,
  under_review: 1,
  watch: 2,
  all_clear: 3,
};

export const MOCK_SIDEBAR_ITEMS: ProductSidebarItem[] = MOCK_PRODUCTS
  .map((p) => {
    const status = deriveProductStatus(p.id);
    const matchCount = MOCK_PRODUCT_MATCHES.filter((m) => m.product_id === p.id).length;
    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      productType: p.product_type,
      status,
      activeMatchCount: matchCount,
      lastScannedAt: "2026-03-05T13:00:00Z",
    };
  })
  .sort((a, b) => {
    const statusDiff = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;
    return a.name.localeCompare(b.name);
  });

// ---------------------------------------------------------------------------
// Build detail data per product
// ---------------------------------------------------------------------------

function buildProductDetail(product: SubscriberProduct): ProductDetailData {
  const status = deriveProductStatus(product.id);
  const matches = MOCK_PRODUCT_MATCHES.filter((m) => m.product_id === product.id);

  const activeMatches: ProductMatchWithItem[] = matches
    .map((m) => {
      const item = MOCK_FEED_ITEMS.find((fi) => fi.id === m.regulatory_item_id);
      if (!item) return null;
      return {
        match: m,
        item,
        substanceIds: (m.matched_substances ?? []).map((s) => s.substance_id),
      };
    })
    .filter((m): m is ProductMatchWithItem => m !== null)
    .sort((a, b) => (b.item.urgency_score ?? 0) - (a.item.urgency_score ?? 0));

  // Mock some resolved history items
  const resolvedHistory: ResolvedHistoryItem[] =
    product.id === "prod-001"
      ? [
          {
            id: "rh-001",
            title: "Recall: OceanPure Supplements — Mislabeled Collagen Source",
            resolvedAt: "2026-01-20T10:00:00Z",
            resolution: "resolved",
            originalStatus: "under_review",
          },
          {
            id: "rh-002",
            title: "Notice: FDA Webinar on Marine Ingredient Testing",
            resolvedAt: "2026-01-05T10:00:00Z",
            resolution: "not_applicable",
            reason: "Informational only",
            originalStatus: "watch",
          },
        ]
      : [];

  return {
    product,
    status,
    activeMatches,
    resolvedHistory,
    lastScannedAt: "2026-03-05T13:00:00Z",
  };
}

export const MOCK_PRODUCT_DETAILS: Record<string, ProductDetailData> = Object.fromEntries(
  MOCK_PRODUCTS.map((p) => [p.id, buildProductDetail(p)])
);
