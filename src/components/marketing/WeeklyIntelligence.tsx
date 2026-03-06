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
// Featured Item — card layout, white bg
// ---------------------------------------------------------------------------

function FeaturedItem({ item }: { item: ShowcaseItem }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
      <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-10 gap-y-6">
        {/* Left: meta column */}
        <div className="md:w-48 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <TypeBadge type={item.item_type} />
            {item.deadline && (
              <span className="md:hidden text-[11px] font-semibold text-amber-600 self-center">
                Due: {item.deadline}
              </span>
            )}
          </div>
          
          {item.company_name && (
            <p className="text-[13px] text-slate-500 leading-snug font-medium">
              {item.company_name}
            </p>
          )}
          
          <div className="hidden md:block">
            {item.deadline && (
              <p className="text-[13px] font-semibold text-amber-600 mb-2">
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
                View Source \u2197
              </a>
            )}
          </div>
        </div>

        {/* Right: content */}
        <div>
          {/* Substance pills */}
          {item.affected_ingredients.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {item.affected_ingredients.map((name) => (
                <SubstancePill key={name} name={name} />
              ))}
            </div>
          )}

          <h4 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight tracking-tight">
            {item.title}
          </h4>

          <p className="text-[15px] text-slate-600 leading-[1.7] mt-3 mb-4">
            {item.summary}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4 mt-auto">
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
                  Source \u2197
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 h-full flex flex-col group hover:border-amber-200/50 transition-colors">
      {/* Header: Type & Deadline */}
      <div className="flex justify-between items-start mb-3">
        <TypeBadge type={item.item_type} />
        {item.deadline && (
          <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
            {item.deadline}
          </span>
        )}
      </div>

      {/* Substance pills */}
      {item.affected_ingredients.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {item.affected_ingredients.slice(0, 3).map((name) => (
            <SubstancePill key={name} name={name} />
          ))}
          {item.affected_ingredients.length > 3 && (
            <span className="text-[10px] text-slate-400 self-center">
              +{item.affected_ingredients.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Title */}
      <h4 className="text-[15px] font-bold text-slate-900 leading-snug mb-2">
        {item.title}
      </h4>

      {/* Company */}
      {item.company_name && (
        <p className="text-[12px] text-slate-500 mb-3 font-medium">
          {item.company_name}
        </p>
      )}

      {/* Summary */}
      <p className="text-[13px] text-slate-600 leading-relaxed line-clamp-3 mb-4 flex-grow">
        {item.summary}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
        <div className="flex flex-wrap gap-1">
           {/* Limit categories to 1-2 to save space */}
           {item.affected_product_categories.slice(0, 1).map((slug) => (
              <CategoryPill key={slug} slug={slug} />
            ))}
        </div>
        
        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] text-slate-400 hover:text-amber-600 transition-colors flex items-center gap-1"
          >
            SRC <span className="text-[8px]">\u2197</span>
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
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Featured Item - Takes full width on mobile, spans 2 cols on desktop if we want, or side-by-side if we want logic */}
            {/* Design decision: Let's make Featured item full width to stand out, then compacts below */}
            
            <motion.div className="md:col-span-2" variants={cardItem}>
               <FeaturedItem item={featured} />
            </motion.div>

            {/* Compact items */}
            {compact.map((item) => (
              <motion.div key={item.item_id} variants={cardItem}>
                <CompactItem item={item} />
              </motion.div>
            ))}
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
