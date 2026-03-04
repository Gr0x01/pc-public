# Products View -- Complete UX Design

**Surface**: Web App (desktop-first, responsive)
**Route**: `/app/products` (default logged-in view), `/app/products/[id]` (deep-link)
**Role**: The primary logged-in experience. Answers "Are my products OK?"

---

## 1. Page Structure & Layout

The Products view replaces the current card-grid with a three-panel layout at wide widths. The core insight: when reading an intelligence report about marine collagen, you should see your product's ingredient list right next to it. The mapping from "regulatory change" to "your product" is made visual.

### 1.1 Three-panel layout (≥1440px)

```
+--------------------------------------------------------------------------------+
| AppNav (h-14, #07111F)  [Logo]  Feed  Search  Products*       user@co [Billing]|
+--------------------------------------------------------------------------------+
|  Product     |  Intelligence Panel              |  Product Context            |
|  Sidebar     |  (active matches, actions,       |  (ingredients, metadata,    |
|  (280px)     |   history — the dynamic stuff)   |   edit — the static stuff)  |
|              |  (flex-1, min ~520px)            |  (340px fixed)              |
|  ┌─────────┐ |                                   |                             |
|  │ Search  │ |  ● Warning Letter: NovaBiotics   |  INGREDIENTS                |
|  │ Filter  │ |    RULE FINAL · Feb 28 · CFSAN   |  ● Hydrolyzed Marine        |
|  ├─────────┤ |                                   |    Collagen (fish)          |
|  │         │ |    Direct substance match:        |  ● Hyaluronic Acid          |
|  │ Products│ |    marine collagen. Your product  |  ● Vitamin C (Ascorbic      |
|  │ list    │ |    uses the same ingredient...    |    Acid)                    |
|  │ sorted  │ |                                   |  ● Biotin                   |
|  │ by      │ |    ACTION ITEMS                   |                             |
|  │ severity│ |    1. Audit identity testing...   |  DETAILS                    |
|  │         │ |    2. Verify COA includes...      |  Category   Supplement >    |
|  │         │ |    3. Confirm per-batch...        |              Collagen       |
|  │         │ |                                   |  Brand      PureCoast       |
|  │         │ |    Deadline: August 15, 2026      |  UPC        850012345678    |
|  │         │ |    Source: fda.gov/... · 21 CFR   |  Source     DSLD-182456     |
|  │         │ |                                   |  Added      Jan 15, 2026    |
|  │         │ |    [Mark Resolved] [Not Applic.]  |                             |
|  │         │ |                                   |  [Edit Product]             |
|  ├─────────┤ |  ┌─ Recall: PureVita ─ collapsed┐ |                             |
|  │ [+ Add] │ |  └─ Deadline: Jun 15 · 2 items ─┘ |                             |
|  └─────────┘ |                                   |                             |
|              |  HISTORY (7)        [View all →]  |                             |
+--------------------------------------------------------------------------------+
```

### 1.2 Two-panel layout (1024px – 1439px)

Product Context panel collapses. Intelligence panel gets everything — matches stacked above product details (same layout as the original design doc section 3-5). Content left-aligned with `max-w-3xl`.

```
+------------------------------------------------------------------+
| AppNav                                                            |
+------------------------------------------------------------------+
|  Sidebar   |  Intelligence + Product Details (stacked)            |
|  (280px)   |  max-w-3xl, left-aligned (not centered)             |
|            |                                                      |
|            |  [matches] → [product details] → [history]           |
+------------------------------------------------------------------+
```

### 1.3 Mobile layout (<1024px)

Sidebar collapses to a drawer. Single scrollable panel.

```
+--------------------------------------+
| AppNav                               |
+--------------------------------------+
| [● Marine Collagen Powder     ▼]     |  <- taps to open product drawer
+--------------------------------------+
|                                      |
|  Intelligence + Details (stacked)    |
|                                      |
+--------------------------------------+
```

### 1.4 Key structural decisions

- **Sidebar**: 280px fixed. Always visible ≥1024px.
- **Intelligence panel**: `flex-1` (min ~520px). Scrolls independently. Left-aligned content, NOT centered.
- **Product Context panel**: 340px fixed. Appears at ≥1440px. Scrolls independently (sticky header "INGREDIENTS").
- **Both panels scroll independently** — you can scroll through matches while ingredients stay pinned.
- **No page reload on product selection** — sidebar click swaps both panels with a 150ms crossfade.
- **URL reflects selection**: `/app/products/prod-001` — enables deep-linking, back button, sharing.
- **Products nav item is the active default** — redirect `/app` to `/app/products`.

### 1.5 Why three panels

The product's value proposition is the MAP: "the FDA changed X → your product contains Y → here's what to do." The three-panel layout makes this mapping spatial:

- **Left**: Which of my products? (navigation)
- **Center**: What happened and what should I do? (intelligence)
- **Right**: What's in this product? (context for the intelligence)

The right panel is the reference sheet you'd have open in another tab. We put it right there. When a match card says "direct substance match: marine collagen" and the ingredient list on the right shows "Hydrolyzed Marine Collagen (fish)" — the user immediately understands why this matters. No mental work.

### 1.6 Panel width rationale

