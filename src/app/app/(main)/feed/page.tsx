import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { countActiveProducts, getFeedItems } from "@/lib/products/queries";
import type { FeedItemEnriched } from "@/lib/mock/app-data";
import type { ItemType } from "@/types/enums";
import { isLiveState } from "@/lib/utils/lifecycle";
import FeedPageClient from "@/components/app/FeedPageClient";
import AutoCheckout from "@/components/app/AutoCheckout";

import { isDev, DEV_USER_ID } from "@/lib/dev";

const VALID_TYPES = new Set<string>([
  "warning_letter", "recall", "rule", "proposed_rule", "notice",
  "guidance", "draft_guidance", "safety_alert", "press_release",
  "import_alert", "483_observation", "state_regulation",
]);

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function filterItems(
  items: FeedItemEnriched[],
  type: string | null,
  range: string | null,
  myProducts: boolean,
  showArchived: boolean
): FeedItemEnriched[] {
  let filtered = items;

  if (!showArchived) {
    filtered = filtered.filter((i) => isLiveState(i.lifecycle_state));
  }

  if (type && VALID_TYPES.has(type)) {
    if (type === "rule") {
      filtered = filtered.filter((i) => i.item_type === "rule" || i.item_type === "proposed_rule");
    } else if (type === "notice") {
      filtered = filtered.filter((i) => (["notice", "guidance", "draft_guidance"] as ItemType[]).includes(i.item_type));
    } else {
      filtered = filtered.filter((i) => i.item_type === type);
    }
  }

  if (range) {
    const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    const days = daysMap[range];
    if (days) {
      const cutoff = daysAgo(days);
      filtered = filtered.filter((i) => new Date(i.published_date) >= cutoff);
    }
  }

  if (myProducts) {
    filtered = filtered.filter((i) => i.matched_products.length > 0);
  }

  return filtered;
}

interface FeedPageProps {
  searchParams: Promise<{ type?: string; range?: string; myProducts?: string; showArchived?: string }>;
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  let productCount = 0;
  let userId: string;

  if (isDev) {
    userId = DEV_USER_ID;
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    userId = user.id;
  }

  productCount = await countActiveProducts(userId).catch(() => 0);

  const params = await searchParams;
  const type = params.type ?? null;
  const range = params.range ?? null;
  const myProducts = params.myProducts === "true";
  const showArchived = params.showArchived === "true";

  const feedItems = await getFeedItems(userId, { limit: 100, includeArchived: showArchived });
  const items = filterItems(feedItems, type, range, myProducts, showArchived);

  return (
    <>
      <Suspense fallback={null}>
        <AutoCheckout />
      </Suspense>
      <FeedPageClient items={items} productCount={productCount} />
    </>
  );
}
