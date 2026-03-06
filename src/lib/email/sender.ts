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

// ---------------------------------------------------------------------------
// Send batch (up to 100 per Resend API call)
// ---------------------------------------------------------------------------

export interface BatchEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendBatch(
  emails: BatchEmailParams[]
): Promise<Array<{ to: string; result: SendResult }>> {
  if (emails.length === 0) return [];

  const resend = getResend();
  const results: Array<{ to: string; result: SendResult }> = [];

  // Resend batch API supports up to 100 emails per call
  const BATCH_SIZE = 100;

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);

    try {
      const { data, error } = await resend.batch.send(
        batch.map((email) => ({
          from: FROM_ADDRESS,
          replyTo: REPLY_TO,
          to: email.to,
          subject: email.subject,
          html: email.html,
        }))
      );

      if (error) {
        console.error("[email-sender] batch error:", error);
        for (const email of batch) {
          results.push({
            to: email.to,
            result: { success: false, error: error.message },
          });
        }
        continue;
      }

      // Resend batch returns array of results matching input order
      const batchData = data?.data ?? [];
      for (let j = 0; j < batch.length; j++) {
        results.push({
          to: batch[j].to,
          result: {
            success: true,
            messageId: batchData[j]?.id,
          },
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown batch error";
      console.error("[email-sender] batch failed:", msg);
      for (const email of batch) {
        results.push({ to: email.to, result: { success: false, error: msg } });
      }
    }
  }

  return results;
}
