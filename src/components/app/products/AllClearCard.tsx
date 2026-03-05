"use client";

import { motion, useReducedMotion } from "framer-motion";

interface AllClearCardProps {
  lastScannedAt: string;
}

export default function AllClearCard({ lastScannedAt }: AllClearCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const scanDate = new Date(lastScannedAt);
  const formatted = scanDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const time = scanDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
      className="border border-border rounded bg-white p-8 text-center mb-8"
    >
      {/* Green checkmark */}
      <div className="w-10 h-10 rounded-full bg-clear/10 flex items-center justify-center mx-auto mb-4">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-clear">
          <path
            d="M5 10.5l3.5 3.5L15 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <p className="text-base font-medium text-text-body mb-3">
        No active regulatory items affect this product.
      </p>

      <div className="space-y-0.5">
        <p className="font-mono text-[11px] text-text-secondary">
          Last full scan: {formatted} at {time}
        </p>
        <p className="font-mono text-[11px] text-text-secondary">
          Sources checked: Federal Register, Warning Letters, Recalls, Safety Alerts
        </p>
      </div>
    </motion.div>
  );
}
