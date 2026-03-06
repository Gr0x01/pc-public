import "server-only";
import { cache } from "react";
import { createClient } from "./server";
import { adminClient } from "./admin";

/**
 * React cache()-wrapped auth check. Deduplicates across layout + page
 * within the same server render pass. Returns null if not authenticated.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Cached user DB row lookup (onboarding status, access level, etc).
 * Deduplicates within the same render pass — layout + page won't double-query.
 */
export const getDbUser = cache(async (userId: string) => {
  const { data } = await adminClient
    .from("users")
    .select("first_name, last_name, company_name, role, fei_number, onboarding_completed_at, access_level, max_products, stripe_customer_id, stripe_subscription_id, email_opted_out, created_at")
    .eq("id", userId)
    .single();
  return data;
});
