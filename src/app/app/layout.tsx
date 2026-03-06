import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/auth";
import { PostHogIdentify } from "@/components/PostHogIdentify";

import { isDev } from "@/lib/dev";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = isDev ? null : await getAuthUser();
  if (!isDev && !user) {
    redirect("/login");
  }

  return (
    <>
      {user && (
        <PostHogIdentify userId={user.id} email={user.email} />
      )}
      {children}
    </>
  );
}
