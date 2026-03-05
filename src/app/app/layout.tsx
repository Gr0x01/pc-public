import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// TODO: remove dev bypass before launch
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

  return <>{children}</>;
}
