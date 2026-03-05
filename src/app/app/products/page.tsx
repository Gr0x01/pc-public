import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getUserProducts, getMaxProducts } from "@/lib/products/queries";
import type { ProductSidebarItem } from "@/lib/mock/products-data";
import ProductsLayout from "@/components/app/products/ProductsLayout";

const isDev = process.env.NODE_ENV === "development";

export default async function ProductsPage() {
  let userId = "dev-user-id";

  if (!isDev) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    userId = user.id;
  }

  const [products, maxProducts] = await Promise.all([
    getUserProducts(userId),
    getMaxProducts(userId).catch(() => 5), // fallback for dev
  ]);

  // Map ProductSummary → ProductSidebarItem (all "all_clear" until matching engine exists)
  const sidebarItems: ProductSidebarItem[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    productType: p.product_type,
    status: "all_clear" as const,
    activeMatchCount: 0,
    lastScannedAt: new Date().toISOString(),
  }));

  return (
    <ProductsLayout
      sidebarItems={sidebarItems}
      maxProducts={maxProducts}
    />
  );
}
