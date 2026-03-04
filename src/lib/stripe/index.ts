import "server-only";
import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Stripe client singleton — server-only, lazily initialized.
 * Defers initialization to avoid build-time failures when env vars aren't set.
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("Missing env var: STRIPE_SECRET_KEY is required");
    }
    _stripe = new Stripe(secretKey, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return _stripe;
}