At 1440px total viewport:
- 280px sidebar + 340px context = 620px fixed
- Intelligence panel gets 820px — generous for match cards and action items
- Content within intelligence uses the full width (no max-w constraint needed at this breakpoint)

At 1920px (common desktop):
- Intelligence panel gets 1300px
- Content uses `max-w-3xl` (768px) left-aligned to prevent lines from getting too long
- Right side of intelligence panel breathes naturally

At 2560px (ultrawide):
- Same constraints. Intelligence panel content stays at `max-w-3xl`. Extra space is absorbed.

---

## 2. Product Sidebar

### 2.1 Anatomy

```
+----------------------------+
|  MONITORED PRODUCTS        |
|  5 products                |
+----------------------------+
|  [Search products...]      |
|  [Status: All v]           |
+----------------------------+
|                            |
|  * Marine Collagen Powder  |  <- selected (white bg, ring)
|    PureCoast  |  3 active  |
|                            |
|  * BHA Eye Cream SPF 15   |
|    DermaVeil  |  2 active  |
|                            |
|  * Turmeric Joint Formula  |
|    PureCoast  |  1 active  |
|                            |
|  * Biotin Complex 5000mcg  |
|    PureCoast  |  All Clear |
|                            |
|  * Probiotic Daily 30B     |
|    PureCoast  |  All Clear |
|                            |
+----------------------------+
|  [+ Add Product]           |
+----------------------------+
```

### 2.2 Per-product sidebar row

Each row shows:
1. **Status dot** (8px, left-aligned): Red / Amber / Blue / Green
2. **Product name** (13px, IBM Plex Sans, semibold, truncate with ellipsis)
3. **Brand name** (11px, mono, text-secondary) + separator + **active match count or "All Clear"** (11px, mono)

```
Row height: ~56px (py-2.5, two lines of text)
Padding: px-4
Gap between dot and text: 12px
```

### 2.3 Status dot colors & meanings

| State           | Dot color  | Hex      | Sidebar label     | When                                         |
|-----------------|------------|----------|-------------------|----------------------------------------------|
| Action Required | Red        | #DC2626  | "3 active"        | >= 1 match with urgency >= 80 (direct subst) |
| Under Review    | Amber      | #D97706  | "2 active"        | >= 1 match with urgency >= 60, no red        |
| Watch           | Blue       | #3B82F6  | "1 watching"      | >= 1 match with urgency < 60                 |
| All Clear       | Green      | #059669  | "All Clear"       | No active matches                            |

Note: "Watch" (blue) is new -- the current codebase only has 3 states. Adding it creates a meaningful distinction between "this might affect you eventually" and "you should review this now."

### 2.4 Sort order

**Default sort: severity-first, then alphabetical within tier.**

```
1. Action Required products (red) -- alphabetical
2. Under Review products (amber) -- alphabetical
3. Watch products (blue) -- alphabetical
4. All Clear products (green) -- alphabetical
```

This is the only sort order. No user-configurable sort. The most important products surface to the top automatically. Users with 50 products scanning the sidebar will find urgent items immediately.

### 2.5 Search & filter bar

```
+----------------------------+
| [Q] Search products...     |
| [Status: All v]            |
+----------------------------+
```

- **Search**: Filters by product name and brand. Instant (debounced 150ms). Clears with X button.
- **Status filter dropdown**: All | Action Required | Under Review | Watch | All Clear. Single-select.
- When both are active, they AND together.
- When filtering results in 0 products: show "No products match" with a clear-filters link.

### 2.6 Selected state

```
Selected product row:
- Background: white (#FFFFFF)
- Ring: 1px ring, slate-200/50
- Shadow: subtle (0 1px 2px rgba(0,0,0,0.05))
- Status dot: stays its status color (NOT amber -- correcting the marketing showcase pattern)
- Name: text-slate-900 (darkest)
- Transition: 150ms ease-out
```

Unselected hover: bg-slate-50, 100ms transition.

### 2.7 Scaling behavior

| Product count | Behavior                                                    |
|---------------|-------------------------------------------------------------|
| 0             | No sidebar list. Full-width onboarding prompt.              |
| 1-5           | All visible without scroll. Comfortable spacing.            |
| 6-15          | Sidebar scrolls. Search bar stays pinned at top.            |
| 16-30         | Search becomes essential. Filter by status helps.           |
| 31-100        | Sidebar groups by status with collapsible headers.          |

At 31+ products, the flat list becomes a grouped list:

```
ACTION REQUIRED (3)
  * Product A
  * Product B
  * Product C

UNDER REVIEW (5)
  * Product D
  ...

WATCH (8)            [collapsed by default if > 10]
  ...

ALL CLEAR (34)       [collapsed by default if > 10]
  ...
```

Group headers are collapsible. Action Required and Under Review are always expanded. Watch and All Clear collapse when the group has > 10 items, with a "Show all (34)" toggle.

### 2.8 "Add Product" button

Pinned at the bottom of the sidebar, always visible (not scrolled away).

```
+----------------------------+
| [+ Add Product]            |
+----------------------------+
```

- Style: ghost button, 1px dashed border, text-secondary. Not competing with product list.
- Hover: solid border, text-primary.
- Click: opens Add Product flow (separate design -- modal or inline TBD).

