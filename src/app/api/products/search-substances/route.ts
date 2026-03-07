import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { isDev, DEV_USER_ID } from "@/lib/dev";

// ---------------------------------------------------------------------------
// GET /api/products/search-substances?q=vanill
// Typeahead search against substance_names for the add-ingredient UI.
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  // Auth
  let userId: string;
  if (isDev) {
    userId = DEV_USER_ID;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json(
        { error: { message: "Authentication required." } },
        { status: 401 }
      );
    }
    userId = user.id;
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return Response.json({ data: [] });
  }

  if (!(await checkRateLimit(`substances:${userId}`, 30))) {
    return Response.json(
      { error: { message: "Too many requests. Please wait a moment." } },
      { status: 429 }
    );
  }

  const { data, error } = await adminClient
    .from("substance_names")
    .select("substance_id, name, substances!inner(canonical_name)")
    .ilike("name", `${q}%`)
    .limit(10);

  if (error) {
    console.error("[search-substances] error:", error);
    return Response.json({ data: [] });
  }

  // Deduplicate by substance_id, prefer the matching name
  const seen = new Set<string>();
  const results: { substanceId: string; name: string; canonicalName: string }[] = [];
  for (const row of data ?? []) {
    if (seen.has(row.substance_id)) continue;
    seen.add(row.substance_id);
    const sub = row.substances as unknown as { canonical_name: string };
    results.push({
      substanceId: row.substance_id,
      name: row.name,
      canonicalName: sub.canonical_name,
    });
  }

  return Response.json({ data: results });
}
