/**
 * Mock data for the app dashboard (Phase 6).
 * Types match src/types/database.ts and src/types/api.ts.
 * USE_MOCK = true in each page/server component gates this data.
 */

import type {
  RegulatoryItem,
  ItemEnrichment,
  SubscriberProduct,
  ProductMatch,
} from "@/types/database";
import type { ItemType, RelevanceLevel } from "@/types/enums";
import type { LifecycleState } from "@/lib/utils/lifecycle";

// ---------------------------------------------------------------------------
// Extended types for the feed and detail view (superset of DB types)
// ---------------------------------------------------------------------------

export interface FeedItemEnriched {
  id: string;
  title: string;
  item_type: ItemType;
  published_date: string;
  source_url: string | null;
  issuing_office: string | null;
  // From item_enrichments (null if not enriched)
  summary: string | null;
  urgency_score: number | null;
  // From product_matches (null if no match)
  relevance: RelevanceLevel | null;
  impact_summary: string | null;
  action_items: string[] | null;
  deadline: string | null;
  lifecycle_state: LifecycleState;
  // From product_matches (for current user)
  matched_products: Array<{ id: string; name: string }>;
  verdict_reasoning: string | null;
}

export interface ItemDetailData {
  item: RegulatoryItem;
  enrichment: ItemEnrichment | null;
  relevance: RelevanceLevel | null;
  action_items: string[] | null;
  substances: Array<{ raw_substance_name: string; canonical_name?: string | null }>;
  matched_products: Array<{ id: string; name: string }>;
}

export interface SearchCitationCard {
  item_id: string;
  title: string;
  item_type: ItemType;
  published_date: string;
  chunk_content: string;
  score: number;
}

export interface SearchResultData {
  answer: string;
  citations: SearchCitationCard[];
}

// ---------------------------------------------------------------------------
// Mock Feed Items (10 items, mixed types and enrichment states)
// ---------------------------------------------------------------------------

