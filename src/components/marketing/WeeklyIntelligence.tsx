"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { StatCounter } from "./StatCounter";
import type { ShowcaseItem } from "@/lib/intelligence/weekly-snapshot";

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
// Featured Item — editorial layout, no card border
// ---------------------------------------------------------------------------

function FeaturedItem({ item }: { item: ShowcaseItem }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-10 gap-y-4">
      {/* Left: meta column */}
      <div className="md:w-48 flex flex-col gap-3 md:pt-1">
        <TypeBadge type={item.item_type} />
        {item.company_name && (
          <p className="text-[13px] text-slate-500 leading-snug">
            {item.company_name}
          </p>
        )}
        {item.deadline && (
          <p className="text-[13px] font-semibold text-amber-600">
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
            FDA.gov
          </a>
        )}
      </div>

      {/* Right: content */}
      <div>
        {/* Substance pills — the differentiator, right at the top */}
        {item.affected_ingredients.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {item.affected_ingredients.map((name) => (
              <SubstancePill key={name} name={name} />
            ))}
          </div>
        )}

        <h4 className="text-2xl md:text-[28px] font-semibold text-slate-900 leading-tight tracking-tight">
          {item.title}
        </h4>

        <p className="text-[15px] text-slate-600 leading-[1.75] mt-4">
          {item.summary}
        </p>

        {/* Category pills */}
        {item.affected_product_categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {item.affected_product_categories.map((slug) => (
              <CategoryPill key={slug} slug={slug} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact Item — minimal card with substance pills prominent
// ---------------------------------------------------------------------------

function CompactItem({ item }: { item: ShowcaseItem }) {
  return (
    <div className="group">
      {/* Substance pills first */}
      {item.affected_ingredients.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {item.affected_ingredients.slice(0, 4).map((name) => (
            <SubstancePill key={name} name={name} />
          ))}
          {item.affected_ingredients.length > 4 && (
            <span className="text-[11px] text-slate-400 self-center">
              +{item.affected_ingredients.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Title */}
      <h4 className="text-base font-semibold text-slate-900 leading-snug">
        {item.title}
      </h4>

      {/* Type + company */}
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <TypeBadge type={item.item_type} />
        {item.company_name && (
          <span className="text-[12px] text-slate-500">{item.company_name}</span>
        )}
      </div>

      {/* Summary — tight */}
      <p className="text-[14px] text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
        {item.summary}
      </p>

      {/* Deadline + source */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
        {item.deadline && (
          <p className="text-[12px] font-semibold text-amber-600">
            {item.deadline}
          </p>
        )}
        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-slate-400 hover:text-amber-600 transition-colors"
          >
            Source
          </a>
        )}
      </div>
    </div>
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

  const [featured, ...compact] = props.showcaseItems;

  return (
    <section className="bg-slate-50 py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-50/40 via-transparent to-transparent pointer-events-none" />
      <div className="max-w-5xl mx-auto relative z-10" ref={ref}>

        {/* ── Header: label + title + inline stats + sectors ────────── */}
        <motion.div className="text-center mb-4" {...fadeUp(0)}>
          <p className="font-mono text-[11px] text-amber-text uppercase tracking-widest mb-3 font-semibold">
            WEEKLY INTELLIGENCE
          </p>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-tight">
            The FDA This Week
          </h2>
          <p className="font-mono text-[13px] text-slate-400 mt-2">
            {formatDateRange(props.weekStart, props.weekEnd)}
          </p>
        </motion.div>

        {/* Stats + sectors + narrative — unified context block */}
        <motion.div
          className="mt-8 mb-16 grid grid-cols-1 md:grid-cols-[1fr_1.6fr] gap-x-16 gap-y-10 items-start"
          {...fadeUp(0.05)}
        >
          {/* Left column: stats stacked vertically + sector pills */}
          <div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                { value: props.totalItems, label: "items tracked" },
                { value: props.totalSectors, label: "sectors active" },
                { value: props.totalSubstancesFlagged, label: "substances flagged" },
                { value: props.totalDeadlines, label: "deadlines identified" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <span className="text-3xl font-bold text-slate-900 tabular-nums">
                    <StatCounter end={value} />
                  </span>
                  <p className="text-[11px] text-slate-400 font-mono uppercase tracking-wider mt-0.5">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-6">
              {sortedSectors.map(([sector, count]) => (
                <span
                  key={sector}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-white/70 border border-slate-200/60 rounded px-2 py-0.5"
                >
                  <span>{SECTOR_LABELS[sector] ?? sector}</span>
                  <span className="font-semibold text-slate-700">{count}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Right column: narrative */}
          <div className="border-l-2 border-amber/30 pl-6">
            <p className="text-[15px] text-slate-600 leading-[1.75]">
              {props.narrative}
            </p>
          </div>
        </motion.div>

        {/* ── Showcase: featured (editorial) + compact items ────────── */}
        {featured && (
          <motion.div
            variants={cardContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {/* Featured item — no card border, editorial whitespace */}
            <motion.div
              className="mb-14 pb-12 border-b border-slate-200/60"
              variants={cardItem}
            >
              <FeaturedItem item={featured} />
            </motion.div>

            {/* Compact items — divided by vertical rule on desktop */}
            {compact.length > 0 && (
              <div className="flex flex-col md:flex-row gap-10 md:gap-0">
                {compact.map((item, i) => (
                  <motion.div
                    key={item.item_id}
                    variants={cardItem}
                    className={`flex-1 ${
                      i > 0
                        ? "md:border-l md:border-slate-200/60 md:pl-10 border-t border-slate-200/40 pt-10 md:border-t-0 md:pt-0"
                        : "md:pr-10"
                    }`}
                  >
                    <CompactItem item={item} />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Bridge CTA ───────────────────────────────────────────── */}
        <motion.div className="text-center mt-16" {...fadeUp(0.1)}>
          <p className="text-[15px] text-slate-500">
            Every action above, filtered to your specific products and
            ingredients.
          </p>
          <a
            href="#signup"
            className="inline-flex items-center gap-1 text-[15px] font-medium text-amber-600 hover:text-amber-700 transition-colors mt-2"
          >
            Add Your Products
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
