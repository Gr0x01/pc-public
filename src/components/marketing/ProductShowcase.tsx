"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

type ProductStatus = "urgent" | "clear" | "review";

interface Product {
  id: string;
  status: ProductStatus;
  name: string;
  time: string;
  violation: string | null;
  analysis: string;
  actions: string[];
  deadline: string | null;
  source: string;
}

const PRODUCTS: Product[] = [
  {
    id: "collagen",
    status: "urgent",
    name: "Marine Collagen Powder",
    time: "2h ago",
    violation: "21 CFR 111.75(a)(1)(ii)",
    analysis:
      "NovaBiotics failed identity testing for marine collagen. COA-only documentation was deemed insufficient by the FDA. Your product uses the same ingredient — this warning applies to your formulation.",
    actions: [
      "Audit identity testing protocols against 21 CFR 111.75(a)(1)(ii)",
      "Verify COA includes marine collagen-specific identity tests, not generic protein analysis",
      "Confirm per-batch testing with your contract manufacturer",
    ],
    deadline: "Action required by Q2 2026",
    source: "FDA CFSAN Warning Letters · 21 CFR 111.75(a)(1)(ii)",
  },
  {
    id: "biotin",
    status: "clear",
    name: "Biotin Complex 5000mcg",
    time: "2h ago",
    violation: null,
    analysis:
      "We reviewed the recent identity testing warning against your Biotin Complex formulation. Marine collagen is not an ingredient in this product. No action needed.",
    actions: [],
    deadline: null,
    source: "FDA CFSAN Warning Letters",
  },
  {
    id: "bha",
    status: "review",
    name: "BHA Eye Cream SPF 15",
    time: "1d ago",
    violation: "21 CFR 352",
    analysis:
      "FDA issued draft guidance on BHA concentration limits in OTC sunscreen products. Your formulation contains BHA at a level that may require reformulation before final guidance is published.",
    actions: [
      "Review current BHA concentration against draft guidance thresholds",
      "Consult formulation team on reformulation feasibility and timeline",
      "Monitor for final guidance — comment period closes June 2026",
    ],
    deadline: "Comment period closes June 2026",
    source: "FDA Draft Guidance · OTC Sunscreen",
  },
  {
    id: "turmeric",
    status: "clear",
    name: "Turmeric Joint Formula",
    time: "3d ago",
    violation: null,
    analysis:
      "Recent FDA enforcement actions on supplement identity testing do not affect this product. Turmeric formulation reviewed against current warning letter parameters.",
    actions: [],
    deadline: null,
    source: "FDA CFSAN Warning Letters",
  },
  {
    id: "probiotic",
    status: "clear",
    name: "Probiotic Daily 30B",
    time: "1w ago",
    violation: null,
    analysis:
      "No recent FDA actions affect this product. Probiotic formulation reviewed against current enforcement patterns and Federal Register publications.",
    actions: [],
    deadline: null,
    source: "FDA Enforcement · Dietary Supplements",
  },
];

const STATUS_CONFIG: Record<
  ProductStatus,
  { dot: string; label: string; text: string }
> = {
  urgent: { dot: "bg-urgent", label: "Action Required", text: "text-urgent" },
  clear: { dot: "bg-clear", label: "All Clear", text: "text-clear" },
  review: { dot: "bg-amber", label: "Under Review", text: "text-amber" },
};

