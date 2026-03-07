import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  generateWeeklyContent,
  sendPaidBriefings,
  sendFreeNewsletters,
} from "@/lib/email/send-weekly-core";

// ---------------------------------------------------------------------------
// Weekly Email Send — manual trigger (Inngest handles the cron schedule)
// ---------------------------------------------------------------------------
// GET /api/email/send-weekly  (Authorization: Bearer <CRON_SECRET>)
// ---------------------------------------------------------------------------

export const maxDuration = 300;

export async function GET(request: NextRequest) {
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

  const [paid, free] = await Promise.all([
    sendPaidBriefings(),
    sendFreeNewsletters(digestData, newsletterContent),
  ]);

  const results = { paid, free };
  console.log("[send-weekly] Complete:", results);
  return Response.json({ ok: true, results });
}