### 2.9 Mobile behavior (< 1024px)

- Sidebar collapses into a sheet/drawer triggered by a product-selector button in the detail panel header.
- The button shows the currently selected product name + status dot.
- Tapping it opens a full-height slide-over with the product list.
- Selecting a product closes the sheet and loads the detail panel.

```
Mobile detail panel header:
+------------------------------------------+
| [*] Marine Collagen Powder  [v]          |
|     3 active items                       |
+------------------------------------------+
```

The `[v]` chevron opens the product selector sheet.

---

## 3. Detail Panel -- Active Intelligence

When a product has active regulatory matches.

### 3.1 Layout

```
+--------------------------------------------------------------+
|                                                               |
|  Marine Collagen Powder                    [Edit] [...]       |
|  PureCoast Nutrition  |  Supplement                           |
|                                                               |
|  [*] ACTION REQUIRED          Last scanned: 2h ago           |
|                                                               |
+--------------------------------------------------------------+
|                                                               |
|  ACTIVE REGULATORY ITEMS (3)                                  |
|                                                               |
|  +----------------------------------------------------------+ |
|  | [*] Warning Letter: NovaBiotics LLC -- Identity Testing  | |
|  |     Failures for Marine Collagen Dietary Supplements      | |
|  |                                                           | |
|  |     RULE FINAL  |  Feb 28, 2026  |  CFSAN                | |
|  |                                                           | |
|  |     Direct substance match: marine collagen. Your         | |
|  |     Marine Collagen Powder uses the same ingredient...    | |
|  |                                                           | |
|  |     ACTION ITEMS                                          | |
|  |     1. Audit identity testing protocols against           | |
|  |        21 CFR 111.75(a)(1)(ii)                            | |
|  |     2. Verify COA includes marine collagen-specific...    | |
|  |     3. Confirm per-batch testing with your CM             | |
|  |                                                           | |
|  |     Source: fda.gov/...  |  21 CFR 111.75(a)(1)(ii)      | |
|  |                                                           | |
|  |     [Mark Resolved]  [Not Applicable]                     | |
|  +----------------------------------------------------------+ |
|                                                               |
|  +----------------------------------------------------------+ |
|  | [*] Recall: PureVita Labs -- Undeclared Allergens...      | |
|  |     (collapsed -- click to expand)                        | |
|  +----------------------------------------------------------+ |
|                                                               |
|  +----------------------------------------------------------+ |
|  | [*] Final Rule: Amendments to CGMP for Dietary...         | |
|  |     Deadline: August 15, 2026                             | |
|  |     (collapsed -- click to expand)                        | |
|  +----------------------------------------------------------+ |
|                                                               |
+--------------------------------------------------------------+
|                                                               |
|  PRODUCT DETAILS                                              |
|  Ingredients: Hydrolyzed Marine Collagen (fish), Hyaluronic  |
|  Acid, Vitamin C (Ascorbic Acid), Biotin                     |
|  UPC: 850012345678  |  DSLD: dsld-182456                     |
|                                                               |
+--------------------------------------------------------------+
|                                                               |
|  HISTORY (7 resolved items)                    [View all ->]  |
|                                                               |
+--------------------------------------------------------------+
```

### 3.2 Product header

```
Product name:     font-serif, text-2xl (24px), font-bold, text-slate-900
Brand + type:     font-mono, text-xs (13px), text-secondary
Status badge:     8px dot + label text, colored per status
Last scanned:     font-mono, text-xs, text-secondary
Edit button:      ghost, text-secondary, hover:text-primary
```

The product name is the hero. IBM Plex Serif, large -- this is the subscriber's product, named. The brand and type are metadata below it. Status is an inline badge with the 8px dot.

### 3.3 Match card anatomy

Each active match is a card. The first/most urgent match is expanded by default. Others are collapsed showing just the title row + deadline (if any).

**Expanded match card**:

```
+----------------------------------------------------------+
| [8px dot]  Title (2 lines max)              [Confidence]  |
|                                                            |
|            [ItemType badge]  |  Date  |  Office            |
|                                                            |
|   Impact summary (product-specific analysis, 2-3 lines)   |
|                                                            |
|   ACTION ITEMS                                             |
|   1. First action item text                                |
|   2. Second action item text                               |
|   3. Third action item text                                |
|                                                            |
|   Deadline: August 15, 2026                                |
|                                                            |
|   Source: fda.gov/...  |  21 CFR 111.75(a)(1)(ii)         |
|                                                            |
|   [Mark Resolved]  [Not Applicable]  [View Full Report ->] |
+----------------------------------------------------------+
```

**Collapsed match card**:

```
+----------------------------------------------------------+
| [8px dot]  Title (1 line, truncated)        [Confidence]  |
|            Deadline: June 15, 2026  |  2 action items     |
+----------------------------------------------------------+
```

### 3.4 Match card visual spec

