import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppNav from "@/components/app/AppNav";

const isDev = process.env.NODE_ENV === "development";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let email = "dev@localhost";

  if (!isDev) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
    }
    email = user.email!;
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
