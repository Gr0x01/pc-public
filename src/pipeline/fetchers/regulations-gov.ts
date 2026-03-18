import type { SupabaseClient } from "@supabase/supabase-js";
import type { FetcherResult } from "./utils";
import { sleep, logPipelineRun, dateWindowsFor } from "./utils";
import { RegulationsGovResponseSchema, type RegulationsGovDocument } from "./schemas/regulations-gov";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = "https://api.regulations.gov/v4/documents";

/** Max results per page (API max is 250) */
const PAGE_SIZE = 250;

/** Max pages before hitting 5K result cap (250 × 20 = 5000) */
const MAX_PAGES = 20;

/** Delay between API requests (ms) — conservative to stay under 1K/hr */
const REQUEST_DELAY_MS = 4000;

/** Max retries on 429 or transient errors */
const MAX_RETRIES = 3;

/**
 * FR document types to skip — heuristic dedup against Federal Register fetcher.
 * Documents with a frDocNum AND one of these types are overwhelmingly likely to
 * already exist via the FR fetcher. Not a guaranteed 1:1 match (FR fetcher uses
 * fr_citation, not frDocNum), but a pragmatic filter that avoids most duplicates.
 */
const FR_DEDUP_TYPES = new Set(["Rule", "Proposed Rule", "Notice"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map Regulations.gov documentType to our item_type.
 */
function classifyDocType(docType: string | null | undefined): "rule" | "proposed_rule" | "notice" {
  if (!docType) return "notice";
  const normalized = docType.toLowerCase();
  if (normalized === "rule") return "rule";
  if (normalized === "proposed rule") return "proposed_rule";
  return "notice";
}

/**
 * Parse an ISO date string to YYYY-MM-DD.
 */
function parseIsoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

/**
 * Fetch with retry and exponential backoff for 429s.
 * API key passed via X-Api-Key header (not query string) to avoid log exposure.
 */
async function fetchWithRetry(url: string, apiKey: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.api+json",
        "X-Api-Key": apiKey,
      },
    });

    if (res.status === 429) {
      if (attempt === retries) {
        throw new Error(`Rate limited after ${retries + 1} attempts`);
      }
      const backoff = Math.pow(2, attempt + 1) * 5000; // 10s, 20s, 40s
      console.warn(`[REGS] 429 rate limited, backing off ${backoff}ms (attempt ${attempt + 1})`);
      await sleep(backoff);
      continue;
    }

    if (!res.ok) {
      throw new Error(`API request failed: ${res.status} ${res.statusText}`);
    }

    return res;
  }

  throw new Error("Unreachable");
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

/**
 * Fetches FDA documents from Regulations.gov API v4.
 *
 * Backfill: uses 1-month date windows between startDate and endDate
 * Incremental: last 14 days
 *
 * Skips documents that are already in Federal Register (FR dedup).
 */
