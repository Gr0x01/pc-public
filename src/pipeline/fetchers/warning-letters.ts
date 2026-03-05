import type { SupabaseClient } from "@supabase/supabase-js";
import type { FetcherResult } from "./utils";
import { sleep, logPipelineRun, stripHtml, extractMainContent } from "./utils";
import { WLAjaxResponseSchema } from "./schemas/warning-letters";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FDA_BASE = "https://www.fda.gov";
const WL_AJAX_BASE =
  `${FDA_BASE}/datatables/views/ajax` +
  `?view_name=warning_letter_solr_index` +
  `&view_display_id=warning_letter_solr_block`;

/** Delay between individual letter page fetches (ms) */
const PAGE_FETCH_DELAY_MS = 200;

/** Records per AJAX page */
const PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// HTML parsing helpers
// ---------------------------------------------------------------------------

/**
 * Extract href from the first <a> tag in an HTML string.
 * Only returns paths that start with "/" — rejects absolute URLs and
 * protocol-relative URLs to prevent SSRF if FDA AJAX data is ever unexpected.
 */
function extractHref(html: string): string | null {
  const match = html.match(/href="([^"]+)"/i);
  if (!match) return null;
  const href = match[1];
  // Only allow relative paths (FDA letter links are always /inspections/... etc.)
  if (!href.startsWith("/")) return null;
  return href;
}

/** Extract inner text from the first <a> tag in an HTML string */
function extractLinkText(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

/** Derive URL slug from the letter path (last path segment without extension) */
function slugFromPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? path;
  return last.replace(/\.[a-z]+$/i, "").slice(0, 100);
}

/**
 * Parse a date string (or <time> HTML element) to an ISO date string.
 * Handles:
 *   - <time datetime="2026-02-24T05:00:00Z">02/24/2026</time>
 *   - "01/15/2026" (MM/DD/YYYY)
 *   - "2026-01-15" (YYYY-MM-DD)
 * Returns null on failure.
 */
function parseWlDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Extract datetime attribute from <time datetime="..."> HTML
  const timeAttrMatch = trimmed.match(/datetime="([^"]+)"/i);
  if (timeAttrMatch) {
    const d = new Date(timeAttrMatch[1]);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  // Strip any remaining HTML tags and try the inner text
  const stripped = trimmed.replace(/<[^>]+>/g, "").trim();

  // MM/DD/YYYY
  const mdyMatch = stripped.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, mm, dd, yyyy] = mdyMatch;
    const d = new Date(`${yyyy}-${mm!.padStart(2, "0")}-${dd!.padStart(2, "0")}`);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(stripped)) {
    const d = new Date(stripped);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  return null;
}

/**
 * Extract MARCS-CMS number from raw letter HTML.
 * FDA letters typically contain "MARCS-CMS 123456789" or "MARCS-CMS #123456789".
 */
