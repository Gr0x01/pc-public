import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getProductById, getProductVerdicts, getIngredientUseCodes } from "@/lib/products/queries";
import { UpdateProductSchema } from "@/lib/products/types";
import { checkRateLimit } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// TODO: remove dev bypass before launch
const isDev = process.env.NODE_ENV === "development";
const DEV_USER_ID = "70360df8-4888-4401-9aa0-b2b15da354b0";

// ---------------------------------------------------------------------------
// GET /api/products/[id]
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return Response.json(
      { error: { message: "Invalid product ID." } },
      { status: 400 }
    );
  }

  const data = await getProductById(id, userId);
  if (!data) {
    return Response.json(
      { error: { message: "Product not found." } },
      { status: 404 }
    );
  }

  const verdicts = await getProductVerdicts(id, userId);

  // Fetch use context codes for ingredients with resolved substances
  const substanceIds = (data.ingredients ?? [])
    .map((ing) => ing.substance_id)
    .filter((sid): sid is string => sid !== null);
  const useCodesMap = await getIngredientUseCodes(substanceIds);
  const use_codes = Object.fromEntries(useCodesMap);

  return Response.json({ data, verdicts, use_codes });
}

// ---------------------------------------------------------------------------
// PATCH /api/products/[id]
// ---------------------------------------------------------------------------

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit (10/min/IP for mutations)
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip && !checkRateLimit(`patch:${ip}`, 10)) {
    return Response.json(
      { error: { message: "Too many requests. Please wait a moment." } },
      { status: 429 }
    );
  }

  // Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { error: { message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return Response.json(
      { error: { message: "Invalid product ID." } },
      { status: 400 }
    );
  }

  // Validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: "Invalid request body." } },
      { status: 400 }
    );
  }

  const parsed = UpdateProductSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Build update object
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.brand !== undefined) updates.brand = parsed.data.brand;

  if (Object.keys(updates).length === 0) {
    return Response.json(
      { error: { message: "No fields to update." } },
      { status: 400 }
    );
  }

  // Ownership check + update (updated_at handled by DB trigger)
  const { data, error } = await adminClient
    .from("subscriber_products")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, name, brand, product_type, is_active, updated_at")
    .maybeSingle();

  if (error) {
    console.error("[products] update error:", error);
    return Response.json(
      { error: { message: "Failed to update product." } },
      { status: 500 }
    );
  }

  if (!data) {
    return Response.json(
      { error: { message: "Product not found." } },
      { status: 404 }
    );
  }

  return Response.json({ data });
}

// ---------------------------------------------------------------------------
// DELETE /api/products/[id] — soft delete (is_active = false)
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit (10/min/IP for mutations)
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip && !checkRateLimit(`delete:${ip}`, 10)) {
    return Response.json(
      { error: { message: "Too many requests. Please wait a moment." } },
      { status: 429 }
    );
  }

  // Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { error: { message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return Response.json(
      { error: { message: "Invalid product ID." } },
      { status: 400 }
    );
  }

  // Soft delete (updated_at handled by DB trigger)
  const { data, error } = await adminClient
    .from("subscriber_products")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[products] soft delete error:", error);
    return Response.json(
      { error: { message: "Failed to delete product." } },
      { status: 500 }
    );
  }

  if (!data) {
    return Response.json(
      { error: { message: "Product not found." } },
      { status: 404 }
    );
  }

  return Response.json({ data: { id: data.id, deleted: true } });
}
