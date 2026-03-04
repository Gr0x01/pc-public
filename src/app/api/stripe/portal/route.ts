import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export async function POST() {
  // 1. Auth — require logged-in user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Look up Stripe customer ID
  const { data: dbUser } = await adminClient
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!dbUser?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account found" },
      { status: 400 }
    );
  }

  // 3. Create portal session
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: dbUser.stripe_customer_id,
      return_url: `${siteUrl}/app/feed`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("[stripe/portal] Failed to create portal session:", err);
    return NextResponse.json(
      { error: "Failed to create billing session" },
      { status: 500 }
    );
  }
}
