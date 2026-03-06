import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import AppNav from "@/components/app/AppNav";

import { isDev } from "@/lib/dev";

export default async function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let email = "dev@localhost";
  let accessLevel = "free";
  let hasSubscription = false;

  if (!isDev) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
    }
    email = user.email!;

    const { data: dbUser } = await adminClient
      .from("users")
      .select("access_level, max_products, stripe_customer_id, onboarding_completed_at")
      .eq("id", user.id)
      .single();

    if (dbUser) {
      accessLevel = dbUser.access_level ?? "free";
      hasSubscription = accessLevel !== "free";

      if (!dbUser.onboarding_completed_at) {
        redirect("/app/onboarding");
      }
    }
  }

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-surface-muted text-text-primary flex flex-col">
      <AppNav
        email={email}
        signOut={signOut}
        accessLevel={accessLevel}
        hasSubscription={hasSubscription}
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}
