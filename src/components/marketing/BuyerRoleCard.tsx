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
            "radial-gradient(900px 480px at 80% 120%, rgba(99,91,255,0.08) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />
      <div className="max-w-5xl mx-auto">
        <p className="font-mono text-xs text-accent uppercase tracking-widest text-center mb-3 relative z-10">
          WHO IT&apos;S FOR
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary text-center mb-4 relative z-10">
          You don&apos;t have a regulatory team.
          <br />
          You have Policy Canary.
        </h2>
        <p className="text-text-secondary text-center mb-12 max-w-xl mx-auto relative z-10">
          Whether you&apos;re the founder, the quality lead, or the person who
          gets the call when something goes wrong — you need product-level
          answers, not regulatory summaries.
        </p>

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
              className="card-surface rounded-2xl p-6 hover:-translate-y-0.5 transition-all duration-150"
              style={{ background: role.gradient }}
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-amber mb-1">
                {role.title}
              </p>
              <p className="font-mono text-xs text-text-secondary mb-3">
                {role.detail}
              </p>
              <p className="text-text-body text-sm leading-relaxed">
                &ldquo;{role.quote}&rdquo;
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
