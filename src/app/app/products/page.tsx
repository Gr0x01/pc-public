import { MOCK_PRODUCTS, MOCK_PRODUCT_MATCHES, MOCK_FEED_ITEMS } from "@/lib/mock/app-data";
import type { SubscriberProduct } from "@/types/database";
import type { FeedItemEnriched } from "@/lib/mock/app-data";
import ProductsPageClient from "@/components/app/ProductsPageClient";

const USE_MOCK = true;

type ProductStatus = "urgent" | "review" | "clear";

interface ProductWithStatus {
  product: SubscriberProduct;
  matchCount: number;
  status: ProductStatus;
  matches: FeedItemEnriched[];
}

function deriveStatus(product: SubscriberProduct): ProductStatus {
  const urgentMatches = MOCK_PRODUCT_MATCHES.filter(
    (m) => m.product_id === product.id && m.confidence >= 0.9 && m.match_type === "direct_substance"
  );
  if (urgentMatches.length > 0) return "urgent";

  const reviewMatches = MOCK_PRODUCT_MATCHES.filter(
    (m) => m.product_id === product.id && (m.confidence >= 0.7 || m.match_type === "direct_substance")
  );
  if (reviewMatches.length > 0) return "review";

  return "clear";
}

export default async function ProductsPage() {
  let products: ProductWithStatus[] = [];

  if (USE_MOCK) {
    products = MOCK_PRODUCTS.map((p) => {
      const matches = MOCK_FEED_ITEMS.filter((item) =>
        item.matched_products.some((mp) => mp.id === p.id)
      );
      return {
        product: p,
        matchCount: matches.length,
        status: deriveStatus(p),
        matches,
      };
    });
  }

  const urgent = products.filter((p) => p.status === "urgent");
  const review = products.filter((p) => p.status === "review");
  const clear = products.filter((p) => p.status === "clear");

  const sections = [
    ...(urgent.length > 0 ? [{ title: `Action Required (${urgent.length})`, items: urgent, key: "urgent" }] : []),
    ...(review.length > 0 ? [{ title: `Under Review (${review.length})`, items: review, key: "review" }] : []),
    ...(clear.length > 0 ? [{ title: `All Clear (${clear.length})`, items: clear, key: "clear" }] : []),
  ];

  return <ProductsPageClient sections={sections} isEmpty={products.length === 0} />;
}
