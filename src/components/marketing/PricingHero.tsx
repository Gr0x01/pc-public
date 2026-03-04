"use client";

import { motion, useReducedMotion } from "framer-motion";
import PricingCalculator from "./PricingCalculator";

const TRUST_STATS = [
  { value: "4", label: "FDA data sources" },
  { value: "<24 hr", label: "alert speed" },
  { value: "14-day", label: "free trial" },
] as const;

export default function PricingHero() {
  const reduce = useReducedMotion();

  const fadeUp = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 } as const,
          animate: { opacity: 1, y: 0 } as const,
          transition: { duration: 0.4, ease: "easeOut" as const, delay },
        };

  return (
    <section
      className="relative overflow-hidden pt-16 md:pt-20 pb-20 md:pb-24 px-6"
      style={{ background: "var(--gradient-hero)" }}
    >
      {/* Grid texture */}
      <div
        className="stripe-grid absolute inset-0 pointer-events-none opacity-50"
        aria-hidden="true"
      />

      <div className="relative z-10">
        {/* Bold header */}
        <div className="max-w-4xl mx-auto text-center mb-12 md:mb-16">
          <motion.div
            className="inline-block px-4 py-2 mb-8 bg-amber/10 rounded-full"
            {...fadeUp(0)}
          >
            <p className="font-mono text-xs text-amber-text uppercase tracking-widest font-semibold">
              Simple Pricing
            </p>
          </motion.div>
          <motion.h1
            className="font-sans text-5xl md:text-6xl lg:text-[4.5rem] font-bold tracking-tight text-slate-900 leading-[1.1]"
            {...fadeUp(0.04)}
          >
            One price per product.
            <br />
            No feature gating.
          </motion.h1>
          <motion.div
            className="mt-8 max-w-2xl mx-auto"
            {...fadeUp(0.08)}
          >
            <p className="text-lg text-slate-600 leading-relaxed">
              $99/mo for 5 products. $6/mo each additional.
              <br />
              One warning letter costs $25K&ndash;$100K+. You do the math.
            </p>
          </motion.div>

          {/* Trust stats */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mt-10"
            {...fadeUp(0.12)}
          >
            {TRUST_STATS.map((stat, i) => (
              <div
                key={stat.label}
                className="flex items-center gap-3"
              >
                <p className="font-sans text-xl font-bold text-slate-900">
                  {stat.value}
                </p>
                <p className="font-mono text-xs text-slate-500 uppercase tracking-wide">
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Calculator */}
        <div className="max-w-3xl mx-auto">
          <PricingCalculator />
        </div>
      </div>
    </section>
  );
}
