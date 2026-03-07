import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getDSLDProduct } from "@/lib/products/queries";
import { checkRateLimit } from "@/lib/rate-limit";

import { isDev } from "@/lib/dev";

// ---------------------------------------------------------------------------
// GET /api/dsld/[id]
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await checkRateLimit(`dsld-detail:${ip}`, 30))) {
    return Response.json(
      { error: { message: "Too many requests. Please wait a moment." } },
      { status: 429 }
    );
  }

  // 1. Auth check
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

  // 2. Validate ID
  const { id } = await params;
  const dsldId = parseInt(id, 10);
  if (isNaN(dsldId) || dsldId < 1) {
    return Response.json(
      { error: { message: "Invalid DSLD product ID." } },
      { status: 400 }
    );
  }

  // 3. Fetch
  const data = await getDSLDProduct(dsldId);
  if (!data) {
    return Response.json(
      { error: { message: "DSLD product not found." } },
      { status: 404 }
    );
  }

  return Response.json({ data });
}
