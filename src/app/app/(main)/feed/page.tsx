import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/auth";
import { countActiveProducts, getFeedItems } from "@/lib/products/queries";
import type { FeedFilters } from "@/lib/products/queries";
import FeedPageClient from "@/components/app/FeedPageClient";
import AutoCheckout from "@/components/app/AutoCheckout";

import { isDev, DEV_USER_ID } from "@/lib/dev";

interface FeedPageProps {
  searchParams: Promise<{ type?: string; range?: string; myProducts?: string; showArchived?: string }>;
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  let userId: string;

  if (isDev) {
    userId = DEV_USER_ID;
  } else {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    userId = user.id;
  }

  const params = await searchParams;
  const filters: FeedFilters = {
    type: params.type || undefined,
    range: params.range || undefined,
    myProducts: params.myProducts === "true",
    showArchived: params.showArchived === "true",
  };

  const [productCount, feedPage] = await Promise.all([
    countActiveProducts(userId).catch(() => 0),
    getFeedItems(userId, { limit: 25, offset: 0, filters }),
  ]);

  return (
    <>
      <Suspense fallback={null}>
        <AutoCheckout />
      </Suspense>
      <FeedPageClient
        initialItems={feedPage.items}
        initialHasMore={feedPage.hasMore}
        productCount={productCount}
      />
    </>
  );
}
