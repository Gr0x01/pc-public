import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { adminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// One-click unsubscribe for free newsletter (CAN-SPAM compliance)
// ---------------------------------------------------------------------------
// GET /api/email/unsubscribe?token=<unsubscribe_token>
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await checkRateLimit(`unsub:${ip}`, 10))) {
    return new Response(unsubscribePage("Too many requests. Please wait a moment."), {
      status: 429,
      headers: { "Content-Type": "text/html" },
    });
  }

  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return new Response(unsubscribePage("Invalid unsubscribe link."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  // 1. Try free newsletter subscriber (email_subscribers table)
  const { data, error } = await adminClient
    .from("email_subscribers")
    .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("id")
    .single();

  if (!error && data) {
    console.log(`[unsubscribe] Newsletter unsubscribed via token: ${data.id}`);
    return new Response(
      unsubscribePage("You've been unsubscribed from Policy Canary Weekly. You can close this tab."),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }

  // 2. Try paid user (users table — email_unsubscribe_token)
  const { data: paidUser } = await adminClient
    .from("users")
    .select("id")
    .eq("email_unsubscribe_token", token)
    .single();

  if (paidUser) {
    // Set email_opted_out — stops emails without affecting subscription/access_level
    const { error: updateErr } = await adminClient
      .from("users")
      .update({ email_opted_out: true })
      .eq("id", paidUser.id);

    if (updateErr) {
      console.error(`[unsubscribe] Failed to opt out paid user ${paidUser.id}:`, updateErr);
      return new Response(
        unsubscribePage("Something went wrong. Please try again or contact support@policycanary.io."),
        { status: 500, headers: { "Content-Type": "text/html" } }
      );
    }

    console.log(`[unsubscribe] Paid user ${paidUser.id} opted out of product emails`);
    return new Response(
      unsubscribePage(
        "You've been unsubscribed from product alerts and briefings. " +
        "Your account and subscription remain active — you can re-enable notifications from your dashboard."
      ),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }

  return new Response(
    unsubscribePage("Invalid or expired unsubscribe link. Contact support@policycanary.io if you need help."),
    { status: 400, headers: { "Content-Type": "text/html" } }
  );
}

// Also support POST for List-Unsubscribe-Post (RFC 8058)
export async function POST(request: NextRequest) {
  return GET(request);
}

function unsubscribePage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Unsubscribe — Policy Canary</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #F8FAFC; color: #334155; }
    .card { max-width: 400px; padding: 40px; text-align: center; }
    p { font-size: 16px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <p>${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
  </div>
</body>
</html>`;
}
