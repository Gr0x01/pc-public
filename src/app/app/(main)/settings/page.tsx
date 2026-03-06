import { redirect } from "next/navigation";
import { getAuthUser, getDbUser } from "@/lib/supabase/auth";
import SettingsForm from "@/components/app/SettingsForm";
import { isDev, DEV_USER_ID } from "@/lib/dev";

export default async function SettingsPage() {
  let email = "dev@localhost";
  let userId = DEV_USER_ID;

  if (!isDev) {
    const authUser = await getAuthUser();
    if (!authUser) redirect("/login");
    email = authUser.email!;
    userId = authUser.id;
  }

  const dbUser = await getDbUser(userId);
  if (!dbUser) redirect("/login");

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-lg font-semibold text-text-primary mb-6">Settings</h1>

      {/* Read-only account info */}
      <div className="bg-white border border-border rounded p-5 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <h2 className="text-sm font-medium text-text-primary mb-3">Account</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-secondary">Email</dt>
            <dd className="text-text-primary font-mono text-xs">{email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Plan</dt>
            <dd className="text-text-primary capitalize">
              {dbUser.access_level === "monitor_research"
                ? "Monitor + Research"
                : dbUser.access_level}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Member since</dt>
            <dd className="text-text-primary">
              {new Date(dbUser.created_at).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </dd>
          </div>
        </dl>
      </div>

      {/* Editable profile + danger zone */}
      <SettingsForm
        initialData={{
          first_name: dbUser.first_name ?? "",
          last_name: dbUser.last_name ?? "",
          company_name: dbUser.company_name ?? "",
          role: dbUser.role ?? "",
          fei_number: dbUser.fei_number ?? "",
          email_opted_out: dbUser.email_opted_out ?? false,
        }}
      />
    </div>
  );
}
