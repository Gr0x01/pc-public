/**
 * Enrichment runner.
 *
 * Queries unenriched regulatory items and processes them concurrently:
 * 1. LLM enrichment (geminiFlash / geminiPro via processor)
 * 2. Embedding generation (OpenAI via embeddings)
 * 3. DB writes via processor
 *
 * Concurrency controlled via p-limit (default: 5 parallel items).
 */

import pLimit from "p-limit";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { enrichItem, loadCategoryIdMap } from "./processor";
import { generateItemEmbeddings } from "./embeddings";
import { fetchSourceContent } from "./content-fetch";
import { sleep, logPipelineRun } from "../fetchers/utils";
import type { RegulatoryItem } from "../../types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnrichmentRunOptions {
  /** Max items to process in this run. Default: 10 (safety limit for dev). */
  limit?: number;
  /** Number of items to process concurrently. Default: 5. */
  concurrency?: number;
  /** Only enrich items with this item_type (e.g., "recall"). Optional. */
  itemTypeFilter?: string;
  /** Supabase URL override (for scripts that can't use env directly). */
  supabaseUrl?: string;
  /** Supabase service role key override. */
  supabaseKey?: string;
  /** Google AI API key override. */
  googleApiKey?: string;
  /** OpenAI API key override. */
  openaiApiKey?: string;
}

export interface EnrichmentRunResult {
  processed: number;
  enriched: number;
  embedded: number;
  contentFetched: number;
  crossReferenced: number;
  errors: number;
  skipped: number;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

export async function runEnrichment(
  options: EnrichmentRunOptions = {}
): Promise<EnrichmentRunResult> {
  const startTime = Date.now();

  // Resolve credentials (env vars or passed-in options)
  const supabaseUrl = options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = options.supabaseKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const googleApiKey = options.googleApiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "";
  const openaiApiKey = options.openaiApiKey ?? process.env.OPENAI_API_KEY ?? "";

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)");
  }
  if (!googleApiKey) {
    throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY");
  }
  if (!openaiApiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const google = createGoogleGenerativeAI({ apiKey: googleApiKey });

  const limit = options.limit ?? 10;
  const concurrency = options.concurrency ?? 5;

  // 1. Load category ID map (one DB call, reused per item)
  const categoryIdMap = await loadCategoryIdMap(supabase);
  console.log(
    `Loaded ${Object.keys(categoryIdMap.topics).length} topics`
  );

  // 2. Query unenriched items
  // Items are marked 'enriched' after processing, so 'ok' = not yet enriched.
  // Items that error get 'error' status — those are also skipped.
  let query = supabase
    .from("regulatory_items")
    .select("*")
    .eq("processing_status", "ok")
    .order("published_date", { ascending: false })
    .limit(limit);

  if (options.itemTypeFilter) {
    query = query.eq("item_type", options.itemTypeFilter);
  }

  const { data: items, error: queryErr } = await query;

  if (queryErr) {
    throw new Error(`Failed to query unenriched items: ${queryErr.message}`);
  }

  if (!items || items.length === 0) {
    console.log("No unenriched items found.");
    return { processed: 0, enriched: 0, embedded: 0, contentFetched: 0, crossReferenced: 0, errors: 0, skipped: 0, durationMs: Date.now() - startTime };
  }

  const typedItems = items as RegulatoryItem[];
  const totalItems = typedItems.length;

  console.log(`Found ${totalItems} items to enrich (limit: ${limit}, concurrency: ${concurrency})`);

  const counters = { processed: 0, enriched: 0, embedded: 0, contentFetched: 0, crossReferenced: 0, errors: 0, skipped: 0 };

  // 3. Process concurrently with p-limit
  const limit_ = pLimit(concurrency);

  async function processItem(item: RegulatoryItem, index: number) {
    const label = `[${index + 1}/${totalItems}] ${item.item_type} — ${item.title.slice(0, 60)}`;

    // a. Fetch full page content if source_url points to FDA.gov
    if (item.source_url && /^https?:\/\/www\.fda\.gov\//.test(item.source_url)) {
      const { content, error: fetchErr } = await fetchSourceContent(item.source_url);
      if (content && content.length > (item.raw_content?.length ?? 0)) {
        await supabase
          .from("regulatory_items")
          .update({ raw_content: content })
          .eq("id", item.id);
        item.raw_content = content;
        counters.contentFetched++;
      } else if (fetchErr) {
        console.log(`${label} content-fetch skipped (${fetchErr})`);
      }
    }

    // b. Enrich
    const enrichResult = await enrichItem(item, supabase, categoryIdMap, google);

    if (!enrichResult.ok || !enrichResult.enrichmentId) {
      console.log(`${label} ERROR: ${enrichResult.error}`);
      counters.errors++;

      // Mark item as error so we don't retry endlessly
      await supabase
        .from("regulatory_items")
        .update({ processing_status: "error", processing_error: enrichResult.error ?? "enrichment failed" })
        .eq("id", item.id);
      return;
    }

    counters.enriched++;
    if (enrichResult.crossReferenced) counters.crossReferenced++;

    // c. Generate embeddings
    try {
      await generateItemEmbeddings(item, supabase, openaiApiKey);
      counters.embedded++;
      console.log(`${label} done`);
    } catch (embErr) {
      const msg = embErr instanceof Error ? embErr.message : String(embErr);
      console.log(`${label} enriched (embedding failed: ${msg})`);
    }

    counters.processed++;

    // Log progress every 10 items
    if (counters.processed % 10 === 0) {
      console.log(
        `Progress: ${counters.processed}/${totalItems} | enriched=${counters.enriched} crossRef=${counters.crossReferenced} embedded=${counters.embedded} errors=${counters.errors}`
      );
    }
  }

  await Promise.allSettled(
    typedItems.map((item, i) =>
      limit_(() => processItem(item, i))
    )
  );

  const durationMs = Date.now() - startTime;

  // 4. Log pipeline run
  try {
    const { data: enrichSource } = await supabase
      .from("sources")
      .select("id")
      .eq("name", "enrichment")
      .single();

    if (enrichSource) {
      await logPipelineRun(supabase, {
        source_id: enrichSource.id,
        run_type: "enrichment",
        status: counters.errors === 0 ? "success" : counters.enriched > 0 ? "partial" : "failed",
        items_fetched: counters.processed,
        items_created: counters.enriched,
        items_skipped: counters.skipped,
        error_message: counters.errors > 0 ? `${counters.errors} items failed` : undefined,
        started_at: new Date(startTime),
      });
    }
  } catch {
    // Non-fatal: pipeline logging failure shouldn't break the run
  }

  return { ...counters, durationMs };
}
