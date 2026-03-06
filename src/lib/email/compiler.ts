import { generateText } from "ai";
import { render } from "@react-email/components";
import { claudeSonnet } from "@/lib/ai/anthropic";
import { trackLLM } from "@/lib/analytics";
import BriefingEmail from "./templates/BriefingEmail";
import WeeklyNewsletter from "./templates/WeeklyNewsletter";
import AlertEmail from "./templates/AlertEmail";
import type { AlertEmailProps } from "./templates/AlertEmail";
import type { BriefingData, WeeklyDigestData } from "./queries";
import { SITE_URL } from "./constants";

// ---------------------------------------------------------------------------
// Compile Product Intelligence Briefing (paid weekly email)
// ---------------------------------------------------------------------------

export interface CompiledBriefing {
  subject: string;
  html: string;
}

export async function compileBriefing(
  data: BriefingData
): Promise<CompiledBriefing> {
  const hasItems = data.product_items.length > 0;

  // Generate editorial opening with Claude Sonnet (only when there are items)
  let editorial_opening: string | undefined;
  if (hasItems) {
    editorial_opening = await generateEditorialOpening(data);
  }

  // Generate subject line
  const subject = generateBriefingSubject(data);

  // Render React Email template to HTML
  const html = await render(
    BriefingEmail({ data, editorial_opening })
  );

  return { subject, html };
}

// ---------------------------------------------------------------------------
// Compile Regulatory Alert (event-driven, immediate)
// ---------------------------------------------------------------------------

export interface CompiledAlert {
  subject: string;
  html: string;
}

export async function compileAlert(
  props: AlertEmailProps
): Promise<CompiledAlert> {
  const subject = `${props.product_name} | ${getAlertLabel(props.action_type)}: ${truncate(props.title, 50)}`;

  const html = await render(AlertEmail(props));

  return { subject, html };
}

// ---------------------------------------------------------------------------
// Compile Weekly Newsletter (free, same for all subscribers)
// ---------------------------------------------------------------------------

export interface CompiledNewsletter {
  subject: string;
  html: string;
}

export async function compileNewsletter(
  data: WeeklyDigestData,
  unsubscribe_url: string
): Promise<CompiledNewsletter> {
  // Generate lead story and "the number" with Claude Sonnet
  const [leadStory, theNumber] = await Promise.all([
    generateLeadStory(data),
    generateTheNumber(data),
  ]);

  // Lead with the story, not a count
  const leadTitle = leadStory?.title;
  const subject = leadTitle
    ? `${truncate(leadTitle, 50)} | Week in FDA`
    : `Week in FDA: ${data.total_items} regulatory actions`;

  const html = await render(
    WeeklyNewsletter({
      data,
      lead_story: leadStory ?? undefined,
      the_number: theNumber ?? undefined,
      unsubscribe_url,
    })
  );

  return { subject, html };
}

// ---------------------------------------------------------------------------
// Claude Sonnet editorial generation
// ---------------------------------------------------------------------------

async function generateEditorialOpening(
  data: BriefingData
): Promise<string | undefined> {
  const topItems = data.product_items.slice(0, 3);
  if (topItems.length === 0) return undefined;

  const itemSummaries = topItems
    .map(
      (i) =>
        `- "${i.title}" (${i.regulatory_action_type ?? "general"}) affecting: ${i.matched_products.map((p) => p.product_name).join(", ")}`
    )
    .join("\n");

  try {
    const { text } = await trackLLM(null, "editorial_opening", "claude-sonnet", () =>
      generateText({
        model: claudeSonnet,
        maxOutputTokens: 150,
        temperature: 0.3,
        system: `You write editorial openings for Policy Canary's Product Intelligence Briefing — a weekly regulatory email for FDA-regulated brands.

Voice: Senior regulatory analyst briefing their team. Calm, specific, calibrated. No hype.
Rules:
- 1-2 sentences maximum
- Lead with the most important regulatory development
- Reference specific products or categories if relevant
- Never say "breaking", "urgent", "comprehensive overview", or "stay compliant"
- Never give legal advice or say "action required"
- Match confidence to regulatory status: say "finalized" for final rules, "proposed" for proposed rules, "draft guidance" for guidance documents
- Never describe a proposed rule as if it's already in effect
- Reference the specific regulatory action type provided in the data`,
        prompt: `Write a 1-2 sentence editorial opening for this week's briefing. The subscriber monitors ${data.products.length} products. Here are the top matched items:

${itemSummaries}

Total items reviewed this week: ${data.total_items_reviewed}`,
      })
    );

    return text.trim() || undefined;
  } catch (err) {
    console.error("[email-compiler] editorial generation failed:", err);
    return undefined;
  }
}

