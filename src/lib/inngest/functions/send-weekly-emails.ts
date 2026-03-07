import { inngest } from "../client";
import {
  getActiveSubscribers,
  getNewsletterSubscribers,
  getBriefingData,
  getWeeklyDigestData,
  createCampaign,
  recordEmailSend,
  updateCampaignStatus,
} from "@/lib/email/queries";
import {
  compileBriefing,
  generateNewsletterContent,
  renderNewsletter,
  type NewsletterContent,
} from "@/lib/email/compiler";
import { sendEmail } from "@/lib/email/sender";
import { SITE_URL } from "@/lib/email/constants";

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

    // -----------------------------------------------------------------
    // Step 1: Generate newsletter content (2 LLM calls, done once)
    // -----------------------------------------------------------------
    const { digestData, newsletterContent } = await step.run(
      "generate-newsletter-content",
      async () => {
        const data = await getWeeklyDigestData();
        let content: NewsletterContent | null = null;

        if (data.items.length > 0) {
          content = await generateNewsletterContent(data);
        }

        console.log(
          `[send-weekly] Newsletter content generated: ${data.total_items} items, subject: ${content?.subject ?? "N/A"}`
        );

        return {
          digestData: data,
          newsletterContent: content,
        };
      }
    );

    // -----------------------------------------------------------------
    // Step 2: Send paid briefings (personalized per subscriber)
    // -----------------------------------------------------------------
    const paidResults = await step.run("send-paid-briefings", async () => {
      const paid = { total: 0, sent: 0, failed: 0 };
      const subscribers = await getActiveSubscribers();
      paid.total = subscribers.length;

      for (const sub of subscribers) {
        try {
          const briefingData = await getBriefingData(sub.user_id);
          if (!briefingData) {
            console.warn(
              `[send-weekly] No briefing data for ${sub.user_id}, skipping`
            );
            continue;
          }

          const { subject, html } = await compileBriefing(briefingData);

          // subscriber_id omitted — FK references email_subscribers(id), not users(id)
          const campaignId = await createCampaign({
            campaign_type: "weekly_paid",
            subject_line: subject,
            html_content: html,
            period_start: briefingData.period.start,
            period_end: briefingData.period.end,
            recipient_count: 1,
          });

          const unsubUrl = `${SITE_URL}/api/email/unsubscribe?token=${sub.email_unsubscribe_token}`;
          const result = await sendEmail({
            to: sub.email,
            subject,
            html,
            headers: {
              "List-Unsubscribe": `<${unsubUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          });

          if (campaignId) {
            // paid subscribers may not have an email_subscribers row — skip recordEmailSend
            // (email_sends.subscriber_id also FK → email_subscribers)
            await updateCampaignStatus(
              campaignId,
              result.success ? "sent" : "failed"
            );
          }

          if (result.success) {
            paid.sent++;
          } else {
            paid.failed++;
            console.error(
              `[send-weekly] Failed for ${sub.email}:`,
              result.error
            );
          }
        } catch (err) {
          paid.failed++;
          console.error(
            `[send-weekly] Error for subscriber ${sub.user_id}:`,
            err
          );
        }
      }

      console.log(`[send-weekly] Paid briefings: ${JSON.stringify(paid)}`);
      return paid;
    });

    results.paid = paidResults;

    // -----------------------------------------------------------------
    // Step 3: Send free newsletters (same content, per-subscriber unsub)
    // -----------------------------------------------------------------
    const freeResults = await step.run("send-free-newsletters", async () => {
      const free = { total: 0, sent: 0, failed: 0 };

      if (!newsletterContent || digestData.items.length === 0) {
        console.log("[send-weekly] No newsletter content or items, skipping free sends");
        return free;
      }

      const newsletterSubs = await getNewsletterSubscribers();
      free.total = newsletterSubs.length;

      if (newsletterSubs.length === 0) {
        console.log("[send-weekly] No newsletter subscribers");
        return free;
      }

      const campaignId = await createCampaign({
        campaign_type: "weekly_free",
        subject_line: newsletterContent.subject,
        html_content: "",
        period_start: digestData.period.start,
        period_end: digestData.period.end,
        recipient_count: newsletterSubs.length,
      });

      for (const sub of newsletterSubs) {
        try {
          const token = sub.unsubscribe_token ?? sub.id;
          const unsubscribe_url = `${SITE_URL}/api/email/unsubscribe?token=${token}`;
          const { subject, html } = await renderNewsletter(
            digestData,
            newsletterContent,
            unsubscribe_url
          );

          const result = await sendEmail({
            to: sub.email,
            subject,
            html,
            headers: {
              "List-Unsubscribe": `<${unsubscribe_url}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          });

          if (campaignId) {
            await recordEmailSend({
              campaign_id: campaignId,
              subscriber_id: sub.id,
              provider_message_id: result.messageId,
              status: result.success ? "sent" : "queued",
            });
          }

          if (result.success) {
            free.sent++;
          } else {
            free.failed++;
          }
        } catch (err) {
          free.failed++;
          console.error(
            `[send-weekly] Newsletter error for ${sub.email}:`,
            err
          );
        }
      }

      if (campaignId) {
        await updateCampaignStatus(
          campaignId,
          free.failed === free.total ? "failed" : "sent"
        );
      }

      console.log(`[send-weekly] Free newsletters: ${JSON.stringify(free)}`);
      return free;
    });

    results.free = freeResults;

    console.log(`[send-weekly] Complete: ${JSON.stringify(results)}`);
    return results;
  }
);
