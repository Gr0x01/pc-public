import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";
import { track } from "@/lib/analytics";

const NewsletterSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: Request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (!checkRateLimit(`newsletter:${ip}`, 5)) {
    return Response.json(
      { error: { message: "Too many requests. Please wait a moment." } },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const result = NewsletterSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: result.error.flatten() },
      { status: 400 }
    );
  }

  const email = result.data.email.trim().toLowerCase();

  // Upsert — insert or reactivate
  const { data: existing } = await adminClient
    .from("email_subscribers")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    if (existing.status !== "active") {
      const { error } = await adminClient
        .from("email_subscribers")
        .update({ status: "active", unsubscribed_at: null })
        .eq("id", existing.id);

      if (error) {
        console.error("[newsletter] DB reactivation error:", error);
        return Response.json(
          { error: { message: "Something went wrong. Please try again." } },
          { status: 500 }
        );
      }
    }
    // Already active — no-op, return success
  } else {
    const { error } = await adminClient.from("email_subscribers").insert({
      email,
      status: "active",
      source: "newsletter",
      unsubscribe_token: crypto.randomUUID(),
    });

    if (error) {
      // Race condition: another request inserted this email concurrently
      if (error.code === "23505") {
        return Response.json({ data: { subscribed: true }, error: null });
      }
      console.error("[newsletter] DB insert error:", error);
      return Response.json(
        { error: { message: "Something went wrong. Please try again." } },
        { status: 500 }
      );
    }
  }

  track(null, "newsletter_signup", { source: "newsletter" });

  return Response.json({ data: { subscribed: true }, error: null });
}
