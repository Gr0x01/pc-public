"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const card = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

/* ── Mini email mockup (Card A) ──────────────────────────── */
function EmailMockup() {
  return (
    <div className="mt-4 rounded-lg overflow-hidden border border-white/20 bg-white/60 backdrop-blur-sm shadow-lg max-w-sm">
      <div className="h-[3px] bg-gradient-to-r from-accent via-canary to-amber" />
      <div className="px-4 py-2.5 border-b border-slate-200/60 flex items-center gap-2">
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        </div>
        <p className="font-mono text-[9px] text-text-secondary tracking-wide">
          Policy Canary &middot; Product Intelligence
        </p>
      </div>
      <div className="px-4 py-3 space-y-2">
        <p className="font-serif text-sm font-bold text-text-primary">
          Marine Collagen Powder
        </p>
        <p className="text-[11px] text-text-body leading-relaxed">
          Identity-testing warning mapped to your ingredient profile.
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="h-1.5 w-1.5 rounded-full bg-urgent" />
          <p className="font-mono text-[10px] text-amber font-semibold">
            Action required by Q2 2026
          </p>
        </div>
        <p className="font-mono text-[9px] text-text-secondary mt-1">
          21 CFR 111.75(a)(1)(ii)
        </p>
      </div>
    </div>
  );
}

/* ── Ingredient match viz (Card B) ───────────────────────── */
function IngredientMatch() {
  const ingredients = [
    { name: "Vitamin D3", matched: false },
    { name: "Marine Collagen", matched: true },
    { name: "Hyaluronic Acid", matched: false },
  ];
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-text-primary bg-white/70 rounded-lg px-2.5 py-1 border border-white/40">
          Marine Collagen Powder
        </span>
        <svg width="20" height="12" viewBox="0 0 20 12" className="text-text-secondary shrink-0">
          <path d="M0 6h16M12 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex flex-wrap gap-2">
        {ingredients.map((ing) => (
          <span
            key={ing.name}
            className={`text-[11px] font-medium rounded-full px-3 py-1 border ${
              ing.matched
                ? "bg-amber/15 border-amber/40 text-amber font-semibold"
                : "bg-white/50 border-slate-200/60 text-text-secondary"
            }`}
          >
            {ing.matched && (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber mr-1.5 -mt-px" />
            )}
            {ing.name}
          </span>
        ))}
      </div>
      {/* FDA action link */}
      <p className="font-mono text-[9px] text-amber/80 mt-1">
        Matched to FDA Warning Letter WL-2025-1847
      </p>
    </div>
  );
}

