"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { StatCounter } from "./StatCounter";

/* ── Data ────────────────────────────────────────────────── */

type Domain = "food" | "pharma" | "devices" | "tobacco" | "biologics" | "pet";

interface FirehoseItem {
  company: string;
  oneLiner: string;
  source: string;
  domain: Domain;
  relevant: boolean;
}

const FIREHOSE_ITEMS: FirehoseItem[] = [
  // Signal (relevant to "Acme Foods")
  {
    company: "Saputo Dairy Foods",
    oneLiner: "Cottage cheese recall — underpasteurized milk",
    source: "Recall",
    domain: "food",
    relevant: true,
  },
  {
    company: "East CK Trading",
    oneLiner: "FSVP violation — imported ginseng & wolfberry",
    source: "Warning Letter",
    domain: "food",
    relevant: true,
  },
  // Noise
  {
    company: "AQ USA Inc.",
    oneLiner: "CGMP deviation — drug manufacturing controls",
    source: "Warning Letter",
    domain: "pharma",
    relevant: false,
  },
  {
    company: "Beta Bionics",
    oneLiner: "Insulin pump PMA supplement approved",
    source: "Device Approval",
    domain: "devices",
    relevant: false,
  },
  {
    company: "Dynamic Stem Cell Therapy",
    oneLiner: "Unapproved stem cell product marketing",
    source: "Warning Letter",
    domain: "biologics",
    relevant: false,
  },
  {
    company: "Tombak International",
    oneLiner: "Tobacco flavoring additive violation",
    source: "Warning Letter",
    domain: "tobacco",
    relevant: false,
  },
  {
    company: "MedisourceRx",
    oneLiner: "Compounding pharmacy sterility failures",
    source: "Warning Letter",
    domain: "pharma",
    relevant: false,
  },
  {
    company: "Elite Treats LLC",
    oneLiner: "Dog food Salmonella contamination recall",
    source: "Recall",
    domain: "pet",
    relevant: false,
  },
  {
    company: "ExThera Medical",
    oneLiner: "Blood filtration device IDE supplement",
    source: "Device Approval",
    domain: "devices",
    relevant: false,
  },
  {
    company: "Sabagh Group Inc.",
    oneLiner: "Tobacco product marketing order denial",
    source: "Enforcement",
    domain: "tobacco",
    relevant: false,
  },
  {
    company: "A. Nelson & Co.",
    oneLiner: "Homeopathic drug CGMP violations",
    source: "Warning Letter",
    domain: "pharma",
    relevant: false,
  },
  {
    company: "swedishproducts LLC",
    oneLiner: "Unauthorized nicotine pouch distribution",
    source: "Warning Letter",
    domain: "tobacco",
    relevant: false,
  },
];

interface SignalItem {
  severity: "critical" | "high";
  type: string;
  company: string;
  product: string;
  summary: string;
  actions: string[];
  deadline: string;
  citation: string;
}

const SIGNAL_ITEMS: SignalItem[] = [
  {
    severity: "critical",
    type: "RECALL",
    company: "Saputo Dairy Foods",
    product: "Cottage Cheese Products",
    summary:
      "Class II recall for cottage cheese produced with underpasteurized milk. Affects dairy supply chain — matches your cottage cheese and cultured dairy product lines.",
    actions: [
      "Check incoming dairy ingredient lot numbers against recall list",
      "Verify pasteurization certificates from Saputo-linked suppliers",
      "Document supply chain review for FDA inspection readiness",
    ],
    deadline: "Immediate — active recall",
    citation: "openFDA Enforcement #0724-2026",
  },
  {
    severity: "high",
    type: "WARNING LETTER",
    company: "East CK Trading Co.",
    product: "Imported Ginseng & Wolfberry",
    summary:
      "FSVP violations for imported botanical ingredients. The cited supplier ships ginseng extract and dried wolfberry — ingredients in your imported botanicals line.",
    actions: [
      "Audit FSVP records for ginseng and wolfberry suppliers",
      "Confirm hazard analysis covers current import sources",
      "Prepare corrective action plan if sharing any cited suppliers",
    ],
    deadline: "15 business days from letter date",
    citation: "FDA Warning Letter WL-320-25-08",
  },
];

const DOMAIN_PILL: Record<Domain, { label: string; className: string }> = {
  food: { label: "Food", className: "bg-amber-100 text-amber-700 border-amber-200/60" },
  pharma: { label: "Pharma", className: "bg-slate-100 text-slate-500 border-slate-200/60" },
  devices: { label: "Devices", className: "bg-slate-100 text-slate-500 border-slate-200/60" },
  tobacco: { label: "Tobacco", className: "bg-slate-100 text-slate-500 border-slate-200/60" },
  biologics: { label: "Biologics", className: "bg-slate-100 text-slate-500 border-slate-200/60" },
  pet: { label: "Pet Food", className: "bg-slate-100 text-slate-500 border-slate-200/60" },
};

/* ── Sub-components ──────────────────────────────────────── */

