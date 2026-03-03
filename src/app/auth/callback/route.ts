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

  const { error: upsertError } = await adminClient.from("users").upsert(
    { id: user.id, email: user.email! },
    { onConflict: "id", ignoreDuplicates: false }
  );

  if (upsertError) {
    console.error("[auth/callback] users upsert failed:", upsertError.message);
  }

  return NextResponse.redirect(`${origin}/app/dashboard`);
}