/* ── Alert timeline (Card C) ─────────────────────────────── */
function AlertTimeline() {
  const steps = [
    { label: "FDA publishes", time: "Oct 14" },
    { label: "Pipeline ingests", time: "Oct 14" },
    { label: "Your inbox", time: "<24h" },
  ];
  return (
    <div className="mt-4 space-y-0">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                i === 2 ? "bg-canary" : "bg-accent"
              }`}
            />
            {i < steps.length - 1 && (
              <span className="w-px h-6 border-l border-dashed border-accent/40" />
            )}
          </div>
          <div className="pb-3">
            <p className="text-xs font-medium text-text-primary leading-none">
              {step.label}
            </p>
            <p className="font-mono text-[10px] text-text-secondary mt-0.5">
              {step.time}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Mini dashboard (Card D) ─────────────────────────────── */
function DashboardMini() {
  const rows = [
    { name: "Marine Collagen Powder", status: "urgent" as const },
    { name: "BHA Eye Cream SPF 15", status: "review" as const },
    { name: "Biotin Complex 5000mcg", status: "clear" as const },
    { name: "Turmeric Joint Formula", status: "clear" as const },
    { name: "Probiotic Daily 30B", status: "clear" as const },
  ];
  const dotColor = { urgent: "bg-urgent", review: "bg-amber", clear: "bg-clear" };

  return (
    <div className="mt-4 rounded-lg overflow-hidden bg-surface-dark/95 border border-white/10">
      <div className="px-3 py-2 border-b border-white/10">
        <p className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">
          Monitored Products
        </p>
      </div>
      <div className="divide-y divide-white/5">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center gap-2.5 px-3 py-2">
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor[row.status]}`} />
            <p className="text-[11px] text-white/80 truncate">{row.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Coverage sources (Card E) ───────────────────────────── */
function CoverageSources() {
  const sources = [
    { name: "Federal Register", count: "847", icon: "doc" },
    { name: "Warning Letters", count: "1,247", icon: "alert" },
    { name: "openFDA", count: "169K", icon: "db" },
    { name: "RSS Feeds", count: "12", icon: "rss" },
  ];
  const icons: Record<string, React.ReactNode> = {
    doc: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-accent">
        <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5 5h4M5 7.5h4M5 10h2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
    alert: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-amber">
        <path d="M7 2L12.5 11.5H1.5L7 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M7 6v2.5M7 10v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    db: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-blue-500">
        <ellipse cx="7" cy="4" rx="4.5" ry="2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M2.5 4v3c0 1.1 2 2 4.5 2s4.5-.9 4.5-2V4" stroke="currentColor" strokeWidth="1.2" />
        <path d="M2.5 7v3c0 1.1 2 2 4.5 2s4.5-.9 4.5-2V7" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
    rss: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-orange-500">
        <circle cx="3.5" cy="10.5" r="1.2" fill="currentColor" />
        <path d="M2.5 7.5a4 4 0 014 4M2.5 4.5a7 7 0 017 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  };

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {sources.map((src) => (
        <div
          key={src.name}
          className="flex items-center gap-2 bg-white/50 border border-white/40 rounded-lg px-2.5 py-2"
        >
          {icons[src.icon]}
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-text-primary truncate">
              {src.name}
            </p>
            <p className="font-mono text-[9px] text-text-secondary">{src.count}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main Bento Grid ─────────────────────────────────────── */
export default function FeatureComparison() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduce = useReducedMotion();

  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <p className="font-mono text-xs text-accent uppercase tracking-widest text-center mb-3">
          THE DIFFERENCE
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary text-center mb-4">
          Every FDA action.
          <br />
          Matched to your products.
        </h2>
        <p className="text-text-secondary text-center mb-14 max-w-xl mx-auto">
          Not summaries — product intelligence. Each card shows what Policy
          Canary actually delivers to your inbox.
        </p>

        <motion.div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          variants={reduce ? undefined : container}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {/* Card A — Email Intelligence (2-col span) */}
          <motion.div
            variants={reduce ? undefined : card}
            className="md:col-span-2 relative rounded-lg overflow-hidden p-6"
            style={{
              background:
                "linear-gradient(135deg, rgba(234,193,0,0.10) 0%, rgba(217,119,6,0.14) 100%)",
            }}
          >
            <div className="absolute inset-0 bg-white/60 pointer-events-none" />
            <div className="relative z-10">
              <p className="font-mono text-[10px] text-amber uppercase tracking-widest mb-1">
                Email Intelligence
              </p>
              <h3 className="text-lg font-semibold text-text-primary">
                Your inbox, not a firehose
              </h3>
              <p className="text-sm text-text-secondary mt-1 max-w-md">
                Every alert is scoped to your products — with the analysis and
                action items already written.
              </p>
              <EmailMockup />
            </div>
          </motion.div>

          {/* Card B — Ingredient Match */}
          <motion.div
            variants={reduce ? undefined : card}
            className="relative rounded-lg overflow-hidden p-6"
            style={{
              background:
                "linear-gradient(135deg, rgba(234,193,0,0.08) 0%, rgba(217,119,6,0.12) 100%)",
            }}
          >
            <div className="absolute inset-0 bg-white/60 pointer-events-none" />
            <div className="relative z-10">
              <p className="font-mono text-[10px] text-amber uppercase tracking-widest mb-1">
                Ingredient Match
              </p>
              <h3 className="text-lg font-semibold text-text-primary">
                Matched by formula
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                We match FDA actions to your actual ingredients — not just
                product categories.
              </p>
              <IngredientMatch />
            </div>
          </motion.div>

          {/* Card C — Alert Timeline */}
          <motion.div
            variants={reduce ? undefined : card}
            className="relative rounded-lg overflow-hidden p-6"
            style={{
              background:
                "linear-gradient(135deg, rgba(217,119,6,0.10) 0%, rgba(234,193,0,0.14) 100%)",
            }}
          >
            <div className="absolute inset-0 bg-white/60 pointer-events-none" />
            <div className="relative z-10">
              <p className="font-mono text-[10px] text-accent uppercase tracking-widest mb-1">
                Speed
              </p>
              <h3 className="text-lg font-semibold text-text-primary">
                FDA to inbox in hours
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                Our pipeline ingests every publication the same day.
              </p>
              <AlertTimeline />
            </div>
          </motion.div>

          {/* Card D — Dashboard Status */}
          <motion.div
            variants={reduce ? undefined : card}
            className="relative rounded-lg overflow-hidden p-6"
            style={{
              background:
                "linear-gradient(135deg, rgba(15,23,42,0.04) 0%, rgba(99,91,255,0.08) 100%)",
            }}
          >
            <div className="absolute inset-0 bg-white/60 pointer-events-none" />
            <div className="relative z-10">
              <p className="font-mono text-[10px] text-accent uppercase tracking-widest mb-1">
                Dashboard
              </p>
              <h3 className="text-lg font-semibold text-text-primary">
                Every product at a glance
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                One view. All your products. Color-coded status.
              </p>
              <DashboardMini />
            </div>
          </motion.div>

          {/* Card E — Coverage Sources */}
          <motion.div
            variants={reduce ? undefined : card}
            className="relative rounded-lg overflow-hidden p-6"
            style={{
              background:
                "linear-gradient(135deg, rgba(99,91,255,0.08) 0%, rgba(32,161,255,0.10) 100%)",
            }}
          >
            <div className="absolute inset-0 bg-white/60 pointer-events-none" />
            <div className="relative z-10">
              <p className="font-mono text-[10px] text-blue-500 uppercase tracking-widest mb-1">
                Coverage
              </p>
              <h3 className="text-lg font-semibold text-text-primary">
                4 FDA data sources
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                Federal Register, warning letters, openFDA, and curated RSS —
                all in one pipeline.
              </p>
              <CoverageSources />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
