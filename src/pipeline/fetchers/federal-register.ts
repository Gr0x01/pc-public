import type { SupabaseClient } from "@supabase/supabase-js";
import type { FetcherResult } from "./utils";
import { sleep, logPipelineRun, dateWindowsFor } from "./utils";
import {
  FRListResponseSchema,
  FRDetailDocumentSchema,
  type FRListDocument,
} from "./schemas/federal-register";

const FR_API_BASE = "https://www.federalregister.gov/api/v1";
const DETAIL_DELAY_MS = 100;
const PAGE_DELAY_MS = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function mapItemType(frType: string): "rule" | "proposed_rule" | "notice" {
  if (frType === "Rule") return "rule";
  if (frType === "Proposed Rule") return "proposed_rule";
  return "notice";
}

function buildListUrl(fromStr: string, toStr: string, page: number): string {
  const fields = [
    "document_number",
    "title",
    "type",
    "publication_date",
    "abstract",
    "html_url",
    "page_views",
    "significant",
  ]
    .map((f) => `fields[]=${f}`)
    .join("&");

  return (
    `${FR_API_BASE}/documents.json?` +
    `conditions[agencies][]=food-and-drug-administration&` +
    `conditions[publication_date][gte]=${fromStr}&` +
    `conditions[publication_date][lte]=${toStr}&` +
    `per_page=100&page=${page}&` +
    fields
  );
}

