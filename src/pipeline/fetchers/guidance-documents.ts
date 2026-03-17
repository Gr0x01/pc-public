import type { SupabaseClient } from "@supabase/supabase-js";
import type { FetcherResult } from "./utils";
import { logPipelineRun } from "./utils";
import { GuidanceResponseSchema } from "./schemas/guidance-documents";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FDA_BASE = "https://www.fda.gov";

/**
 * Static JSON endpoint containing ALL guidance documents (~2,786 records).
 * Discovered via Playwright network intercept — the DataTables AJAX endpoint
 * is behind bot protection, but this static file is freely accessible.
 */
const GUIDANCE_JSON_URL =
  `${FDA_BASE}/files/api/datatables/static/search-for-guidance.json`;

// ---------------------------------------------------------------------------
// HTML parsing helpers
// ---------------------------------------------------------------------------

/**
 * Extract href from the first <a> tag in an HTML string.
 * Only returns paths that start with "/" — prevents SSRF.
 */
function extractHref(html: string): string | null {
  const match = html.match(/href="([^"]+)"/i);
  if (!match) return null;
  const href = match[1];
  if (!href.startsWith("/")) return null;
  return href;
}

/** Extract inner text from HTML, stripping all tags and decoding entities */
function extractText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

/** Derive URL slug from the guidance path (last path segment) */
function slugFromPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? path;
  return last.replace(/\.[a-z]+$/i, "").slice(0, 100);
}

/**
 * Parse a date string from guidance documents (MM/DD/YYYY format).
 */
function parseGuidanceDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // MM/DD/YYYY
  const mdyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, mm, dd, yyyy] = mdyMatch;
    const d = new Date(`${yyyy}-${mm!.padStart(2, "0")}-${dd!.padStart(2, "0")}`);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  return null;
}

/**
 * Determine item_type from the guidance status field.
 * "Draft" → draft_guidance, everything else (Final, Withdrawn, etc.) → guidance
 */
function classifyGuidanceType(status: string): "guidance" | "draft_guidance" {
  const normalized = status.trim().toLowerCase();
  if (normalized.includes("draft")) return "draft_guidance";
  return "guidance";
}

/**
 * Extract docket number text from HTML field.
 * Input: '<a href="https://www.regulations.gov/docket/FDA-2020-D-1954">FDA-2020-D-1954</a>'
 * Output: "FDA-2020-D-1954"
 */
function extractDocketNumber(html: string): string | null {
  const text = extractText(html);
  return text || null;
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

/**
 * Fetches FDA guidance documents from the static JSON endpoint.
 * All ~2,786 records come in a single request — no pagination needed.
 *
 * Inserts metadata only (no per-item page fetches). The enrichment pipeline's
 * content-fetch step handles retrieving full page content via source_url.
 */
export async function fetchGuidanceDocuments(
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
    .eq("name", "guidance_documents")
    .single();

  if (sourceError || !sourceRow) {
    throw new Error(
      `Could not find source 'guidance_documents': ${sourceError?.message ?? "no row returned"}`
    );
  }
  const sourceId = sourceRow.id as string;

  // 2. Fetch the full guidance JSON
  console.log(`[GD] Fetching static guidance JSON...`);
  const res = await fetch(GUIDANCE_JSON_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(120_000), // 2 min timeout — FDA servers can be slow
  });
  if (!res.ok) {
    throw new Error(`[GD] Static JSON fetch failed: ${res.status} ${res.statusText}`);
  }
  const raw = await res.json();
  const parsed = GuidanceResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`[GD] JSON parse error: ${parsed.error.message.slice(0, 300)}`);
  }
  const docs = parsed.data;
  console.log(`[GD] Loaded ${docs.length} guidance documents`);

  // 3. Batch load known source_refs for dedup.
  //    Supabase JS defaults to 1000 rows — paginate to get all refs.
  const knownRefs = new Set<string>();
  let page = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data: refPage } = await supabase
      .from("regulatory_items")
      .select("source_ref")
      .eq("source_id", sourceId)
      .order("source_ref")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (!refPage || refPage.length === 0) break;
    for (const r of refPage) knownRefs.add(r.source_ref);
    if (refPage.length < PAGE_SIZE) break;
    page++;
  }
  console.log(`[GD] Loaded ${knownRefs.size} known source_refs for dedup`);

  // 4. Process each document — metadata only, no page fetches
  for (const doc of docs) {
    fetched++;

    const guidancePath = extractHref(doc.title);
    if (!guidancePath) {
      continue;
    }

    const slug = slugFromPath(guidancePath);
    const title = extractText(doc.title) || "Unknown Guidance Document";

    if (knownRefs.has(slug)) {
      skipped++;
      continue;
    }

    const publishedDate = parseGuidanceDate(doc.field_issue_datetime);
    if (!publishedDate) {
      console.warn(`[GD] Could not parse date "${doc.field_issue_datetime}" for ${slug}`);
      errors++;
      continue;
    }

    const itemType = classifyGuidanceType(doc.field_final_guidance_1);
    const issuingOffice = doc.field_issuing_office_taxonomy.trim() || null;
    const docketNumber = extractDocketNumber(doc.field_docket_number);
    const commentDeadline = parseGuidanceDate(doc.field_comment_close_date);
    const guidanceUrl = `${FDA_BASE}${guidancePath}`;

    const itemRow = {
      source_id: sourceId,
      source_ref: slug,
      title: title.slice(0, 500),
      item_type: itemType,
      jurisdiction: "federal" as const,
      published_date: publishedDate,
      issuing_office: issuingOffice,
      docket_number: docketNumber,
      comment_deadline: commentDeadline,
      raw_content: null,
      source_url: guidanceUrl,
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
      console.error(`[GD] Insert error for ${slug}:`, insertError.message);
      errors++;
      continue;
    }

    created++;
    knownRefs.add(slug);
  }

  // Log pipeline run
  const status: "success" | "partial" | "failed" = errors > 0 ? "partial" : "success";
  await logPipelineRun(supabase, {
    source_id: sourceId,
    run_type: `gd-${params.mode}`,
    status,
    items_fetched: fetched,
    items_created: created,
    items_skipped: skipped,
    error_message: errors > 0 ? `${errors} errors during ${params.mode}` : undefined,
    started_at: startedAt,
  });

  console.log(
    `[GD] Done — fetched: ${fetched}, created: ${created}, skipped: ${skipped}, errors: ${errors}`
  );

  return {
    source: "guidance_documents",
    mode: params.mode,
    fetched,
    created,
    skipped,
    errors,
    durationMs: Date.now() - startedAt.getTime(),
  };
}
