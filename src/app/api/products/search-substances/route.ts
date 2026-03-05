import { adminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// GET /api/products/search-substances?q=vanill
// Typeahead search against substance_names for the add-ingredient UI.
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return Response.json({ data: [] });
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
