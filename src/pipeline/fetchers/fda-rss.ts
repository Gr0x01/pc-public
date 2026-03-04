import type { SupabaseClient } from "@supabase/supabase-js";
import { XMLParser } from "fast-xml-parser";
import type { FetcherResult } from "./utils";
import { sleep, logPipelineRun } from "./utils";
import { RssItemSchema } from "./schemas/rss";

// ---------------------------------------------------------------------------
// Feed configuration
// ---------------------------------------------------------------------------

const FDA_RSS_BASE = "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/";

const RSS_FEEDS: Array<{ path: string; itemType: string }> = [
  { path: "recalls/rss.xml", itemType: "recall" },
  { path: "food-safety-recalls/rss.xml", itemType: "recall" },
  { path: "medwatch/rss.xml", itemType: "safety_alert" },
  { path: "press-releases/rss.xml", itemType: "press_release" },
  { path: "tainted-dietary-supplements/rss.xml", itemType: "safety_alert" },
  { path: "health-fraud/rss.xml", itemType: "safety_alert" },
  { path: "food-allergies/rss.xml", itemType: "safety_alert" },
  { path: "fda-outbreaks/rss.xml", itemType: "safety_alert" },
];

/** Delay between feed fetches (ms) */
const FEED_DELAY_MS = 300;

// ---------------------------------------------------------------------------
// XML parser
// ---------------------------------------------------------------------------

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  allowBooleanAttributes: true,
  // Ensure text content of mixed nodes is captured
  textNodeName: "#text",
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a pubDate string to ISO date.
 * Returns null if the date is absent or unparseable — caller falls back to today.
 */
function parsePubDate(raw: string | undefined): string | null {
  if (!raw) return null;

  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  } catch {
    // fall through
  }

  console.warn(`[RSS] Could not parse pubDate: "${raw}"`);
  return null;
}

/**
 * Normalise the `item` field from parsed XML — may be a single object or array.
 */
function normaliseItems(raw: unknown): unknown[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return [raw];
}

/** Strip basic HTML tags from a string (descriptions often include HTML) */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

/**
 * Polls 8 FDA RSS feeds and upserts items into `regulatory_items`.
 *
 * RSS feeds only expose recent items — no backfill mode.
 * Feeds that 404 or error are skipped with a warning; the run continues.
 * One `pipeline_runs` entry is logged after all feeds are polled.
 */
export async function fetchFdaRss(
  supabase: SupabaseClient
): Promise<FetcherResult> {
  // RSS has no backfill concept — always polls for new items
  const mode = "incremental" as const;

  const startedAt = new Date();
  let fetched = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  // 1. Look up source_id
  const { data: sourceRow, error: sourceError } = await supabase
    .from("sources")
    .select("id")
    .eq("name", "fda_rss")
    .single();

  if (sourceError || !sourceRow) {
    throw new Error(
      `Could not find source 'fda_rss': ${sourceError?.message ?? "no row returned"}`
    );
  }
  const sourceId = sourceRow.id as string;

  // 2. Process each feed
  for (let i = 0; i < RSS_FEEDS.length; i++) {
    const feed = RSS_FEEDS[i]!;
    const feedUrl = `${FDA_RSS_BASE}${feed.path}`;

    if (i > 0) await sleep(FEED_DELAY_MS);

    console.log(`[RSS] Polling: ${feedUrl}`);

    let xmlText: string;
    try {
      const res = await fetch(feedUrl, { headers: { Accept: "application/rss+xml, application/xml, text/xml" } });
      if (!res.ok) {
        console.warn(`[RSS] ${feedUrl} → ${res.status} ${res.statusText} — skipping`);
        continue;
      }
      xmlText = await res.text();
    } catch (err) {
      console.warn(`[RSS] Network error fetching ${feedUrl}:`, err);
      continue;
    }

    // Parse XML
    let parsedXml: Record<string, unknown>;
    try {
      parsedXml = xmlParser.parse(xmlText) as Record<string, unknown>;
    } catch (err) {
      console.warn(`[RSS] XML parse error for ${feedUrl}:`, err);
      errors++;
      continue;
    }

    // Navigate to items: rss.channel.item
    const rss = parsedXml["rss"] as Record<string, unknown> | undefined;
    const channel = rss?.["channel"] as Record<string, unknown> | undefined;
    if (!channel) {
      console.warn(`[RSS] No rss.channel found in ${feedUrl}`);
      errors++;
      continue;
    }

    const rawItems = normaliseItems(channel["item"]);
    console.log(`[RSS] ${feed.path} → ${rawItems.length} items`);
    fetched += rawItems.length;

    for (const rawItem of rawItems) {
      const parsed = RssItemSchema.safeParse(rawItem);
      if (!parsed.success) {
        console.warn(`[RSS] Item parse error in ${feed.path}:`, parsed.error.message);
        errors++;
        continue;
      }

      const item = parsed.data;

      // Resolve source_ref: prefer guid text, fall back to link
      let sourceRef = item.link;
      if (item.guid) {
        if (typeof item.guid === "string") {
          sourceRef = item.guid || item.link;
        } else {
          sourceRef = item.guid["#text"] || item.link;
        }
      }

      if (!sourceRef) {
        console.warn(`[RSS] Item in ${feed.path} has no link or guid — skipping`);
        errors++;
        continue;
      }

      const publishedDate = parsePubDate(item.pubDate) ?? new Date().toISOString().split("T")[0];
      const rawContent = item.description ? stripHtml(item.description) : null;

      const itemRow = {
        source_id: sourceId,
        source_ref: sourceRef,
        title: (item.title ?? "").slice(0, 500),
        item_type: feed.itemType,
        jurisdiction: "federal" as const,
        published_date: publishedDate,
        raw_content: rawContent,
        source_url: item.link,
        processing_status: "ok" as const,
      };

      const { error: insertError } = await supabase
        .from("regulatory_items")
        .insert(itemRow);

      if (insertError) {
        if (insertError.code === "23505") {
          skipped++;
        } else {
          console.error(`[RSS] Insert error for ${sourceRef}:`, insertError.message);
          errors++;
        }
        continue;
      }

      created++;
    }
  }

  // 3. Log one pipeline_runs entry covering all feeds
  const overallStatus: "success" | "partial" | "failed" =
    errors > 0 && created === 0 ? "failed"
    : errors > 0 ? "partial"
    : "success";

  await logPipelineRun(supabase, {
    source_id: sourceId,
    run_type: "rss-poll",
    status: overallStatus,
    items_fetched: fetched,
    items_created: created,
    items_skipped: skipped,
    error_message: errors > 0 ? `${errors} errors across feeds` : undefined,
    started_at: startedAt,
  });

  return {
    source: "fda_rss",
    mode,
    fetched,
    created,
    skipped,
    errors,
    durationMs: Date.now() - startedAt.getTime(),
  };
}
