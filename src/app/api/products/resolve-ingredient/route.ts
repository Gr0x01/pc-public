import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { resolveSubstance } from "@/lib/products/queries";
import { checkRateLimit } from "@/lib/rate-limit";
import { isDev } from "@/lib/dev";

// ---------------------------------------------------------------------------
// GET /api/products/resolve-ingredient?name=Whey+Protein+Isolate
// Resolves a single ingredient name against GSRS substance database.
// Used by the add-ingredient UI for live substance matching.
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  // Auth — only authenticated users can resolve ingredients
  if (!isDev) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json(
        { error: { message: "Authentication required." } },
        { status: 401 }
      );
    }
  }

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await checkRateLimit(`resolve:${ip}`, 20))) {
    return Response.json(
      { error: { message: "Too many requests. Please wait a moment." } },
      { status: 429 }
    );
  }

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
