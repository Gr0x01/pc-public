import { resolveSubstance } from "@/lib/products/queries";

// ---------------------------------------------------------------------------
// GET /api/products/resolve-ingredient?name=Whey+Protein+Isolate
// Resolves a single ingredient name against GSRS substance database.
// Used by the add-ingredient UI for live substance matching.
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();

  if (!name || name.length < 2) {
    return Response.json(
      { error: { message: "Provide a 'name' query parameter (min 2 chars)." } },
      { status: 400 }
    );
  }

  const result = await resolveSubstance(name);

  return Response.json({
    data: {
      name,
      substanceId: result.substance_id,
      normalizedName: result.normalized_name,
      matchStatus: result.normalization_status,
      confidence: result.normalization_confidence,
    },
  });
}
