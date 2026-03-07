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
import type { WeeklyDigestData, EmailSubscriber } from "@/lib/email/queries";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface SendResults {
  total: number;
  sent: number;
  failed: number;
}

export interface WeeklyContentResult {
  digestData: WeeklyDigestData;
  newsletterContent: NewsletterContent | null;
}

// ---------------------------------------------------------------------------
// Step 1: Generate newsletter content (LLM calls, done once for all subs)
// ---------------------------------------------------------------------------

export async function generateWeeklyContent(): Promise<WeeklyContentResult> {
  const digestData = await getWeeklyDigestData();
  let newsletterContent: NewsletterContent | null = null;

  if (digestData.items.length > 0) {
    newsletterContent = await generateNewsletterContent(digestData);
  }

  console.log(
    `[send-weekly] Newsletter content generated: ${digestData.total_items} items, subject: ${newsletterContent?.subject ?? "N/A"}`
  );

  return { digestData, newsletterContent };
}

// ---------------------------------------------------------------------------
// Step 2: Send paid briefings (personalized per subscriber)
// ---------------------------------------------------------------------------

export async function sendPaidBriefings(
  subscribers?: EmailSubscriber[]
): Promise<SendResults> {
  const results: SendResults = { total: 0, sent: 0, failed: 0 };
  const subs = subscribers ?? await getActiveSubscribers();
  results.total = subs.length;

  for (const sub of subs) {
    try {
      const briefingData = await getBriefingData(sub.user_id);
      if (!briefingData) {
        console.warn(`[send-weekly] No briefing data for ${sub.user_id}, skipping`);
        continue;
      }

      const { subject, html } = await compileBriefing(briefingData);

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
        await updateCampaignStatus(
          campaignId,
          result.success ? "sent" : "failed"
        );
      }

      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        console.error(`[send-weekly] Failed for ${sub.email}:`, result.error);
      }
    } catch (err) {
      results.failed++;
      console.error(`[send-weekly] Error for subscriber ${sub.user_id}:`, err);
    }
  }

  console.log(`[send-weekly] Paid briefings: ${JSON.stringify(results)}`);
  return results;
}

// ---------------------------------------------------------------------------
// Step 3: Send free newsletters (same content, per-subscriber unsub)
// ---------------------------------------------------------------------------

export async function sendFreeNewsletters(
  digestData: WeeklyDigestData,
  newsletterContent: NewsletterContent | null
): Promise<SendResults> {
  const results: SendResults = { total: 0, sent: 0, failed: 0 };

  if (!newsletterContent || digestData.items.length === 0) {
    console.log("[send-weekly] No newsletter content or items, skipping free sends");
    return results;
  }

  const newsletterSubs = await getNewsletterSubscribers();
  results.total = newsletterSubs.length;

  if (newsletterSubs.length === 0) {
    console.log("[send-weekly] No newsletter subscribers");
    return results;
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
        results.sent++;
      } else {
        results.failed++;
      }
    } catch (err) {
      results.failed++;
      console.error(`[send-weekly] Newsletter error for ${sub.email}:`, err);
    }
  }

  if (campaignId) {
    await updateCampaignStatus(
      campaignId,
      results.failed === results.total ? "failed" : "sent"
    );
  }

  console.log(`[send-weekly] Free newsletters: ${JSON.stringify(results)}`);
  return results;
}
