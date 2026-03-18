import { inngest } from "../client";
import { getActiveSubscribers } from "@/lib/email/queries";
import {
  generateWeeklyContent,
  sendPaidBriefings,
  sendFreeNewsletters,
  type SendResults,
} from "@/lib/email/send-weekly-core";

/** Max subscribers per Inngest step to stay within timeout limits. */
const PAID_BATCH_SIZE = 5;

export const sendWeeklyEmails = inngest.createFunction(
  {
    id: "send-weekly-emails",
    concurrency: [{ limit: 1 }],
  },
  { cron: "0 14 * * 5" },
  async ({ step }) => {
    const paidResults: SendResults = { total: 0, sent: 0, failed: 0 };

    // Step 1: Generate newsletter content (LLM calls, done once)
    const { digestData, newsletterContent } = await step.run(
      "generate-newsletter-content",
      () => generateWeeklyContent()
    );

    // Step 2: Fetch paid subscribers
    const subscribers = await step.run(
      "fetch-paid-subscribers",
      () => getActiveSubscribers()
    );
    paidResults.total = subscribers.length;

    // Step 3: Send paid briefings in batches (each batch is its own step
    // with independent retry and timeout)
    for (let i = 0; i < subscribers.length; i += PAID_BATCH_SIZE) {
      const batch = subscribers.slice(i, i + PAID_BATCH_SIZE);
      const batchNum = Math.floor(i / PAID_BATCH_SIZE) + 1;
      const batchResult = await step.run(
        `send-paid-batch-${batchNum}`,
        () => sendPaidBriefings(batch)
      );
      paidResults.sent += batchResult.sent;
      paidResults.failed += batchResult.failed;
    }

    // Step 4: Send free newsletters (same content, per-subscriber unsub)
    const freeResults = await step.run(
      "send-free-newsletters",
      () => sendFreeNewsletters(digestData, newsletterContent)
    );

    const results = { paid: paidResults, free: freeResults };
    console.log(`[send-weekly] Complete: ${JSON.stringify(results)}`);
    return results;
  }
);
