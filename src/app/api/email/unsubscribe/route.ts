import { NextRequest } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// One-click unsubscribe for free newsletter (CAN-SPAM compliance)
// ---------------------------------------------------------------------------
// GET /api/email/unsubscribe?token=<unsubscribe_token>
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return new Response(unsubscribePage("Invalid unsubscribe link."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const { data, error } = await adminClient
    .from("email_subscribers")
    .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("id")
    .single();

  if (error || !data) {
    // Fallback: try by id for legacy links
    const { data: fallback } = await adminClient
      .from("email_subscribers")
      .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
      .eq("id", token)
      .select("id")
      .single();

    if (!fallback) {
      return new Response(
        unsubscribePage("Invalid or expired unsubscribe link. Contact support@policycanary.io if you need help."),
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    console.log(`[unsubscribe] Unsubscribed via legacy id: ${fallback.id}`);
  } else {
    console.log(`[unsubscribe] Unsubscribed via token: ${data.id}`);
  }

  return new Response(
    unsubscribePage("You've been unsubscribed from Policy Canary Weekly. You can close this tab."),
    { status: 200, headers: { "Content-Type": "text/html" } }
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
