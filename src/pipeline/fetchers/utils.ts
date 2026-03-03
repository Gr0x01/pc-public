import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FetcherResult = {
  source: string;
  mode: "backfill" | "incremental";
  fetched: number;
  created: number;
  skipped: number;
  errors: number;
  durationMs: number;
};

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/**
 * Parses an FDA-style date string (YYYYMMDD) into a Date.
 * Throws if the format is invalid.
 */
export function parseFdaDate(yyyymmdd: string): Date {
  if (!/^\d{8}$/.test(yyyymmdd)) {
    throw new Error(`Invalid FDA date format: "${yyyymmdd}" (expected YYYYMMDD)`);
  }
  const year = yyyymmdd.slice(0, 4);
  const month = yyyymmdd.slice(4, 6);
  const day = yyyymmdd.slice(6, 8);
  const d = new Date(`${year}-${month}-${day}`);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid FDA date value: "${yyyymmdd}"`);
  }
  return d;
}

/**
 * Splits a date range into N-month windows.
 * Used by FR (6-month) and enforcement (3-month) backfills.
 */
export function dateWindowsFor(
  startDate: Date,
  endDate: Date,
  windowMonths: number
): Array<{ from: Date; to: Date }> {
  const windows: Array<{ from: Date; to: Date }> = [];
  let current = new Date(startDate);

  while (current < endDate) {
    const windowEnd = new Date(current);
    windowEnd.setMonth(windowEnd.getMonth() + windowMonths);

    windows.push({
      from: new Date(current),
      to: windowEnd > endDate ? new Date(endDate) : new Date(windowEnd),
    });

    current = new Date(windowEnd);
  }

  return windows;
}

// ---------------------------------------------------------------------------
// Async helpers
// ---------------------------------------------------------------------------

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Pipeline logging
// ---------------------------------------------------------------------------

export async function logPipelineRun(
  supabase: SupabaseClient,
  params: {
    source_id: string;
    run_type: string;
    status: "success" | "failed" | "partial";
    items_fetched: number;
    items_created: number;
    items_skipped: number;
    error_message?: string;
    started_at: Date;
  }
): Promise<void> {
  const { error } = await supabase.from("pipeline_runs").insert({
    source_id: params.source_id,
    status: params.status,
    items_fetched: params.items_fetched,
    items_created: params.items_created,
    items_skipped: params.items_skipped,
    error_message: params.error_message ?? null,
    started_at: params.started_at.toISOString(),
    completed_at: new Date().toISOString(),
    metadata: { run_type: params.run_type },
  });
  if (error) {
    console.error("Failed to log pipeline run:", error.message);
  }
}
