import { NextRequest } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { adminClient } from "@/lib/supabase/admin";
import { track } from "@/lib/analytics";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Server misconfigured", { status: 500 });
  }

  // Read raw body FIRST, before anything else
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // Process events — always return 200 after signature is verified
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_failed":
        console.warn(
          `[stripe/webhook] Payment failed (${event.id}) for customer:`,
          (event.data.object as Stripe.Invoice).customer
        );
        break;

      default:
        console.log(`[stripe/webhook] Unhandled event: ${event.type} (${event.id})`);
    }
  } catch (err) {
    // Log but still return 200 — Stripe shouldn't retry on our DB errors
    console.error(`[stripe/webhook] Error processing ${event.type} (${event.id}):`, err);
  }

  return new Response("OK", { status: 200 });
}

// --- Helpers ---

function resolveCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

async function getUserByStripeCustomerId(customerId: string) {
  const { data, error } = await adminClient
    .from("users")
    .select("id, email, access_level")
    .eq("stripe_customer_id", customerId)
    .single();

  if (error || !data) {
    console.error(
      `[stripe/webhook] No user found for Stripe customer ${customerId}`
    );
    return null;
  }

  return data;
}

// --- Event Handlers ---

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const customerId = resolveCustomerId(session.customer);

  if (!userId || !customerId) {
    console.error("[stripe/webhook] checkout.session.completed missing userId or customerId");
    return;
  }

  // Retrieve subscription to get authoritative trial_end and subscription ID
  let trialEndsAt: string | null = null;
  let subscriptionId: string | null = null;

  if (session.subscription) {
    subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;

    const sub = await getStripe().subscriptions.retrieve(subscriptionId);
    if (sub.trial_end) {
      trialEndsAt = new Date(sub.trial_end * 1000).toISOString();
    }
  }

  const { error } = await adminClient
    .from("users")
    .update({
      access_level: "monitor",
      max_products: 5,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      trial_ends_at: trialEndsAt,
    })
    .eq("id", userId);

  if (error) {
    console.error("[stripe/webhook] Failed to update user:", error.message);
    return;
  }

  // Link email_subscribers record if exists (match by email)
  const { data: user } = await adminClient
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();

  if (user?.email) {
    await adminClient
      .from("email_subscribers")
      .update({ user_id: userId })
      .eq("email", user.email)
      .is("user_id", null);
  }

  track(userId, "subscription_activated", {
    plan: "monitor",
    has_trial: !!trialEndsAt,
    revenue: 99,
    currency: "usd",
  });

  console.log(`[stripe/webhook] User ${userId} upgraded to monitor`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = resolveCustomerId(subscription.customer);
  if (!customerId) return;

  const user = await getUserByStripeCustomerId(customerId);
  if (!user) return;

  // active, trialing, past_due = keep access (Stripe handles dunning for past_due)
  const activeStatuses = ["active", "trialing", "past_due"];
  if (activeStatuses.includes(subscription.status)) {
    // Only set max_products on free→paid transition to avoid overwriting custom limits
    const updates: Record<string, unknown> = {
      access_level: "monitor",
      stripe_subscription_id: subscription.id,
    };
    if (user.access_level === "free") {
      updates.max_products = 5;
    }
    await adminClient.from("users").update(updates).eq("id", user.id);
  } else {
    // canceled, unpaid, incomplete_expired — downgrade
    await adminClient
      .from("users")
      .update({
        access_level: "free",
        max_products: 1,
        trial_ends_at: null,
        stripe_subscription_id: null,
      })
      .eq("id", user.id);

    track(user.id, "subscription_downgraded", {
      reason: subscription.status,
      revenue: 0,
      currency: "usd",
    });

    console.log(`[stripe/webhook] User ${user.id} downgraded to free (status: ${subscription.status})`);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = resolveCustomerId(subscription.customer);
  if (!customerId) return;

  const user = await getUserByStripeCustomerId(customerId);
  if (!user) return;

  await adminClient
    .from("users")
    .update({
      access_level: "free",
      max_products: 1,
      trial_ends_at: null,
      stripe_subscription_id: null,
    })
    .eq("id", user.id);

  track(user.id, "subscription_cancelled", {
    revenue: 0,
    currency: "usd",
  });

  console.log(`[stripe/webhook] User ${user.id} subscription deleted — reset to free`);
}
