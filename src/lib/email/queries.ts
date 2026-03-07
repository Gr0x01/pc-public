import { adminClient } from "@/lib/supabase/admin";
import { getMatchesForUser, type ProductMatch } from "@/lib/products/matches";
import { getLifecycleState, isLiveState } from "@/lib/utils/lifecycle";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A subscriber's product with its ingredient list for email personalization. */
export interface SubscriberProduct {
  id: string;
  name: string;
  brand: string | null;
  product_type: string;
  ingredient_count: number;
}

/** A regulatory item matched to specific products, enriched for email. */
export interface BriefingItem {
  item_id: string;
  title: string;
  item_type: string;
  published_date: string;
  source_url: string | null;
  summary: string | null;
  regulatory_action_type: string | null;
  deadline: string | null;
  action_items: string[] | null;
  regulations_cited: string[] | null;
  relevance: number;
  lifecycle_state: string;
  /** Products this item matched, with specific match reasons. */
  matched_products: Array<{
    product_id: string;
    product_name: string;
    matched_substances: string[];
    matched_categories: string[];
  }>;
}

/** All data needed to compile a Product Intelligence Briefing. */
export interface BriefingData {
  subscriber: {
    id: string;
    email: string;
    first_name: string | null;
    company_name: string | null;
  };
  products: SubscriberProduct[];
  /** Items that match at least one of the subscriber's products (YOUR PRODUCTS zone). */
  product_items: BriefingItem[];
  /** Items in the subscriber's product categories but not matching specific products (YOUR INDUSTRY zone). */
  industry_items: BriefingItem[];
  /** All other recent items (ACROSS FDA zone). */
  other_items: Array<{ title: string; item_type: string; source_url: string | null }>;
  /** Period covered by this briefing. */
  period: { start: string; end: string };
  /** Total regulatory items reviewed in this period. */
  total_items_reviewed: number;
}

/** Subscriber record for email sending. */
export interface EmailSubscriber {
  user_id: string;
  email: string;
  first_name: string | null;
  company_name: string | null;
  access_level: string;
  email_unsubscribe_token: string;
}

// ---------------------------------------------------------------------------
// Active paid subscribers
// ---------------------------------------------------------------------------

export async function getActiveSubscribers(): Promise<EmailSubscriber[]> {
  const { data, error } = await adminClient
    .from("users")
    .select("id, email, first_name, company_name, access_level, email_unsubscribe_token")
    .eq("access_level", "monitor")
    .eq("email_opted_out", false);

  if (error) {
    console.error("[email-queries] getActiveSubscribers error:", error);
    return [];
  }

  return (data ?? []).map((u) => ({
    user_id: u.id,
    email: u.email,
    first_name: u.first_name,
    company_name: u.company_name,
    access_level: u.access_level,
    email_unsubscribe_token: u.email_unsubscribe_token,
  }));
}

// ---------------------------------------------------------------------------
// Newsletter subscribers (free)
// ---------------------------------------------------------------------------

export async function getNewsletterSubscribers(): Promise<
  Array<{ id: string; email: string; first_name: string | null; unsubscribe_token: string | null }>
> {
  const { data, error } = await adminClient
    .from("email_subscribers")
    .select("id, email, first_name, unsubscribe_token")
    .eq("status", "active");

  if (error) {
    console.error("[email-queries] getNewsletterSubscribers error:", error);
    return [];
  }

  return data ?? [];
}

// ---------------------------------------------------------------------------
// Briefing data for a single paid subscriber
// ---------------------------------------------------------------------------

