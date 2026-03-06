import { redirect } from "next/navigation";
import { getAuthUser, getDbUser } from "@/lib/supabase/auth";
import { countActiveProducts } from "@/lib/products/queries";
import { PostHogIdentify } from "@/components/PostHogIdentify";
import { identifyUser } from "@/lib/analytics";

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

  // Server-side identify with rich properties (cached — no extra DB calls)
  if (user) {
    const [dbUser, productCount] = await Promise.all([
      getDbUser(user.id),
      countActiveProducts(user.id).catch(() => 0),
    ]);

    identifyUser(user.id, {
      email: user.email,
      company_name: dbUser?.company_name,
      access_level: dbUser?.access_level ?? "free",
      product_count: productCount,
      max_products: dbUser?.max_products ?? 5,
      onboarding_completed: !!dbUser?.onboarding_completed_at,
      has_subscription: !!dbUser?.stripe_subscription_id,
    });
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
