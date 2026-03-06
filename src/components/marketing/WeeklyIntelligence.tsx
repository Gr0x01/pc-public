"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence, useInView, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { StatCounter } from "./StatCounter";
import type { ShowcaseItem } from "@/lib/intelligence/weekly-snapshot";

const EmailSchema = z.string().email("Please enter a valid email address");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeeklyIntelligenceProps {
  weekStart: string;
  weekEnd: string;
  narrative: string;
  sectorCounts: Record<string, number>;
  totalItems: number;
  totalSectors: number;
  totalSubstancesFlagged: number;
  totalDeadlines: number;
  showcaseItems: ShowcaseItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SECTOR_LABELS: Record<string, string> = {
  food: "Food",
  supplement: "Supplements",
  cosmetic: "Cosmetics",
  pharmaceutical: "Pharma",
  medical_device: "Devices",
  biologic: "Biologics",
  tobacco: "Tobacco",
  veterinary: "Veterinary",
};

const TYPE_LABELS: Record<string, string> = {
  recall: "Recall",
  warning_letter: "Warning Letter",
  safety_alert: "Safety Alert",
  proposed_rule: "Proposed Rule",
  rule: "Final Rule",
  notice: "Notice",
  press_release: "Press Release",
  guidance: "Guidance",
  draft_guidance: "Draft Guidance",
  import_alert: "Import Alert",
  "483_observation": "483 Observation",
};

const TYPE_COLORS: Record<string, string> = {
  recall: "bg-red-50 text-red-700 border-red-100",
  warning_letter: "bg-red-50 text-red-700 border-red-100",
  safety_alert: "bg-amber-50 text-amber-700 border-amber-100",
  proposed_rule: "bg-blue-50 text-blue-700 border-blue-100",
  rule: "bg-blue-50 text-blue-700 border-blue-100",
  notice: "bg-slate-50 text-slate-600 border-slate-200",
  press_release: "bg-slate-50 text-slate-600 border-slate-200",
};

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startStr = s.toLocaleDateString("en-US", opts);
  const endStr = e.toLocaleDateString("en-US", {
    ...opts,
    year: "numeric",
  });
  return `${startStr}\u2013${endStr}`;
}

