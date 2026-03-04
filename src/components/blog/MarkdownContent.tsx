"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReactNode } from "react";
import { Children, isValidElement } from "react";

// ─── Helpers ────────────────────────────────────────────

/** Recursively extract plain text from React children. */
function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const props = node.props as Record<string, unknown>;
    if (props.children) return extractText(props.children as ReactNode);
  }
  return "";
}

type CalloutType = "alert" | "stats" | "diagram" | "compare" | "cta";

/**
 * Detect `[!type]` callout prefix from the first paragraph child of a blockquote.
 * Convention: `> [!alert]` on its own line, followed by `>` blank line, then content.
 */
function detectCallout(children: ReactNode): {
  type: CalloutType | null;
  rest: ReactNode[];
} {
  const arr = Children.toArray(children);
  if (arr.length === 0) return { type: null, rest: arr };

  // react-markdown inserts "\n" text nodes between block elements.
  // Skip whitespace-only strings to find the first real child.
  const firstIdx = arr.findIndex((child) =>
    typeof child === "string" ? child.trim().length > 0 : true,
  );
  if (firstIdx === -1) return { type: null, rest: arr };

  const first = arr[firstIdx];
  const text = extractText(first).trim();
  const match = text.match(/^\[!(alert|stats|diagram|compare|cta)\]$/i);

  if (match) {
    return {
      type: match[1].toLowerCase() as CalloutType,
      rest: arr.slice(firstIdx + 1),
    };
  }

  return { type: null, rest: arr };
}

// ─── Alert Card ─────────────────────────────────────────
// Product intelligence email mockup — dark bg, amber accent, structured layout.

function AlertCard({ children }: { children: ReactNode }) {
  return (
    <div className="my-8 rounded-xl overflow-hidden border border-slate-700 bg-[#0F172A] shadow-lg">
      <div className="border-b border-amber/20 px-5 py-3 flex items-center gap-2.5 bg-amber/5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber opacity-60" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber" />
        </span>
        <span className="text-xs font-semibold tracking-widest uppercase text-amber">
          Product Alert
        </span>
      </div>
      <div className="px-5 py-5 [&_p]:text-slate-300 [&_p]:leading-7 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:text-white [&_strong]:font-semibold [&_ol]:text-slate-300 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_ol]:mb-3 [&_li]:leading-7 [&_a]:text-amber [&_a]:underline [&_a]:underline-offset-2">
        {children}
      </div>
    </div>
  );
}

// ─── Stat Callouts ──────────────────────────────────────
// Grid of large-number stat cards. Expects each child paragraph as "value | description".

