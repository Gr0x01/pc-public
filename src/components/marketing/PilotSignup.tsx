"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { SignupForm } from "./SignupForm";

const STATS = [
  { value: 4, display: "4", label: "FDA data sources" },
  { value: 24, display: "<24 hrs", label: "pub to email" },
  { value: 169, display: "169K", label: "substances indexed" },
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
    <section id="signup" className="relative">
      {/* 3px canary rule — animates width on viewport entry */}
      <motion.div
        className="h-[3px] bg-canary"
        initial={reduce ? { width: "100%" } : { width: "0%" }}
        animate={inView ? { width: "100%" } : { width: "0%" }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />

      <div
        className="py-20 md:py-24 px-6"
        style={{ background: "var(--gradient-dark-surface)" }}
        ref={ref}
      >
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-16 items-start">
          {/* Left column — headline, description, stats */}
          <div>
            <motion.p
              className="font-mono text-[11px] text-amber-text uppercase tracking-widest mb-4 font-semibold"
              {...fadeUp(0)}
            >
              Pilot Program
            </motion.p>

            <motion.h2
              className="text-3xl md:text-4xl font-bold text-white leading-tight tracking-tight"
              {...fadeUp(0.08)}
            >
              Don&apos;t find out from a recall&nbsp;notice.
            </motion.h2>

            <motion.p
              className="text-slate-400 mt-4 leading-relaxed"
              {...fadeUp(0.08)}
            >
              We&apos;re onboarding a small group of brands for early access to
              product-level FDA monitoring.
            </motion.p>

            <motion.p
              className="text-slate-500 text-sm mt-3"
              {...fadeUp(0.08)}
            >
              Your Marine Collagen Powder. Your BHA Eye Cream. Monitored by
              name, matched by ingredient.
            </motion.p>

            {/* Stats row */}
            <motion.div
              className="flex mt-10 gap-0"
              {...fadeUp(0.16)}
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

          {/* Right column — signup form */}
          <motion.div
            className="lg:pt-8"
            {...fadeUp(0.24)}
          >
            <SignupForm dark={true} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