export const MOCK_FEED_ITEMS: FeedItemEnriched[] = [
  {
    id: "fi-001",
    title:
      "Warning Letter: NovaBiotics LLC — Identity Testing Failures for Marine Collagen Dietary Supplements",
    item_type: "warning_letter",
    published_date: "2026-02-28",
    source_url:
      "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/novabiotics-llc-2026",
    issuing_office: "CFSAN Office of Compliance",
    summary:
      "NovaBiotics LLC received a warning letter for failing to conduct adequate identity testing on marine-sourced collagen raw materials. The firm relied solely on certificates of analysis (COAs) from suppliers instead of performing scientifically valid identity tests per 21 CFR 111.75(a)(1)(ii). Three lots of marine collagen powder were shipped without per-batch identity verification.",
    urgency_score: 92,
    relevance: "critical",
    impact_summary:
      "Direct substance match: marine collagen. Your Marine Collagen Powder uses the same ingredient cited in this warning letter. Audit identity testing protocols immediately.",
    action_items: [
      "Audit identity testing protocols against 21 CFR 111.75(a)(1)(ii)",
      "Verify COA includes marine collagen-specific identity tests, not generic protein analysis",
      "Confirm per-batch testing with your contract manufacturer",
    ],
    deadline: null,
    lifecycle_state: "active",
    matched_products: [{ id: "prod-001", name: "Marine Collagen Powder" }],
    verdict_reasoning: null,
  },
  {
    id: "fi-002",
    title:
      "Recall: PureVita Labs — Undeclared Allergens in Collagen Protein Blend",
    item_type: "recall",
    published_date: "2026-02-26",
    source_url:
      "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/purevita-labs-2026",
    issuing_office: "CFSAN",
    summary:
      "PureVita Labs initiated a voluntary Class II recall of its Collagen Protein Blend due to undeclared milk allergens. The mislabeling affects lots manufactured between Jan-Mar 2026.",
    urgency_score: 78,
    relevance: "high",
    impact_summary:
      "Category overlap: collagen supplements. Review your allergen declaration for Marine Collagen Powder against current labeling requirements.",
    action_items: [
      "Review allergen declaration on Marine Collagen Powder label against current requirements",
      "Confirm finished product testing for milk allergens with your contract manufacturer",
    ],
    deadline: null,
    lifecycle_state: "active",
    matched_products: [{ id: "prod-001", name: "Marine Collagen Powder" }],
    verdict_reasoning: null,
  },
  {
    id: "fi-003",
    title:
      "Draft Guidance: BHA Concentration Limits in OTC Sunscreen Products",
    item_type: "draft_guidance",
    published_date: "2026-02-20",
    source_url:
      "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/bha-concentration-limits-otc-sunscreen",
    issuing_office: "CDER Office of Nonprescription Drugs",
    summary:
      "FDA issued draft guidance proposing revised concentration limits for butylated hydroxyanisole (BHA) in OTC sunscreen drug products. Comment period closes June 15, 2026.",
    urgency_score: 65,
    relevance: "high",
    impact_summary:
      "Your BHA Eye Cream SPF 15 contains BHA at concentrations that may require reformulation before final guidance.",
    action_items: [
      "Review current BHA concentration against proposed thresholds in the draft guidance",
      "Consult formulation team on reformulation feasibility before comment period closes",
    ],
    deadline: "2026-06-15",
    lifecycle_state: "urgent",
    matched_products: [{ id: "prod-002", name: "BHA Eye Cream SPF 15" }],
    verdict_reasoning: null,
  },
  {
    id: "fi-004",
    title:
      "Final Rule: Amendments to Current Good Manufacturing Practice for Dietary Supplements (21 CFR 111)",
    item_type: "rule",
    published_date: "2026-02-15",
    source_url:
      "https://www.federalregister.gov/documents/2026/02/15/2026-03201/cgmp-amendments",
    issuing_office: "CFSAN",
    summary:
      "FDA finalized amendments to 21 CFR Part 111 strengthening identity testing requirements for botanical and marine-sourced raw materials. Effective date: August 15, 2026.",
    urgency_score: 85,
    relevance: "critical",
    impact_summary:
      "Direct impact: strengthened identity testing requirements for marine-sourced materials affect your Marine Collagen Powder formulation.",
    action_items: [
      "Ensure identity testing procedures are updated to comply with new requirements by August 15, 2026",
      "Document all testing protocols in your SOP with effective date notation",
    ],
    deadline: "2026-08-15",
    lifecycle_state: "active",
    matched_products: [{ id: "prod-001", name: "Marine Collagen Powder" }],
    verdict_reasoning: null,
  },
  {
    id: "fi-005",
    title:
      "Notice: FDA Announces Public Meeting on MAHA Supplement Regulatory Framework",
    item_type: "notice",
    published_date: "2026-02-12",
    source_url:
      "https://www.federalregister.gov/documents/2026/02/12/2026-02987/maha-supplement-framework",
    issuing_office: "Office of the Commissioner",
    summary:
      "FDA announced a public meeting to discuss the MAHA regulatory framework for dietary supplements. Registration open through March 1, 2026.",
    urgency_score: 40,
    relevance: "medium",
    impact_summary: null,
    action_items: null,
    deadline: null,
    lifecycle_state: "active",
    matched_products: [],
    verdict_reasoning: null,
  },
  {
    id: "fi-006",
    title:
      "Warning Letter: GreenPath Naturals — CGMP Violations in Botanical Supplement Manufacturing",
    item_type: "warning_letter",
    published_date: "2026-02-10",
    source_url:
      "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/greenpath-naturals-2026",
    issuing_office: "CFSAN Office of Compliance",
    summary: null,
    urgency_score: null,
    relevance: null,
    impact_summary: null,
    action_items: null,
    deadline: null,
    lifecycle_state: "archived",
    matched_products: [],
    verdict_reasoning: null,
  },
  {
    id: "fi-007",
    title:
      "Safety Alert: Elevated Lead Levels in Turmeric Supplements — Multi-Brand Investigation",
    item_type: "safety_alert",
    published_date: "2026-02-08",
    source_url:
      "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/turmeric-lead-2026",
    issuing_office: "CFSAN",
    summary:
      "FDA issued a safety alert regarding elevated lead levels found in turmeric supplements from multiple manufacturers. Testing showed levels exceeding California Prop 65 thresholds.",
    urgency_score: 55,
    relevance: "medium",
    impact_summary:
      "Your Turmeric Joint Formula uses turmeric extract. Verify heavy metal testing certificates with your supplier.",
    action_items: [
      "Request updated heavy metal testing certificates from your turmeric extract supplier",
    ],
    deadline: null,
    lifecycle_state: "archived",
    matched_products: [{ id: "prod-004", name: "Turmeric Joint Formula" }],
    verdict_reasoning: null,
  },
  {
    id: "fi-008",
    title:
      "Press Release: FDA Commissioner Remarks on 2026 Supplement Enforcement Priorities",
    item_type: "press_release",
    published_date: "2026-02-05",
    source_url:
      "https://www.fda.gov/news-events/press-announcements/fda-commissioner-supplement-priorities-2026",
    issuing_office: "Office of the Commissioner",
    summary: null,
    urgency_score: null,
    relevance: null,
    impact_summary: null,
    action_items: null,
    deadline: null,
    lifecycle_state: "archived",
    matched_products: [],
    verdict_reasoning: null,
  },
  {
    id: "fi-009",
    title:
      "Proposed Rule: Mandatory Product Listing for Dietary Supplements",
    item_type: "proposed_rule",
    published_date: "2026-01-28",
    source_url:
      "https://www.federalregister.gov/documents/2026/01/28/2026-01654/mandatory-product-listing",
    issuing_office: "CFSAN",
    summary:
      "FDA published a proposed rule requiring mandatory product listing for all dietary supplements sold in the United States. Comment period closes April 28, 2026.",
    urgency_score: 70,
    relevance: "high",
    impact_summary:
      "All supplement products affected. You have 4 supplement products that would require listing under this proposed rule.",
    action_items: [
      "Review the proposed mandatory listing requirements and assess compliance timelines",
      "Submit comments by April 28, 2026 if you want to influence the final rule",
    ],
    deadline: "2026-04-28",
    lifecycle_state: "urgent",
    matched_products: [
      { id: "prod-001", name: "Marine Collagen Powder" },
      { id: "prod-003", name: "Biotin Complex 5000mcg" },
      { id: "prod-004", name: "Turmeric Joint Formula" },
      { id: "prod-005", name: "Probiotic Daily 30B" },
    ],
    verdict_reasoning: null,
  },
  {
    id: "fi-010",
    title:
      "Notice: Updated Guidance for Cosmetic Product Safety Substantiation",
    item_type: "notice",
    published_date: "2026-01-20",
    source_url:
      "https://www.fda.gov/cosmetics/cosmetics-guidance-regulation/safety-substantiation-2026",
    issuing_office: "CFSAN Office of Cosmetics and Colors",
    summary:
      "FDA published updated guidance on safety substantiation requirements for cosmetic products under MoCRA. Includes new expectations for SPF-containing cosmetics.",
    urgency_score: 50,
    relevance: "medium",
    impact_summary:
      "Your BHA Eye Cream SPF 15 is a cosmetic with SPF claims. Review safety substantiation documentation against updated guidance.",
    action_items: [
      "Review safety substantiation documentation for BHA Eye Cream against updated MoCRA guidance",
    ],
    deadline: null,
    lifecycle_state: "archived",
    matched_products: [{ id: "prod-002", name: "BHA Eye Cream SPF 15" }],
    verdict_reasoning: null,
  },
];

