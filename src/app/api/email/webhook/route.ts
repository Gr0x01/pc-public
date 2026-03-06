import { NextRequest } from "next/server";
import { timingSafeEqual as nodeTimingSafeEqual } from "node:crypto";
import { adminClient } from "@/lib/supabase/admin";
import { track } from "@/lib/analytics";

// ---------------------------------------------------------------------------
// Resend Webhook — delivery tracking, bounce/complaint management
// ---------------------------------------------------------------------------
// Events: https://resend.com/docs/dashboard/webhooks/event-types
// Verify via svix signature (Resend uses svix under the hood)
// ---------------------------------------------------------------------------

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    to: string[];
    from: string;
    subject: string;
    created_at: string;
  };
}

export async function POST(request: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error("[email/webhook] RESEND_WEBHOOK_SECRET not configured");
    return new Response("Server misconfigured", { status: 500 });
  }

  // Verify svix signature
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await request.text();

  // Verify timestamp is within 5 minutes (replay protection)
  const ts = parseInt(svixTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) {
    return new Response("Timestamp too old", { status: 400 });
  }

  // Verify HMAC signature
  const signedContent = `${svixId}.${svixTimestamp}.${body}`;
  const verified = await verifySignature(signedContent, svixSignature, WEBHOOK_SECRET);
  if (!verified) {
    console.error("[email/webhook] Signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  // Process event — always return 200 after signature verification
  try {
    const event: ResendWebhookEvent = JSON.parse(body);
    await handleEvent(event);
  } catch (err) {
    console.error("[email/webhook] Error processing event:", err);
  }

  return new Response("OK", { status: 200 });
}

// ---------------------------------------------------------------------------
// Event handler
// ---------------------------------------------------------------------------

async function handleEvent(event: ResendWebhookEvent): Promise<void> {
  const messageId = event.data.email_id;
  if (!messageId) return;

  const email = event.data.to?.[0];

  // Look up the send record to get subscriber context for PostHog
  const { data: sendRecord } = await adminClient
    .from("email_sends")
    .select("id, subscriber_id, campaign_id")
    .eq("provider_message_id", messageId)
    .single();

  switch (event.type) {
    case "email.delivered": {
      if (sendRecord) {
        await adminClient
          .from("email_sends")
          .update({ status: "delivered", delivered_at: event.created_at })
          .eq("id", sendRecord.id);
      }
      trackEmailEvent("email_delivered", sendRecord, email, event);
      break;
    }

    case "email.opened": {
      if (sendRecord) {
        // Only set opened_at on first open
        await adminClient
          .from("email_sends")
          .update({ status: "opened", opened_at: event.created_at })
          .eq("id", sendRecord.id)
          .is("opened_at", null);
      }
      trackEmailEvent("email_opened", sendRecord, email, event);
      break;
    }

    case "email.clicked": {
      if (sendRecord) {
        // Only set clicked_at on first click
        await adminClient
          .from("email_sends")
          .update({ status: "clicked", clicked_at: event.created_at })
          .eq("id", sendRecord.id)
          .is("clicked_at", null);
      }
      trackEmailEvent("email_clicked", sendRecord, email, event);
      break;
    }

    case "email.bounced":
    case "email.complained": {
      const status = event.type === "email.bounced" ? "bounced" : "complained";
      if (sendRecord) {
        await adminClient
          .from("email_sends")
          .update({ status, bounce_type: status })
          .eq("id", sendRecord.id);
      }

      // Deactivate newsletter subscriber
      if (email) {
        await adminClient
          .from("email_subscribers")
          .update({ status: "unsubscribed" })
          .eq("email", email);
        console.warn(`[email/webhook] ${status}: deactivated subscriber ${email}`);
      }

      trackEmailEvent(`email_${status}`, sendRecord, email, event);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// PostHog tracking helper
// ---------------------------------------------------------------------------

function trackEmailEvent(
  eventName: string,
  sendRecord: { subscriber_id: string; campaign_id: string } | null,
  email: string | undefined,
  event: ResendWebhookEvent
) {
  track(sendRecord?.subscriber_id ?? null, eventName, {
    email_id: event.data.email_id,
    subject: event.data.subject,
    campaign_id: sendRecord?.campaign_id,
    ...(email ? { recipient: email } : {}),
  });
}

// ---------------------------------------------------------------------------
// Svix HMAC verification
// ---------------------------------------------------------------------------

async function verifySignature(
  content: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  // Resend/Svix secret is base64-encoded with "whsec_" prefix
  const secretBytes = base64ToBytes(secret.replace("whsec_", "")) as Uint8Array<ArrayBuffer>;

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const contentBytes = new TextEncoder().encode(content);
  const signatureBytes = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, contentBytes)
  );
  const expectedSignature = bytesToBase64(signatureBytes);

  // Svix sends multiple signatures separated by space, each prefixed with "v1,"
  const signatures = signatureHeader.split(" ");
  for (const sig of signatures) {
    const [version, value] = sig.split(",");
    if (version === "v1" && value) {
      if (
        expectedSignature.length === value.length &&
        timingSafeEqual(expectedSignature, value)
      ) {
        return true;
      }
    }
  }

  return false;
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return nodeTimingSafeEqual(bufA, bufB);
}
