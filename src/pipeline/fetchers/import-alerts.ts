import type { SupabaseClient } from "@supabase/supabase-js";
import type { FetcherResult } from "./utils";
import { sleep, logPipelineRun, extractMainContent } from "./utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IA_LIST_URL = "https://www.accessdata.fda.gov/cms_ia/ialist.html";
const IA_BASE_URL = "https://www.accessdata.fda.gov/cms_ia/";

/** Delay between individual alert page fetches (ms) */
const PAGE_FETCH_DELAY_MS = 200;

// ---------------------------------------------------------------------------
// HTML parsing helpers
// ---------------------------------------------------------------------------

interface ImportAlertRow {
  alertNumber: string;
  title: string;
  publishDate: string | null;
  detailPath: string;
}

/**
 * Parse the import alerts listing page HTML table.
 * Columns: [0] Alert Number (plain text), [1] Type (e.g. "DWPE"),
 *          [2] Publish Date (MM/DD/YYYY), [3] Alert Name/Title (with <a href> link)
 */
function parseListingPage(html: string): ImportAlertRow[] {
  const rows: ImportAlertRow[] = [];

  // Match table rows — each <tr> contains <td> cells
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const rowHtml = trMatch[1];
    // Extract all <td> contents
    const tds: string[] = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch;
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      tds.push(tdMatch[1].trim());
    }

    // Need at least 4 columns: number, type, date, title
    if (tds.length < 4) continue;

    // Column 0: Alert number (plain text, e.g. "16-131")
    const alertNumber = tds[0].replace(/<[^>]+>/g, "").trim();
    if (!alertNumber || !/^\d{2}-\d+/.test(alertNumber)) continue;

    // Column 2: Publish date (MM/DD/YYYY)
    const dateText = tds[2].replace(/<[^>]+>/g, "").trim();
    const publishDate = parseImportAlertDate(dateText);

    // Column 3: Title with link (e.g. <a href="importalert_3.html">Title</a>)
    const linkMatch = tds[3].match(/href="([^"]+)"/i);
    if (!linkMatch) continue;
    const detailPath = linkMatch[1];
    const title = tds[3].replace(/<[^>]+>/g, "").replace(/^[""]|[""]$/g, "").trim();

    rows.push({ alertNumber, title, publishDate, detailPath });
  }

  return rows;
}

/**
 * Parse dates in various formats found on FDA import alert pages.
 * Handles: "January 2024", "01/15/2024", "2024-01-15", "Jan 15, 2024"
 */
function parseImportAlertDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // MM/DD/YYYY
  const mdyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, mm, dd, yyyy] = mdyMatch;
    const d = new Date(`${yyyy}-${mm!.padStart(2, "0")}-${dd!.padStart(2, "0")}`);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  // "Month DD, YYYY" or "Month YYYY"
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];

  return null;
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

/**
 * Fetches FDA import alerts from the listing page, then scrapes each
 * individual alert page for full content.
 *
 * Backfill: fetches all ~156 alerts
 * Incremental: fetches listing, skips known source_refs
 */
export async function fetchImportAlerts(
  supabase: SupabaseClient,
  params: { mode: "backfill" | "incremental" }
): Promise<FetcherResult> {
  const startedAt = new Date();
  let fetched = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  // 1. Look up source_id
  const { data: sourceRow, error: sourceError } = await supabase
    .from("sources")
    .select("id")
    .eq("name", "import_alerts")
    .single();

  if (sourceError || !sourceRow) {
    throw new Error(
      `Could not find source 'import_alerts': ${sourceError?.message ?? "no row returned"}`
    );
  }
  const sourceId = sourceRow.id as string;

  // 2. Fetch listing page
  console.log(`[IA] Fetching listing page...`);
  const listRes = await fetch(IA_LIST_URL, { headers: { Accept: "text/html" } });
  if (!listRes.ok) {
    throw new Error(`[IA] Listing page fetch failed: ${listRes.status} ${listRes.statusText}`);
  }
  const listHtml = await listRes.text();
  const alertRows = parseListingPage(listHtml);
  console.log(`[IA] Found ${alertRows.length} alerts on listing page`);

  if (alertRows.length === 0) {
    console.warn("[IA] No alerts parsed from listing page — HTML structure may have changed");
  }

  // 3. Batch load known source_refs for dedup (avoids N+1 queries)
  const { data: existingRefs } = await supabase
    .from("regulatory_items")
    .select("source_ref")
    .eq("source_id", sourceId);
  const knownRefs = new Set(existingRefs?.map((r) => r.source_ref) ?? []);

  // 4. Process each alert
  for (const row of alertRows) {
    fetched++;

    // Dedup check against batch-loaded refs
    if (knownRefs.has(row.alertNumber)) {
      skipped++;
      continue;
    }

    // Skip items with no parseable date BEFORE fetching the page — don't waste HTTP requests
    if (!row.publishDate) {
      console.warn(`[IA] No parseable date for alert ${row.alertNumber}, skipping`);
      errors++;
      continue;
    }

    // Fetch individual alert page for full content
    const alertUrl = row.detailPath.startsWith("http")
      ? row.detailPath
      : `${IA_BASE_URL}${row.detailPath.replace(/^\/?(cms_ia\/)?/, "")}`;

    let rawContent = "";
    let processingStatus: "ok" | "incomplete_source" = "ok";

    try {
      await sleep(PAGE_FETCH_DELAY_MS);
      const pageRes = await fetch(alertUrl, { headers: { Accept: "text/html" } });

      if (!pageRes.ok) {
        console.warn(`[IA] Alert page ${alertUrl} → ${pageRes.status}`);
        processingStatus = "incomplete_source";
      } else {
        const html = await pageRes.text();
        rawContent = extractMainContent(html);
      }
    } catch (err) {
      console.warn(`[IA] Error fetching alert page ${alertUrl}:`, err);
      processingStatus = "incomplete_source";
    }

    // Build title: "Import Alert 16-131 — Title Here"
    const title = `Import Alert ${row.alertNumber} — ${row.title}`.slice(0, 500);

    const itemRow = {
      source_id: sourceId,
      source_ref: row.alertNumber,
      title,
      item_type: "import_alert" as const,
      jurisdiction: "federal" as const,
      published_date: row.publishDate,
      issuing_office: "ORA",
      raw_content: rawContent || null,
      source_url: alertUrl,
      processing_status: processingStatus,
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
      console.error(`[IA] Insert error for ${row.alertNumber}:`, insertError.message);
      errors++;
      continue;
    }

    created++;
  }

  // Log pipeline run
  const status: "success" | "partial" | "failed" = errors > 0 ? "partial" : "success";
  await logPipelineRun(supabase, {
    source_id: sourceId,
    run_type: `ia-${params.mode}`,
    status,
    items_fetched: fetched,
    items_created: created,
    items_skipped: skipped,
    error_message: errors > 0 ? `${errors} errors during ${params.mode}` : undefined,
    started_at: startedAt,
  });

  console.log(
    `[IA] Done — fetched: ${fetched}, created: ${created}, skipped: ${skipped}, errors: ${errors}`
  );

  return {
    source: "import_alerts",
    mode: params.mode,
    fetched,
    created,
    skipped,
    errors,
    durationMs: Date.now() - startedAt.getTime(),
  };
}
