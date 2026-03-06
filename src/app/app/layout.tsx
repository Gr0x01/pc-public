import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import { isDev } from "@/lib/dev";

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