async function generateLeadStory(
  data: WeeklyDigestData
): Promise<{
  title: string;
  body: string;
  source_url?: string;
  regulation?: string;
} | null> {
  const topItem = data.items[0];
  if (!topItem) return null;

  try {
    const { text } = await trackLLM(null, "lead_story", "claude-sonnet", () =>
      generateText({
        model: claudeSonnet,
        maxOutputTokens: 400,
        temperature: 0.3,
        system: `You write lead stories for Policy Canary Weekly — a free FDA regulatory newsletter.

Voice: Senior regulatory analyst briefing a broad audience. Clear, specific, accessible.
Rules:
- 2-3 paragraphs, plain text (no markdown)
- Explain what happened AND why it matters for FDA-regulated brands
- Always reference the specific CFR or Federal Register citation if applicable
- Match confidence to regulatory status: "finalized" for final rules, "proposed" for proposed rules
- Never describe a proposed rule as if it's already in effect
- Never say "breaking", "urgent", or "comprehensive overview"
- Never give legal advice`,
        prompt: `Write a lead story (2-3 paragraphs) about this regulatory development:

Title: ${topItem.title}
Type: ${topItem.item_type}
Published: ${topItem.published_date}
Action type: ${topItem.regulatory_action_type ?? "N/A"}
Summary: ${topItem.summary ?? "No summary available"}
Deadline: ${topItem.deadline ?? "None"}

Context: This week saw ${data.total_items} total regulatory actions.`,
      })
    );

    return {
      title: topItem.title,
      body: text.trim(),
      source_url: topItem.source_url ?? undefined,
    };
  } catch (err) {
    console.error("[email-compiler] lead story generation failed:", err);
    return null;
  }
}

async function generateTheNumber(
  data: WeeklyDigestData
): Promise<{ value: string; context: string; source_url?: string } | null> {
  try {
    const { text } = await trackLLM(null, "the_number", "claude-sonnet", () =>
      generateText({
        model: claudeSonnet,
        maxOutputTokens: 100,
        temperature: 0.3,
        system: `You pick a single sticky data point from FDA regulatory data for a newsletter section called "THE NUMBER."

Output format (exactly 2 lines):
Line 1: The number (e.g., "47", "$2.3M", "12 days")
Line 2: One sentence of context explaining why this number matters.

Rules:
- The number should be surprising or actionable — not just a count of total actions
- Prefer numbers that reveal a trend, a cost, a deadline, or a pattern
- Never pick the total count of regulatory actions as the number
- Keep context to ONE sentence
- Be specific and concrete`,
        prompt: `This week: ${data.total_items} regulatory actions. Items include:
${data.items
  .slice(0, 8)
  .map((i) => `- ${i.title} (${i.item_type}, ${i.regulatory_action_type ?? "general"})`)
  .join("\n")}

${data.bridge.products_with_action_items > 0 ? `${data.bridge.products_with_action_items} monitored products received action items across ${data.bridge.total_monitored_products} total monitored.` : ""}

Pick one compelling number from this week's data.`,
      })
    );

    const lines = text.trim().split("\n").filter(Boolean);
    if (lines.length < 2) return null;

    return {
      value: lines[0].trim(),
      context: lines.slice(1).join(" ").trim(),
    };
  } catch (err) {
    console.error("[email-compiler] the_number generation failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Subject line generation
// ---------------------------------------------------------------------------

function generateBriefingSubject(data: BriefingData): string {
  const hasItems = data.product_items.length > 0;

  if (!hasItems) {
    return `All clear | ${data.total_items_reviewed} FDA actions reviewed, none affect your products`;
  }

  // Get unique affected product names
  const affectedNames = [
    ...new Set(
      data.product_items.flatMap((i) =>
        i.matched_products.map((p) => p.product_name)
      )
    ),
  ];

  if (affectedNames.length === 1) {
    return `${affectedNames[0]}: FDA action this week`;
  }

  const first = affectedNames[0];
  const rest = affectedNames.length - 1;
  return `${first} + ${rest} more: FDA actions this week`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAlertLabel(actionType: string | null): string {
  switch (actionType) {
    case "recall":
      return "Recall";
    case "safety_alert":
      return "Safety Alert";
    case "ban_restriction":
      return "Ban/Restriction";
    default:
      return "Regulatory Action";
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "...";
}