```
Card:
  background: white
  border: 1px solid #E2E8F0
  border-radius: 4px
  shadow: 0 1px 3px rgba(0,0,0,0.08)
  padding: 16px (p-4)
  hover: translateY(-1px), deeper shadow (only when collapsed)
  expand/collapse: 200ms ease-out, height animation

Status dot:
  8px circle, positioned before the title
  Red (#DC2626) = urgency >= 80
  Amber (#D97706) = urgency >= 60
  Blue (#3B82F6) = urgency < 60

Confidence badge (right-aligned):
  font-mono, text-[10px], uppercase
  "Rule Final" | "Proposed" | "Guidance Pending" | "Safety Alert"
  bg-slate-50, border-slate-200, text-slate-600, rounded, px-2 py-0.5

Title:
  font-serif, text-sm (15px), font-semibold, text-slate-900
  line-clamp-2 (expanded), line-clamp-1 (collapsed)

Impact summary:
  text-sm (15px), text-slate-600, leading-relaxed
  This is the product-specific analysis -- not the generic summary.
  Always references the subscriber's product by name.

Action items:
  bg-slate-50, rounded, p-4, border-slate-100
  Numbered list, each item with a circle-number indicator
  font-sans, text-sm, text-slate-700

Deadline:
  font-semibold, text-sm, text-amber (#D97706)
  Own line, never buried in prose.
  Always visible even when card is collapsed.

Source:
  font-mono, text-[11px], text-secondary
  Always visible. Link to FDA source. CFR citation alongside.

Action buttons:
  "Mark Resolved" = primary ghost, text-sm, text-slate-600
  "Not Applicable" = secondary ghost, text-sm, text-slate-500
  "View Full Report" = text link, text-sm, text-amber, arrow
```

### 3.5 Match sort order within a product

Matches are sorted by: urgency score descending, then by date descending.
The most urgent, most recent match is always first and expanded.

### 3.6 "Mark Resolved" / "Not Applicable" interaction

**Mark Resolved**:
1. Click "Mark Resolved"
2. Confirmation appears inline (not a modal): "Resolved. This item will move to history."
3. Card fades to 50% opacity over 300ms
4. After 3 seconds (undo window): card slides out (200ms), match count in sidebar updates
5. Undo: "Undo" link appears during the 3-second window

**Not Applicable**:
1. Click "Not Applicable"
2. Brief inline prompt: "Why isn't this applicable?" with 3 quick options:
   - "Ingredient not actually in this product"
   - "Formulation already compliant"
   - "Other" (free text, optional)
3. Card moves to history with the "not applicable" tag and the reason
4. Same fade + slide-out animation as resolved

Both actions are user-driven. Nothing auto-resolves. The system never removes a match without the user's explicit action.

---

## 4. Detail Panel -- All Clear State

When a product has zero active matches.

```
+--------------------------------------------------------------+
|                                                               |
|  Biotin Complex 5000mcg                    [Edit] [...]       |
|  PureCoast Nutrition  |  Supplement                           |
|                                                               |
|  [*] ALL CLEAR                    Last scanned: 2h ago        |
|                                                               |
+--------------------------------------------------------------+
|                                                               |
|  +----------------------------------------------------------+ |
|  |                                                            | |
|  |     [green checkmark icon, 32px]                          | |
|  |                                                            | |
|  |     No active regulatory items                            | |
|  |     affect this product.                                  | |
|  |                                                            | |
|  |     Last full scan: March 5, 2026 at 8:00 AM ET          | |
|  |     Sources checked: Federal Register, CFSAN Warning      | |
|  |     Letters, Recalls, Safety Alerts                       | |
|  |                                                            | |
|  +----------------------------------------------------------+ |
|                                                               |
+--------------------------------------------------------------+
|                                                               |
|  PRODUCT DETAILS                                              |
|  Ingredients: Biotin (D-Biotin), Vitamin B6 (Pyridoxine      |
|  HCl), Zinc (Zinc Citrate), Selenium (Sodium Selenite)       |
|  UPC: 850012345999  |  DSLD: dsld-192034                     |
|                                                               |
+--------------------------------------------------------------+
|                                                               |
|  HISTORY (2 resolved items)                    [View all ->]  |
|                                                               |
+--------------------------------------------------------------+
```

### 4.1 All Clear card spec

```
Card:
  background: white
  border: 1px solid #E2E8F0
  border-radius: 4px
  padding: 32px, centered text

Checkmark:
  32px green (#059669) circle with white check
  Animate on first render: scale from 0 to 1 with slight bounce (300ms)
  Reduced-motion: no animation, just static checkmark

Headline:
  "No active regulatory items affect this product."
  font-sans, text-base (16px), font-medium, text-slate-700
  NOT "all clear" as a standalone phrase -- say what it means.

Metadata:
  "Last full scan: [date] at [time] ET"
  "Sources checked: [list]"
  font-mono, text-xs, text-slate-500
  This is the confidence signal. Subscribers need to know the system is actually watching.
```

This is a confirmed state, not an empty state. The green check animates in with purpose -- it communicates "we checked, you're good." The scan timestamp and source list provide the proof.

---

## 5. Product Context Panel (Right Panel)

At ≥1440px, this is the **third panel** — a persistent 340px column on the right. At <1440px, this content stacks below the matches in the single detail panel.

The right panel is the user's reference sheet. It answers: "What's in this product?" while the center panel answers: "What happened and why does it matter?"

### 5.1 Right panel layout (≥1440px)