export async function getBriefingData(
  userId: string,
  periodDays: number = 7
): Promise<BriefingData | null> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - periodDays);

  // Fetch subscriber info
  const { data: user } = await adminClient
    .from("users")
    .select("id, email, first_name, company_name")
    .eq("id", userId)
    .single();

  if (!user) return null;

  // Fetch subscriber's active products
  const { data: products } = await adminClient
    .from("subscriber_products")
    .select("id, name, brand, product_type")
    .eq("user_id", userId)
    .eq("is_active", true);

  const productList: SubscriberProduct[] = (products ?? []).map((p) => ({
    ...p,
    ingredient_count: 0, // not needed for email compilation
  }));

  if (productList.length === 0) return null;

  // Get matches for this subscriber in the period
  const matches = await getMatchesForUser(userId, start);
  if (matches.length === 0 && productList.length > 0) {
    console.warn(`[email-queries] Zero matches for user ${userId} with ${productList.length} products — RPC may have failed`);
  }

  // Get all recent items in the period for industry + other zones
  const { data: recentItems } = await adminClient
    .from("regulatory_items")
    .select(`
      id, title, item_type, published_date, source_url,
      item_enrichments(summary, regulatory_action_type, deadline, raw_response)
    `)
    .gte("published_date", start.toISOString().slice(0, 10))
    .lte("published_date", end.toISOString().slice(0, 10))
    .not("item_enrichments", "is", null)
    .order("published_date", { ascending: false })
    .limit(200); // cap to avoid unbounded .in() on tag batch query

  const totalReviewed = recentItems?.length ?? 0;
  const matchedItemIds = new Set(matches.map((m) => m.item_id));

  // Get category slugs for subscriber's products (for industry zone filtering)
  const { data: productCategories } = await adminClient
    .from("subscriber_products")
    .select("product_category_id, product_categories(slug)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .not("product_category_id", "is", null);

  const subscriberCategorySlugs = new Set(
    (productCategories ?? [])
      .map((pc) => {
        const cat = pc.product_categories as unknown as { slug: string } | null;
        return cat?.slug;
      })
      .filter((s): s is string => !!s)
  );

  // Build briefing items from matches (YOUR PRODUCTS zone)
  const productItems: BriefingItem[] = matches
    .filter((m) => {
      const ls = getLifecycleState({
        item_type: m.item_type,
        published_date: m.published_date,
        deadline: m.deadline,
      });
      return isLiveState(ls);
    })
    .map((m) => matchToBriefingItem(m));

  // Batch-fetch all product_type tags for recent items (avoids N+1)
  const recentItemIds = (recentItems ?? []).map((i) => i.id);
  const { data: allItemTags } = recentItemIds.length > 0
    ? await adminClient
        .from("item_enrichment_tags")
        .select("item_id, tag_value")
        .in("item_id", recentItemIds)
        .eq("tag_dimension", "product_type")
    : { data: [] };

  const tagsByItem = new Map<string, string[]>();
  for (const t of allItemTags ?? []) {
    const list = tagsByItem.get(t.item_id) ?? [];
    list.push(t.tag_value);
    tagsByItem.set(t.item_id, list);
  }

  // Build industry items: items NOT matched to products, but in subscriber's categories
  const industryItems: BriefingItem[] = [];
  const otherItems: Array<{ title: string; item_type: string; source_url: string | null }> = [];

  for (const item of recentItems ?? []) {
    if (matchedItemIds.has(item.id)) continue; // already in product_items

    const enrichment = Array.isArray(item.item_enrichments)
      ? item.item_enrichments[0]
      : item.item_enrichments;
    if (!enrichment) continue;

    const itemCategories = tagsByItem.get(item.id) ?? [];
    const isIndustry = itemCategories.some((c) => subscriberCategorySlugs.has(c));

    if (isIndustry && industryItems.length < 5) {
      const raw = enrichment.raw_response as Record<string, unknown> | null;
      industryItems.push({
        item_id: item.id,
        title: item.title,
        item_type: item.item_type,
        published_date: item.published_date,
        source_url: item.source_url,
        summary: enrichment.summary ?? null,
        regulatory_action_type: enrichment.regulatory_action_type ?? null,
        deadline: enrichment.deadline ?? null,
        action_items: Array.isArray(raw?.action_items) ? (raw!.action_items as string[]) : null,
        regulations_cited: Array.isArray(raw?.regulations_cited)
          ? (raw!.regulations_cited as string[])
          : null,
        relevance: 0.2,
        lifecycle_state: "active",
        matched_products: [],
      });
    } else if (otherItems.length < 10) {
      otherItems.push({
        title: item.title,
        item_type: item.item_type,
        source_url: item.source_url,
      });
    }
  }

  return {
    subscriber: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      company_name: user.company_name,
    },
    products: productList,
    product_items: productItems,
    industry_items: industryItems,
    other_items: otherItems,
    period: {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    },
    total_items_reviewed: totalReviewed,
  };
}

// ---------------------------------------------------------------------------
// Recent items for free weekly digest (same for all subscribers)
// ---------------------------------------------------------------------------

