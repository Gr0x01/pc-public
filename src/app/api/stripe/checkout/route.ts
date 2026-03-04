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

  if (!user.email) {
    return NextResponse.json(
      { error: "Account has no email address" },
      { status: 400 }
    );
  }

  // Check price ID early — before creating any Stripe resources
  const priceId = process.env.STRIPE_PRICE_MONITOR;
  if (!priceId) {
    console.error("[stripe/checkout] STRIPE_PRICE_MONITOR not configured");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  // 2. Fetch user record
  const { data: dbUser } = await adminClient
    .from("users")
    .select("stripe_customer_id, access_level")
    .eq("id", user.id)
    .single();

  // Guard against double-subscription
  if (
    dbUser?.access_level === "monitor" ||
    dbUser?.access_level === "monitor_research"
  ) {
    return NextResponse.json(
      { error: "Already subscribed" },
      { status: 400 }
    );
  }

  try {
    // 3. Get or create Stripe customer
    let stripeCustomerId = dbUser?.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;

      const { error: updateError } = await adminClient
        .from("users")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user.id);

      if (updateError) {
        // Unique constraint violation = another request already created a customer
        if (updateError.code === "23505") {
          const { data: refreshed } = await adminClient
            .from("users")
            .select("stripe_customer_id")
            .eq("id", user.id)
            .single();
          stripeCustomerId = refreshed?.stripe_customer_id ?? stripeCustomerId;
        } else {
          console.error("[stripe/checkout] Failed to persist stripe_customer_id:", updateError.message);
          return NextResponse.json(
            { error: "Failed to set up billing" },
            { status: 500 }
          );
        }
      }
    }

    // 4. Create Checkout Session
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const session = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { userId: user.id },
      },
      allow_promotion_codes: true,
      success_url: `${siteUrl}/app/feed?checkout=success`,
      cancel_url: `${siteUrl}/pricing`,
      metadata: { userId: user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
