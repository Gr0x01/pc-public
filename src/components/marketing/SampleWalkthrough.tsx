"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import SampleReport from "./SampleReport";

// ---------------------------------------------------------------------------
// Annotation data
// ---------------------------------------------------------------------------

const SECTIONS = [
  "header",
  "bluf",
  "product-1",
  "actions-1",
  "product-2",
  "industry",
  "across-fda",
  "footer",
] as const;

type SectionId = (typeof SECTIONS)[number];

interface Annotation {
  label: string;
  title: string;
  body: string;
  detail?: string;
}

const annotations: Record<SectionId, Annotation> = {
  header: {
    label: "Header",
    title: "Timestamped and versioned",
    body: "Every briefing is dated. Your compliance records need audit trails — this is one.",
  },
  bluf: {
    label: "Bottom Line",
    title: "5-second triage",
    body: "How many of your products are affected and what matters most. You know immediately whether to keep reading or forward to your team.",
    detail:
      "This subscriber monitors 3 products. One had an all-clear this week — the silence is part of the value.",
  },
  "product-1": {
    label: "Your Products",
    title: "Product-level intelligence",
    body: "Not 'supplement industry news.' YOUR Marine Collagen Powder, matched by ingredient against FDA enforcement activity. The product name is the headline.",
  },
  "actions-1": {
    label: "Action Items",
    title: "What to do, by when",
    body: "Numbered steps with a specific deadline and the CFR citation. Not 'consult your lawyer' — concrete actions you can take this week.",
    detail:
      "Warning letter remediation can cost $25K–$100K+. These three steps cost an afternoon.",
  },
  "product-2": {
    label: "Your Products",
    title: "Calibrated urgency",
    body: "'Urgent' means act now — a confirmed enforcement action. 'Watch' means a proposed rule still in comment period. Not everything is treated like a crisis.",
  },
  industry: {
    label: "Your Industry",
    title: "Sector context, not noise",
    body: "Items in your regulatory space that don't directly hit your products — but you should know about. Inspection trends, registration deadlines, enforcement patterns.",
  },
  "across-fda": {
    label: "Across FDA",
    title: "The full landscape in one glance",
    body: "Devices, pharma, tobacco — anything outside your sector, summarized. If something here starts affecting your products, it moves up automatically.",
  },
  footer: {
    label: "Source & Disclaimer",
    title: "Every claim sourced",
    body: "AI-generated analysis from public FDA sources. We tell you to verify — because that's what a trustworthy source does.",
  },
};

// ---------------------------------------------------------------------------
// Mobile inline callout (rendered between sections on small screens)
// ---------------------------------------------------------------------------

function InlineCallout({ annotation }: { annotation: Annotation }) {
  return (
    <div className="lg:hidden my-4 mx-auto max-w-[600px] pl-4 border-l-2 border-amber/40 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber mb-0.5">
        {annotation.label}
      </p>
      <p className="text-sm font-semibold text-text-primary leading-snug">
        {annotation.title}
      </p>
      <p className="text-[13px] text-text-secondary leading-relaxed mt-0.5">
        {annotation.body}
      </p>
      {annotation.detail && (
        <p className="text-[13px] text-text-tertiary leading-relaxed mt-1 italic">
          {annotation.detail}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Annotation panel (desktop sticky sidebar)
// ---------------------------------------------------------------------------

function AnnotationPanel({
  activeSection,
  reduce,
}: {
  activeSection: SectionId;
  reduce: boolean | null;
}) {
  const annotation = annotations[activeSection];

  return (
    <div className="flex items-start pl-4 border-l-2 border-amber/20">
      <div className="flex-1 min-h-[160px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-amber mb-2">
              {annotation.label}
            </p>
            <p className="text-lg font-bold text-text-primary leading-tight mb-3">
              {annotation.title}
            </p>
            <p className="text-base text-text-secondary leading-relaxed">
              {annotation.body}
            </p>
            {annotation.detail && (
              <p className="text-sm text-text-tertiary leading-relaxed mt-4 italic border-l-2 border-border pl-3">
                {annotation.detail}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main walkthrough component
// ---------------------------------------------------------------------------

export default function SampleWalkthrough() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("header");
  const reduce = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const sectionEls = container.querySelectorAll<HTMLElement>("[data-section]");
    if (sectionEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry with the highest intersection ratio
        let best: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (
            entry.intersectionRatio > 0.15 &&
            (!best || entry.intersectionRatio > best.intersectionRatio)
          ) {
            best = entry;
          }
        }
        if (best) {
          const section = (best.target as HTMLElement).dataset.section as SectionId;
          if (section && SECTIONS.includes(section)) {
            setActiveSection(section);
          }
        }
      },
      {
        threshold: [0, 0.15, 0.3, 0.5, 0.7, 1.0],
        rootMargin: "-80px 0px -25% 0px",
      }
    );

    sectionEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Desktop: two-column layout */}
      <div
        ref={containerRef}
        className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[600px_1fr] gap-8 lg:gap-12 items-start"
      >
        {/* Email column */}
        <div>
          <SampleReport />
        </div>

        {/* Annotation sidebar (desktop only) */}
        <div className="hidden lg:block sticky top-[35vh]">
          <AnnotationPanel activeSection={activeSection} reduce={reduce} />
        </div>
      </div>

      {/* Mobile: inline callouts rendered below email */}
      <div className="lg:hidden mt-8 space-y-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary text-center mb-4">
          What each section means
        </p>
        {SECTIONS.filter((s) => s !== "footer").map((id) => (
          <InlineCallout key={id} annotation={annotations[id]} />
        ))}
      </div>
    </>
  );
}
