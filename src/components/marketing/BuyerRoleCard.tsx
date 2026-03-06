"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const roles = [
  {
    title: "Founder / CEO",
    detail: "32 SKUs · 40+ active ingredients",
    quote:
      "Which of my 32 SKUs is affected? I can\u2019t cross-reference 40+ ingredients manually after every FDA notice.",
  },
  {
    title: "QA Manager",
    detail: "Moisturizer line · Next audit: Q2 2026",
    quote:
      "Does the new BHA guidance apply to our moisturizer line? I need to know before our next audit.",
  },
  {
    title: "Product Manager",
    detail: "Q3 launch timeline · Collagen SKU at risk",
    quote:
      "What does this collagen identity testing warning mean for our Q3 launch timeline?",
  },
  {
    title: "VP Regulatory",
    detail: "47 products · 3 categories",
    quote:
      "I have 47 products. Show me which ones are affected \u2014 not a 500-page Federal Register summary.",
  },
];

export default function BuyerRoleCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduce = useReducedMotion();

  return (
    <section className="bg-slate-50 py-24 px-6 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(900px 480px at 80% 120%, rgba(217,119,6,0.06) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <p className="font-mono text-[11px] text-amber-text uppercase tracking-widest mb-3 font-semibold">
            WHO IT&apos;S FOR
          </p>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 mb-6 leading-tight">
            You don&apos;t have a regulatory team.
            <br />
            You have Policy Canary.
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Whether you&apos;re the founder, the quality lead, or the person who
            gets the call when something goes wrong — you need product-level
            answers, not regulatory&nbsp;summaries.
          </p>
        </div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
          {roles.map((role, i) => (
            <motion.div
              key={role.title}
              initial={reduce ? undefined : { opacity: 0, y: 16 }}
              animate={
                inView ? { opacity: 1, y: 0 } : reduce ? undefined : { opacity: 0, y: 16 }
              }
              transition={{
                duration: 0.4,
                ease: "easeOut",
                delay: reduce ? 0 : i * 0.1,
              }}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span className="h-2 w-2 rounded-full bg-amber shrink-0" />
                <p className="font-mono text-[11px] text-amber-text uppercase tracking-widest font-semibold">
                  {role.title}
                </p>
              </div>
              <p className="font-mono text-[11px] text-slate-400 mb-4">
                {role.detail}
              </p>
              <p className="text-[17px] text-slate-700 leading-relaxed font-medium">
                &ldquo;{role.quote}&rdquo;
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
