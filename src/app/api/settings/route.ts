import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { track } from "@/lib/analytics";
import { getStripe } from "@/lib/stripe";
import { z } from "zod";

import { isDev, DEV_USER_ID } from "@/lib/dev";

const ProfileSchema = z
  .object({
    first_name: z.string().min(1, "First name is required").max(100),
    last_name: z.string().min(1, "Last name is required").max(100),
    company_name: z.string().min(1, "Company name is required").max(300),
    role: z.string().max(100).nullish(),
    fei_number: z
      .string()
      .regex(/^\d{7,10}$/, "FEI must be 7-10 digits")
      .nullish()
      .or(z.literal("")),
    email_opted_out: z.boolean(),
  })
  .partial();

async function getAuthUserId(): Promise<string | null> {
  if (isDev) return DEV_USER_ID;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function PATCH(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json(
      { error: { message: "Authentication required." } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const parsed = ProfileSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { message: parsed.error.issues[0]?.message ?? "Invalid input" } },
      { status: 400 }
    );
  }

  const { first_name, last_name, company_name, role, fei_number, email_opted_out } = parsed.data;

  // Build update payload from provided fields only
  const updatePayload: Record<string, unknown> = {};
  if (first_name !== undefined) updatePayload.first_name = first_name;
  if (last_name !== undefined) updatePayload.last_name = last_name;
  if (company_name !== undefined) updatePayload.company_name = company_name;
  if (role !== undefined) updatePayload.role = role || null;
  if (fei_number !== undefined) updatePayload.fei_number = fei_number || null;
  if (email_opted_out !== undefined) updatePayload.email_opted_out = email_opted_out;

  if (Object.keys(updatePayload).length === 0) {
    return Response.json({ success: true });
  }

  const { error } = await adminClient
    .from("users")
    .update(updatePayload)
    .eq("id", userId);

  if (error) {
    console.error("[settings] update failed:", error.message);
    return Response.json(
      { error: { message: "Failed to save profile." } },
      { status: 500 }
    );
  }

  track(userId, "profile_updated", {
    has_role: !!role,
    has_fei: !!fei_number,
  });

  return Response.json({ success: true });
}

export async function DELETE() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json(
      { error: { message: "Authentication required." } },
      { status: 401 }
    );
  }

  // Look up Stripe IDs before deleting
  const { data: user } = await adminClient
    .from("users")
    .select("stripe_subscription_id, stripe_customer_id")
    .eq("id", userId)
    .single();

  // Cancel Stripe subscription if exists
  if (user?.stripe_subscription_id) {
    try {
      await getStripe().subscriptions.cancel(user.stripe_subscription_id);
    } catch (err) {
      console.error("[settings] stripe subscription cancel failed:", err);
    }
  }

  // Delete Stripe customer if exists
  if (user?.stripe_customer_id) {
    try {
      await getStripe().customers.del(user.stripe_customer_id);
    } catch (err) {
      console.error("[settings] stripe customer delete failed:", err);
    }
  }

  // Delete from Supabase auth — cascades to users table and all FK-dependent rows
  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) {
    console.error("[settings] account deletion failed:", error.message);
    return Response.json(
      { error: { message: "Failed to delete account." } },
      { status: 500 }
    );
  }

  track(userId, "account_deleted");

  return Response.json({ success: true });
}
