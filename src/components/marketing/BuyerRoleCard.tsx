"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const roles = [
  {
    title: "Founder / CEO",
    detail: "32 SKUs \u00b7 40+ active ingredients",
    quote:
      "Which of my 32 SKUs is affected? I can\u2019t cross-reference 40+ ingredients manually after every FDA notice.",
    gradient: "linear-gradient(135deg, rgba(251,191,36,0.06) 0%, rgba(234,193,0,0.02) 100%)",
  },
  {
    title: "QA Manager",
    detail: "Moisturizer line \u00b7 Next audit: Q2 2026",
    quote:
      "Does the new BHA guidance apply to our moisturizer line? I need to know before our next audit.",
    gradient: "linear-gradient(135deg, rgba(234,193,0,0.06) 0%, rgba(251,146,60,0.02) 100%)",
  },
  {
    title: "Product Manager",
    detail: "Q3 launch timeline \u00b7 Collagen SKU at risk",
    quote:
      "What does this collagen identity testing warning mean for our Q3 launch timeline?",
    gradient: "linear-gradient(135deg, rgba(251,146,60,0.06) 0%, rgba(251,191,36,0.02) 100%)",
  },
  {
    title: "VP Regulatory",
    detail: "47 products \u00b7 3 categories",
    quote:
      "I have 47 products. Show me which ones are affected \u2014 not a 500-page Federal Register summary.",
    gradient: "linear-gradient(135deg, rgba(217,119,6,0.06) 0%, rgba(234,193,0,0.02) 100%)",
  },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const card = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, type: "spring" as const, bounce: 0.1 },
  },
};

export default function BuyerRoleCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduce = useReducedMotion();

  return (
    <section className="bg-white py-24 px-6 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(900px 480px at 80% 120%, rgba(217,119,6,0.08) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <p className="font-mono text-[11px] text-amber-text uppercase tracking-widest mb-3 font-semibold">
            WHO IT'S FOR
          </p>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 mb-6 leading-tight">
            You don't have a regulatory team.
            <br />
            You have Policy Canary.
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Whether you're the founder, the quality lead, or the person who
            gets the call when something goes wrong — you need product-level
            answers, not regulatory summaries.
          </p>
        </div>

        <motion.div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={reduce ? undefined : container}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {roles.map((role) => (
            <motion.div
              key={role.title}
              variants={reduce ? undefined : card}
              className="soft-card p-8 group relative overflow-hidden"
            >
              <div 
                className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none" 
                style={{ background: role.gradient }} 
              />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[14px] font-semibold uppercase tracking-widest text-amber-text">
                    {role.title}
                  </p>
                  <svg className="w-5 h-5 text-amber/30 group-hover:text-amber/50 transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>
                <p className="font-mono text-[11px] text-slate-400 mb-6">
                  {role.detail}
                </p>
                <p className="text-[17px] text-slate-700 leading-relaxed font-medium">
                  &ldquo;{role.quote}&rdquo;
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