```
+-----------------------------------+
|  Marine Collagen Powder   [Edit]  |
|  PureCoast · Supplement           |
+-----------------------------------+
|                                   |
|  INGREDIENTS                      |
|                                   |
|  ● Hydrolyzed Marine Collagen     |
|    (fish)                         |
|  ● Hyaluronic Acid                |
|  ● Vitamin C (Ascorbic Acid)      |
|  ● Biotin                         |
|                                   |
|  4 ingredients · 3 matched to     |
|  known substances                 |
|                                   |
+-----------------------------------+
|                                   |
|  DETAILS                          |
|                                   |
|  Category    Supplement >         |
|              Collagen             |
|  Brand       PureCoast Nutrition  |
|  UPC         850012345678         |
|  Source       DSLD (dsld-182456)  |
|  Added       Jan 15, 2026        |
|                                   |
+-----------------------------------+
|                                   |
|  PRODUCT IMAGE                    |
|  [label photo or placeholder]     |
|  128px square, rounded            |
|                                   |
+-----------------------------------+
```

### 5.2 Ingredient highlighting

When a match card in the center panel is expanded, the matching ingredient(s) in the right panel highlight — subtle amber background pulse on the specific ingredient row. This is the spatial mapping: "marine collagen is flagged" → the ingredient visually responds.

```
Ingredient row (normal):
  font-mono, text-[13px], text-slate-700
  ● dot: 6px, slate-300
  padding: py-1.5 px-0
  border-bottom: 1px solid slate-100 (between items)

Ingredient row (highlighted — when a match references this substance):
  background: amber-50 (#FFFBEB)
  ● dot: 6px, amber (#D97706)
  text: text-slate-900 (slightly darker)
  transition: 300ms ease-in-out
  Highlight applied via match.substance_ids intersection with ingredient.substance_id
```

### 5.3 Sticky behavior

The right panel scrolls independently from the center panel. On long product detail pages, the INGREDIENTS section is `position: sticky; top: 0` — it stays pinned while DETAILS scrolls below. The ingredients are the most-referenced part; they should always be visible.

### 5.4 Metadata grid

```
Label:    font-mono, text-[10px], uppercase, tracking-wider, text-secondary
Value:    font-sans, text-sm, text-slate-700
Layout:   single column (panel is only 340px)
Spacing:  gap-y-2.5
```

### 5.5 Collapse behavior (<1440px)

When the right panel collapses into the stacked layout, product details appear below the matches/all-clear section, before history. Same content, single-column layout, full width of the detail panel. Ingredient highlighting still works (scroll-to + highlight when a match is expanded).

---

## 6. History Section

Per-product timeline of all past regulatory matches (resolved + not applicable).

### 6.1 Collapsed view (default on detail panel)

```
+--------------------------------------------------------------+
|  HISTORY (7 resolved items)                    [View all ->]  |
|                                                               |
|  Mar 1   Warning Letter: NovaBiotics -- Resolved             |
|  Feb 26  Recall: PureVita Labs -- Not Applicable             |
|  Feb 15  Final Rule: CGMP Amendments -- Resolved             |
+--------------------------------------------------------------+
```

Shows the 3 most recent history items as one-liners. "View all" expands to full history view.

### 6.2 Expanded history view

Replaces the matches section (or appears below it) when "View all" is clicked. Back button returns to the active view.

```
+--------------------------------------------------------------+
|  HISTORY                                        [<- Active]   |
|                                                               |
|  +----------------------------------------------------------+ |
|  |  Mar 1, 2026                                              | |
|  |  [*] Warning Letter: NovaBiotics LLC -- Identity Testing  | |
|  |      Resolved by you on Mar 3, 2026                       | |
|  |      [Expand to see original analysis]                    | |
|  +----------------------------------------------------------+ |
|                                                               |
|  +----------------------------------------------------------+ |
|  |  Feb 26, 2026                                             | |
|  |  [*] Recall: PureVita Labs -- Undeclared Allergens        | |
|  |      Marked not applicable: "Formulation already          | |
|  |      compliant"                                           | |
|  |      [Expand to see original analysis]                    | |
|  +----------------------------------------------------------+ |
|                                                               |
|  ... more items ...                                           |
+--------------------------------------------------------------+
```

### 6.3 History card spec

```
Date:        font-mono, text-xs, text-secondary, left margin
Title:       font-serif, text-sm, font-semibold, text-slate-700 (NOT slate-900 -- muted vs active)
Resolution:  font-mono, text-xs, text-secondary
             "Resolved by you on [date]"
             "Marked not applicable: [reason]"
Expand:      Click anywhere on the card to expand and show the full original analysis, action items, source
             Same card anatomy as active matches, but with muted colors (slate-500 instead of slate-700)
Border-left: 2px solid, colored by original status (red/amber/blue) -- the only place a left border accent is used
```

### 6.4 History filtering

When viewing full history:
- Filter by: resolution type (Resolved | Not Applicable | All)
- Filter by: date range (Last 30 days | Last 90 days | All time)
- No search -- history items are few enough per product that scanning works.

---

## 7. Edit Mode

### 7.1 Entering edit mode

