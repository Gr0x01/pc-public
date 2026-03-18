import { createClient } from "@supabase/supabase-js";
import { inngest } from "../client";
import { fetchFederalRegister } from "@/pipeline/fetchers/federal-register";
import { fetchOpenFDAEnforcement } from "@/pipeline/fetchers/openfda-enforcement";
import { fetchWarningLetters } from "@/pipeline/fetchers/warning-letters";
import { fetchFdaRss } from "@/pipeline/fetchers/fda-rss";
import { fetchImportAlerts } from "@/pipeline/fetchers/import-alerts";
import { fetchGuidanceDocuments } from "@/pipeline/fetchers/guidance-documents";
import { fetchRegulationsGov } from "@/pipeline/fetchers/regulations-gov";
import * as Sentry from "@sentry/nextjs";
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
    // Run all 7 fetchers in parallel — they hit independent APIs
    const [frResult, enfResult, wlResult, rssResult, iaResult, gdResult, regsResult] = await Promise.all([
      step.run("fetch-federal-register", async (): Promise<FetchStepResult> => {
        try {
          const supabase = createSupabase();
          return await fetchFederalRegister(supabase, { mode: "incremental" });
        } catch (err) {
          Sentry.captureException(err, { tags: { pipeline: "daily-ingest", fetcher: "federal-register" } });
          console.error("[daily-ingest] federal-register failed:", safeError(err));
          return { source: "federal_register", mode: "incremental", fetched: 0, created: 0, skipped: 0, errors: 1, durationMs: 0, error: safeError(err) };
        }
      }),

      step.run("fetch-openfda-enforcement", async (): Promise<FetchStepResult> => {
        try {
          const supabase = createSupabase();
          return await fetchOpenFDAEnforcement(supabase, { mode: "incremental" });
        } catch (err) {
          Sentry.captureException(err, { tags: { pipeline: "daily-ingest", fetcher: "openfda-enforcement" } });
          console.error("[daily-ingest] openfda-enforcement failed:", safeError(err));
          return { source: "openfda_enforcement", mode: "incremental", fetched: 0, created: 0, skipped: 0, errors: 1, durationMs: 0, error: safeError(err) };
        }
      }),

      step.run("fetch-warning-letters", async (): Promise<FetchStepResult> => {
        try {
          const supabase = createSupabase();
          return await fetchWarningLetters(supabase, { mode: "incremental" });
        } catch (err) {
          Sentry.captureException(err, { tags: { pipeline: "daily-ingest", fetcher: "warning-letters" } });
          console.error("[daily-ingest] warning-letters failed:", safeError(err));
          return { source: "warning_letters", mode: "incremental", fetched: 0, created: 0, skipped: 0, errors: 1, durationMs: 0, error: safeError(err) };
        }
      }),

      step.run("fetch-fda-rss", async (): Promise<FetchStepResult> => {
        try {
          const supabase = createSupabase();
          return await fetchFdaRss(supabase);
        } catch (err) {
          Sentry.captureException(err, { tags: { pipeline: "daily-ingest", fetcher: "fda-rss" } });
          console.error("[daily-ingest] fda-rss failed:", safeError(err));
          return { source: "fda_rss", mode: "incremental", fetched: 0, created: 0, skipped: 0, errors: 1, durationMs: 0, error: safeError(err) };
        }
      }),

      step.run("fetch-import-alerts", async (): Promise<FetchStepResult> => {
        try {
          const supabase = createSupabase();
          return await fetchImportAlerts(supabase, { mode: "incremental" });
        } catch (err) {
          Sentry.captureException(err, { tags: { pipeline: "daily-ingest", fetcher: "import-alerts" } });
          console.error("[daily-ingest] import-alerts failed:", safeError(err));
          return { source: "import_alerts", mode: "incremental", fetched: 0, created: 0, skipped: 0, errors: 1, durationMs: 0, error: safeError(err) };
        }
      }),

      step.run("fetch-guidance-documents", async (): Promise<FetchStepResult> => {
        try {
          const supabase = createSupabase();
          return await fetchGuidanceDocuments(supabase, { mode: "incremental" });
        } catch (err) {
          Sentry.captureException(err, { tags: { pipeline: "daily-ingest", fetcher: "guidance-documents" } });
          console.error("[daily-ingest] guidance-documents failed:", safeError(err));
          return { source: "guidance_documents", mode: "incremental", fetched: 0, created: 0, skipped: 0, errors: 1, durationMs: 0, error: safeError(err) };
        }
      }),

      step.run("fetch-regulations-gov", async (): Promise<FetchStepResult> => {
        try {
          const supabase = createSupabase();
          return await fetchRegulationsGov(supabase, { mode: "incremental" });
        } catch (err) {
          Sentry.captureException(err, { tags: { pipeline: "daily-ingest", fetcher: "regulations-gov" } });
          console.error("[daily-ingest] regulations-gov failed:", safeError(err));
          return { source: "regulations_gov", mode: "incremental", fetched: 0, created: 0, skipped: 0, errors: 1, durationMs: 0, error: safeError(err) };
        }
      }),
    ]);

    const allFetchResults = [frResult, enfResult, wlResult, rssResult, iaResult, gdResult, regsResult];
    const totalCreated = allFetchResults.reduce((sum, r) => sum + r.created, 0);

    // Trigger enrichment only if new items were fetched.
    // Skips unnecessary DB scans when all fetchers returned 0 new items.
    let enrichmentTriggered = false;
    if (totalCreated > 0) {
      await step.sendEvent("trigger-enrichment", {
        name: "pipeline/enrich.requested",
        data: { limit: 100 },
      });
      enrichmentTriggered = true;
    }

    const summary = {
      fetchers: {
        federalRegister: { created: frResult.created, errors: frResult.errors, error: frResult.error },
        enforcement: { created: enfResult.created, errors: enfResult.errors, error: enfResult.error },
        warningLetters: { created: wlResult.created, errors: wlResult.errors, error: wlResult.error },
        rss: { created: rssResult.created, errors: rssResult.errors, error: rssResult.error },
        importAlerts: { created: iaResult.created, errors: iaResult.errors, error: iaResult.error },
        guidanceDocuments: { created: gdResult.created, errors: gdResult.errors, error: gdResult.error },
        regulationsGov: { created: regsResult.created, errors: regsResult.errors, error: regsResult.error },
      },
      totalCreated,
      totalErrors: allFetchResults.reduce((sum, r) => sum + r.errors, 0),
      enrichmentTriggered,
    };

    console.log("[daily-ingest] complete:", JSON.stringify(summary));
    return summary;
  }
);
