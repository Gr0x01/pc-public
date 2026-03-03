"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

export default function Hero() {
  const reduce = useReducedMotion();

  const fadeUp = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 20 } as const,
          animate: { opacity: 1, y: 0 } as const,
          transition: { duration: 0.5, ease: "easeOut" as const, delay },
        };

  const slideIn = reduce
    ? {}
    : {
        initial: { opacity: 0, x: 24 } as const,
        animate: { opacity: 1, x: 0 } as const,
        transition: { duration: 0.55, ease: "easeOut" as const, delay: 0.25 },
      };

  return (
    <section
      className="relative overflow-hidden px-6 pt-20 pb-18 md:pt-28 md:pb-24"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="absolute inset-0 stripe-grid opacity-35 pointer-events-none" aria-hidden="true" />

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">
        <div>
          <motion.p
            className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-white/70 px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-accent mb-6"
            {...fadeUp(0)}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Product-level regulatory intelligence
          </motion.p>

          <motion.h1
            className="font-sans text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-text-primary leading-[1.04]"
            {...fadeUp(0.05)}
          >
            Understand FDA changes in terms of your exact products.
          </motion.h1>

          <motion.p
            className="text-lg text-text-secondary mt-6 leading-relaxed max-w-xl"
            {...fadeUp(0.12)}
          >
            Product-level FDA monitoring for supplement, food, and cosmetics
            brands. Know which of your products are affected, by name and
            ingredient — before the warning letter arrives.
          </motion.p>

          <motion.div
            className="flex gap-3 mt-8 flex-wrap"
            {...fadeUp(0.18)}
          >
            <Link
              href="/#signup"
              className="bg-accent text-white font-semibold px-7 py-3 rounded-full hover:bg-accent/90 transition-colors duration-150"
            >
              Start Free
            </Link>
            <Link
              href="/sample"
              className="border border-slate-300/80 bg-white/80 text-text-primary font-semibold px-7 py-3 rounded-full hover:bg-white transition-colors duration-150"
            >
              See a Sample Report
            </Link>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10 max-w-2xl"
            {...fadeUp(0.24)}
          >
            {[
              { value: "<24h", label: "FDA publish to inbox" },
              { value: "169K", label: "FDA substances indexed" },
              { value: "4", label: "Source systems monitored" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="card-surface rounded-lg px-4 py-3"
              >
                <p className="text-lg font-semibold text-text-primary">{stat.value}</p>
                <p className="text-[11px] font-mono uppercase tracking-wide text-text-secondary mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div className="relative lg:pl-6" {...slideIn}>
          <div className="card-surface rounded-xl overflow-hidden text-left relative z-20">
            <div className="px-5 py-4 border-b border-slate-200/80 bg-white/80">
              <p className="text-[11px] font-mono uppercase tracking-wider text-accent mb-1">
                Live Product Feed
              </p>
              <p className="text-sm text-text-secondary">
                Updated 2 hours ago from FDA CFSAN warning letters.
              </p>
            </div>
            <div className="p-5 space-y-4 bg-gradient-to-b from-white to-slate-50/80">
              <div className="rounded-lg border border-amber-200/60 bg-amber-50/70 p-4">
                <p className="text-[11px] font-mono uppercase tracking-wider text-amber mb-2">
                  Urgent
                </p>
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-urgent shrink-0" />
                  Marine Collagen Powder
                </h3>
                <p className="text-sm text-text-body mt-2 leading-relaxed">
                  Identity-testing warning mapped to your ingredient profile.
                  Action needed by Q2 2026.
                </p>
                <p className="font-mono text-[11px] text-text-secondary mt-3">
                  21 CFR 111.75(a)(1)(ii)
                </p>
              </div>

              <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-text-primary">Biotin Complex 5000mcg</p>
                  <p className="text-xs font-mono uppercase tracking-wider text-clear">All clear</p>
                </div>
                <p className="text-sm text-text-secondary mt-2">
                  Latest FDA actions do not affect this formula.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white/90 p-4">
                <p className="text-[11px] font-mono uppercase tracking-wider text-text-secondary mb-1">
                  Next
                </p>
                <p className="text-sm text-text-body">
                  BHA Eye Cream SPF 15 under review after new OTC sunscreen draft guidance.
                </p>
              </div>
            </div>
          </div>

          <div className="hidden md:block absolute -top-8 -right-6 z-10 card-surface rounded-lg px-4 py-3 rotate-3">
            <p className="text-[11px] font-mono uppercase tracking-wider text-accent mb-1">
              Pipeline
            </p>
            <p className="text-sm text-text-primary font-semibold">1,247 FDA docs/week</p>
          </div>
          <div className="hidden md:block absolute -bottom-7 -left-6 z-10 card-surface rounded-lg px-4 py-3 -rotate-3">
            <p className="text-[11px] font-mono uppercase tracking-wider text-text-secondary mb-1">
              Coverage
            </p>
            <p className="text-sm text-text-primary font-semibold">Supplement, food, cosmetic</p>
          </div>

          <div
            className="absolute -z-0 w-[340px] h-[340px] rounded-full blur-[80px] right-2 top-10"
            style={{
              background:
                "radial-gradient(circle, rgba(99,91,255,0.28) 0%, rgba(32,161,255,0.20) 38%, transparent 68%)",
            }}
            aria-hidden="true"
          />
          <div
            className="absolute -z-0 w-[260px] h-[260px] rounded-full blur-[70px] left-4 -bottom-8"
            style={{
              background:
                "radial-gradient(circle, rgba(234,193,0,0.26) 0%, transparent 65%)",
            }}
            aria-hidden="true"
          />
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto mt-14 relative z-10">
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-[11px] font-mono uppercase tracking-wider text-text-secondary">
          {[
            "Federal Register",
            "FDA warning letters",
            "openFDA enforcement",
            "RSS source updates",
          ].map((item) => (
            <p key={item} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent/70" />
              {item}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