- Click "Edit" button in the right panel header (≥1440px) or in the stacked product details section (<1440px).
- **At ≥1440px**: The right panel transforms in-place into an edit form. The center panel (intelligence) stays fully visible and interactive — you can still read matches while editing. No dimming needed because the panels are independent.
- **At <1440px**: The stacked product details section transforms into editable fields. Matches above stay visible but dimmed (opacity 0.6).

### 7.2 Edit panel (right panel, ≥1440px)

```
+-----------------------------------+
|  EDITING              [Save] [✕]  |
+-----------------------------------+
|                                   |
|  Product Name                     |
|  [Marine Collagen Powder___]      |
|                                   |
|  Brand                            |
|  [PureCoast Nutrition______]      |
|                                   |
|  Type         [Supplement v]      |
|  Category     [Collagen v]        |
|                                   |
|  INGREDIENTS                      |
|  ┌───────────────────────────┐    |
|  │ Hydrolyzed Marine      [x]│    |
|  │ Collagen (fish)           │    |
|  │ Hyaluronic Acid        [x]│    |
|  │ Vitamin C (Ascorbic    [x]│    |
|  │ Acid)                     │    |
|  │ Biotin                 [x]│    |
|  │                           │    |
|  │ [+ Add ingredient]       │    |
|  └───────────────────────────┘    |
|                                   |
|  UPC / Barcode                    |
|  [850012345678____________]       |
|                                   |
|  Product Image                    |
|  [Upload photo] or [current img]  |
|                                   |
+-----------------------------------+
```

### 7.3 Ingredient editing

- Each ingredient is a removable chip/row with an [x] button.
- "Add ingredient" opens a text input at the bottom of the list.
- Ingredients are stored as `raw_ingredients_text` (comma-separated). Edit UI parses them into individual items for editing, re-joins on save.
- No drag-to-reorder for MVP. Order matches the original text order.
- Removing an ingredient: chip fades out (150ms). Does not re-trigger matching until save.

### 7.4 Save / Cancel behavior

```
Save:
  - Validates: name required, at least one ingredient recommended (warn, don't block)
  - POST/PATCH to API
  - On success: edit mode exits, green toast "Product updated"
  - On success with ingredient changes: additional note "Regulatory matching will re-run within 1 hour"
  - Button: primary style (#0F172A fill, white text)

Cancel:
  - If changes exist: "Discard changes?" inline confirmation
  - If no changes: exits immediately
  - Button: ghost style

Keyboard:
  - Cmd+Enter = Save
  - Escape = Cancel (with confirmation if dirty)
```

---

## 8. Empty / Edge States

### 8.1 No products yet (new user)

Full-width view (no sidebar). This is the onboarding moment.

```
+--------------------------------------------------------------+
|                                                               |
|           [icon: shield/canary outline, 48px, slate]          |
|                                                               |
|           Add your first product                              |
|           to start monitoring.                                |
|                                                               |
|           Policy Canary watches every FDA regulatory          |
|           change and tells you which ones affect              |
|           your specific products.                             |
|                                                               |
|           [+ Add Your First Product]                          |
|                                                               |
|           Or import from DSLD:                                |
|           [Search the Dietary Supplement Label Database]      |
|                                                               |
+--------------------------------------------------------------+
```

```
Headline:     font-sans, text-xl, font-semibold, text-slate-900
Body:         font-sans, text-sm, text-slate-600, max-w-md, centered
Primary CTA:  amber (#D97706) fill, white text, 4px radius
Secondary:    text link, text-amber
```

### 8.2 All products clear

Normal sidebar + detail panel layout. The sidebar shows all products with green dots. The selected product shows the all-clear state from section 4.

No special "everything is fine" celebration overlay. The green dots in the sidebar and the checkmark in the detail panel are the celebration. Calm is structural.

### 8.3 Product just added, no matches yet

```
+--------------------------------------------------------------+
|  Marine Collagen Powder                    [Edit] [...]       |
|  PureCoast Nutrition  |  Supplement                           |
|                                                               |
|  [*] SCANNING                     Added just now              |
|                                                               |
+--------------------------------------------------------------+
|                                                               |
|  +----------------------------------------------------------+ |
|  |                                                            | |
|  |     [animated pulse icon, subtle]                         | |
|  |                                                            | |
|  |     Scanning regulatory database...                       | |
|  |                                                            | |
|  |     We're matching your product's ingredients against     | |
|  |     the FDA regulatory database. This usually takes       | |
|  |     less than an hour. We'll email you when results       | |
|  |     are ready.                                            | |
|  |                                                            | |
|  +----------------------------------------------------------+ |
|                                                               |
+--------------------------------------------------------------+
```