function extractMarcsNumber(html: string): string | null {
  const match = html.match(/MARCS-CMS[:\s#]*(\d{6,})/i);
  return match ? match[1] : null;
}


/**
 * Extract recipient name and title from the "Dear [Name]," salutation.
 * Returns { name, title } — either may be null.
 */
function extractRecipient(text: string): { name: string | null; title: string | null } {
  // Look for "Dear Dr. John Smith," or "Dear Ms. Jane Doe:" etc.
  const dearMatch = text.match(/Dear\s+([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+)*)[,:]?/);
  if (!dearMatch) return { name: null, title: null };

  const raw = dearMatch[1].trim();
  const titlePrefixes = ["Dr.", "Mr.", "Ms.", "Mrs.", "Prof."];
  for (const prefix of titlePrefixes) {
    if (raw.startsWith(prefix)) {
      return { name: raw.slice(prefix.length).trim() || null, title: prefix };
    }
  }
  return { name: raw, title: null };
}

/**
 * Attempt to extract a company address from lines near the top of the letter text.
 * This is heuristic — not all letters have a structured address block.
 */
function extractAddress(text: string): string | null {
  // Look for a short block of lines before "Dear " that look like address lines
  const dearIdx = text.indexOf("Dear ");
  if (dearIdx === -1) return null;

  const beforeDear = text.slice(0, dearIdx).trim();
  const lines = beforeDear
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Take the last 3–6 lines before "Dear" — usually address block
  const addressLines = lines.slice(-6).join("\n");
  return addressLines.length > 5 ? addressLines.slice(0, 300) : null;
}

/** Convert "Yes"/"No"/link HTML to boolean */
function parseYesNo(raw: string): boolean {
  const text = raw.replace(/<[^>]+>/g, "").trim().toLowerCase();
  return text === "yes" || text.includes("response");
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

/**
 * Fetches FDA warning letters via the DataTables AJAX endpoint, then scrapes
 * each letter's individual page for full text and MARCS-CMS number.
 *
 * Backfill: paginates all `recordsTotal` records
 * Incremental: pages from most recent, stops when an entire page is all known
 */
export async function fetchWarningLetters(
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
    .eq("name", "warning_letters")
    .single();

  if (sourceError || !sourceRow) {
    throw new Error(
      `Could not find source 'warning_letters': ${sourceError?.message ?? "no row returned"}`
    );
  }
  const sourceId = sourceRow.id as string;

  // 2. Paginate AJAX endpoint
  let start = 0;
  let totalRecords = Infinity;
  let batchStart = new Date();
  let batchFetched = 0;
  let batchCreated = 0;
  let batchSkipped = 0;
  let batchErrors = 0;

  outer: while (start < totalRecords) {
    const url = `${WL_AJAX_BASE}&start=${start}&length=${PAGE_SIZE}`;

    let pageData: ReturnType<typeof WLAjaxResponseSchema.parse> | null = null;

    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        throw new Error(`AJAX request failed: ${res.status} ${res.statusText}`);
      }
      const raw = await res.json();
      const parsed = WLAjaxResponseSchema.safeParse(raw);
      if (!parsed.success) {
        console.error(`[WL] AJAX parse error at start=${start}:`, parsed.error.message);
        batchErrors++;
        break;
      }
      pageData = parsed.data;
    } catch (err) {
      console.error(`[WL] AJAX fetch error at start=${start}:`, err);
      batchErrors++;
      break;
    }

    if (totalRecords === Infinity) {
      totalRecords = pageData.recordsTotal;
      console.log(`[WL] Total records: ${totalRecords}`);
    }

    const rows = pageData.data;
    if (rows.length === 0) break;

    fetched += rows.length;
    batchFetched += rows.length;

    // For incremental mode: stop when a full page contains no new records AND
    // no errors occurred (errors should not trigger early exit).
    let pageHadNewRecord = false;
    let pageErrorCount = 0;

    for (const row of rows) {
      // Validate column count — FDA DataTables has 7 columns
      if (row.length < 7) {
        console.warn(`[WL] Unexpected row length ${row.length}, skipping`);
        batchErrors++;
        pageErrorCount++;
        continue;
      }

      const postedDateRaw = row[0] ?? "";
      const issueDateRaw = row[1] ?? "";
      const companyHtml = row[2] ?? "";
      const issuingOffice = row[3] ?? "";
      const subject = row[4] ?? "";
      const responseLetterRaw = row[5] ?? "";
      const closeoutLetterRaw = row[6] ?? "";

      const letterPath = extractHref(companyHtml);
      if (!letterPath) {
        console.warn(`[WL] No href in company column: ${companyHtml.slice(0, 80)}`);
        batchErrors++;
        pageErrorCount++;
        continue;
      }

      const companyName = extractLinkText(companyHtml) || "Unknown Company";
      const slug = slugFromPath(letterPath);

      // Preliminary source_ref from URL slug
      let sourceRef = slug;

      const postedDate = parseWlDate(postedDateRaw);
      if (!postedDate) {
        console.warn(`[WL] Could not parse posted_date "${postedDateRaw}" for ${slug}`);
        batchErrors++;
        pageErrorCount++;
        continue;
      }

      // Quick dedup check against slug before fetching the letter page
      const { data: existingBySlug } = await supabase
        .from("regulatory_items")
        .select("id")
        .eq("source_id", sourceId)
        .eq("source_ref", slug)
        .maybeSingle();

      if (existingBySlug) {
        skipped++;
        batchSkipped++;
        continue;
      }

      // Fetch the individual letter page
      const letterUrl = `${FDA_BASE}${letterPath}`;
      let rawContent = "";
      let marcsNumber: string | null = null;
      let recipientName: string | null = null;
      let recipientTitle: string | null = null;
      let companyAddress: string | null = null;
      let processingStatus: "ok" | "incomplete_source" = "ok";

      try {
        await sleep(PAGE_FETCH_DELAY_MS);
        const pageRes = await fetch(letterUrl, {
          headers: { Accept: "text/html" },
        });

        if (!pageRes.ok) {
          console.warn(`[WL] Letter page ${letterUrl} → ${pageRes.status}`);
          processingStatus = "incomplete_source";
        } else {
          const html = await pageRes.text();
          marcsNumber = extractMarcsNumber(html);
          if (marcsNumber) {
            // Upgrade source_ref to MARCS-CMS number
            sourceRef = marcsNumber;

            // Re-check dedup with upgraded source_ref
            const { data: existingByMarcs } = await supabase
              .from("regulatory_items")
              .select("id")
              .eq("source_id", sourceId)
              .eq("source_ref", marcsNumber)
              .maybeSingle();

            if (existingByMarcs) {
              skipped++;
              batchSkipped++;
              continue;
            }
          }

          rawContent = extractMainContent(html);
          const recipient = extractRecipient(rawContent);
          recipientName = recipient.name;
          recipientTitle = recipient.title;
          companyAddress = extractAddress(rawContent);
        }
      } catch (err) {
        console.warn(`[WL] Error fetching letter page ${letterUrl}:`, err);
        processingStatus = "incomplete_source";
      }

      // Insert regulatory_items row
      const title = `${companyName} — ${subject}`.slice(0, 500);
      const issueDate = parseWlDate(issueDateRaw);

      const itemRow = {
        source_id: sourceId,
        source_ref: sourceRef,
        title,
        item_type: "warning_letter" as const,
        jurisdiction: "federal" as const,
        published_date: postedDate,
        effective_date: issueDate ?? null,
        issuing_office: issuingOffice || null,
        raw_content: rawContent || null,
        source_url: letterUrl,
        processing_status: processingStatus,
      };

      const { data: inserted, error: insertError } = await supabase
        .from("regulatory_items")
        .insert(itemRow)
        .select("id")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          skipped++;
          batchSkipped++;
          continue;
        }
        console.error(`[WL] regulatory_items insert error for ${sourceRef}:`, insertError.message);
        batchErrors++;
        errors++;
        pageErrorCount++;
        continue;
      }

      if (!inserted) {
        batchErrors++;
        errors++;
        pageErrorCount++;
        continue;
      }

      pageHadNewRecord = true;

      // Update enforcement fields on the regulatory_item
      const { error: enfError } = await supabase
        .from("regulatory_items")
        .update({
          enforcement_company_name: companyName,
          enforcement_company_address: companyAddress ?? null,
          enforcement_marcs_cms_number: marcsNumber ?? null,
          enforcement_recipient_name: recipientName ?? null,
          enforcement_recipient_title: recipientTitle ?? null,
          enforcement_response_received: parseYesNo(responseLetterRaw),
          enforcement_closeout: parseYesNo(closeoutLetterRaw),
        })
        .eq("id", inserted.id);

      if (enfError) {
        console.error(
          `[WL] enforcement fields update error for ${sourceRef}:`,
          enfError.message
        );
        batchErrors++;
        errors++;
      } else {
        created++;
        batchCreated++;
      }
    }

    // Incremental: stop early only if no new records AND no errors on this page
    if (params.mode === "incremental" && !pageHadNewRecord && pageErrorCount === 0) {
      console.log(`[WL] Incremental: full page already known at start=${start}, stopping.`);
      break outer;
    }

    // Log after every batch of 100
    {
      const batchStatus: "success" | "partial" | "failed" =
        batchErrors > 0 ? "partial" : "success";
      await logPipelineRun(supabase, {
        source_id: sourceId,
        run_type: `wl-${params.mode}`,
        status: batchStatus,
        items_fetched: batchFetched,
        items_created: batchCreated,
        items_skipped: batchSkipped,
        error_message: batchErrors > 0 ? `${batchErrors} errors in batch at start=${start}` : undefined,
        started_at: batchStart,
      });

      console.log(
        `[WL] Batch at start=${start} — fetched: ${batchFetched}, created: ${batchCreated}, ` +
          `skipped: ${batchSkipped}, errors: ${batchErrors}`
      );

      // Reset batch counters
      batchStart = new Date();
      batchFetched = 0;
      batchCreated = 0;
      batchSkipped = 0;
      batchErrors = 0;
    }

    start += rows.length;
  }

  // Log any remaining batch items
  if (batchFetched > 0 || batchCreated > 0 || batchSkipped > 0 || batchErrors > 0) {
    const finalStatus: "success" | "partial" | "failed" = batchErrors > 0 ? "partial" : "success";
    await logPipelineRun(supabase, {
      source_id: sourceId,
      run_type: `wl-${params.mode}`,
      status: finalStatus,
      items_fetched: batchFetched,
      items_created: batchCreated,
      items_skipped: batchSkipped,
      error_message: batchErrors > 0 ? `${batchErrors} errors in final batch` : undefined,
      started_at: batchStart,
    });
  }

  return {
    source: "warning_letters",
    mode: params.mode,
    fetched,
    created,
    skipped,
    errors,
    durationMs: Date.now() - startedAt.getTime(),
  };
}
