import { Resend } from "resend";
import { FROM_ADDRESS, REPLY_TO } from "./constants";

// ---------------------------------------------------------------------------
// Resend client (lazy init like Stripe)
// ---------------------------------------------------------------------------

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (resendInstance) return resendInstance;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable");
  }

  resendInstance = new Resend(apiKey);
  return resendInstance;
}

// ---------------------------------------------------------------------------
// Send a single email
// ---------------------------------------------------------------------------

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  /** Optional tags for Resend analytics. */
  tags?: Array<{ name: string; value: string }>;
  /** Optional headers (e.g. List-Unsubscribe). */
  headers?: Record<string, string>;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendResult> {
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      replyTo: REPLY_TO,
      to: params.to,
      subject: params.subject,
      html: params.html,
      tags: params.tags,
      headers: params.headers,
    });

    if (error) {
      console.error("[email-sender] Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown send error";
    console.error("[email-sender] send failed:", msg);
    return { success: false, error: msg };
  }
}