Sidebar dot: slate/gray (#94A3B8) with a subtle pulse animation. Label: "Scanning..."

This state resolves automatically when the pipeline runs. No user action needed.

### 8.4 Sidebar with search/filter yielding no results

```
+----------------------------+
|  [Search: "vitamin"]       |
|  [Status: All]             |
+----------------------------+
|                            |
|  No products match         |
|  "vitamin"                 |
|                            |
|  [Clear search]            |
|                            |
+----------------------------+
```

---

## 9. Status Badge System

### 9.1 Four states

| State            | Dot   | Badge BG          | Badge Text    | Label text     |
|------------------|-------|--------------------|---------------|----------------|
| Action Required  | Red   | red/10, border red/20 | text-red     | Action Required|
| Under Review     | Amber | amber/10, border amber/20 | text-amber | Under Review |
| Watch            | Blue  | blue/10, border blue/20 | text-blue   | Watch         |
| All Clear        | Green | green/10, border green/20 | text-green | All Clear     |

### 9.2 Badge anatomy

```
[8px dot] [Label text]

Dot: 8px circle, solid color
Label: font-mono, text-[11px], font-medium, uppercase tracking

Inline usage (sidebar row): dot + label on one line
Header usage (detail panel): dot + label, slightly larger (text-xs)
```

### 9.3 Where badges appear

- **Sidebar**: dot + match count text (e.g., "3 active" or "All Clear")
- **Detail panel header**: dot + full label (e.g., "ACTION REQUIRED")
- **Match cards**: dot before title (colored by that match's urgency, not the product's overall status)

### 9.4 Status derivation

```
Product status = worst-case of all active matches:

if any match has urgency >= 80:  Action Required (red)
else if any match has urgency >= 60:  Under Review (amber)
else if any active matches:  Watch (blue)
else:  All Clear (green)
```

Match-level status (used on individual match cards):
```
Match urgency >= 80: red dot
Match urgency >= 60: amber dot
Match urgency < 60: blue dot
```

---

## 10. URL Structure & Navigation

### 10.1 Routes

```
/app/products                -> Products view, no product selected (shows first product, or empty state)
/app/products/[id]           -> Products view with specific product selected
/app/products/[id]/history   -> Products view with history expanded for specific product
/app/products/[id]/edit      -> Products view with edit mode open for specific product
```

### 10.2 Navigation behavior

- Selecting a product in sidebar: `router.push(/app/products/[id])` with shallow routing (no full page reload)
- Browser back button: returns to previous product selection (or no selection)
- Direct URL: loads sidebar + selects the specified product
- Invalid product ID: shows "Product not found" in detail panel, sidebar loads normally

### 10.3 Deep links

Every product has a shareable URL. This matters for:
- Email links ("View Marine Collagen Powder in your dashboard")
- Team sharing (future)
- Browser bookmarks

### 10.4 AppNav integration

Products is the default view. When a user logs in, they land on `/app/products`.

NavLinks update:
```
Feed | Search | Products
```

Products gets the active amber underline when on any `/app/products/*` route.

If a user navigates to `/app` directly, redirect to `/app/products`.

---

## 11. Interaction Patterns Summary

### 11.1 Animations

| Interaction                  | Animation                              | Duration |
|------------------------------|----------------------------------------|----------|
| Select product in sidebar    | Detail panel crossfade                 | 150ms    |
| Expand/collapse match card   | Height + opacity                       | 200ms    |
| Mark resolved (undo window)  | Fade to 50% opacity                    | 300ms    |
| Mark resolved (committed)    | Slide out + collapse                   | 200ms    |
| All-clear checkmark          | Scale bounce in                        | 300ms    |
| Scanning pulse               | Opacity pulse (0.4-1.0)               | 2s loop  |
| Card hover (collapsed)       | translateY(-1px), shadow deepen        | 150ms    |
| Edit mode enter              | Inline transform, matches dim          | 200ms    |
| Edit mode exit               | Reverse transform                      | 200ms    |
| Toast notification           | Slide in from top-right                | 200ms    |

All animations respect `prefers-reduced-motion`. Static fallbacks: instant state change, no movement.

### 11.2 Loading states

- **Initial page load**: Sidebar shows skeleton rows (8px dot + two text lines per row). Detail panel shows skeleton matching the product header + card shapes.
- **Product switch**: If data is cached, instant swap. If fetching, detail panel shows skeleton while sidebar selection is immediate.
- **Match resolution**: Optimistic -- card fades immediately, API call in background. On failure: card returns, error toast.

### 11.3 Keyboard navigation

- `j` / `k` or arrow keys: move between products in sidebar
- `Enter`: select focused product
- `1-9`: expand/collapse match cards by position
- `Escape`: close edit mode, deselect product
- `/`: focus search bar

---

## 12. Data Flow Summary

### What the page needs from the API

```typescript
// Sidebar data (lightweight, loaded once)
interface ProductSidebarItem {
  id: string;
  name: string;
  brand: string | null;
  product_type: string;
  status: 'action_required' | 'under_review' | 'watch' | 'all_clear';
  active_match_count: number;
  last_scanned_at: string;
}

// Detail panel data (loaded per-product on selection)
interface ProductDetail {
  product: SubscriberProduct;
  status: ProductStatus;
  active_matches: ProductMatchWithItem[];  // matches joined with regulatory_items + enrichments
  recent_history: ResolvedMatch[];         // last 3 resolved items
  total_history_count: number;
}

// Individual match with full item data
interface ProductMatchWithItem {
  match: ProductMatch;
  item: RegulatoryItem;
  enrichment: ItemEnrichment | null;
  urgency_score: number;
  confidence_label: string;  // "Rule Final" | "Proposed" | etc.
}
```

### API routes needed

```
GET  /api/products              -> ProductSidebarItem[]
GET  /api/products/[id]         -> ProductDetail
POST /api/products/[id]/resolve -> { match_id, resolution: 'resolved' | 'not_applicable', reason? }
GET  /api/products/[id]/history -> ResolvedMatch[] (paginated)
```

---

## 13. Component Architecture

```
ProductsPage (server component -- route handler, data fetch)
  |
  +-- ProductsLayout (client -- manages selection, breakpoint detection)
        |
        +-- ProductSidebar (280px, left)
        |     +-- SidebarHeader ("Monitored Products", count)
        |     +-- SidebarSearchFilter (search input + status dropdown)
        |     +-- SidebarProductList
        |     |     +-- SidebarProductGroup (if 31+ products, collapsible)
        |     |     +-- SidebarProductRow (per product, status dot + name + count)
        |     +-- SidebarAddButton (pinned bottom)
        |
        +-- IntelligencePanel (center, flex-1, scrolls independently)
        |     +-- ProductHeader (name, brand, type, status badge, last scanned)
        |     +-- ActiveMatches (when matches > 0)
        |     |     +-- MatchCard (per match, expand/collapse)
        |     |           +-- MatchHeader (dot, title, confidence badge)
        |     |           +-- MatchBody (product-specific analysis, action items, deadline, source)
        |     |           +-- MatchActions (Mark Resolved, Not Applicable, View Full Report)
        |     +-- AllClearCard (when matches == 0, green check + scan metadata)
        |     +-- ProductDetails (ONLY at <1440px -- stacked below matches)
        |     +-- HistoryPreview (last 3 + "view all")
        |     +-- HistoryView (expanded, replaces matches section)
        |
        +-- ProductContextPanel (340px, right, ≥1440px only, scrolls independently)
              +-- ContextHeader (product name + [Edit] button)
              +-- IngredientList (sticky, highlights matching substances)
              |     +-- IngredientRow (dot, name, highlight state)
              +-- ProductMetadata (category, brand, UPC, source, added date)
              +-- ProductImage (optional, 128px square)
              +-- ProductEditForm (replaces entire panel content when editing)
```

### 13.1 Responsive behavior

```
≥1440px:  Sidebar (280px) | Intelligence (flex-1) | Context (340px)
          Three independent scroll areas. Ingredients sticky in Context.

1024-1439px: Sidebar (280px) | Intelligence+Context stacked (flex-1)
             Content left-aligned, max-w-3xl. Product details below matches.

<1024px:  Mobile drawer for product selection + single scrollable panel.
```

### 13.2 State management

```
ProductsLayout manages:
  - selectedProductId (synced to URL via router.push)
  - expandedMatchId (which match card is expanded)
  - isEditing (boolean, controls right panel edit mode)
  - highlightedSubstanceIds (Set<string>, driven by expanded match card)

highlightedSubstanceIds flows from IntelligencePanel → ProductContextPanel:
  When a MatchCard expands, it emits its substance_ids.
  ProductContextPanel reads these and highlights the corresponding IngredientRows.
  When a MatchCard collapses, highlights clear.
```

---

## 14. What This Replaces

The current `ProductsPageClient.tsx` uses a card grid + right slide-out panel pattern:
- Main area: 2-column grid of `ProductStatusCard` components, grouped by status
- Right panel: 480px `ProductDetailPanel` that slides in when a card is clicked

This design replaces that with:
- **Left panel** (280px): persistent product sidebar with search/filter
- **Center panel** (flex-1): intelligence — matches, actions, history
- **Right panel** (340px, ≥1440px): product context — ingredients, metadata, edit
- At <1440px, right panel content stacks into the center panel

Files to modify:
- `src/app/app/products/page.tsx` -- server component, data fetching
- `src/components/app/ProductsPageClient.tsx` -- complete rewrite to three-panel layout (becomes ProductsLayout)
- `src/components/app/ProductStatusCard.tsx` -- replace with SidebarProductRow
- `src/components/app/ProductDetailPanel.tsx` -- split into IntelligencePanel + ProductContextPanel

New components needed:
- `ProductsLayout.tsx` -- three-panel shell with breakpoint detection
- `ProductSidebar.tsx` -- sidebar with search, filter, product list
- `SidebarProductRow.tsx` -- individual product row in sidebar
- `IntelligencePanel.tsx` -- center panel (matches, all-clear, history)
- `ProductContextPanel.tsx` -- right panel (ingredients, metadata, edit)
- `MatchCard.tsx` -- expandable match card with actions
- `AllClearCard.tsx` -- confirmed all-clear state
- `IngredientList.tsx` -- ingredient rows with substance highlighting
- `ProductEditForm.tsx` -- inline edit form (replaces right panel content)
- `HistoryPreview.tsx` -- collapsed history (3 items + view all)
- `HistoryView.tsx` -- expanded history timeline
- `HistoryPreview.tsx`
- `HistoryView.tsx`

Files to update:
- `/Users/rb/Documents/coding_projects/policy_canary/src/components/app/NavLinks.tsx` -- make Products the first/default nav item
- `/Users/rb/Documents/coding_projects/policy_canary/src/app/app/layout.tsx` -- no structural changes needed