export interface WeeklyDigestData {
  items: Array<{
    title: string;
    item_type: string;
    published_date: string;
    source_url: string | null;
    summary: string | null;
    regulatory_action_type: string | null;
    deadline: string | null;
  }>;
  period: { start: string; end: string };
  total_items: number;
  /** Aggregate stats for the bridge section. */
  bridge: {
    total_monitored_products: number;
    products_with_action_items: number;
  };
}

export async function getWeeklyDigestData(
  periodDays: number = 7
): Promise<WeeklyDigestData> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - periodDays);

  const { data: items } = await adminClient
    .from("regulatory_items")
    .select(`
      id, title, item_type, published_date, source_url,
      item_enrichments(summary, regulatory_action_type, deadline)
    `)
    .gte("published_date", start.toISOString().slice(0, 10))
    .lte("published_date", end.toISOString().slice(0, 10))
    .not("item_enrichments", "is", null)
    .order("published_date", { ascending: false });

  // Bridge stats: count monitored products and products with recent verdicts
  const { count: totalProducts } = await adminClient
    .from("subscriber_products")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: productsWithVerdicts } = await adminClient
    .from("product_match_verdicts")
    .select("product_id", { count: "exact", head: true })
    .eq("relevant", true)
    .gte("evaluated_at", start.toISOString());

  const enrichedItems = (items ?? []).map((item) => {
    const e = Array.isArray(item.item_enrichments)
      ? item.item_enrichments[0]
      : item.item_enrichments;
    return {
      title: item.title,
      item_type: item.item_type,
      published_date: item.published_date,
      source_url: item.source_url,
      summary: e?.summary ?? null,
      regulatory_action_type: e?.regulatory_action_type ?? null,
      deadline: e?.deadline ?? null,
    };
  });

  return {
    items: enrichedItems,
    period: {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    },
    total_items: enrichedItems.length,
    bridge: {
      total_monitored_products: totalProducts ?? 0,
      products_with_action_items: productsWithVerdicts ?? 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Store sent briefing content (evidence trail)
// ---------------------------------------------------------------------------

export async function createCampaign(params: {
  campaign_type: "weekly_free" | "weekly_paid" | "product_alert" | "urgent_alert";
  subscriber_id?: string;
  subject_line: string;
  html_content: string;
  period_start?: string;
  period_end?: string;
  recipient_count: number;
}): Promise<string | null> {
  const { data, error } = await adminClient
    .from("email_campaigns")
    .insert({
      campaign_type: params.campaign_type,
      subscriber_id: params.subscriber_id ?? null,
      subject_line: params.subject_line,
      html_content: params.html_content,
      period_start: params.period_start ?? null,
      period_end: params.period_end ?? null,
      recipient_count: params.recipient_count,
      status: "sending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[email-queries] createCampaign error:", error);
    return null;
  }

  return data.id;
}

export async function recordEmailSend(params: {
  campaign_id: string;
  subscriber_id: string;
  provider_message_id?: string;
  status: "queued" | "sent" | "delivered" | "bounced" | "complained";
}): Promise<void> {
  const { error } = await adminClient.from("email_sends").insert({
    campaign_id: params.campaign_id,
    subscriber_id: params.subscriber_id,
    provider_message_id: params.provider_message_id ?? null,
    status: params.status,
    sent_at: params.status === "sent" ? new Date().toISOString() : null,
  });

  if (error) {
    console.error("[email-queries] recordEmailSend error:", error);
  }
}

export async function updateCampaignStatus(
  campaignId: string,
  status: "sent" | "failed"
): Promise<void> {
  const { error } = await adminClient
    .from("email_campaigns")
    .update({
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", campaignId);

  if (error) {
    console.error("[email-queries] updateCampaignStatus error:", error);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchToBriefingItem(m: ProductMatch): BriefingItem {
  const ls = getLifecycleState({
    item_type: m.item_type,
    published_date: m.published_date,
    deadline: m.deadline,
  });

  return {
    item_id: m.item_id,
    title: m.title,
    item_type: m.item_type,
    published_date: m.published_date,
    source_url: m.source_url,
    summary: m.summary,
    regulatory_action_type: m.regulatory_action_type,
    deadline: m.deadline,
    action_items: null, // filled by compiler from enrichment raw_response
    regulations_cited: null,
    relevance: m.relevance,
    lifecycle_state: ls,
    matched_products: m.matched_products,
  };
}