function StatCallouts({ children }: { children: ReactNode }) {
  const stats: { value: string; description: string }[] = [];

  Children.forEach(children, (child) => {
    if (typeof child === "string" && !child.trim()) return; // skip whitespace nodes
    const text = extractText(child).trim();
    if (text.includes("|")) {
      const [value, ...rest] = text.split("|");
      stats.push({
        value: value.trim(),
        description: rest.join("|").trim(),
      });
    }
  });

  if (stats.length === 0) return <blockquote>{children}</blockquote>;

  return (
    <div
      className={`my-8 grid grid-cols-1 gap-4 ${
        stats.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
      }`}
    >
      {stats.map((stat, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-surface-muted p-6 text-center"
        >
          <div className="text-3xl font-bold text-amber mb-1.5 font-mono">
            {stat.value}
          </div>
          <div className="text-sm text-text-secondary leading-snug">
            {stat.description}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Flow Diagram ───────────────────────────────────────
// Horizontal flow with boxes and arrows. "???" renders as highlighted gap.

function FlowDiagram({ children }: { children: ReactNode }) {
  const text = extractText(children);
  const steps = text
    .split("→")
    .map((s) => s.trim())
    .filter(Boolean);

  if (steps.length === 0) return <blockquote>{children}</blockquote>;

  return (
    <div className="my-8 py-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-0">
      {steps.map((step, i) => {
        const isGap = step === "???" || step.startsWith("?");
        return (
          <div
            key={i}
            className="flex items-center flex-col sm:flex-row gap-3 sm:gap-0"
          >
            <div
              className={[
                "px-5 py-3.5 rounded-lg text-sm font-medium text-center min-w-[160px]",
                isGap
                  ? "border-2 border-dashed border-amber bg-amber-muted text-amber-text font-semibold"
                  : "border border-border bg-surface shadow-sm text-text-primary",
              ].join(" ")}
            >
              {isGap ? "Which of MY products?" : step}
            </div>
            {i < steps.length - 1 && (
              <svg
                className="w-5 h-5 text-text-secondary shrink-0 rotate-90 sm:rotate-0 sm:mx-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  d="M5 12h14m-4-4 4 4-4 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Comparison Card ────────────────────────────────────
// Side-by-side comparison. "Policy Canary" label triggers highlight styling.

function ComparisonCard({ children }: { children: ReactNode }) {
  const items: { label: string; content: string }[] = [];

  Children.forEach(children, (child) => {
    if (typeof child === "string" && !child.trim()) return; // skip whitespace nodes
    const text = extractText(child).trim();
    if (!text || !text.includes(":")) return;
    const colonIdx = text.indexOf(":");
    items.push({
      label: text.slice(0, colonIdx).trim(),
      content: text.slice(colonIdx + 1).trim(),
    });
  });

  if (items.length < 2) return <blockquote>{children}</blockquote>;

  return (
    <div className="my-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map((item, i) => {
        const highlight = item.label.toLowerCase().includes("policy canary");
        return (
          <div
            key={i}
            className={[
              "rounded-xl border p-5",
              highlight
                ? "border-amber/40 bg-amber-muted/30"
                : "border-border bg-surface-muted",
            ].join(" ")}
          >
            <div
              className={[
                "text-xs font-semibold uppercase tracking-wider mb-2.5",
                highlight ? "text-amber-text" : "text-text-secondary",
              ].join(" ")}
            >
              {item.label}
            </div>
            <p
              className={[
                "text-sm leading-relaxed",
                highlight
                  ? "text-text-primary font-medium"
                  : "text-text-secondary italic",
              ].join(" ")}
            >
              &ldquo;{item.content}&rdquo;
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── CTA Card ───────────────────────────────────────────
// Dark card with amber button styling for links.

function CtaCard({ children }: { children: ReactNode }) {
  return (
    <div className="my-8 rounded-xl bg-surface-dark p-8 text-center">
      <div className="[&_p]:text-slate-300 [&_p]:text-lg [&_p]:mb-5 [&_p:last-child]:mb-0 [&_a]:inline-block [&_a]:bg-amber [&_a]:text-surface-dark [&_a]:font-semibold [&_a]:px-6 [&_a]:py-3 [&_a]:rounded-lg [&_a]:no-underline hover:[&_a]:bg-amber/90 [&_a]:transition-colors">
        {children}
      </div>
    </div>
  );
}

// ─── Blockquote Router ──────────────────────────────────

function CustomBlockquote({ children }: { children?: ReactNode }) {
  const { type, rest } = detectCallout(children);

  switch (type) {
    case "alert":
      return <AlertCard>{rest}</AlertCard>;
    case "stats":
      return <StatCallouts>{rest}</StatCallouts>;
    case "diagram":
      return <FlowDiagram>{rest}</FlowDiagram>;
    case "compare":
      return <ComparisonCard>{rest}</ComparisonCard>;
    case "cta":
      return <CtaCard>{rest}</CtaCard>;
    default:
      return (
        <blockquote className="border-l-4 border-amber/30 pl-4 italic text-text-secondary my-6">
          {children}
        </blockquote>
      );
  }
}

// ─── Main Component ─────────────────────────────────────

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div
      className={[
        "[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-text-primary [&_h2]:mt-10 [&_h2]:mb-4",
        "[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-text-primary [&_h3]:mt-8 [&_h3]:mb-3",
        "[&_p]:text-base [&_p]:text-text-secondary [&_p]:leading-7 [&_p]:mb-5",
        "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-5 [&_ul]:text-text-secondary [&_ul]:leading-7",
        "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-5 [&_ol]:text-text-secondary [&_ol]:leading-7",
        "[&_li]:mb-1.5",
        "[&_a]:text-amber [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-amber/80",
        "[&_strong]:font-semibold [&_strong]:text-text-primary",
        "[&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono",
        "[&_pre]:bg-slate-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-5 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_hr]:my-8 [&_hr]:border-border",
        "[&_table]:w-full [&_table]:border-collapse [&_table]:mb-5",
        "[&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:bg-slate-50",
        "[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2",
      ].join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          blockquote: CustomBlockquote,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
