import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const isDev = process.env.NODE_ENV === "development";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isDev) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
    }
  }

  return (
    <div className="min-h-screen bg-surface-dark text-text-inverse">
      {children}
    </div>
  );
}
