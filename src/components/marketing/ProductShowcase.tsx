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
            "radial-gradient(900px 480px at 0% 100%, rgba(217,119,6,0.10) 0%, transparent 60%), radial-gradient(700px 420px at 100% 0%, rgba(234,193,0,0.10) 0%, transparent 62%)",
        }}
        aria-hidden="true"
      />
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12 relative z-10">
          <p className="font-mono text-xs text-amber-text uppercase tracking-widest mb-3">
            WHEN YOU NEED TO DIG DEEPER
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary mb-4">
            Your dashboard is here
            <br className="hidden md:block" />
            when you need it.
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            The intelligence starts in your inbox. When you want to explore
            further — search enforcement history, manage products, see the
            full picture — your dashboard is ready.
          </p>
        </div>

        {/* Dashboard mockup */}
        <div
          className="rounded-2xl overflow-hidden relative z-10 bg-white"
          style={{
            boxShadow:
              "0 20px 40px -10px rgba(15,23,42,0.1), 0 10px 20px -5px rgba(15,23,42,0.05), inset 0 0 0 1px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.5)",
          }}
        >
          {/* Subtle inner glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none z-20" />
          {/* Browser chrome */}
          <div
            className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/50"
            style={{ background: "#F8FAFC" }}
          >
            <div className="flex items-center gap-1.5 opacity-80">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300 shadow-inner" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300 shadow-inner" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300 shadow-inner" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-white border border-slate-200/80 rounded-md shadow-sm px-3 py-1 max-w-sm mx-auto flex items-center justify-center gap-2">
                <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="font-sans text-[11px] text-slate-500 font-medium tracking-wide">
                  app.policycanary.com/products
                </p>
              </div>
            </div>
          </div>

          {/* App layout */}
          <div
            className="flex relative z-10"
            style={{ background: "#FFFFFF", minHeight: "440px" }}
          >
            {/* Left sidebar — product list */}
            <div
              className="w-52 md:w-64 border-r border-slate-100 flex-shrink-0 flex flex-col bg-slate-50/50 backdrop-blur-sm"
            >
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="font-sans text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                  Monitored Products
                </p>
              </div>
              <div className="p-2 space-y-1">
                {PRODUCTS.map((p) => {
                  const cfg = STATUS_CONFIG[p.status];
                  const isSelected = p.id === selectedId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-3 transition-all duration-200 ${
                        isSelected ? "bg-white shadow-sm ring-1 ring-slate-200/50" : "hover:bg-slate-100/50"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full mt-1.5 shrink-0 shadow-sm ${
                          isSelected ? "bg-amber" : cfg.dot
                        }`}
                      />
                      <div className="min-w-0">
                        <p className={`text-[13px] font-medium leading-snug truncate ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                          {p.name}
                        </p>
                        <p className={`text-[11px] mt-0.5 ${isSelected ? 'text-slate-500' : 'text-slate-400'}`}>
                          {cfg.label}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right panel — intelligence detail */}
            <div className="flex-1 bg-white overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-amber/20 via-amber/40 to-transparent" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={product.id}
                  initial={reduce ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? { opacity: 1 } : { opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.3, type: "spring", bounce: 0, stiffness: 200, damping: 20 }}
                  className="h-full"
                >
                  <div className="p-8 md:p-10">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-amber/10 text-amber-text px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide">
                        Intelligence Report
                      </span>
                      <span className="text-slate-400 text-xs text-[11px]">{product.time}</span>
                    </div>
                    <div className="flex items-start gap-4 mb-6 pb-6 border-b border-slate-100">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif text-2xl md:text-3xl font-semibold text-slate-900 leading-tight">
                          {product.name}
                        </h3>
                      </div>
                      {product.violation && (
                        <span className="font-mono text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 shrink-0 mt-1 shadow-sm">
                          {product.violation}
                        </span>
                      )}
                    </div>

                    {/* Analysis */}
                    <div className="prose prose-sm prose-slate max-w-none mb-8">
                      <p className="text-[15px] leading-relaxed text-slate-600">
                        {product.analysis}
                      </p>
                    </div>

                    {/* Action items */}
                    {product.actions.length > 0 && (
                      <div className="mb-8 bg-slate-50 rounded-xl p-5 border border-slate-100">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
                          Recommended Actions
                        </p>
                        <ul className="space-y-2.5">
                          {product.actions.map((action, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[10px] font-medium text-slate-500 mt-0.5">
                                {i + 1}
                              </span>
                              <span className="text-[14px] text-slate-700 leading-snug pt-0.5">
                                {action}
                              </span>
                            </li>
                          ))}
                        </ul>
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
