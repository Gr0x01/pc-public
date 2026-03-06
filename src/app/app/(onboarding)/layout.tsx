import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getDbUser } from "@/lib/supabase/auth";

import { isDev } from "@/lib/dev";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let signOutAction: (() => Promise<void>) | undefined;

  if (!isDev) {
    const user = await getAuthUser();
    if (!user) {
      redirect("/login");
    }

    // If already onboarded, send them to the app
    const dbUser = await getDbUser(user.id);

    if (dbUser?.onboarding_completed_at) {
      redirect("/app/feed");
    }

    signOutAction = async () => {
      "use server";
      const supabase = await createClient();
      await supabase.auth.signOut();
      redirect("/login");
    };
  }

  return (
    <div className="min-h-screen bg-surface-muted text-text-primary flex flex-col">
      {/* Minimal header: logo + sign out */}
      <header className="h-14 bg-[#07111F] border-b border-border-dark flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full bg-canary"
            aria-hidden="true"
          />
          <span className="font-bold text-white text-sm tracking-tight">
            Policy Canary
          </span>
        </div>
        {signOutAction && (
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors duration-100"
            >
              Sign out
            </button>
          </form>
        )}
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
