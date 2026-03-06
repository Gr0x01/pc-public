import { inngest } from "../client";
import { runEnrichment } from "@/pipeline/enrichment/runner";

const MAX_ENRICHMENT_LIMIT = 200;

export const enrichBatch = inngest.createFunction(
  {
    id: "enrich-batch",
    concurrency: [{ limit: 1 }],
  },
  { event: "pipeline/enrich.requested" },
  async ({ event, step }) => {
    const limit = Math.min(Math.max(event.data.limit ?? 20, 1), MAX_ENRICHMENT_LIMIT);

    const result = await step.run("run-enrichment", async () => {
      try {
        return await runEnrichment({
          limit,
          itemTypeFilter: event.data.itemTypeFilter,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[enrich-batch] enrichment failed:", msg.slice(0, 500));
        return { processed: 0, enriched: 0, embedded: 0, contentFetched: 0, crossReferenced: 0, verdicts: 0, alertsQueued: 0, errors: 1, skipped: 0, durationMs: 0, error: msg.slice(0, 500) };
      }
    });

    console.log("[enrich-batch] complete:", JSON.stringify(result));
    return result;
  }
);
