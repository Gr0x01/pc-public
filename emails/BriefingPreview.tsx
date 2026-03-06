import BriefingEmail from "../src/lib/email/templates/BriefingEmail";

// Mock data for preview — exercises both "affected" and "all-clear" states
export default function BriefingPreview() {
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
        ],
        product_items: [
          {
            item_id: "item-1",
            title: "FDA Proposes Updated Sunscreen Monograph Requirements",
            item_type: "federal_register",
            published_date: "2026-03-03",
            source_url: "https://www.federalregister.gov/example",
            summary:
              "The FDA has proposed updates to the Over-the-Counter Sunscreen Monograph, revising maximum SPF labeling from 50+ to 60+ and adding new testing requirements for broad-spectrum claims. If finalized, products currently on market would have 18 months to comply with updated labeling and testing protocols.",
            regulatory_action_type: "proposed_rule",
            deadline: "2027-09-01",
            action_items: [
              "Review current SPF labeling against new monograph requirements",
              "Schedule broad-spectrum testing under updated protocol with your lab",
              "Update product packaging timeline to meet September 2027 compliance deadline",
            ],
            regulations_cited: ["21 CFR 352"],
            relevance: 0.92,
            lifecycle_state: "active",
            matched_products: [
              {
                product_id: "p1",
                product_name: "Glow Serum SPF 30",
                matched_substances: ["Avobenzone", "Homosalate"],
                matched_categories: ["sunscreen"],
              },
            ],
          },
          {
            item_id: "item-2",
            title: "Voluntary Recall: Probiotic Supplements Containing Undeclared Allergen",
            item_type: "recall",
            published_date: "2026-03-04",
            source_url: "https://www.fda.gov/safety/recalls/example",
            summary:
              "A major probiotic manufacturer has initiated a voluntary Class II recall of capsule products after testing revealed undeclared milk allergen in multiple lots. The FDA is monitoring the recall and has requested expanded lot testing across the product line.",
            regulatory_action_type: "recall",
            deadline: null,
            action_items: [
              "Verify your probiotic supplier is not affected by this recall",
              "Request Certificate of Analysis for current inventory lots",
            ],
            regulations_cited: null,
            relevance: 0.78,
            lifecycle_state: "active",
            matched_products: [
              {
                product_id: "p2",
                product_name: "Daily Probiotic Capsules",
                matched_substances: ["Lactobacillus acidophilus"],
                matched_categories: ["probiotic"],
              },
            ],
          },
        ],
        industry_items: [
          {
            item_id: "item-3",
            title: "FDA Announces New Guidance on Cosmetic Product Facility Registration Under MoCRA",
            item_type: "press_release",
            published_date: "2026-03-02",
            source_url: "https://www.fda.gov/cosmetics/example",
            summary:
              "The FDA has released draft guidance clarifying facility registration requirements under the Modernization of Cosmetics Regulation Act. The guidance addresses small business exemptions and electronic filing procedures.",
            regulatory_action_type: "guidance",
            deadline: "2026-06-01",
            action_items: null,
            regulations_cited: null,
            relevance: 0.3,
            lifecycle_state: "active",
            matched_products: [],
          },
        ],
        other_items: [
          { title: "FDA Approves New Drug Application for Type 2 Diabetes Treatment", item_type: "press_release", source_url: "https://www.fda.gov/example-1" },
          { title: "Import Alert 99-33 Updated: Detention of Unapproved New Drugs", item_type: "import_alert", source_url: "https://www.fda.gov/example-2" },
          { title: "FDA Issues Warning Letters to 3 Tobacco Retailers", item_type: "warning_letter", source_url: null },
          { title: "CFSAN Constituent Update: GRAS Notification Program Changes", item_type: "constituent_update", source_url: "https://www.fda.gov/example-4" },
        ],
        period: { start: "2026-02-27", end: "2026-03-06" },
        total_items_reviewed: 47,
      }}
      editorial_opening="A significant sunscreen monograph update and a probiotic recall lead this week's briefing. Two of your three monitored products are directly affected."
    />
  );
}
