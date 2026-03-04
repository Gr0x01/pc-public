import { MOCK_SIDEBAR_ITEMS, MOCK_PRODUCT_DETAILS } from "@/lib/mock/products-data";
import ProductsLayout from "@/components/app/products/ProductsLayout";

export default async function ProductsPage() {
  // TODO: Replace with real data queries when matching engine is built
  const sidebarItems = MOCK_SIDEBAR_ITEMS;
  const productDetails = MOCK_PRODUCT_DETAILS;

  return (
    <ProductsLayout
      sidebarItems={sidebarItems}
      productDetails={productDetails}
    />
  );
}