function formatCategory(slug: string): string {
  return slug
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TypeBadge({ type }: { type: string }) {
  const colors = TYPE_COLORS[type] ?? TYPE_COLORS.notice;
  return (
    <span
      className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded border ${colors}`}
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

function SubstancePill({ name }: { name: string }) {
  return (
    <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-surface-dark/[0.04] text-surface-dark border border-surface-dark/10 font-medium">
      {name}
    </span>
  );
}

function CategoryPill({ slug }: { slug: string }) {
  return (
    <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
      {formatCategory(slug)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Featured Item — card layout, white bg
// ---------------------------------------------------------------------------

function FeaturedItem({ item }: { item: ShowcaseItem }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden h-full flex flex-col">
      <div className="p-7 md:p-10 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-12 gap-y-6 h-full">
        {/* Left: meta column */}
        <div className="md:w-52 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <TypeBadge type={item.item_type} />
            {item.deadline && (
              <span className="md:hidden text-[11px] font-semibold text-amber-600 self-center">
                Due: {item.deadline}
              </span>
            )}
          </div>
          
          {item.company_name && (
            <p className="text-[14px] text-slate-500 leading-snug font-medium">
              {item.company_name}
            </p>
          )}
          
          <div className="hidden md:block mt-auto pb-1">
            {item.deadline && (
              <p className="text-[13px] font-semibold text-amber-600 mb-3">
                Deadline: {item.deadline}
              </p>
            )}
            {item.source_url && (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-slate-400 hover:text-amber-600 transition-colors underline decoration-slate-300 hover:decoration-amber-400"
              >
                View Source {"\u2197"}
              </a>
            )}
          </div>
        </div>

        {/* Right: content */}
        <div className="flex flex-col h-full">
          {/* Substance pills */}
          {item.affected_ingredients.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {item.affected_ingredients.map((name) => (
                <SubstancePill key={name} name={name} />
              ))}
            </div>
          )}

          <h4 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight tracking-tight mb-2">
            {item.title}
          </h4>

          <p className="text-[16px] text-slate-600 leading-relaxed mt-2 mb-6 flex-grow">
            {item.summary}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4 mt-auto pt-4 border-t border-slate-100/50">
            {/* Category pills */}
            <div className="flex flex-wrap gap-1.5">
              {item.affected_product_categories.map((slug) => (
                <CategoryPill key={slug} slug={slug} />
              ))}
            </div>
            
            {/* Mobile-only source link */}
            <div className="md:hidden">
              {item.source_url && (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] text-slate-400"
                >
                  Source {"\u2197"}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact Item — consistent card layout
// ---------------------------------------------------------------------------

function CompactItem({ item }: { item: ShowcaseItem }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 h-full flex flex-col group hover:border-amber-200/50 transition-colors">
      {/* Header: Type & Deadline */}
      <div className="flex justify-between items-start mb-3">
        <TypeBadge type={item.item_type} />
        {item.deadline && (
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded tracking-tight">
            Due {item.deadline}
          </span>
        )}
      </div>

      {/* Substance pills */}
      {item.affected_ingredients.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {item.affected_ingredients.slice(0, 2).map((name) => (
            <SubstancePill key={name} name={name} />
          ))}
          {item.affected_ingredients.length > 2 && (
            <span className="text-[10px] text-slate-400 self-center font-medium bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
              +{item.affected_ingredients.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Title */}
      <h4 className="text-[16px] font-bold text-slate-900 leading-tight mb-2 tracking-tight">
        {item.title}
      </h4>

      {/* Company */}
      {item.company_name && (
        <p className="text-[13px] text-slate-500 mb-3 font-medium">
          {item.company_name}
        </p>
      )}

      {/* Summary */}
      <p className="text-[14px] text-slate-600 leading-relaxed line-clamp-4 mb-4 flex-grow">
        {item.summary}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
        <div className="flex flex-wrap gap-1">
           {/* Limit categories to 1 to save space */}
           {item.affected_product_categories.slice(0, 1).map((slug) => (
              <CategoryPill key={slug} slug={slug} />
            ))}
        </div>
        
        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] text-slate-400 hover:text-amber-600 transition-colors flex items-center gap-1 group-hover:text-amber-500"
          >
            Source <span className="text-[8px] opacity-70">{"\u2197"}</span>
          </a>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Newsletter Capture (inline, replaces bridge CTA)
// ---------------------------------------------------------------------------

function NewsletterInline({
  reduce,
  fadeUp,
}: {
  reduce: boolean | null;
  fadeUp: (delay: number) => Record<string, unknown>;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = EmailSchema.safeParse(email);
    if (!parsed.success) {
      setStatus("error");
      setErrorMessage(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }
    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(json.error?.message ?? "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <motion.div className="mt-12 md:mt-16" {...fadeUp(0.2)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
        {/* Left: Copy */}
        <div>
          <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
            Don&apos;t miss the next&nbsp;briefing.
          </h3>
          <p className="text-[16px] text-slate-600 leading-relaxed">
            The weekly FDA digest for product teams. Free. No account&nbsp;required.
          </p>
        </div>

        {/* Right: Form / Success */}
        <div>
          <AnimatePresence mode="wait">
            {status === "success" ? (
              <motion.div
                key="success"
                initial={reduce ? { opacity: 1 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2.5"
              >
                <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                <p className="text-[15px] font-medium text-slate-600">
                  You&apos;re subscribed. First issue arrives next&nbsp;Friday.
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
              >
                <div className="relative">
                  <input
                    type="email"
                    aria-label="Email address"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === "error") setStatus("idle");
                    }}
                    required
                    autoComplete="email"
                    disabled={status === "loading"}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-4 pr-32 py-3.5 shadow-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-[15px]"
                  />
                  <div className="absolute right-1.5 top-1.5 bottom-1.5">
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="h-full bg-slate-900 hover:bg-slate-800 text-white px-5 rounded-md font-medium text-[13px] transition-colors duration-150 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {status === "loading" && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      )}
                      Subscribe
                    </button>
                  </div>
                </div>
                {status === "error" && (
                  <p role="alert" className="text-[13px] text-red-600 mt-2">{errorMessage}</p>
                )}
                <p className="text-[12px] text-slate-400 mt-3">
                  No spam. Unsubscribe&nbsp;anytime.
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Section
// ---------------------------------------------------------------------------

export default function WeeklyIntelligence(props: WeeklyIntelligenceProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduce = useReducedMotion();

  const fadeUp = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 } as const,
          whileInView: { opacity: 1, y: 0 } as const,
          viewport: { once: true, margin: "-60px" } as const,
          transition: { duration: 0.45, ease: "easeOut" as const, delay },
        };

  const cardContainer = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduce ? 0 : 0.12,
        delayChildren: reduce ? 0 : 0.05,
      },
    },
  };

  const cardItem = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduce ? 0 : 0.45, ease: "easeOut" as const },
    },
  };

  const sortedSectors = Object.entries(props.sectorCounts).sort(
    ([, a], [, b]) => b - a
  );

  const [featured, ...rest] = props.showcaseItems;
  const compact = rest.slice(0, 3);

  return (
    <section className="bg-slate-50 py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-50/40 via-transparent to-transparent pointer-events-none" />
      <div className="max-w-5xl mx-auto relative z-10" ref={ref}>

        {/* ── Header: unified context block ────────── */}
        <motion.div className="mb-14 text-center max-w-3xl mx-auto" {...fadeUp(0)}>
          <p className="font-mono text-[11px] text-amber-text uppercase tracking-widest mb-3 font-semibold">
            WEEKLY INTELLIGENCE
          </p>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-tight mb-2">
            The FDA This Week
          </h2>
          <p className="font-mono text-[13px] text-slate-400 mb-6">
            {formatDateRange(props.weekStart, props.weekEnd)}
          </p>
          
          <p className="text-[16px] md:text-[17px] text-slate-600 leading-relaxed mb-8">
            {props.narrative}
          </p>

          {/* Stats Row */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 py-6 border-y border-slate-200/60 bg-white/50 rounded-xl backdrop-blur-sm">
            {[
              { value: props.totalItems, label: "items tracked" },
              { value: props.totalSectors, label: "sectors active" },
              { value: props.totalSubstancesFlagged, label: "substances flagged" },
              { value: props.totalDeadlines, label: "deadlines identified" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center px-2">
                <span className="block text-2xl font-bold text-slate-900 tabular-nums leading-none mb-1">
                  <StatCounter end={value} />
                </span>
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Sectors Row */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
             {sortedSectors.map(([sector, count]) => (
                <span
                  key={sector}
                  className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 bg-white border border-slate-200 rounded-full px-3 py-1 shadow-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
                  <span>{SECTOR_LABELS[sector] ?? sector}</span>
                  <span className="font-semibold text-slate-900 ml-0.5">{count}</span>
                </span>
              ))}
          </div>
        </motion.div>

        {/* ── Showcase: Unified Grid ────────── */}
        {featured && (
          <motion.div
            variants={cardContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="space-y-6"
          >
            {/* Featured Item - Full width */}
            <motion.div variants={cardItem}>
               <FeaturedItem item={featured} />
            </motion.div>

            {/* Compact items - 3-col grid below */}
            {compact.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {compact.map((item) => (
                  <motion.div key={item.item_id} variants={cardItem}>
                    <CompactItem item={item} />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Newsletter Capture ────────────────────────────────────── */}
        <NewsletterInline reduce={reduce} fadeUp={fadeUp} />
      </div>
    </section>
  );
}
