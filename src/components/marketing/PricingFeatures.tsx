"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

interface Feature {
  kicker: string;
  title: string;
  description: string;
  span?: 2;
}

const FEATURES: Feature[] = [
  {
    kicker: "Intelligence",
    title: "Matched to your products",
    description:
      "Every FDA change analyzed against your exact products \u2014 by name and ingredient. Not summaries. Product intelligence.",
    span: 2,
  },
  {
    kicker: "Speed",
    title: "FDA to inbox in hours",
    description:
      "Time-sensitive changes flagged immediately. Weekly all-clear when nothing affects you. Calibrated urgency.",
  },
  {
    kicker: "Action Items",
    title: "What to do, by when",
    description:
      "Deadlines, corrective actions, and regulatory citations. Not just what changed \u2014 what it means for your operation.",
  },
  {
    kicker: "Sources",
    title: "4 FDA data pipelines",
    description:
      "Federal Register, warning letters, openFDA enforcement, and curated RSS feeds. Every source linked.",
  },
  {
    kicker: "Dashboard",
    title: "Every product at a glance",
    description:
      "Search, filter, and explore your regulatory feed. Color-coded status across your entire portfolio.",
  },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const card = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

export default function PricingFeatures() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduce = useReducedMotion();

  const fadeUp = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 16 } as const,
        whileInView: { opacity: 1, y: 0 } as const,
        viewport: { once: true, margin: "-60px" } as const,
        transition: { duration: 0.45, ease: "easeOut" as const, delay: 0.1 },
      };

  return (
    <section className="py-24 px-6 bg-white relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(900px 500px at 0% 100%, rgba(217,119,6,0.10) 0%, transparent 62%), radial-gradient(720px 420px at 100% 0%, rgba(234,193,0,0.09) 0%, transparent 62%)",
        }}
        aria-hidden="true"
      />
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          className="mb-14 border-4 border-text-primary p-8 bg-surface shadow-[8px_8px_0px_var(--color-text-primary)]"
          {...(reduce
            ? {}
            : {
                initial: { opacity: 0, y: 16 },
                whileInView: { opacity: 1, y: 0 },
                viewport: { once: true, margin: "-60px" },
                transition: { duration: 0.45, ease: "easeOut" },
              })}
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="font-mono text-sm text-text-primary font-bold uppercase tracking-widest mb-3 border-b-2 border-text-primary inline-block">
                SYSTEM SPECS // INCLUDED IN ALL PLANS
              </p>
              <h2 className="text-3xl md:text-5xl font-serif font-bold tracking-tight text-text-primary">
                PAY BY VOLUME.
                <br />
                NOT BY FEATURE.
              </h2>
            </div>
            <p className="text-text-primary font-mono max-w-md border-l-4 border-amber pl-4">
              NO FEATURE GATING. THE SAME INTELLIGENCE STACK IS INCLUDED FOR ALL CUSTOMERS: FULL FDA SOURCE COVERAGE, PRODUCT-LEVEL MATCHING, AND ACTIONABLE ALERTS.
            </p>
          </div>
        </motion.div>

        <motion.div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={reduce ? undefined : container}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              variants={reduce ? undefined : card}
              className={`brutalist-card p-6 flex flex-col ${
                f.span === 2 ? "md:col-span-2 bg-amber" : "bg-surface"
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <p className="font-mono text-xs text-text-primary font-bold uppercase tracking-widest border-b-2 border-text-primary/30 pb-1">
                  SYS.MOD.{i + 1}
                </p>
                <p className="font-mono text-[10px] text-text-primary font-bold uppercase px-2 py-1 bg-text-primary text-surface">
                  {f.kicker}
                </p>
              </div>
              <h3 className="text-xl font-serif font-bold text-text-primary mb-2 mt-auto">
                {f.title}
              </h3>
              <p className="text-sm font-mono text-text-primary/80">
                {f.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Cost math strip */}
        <motion.div className="mt-14 text-center" {...fadeUp}>
          <div className="inline-flex flex-col sm:flex-row items-stretch border-4 border-text-primary bg-surface shadow-[8px_8px_0px_var(--color-text-primary)] overflow-hidden">
            <div className="p-6 bg-surface">
              <p className="font-mono text-xs text-text-primary font-bold uppercase tracking-wider mb-2">
                TYPICAL CONSULTANT RETAINER
              </p>
              <p className="text-2xl font-serif font-bold text-urgent line-through decoration-text-primary decoration-4">
                $2K&ndash;$8K / MO
              </p>
            </div>
            <div className="flex items-center justify-center px-4 bg-text-primary text-surface font-mono font-bold text-xl">
              VS
            </div>
            <div className="p-6 bg-amber">
              <p className="font-mono text-xs text-text-primary font-bold uppercase tracking-wider mb-2">
                POLICY CANARY MONITOR
              </p>
              <p className="text-2xl font-serif font-bold text-text-primary">
                FROM $99 / MO
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
