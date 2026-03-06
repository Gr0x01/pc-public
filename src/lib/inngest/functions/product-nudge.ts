import { inngest } from "../client";
import { adminClient } from "@/lib/supabase/admin";
import { countActiveProducts } from "@/lib/products/queries";
import { compileWelcome } from "@/lib/email/compiler";
import { sendEmail } from "@/lib/email/sender";
import { track } from "@/lib/analytics";

export const productNudge = inngest.createFunction(
  { id: "product-nudge" },
  { event: "email/product-nudge" },
  async ({ event, step }) => {
    const { userId } = event.data;

    await step.sleep("wait-for-products", "24h");

    return await step.run("check-and-send", async () => {
      const count = await countActiveProducts(userId);
      if (count > 0) return { skipped: true, reason: "user_has_products" };

      const { data: user } = await adminClient
        .from("users")
        .select("first_name, email, max_products")
        .eq("id", userId)
        .single();

      if (!user?.email || !user?.first_name) {
        return { skipped: true, reason: "missing_user_data" };
      }

      const { subject, html } = await compileWelcome({
        first_name: user.first_name,
        products: [],
        max_products: user.max_products ?? 5,
      });

      const result = await sendEmail({
        to: user.email,
        subject: `${user.first_name}, your regulatory watch is waiting`,
        html,
        tags: [{ name: "email_type", value: "product_nudge" }],
      });

      if (result.success) {
        track(userId, "product_nudge_email_sent");
      }

      return { sent: result.success };
    });
  }
);
