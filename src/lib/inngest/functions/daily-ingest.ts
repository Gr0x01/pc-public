import { createClient } from "@supabase/supabase-js";
import { inngest } from "../client";
import { fetchFederalRegister } from "@/pipeline/fetchers/federal-register";
import { fetchOpenFDAEnforcement } from "@/pipeline/fetchers/openfda-enforcement";
import { fetchWarningLetters } from "@/pipeline/fetchers/warning-letters";
import { fetchFdaRss } from "@/pipeline/fetchers/fda-rss";
import { runEnrichment } from "@/pipeline/enrichment/runner";
import type { FetcherResult } from "@/pipeline/fetchers/utils";

function createSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Truncate error messages to avoid leaking sensitive data to Inngest dashboard. */
function safeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.slice(0, 500);
}

type FetchStepResult = FetcherResult & { error?: string };

export const dailyIngest = inngest.createFunction(
  {
    id: "daily-ingest",
    concurrency: [{ limit: 1 }],
  },
  // Runs at 6:00 AM and 6:00 PM UTC (2 AM / 2 PM ET)
  { cron: "0 6,18 * * *" },
  async ({ step }) => {
    // W1 fix: run all 4 fetchers in parallel — they hit independent APIs
    const [frResult, enfResult, wlResult, rssResult] = await Promise.all([
      step.run("fetch-federal-register", async (): Promise<FetchStepResult> => {
        try {
          const supabase = createSupabase();
          return await fetchFederalRegister(supabase, { mode: "incremental" });
        } catch (err) {
          console.error("[daily-ingest] federal-register failed:", safeError(err));
          return { source: "federal_register", mode: "incremental", fetched: 0, created: 0, skipped: 0, errors: 1, durationMs: 0, error: safeError(err) };
        }
      }),

      step.run("fetch-openfda-enforcement", async (): Promise<FetchStepResult> => {
        try {
          const supabase = createSupabase();
          return await fetchOpenFDAEnforcement(supabase, { mode: "incremental" });
        } catch (err) {
          console.error("[daily-ingest] openfda-enforcement failed:", safeError(err));
          return { source: "openfda_enforcement", mode: "incremental", fetched: 0, created: 0, skipped: 0, errors: 1, durationMs: 0, error: safeError(err) };
        }
      }),

      step.run("fetch-warning-letters", async (): Promise<FetchStepResult> => {
        try {
          const supabase = createSupabase();
          return await fetchWarningLetters(supabase, { mode: "incremental" });
        } catch (err) {
          console.error("[daily-ingest] warning-letters failed:", safeError(err));
          return { source: "warning_letters", mode: "incremental", fetched: 0, created: 0, skipped: 0, errors: 1, durationMs: 0, error: safeError(err) };
        }
      }),

      step.run("fetch-fda-rss", async (): Promise<FetchStepResult> => {
        try {
          const supabase = createSupabase();
          return await fetchFdaRss(supabase);
        } catch (err) {
          console.error("[daily-ingest] fda-rss failed:", safeError(err));
          return { source: "fda_rss", mode: "incremental", fetched: 0, created: 0, skipped: 0, errors: 1, durationMs: 0, error: safeError(err) };
        }
      }),
    ]);

    // Enrichment must run after fetchers (processes items they just created)
    const enrichResult = await step.run("run-enrichment", async () => {
      try {
        return await runEnrichment({ limit: 100 });
      } catch (err) {
        console.error("[daily-ingest] enrichment failed:", safeError(err));
        return { processed: 0, enriched: 0, embedded: 0, contentFetched: 0, crossReferenced: 0, verdicts: 0, alertsQueued: 0, errors: 1, skipped: 0, durationMs: 0, error: safeError(err) };
      }
    });

    const summary = {
      fetchers: {
        federalRegister: { created: frResult.created, errors: frResult.errors, error: frResult.error },
        enforcement: { created: enfResult.created, errors: enfResult.errors, error: enfResult.error },
        warningLetters: { created: wlResult.created, errors: wlResult.errors, error: wlResult.error },
        rss: { created: rssResult.created, errors: rssResult.errors, error: rssResult.error },
      },
      enrichment: {
        processed: enrichResult.processed,
        enriched: enrichResult.enriched,
        crossReferenced: enrichResult.crossReferenced,
        embedded: enrichResult.embedded,
        verdicts: enrichResult.verdicts,
        alertsQueued: enrichResult.alertsQueued,
        errors: enrichResult.errors,
        error: "error" in enrichResult ? enrichResult.error : undefined,
      },
      totalCreated: frResult.created + enfResult.created + wlResult.created + rssResult.created,
      totalErrors: frResult.errors + enfResult.errors + wlResult.errors + rssResult.errors + enrichResult.errors,
    };

    console.log("[daily-ingest] complete:", JSON.stringify(summary));
    return summary;
  }
);
