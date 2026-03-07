import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { track } from "@/lib/analytics";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!(await checkRateLimit(`sync:${user.id}`, 10))) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  const meta = user.user_metadata ?? {};

  // Check if user already exists — only grant pilot access on first login
  const { data: existingUser } = await adminClient
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingUser) {
    // Existing user — update email only, preserve onboarding profile data
    const { error: updateError } = await adminClient
      .from("users")
      .update({ email: user.email! })
      .eq("id", user.id);

    if (updateError) {
      console.error("[auth/sync-user] users update failed:", updateError.message);
    }
  } else {
    // New user — grant pilot access
    const isPilot = meta.pilot_feedback_consent === true;

    const { error: insertError } = await adminClient.from("users").insert({
      id: user.id,
      email: user.email!,
      first_name: meta.first_name ?? null,
      last_name: meta.last_name ?? null,
      company_name: meta.company_name ?? null,
      pilot_feedback_consent: isPilot,
      pilot_consented_at: isPilot ? new Date().toISOString() : null,
      terms_version: meta.terms_version ?? null,
      access_level: "monitor",
      max_products: 5,
    });

    if (insertError) {
      console.error("[auth/sync-user] users insert failed:", insertError.message);
    }
  }

  // Link email_subscribers to this user
  const { error: linkError } = await adminClient
    .from("email_subscribers")
    .update({ user_id: user.id })
    .eq("email", user.email!)
    .is("user_id", null);

  if (linkError) {
    console.error("[auth/sync-user] email_subscribers link failed:", linkError.message);
  }

  track(user.id, "user_login", { is_new: !existingUser });

  return NextResponse.json({ ok: true });
}
