import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
  );
}

/**
 * Service role client — bypasses Row Level Security.
 * Use ONLY in pipeline jobs, webhook handlers, and server-side admin operations.
 * Never expose to the browser.
 */
export const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
