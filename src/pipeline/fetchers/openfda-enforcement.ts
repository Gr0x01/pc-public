import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import type { FetcherResult } from "./utils";
import { parseFdaDate, sleep, logPipelineRun, dateWindowsFor } from "./utils";
import { EnforcementResponseSchema } from "./schemas/openfda-enforcement";

const OPENFDA_API = "https://api.fda.gov/food/enforcement.json";
const REQUEST_DELAY_MS = 250;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFdaDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * Derives a stable source_ref for deduplication.
 * Priority: recall_number > event_id > hash(firm|date|product)
 */
function deriveSourceRef(params: {
  recall_number?: string;
  event_id?: string;
  recalling_firm: string;
  report_date: string;
  product_description: string;
}): string {
  if (params.recall_number) return params.recall_number;
  if (params.event_id) return params.event_id;

  const hash = createHash("sha256")
    .update(`${params.recalling_firm}|${params.report_date}|${params.product_description}`)
    .digest("hex")
    .slice(0, 12);

  return `fda-enf-${hash}`;
}

/**
 * Maps openFDA status strings to the recall_status enum values in the DB.
 */
function mapRecallStatus(status: string): "Ongoing" | "Completed" | "Terminated" | null {
  const s = status.toLowerCase();
  if (s.includes("ongoing")) return "Ongoing";
  if (s.includes("completed") || s.includes("closed")) return "Completed";
  if (s.includes("terminated")) return "Terminated";
  console.warn(`[openFDA] Unrecognized recall_status "${status}" — stored as null`);
  return null;
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

/**
 * Fetches FDA food enforcement (recall) records from the openFDA API and
 * upserts them into `regulatory_items` + `enforcement_details`.
 *
 * NOTE: product_type from openFDA is always "Food" even for supplements.
 * Segment classification happens in Phase 2B enrichment — do NOT store it here.
 *
 * @param supabase - Supabase client with service-role access
 * @param params   - mode + optional date range for backfill
 */
export async function fetchOpenFDAEnforcement(
  supabase: SupabaseClient,
  params: {
    mode: "backfill" | "incremental";
    startDate?: string; // YYYY-MM-DD, defaults to 2020-01-01 for backfill
    endDate?: string;   // YYYY-MM-DD, defaults to today
  }
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
    .eq("name", "openfda_enforcement")
    .single();

  if (sourceError || !sourceRow) {
    throw new Error(
      `Could not find source 'openfda_enforcement': ${sourceError?.message ?? "no row returned"}`
    );
  }
  const sourceId = sourceRow.id as string;

  // 2. Determine date windows
  const today = new Date();
  let windows: Array<{ from: Date; to: Date }>;

  if (params.mode === "incremental") {
    const from = new Date(today);
    from.setDate(from.getDate() - 14); // recalls can be backdated
    windows = [{ from, to: today }];
  } else {
    const start = new Date(params.startDate ?? "2020-01-01");
    const end = params.endDate ? new Date(params.endDate) : today;
    windows = dateWindowsFor(start, end, 3);
  }

  // 3. Process each window
  for (const dateWindow of windows) {
    const windowStart = new Date();
    let windowFetched = 0;
    let windowCreated = 0;
    let windowSkipped = 0;
    let windowErrors = 0;
    let windowStatus: "success" | "failed" | "partial" = "success";

    const fromStr = formatFdaDate(dateWindow.from);
    const toStr = formatFdaDate(dateWindow.to);

    console.log(`[openFDA] Window: ${fromStr} → ${toStr}`);

    try {
      let skip = 0;
      let total = Infinity;

      while (skip < total) {
        const url =
          `${OPENFDA_API}?search=report_date:[${fromStr}+TO+${toStr}]` +
          `&limit=100&skip=${skip}`;

        let pageData: ReturnType<typeof EnforcementResponseSchema.parse> | null = null;

        try {
          const res = await fetch(url, { headers: { Accept: "application/json" } });

          // openFDA returns 404 when there are no results for a window
          if (res.status === 404) {
            console.log(`[openFDA] No results for window ${fromStr}→${toStr}`);
            break;
          }

          if (!res.ok) {
            throw new Error(`openFDA API error: ${res.status} ${res.statusText}`);
          }

          const raw = await res.json();
          const parsed = EnforcementResponseSchema.safeParse(raw);
          if (!parsed.success) {
            console.error(
              `[openFDA] Parse error (skip=${skip}):`,
              parsed.error.message
            );
            windowErrors++;
            windowStatus = "partial";
            break;
          }
          pageData = parsed.data;
        } catch (err) {
          console.error(`[openFDA] Fetch error (skip=${skip}):`, err);
          windowErrors++;
          windowStatus = "partial";
          break;
        }

        total = pageData.meta.results.total;
        windowFetched += pageData.results.length;

        for (const record of pageData.results) {
          const sourceRef = deriveSourceRef({
            recall_number: record.recall_number,
            event_id: record.event_id,
            recalling_firm: record.recalling_firm,
            report_date: record.report_date,
            product_description: record.product_description,
          });

          // Parse report_date → ISO date
          let publishedDate: string;
          try {
            publishedDate = parseFdaDate(record.report_date).toISOString().split("T")[0];
          } catch {
            console.warn(
              `[openFDA] Invalid report_date "${record.report_date}" for ${sourceRef} — skipping`
            );
            windowErrors++;
            continue;
          }

          const itemRow = {
            source_id: sourceId,
            source_ref: sourceRef,
            title: record.product_description.slice(0, 200),
            item_type: "recall" as const,
            jurisdiction: "federal" as const,
            published_date: publishedDate,
            raw_content: `${record.reason_for_recall}\n\n${record.product_description}`,
            processing_status: "ok" as const,
          };

          const { data: inserted, error: insertError } = await supabase
            .from("regulatory_items")
            .insert(itemRow)
            .select("id")
            .single();

          if (insertError) {
            if (insertError.code === "23505") {
              // Already exists — expected during incremental runs
              windowSkipped++;
            } else {
              console.error(
                `[openFDA] regulatory_items insert error for ${sourceRef}:`,
                insertError.message
              );
              windowErrors++;
            }
            continue;
          }

          if (!inserted) {
            windowErrors++;
            continue;
          }

          // Insert enforcement_details for the new item
          const detailRow = {
            item_id: inserted.id,
            company_name: record.recalling_firm,
            recall_classification:
              (record.classification as "Class I" | "Class II" | "Class III" | undefined) ??
              null,
            recall_status: mapRecallStatus(record.status),
            voluntary_mandated: record.voluntary_mandated ?? null,
            distribution_pattern: record.distribution_pattern ?? null,
            product_quantity: record.product_quantity ?? null,
            products: [record.product_description],
          };

          const { error: detailError } = await supabase
            .from("enforcement_details")
            .insert(detailRow);

          if (detailError) {
            // regulatory_item was created, enforcement_details failed — record is incomplete
            console.error(
              `[openFDA] enforcement_details insert error for ${sourceRef}:`,
              detailError.message
            );
            windowErrors++;
          } else {
            windowCreated++;
          }
        }

        // Guard against infinite loop: if API returns 0 results on a non-404 response
        if (pageData.results.length === 0) break;

        skip += pageData.results.length;
        if (skip < total) await sleep(REQUEST_DELAY_MS);
      }
    } catch (err) {
      console.error(`[openFDA] Unexpected window error (${fromStr}→${toStr}):`, err);
      windowStatus = "failed";
      windowErrors++;
    }

    // Accumulate window totals
    fetched += windowFetched;
    created += windowCreated;
    skipped += windowSkipped;
    errors += windowErrors;

    if (windowStatus === "success" && windowErrors > 0) {
      windowStatus = "partial";
    }

    await logPipelineRun(supabase, {
      source_id: sourceId,
      run_type: `enforcement-${params.mode}`,
      status: windowStatus,
      items_fetched: windowFetched,
      items_created: windowCreated,
      items_skipped: windowSkipped,
      error_message:
        windowErrors > 0
          ? `${windowErrors} record errors in window ${fromStr}→${toStr}`
          : undefined,
      started_at: windowStart,
    });

    console.log(
      `[openFDA] Window done — fetched: ${windowFetched}, created: ${windowCreated}, ` +
        `skipped: ${windowSkipped}, errors: ${windowErrors}`
    );
  }

  return {
    source: "openfda_enforcement",
    mode: params.mode,
    fetched,
    created,
    skipped,
    errors,
    durationMs: Date.now() - startedAt.getTime(),
  };
}
