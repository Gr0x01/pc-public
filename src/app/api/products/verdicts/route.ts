import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { track } from "@/lib/analytics";
import { z } from "zod";

import { isDev, DEV_USER_ID } from "@/lib/dev";

const PatchVerdictSchema = z.object({
  item_id: z.string().uuid(),
  product_id: z.string().uuid(),
  resolution: z.enum(["resolved", "not_applicable", "watching"]).nullable(),
});

// ---------------------------------------------------------------------------
// PATCH /api/products/verdicts — set or clear resolution on a verdict
// ---------------------------------------------------------------------------

export async function PATCH(request: Request) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: "Invalid request body." } },
      { status: 400 }
    );
  }

  const parsed = PatchVerdictSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { item_id, product_id, resolution } = parsed.data;
  const resolved_at = resolution && resolution !== "watching" ? new Date().toISOString() : null;

  const { data, error } = await adminClient
    .from("product_match_verdicts")
    .update({ resolution, resolved_at })
    .eq("item_id", item_id)
    .eq("product_id", product_id)
    .eq("user_id", userId)
    .select("id, resolution, resolved_at")
    .maybeSingle();

  if (error) {
    console.error("[verdicts] update error:", error);
    return Response.json(
      { error: { message: "Failed to update verdict." } },
      { status: 500 }
    );
  }

  if (!data) {
    return Response.json(
      { error: { message: "Verdict not found." } },
      { status: 404 }
    );
  }

  track(userId, "verdict_resolved", {
    item_id,
    product_id,
    resolution,
  });

  return Response.json({ data });
}
