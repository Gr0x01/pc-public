import BriefingEmail from "../src/lib/email/templates/BriefingEmail";

// Preview: quiet week — no products affected, all-clear state
export default function BriefingAllClearPreview() {
  return (
    <BriefingEmail
      data={{
        subscriber: {
          id: "preview-user",
          email: "demo@example.com",
          first_name: "Sarah",
          company_name: "Bright Beauty Co.",
        },
        products: [
          { id: "p1", name: "Glow Serum SPF 30", brand: "Bright Beauty", product_type: "cosmetic", ingredient_count: 14 },
          { id: "p2", name: "Daily Probiotic Capsules", brand: "Bright Wellness", product_type: "supplement", ingredient_count: 8 },
          { id: "p3", name: "Hydrating Face Mist", brand: "Bright Beauty", product_type: "cosmetic", ingredient_count: 9 },
          { id: "p4", name: "Vitamin D3 Softgels", brand: "Bright Wellness", product_type: "supplement", ingredient_count: 3 },
          { id: "p5", name: "Tinted Lip Balm SPF 15", brand: "Bright Beauty", product_type: "cosmetic", ingredient_count: 11 },
        ],
        product_items: [],
        industry_items: [
          {
            item_id: "item-3",
            title: "FDA Publishes Updated Guidance on Cosmetic Facility Registration Under MoCRA",
            item_type: "press_release",
            published_date: "2026-03-02",
            source_url: "https://www.fda.gov/cosmetics/example",
            summary:
              "Draft guidance clarifies facility registration requirements under the Modernization of Cosmetics Regulation Act, including small business exemptions and electronic filing procedures.",
            regulatory_action_type: "guidance",
            deadline: "2026-06-01",
            action_items: null,
            regulations_cited: null,
            relevance: 0.3,
            lifecycle_state: "active",
            matched_products: [],
          },
          {
            item_id: "item-4",
            title: "CFSAN Constituent Update: Revised GRAS Notification Filing Requirements",
            item_type: "constituent_update",
            published_date: "2026-03-01",
            source_url: "https://www.fda.gov/food/example",
            summary:
              "CFSAN has updated its GRAS notification filing process to require additional toxicological data for novel food ingredients. Existing notifications are unaffected.",
            regulatory_action_type: null,
            deadline: null,
            action_items: null,
            regulations_cited: null,
            relevance: 0.2,
            lifecycle_state: "active",
            matched_products: [],
          },
        ],
        other_items: [
          { title: "FDA Approves New Drug Application for Type 2 Diabetes Treatment", item_type: "press_release", source_url: "https://www.fda.gov/example-1" },
          { title: "Import Alert 99-33 Updated: Detention of Unapproved New Drugs", item_type: "import_alert", source_url: "https://www.fda.gov/example-2" },
          { title: "FDA Issues Warning Letters to 3 Tobacco Retailers", item_type: "warning_letter", source_url: null },
        ],
        period: { start: "2026-02-27", end: "2026-03-06" },
        total_items_reviewed: 47,
      }}
    />
  );
}
