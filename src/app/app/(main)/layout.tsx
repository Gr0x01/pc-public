import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getDbUser } from "@/lib/supabase/auth";
import AppNav from "@/components/app/AppNav";

import { isDev } from "@/lib/dev";

export default async function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let email = "dev@localhost";

  if (!isDev) {
    const user = await getAuthUser();
    if (!user) {
      redirect("/login");
    }
    email = user.email!;

    const dbUser = await getDbUser(user.id);

    if (dbUser && !dbUser.onboarding_completed_at) {
      redirect("/app/onboarding");
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
      <AppNav email={email} signOut={signOut} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
