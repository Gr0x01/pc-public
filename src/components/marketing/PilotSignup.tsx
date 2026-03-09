"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

import { SignupForm } from "./SignupForm";

const STATS = [
  { value: 7, display: "7", label: "FDA data sources" },
  { value: 24, display: "<24 hrs", label: "pub to email" },
  { value: 169, display: "169K", label: "substances indexed" },
] as const;

const BENEFITS = [
  "Your products monitored by name and ingredient",
  "Action items with deadlines, not summaries",
  "Every claim linked to the source document",
  "All-clear confirmation when nothing affects you",
  "The FDA cut 3,859 employees. Enforcement is less predictable, not more.",
] as const;

export default function PilotSignup() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduce = useReducedMotion();

  const fadeUp = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 } as const,
          animate: inView ? ({ opacity: 1, y: 0 } as const) : ({ opacity: 0, y: 12 } as const),
          transition: { duration: 0.4, ease: "easeOut" as const, delay },
        };

  return (
    <section id="signup" className="relative overflow-hidden">
      {/* 3px canary rule — animates width on viewport entry */}
      <motion.div
        className="h-[3px] bg-canary"
        initial={reduce ? { width: "100%" } : { width: "0%" }}
        animate={inView ? { width: "100%" } : { width: "0%" }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />

      <div
        className="relative py-20 md:py-24 px-6"
        style={{ background: "var(--gradient-dark-surface)" }}
        ref={ref}
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-14 items-start">
          <div>
            <motion.p
              className="font-mono text-[11px] text-canary uppercase tracking-widest mb-4 font-semibold"
              {...fadeUp(0)}
            >
              Pilot Program
            </motion.p>

            <motion.h2
              className="text-3xl md:text-4xl font-bold text-white leading-tight tracking-tight"
              {...fadeUp(0.06)}
            >
              Don&apos;t find out from a recall&nbsp;notice.
            </motion.h2>

            <motion.p
              className="text-slate-300 mt-4 leading-relaxed max-w-xl"
              {...fadeUp(0.1)}
            >
              Your Marine Collagen Powder. Your BHA Eye Cream. Monitored by name,
              matched by ingredient, matched against every FDA&nbsp;change.
            </motion.p>

            {/* Value proof checklist */}
            <motion.div
              className="mt-8 flex flex-col gap-3"
              {...fadeUp(0.14)}
            >
              {BENEFITS.map((item) => (
                <div key={item} className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-text shrink-0" />
                  <p className="text-sm text-slate-300">{item}</p>
                </div>
              ))}
            </motion.div>

            {/* Stats row */}
            <motion.div
              className="flex mt-10 gap-0"
              {...fadeUp(0.18)}
            >
              {STATS.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`flex-1 ${
                    i < STATS.length - 1
                      ? "border-r border-slate-700 pr-6"
                      : "pl-6"
                  } ${i > 0 && i < STATS.length - 1 ? "pl-6" : ""}`}
                >
                  <p className="text-canary text-2xl font-bold tabular-nums">
                    {stat.display}
                  </p>
                  <p className="font-mono text-[11px] text-slate-500 uppercase tracking-widest mt-1">
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div className="lg:pt-2" {...fadeUp(0.22)}>
            <div className="soft-card p-6 md:p-8">
              <p className="font-mono text-[11px] text-text-secondary uppercase tracking-widest">
                Request pilot access
              </p>
              <h3 className="text-2xl font-semibold text-text-primary mt-3 leading-tight">
                Join the pilot
              </h3>
              <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                Tell us where to send your access link. No sales calls.
              </p>

              <div className="mt-6">
                <SignupForm />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
