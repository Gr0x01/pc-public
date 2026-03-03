import {
  MOCK_PRODUCTS,
  MOCK_PRODUCT_MATCHES,
} from "@/lib/mock/app-data";
import type { SubscriberProduct } from "@/types/database";
import ProductStatusCard from "@/components/app/ProductStatusCard";

const USE_MOCK = true;

type ProductStatus = "urgent" | "review" | "clear";

interface ProductWithStatus {
  product: SubscriberProduct;
  matchCount: number;
  status: ProductStatus;
}

function deriveStatus(product: SubscriberProduct, matchCount: number): ProductStatus {
  // For mock purposes, derive status based on product ID matching our mock data patterns
  // In production this would come from the highest-urgency match
  const urgentMatches = MOCK_PRODUCT_MATCHES.filter(
    (m) =>
      m.product_id === product.id &&
      m.confidence >= 0.9 &&
      m.match_type === "direct_substance"
  );
  if (urgentMatches.length > 0) return "urgent";

  const reviewMatches = MOCK_PRODUCT_MATCHES.filter(
    (m) =>
      m.product_id === product.id &&
      (m.confidence >= 0.7 || m.match_type === "direct_substance")
  );
  if (reviewMatches.length > 0) return "review";

  return "clear";
}

export default async function ProductsPage() {
  let products: ProductWithStatus[] = [];

  if (USE_MOCK) {
    products = MOCK_PRODUCTS.map((p) => {
      const matchCount = MOCK_PRODUCT_MATCHES.filter(
        (m) => m.product_id === p.id
      ).length;
      const status = deriveStatus(p, matchCount);
      return { product: p, matchCount, status };
    });
  }

  const urgent = products.filter((p) => p.status === "urgent");
  const review = products.filter((p) => p.status === "review");
  const clear = products.filter((p) => p.status === "clear");

  const sections: Array<{
    title: string;
    items: ProductWithStatus[];
    key: string;
  }> = [];
  if (urgent.length > 0)
    sections.push({ title: `Action Required (${urgent.length})`, items: urgent, key: "urgent" });
  if (review.length > 0)
    sections.push({ title: `Under Review (${review.length})`, items: review, key: "review" });
  if (clear.length > 0)
    sections.push({ title: `All Clear (${clear.length})`, items: clear, key: "clear" });

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold text-white mb-1">
          Your Products
        </h1>
        <p className="text-sm text-slate-400">
          Monitored products and their regulatory status.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="border border-white/10 rounded p-8 text-center">
          <p className="text-slate-400 text-sm">No products added yet.</p>
          <p className="text-slate-500 text-xs mt-1 font-mono">
            Product onboarding coming soon.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.key}>
              <h2 className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-3">
                {section.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {section.items.map((item) => (
                  <ProductStatusCard
                    key={item.product.id}
                    product={item.product}
                    matchCount={item.matchCount}
                    status={item.status}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
