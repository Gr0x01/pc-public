import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProducts, getMaxProducts, getProductVerdictCounts } from "@/lib/products/queries";
import type { ProductSidebarItem } from "@/lib/mock/products-data";
import type { ProductStatus } from "@/lib/mock/products-data";
import ProductsLayout from "@/components/app/products/ProductsLayout";

// TODO: remove dev bypass before launch
const isDev = process.env.NODE_ENV === "development";
const DEV_USER_ID = "70360df8-4888-4401-9aa0-b2b15da354b0";

function deriveStatus(counts: { total: number; urgent: number; watching: number } | undefined): ProductStatus {
  if (!counts || counts.total === 0) return "all_clear";
  if (counts.total === counts.watching) return "watch";
  if (counts.urgent > 0) return "action_required";
  return "under_review";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ProductsPageProps {
  searchParams: Promise<{ product?: string; item?: string }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const sp = await searchParams;
  const initialProductId = sp.product && UUID_RE.test(sp.product) ? sp.product : undefined;
  const initialItemId = sp.item && UUID_RE.test(sp.item) ? sp.item : undefined;
  let userId: string;
  if (isDev) {
    userId = DEV_USER_ID;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    userId = user.id;
  }

  const [products, maxProducts, verdictCounts] = await Promise.all([
    getUserProducts(userId),
    getMaxProducts(userId).catch(() => 5),
    getProductVerdictCounts(userId),
  ]);

  const sidebarItems: ProductSidebarItem[] = products.map((p) => {
    const counts = verdictCounts.get(p.id);
    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      productType: p.product_type,
      status: deriveStatus(counts),
      activeMatchCount: counts?.total ?? 0,
      lastScannedAt: new Date().toISOString(),
    };
  });

  return (
    <ProductsLayout
      sidebarItems={sidebarItems}
      maxProducts={maxProducts}
      initialProductId={initialProductId}
      initialItemId={initialItemId}
    />
  );
}
