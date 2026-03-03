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
        transition: { duration: 0.55, ease: "easeOut" as const, delay: 0.3 },
      };

  return (
    <section
      className="relative overflow-hidden px-6 -mt-[68px] pt-[calc(68px+5rem)] pb-18 md:pt-[calc(68px+7rem)] md:pb-24"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="absolute inset-0 stripe-grid opacity-35 pointer-events-none" aria-hidden="true" />

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">
        {/* Left — headline, subhead, CTAs */}
        <div>
          <motion.h1
            className="font-sans text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-text-primary leading-[1.04]"
            {...fadeUp(0)}
          >
            Understand FDA changes in terms of your exact products.
          </motion.h1>

          <motion.p
            className="text-lg text-text-secondary mt-6 leading-relaxed max-w-xl"
            {...fadeUp(0.07)}
          >
            Product-level FDA monitoring, delivered to your inbox. Which of
            your products are affected — by name and ingredient — with the
            analysis and action items already written.
          </motion.p>

          <motion.div
            className="flex gap-3 mt-8 flex-wrap"
            {...fadeUp(0.13)}
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
              See a Sample Email
            </Link>
          </motion.div>
        </div>

        {/* Right — email mockup */}
        <motion.div className="relative lg:pl-6" {...slideIn}>
          <div
            className="card-surface rounded-xl overflow-hidden text-left"
            style={{
              boxShadow:
                "0 8px 40px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.06)",
            }}
          >
            {/* Canary top rule — brand mark */}
            <div className="h-[3px] bg-gradient-to-r from-canary via-amber to-canary" />

            {/* Email metadata */}
            <div className="px-6 py-3 border-b border-slate-200/60">
              <p className="text-[10px] text-text-secondary leading-relaxed">
                <span className="font-mono">From:</span>{" "}
                Policy Canary{" "}
                <span className="text-text-secondary/60">
                  &lt;alerts@policycanary.io&gt;
                </span>
              </p>
              <p className="text-[13px] text-text-primary font-semibold mt-1 leading-snug">
                Your Marine Collagen Powder — Action Required
              </p>
              <p className="text-[10px] text-text-secondary font-mono mt-1">
                March 4, 2026 &middot; 7:14 AM
              </p>
            </div>

            {/* Email body */}
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2 w-2 rounded-full bg-urgent shrink-0" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-red-600 font-semibold">
                  Urgent &middot; Action Required
                </span>
              </div>

              <h3 className="font-serif text-xl font-bold text-text-primary leading-snug">
                Marine Collagen Powder
              </h3>

              <p className="text-sm text-text-body mt-3 leading-relaxed">
                The FDA cited three companies for identity-testing failures on
                marine-sourced collagen in the last 90 days. Your product&apos;s
                ingredient profile matches the cited substances. Lab protocols
                need updating.
              </p>

              {/* Action items */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-mono uppercase tracking-wider text-text-secondary mb-2">
                  Action Items
                </p>
                <ol className="space-y-1.5 list-decimal list-inside">
                  <li className="text-sm text-text-body">
                    Verify identity-testing protocols for marine collagen
                  </li>
                  <li className="text-sm text-text-body">
                    Request updated CoA from supplier
                  </li>
                  <li className="text-sm text-text-body">
                    Document compliance review for FDA inspection readiness
                  </li>
                </ol>
              </div>

              {/* Deadline + citation */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 pt-4 border-t border-slate-100">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">
                    Deadline
                  </p>
                  <p className="text-sm font-semibold text-amber mt-0.5">
                    Q2 2026
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">
                    Source
                  </p>
                  <p className="font-mono text-[11px] text-text-secondary mt-0.5">
                    21 CFR 111.75(a)(1)(ii)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

    </section>
  );
}
