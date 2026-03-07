import { createClient } from "@/lib/supabase/server";
import { getFeedItems } from "@/lib/products/queries";
import type { FeedFilters } from "@/lib/products/queries";
import { checkRateLimit } from "@/lib/rate-limit";

import { isDev, DEV_USER_ID } from "@/lib/dev";

export async function GET(request: Request) {
  let userId: string;
  if (isDev) {
    userId = DEV_USER_ID;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }
    userId = user.id;
  }

  if (!(await checkRateLimit(`feed:${userId}`, 30))) {
    return Response.json(
      { error: { message: "Too many requests. Please wait a moment." } },
      { status: 429 }
    );
  }

  const url = new URL(request.url);
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25));

  const filters: FeedFilters = {
    type: url.searchParams.get("type") || undefined,
    range: url.searchParams.get("range") || undefined,
    myProducts: url.searchParams.get("myProducts") === "true",
    showArchived: url.searchParams.get("showArchived") === "true",
  };

  const { items, hasMore } = await getFeedItems(userId, { limit, offset, filters });

  return Response.json({ items, hasMore });
}
