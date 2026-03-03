import { MOCK_FEED_ITEMS } from "@/lib/mock/app-data";
import type { FeedItemEnriched } from "@/lib/mock/app-data";
import type { ItemType } from "@/types/enums";
import FeedPageClient from "@/components/app/FeedPageClient";

const USE_MOCK = true;

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
  myProducts: boolean
): FeedItemEnriched[] {
  let filtered = items;

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
  searchParams: Promise<{ type?: string; range?: string; myProducts?: string }>;
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const params = await searchParams;
  const type = params.type ?? null;
  const range = params.range ?? null;
  const myProducts = params.myProducts === "true";

  const items: FeedItemEnriched[] = USE_MOCK
    ? filterItems(MOCK_FEED_ITEMS, type, range, myProducts)
    : [];

  return <FeedPageClient items={items} />;
}