// ---------------------------------------------------------------------------
// Mock Item Detail — fully enriched Marine Collagen Warning Letter
// ---------------------------------------------------------------------------

export const MOCK_ITEM_DETAIL: ItemDetailData = {
  item: {
    id: "fi-001",
    source_id: "src-cfsan-wl",
    source_ref: "novabiotics-llc-2026-02-28",
    source_url:
      "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/novabiotics-llc-2026",
    title:
      "Warning Letter: NovaBiotics LLC — Identity Testing Failures for Marine Collagen Dietary Supplements",
    raw_content: null,
    item_type: "warning_letter",
    jurisdiction: "federal",
    jurisdiction_state: null,
    published_date: "2026-02-28",
    effective_date: null,
    comment_deadline: null,
    docket_number: null,
    issuing_office: "CFSAN Office of Compliance",
    fr_citation: null,
    cfr_references: [{ title: 21, part: 111 }],
    action_text:
      "Warning letter issued for failure to establish specifications for identity testing of marine collagen raw materials.",
    page_views: null,
    significant: true,
    processing_status: "ok",
    processing_error: null,
    enforcement_company_name: "NovaBiotics LLC",
    enforcement_company_address: "4521 Industrial Parkway, Tampa, FL 33634",
    enforcement_products: [
      "Marine Collagen Peptides Powder 300g",
      "Collagen Beauty Blend Capsules",
      "NovaBiotics Marine Collagen + Vitamin C",
    ],
    enforcement_violation_types: [
      "Failure to establish specifications for identity testing",
      "Failure to conduct identity testing on incoming raw materials",
      "Reliance on supplier COAs without independent verification",
    ],
    enforcement_cited_regulations: [
      "21 CFR 111.75(a)(1)(ii)",
      "21 CFR 111.70(b)",
      "21 CFR 111.70(e)",
    ],
    enforcement_fei_number: "3014821",
    enforcement_marcs_cms_number: "681247",
    enforcement_recipient_name: "David Chen",
    enforcement_recipient_title: "CEO",
    enforcement_response_received: false,
    enforcement_closeout: false,
    enforcement_recall_classification: null,
    enforcement_recall_status: null,
    enforcement_voluntary_mandated: null,
    enforcement_distribution_pattern: null,
    enforcement_product_quantity: null,
    created_at: "2026-02-28T10:00:00Z",
    updated_at: "2026-02-28T14:30:00Z",
  },
  enrichment: {
    id: "enr-001",
    item_id: "fi-001",
    summary:
      "NovaBiotics LLC received a warning letter from FDA CFSAN for failing to conduct adequate identity testing on marine-sourced collagen raw materials used in dietary supplement manufacturing. The inspection found that the firm relied solely on certificates of analysis (COAs) from suppliers instead of performing scientifically valid identity tests as required by 21 CFR 111.75(a)(1)(ii). Three lots of marine collagen powder were shipped without per-batch identity verification. The FDA noted this is part of a broader enforcement trend targeting COA-only documentation for identity testing, particularly for marine-sourced and botanical ingredients.",
    key_regulations: [
      "21 CFR 111.75(a)(1)(ii)",
      "21 CFR 111.70(b)",
      "21 CFR 111.70(e)",
    ],
    key_entities: ["NovaBiotics LLC", "CFSAN", "FDA"],
    enrichment_model: "claude-sonnet-4-6",
    enrichment_version: 1,
    confidence: 0.95,
    regulatory_action_type: "cgmp_violation",
    deadline: null,
    verification_status: "verified",
    raw_response: null,
    created_at: "2026-02-28T14:30:00Z",
  },
  relevance: "critical",
  action_items: [
    "Audit identity testing protocols against 21 CFR 111.75(a)(1)(ii) — verify you are not relying solely on supplier COAs",
    "Confirm your contract manufacturer performs per-batch identity testing with scientifically valid methods specific to marine collagen",
    "Review COA documentation from your collagen supplier and request identity test methodology details",
    "Document your identity testing program in writing and retain records per 21 CFR 111.475",
  ],
  substances: [
    { raw_substance_name: "Marine Collagen" },
    { raw_substance_name: "Hydrolyzed Collagen (marine-sourced)" },
    { raw_substance_name: "Fish Collagen Peptides" },
  ],
  matched_products: [{ id: "prod-001", name: "Marine Collagen Powder" }],
};

