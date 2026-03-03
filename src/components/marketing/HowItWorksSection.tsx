"use client";

import React, { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const STEPS = [
  {
    step: "01",
    title: "Monitor",
    body: "We watch Federal Register documents, FDA warning letters, openFDA enforcement actions, and RSS feeds — continuously.",
    tags: ["FDA Warning Letters", "Federal Register", "openFDA", "RSS Feeds"],
    stat: null,
    gradient: "linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(234,193,0,0.04) 100%)",
  },
  {
    step: "02",
    title: "Analyze",
    body: "We match each action against your products by name and ingredient. Only relevant changes trigger a full analysis.",
    tags: null,
    stat: "32 products checked · 3 affected",
    gradient: "linear-gradient(135deg, rgba(234,193,0,0.08) 0%, rgba(251,146,60,0.04) 100%)",
  },
  {
    step: "03",
    title: "Alert",
    body: "You get a product-specific email with what happened, which products are affected, and exactly what to do.",
    tags: null,
    stat: "< 24 hrs from FDA publish to your inbox",
    gradient: "linear-gradient(135deg, rgba(251,146,60,0.08) 0%, rgba(251,191,36,0.04) 100%)",
  },
];

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

function StepConnector({ reduce }: { reduce: boolean | null }) {
  return (
    <div className="hidden md:flex items-center flex-1 mx-3 min-w-[32px]">
      <div className="relative flex-1 h-px bg-border overflow-hidden">
        {!reduce && (
          <motion.span
            className="absolute inset-y-0 w-6 bg-gradient-to-r from-transparent via-accent to-transparent"
            animate={{ left: ["-24px", "100%"] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
              repeatDelay: 0.8,
            }}
          />
        )}
      </div>
      <span className="text-border-strong text-xs ml-1">&rsaquo;</span>
    </div>
  );
}

export default function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduce = useReducedMotion();

  return (
    <section className="section-soft py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="font-mono text-xs text-accent uppercase tracking-widest mb-3">
            HOW IT WORKS
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary mb-4">
            Three steps. Fully automated.
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            Three steps from FDA action to your inbox — all automated.
          </p>
        </div>

        {/* Cards + connectors */}
        <motion.div
          ref={ref}
          className="flex flex-col md:flex-row items-stretch"
          variants={container}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {STEPS.map(({ step, title, body, tags, stat, gradient }, i) => (
            <React.Fragment key={step}>
              <motion.div
                variants={cardVariant}
                className="flex-1 rounded-lg card-surface p-6 hover:-translate-y-0.5 transition-all duration-150"
                style={{ background: gradient }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-mono text-xs font-bold text-accent bg-accent-soft rounded-full px-2.5 py-0.5">
                    {step}
                  </span>
                  <h3 className="text-lg font-bold text-text-primary">
                    {title}
                  </h3>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed mb-4">
                  {body}
                </p>
                {tags && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="font-mono text-[10px] text-text-secondary bg-surface-subtle border border-border rounded px-1.5 py-0.5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {stat && (
                  <p className="font-mono text-xs text-text-secondary">
                    {stat}
                  </p>
                )}
              </motion.div>
              {i < STEPS.length - 1 && <StepConnector reduce={reduce} />}
            </React.Fragment>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
