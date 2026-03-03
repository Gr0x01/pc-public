import { Suspense } from "react";
import { MOCK_FEED_ITEMS } from "@/lib/mock/app-data";
import type { FeedItemEnriched } from "@/lib/mock/app-data";
import type { ItemType } from "@/types/enums";
import FeedFilters from "@/components/app/FeedFilters";
import FeedItemCard from "@/components/app/FeedItemCard";

const USE_MOCK = true;

// Valid item_type values for filtering
const VALID_TYPES = new Set<string>([
  "warning_letter",
  "recall",
  "rule",
  "proposed_rule",
  "notice",
  "guidance",
  "draft_guidance",
  "safety_alert",
  "press_release",
  "import_alert",
  "483_observation",
  "state_regulation",
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
  myProducts: boolean
): FeedItemEnriched[] {
  let filtered = items;

  // Filter by item_type
  if (type && VALID_TYPES.has(type)) {
    // Also include proposed_rule/draft_guidance when filtering by their parent type
    if (type === "rule") {
      filtered = filtered.filter(
        (i) => i.item_type === "rule" || i.item_type === "proposed_rule"
      );
    } else if (type === "notice") {
      filtered = filtered.filter(
        (i) =>
          i.item_type === "notice" ||
          i.item_type === "guidance" ||
          i.item_type === "draft_guidance"
      );
    } else {
      filtered = filtered.filter((i) => i.item_type === type);
    }
  }

  // Filter by date range
  if (range) {
    const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    const days = daysMap[range];
    if (days) {
      const cutoff = daysAgo(days);
      filtered = filtered.filter(
        (i) => new Date(i.published_date) >= cutoff
      );
    }
  }

  // Filter to items matching at least one of the user's products
  if (myProducts) {
    filtered = filtered.filter((i) => i.matched_products.length > 0);
  }

  return filtered;
}

interface FeedPageProps {
  searchParams: Promise<{
    type?: string;
    range?: string;
    myProducts?: string;
  }>;
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const params = await searchParams;
  const type = params.type ?? null;
  const range = params.range ?? null;
  const myProducts = params.myProducts === "true";

  let items: FeedItemEnriched[] = [];

  if (USE_MOCK) {
    items = filterItems(MOCK_FEED_ITEMS, type, range, myProducts);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold text-white mb-1">
          Regulatory Feed
        </h1>
        <p className="text-sm text-slate-400">
          FDA actions, rules, and enforcement affecting your products.
        </p>
      </div>

      <Suspense fallback={null}>
        <div className="mb-6">
          <FeedFilters />
        </div>
      </Suspense>

      {items.length === 0 ? (
        <div className="border border-white/10 rounded p-8 text-center">
          <p className="text-slate-400 text-sm">
            No items match your filters.
          </p>
          <p className="text-slate-500 text-xs mt-1 font-mono">
            Try adjusting the type or date range.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <FeedItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
