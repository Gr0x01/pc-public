import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getDbUser } from "@/lib/supabase/auth";
import AppNav from "@/components/app/AppNav";

import { isDev, DEV_USER_ID } from "@/lib/dev";

export default async function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userId: string;

  if (isDev) {
    userId = DEV_USER_ID;
  } else {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    userId = user.id;
  }

  const dbUser = await getDbUser(userId);

  if (!isDev && dbUser && !dbUser.onboarding_completed_at) {
    redirect("/app/onboarding");
  }

  const first = dbUser?.first_name?.[0] ?? "";
  const last = dbUser?.last_name?.[0] ?? "";
  const initials = (first + last).toUpperCase() || "?";

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-surface-muted text-text-primary flex flex-col">
      <AppNav initials={initials} signOut={signOut} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
