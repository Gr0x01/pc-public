import { createClient } from "@/lib/supabase/server";
import { getDSLDProduct } from "@/lib/products/queries";

// TODO: remove dev bypass before launch
const isDev = process.env.NODE_ENV === "development";

// ---------------------------------------------------------------------------
// GET /api/dsld/[id]
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
