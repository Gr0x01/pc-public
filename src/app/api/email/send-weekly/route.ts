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
import { compileBriefing, compileNewsletter } from "@/lib/email/compiler";
import { sendEmail, sendBatch } from "@/lib/email/sender";
import { SITE_URL } from "@/lib/email/constants";

// ---------------------------------------------------------------------------
// Weekly Email Send — triggered by cron (Vercel cron or external)
// ---------------------------------------------------------------------------
// Vercel cron: sends Authorization: Bearer <CRON_SECRET> header automatically
// Manual:      GET /api/email/send-weekly?secret=<CRON_SECRET>
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  // Accept secret from either Authorization header (Vercel cron) or query param (manual)
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

        // Store campaign
        const campaignId = await createCampaign({
          campaign_type: "weekly_paid",
          subscriber_id: sub.user_id,
          subject_line: subject,
          html_content: html,
          period_start: briefingData.period.start,
          period_end: briefingData.period.end,
          recipient_count: 1,
        });

        // Send (paid emails: manage subscription via Stripe portal)
        const portalUrl = `${SITE_URL}/api/stripe/portal`;
        const result = await sendEmail({
          to: sub.email, subject, html,
          headers: {
            "List-Unsubscribe": `<${portalUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });

        if (campaignId) {
          await recordEmailSend({
            campaign_id: campaignId,
            subscriber_id: sub.user_id,
            provider_message_id: result.messageId,
            status: result.success ? "sent" : "queued",
          });
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
  // 2. Free newsletter (same content for all)
  // -------------------------------------------------------------------------
  try {
    const [digestData, newsletterSubs] = await Promise.all([
      getWeeklyDigestData(),
      getNewsletterSubscribers(),
    ]);

    results.free.total = newsletterSubs.length;

    if (newsletterSubs.length > 0 && digestData.items.length > 0) {
      // Compile one template (same for all, except unsubscribe_url)
      // For batch, use a placeholder unsub URL — Resend doesn't support per-recipient vars in batch
      // So we send individually for proper unsubscribe tokens
      const campaignId = await createCampaign({
        campaign_type: "weekly_free",
        subject_line: `Week in FDA: ${digestData.total_items} regulatory actions`,
        html_content: "", // filled per-send
        period_start: digestData.period.start,
        period_end: digestData.period.end,
        recipient_count: newsletterSubs.length,
      });

      for (const sub of newsletterSubs) {
        try {
          const token = sub.unsubscribe_token ?? sub.id;
          const unsubscribe_url = `${SITE_URL}/api/email/unsubscribe?token=${token}`;
          const { subject, html } = await compileNewsletter(
            digestData,
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
