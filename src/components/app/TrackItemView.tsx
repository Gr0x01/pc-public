"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics-client";

export default function TrackItemView({
  itemId,
  itemType,
  hasMatchedProducts,
}: {
  itemId: string;
  itemType: string;
  hasMatchedProducts: boolean;
}) {
  useEffect(() => {
    trackEvent("item_viewed", {
      item_id: itemId,
      item_type: itemType,
      has_matched_products: hasMatchedProducts,
    });
  }, [itemId, itemType, hasMatchedProducts]);

  return null;
}
