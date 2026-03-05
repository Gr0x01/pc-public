import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("[auth/callback] PKCE exchange failed:", error?.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const user = data.user;
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
      console.error("[auth/callback] users update failed:", updateError.message);
    }
  } else {
    // New user — grant pilot access
    const isPilot = meta.pilot_feedback_consent === true;

    const { error: insertError } = await adminClient.from("users").insert({
      id: user.id,
      email: user.email!,
      name: meta.name ?? null,
      company_name: meta.company_name ?? null,
      pilot_feedback_consent: isPilot,
      pilot_consented_at: isPilot ? new Date().toISOString() : null,
      terms_version: meta.terms_version ?? null,
      access_level: "monitor",
      max_products: 5,
    });

    if (insertError) {
      console.error("[auth/callback] users insert failed:", insertError.message);
    }
  }

  // Link email_subscribers to this user
  const { error: linkError } = await adminClient
    .from("email_subscribers")
    .update({ user_id: user.id })
    .eq("email", user.email!)
    .is("user_id", null);

  if (linkError) {
    console.error("[auth/callback] email_subscribers link failed:", linkError.message);
  }

  // Redirect based on next param — allowlisted values only
  const VALID_NEXT = new Set(["checkout", "onboarding"]);
  const next = searchParams.get("next");
  if (next && VALID_NEXT.has(next)) {
    if (next === "checkout") {
      return NextResponse.redirect(`${origin}/app/feed?checkout=start`);
    }
    if (next === "onboarding") {
      return NextResponse.redirect(`${origin}/app/onboarding`);
    }
  }

  return NextResponse.redirect(`${origin}/app/feed`);
}
