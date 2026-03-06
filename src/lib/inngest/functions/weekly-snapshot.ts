import { inngest } from "../client";
import { generateWeeklySnapshot } from "@/lib/intelligence/weekly-snapshot";

export const weeklySnapshot = inngest.createFunction(
  {
    id: "weekly-intelligence-snapshot",
    concurrency: [{ limit: 1 }],
  },
  // Runs Friday at 2 PM UTC (10 AM ET), after the morning ingest
  { cron: "0 14 * * 5" },
  async ({ step }) => {
    const snapshot = await step.run("generate-snapshot", async () => {
      return await generateWeeklySnapshot();
    });

    console.log(
      `[weekly-snapshot] Generated for ${snapshot.week_start} to ${snapshot.week_end}: ${snapshot.total_items} items, ${snapshot.total_sectors} sectors`
    );

    return {
      week_start: snapshot.week_start,
      week_end: snapshot.week_end,
      total_items: snapshot.total_items,
      total_sectors: snapshot.total_sectors,
      showcase_count: snapshot.showcase_items.length,
    };
  }
);
