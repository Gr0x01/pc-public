import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const isDev = process.env.NODE_ENV === "development";
const DEV_USER_ID = "70360df8-4888-4401-9aa0-b2b15da354b0";

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

  return Response.json({ success: true });
}