export default function ProductShowcase() {
  const [selectedId, setSelectedId] = useState(PRODUCTS[0].id);
  const reduce = useReducedMotion();
  const product = PRODUCTS.find((p) => p.id === selectedId)!;

  return (
    <section className="py-24 px-6 bg-white relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(900px 480px at 0% 100%, rgba(99,91,255,0.10) 0%, transparent 60%), radial-gradient(700px 420px at 100% 0%, rgba(32,161,255,0.10) 0%, transparent 62%)",
        }}
        aria-hidden="true"
      />
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12 relative z-10">
          <p className="font-mono text-xs text-accent uppercase tracking-widest mb-3">
            THE PRODUCT
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary mb-4">
            You know exactly which products
            <br className="hidden md:block" />
            need attention today.
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            Not a regulatory summary. Your products, matched against every FDA
            action — with the analysis and action items already written.
          </p>
        </div>

        {/* Dashboard mockup */}
        <div
          className="rounded-xl overflow-hidden border border-slate-900/10 relative z-10"
          style={{
            boxShadow:
              "0 32px 64px rgba(15,23,42,0.24), 0 8px 20px rgba(15,23,42,0.16)",
          }}
        >
          {/* Browser chrome */}
          <div
            className="flex items-center gap-2 px-4 py-3 border-b border-white/10"
            style={{ background: "#020B18" }}
          >
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-white/5 border border-white/10 rounded px-3 py-1 max-w-xs mx-auto">
                <p className="font-mono text-[11px] text-slate-400 text-center">
                  app.policycanary.com/products
                </p>
              </div>
            </div>
          </div>

          {/* App layout */}
          <div
            className="flex"
            style={{ background: "#0F172A", minHeight: "440px" }}
          >
            {/* Left sidebar — product list */}
            <div
              className="w-52 md:w-60 border-r border-white/10 flex-shrink-0 flex flex-col"
              style={{ background: "#07111F" }}
            >
              <div className="px-4 py-3 border-b border-white/10">
                <p className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                  Monitored Products
                </p>
              </div>
              {PRODUCTS.map((p) => {
                const cfg = STATUS_CONFIG[p.status];
                const isSelected = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors duration-100 ${
                      isSelected ? "" : "hover:bg-white/5"
                    }`}
                    style={isSelected ? { background: "rgba(255,255,255,0.08)" } : undefined}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${
                        isSelected ? "bg-canary" : cfg.dot
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white/90 leading-snug">
                        {p.name}
                      </p>
                      <p className={`font-mono text-[10px] mt-0.5 ${cfg.text}`}>
                        {cfg.label}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right panel — intelligence detail */}
            <div className="flex-1 bg-white overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={product.id}
                  initial={reduce ? { opacity: 1 } : { opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? { opacity: 1 } : { opacity: 0, x: -12 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="h-full"
                >
                  <div className="h-[3px] bg-canary" />
                  <div className="p-5 md:p-6">
                    {/* Header */}
                    <p className="font-mono text-[10px] text-text-secondary uppercase tracking-wider mb-2">
                      Policy Canary · Product Intelligence
                    </p>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif text-xl md:text-2xl font-bold text-text-primary flex items-center gap-2">
                          {product.status === "urgent" && (
                            <span className="h-2 w-2 rounded-full bg-urgent shrink-0 mt-0.5" />
                          )}
                          {product.name}
                        </h3>
                      </div>
                      {product.violation && (
                        <span className="font-mono text-[10px] text-text-secondary bg-surface-subtle border border-border rounded px-2 py-1 shrink-0 mt-1">
                          {product.violation}
                        </span>
                      )}
                    </div>

                    {/* Analysis */}
                    <p className="text-sm text-text-body leading-relaxed mb-4">
                      {product.analysis}
                    </p>

                    {/* Action items */}
                    {product.actions.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-2">
                          Action Items
                        </p>
                        <ol className="text-sm text-text-body space-y-1.5 list-decimal list-inside">
                          {product.actions.map((action, i) => (
                            <li key={i} className="leading-relaxed">
                              {action}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Deadline */}
                    {product.deadline && (
                      <p className="font-semibold text-sm text-amber mb-4">
                        {product.deadline}
                      </p>
                    )}

                    {/* Source */}
                    <div className="pt-3 border-t border-border">
                      <p className="font-mono text-[10px] text-text-secondary">
                        Source: {product.source}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <p className="text-center text-text-secondary text-xs mt-4 font-mono">
          Interactive demo · click any product to see its intelligence
        </p>
      </div>
    </section>
  );
}
