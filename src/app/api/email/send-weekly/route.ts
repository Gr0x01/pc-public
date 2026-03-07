import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
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
} from "@/lib/email/compiler";
import { sendEmail } from "@/lib/email/sender";
import { SITE_URL } from "@/lib/email/constants";

// ---------------------------------------------------------------------------
// Weekly Email Send — manual trigger (Inngest handles the cron schedule)
// ---------------------------------------------------------------------------
// GET /api/email/send-weekly?secret=<CRON_SECRET>
// ---------------------------------------------------------------------------

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const headerSecret = request.headers.get("authorization")?.replace("Bearer ", "");
  const querySecret = request.nextUrl.searchParams.get("secret");
  const secret = headerSecret || querySecret;

  const secretsMatch =
    secret &&
    cronSecret.length === secret.length &&
    timingSafeEqual(Buffer.from(cronSecret), Buffer.from(secret));

  if (!secretsMatch) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    paid: { total: 0, sent: 0, failed: 0 },
    free: { total: 0, sent: 0, failed: 0 },
  };

  // -------------------------------------------------------------------------
  // 1. Paid subscriber briefings (personalized per user)
  // -------------------------------------------------------------------------
  try {
    const subscribers = await getActiveSubscribers();
    results.paid.total = subscribers.length;

    for (const sub of subscribers) {
      try {
        const briefingData = await getBriefingData(sub.user_id);
        if (!briefingData) {
          console.warn(`[send-weekly] No briefing data for ${sub.user_id}, skipping`);
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
          to: sub.email, subject, html,
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
          results.paid.sent++;
        } else {
          results.paid.failed++;
          console.error(`[send-weekly] Failed for ${sub.email}:`, result.error);
        }
      } catch (err) {
        results.paid.failed++;
        console.error(`[send-weekly] Error for subscriber ${sub.user_id}:`, err);
      }
    }
  } catch (err) {
    console.error("[send-weekly] Paid briefing batch error:", err);
  }

  // -------------------------------------------------------------------------
  // 2. Free newsletter (generate content once, render per subscriber)
  // -------------------------------------------------------------------------
  try {
    const [digestData, newsletterSubs] = await Promise.all([
      getWeeklyDigestData(),
      getNewsletterSubscribers(),
    ]);

    results.free.total = newsletterSubs.length;

    if (newsletterSubs.length > 0 && digestData.items.length > 0) {
      // Generate LLM content once for all subscribers
      const newsletterContent = await generateNewsletterContent(digestData);

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
            to: sub.email, subject, html,
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
            results.free.sent++;
          } else {
            results.free.failed++;
          }
        } catch (err) {
          results.free.failed++;
          console.error(`[send-weekly] Newsletter error for ${sub.email}:`, err);
        }
      }

      if (campaignId) {
        await updateCampaignStatus(
          campaignId,
          results.free.failed === results.free.total ? "failed" : "sent"
        );
      }
    }
  } catch (err) {
    console.error("[send-weekly] Newsletter batch error:", err);
  }

  console.log("[send-weekly] Complete:", results);
  return Response.json({ ok: true, results });
}
