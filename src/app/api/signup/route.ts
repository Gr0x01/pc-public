import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";

const SignupSchema = z.object({
  email: z.string().email("Invalid email address"),
  // name is collected for UX warmth but not persisted (no DB column until Phase 4 user accounts)
  name: z.string().max(100).optional(),
  // source is ignored from client — pinned to "signup_form" server-side for data integrity
});

// In-memory rate limiter (MVP only — upgrade to Redis/Upstash for production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  // 1. Rate limit (5 requests/min per IP)
  // Fail open when IP is unresolvable — do not group all unknown callers under one bucket
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim();

  if (ip && !checkRateLimit(ip)) {
    return Response.json(
      { error: { message: "Too many requests. Please wait a moment." } },
      { status: 429 }
    );
  }

  // 2. Validate input
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const result = SignupSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: result.error.flatten() },
      { status: 400 }
    );
  }

  const { email } = result.data;

  // 3. Check for existing subscriber
  const { data: existing } = await adminClient
    .from("email_subscribers")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    if (existing.status === "active") {
      return Response.json({ data: { message: "already_subscribed" }, error: null });
    }
    // Reactivate unsubscribed user
    const { error: reactivateError } = await adminClient
      .from("email_subscribers")
      .update({ status: "active", unsubscribed_at: null })
      .eq("id", existing.id);

    if (reactivateError) {
      console.error("[signup] DB reactivation error:", reactivateError);
      return Response.json(
        { error: { message: "Failed to resubscribe. Please try again." } },
        { status: 500 }
      );
    }
    return Response.json({ data: { message: "reactivated" }, error: null });
  }

  // 4. Insert new subscriber
  // source pinned server-side — never accept from client
  // crypto.randomUUID() returns 36-char UUID (satisfies >= 32 char constraint)
  const unsubscribe_token = crypto.randomUUID();

  const { error } = await adminClient.from("email_subscribers").insert({
    email,
    status: "active",
    source: "signup_form",
    unsubscribe_token,
  });

  if (error) {
    console.error("[signup] DB insert error:", error);
    return Response.json(
      { error: { message: "Failed to subscribe. Please try again." } },
      { status: 500 }
    );
  }

  return Response.json({ data: { message: "subscribed" }, error: null });
}
