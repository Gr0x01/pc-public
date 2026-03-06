import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { dailyIngest, enrichBatch, weeklySnapshot } from "@/lib/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [dailyIngest, enrichBatch, weeklySnapshot],
});