// ---------------------------------------------------------------------------
// Mock Products
// ---------------------------------------------------------------------------

export const MOCK_PRODUCTS: SubscriberProduct[] = [
  {
    id: "prod-001",
    user_id: "user-dev",
    name: "Marine Collagen Powder",
    brand: "PureCoast Nutrition",
    product_type: "supplement",
    product_category_id: null,
    data_source: "dsld",
    external_id: "dsld-182456",
    upc_barcode: "850012345678",
    raw_ingredients_text:
      "Hydrolyzed Marine Collagen (fish), Hyaluronic Acid, Vitamin C (Ascorbic Acid), Biotin",
    product_metadata: null,
    manufacturer_name: null,
    manufacturer_fei: null,
    is_active: true,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-02-28T14:30:00Z",
  },
  {
    id: "prod-002",
    user_id: "user-dev",
    name: "BHA Eye Cream SPF 15",
    brand: "DermaVeil",
    product_type: "cosmetic",
    product_category_id: null,
    data_source: "manual",
    external_id: null,
    upc_barcode: "850098765432",
    raw_ingredients_text:
      "Water, Butylated Hydroxyanisole (BHA), Octinoxate, Titanium Dioxide, Retinol, Niacinamide",
    product_metadata: null,
    manufacturer_name: null,
    manufacturer_fei: null,
    is_active: true,
    created_at: "2026-01-20T10:00:00Z",
    updated_at: "2026-02-20T10:00:00Z",
  },
  {
    id: "prod-003",
    user_id: "user-dev",
    name: "Biotin Complex 5000mcg",
    brand: "PureCoast Nutrition",
    product_type: "supplement",
    product_category_id: null,
    data_source: "dsld",
    external_id: "dsld-192034",
    upc_barcode: "850012345999",
    raw_ingredients_text:
      "Biotin (D-Biotin), Vitamin B6 (Pyridoxine HCl), Zinc (Zinc Citrate), Selenium (Sodium Selenite)",
    product_metadata: null,
    manufacturer_name: null,
    manufacturer_fei: null,
    is_active: true,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
  },
  {
    id: "prod-004",
    user_id: "user-dev",
    name: "Turmeric Joint Formula",
    brand: "PureCoast Nutrition",
    product_type: "supplement",
    product_category_id: null,
    data_source: "dsld",
    external_id: "dsld-178901",
    upc_barcode: "850012345111",
    raw_ingredients_text:
      "Turmeric Extract (Curcuma longa), BioPerine (Black Pepper Extract), Boswellia Serrata Extract, Ginger Root Extract",
    product_metadata: null,
    manufacturer_name: null,
    manufacturer_fei: null,
    is_active: true,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-02-08T10:00:00Z",
  },
  {
    id: "prod-005",
    user_id: "user-dev",
    name: "Probiotic Daily 30B",
    brand: "PureCoast Nutrition",
    product_type: "supplement",
    product_category_id: null,
    data_source: "dsld",
    external_id: "dsld-201445",
    upc_barcode: "850012345222",
    raw_ingredients_text:
      "Lactobacillus acidophilus, Bifidobacterium lactis, Lactobacillus rhamnosus, Prebiotic Fiber (FOS)",
    product_metadata: null,
    manufacturer_name: null,
    manufacturer_fei: null,
    is_active: true,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Mock Product Matches
// ---------------------------------------------------------------------------

export const MOCK_PRODUCT_MATCHES: ProductMatch[] = [
  {
    id: "pm-001",
    product_id: "prod-001",
    regulatory_item_id: "fi-001",
    match_type: "direct_substance",
    match_method: "ingredient_substance_overlap",
    confidence: 0.96,
    matched_substances: [
      {
        substance_id: "sub-marine-collagen",
        substance_name: "Marine Collagen",
        match_detail:
          "Direct match: product ingredient 'Hydrolyzed Marine Collagen' matches warning letter substance 'Marine Collagen'",
      },
    ],
    matched_tags: null,
    impact_summary:
      "Your Marine Collagen Powder contains the exact ingredient cited in this warning letter. Audit identity testing protocols.",
    action_items: [
      "Audit identity testing protocols against 21 CFR 111.75(a)(1)(ii)",
      "Verify COA includes marine collagen-specific identity tests",
      "Confirm per-batch testing with your contract manufacturer",
    ],
    is_dismissed: false,
    reviewed_at: null,
    created_at: "2026-02-28T15:00:00Z",
    updated_at: "2026-02-28T15:00:00Z",
  },
  {
    id: "pm-002",
    product_id: "prod-001",
    regulatory_item_id: "fi-002",
    match_type: "category_overlap",
    match_method: "product_type_category",
    confidence: 0.72,
    matched_substances: null,
    matched_tags: [{ dimension: "product_type", value: "collagen_supplement" }],
    impact_summary:
      "Category overlap: collagen supplements. Review allergen declaration for Marine Collagen Powder.",
    action_items: [
      "Review allergen labeling for Marine Collagen Powder",
      "Verify supplier allergen testing documentation",
    ],
    is_dismissed: false,
    reviewed_at: null,
    created_at: "2026-02-26T15:00:00Z",
    updated_at: "2026-02-26T15:00:00Z",
  },
  {
    id: "pm-003",
    product_id: "prod-001",
    regulatory_item_id: "fi-004",
    match_type: "direct_substance",
    match_method: "ingredient_substance_overlap",
    confidence: 0.91,
    matched_substances: [
      {
        substance_id: "sub-marine-collagen",
        substance_name: "Marine Collagen",
        match_detail:
          "Rule directly strengthens identity testing requirements for marine-sourced raw materials",
      },
    ],
    matched_tags: null,
    impact_summary:
      "Strengthened CGMP identity testing requirements directly affect marine-sourced collagen ingredients.",
    action_items: [
      "Review amended 21 CFR 111 identity testing requirements",
      "Update testing protocols before August 15, 2026 effective date",
    ],
    is_dismissed: false,
    reviewed_at: null,
    created_at: "2026-02-15T15:00:00Z",
    updated_at: "2026-02-15T15:00:00Z",
  },
  {
    id: "pm-004",
    product_id: "prod-002",
    regulatory_item_id: "fi-003",
    match_type: "direct_substance",
    match_method: "ingredient_substance_overlap",
    confidence: 0.88,
    matched_substances: [
      {
        substance_id: "sub-bha",
        substance_name: "Butylated Hydroxyanisole (BHA)",
        match_detail:
          "Product contains BHA; draft guidance proposes revised concentration limits",
      },
    ],
    matched_tags: null,
    impact_summary:
      "Draft guidance on BHA concentration limits may require reformulation of BHA Eye Cream SPF 15.",
    action_items: [
      "Review current BHA concentration against draft guidance thresholds",
      "Consult formulation team on reformulation feasibility",
      "Monitor for final guidance — comment period closes June 2026",
    ],
    is_dismissed: false,
    reviewed_at: null,
    created_at: "2026-02-20T15:00:00Z",
    updated_at: "2026-02-20T15:00:00Z",
  },
  {
    id: "pm-005",
    product_id: "prod-002",
    regulatory_item_id: "fi-010",
    match_type: "category_overlap",
    match_method: "product_type_category",
    confidence: 0.75,
    matched_substances: null,
    matched_tags: [{ dimension: "product_type", value: "spf_cosmetic" }],
    impact_summary:
      "Updated safety substantiation guidance applies to SPF-containing cosmetics like BHA Eye Cream SPF 15.",
    action_items: [
      "Review safety substantiation documentation against updated guidance",
    ],
    is_dismissed: false,
    reviewed_at: null,
    created_at: "2026-01-20T15:00:00Z",
    updated_at: "2026-01-20T15:00:00Z",
  },
  {
    id: "pm-006",
    product_id: "prod-004",
    regulatory_item_id: "fi-007",
    match_type: "direct_substance",
    match_method: "ingredient_substance_overlap",
    confidence: 0.82,
    matched_substances: [
      {
        substance_id: "sub-turmeric",
        substance_name: "Turmeric Extract",
        match_detail:
          "Safety alert for elevated lead levels in turmeric supplements",
      },
    ],
    matched_tags: null,
    impact_summary:
      "Turmeric supplement safety alert. Verify heavy metal testing certificates for Turmeric Joint Formula.",
    action_items: [
      "Request current heavy metal testing certificates from supplier",
      "Verify lead levels comply with applicable thresholds",
    ],
    is_dismissed: false,
    reviewed_at: null,
    created_at: "2026-02-08T15:00:00Z",
    updated_at: "2026-02-08T15:00:00Z",
  },
  {
    id: "pm-007",
    product_id: "prod-001",
    regulatory_item_id: "fi-009",
    match_type: "category_overlap",
    match_method: "product_type_category",
    confidence: 0.95,
    matched_substances: null,
    matched_tags: [
      { dimension: "product_type", value: "dietary_supplement" },
    ],
    impact_summary:
      "Proposed mandatory product listing would require listing all supplement products including Marine Collagen Powder.",
    action_items: [
      "Monitor proposed rule for finalization",
      "Prepare product listing documentation",
    ],
    is_dismissed: false,
    reviewed_at: null,
    created_at: "2026-01-28T15:00:00Z",
    updated_at: "2026-01-28T15:00:00Z",
  },
  {
    id: "pm-008",
    product_id: "prod-003",
    regulatory_item_id: "fi-009",
    match_type: "category_overlap",
    match_method: "product_type_category",
    confidence: 0.95,
    matched_substances: null,
    matched_tags: [
      { dimension: "product_type", value: "dietary_supplement" },
    ],
    impact_summary:
      "Proposed mandatory product listing would require listing Biotin Complex 5000mcg.",
    action_items: ["Monitor proposed rule", "Prepare listing documentation"],
    is_dismissed: false,
    reviewed_at: null,
    created_at: "2026-01-28T15:00:00Z",
    updated_at: "2026-01-28T15:00:00Z",
  },
  {
    id: "pm-009",
    product_id: "prod-004",
    regulatory_item_id: "fi-009",
    match_type: "category_overlap",
    match_method: "product_type_category",
    confidence: 0.95,
    matched_substances: null,
    matched_tags: [
      { dimension: "product_type", value: "dietary_supplement" },
    ],
    impact_summary:
      "Proposed mandatory product listing would require listing Turmeric Joint Formula.",
    action_items: ["Monitor proposed rule", "Prepare listing documentation"],
    is_dismissed: false,
    reviewed_at: null,
    created_at: "2026-01-28T15:00:00Z",
    updated_at: "2026-01-28T15:00:00Z",
  },
  {
    id: "pm-010",
    product_id: "prod-005",
    regulatory_item_id: "fi-009",
    match_type: "category_overlap",
    match_method: "product_type_category",
    confidence: 0.95,
    matched_substances: null,
    matched_tags: [
      { dimension: "product_type", value: "dietary_supplement" },
    ],
    impact_summary:
      "Proposed mandatory product listing would require listing Probiotic Daily 30B.",
    action_items: ["Monitor proposed rule", "Prepare listing documentation"],
    is_dismissed: false,
    reviewed_at: null,
    created_at: "2026-01-28T15:00:00Z",
    updated_at: "2026-01-28T15:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Mock Search Result
// ---------------------------------------------------------------------------

export const MOCK_SEARCH_RESULT: SearchResultData = {
  answer:
    "The FDA's posture on identity testing for dietary supplement raw materials has tightened significantly in 2025-2026. Under 21 CFR 111.75(a)(1)(ii), manufacturers must conduct at least one appropriate test to verify the identity of each component used in manufacturing. Relying solely on supplier certificates of analysis (COAs) has been a consistent target in recent warning letters.\n\nKey enforcement patterns:\n\n1. **COA-only reliance is insufficient.** The FDA has cited multiple companies for relying on supplier COAs without performing independent identity verification. This is the most common violation in recent CFSAN warning letters for supplements.\n\n2. **Marine-sourced and botanical ingredients face heightened scrutiny.** The FDA has specifically targeted identity testing for complex raw materials where generic protein or botanical tests may not be sufficient to confirm identity.\n\n3. **Per-batch testing is expected.** Skip-lot testing or sampling strategies that do not cover each incoming lot have been cited as violations.\n\nThe February 2026 warning letter to NovaBiotics LLC is the most recent example, where three lots of marine collagen were shipped without per-batch identity verification.",
  citations: [
    {
      item_id: "fi-001",
      title:
        "Warning Letter: NovaBiotics LLC — Identity Testing Failures for Marine Collagen Dietary Supplements",
      item_type: "warning_letter",
      published_date: "2026-02-28",
      chunk_content:
        "NovaBiotics LLC received a warning letter for failing to conduct adequate identity testing on marine-sourced collagen raw materials. The firm relied solely on certificates of analysis (COAs) from suppliers.",
      score: 0.94,
    },
    {
      item_id: "fi-004",
      title:
        "Final Rule: Amendments to Current Good Manufacturing Practice for Dietary Supplements (21 CFR 111)",
      item_type: "rule",
      published_date: "2026-02-15",
      chunk_content:
        "FDA finalized amendments to 21 CFR Part 111 strengthening identity testing requirements for botanical and marine-sourced raw materials.",
      score: 0.89,
    },
    {
      item_id: "fi-006",
      title:
        "Warning Letter: GreenPath Naturals — CGMP Violations in Botanical Supplement Manufacturing",
      item_type: "warning_letter",
      published_date: "2026-02-10",
      chunk_content:
        "GreenPath Naturals was cited for failure to establish specifications for identity testing of botanical raw materials, including Saw Palmetto and Turmeric extracts.",
      score: 0.82,
    },
  ],
};
