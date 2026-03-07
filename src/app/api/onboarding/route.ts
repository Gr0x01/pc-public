import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { track } from "@/lib/analytics";
import { z } from "zod";
import { compileWelcome } from "@/lib/email/compiler";
import { sendEmail } from "@/lib/email/sender";
import { inngest } from "@/lib/inngest/client";

import { isDev, DEV_USER_ID } from "@/lib/dev";

const OnboardingSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  company_name: z.string().min(1, "Company name is required").max(300),
  role: z.string().max(100).nullish(),
  fei_number: z
    .string()
    .regex(/^\d{7,10}$/, "FEI must be 7-10 digits")
    .nullish()
    .or(z.literal("")),
});

export async function POST(request: Request) {
  // Auth
  let userId: string;
  if (isDev) {
    userId = DEV_USER_ID;
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json(
        { error: { message: "Authentication required." } },
        { status: 401 }
      );
    }
    userId = user.id;
  }

  if (!(await checkRateLimit(`onboard:${userId}`, 10))) {
    return Response.json(
      { error: { message: "Too many requests. Please wait a moment." } },
      { status: 429 }
    );
  }

  // Validate
  const body = await request.json();
  const parsed = OnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { message: parsed.error.issues[0]?.message ?? "Invalid input" } },
      { status: 400 }
    );
  }

  const { first_name, last_name, company_name, role, fei_number } = parsed.data;

  // Update user profile + mark onboarding complete
  const { error } = await adminClient
    .from("users")
    .update({
      first_name,
      last_name,
      company_name,
      role: role || null,
      fei_number: fei_number || null,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("[onboarding] update failed:", error.message);
    return Response.json(
      { error: { message: "Failed to save profile." } },
      { status: 500 }
    );
  }

  track(userId, "onboarding_completed", {
    has_company: !!company_name,
    has_role: !!role,
    has_fei: !!fei_number,
  });

  // Send welcome email + schedule product nudge (non-blocking)
  sendWelcomeAndScheduleNudge(userId, first_name).catch((err) =>
    console.error("[onboarding] welcome email error:", err)
  );

  return Response.json({ success: true });
}

// ---------------------------------------------------------------------------
// Welcome email (0 products) + schedule 24h nudge
// ---------------------------------------------------------------------------

async function sendWelcomeAndScheduleNudge(userId: string, firstName: string) {
  const { data: user } = await adminClient
    .from("users")
    .select("email, max_products")
    .eq("id", userId)
    .single();

  if (!user?.email) return;

  const { subject, html } = await compileWelcome({
    first_name: firstName,
    products: [],
    max_products: user.max_products ?? 5,
  });

  const result = await sendEmail({
    to: user.email,
    subject,
    html,
    tags: [{ name: "email_type", value: "welcome" }],
  });

  if (result.success) {
    track(userId, "welcome_email_sent", { product_count: 0 });
  } else {
    console.error("[onboarding] welcome email send failed:", result.error);
  }

  // Schedule 24h product nudge check
  await inngest.send({
    name: "email/product-nudge",
    data: { userId },
  });
}
