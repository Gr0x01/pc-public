import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { geminiFlash } from "@/lib/ai/gemini";
import { adminClient } from "@/lib/supabase/admin";
import { trackLLM } from "@/lib/analytics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShowcaseItem {
  item_id: string;
  title: string;
  item_type: string;
  company_name: string | null;
  source_url: string | null;
  published_date: string;
  summary: string;
  affected_ingredients: string[];
  affected_product_categories: string[];
  affected_regulations: string[];
  deadline: string | null;
  key_entities: string[];
}

export interface WeeklySnapshot {
  id: string;
  week_start: string;
  week_end: string;
  narrative: string;
  sector_counts: Record<string, number>;
  total_items: number;
  total_sectors: number;
  total_substances_flagged: number;
  total_deadlines: number;
  showcase_items: ShowcaseItem[];
}

// ---------------------------------------------------------------------------
// Fetch latest snapshot (for homepage server component)
// ---------------------------------------------------------------------------

export async function getLatestSnapshot(): Promise<WeeklySnapshot | null> {
  const { data, error } = await adminClient
    .from("weekly_intelligence_snapshots")
    .select("*")
    .order("week_start", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    week_start: data.week_start,
    week_end: data.week_end,
    narrative: data.narrative,
    sector_counts: data.sector_counts as Record<string, number>,
    total_items: data.total_items,
    total_sectors: data.total_sectors,
    total_substances_flagged: data.total_substances_flagged,
    total_deadlines: data.total_deadlines,
    showcase_items: data.showcase_items as ShowcaseItem[],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ItemSummary {
  id: string;
  title: string;
  item_type: string;
  company: string | null;
  source_url: string | null;
  published_date: string;
  summary: string;
  affected_ingredients: string[];
  affected_product_categories: string[];
  affected_regulations: string[];
  deadline: string | null;
  key_entities: string[];
  sectors: string[];
}

function itemToShowcase(i: ItemSummary): ShowcaseItem {
  return {
    item_id: i.id,
    title: i.title,
    item_type: i.item_type,
    company_name: i.company,
    source_url: i.source_url,
    published_date: i.published_date,
    summary: i.summary,
    affected_ingredients: i.affected_ingredients,
    affected_product_categories: i.affected_product_categories,
    affected_regulations: i.affected_regulations,
    deadline: i.deadline,
    key_entities: i.key_entities,
  };
}

// ---------------------------------------------------------------------------
// Generate weekly snapshot (called by Inngest cron on Fridays)
// ---------------------------------------------------------------------------

export async function generateWeeklySnapshot(
  weekStart?: Date,
  weekEnd?: Date,
): Promise<WeeklySnapshot> {
  // Default to most recent Mon-Fri
  const now = new Date();
  if (!weekEnd) {
    // Find last Friday (or today if Friday)
    const day = now.getDay();
    const daysToFri = day >= 5 ? day - 5 : day + 2;
    weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - daysToFri);
  }
  if (!weekStart) {
    weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 4); // Monday
  }

  const startStr = weekStart.toISOString().slice(0, 10);
  const endStr = weekEnd.toISOString().slice(0, 10);

  // 1. Fetch all enriched items for the week
  const { data: items } = await adminClient
    .from("regulatory_items")
    .select(`
      id, title, item_type, published_date, source_url,
      enforcement_company_name,
      item_enrichments(summary, deadline, raw_response)
    `)
    .gte("published_date", startStr)
    .lte("published_date", endStr)
    .eq("processing_status", "enriched")
    .not("item_enrichments", "is", null)
    .order("published_date", { ascending: false });

  if (!items || items.length === 0) {
    throw new Error(`No enriched items found for week ${startStr} to ${endStr}`);
  }

  // 2. Get sector counts via enrichment tags
  const itemIds = items.map((i) => i.id);
  const { data: tags } = await adminClient
    .from("item_enrichment_tags")
    .select("item_id, tag_value")
    .eq("tag_dimension", "product_type")
    .in("item_id", itemIds);

  // Look up sectors from product_categories
  const uniqueSlugs = [...new Set((tags ?? []).map((t) => t.tag_value))];
  const { data: categories } = await adminClient
    .from("product_categories")
    .select("slug, sector")
    .in("slug", uniqueSlugs);

  const slugToSector = new Map(
    (categories ?? []).map((c) => [c.slug, c.sector as string])
  );

  // Count sectors
  const sectorCounts: Record<string, number> = {};
  const itemSectors = new Map<string, Set<string>>();

  for (const tag of tags ?? []) {
    const sector = slugToSector.get(tag.tag_value);
    if (!sector) continue;
    if (!itemSectors.has(tag.item_id)) itemSectors.set(tag.item_id, new Set());
    itemSectors.get(tag.item_id)!.add(sector);
  }

  // Count unique items per sector
  const sectorItems = new Map<string, Set<string>>();
  for (const [itemId, sectors] of itemSectors) {
    for (const sector of sectors) {
      if (!sectorItems.has(sector)) sectorItems.set(sector, new Set());
      sectorItems.get(sector)!.add(itemId);
    }
  }
  for (const [sector, itemSet] of sectorItems) {
    sectorCounts[sector] = itemSet.size;
  }

  // 3. Count substances flagged
  const substanceFlaggedItems = new Set<string>();
  for (const item of items) {
    const enrichment = Array.isArray(item.item_enrichments)
      ? item.item_enrichments[0]
      : item.item_enrichments;
    if (!enrichment?.raw_response) continue;
    const raw = enrichment.raw_response as Record<string, unknown>;
    const ingredients = raw.affected_ingredients as string[] | undefined;
    if (ingredients && ingredients.length > 0) {
      substanceFlaggedItems.add(item.id);
    }
  }

  // Count items with deadlines
  let deadlineCount = 0;
  for (const item of items) {
    const enrichment = Array.isArray(item.item_enrichments)
      ? item.item_enrichments[0]
      : item.item_enrichments;
    if (enrichment?.deadline) deadlineCount++;
  }

  // 4. Build item summaries for the LLM prompt
  const itemSummaries = items.map((item) => {
    const enrichment = Array.isArray(item.item_enrichments)
      ? item.item_enrichments[0]
      : item.item_enrichments;
    const raw = (enrichment?.raw_response as Record<string, unknown>) ?? {};

    return {
      id: item.id,
      title: item.title,
      item_type: item.item_type,
      company: item.enforcement_company_name ?? null,
      source_url: item.source_url,
      published_date: item.published_date,
      summary: (enrichment?.summary as string) ?? "",
      affected_ingredients: (raw.affected_ingredients as string[]) ?? [],
      affected_product_categories:
        (raw.affected_product_categories as string[]) ?? [],
      affected_regulations: (raw.affected_regulations as string[]) ?? [],
      deadline: (enrichment?.deadline as string) ?? null,
      key_entities: (raw.key_entities as string[]) ?? [],
      sectors: [...(itemSectors.get(item.id) ?? [])],
    };
  });

  // 5. Call LLM to synthesize
  const sectorSummary = Object.entries(sectorCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([s, c]) => `${s}: ${c}`)
    .join(", ");

  // Build a lookup of index -> id for the LLM to reference
  const indexToId = new Map(itemSummaries.map((i, idx) => [idx + 1, i.id]));

  const ShowcaseItemSchema = z.object({
    item_index: z.number().describe("The [N] index number of the selected item from the list above"),
    reasoning: z
      .string()
      .describe("Why this item was selected as a showcase (not shown to users)"),
  });

  const OutputSchema = z.object({
    narrative: z
      .string()
      .describe(
        "2-3 sentence intelligence briefing synthesis. Lead with the dominant signal. Name specific companies and substances."
      ),
    showcase_items: z
      .array(ShowcaseItemSchema)
      .length(5)
      .describe(
        "Exactly 5 items by their [N] index number. Must span at least 2 sectors."
      ),
  });

  const { object: synthesis } = await trackLLM(null, "weekly_snapshot", "gemini-flash", () =>
    generateObject({
      model: geminiFlash,
      schema: OutputSchema,
    system: `You are the analytical voice of Policy Canary — a regulatory intelligence service for FDA-regulated product companies. You are writing a 2-3 sentence weekly synthesis of FDA activity for professionals: quality directors, regulatory leads, and founders of supplement, food, cosmetics, pharmaceutical, and device companies.

VOICE:
- You are an analyst delivering an intelligence briefing, not a journalist writing a newsletter
- Start with the substance. No preamble ("This week..." / "The FDA this week..."). Lead with the dominant signal
- Name specific companies, specific substances, specific regulation numbers when relevant
- Short declarative sentences. Under 25 words each when possible
- Calm, precise, authoritative. Never alarmist. Never breathless

CONTENT RULES:
- State the week's dominant enforcement or regulatory signal in sentence one
- Connect secondary actions to the sectors that should care in sentence two
- If a genuine pattern is visible across multiple actions, note it — but only if evidence supports it
- Include specific counts only when meaningful (30 simultaneous warning letters is meaningful; "12 actions this week" is not)

NEVER:
- Use "AI-powered," "comprehensive," "cutting-edge," or marketing language
- Use exclamation marks
- Editorialize about FDA competence or political context
- Speculate about future enforcement without evidence
- Use phrases like "stay tuned," "watch this space," "remains to be seen"
- Say "your products" or "your business" — this is a public homepage, not a personalized briefing
- Describe actions as "significant" or "notable"
- Pad with filler. A quiet week is one sentence: "A light week across FDA sectors, with routine administrative actions and no major enforcement signals."

SHOWCASE ITEM SELECTION:
- Select exactly 3 items that demonstrate enrichment depth (substance names, product categories, clear regulatory implications)
- Items MUST span at least 2 different FDA sectors
- Prioritize items with: named companies, named substances/ingredients, specific deadlines, clear action implications
- Prefer recalls, warning letters, and safety alerts over routine notices
- Do not select routine administrative notices unless the week is genuinely quiet`,
    prompt: `Synthesize the following FDA activity for the week of ${startStr} to ${endStr}.

Total items: ${items.length}
Sector breakdown: ${sectorSummary}
Items with substance flags: ${substanceFlaggedItems.size}
Items with deadlines: ${deadlineCount}

Here are all ${items.length} items (summarized):

${itemSummaries
  .map(
    (i, idx) =>
      `[${idx + 1}] ID: ${i.id}
  Type: ${i.item_type}
  Title: ${i.title}
  Company: ${i.company ?? "N/A"}
  Sectors: ${i.sectors.join(", ") || "unclassified"}
  Ingredients: ${i.affected_ingredients.join(", ") || "none"}
  Categories: ${i.affected_product_categories.join(", ") || "none"}
  Deadline: ${i.deadline ?? "none"}
  Summary: ${i.summary.slice(0, 200)}...`
  )
  .join("\n\n")}

Write the narrative synthesis and select 5 showcase items.`,
    }),
    { item_count: items.length }
  );

  // 6. Build showcase items from the LLM's selections (by index)
  const selectedIds = new Set<string>();
  for (const pick of synthesis.showcase_items) {
    const id = indexToId.get(pick.item_index);
    if (id) selectedIds.add(id);
  }

  let showcaseItems: ShowcaseItem[] = itemSummaries
    .filter((i) => selectedIds.has(i.id))
    .map(itemToShowcase);

  // Fallback: if LLM picks didn't resolve to 5, fill from best candidates
  if (showcaseItems.length < 5) {
    const preferredTypes = new Set(["recall", "warning_letter", "safety_alert"]);
    const fallbacks = itemSummaries
      .filter((i) => !selectedIds.has(i.id))
      .sort((a, b) => {
        const aScore = (preferredTypes.has(a.item_type) ? 10 : 0) + a.affected_ingredients.length;
        const bScore = (preferredTypes.has(b.item_type) ? 10 : 0) + b.affected_ingredients.length;
        return bScore - aScore;
      });
    for (const fb of fallbacks) {
      if (showcaseItems.length >= 5) break;
      showcaseItems.push(itemToShowcase(fb));
    }
  }

  // 7. Upsert to DB
  const row = {
    week_start: startStr,
    week_end: endStr,
    narrative: synthesis.narrative,
    sector_counts: sectorCounts,
    total_items: items.length,
    total_sectors: Object.keys(sectorCounts).length,
    total_substances_flagged: substanceFlaggedItems.size,
    total_deadlines: deadlineCount,
    showcase_items: showcaseItems,
    model: "gemini-2.5-flash",
  };

  const { data: inserted, error } = await adminClient
    .from("weekly_intelligence_snapshots")
    .upsert(row, { onConflict: "week_start" })
    .select()
    .single();

  if (error) throw new Error(`Failed to save snapshot: ${error.message}`);

  return {
    id: inserted.id,
    week_start: inserted.week_start,
    week_end: inserted.week_end,
    narrative: inserted.narrative,
    sector_counts: inserted.sector_counts as Record<string, number>,
    total_items: inserted.total_items,
    total_sectors: inserted.total_sectors,
    total_substances_flagged: inserted.total_substances_flagged,
    total_deadlines: inserted.total_deadlines,
    showcase_items: inserted.showcase_items as ShowcaseItem[],
  };
}
