import * as Sentry from "@sentry/nextjs";
import { inngest } from "../client";
import {
  getActiveSubscribers,
  createCampaign,
  updateCampaignStatus,
} from "@/lib/email/queries";
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

    // Step 3: Create one campaign for all paid briefings
    const paidCampaignId = subscribers.length > 0
      ? await step.run("create-paid-campaign", () =>
          createCampaign({
            campaign_type: "weekly_paid",
            subject_line: "Weekly Product Intelligence Briefing",
            html_content: "",
            period_start: digestData.period.start,
            period_end: digestData.period.end,
            recipient_count: subscribers.length,
          })
        )
      : null;

    if (subscribers.length > 0 && !paidCampaignId) {
      Sentry.captureMessage("Paid campaign creation failed — sends will proceed without audit trail", {
        level: "warning",
        tags: { service: "email", campaign: "weekly_paid" },
      });
    }

    // Step 4: Send paid briefings in batches (each batch is its own step
    // with independent retry and timeout)
    for (let i = 0; i < subscribers.length; i += PAID_BATCH_SIZE) {
      const batch = subscribers.slice(i, i + PAID_BATCH_SIZE);
      const batchNum = Math.floor(i / PAID_BATCH_SIZE) + 1;
      const batchResult = await step.run(
        `send-paid-batch-${batchNum}`,
        () => sendPaidBriefings(batch, paidCampaignId)
      );
      paidResults.sent += batchResult.sent;
      paidResults.failed += batchResult.failed;
    }

    // Step 5: Update campaign status
    if (paidCampaignId) {
      await step.run("update-paid-campaign-status", () =>
        updateCampaignStatus(
          paidCampaignId,
          paidResults.failed === paidResults.total ? "failed" : "sent"
        )
      );
    }

    // Step 6: Send free newsletters (same content, per-subscriber unsub)
    const freeResults = await step.run(
      "send-free-newsletters",
      () => sendFreeNewsletters(digestData, newsletterContent)
    );

    const results = { paid: paidResults, free: freeResults };
    console.log(`[send-weekly] Complete: ${JSON.stringify(results)}`);
    return results;
  }
);
