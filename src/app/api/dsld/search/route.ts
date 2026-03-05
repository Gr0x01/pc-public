import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { searchDSLDProducts } from "@/lib/products/queries";
import { DSLDSearchSchema } from "@/lib/products/types";
import { checkRateLimit } from "@/lib/rate-limit";

// TODO: remove dev bypass before launch
const isDev = process.env.NODE_ENV === "development";

// ---------------------------------------------------------------------------
// GET /api/dsld/search?q=fish+oil&limit=10
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  // 1. Rate limit (30/min/IP for typeahead)
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip && !checkRateLimit(ip, 30)) {
    return Response.json(
      { error: { message: "Too many requests. Please wait a moment." } },
      { status: 429 }
    );
  }

  // 2. Auth check (bypassed in dev for curl testing)
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

  // 3. Validate query params
  const { searchParams } = new URL(request.url);
  const parsed = DSLDSearchSchema.safeParse({
    q: searchParams.get("q"),
    limit: searchParams.get("limit"),
  });

  if (!parsed.success) {
    return Response.json(
      { error: { message: "Query must be at least 2 characters." } },
      { status: 400 }
    );
  }

  // 4. Search
  const data = await searchDSLDProducts(parsed.data.q, parsed.data.limit);

  return Response.json({ data });
}