function FirehoseCard({
  item,
  muted,
}: {
  item: FirehoseItem;
  muted: boolean;
}) {
  return (
    <div
      className={`card-surface rounded-lg px-3 py-2.5 transition-all duration-500 ${
        muted ? "opacity-40" : "opacity-100 ring-1 ring-accent/20"
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${DOMAIN_PILL[item.domain].className}`}
        >
          {item.source}
        </span>
      </div>
      <p className="text-xs font-semibold text-text-primary truncate">
        {item.company}
      </p>
      <p className="text-[11px] text-text-secondary truncate mt-0.5">
        {item.oneLiner}
      </p>
    </div>
  );
}

function SignalCard({ item }: { item: SignalItem }) {
  const barColor = item.severity === "critical" ? "bg-urgent" : "bg-amber";
  const badge =
    item.severity === "critical"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="card-surface rounded-xl overflow-hidden">
      <div className={`h-[3px] ${barColor}`} />
      <div className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${badge}`}
          >
            {item.type}
          </span>
          <span
            className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${badge}`}
          >
            {item.severity}
          </span>
        </div>

        <h4 className="font-serif text-lg font-bold text-text-primary">
          {item.product}
        </h4>
        <p className="text-xs text-text-secondary mt-0.5">{item.company}</p>

        <p className="text-sm text-text-body mt-3 leading-relaxed">
          {item.summary}
        </p>

        <div className="mt-4">
          <p className="text-[11px] font-mono uppercase tracking-wider text-text-secondary mb-2">
            Action Items
          </p>
          <ul className="space-y-1.5">
            {item.actions.map((action) => (
              <li
                key={action}
                className="flex items-start gap-2 text-sm text-text-body"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0 mt-1.5" />
                {action}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 pt-4 border-t border-border">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">
              Deadline
            </p>
            <p className="text-xs font-semibold text-text-primary mt-0.5">
              {item.deadline}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">
              Source
            </p>
            <p className="font-mono text-[11px] text-text-secondary mt-0.5">
              {item.citation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Section ────────────────────────────────────────── */

export default function DayAtFda() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduce = useReducedMotion();

  const dur = reduce ? 0 : undefined;

  // Animation variants
  const firehoseContainer = {
    hidden: {},
    visible: {
      transition: { staggerChildren: reduce ? 0 : 0.03 },
    },
  };

  const firehoseCard = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: dur ?? 0.25, ease: "easeOut" as const },
    },
  };

  const fadeUp = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 } as const,
          whileInView: { opacity: 1, y: 0 } as const,
          viewport: { once: true, margin: "-60px" } as const,
          transition: { duration: 0.45, ease: "easeOut" as const, delay },
        };

  const signalContainer = {
    hidden: {},
    visible: {
      transition: { staggerChildren: reduce ? 0 : 0.1, delayChildren: reduce ? 0 : 0.1 },
    },
  };

  const signalCard = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: dur ?? 0.45, ease: "easeOut" as const },
    },
  };

  return (
    <section className="section-soft py-24 px-6">
      <div className="max-w-5xl mx-auto" ref={ref}>
        {/* Header */}
        <motion.div className="text-center mb-14" {...fadeUp(0)}>
          <p className="font-mono text-xs text-accent uppercase tracking-widest mb-3">
            A REAL DAY
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary mb-4">
            February 24, 2026
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            12 regulatory actions published across warning letters, recalls, and
            enforcement. Here&apos;s what Policy Canary does with them.
          </p>
        </motion.div>

        {/* Firehose grid */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3"
          variants={firehoseContainer}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {FIREHOSE_ITEMS.map((item) => (
            <motion.div key={item.company} variants={firehoseCard}>
              <FirehoseCard item={item} muted={!item.relevant} />
            </motion.div>
          ))}
        </motion.div>

        {/* Filter divider */}
        <motion.div className="my-12 text-center" {...fadeUp(0)}>
          <div className="flex items-center gap-4 max-w-lg mx-auto mb-4">
            <div className="flex-1 h-px bg-border" />
            <p className="font-mono text-[11px] text-text-secondary uppercase tracking-wider whitespace-nowrap">
              Scanned for: Acme Foods &middot; dairy, imported botanicals
            </p>
            <div className="flex-1 h-px bg-border" />
          </div>
          <p className="text-2xl md:text-3xl font-semibold text-text-primary">
            <StatCounter end={2} /> of 12 affect your products
          </p>
        </motion.div>

        {/* Signal cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
          variants={signalContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {SIGNAL_ITEMS.map((item) => (
            <motion.div key={item.citation} variants={signalCard}>
              <SignalCard item={item} />
            </motion.div>
          ))}
        </motion.div>

        {/* Footnote stats */}
        <motion.div
          className="mt-12 text-center"
          {...fadeUp(0.1)}
        >
          <p className="font-mono text-xs text-text-secondary">
            1,200+ warning letters / year &middot; 15 business days to respond
          </p>
        </motion.div>
      </div>
    </section>
  );
}
