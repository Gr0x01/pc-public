import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";

const SignupSchema = z.object({
  email: z.string().email("Invalid email address"),
  first_name: z.string().min(1, "First name is required").max(50),
  last_name: z.string().min(1, "Last name is required").max(50),
  company: z.string().min(1, "Company name is required").max(200),
  feedback_consent: z.literal(true, {
    message: "You must agree to the pilot terms",
  }),
});

export async function POST(request: Request) {
  // 1. Rate limit (5 requests/min per IP)
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (!checkRateLimit(`signup:${ip}`, 5)) {
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

  const email = result.data.email.trim().toLowerCase();
  const { first_name, last_name, company } = result.data;

  // 3. Upsert email_subscribers (insert or reactivate)
  const { data: existing } = await adminClient
    .from("email_subscribers")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    if (existing.status !== "active") {
      const { error: reactivateError } = await adminClient
        .from("email_subscribers")
        .update({ status: "active", source: "signup_form", unsubscribed_at: null })
        .eq("id", existing.id);

      if (reactivateError) {
        console.error("[signup] DB reactivation error:", reactivateError);
        return Response.json(
          { error: { message: "Failed to sign up. Please try again." } },
          { status: 500 }
        );
      }
    } else {
      // Already active — upgrade source (e.g. newsletter → signup_form)
      await adminClient
        .from("email_subscribers")
        .update({ source: "signup_form" })
        .eq("id", existing.id);
    }
  } else {
    const unsubscribe_token = crypto.randomUUID();
    const { error } = await adminClient.from("email_subscribers").insert({
      email,
      status: "active",
      source: "signup_form",
      unsubscribe_token,
    });

    if (error) {
      // Race condition: another request inserted this email concurrently
      if (error.code === "23505") {
        // Proceed to OTP — subscriber exists
      } else {
        console.error("[signup] DB insert error:", error);
        return Response.json(
          { error: { message: "Failed to sign up. Please try again." } },
          { status: 500 }
        );
      }
    }
  }

  // 4. Send magic link via Supabase Auth (creates user if needed)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error: otpError } = await adminClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      shouldCreateUser: true,
      data: {
        first_name,
        last_name,
        company_name: company,
        pilot_feedback_consent: true,
        terms_version: "2026-03",
      },
    },
  });

  if (otpError) {
    console.error("[signup] OTP error:", otpError);
    return Response.json(
      { error: { message: "Failed to send magic link. Please try again." } },
      { status: 500 }
    );
  }

  return Response.json({ data: { message: "magic_link_sent" }, error: null });
}