function buildDetailUrl(documentNumber: string): string {
  const fields = [
    "document_number",
    "title",
    "type",
    "publication_date",
    "abstract",
    "html_url",
    "page_views",
    "significant",
    "cfr_references",
    "docket_ids",
    "effective_on",
    "comments_close_on",
    "action",
    "raw_text_url",
  ]
    .map((f) => `fields[]=${f}`)
    .join("&");

  return `${FR_API_BASE}/documents/${documentNumber}.json?${fields}`;
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

/**
 * Fetches FDA documents from the Federal Register API and upserts them into
 * the `regulatory_items` table.
 *
 * @param supabase - Supabase client with service-role access
 * @param params   - mode + optional date range for backfill
 */
export async function fetchFederalRegister(
  supabase: SupabaseClient,
  params: {
    mode: "backfill" | "incremental";
    startDate?: string; // YYYY-MM-DD, required for backfill
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
    .eq("name", "federal_register")
    .single();

  if (sourceError || !sourceRow) {
    throw new Error(
      `Could not find source 'federal_register': ${sourceError?.message ?? "no row returned"}`
    );
  }
  const sourceId = sourceRow.id as string;

  // 2. Determine date windows
  const today = new Date();
  let windows: Array<{ from: Date; to: Date }>;

  if (params.mode === "incremental") {
    const from = new Date(today);
    from.setDate(from.getDate() - 7);
    windows = [{ from, to: today }];
  } else {
    if (!params.startDate) {
      throw new Error("startDate is required for backfill mode");
    }
    const start = new Date(params.startDate);
    const end = params.endDate ? new Date(params.endDate) : today;
    windows = dateWindowsFor(start, end, 6);
  }

  // 3. Process each window
  for (const dateWindow of windows) {
    const windowStart = new Date();
    let windowFetched = 0;
    let windowCreated = 0;
    let windowSkipped = 0;
    let windowErrors = 0;
    let windowStatus: "success" | "failed" | "partial" = "success";

    const fromStr = formatDate(dateWindow.from);
    const toStr = formatDate(dateWindow.to);

    console.log(`[FR] Window: ${fromStr} → ${toStr}`);

    try {
      // 3a. Paginate through the list endpoint
      const allDocs: FRListDocument[] = [];
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        let listData: ReturnType<typeof FRListResponseSchema.parse> | null = null;

        try {
          const res = await fetch(buildListUrl(fromStr, toStr, page), {
            headers: { Accept: "application/json" },
          });
          if (!res.ok) {
            throw new Error(`FR list API error: ${res.status} ${res.statusText}`);
          }
          const raw = await res.json();
          const parsed = FRListResponseSchema.safeParse(raw);
          if (!parsed.success) {
            console.error(`[FR] List parse error (page ${page}):`, parsed.error.message);
            windowErrors++;
            windowStatus = "partial";
            break;
          }
          listData = parsed.data;
        } catch (err) {
          console.error(`[FR] List fetch error (page ${page}):`, err);
          windowErrors++;
          windowStatus = "partial";
          break;
        }

        totalPages = listData.total_pages;
        allDocs.push(...listData.results);
        windowFetched += listData.results.length;
        page++;

        if (page <= totalPages) await sleep(PAGE_DELAY_MS);
      }

      // 3b. Filter out already-existing docs
      if (allDocs.length > 0) {
        const docNumbers = allDocs.map((d) => d.document_number);
        const { data: existing } = await supabase
          .from("regulatory_items")
          .select("source_ref")
          .eq("source_id", sourceId)
          .in("source_ref", docNumbers);

        const existingRefs = new Set(
          (existing ?? []).map((r: { source_ref: string }) => r.source_ref)
        );
        const newDocs = allDocs.filter((d) => !existingRefs.has(d.document_number));
        windowSkipped += allDocs.length - newDocs.length;

        // 3c. Detail fetch + insert for each new doc
        for (let i = 0; i < newDocs.length; i++) {
          const doc = newDocs[i];
          // Rate-limit after the first request, not before, to avoid startup delay
          if (i > 0) await sleep(DETAIL_DELAY_MS);

          let detailData: ReturnType<typeof FRDetailDocumentSchema.parse> | null = null;
          try {
            const res = await fetch(buildDetailUrl(doc.document_number), {
              headers: { Accept: "application/json" },
            });
            if (res.ok) {
              const raw = await res.json();
              const parsed = FRDetailDocumentSchema.safeParse(raw);
              if (parsed.success) {
                detailData = parsed.data;
              } else {
                console.warn(
                  `[FR] Detail parse warning for ${doc.document_number}:`,
                  parsed.error.message
                );
              }
            }
          } catch (err) {
            console.warn(`[FR] Detail fetch warning for ${doc.document_number}:`, err);
          }

          // Use detail data if available, fall back to list data
          const source = detailData ?? doc;
          // Abstracts are optional in the FR API — null abstract is incomplete source data,
          // not a parse error. "parse_error" is reserved for malformed/invalid records.
          const processingStatus = source.abstract ? "ok" : "incomplete_source";

          const insertRow = {
            source_id: sourceId,
            source_ref: doc.document_number,
            title: doc.title,
            item_type: mapItemType(doc.type),
            jurisdiction: "federal" as const,
            published_date: doc.publication_date,
            effective_date: detailData?.effective_on ?? null,
            comment_deadline: detailData?.comments_close_on ?? null,
            docket_number: detailData?.docket_ids?.[0] ?? null,
            source_url: doc.html_url,
            raw_content: source.abstract ?? null,
            cfr_references: detailData?.cfr_references ?? null,
            action_text: detailData?.action ?? null,
            page_views: doc.page_views?.count ?? null,
            significant: doc.significant ?? null,
            processing_status: processingStatus,
          };

          const { error: insertError } = await supabase
            .from("regulatory_items")
            .insert(insertRow);

          if (insertError) {
            if (insertError.code === "23505") {
              // Unique constraint violation — already inserted (race condition)
              windowSkipped++;
            } else {
              console.error(
                `[FR] Insert error for ${doc.document_number}:`,
                insertError.message
              );
              windowErrors++;
            }
          } else {
            windowCreated++;
          }
        }
      }
    } catch (err) {
      console.error(`[FR] Unexpected window error (${fromStr} → ${toStr}):`, err);
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
      run_type: `fr-${params.mode}`,
      status: windowStatus,
      items_fetched: windowFetched,
      items_created: windowCreated,
      items_skipped: windowSkipped,
      error_message:
        windowErrors > 0 ? `${windowErrors} record errors in window ${fromStr}→${toStr}` : undefined,
      started_at: windowStart,
    });

    console.log(
      `[FR] Window done — fetched: ${windowFetched}, created: ${windowCreated}, ` +
        `skipped: ${windowSkipped}, errors: ${windowErrors}`
    );
  }

  return {
    source: "federal_register",
    mode: params.mode,
    fetched,
    created,
    skipped,
    errors,
    durationMs: Date.now() - startedAt.getTime(),
  };
}
