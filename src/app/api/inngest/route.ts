import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { dailyIngest, enrichBatch, weeklySnapshot, urgentAlerts, productNudge, sendWeeklyEmails } from "@/lib/inngest";

// Inngest steps can be long-running (enrichment, fetchers).
// Vercel Pro allows up to 300s per invocation.
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [dailyIngest, enrichBatch, weeklySnapshot, urgentAlerts, productNudge, sendWeeklyEmails],
});
