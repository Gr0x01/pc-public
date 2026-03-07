import { inngest } from "../client";
import {
  generateWeeklyContent,
  sendPaidBriefings,
  sendFreeNewsletters,
} from "@/lib/email/send-weekly-core";

export const sendWeeklyEmails = inngest.createFunction(
  {
    id: "send-weekly-emails",
    concurrency: [{ limit: 1 }],
  },
  { cron: "0 14 * * 5" },
  async ({ step }) => {
    const results = {
      paid: { total: 0, sent: 0, failed: 0 },
      free: { total: 0, sent: 0, failed: 0 },
    };

    // Step 1: Generate newsletter content (LLM calls, done once)
    const { digestData, newsletterContent } = await step.run(
      "generate-newsletter-content",
      () => generateWeeklyContent()
    );

    // Step 2: Send paid briefings (personalized per subscriber)
    results.paid = await step.run(
      "send-paid-briefings",
      () => sendPaidBriefings()
    );

    // Step 3: Send free newsletters (same content, per-subscriber unsub)
    results.free = await step.run(
      "send-free-newsletters",
      () => sendFreeNewsletters(digestData, newsletterContent)
    );

    console.log(`[send-weekly] Complete: ${JSON.stringify(results)}`);
    return results;
  }
);
