import WeeklyNewsletter from "../src/lib/email/templates/WeeklyNewsletter";

export default function WeeklyNewsletterPreview() {
  return (
    <WeeklyNewsletter
      data={{
        items: [
          {
            title: "FDA Finalizes Rule on Updated Nutrition Facts Labeling for Added Sugars",
            item_type: "federal_register",
            published_date: "2026-03-05",
            source_url: "https://www.federalregister.gov/example-1",
            summary:
              "The FDA has finalized amendments to the Nutrition Facts label requiring clearer disclosure of added sugars, including a new line for 'Total Added Sugars' with updated Daily Value percentages. Manufacturers have until January 2028 to comply.",
            regulatory_action_type: "proposed_rule",
            deadline: "2028-01-01",
          },
          {
            title: "Voluntary Recall: Multiple Brands of Ground Cinnamon for Elevated Lead Levels",
            item_type: "recall",
            published_date: "2026-03-04",
            source_url: "https://www.fda.gov/safety/recalls/example-2",
            summary:
              "Three additional brands have joined the voluntary recall of ground cinnamon products after FDA testing found lead concentrations exceeding action levels. The agency recommends consumers check pantries against the updated recall list.",
            regulatory_action_type: "recall",
            deadline: null,
          },
          {
            title: "FDA Issues Draft Guidance on Pre-Market Notification for Cosmetic Products",
            item_type: "press_release",
            published_date: "2026-03-03",
            source_url: "https://www.fda.gov/cosmetics/example-3",
            summary:
              "New draft guidance outlines the FDA's expectations for pre-market safety substantiation under MoCRA. Comment period open for 90 days.",
            regulatory_action_type: "guidance",
            deadline: "2026-06-01",
          },
          {
            title: "Import Alert 16-131: Detention of Dietary Supplements with Undeclared Drug Ingredients",
            item_type: "import_alert",
            published_date: "2026-03-02",
            source_url: "https://www.fda.gov/example-4",
            summary: null,
            regulatory_action_type: null,
            deadline: null,
          },
          {
            title: "FDA Warning Letter to XYZ Supplements for cGMP Violations",
            item_type: "warning_letter",
            published_date: "2026-03-01",
            source_url: "https://www.fda.gov/example-5",
            summary:
              "Inspectors cited failure to establish product specifications, inadequate identity testing, and insufficient batch records at the company's manufacturing facility.",
            regulatory_action_type: null,
            deadline: null,
          },
          {
            title: "CFSAN Constituent Update: New GRAS Notification Requirements",
            item_type: "constituent_update",
            published_date: "2026-03-01",
            source_url: "https://www.fda.gov/example-6",
            summary: null,
            regulatory_action_type: null,
            deadline: null,
          },
          {
            title: "FDA Approves First Generic Biosimilar for Adalimumab",
            item_type: "press_release",
            published_date: "2026-02-28",
            source_url: null,
            summary: null,
            regulatory_action_type: null,
            deadline: null,
          },
          {
            title: "Tobacco Product Marketing Orders: 4 New Applications Denied",
            item_type: "press_release",
            published_date: "2026-02-28",
            source_url: "https://www.fda.gov/example-8",
            summary: null,
            regulatory_action_type: null,
            deadline: null,
          },
        ],
        period: { start: "2026-02-27", end: "2026-03-06" },
        total_items: 47,
        bridge: {
          total_monitored_products: 142,
          products_with_action_items: 8,
        },
      }}
      lead_story={{
        title: "FDA Finalizes Rule on Updated Nutrition Facts Labeling for Added Sugars",
        body: "The FDA's final rule on added sugars labeling marks the most significant change to the Nutrition Facts panel since the 2016 overhaul. For food manufacturers, this means retooling label templates and recalculating Daily Value percentages based on updated reference amounts.\n\nThe rule introduces a new 'Total Added Sugars' line item that must appear directly below the existing sugars declaration. Products exceeding 50% DV for added sugars will also require a footnote explaining the health implications — a first for FDA nutrition labeling.\n\nManufacturers with annual sales above $10M have until January 1, 2028 to comply. Small businesses (under $10M) get an additional year.",
        source_url: "https://www.federalregister.gov/example-1",
        regulation: "21 CFR 101.9",
      }}
      the_number={{
        value: "47",
        context: "Regulatory actions published by FDA this week — the highest single-week count in 2026 so far, driven by a surge in recall notices and import alerts.",
      }}
      unsubscribe_url="https://policycanary.io/api/email/unsubscribe?id=preview"
    />
  );
}
