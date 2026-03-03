import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const isDev = process.env.NODE_ENV === "development";

export default async function DashboardPage() {
  let email = "dev@localhost";

  if (!isDev) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
    }
    email = user!.email!;
  }

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="h-[3px] bg-canary w-12 mb-8" />
        <h1 className="font-serif text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-sm text-slate-400 mb-10 font-mono">{email}</p>
        <div className="border border-white/10 rounded p-8 text-center">
          <p className="text-slate-400">Dashboard coming soon.</p>
          <p className="text-sm text-slate-500 mt-2">
            Product monitoring and alerts will appear here.
          </p>
        </div>
        <div className="mt-10 text-center">
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-slate-500 hover:text-slate-300 underline transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
