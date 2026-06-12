/**
 * Golden Dataset: Enrichment Pipeline Regression Tests
 *
 * ────────────────────────────────────────────────────────────────────────────
 * REDACTED FOR THE PUBLIC MIRROR
 * The production golden set is a hand-annotated corpus of real regulatory items
 * with their expected enrichment output (action type, affected ingredients,
 * affected product categories, deadlines, confidence). That labeled data — and
 * the annotation rubric behind it — is part of Policy Canary's moat and is kept
 * private. The types and harness below are intact so the test structure is
 * legible; the fixture arrays ship empty.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * How the real set is used:
 *   - `expected.affected_ingredients`: every listed string must appear in the
 *     pipeline output (case-insensitive, substring match OK).
 *   - `expected.affected_product_categories`: same subset rule.
 *   - `expected.regulatory_action_type`: must match exactly.
 *   - Re-run whenever the enrichment prompt version bumps.
 */

export type ActionType =
  | "recall"                // product pulled from market
  | "ban_restriction"       // ingredient/substance banned or restricted (final)
  | "proposed_restriction"  // proposed ban/restriction (not yet final, comment period open)
  | "safety_alert"          // immediate consumer safety concern (contamination, hidden drug)
  | "cgmp_violation"        // enforcement action — company violated existing GMP rules (warning letter, 483)
  | "compliance_requirement" // NEW obligation companies must meet — registration deadline, GMP rule enacted, listing requirement
  | "testing_requirement"   // new or updated testing/identity testing required
  | "labeling_change"       // labeling requirement change
  | "import_violation"      // FSVP or import-related violation
  | "guidance_update"       // new FDA guidance document (lower urgency)
  | "adverse_event_signal"  // emerging adverse event pattern
  | "administrative"        // technical amendment, low priority

export interface GoldenFixture {
  /** DB id — fetch this item and run enrichment against it */
  id: string
  /** Human-readable label for test output */
  label: string
  item_type: string
  issuing_office: string | null
  expected: {
    /** What regulatory action is actually happening */
    regulatory_action_type: ActionType
    /** Substance/ingredient names that must appear in output (label-friendly) */
    affected_ingredients: string[]
    /** Granular product types — NOT just "food", but "protein powder", "topical SPF", etc. */
    affected_product_categories: string[]
    /** True if there is a concrete compliance deadline */
    has_deadline: boolean
    /** Minimum confidence threshold */
    min_confidence: number
  }
  /** Why this item is in the golden set — what it validates */
  rationale: string
}

// Real annotated fixtures are private — see header.
export const GOLDEN_FIXTURES: GoldenFixture[] = []

/**
 * Deterministic rule-validator cases that fire after LLM enrichment as
 * cross-checks (e.g. CDER issuing office → clear food/supplement/cosmetic
 * segments). Real cases reference production DB ids and are kept private.
 */
export const RULE_VALIDATOR_CASES: Array<{
  id: string
  label: string
  rule: string
  should_flag: boolean
}> = []
