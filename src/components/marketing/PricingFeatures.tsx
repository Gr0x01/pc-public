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
    <section className="py-24 px-6 bg-slate-50 relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          className="mb-14 text-center"
          {...(reduce
            ? {}
            : {
                initial: { opacity: 0, y: 16 },
                whileInView: { opacity: 1, y: 0 },
                viewport: { once: true, margin: "-60px" },
                transition: { duration: 0.45, ease: "easeOut" },
              })}
        >
          <div className="inline-block px-3 py-1 mb-6 bg-amber/10 rounded-full">
            <p className="font-mono text-[10px] text-amber-text uppercase tracking-widest font-semibold">
              Included in all plans
            </p>
          </div>
          <h2 className="text-3xl md:text-5xl font-sans font-bold tracking-tight text-slate-900 mb-6">
            Pay by volume.
            <br />
            Not by feature.
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto leading-relaxed">
            No feature gating. The same intelligence stack is included for all customers: full FDA source coverage, product-level matching, and actionable alerts.
          </p>
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
              className={`p-8 rounded-xl border ${
                f.span === 2 
                  ? "md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white" 
                  : "bg-white border-slate-100 shadow-sm"
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <span className={`text-xs font-mono uppercase tracking-wider font-semibold ${
                  f.span === 2 ? "text-amber-400" : "text-slate-400"
                }`}>
                  0{i + 1}
                </span>
                <span className={`text-[10px] font-mono uppercase tracking-wider font-semibold px-2 py-1 rounded ${
                   f.span === 2 
                     ? "bg-white/10 text-white" 
                     : "bg-slate-100 text-slate-500"
                }`}>
                  {f.kicker}
                </span>
              </div>
              <h3 className={`text-xl font-bold mb-3 ${
                f.span === 2 ? "text-white" : "text-slate-900"
              }`}>
                {f.title}
              </h3>
              <p className={`text-sm leading-relaxed ${
                f.span === 2 ? "text-slate-300" : "text-slate-500"
              }`}>
                {f.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Cost math strip */}
        <motion.div className="mt-16 text-center" {...fadeUp}>
          <div className="inline-flex flex-col sm:flex-row items-stretch rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white max-w-2xl mx-auto w-full">
            <div className="p-8 flex-1 bg-slate-50 flex flex-col justify-center">
              <p className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-semibold">
                Typical Consultant Retainer
              </p>
              <p className="text-2xl font-sans font-bold text-slate-400 line-through decoration-slate-400/50 decoration-2">
                $2K&ndash;$8K / mo
              </p>
            </div>
            <div className="flex items-center justify-center px-6 bg-white border-y sm:border-y-0 sm:border-x border-slate-100 py-2">
              <span className="text-sm font-bold text-slate-300">VS</span>
            </div>
            <div className="p-8 flex-1 bg-white flex flex-col justify-center">
              <p className="font-mono text-[10px] text-amber-text uppercase tracking-wider mb-2 font-semibold">
                Policy Canary Monitor
              </p>
              <p className="text-2xl font-sans font-bold text-slate-900">
                From $99 / mo
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
