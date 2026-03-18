import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  getActiveSubscribers,
  createCampaign,
  updateCampaignStatus,
} from "@/lib/email/queries";
import {
  generateWeeklyContent,
  sendPaidBriefings,
  sendFreeNewsletters,
} from "@/lib/email/send-weekly-core";

// ---------------------------------------------------------------------------
// Weekly Email Send — manual trigger (Inngest handles the cron schedule)
// ---------------------------------------------------------------------------
// POST /api/email/send-weekly  (Authorization: Bearer <CRON_SECRET>)
// ---------------------------------------------------------------------------

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const secret = request.headers.get("authorization")?.replace("Bearer ", "");

  const secretsMatch =
    secret &&
    cronSecret.length === secret.length &&
    timingSafeEqual(Buffer.from(cronSecret), Buffer.from(secret));

  if (!secretsMatch) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { digestData, newsletterContent } = await generateWeeklyContent();

  // Create one campaign for all paid briefings, then send
  const subscribers = await getActiveSubscribers();
  const paidCampaignId = subscribers.length > 0
    ? await createCampaign({
        campaign_type: "weekly_paid",
        subject_line: "Weekly Product Intelligence Briefing",
        html_content: "",
        period_start: digestData.period.start,
        period_end: digestData.period.end,
        recipient_count: subscribers.length,
      })
    : null;

  const paid = await sendPaidBriefings(subscribers, paidCampaignId);
  if (paidCampaignId) {
    await updateCampaignStatus(paidCampaignId, paid.failed === paid.total ? "failed" : "sent");
  }

  const free = await sendFreeNewsletters(digestData, newsletterContent);

  const results = { paid, free };
  console.log("[send-weekly] Complete:", results);
  return Response.json({ ok: true, results });
}
