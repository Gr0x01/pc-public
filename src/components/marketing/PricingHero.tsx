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
            className="inline-block border-4 border-text-primary px-4 py-2 mb-8 bg-amber"
            {...fadeUp(0)}
          >
            <p className="font-mono text-sm text-text-primary uppercase tracking-widest font-bold">
              SYSTEM PRICING
            </p>
          </motion.div>
          <motion.h1
            className="font-serif text-5xl md:text-6xl lg:text-[4.5rem] font-bold tracking-tight text-text-primary leading-[1]"
            {...fadeUp(0.04)}
          >
            ONE PRICE PER PRODUCT.
            <br />
            NO FEATURE GATING.
          </motion.h1>
          <motion.div
            className="mt-8 border-t-4 border-b-4 border-text-primary py-4 max-w-2xl mx-auto bg-surface"
            {...fadeUp(0.08)}
          >
            <p className="font-mono text-base text-text-primary">
              $99/MO FOR 5 PRODUCTS. $6/MO EACH ADDITIONAL.
              <br />
              ONE WARNING LETTER COSTS $25K&ndash;$100K+. YOU DO THE MATH.
            </p>
          </motion.div>

          {/* Trust stats */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-8"
            {...fadeUp(0.12)}
          >
            {TRUST_STATS.map((stat, i) => (
              <div
                key={stat.label}
                className="flex items-center gap-4 sm:gap-8 border-2 border-text-primary px-4 py-2 bg-surface"
              >
                <div className="text-center flex gap-2 items-center">
                  <p className="font-mono text-lg font-bold text-amber-action">
                    {stat.value}
                  </p>
                  <p className="font-mono text-xs text-text-primary uppercase tracking-wider font-bold">
                    {stat.label}
                  </p>
                </div>
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