export async function fetchRegulationsGov(
  supabase: SupabaseClient,
  params: {
    mode: "backfill" | "incremental";
    startDate?: string;
    endDate?: string;
  }
): Promise<FetcherResult> {
  const startedAt = new Date();
  let fetched = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  const apiKey = process.env.REGULATIONS_GOV_API_KEY;
  if (!apiKey) {
    throw new Error("Missing REGULATIONS_GOV_API_KEY environment variable");
  }

  // 1. Look up source_id
  const { data: sourceRow, error: sourceError } = await supabase
    .from("sources")
    .select("id")
    .eq("name", "regulations_gov")
    .single();

  if (sourceError || !sourceRow) {
    throw new Error(
      `Could not find source 'regulations_gov': ${sourceError?.message ?? "no row returned"}`
    );
  }
  const sourceId = sourceRow.id as string;

  // 2. Determine date range
  let start: Date;
  let end: Date;

  if (params.mode === "incremental") {
    end = new Date();
    start = new Date();
    start.setDate(start.getDate() - 14);
  } else {
    start = new Date(params.startDate ?? "2025-01-01");
    end = new Date(params.endDate ?? new Date().toISOString().split("T")[0]);
  }

  // 3. Create 1-month windows
  const windows = dateWindowsFor(start, end, 1);
  console.log(`[REGS] Processing ${windows.length} date window(s) from ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}`);

  for (const window of windows) {
    const fromStr = window.from.toISOString().split("T")[0];
    const toStr = window.to.toISOString().split("T")[0];
    console.log(`[REGS] Window: ${fromStr} → ${toStr}`);

    let page = 1;
    let hasMore = true;

    while (hasMore && page <= MAX_PAGES) {
      const url =
        `${API_BASE}?filter[agencyId]=FDA` +
        `&filter[postedDate][ge]=${fromStr}` +
        `&filter[postedDate][le]=${toStr}` +
        `&page[size]=${PAGE_SIZE}` +
        `&page[number]=${page}` +
        `&sort=-postedDate`;

      let docs: RegulationsGovDocument[] = [];

      try {
        await sleep(REQUEST_DELAY_MS);
        const res = await fetchWithRetry(url, apiKey);
        const raw = await res.json();
        const parsed = RegulationsGovResponseSchema.safeParse(raw);

        if (!parsed.success) {
          console.error(`[REGS] Parse error page ${page}:`, parsed.error.message);
          errors++;
          break;
        }

        docs = parsed.data.data;
        hasMore = parsed.data.meta?.hasNextPage ?? docs.length === PAGE_SIZE;
      } catch (err) {
        console.error(`[REGS] Fetch error page ${page}:`, err);
        errors++;
        break;
      }

      if (docs.length === 0) break;

      fetched += docs.length;

      // Batch dedup: check all source_refs for this page in one query
      const candidateRefs = docs
        .filter((d) => !(d.attributes.frDocNum && FR_DEDUP_TYPES.has(d.attributes.documentType ?? "")))
        .map((d) => d.id);
      const frDedupCount = docs.length - candidateRefs.length;
      skipped += frDedupCount;

      const existingRefs = new Set<string>();
      if (candidateRefs.length > 0) {
        const { data: existingRows } = await supabase
          .from("regulatory_items")
          .select("source_ref")
          .eq("source_id", sourceId)
          .in("source_ref", candidateRefs);
        for (const row of existingRows ?? []) {
          existingRefs.add(row.source_ref);
        }
      }

      for (const doc of docs) {
        const attrs = doc.attributes;

        // FR dedup: skip if frDocNum exists and type is Rule/Proposed Rule/Notice
        if (attrs.frDocNum && FR_DEDUP_TYPES.has(attrs.documentType ?? "")) {
          continue; // already counted above
        }

        const sourceRef = doc.id;

        if (existingRefs.has(sourceRef)) {
          skipped++;
          continue;
        }

        const publishedDate = parseIsoDate(attrs.postedDate);
        if (!publishedDate) {
          console.warn(`[REGS] No valid date for ${sourceRef}`);
          errors++;
          continue;
        }

        const itemRow = {
          source_id: sourceId,
          source_ref: sourceRef,
          title: attrs.title.slice(0, 500),
          item_type: classifyDocType(attrs.documentType),
          jurisdiction: "federal" as const,
          published_date: publishedDate,
          comment_deadline: parseIsoDate(attrs.commentEndDate),
          docket_number: attrs.docketId ?? null,
          raw_content: attrs.highlightedContent ?? null,
          source_url: `https://www.regulations.gov/document/${sourceRef}`,
          processing_status: "ok" as const,
        };

        const { error: insertError } = await supabase
          .from("regulatory_items")
          .insert(itemRow)
          .select("id")
          .single();

        if (insertError) {
          if (insertError.code === "23505") {
            skipped++;
            continue;
          }
          console.error(`[REGS] Insert error for ${sourceRef}:`, insertError.message);
          errors++;
          continue;
        }

        created++;
      }

      console.log(
        `[REGS] Page ${page} — docs: ${docs.length}, running total: fetched=${fetched}, created=${created}, skipped=${skipped}`
      );

      page++;
    }

    if (page > MAX_PAGES) {
      const msg = `Hit ${MAX_PAGES}-page cap (5K results) for window ${fromStr}→${toStr}. Some results may be missing — narrow the date range.`;
      console.warn(`[REGS] ${msg}`);
      errors++;
    }
  }

  // Log pipeline run
  const status: "success" | "partial" | "failed" = errors > 0 ? "partial" : "success";
  await logPipelineRun(supabase, {
    source_id: sourceId,
    run_type: `regs-${params.mode}`,
    status,
    items_fetched: fetched,
    items_created: created,
    items_skipped: skipped,
    error_message: errors > 0 ? `${errors} errors during ${params.mode}` : undefined,
    started_at: startedAt,
  });

  console.log(
    `[REGS] Done — fetched: ${fetched}, created: ${created}, skipped: ${skipped}, errors: ${errors}`
  );

  return {
    source: "regulations_gov",
    mode: params.mode,
    fetched,
    created,
    skipped,
    errors,
    durationMs: Date.now() - startedAt.getTime(),
  };
}
