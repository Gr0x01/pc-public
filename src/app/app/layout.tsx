import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/auth";

import { isDev } from "@/lib/dev";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isDev) {
    const user = await getAuthUser();
    if (!user) {
      redirect("/login");
    }
  }

  return <>{children}</>;
}
