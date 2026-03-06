"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion, useInView } from "framer-motion";
import { useRef } from "react";
import { z } from "zod";
import { Loader2 } from "lucide-react";

const EmailSchema = z.string().email("Please enter a valid email address");

export default function NewsletterCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = EmailSchema.safeParse(email);
    if (!parsed.success) {
      setStatus("error");
      setErrorMessage(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(json.error?.message ?? "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  }

  const fadeUp = (delay: number) =>
    reduce
      ? { style: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 12 } as const,
          animate: inView ? ({ opacity: 1, y: 0 } as const) : ({ opacity: 0, y: 12 } as const),
          transition: { duration: 0.4, ease: "easeOut" as const, delay },
        };

  return (
    <section className="bg-white py-12 px-6" ref={ref}>
      <div className="max-w-3xl mx-auto">
        {/* Label */}
        <motion.div className="flex items-center gap-2 mb-4" {...fadeUp(0)}>
          <span className="h-2 w-2 rounded-full bg-canary shrink-0" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-text-secondary font-medium">
            Policy Canary Weekly
          </span>
        </motion.div>

        {/* Description */}
        <motion.p
          className="text-[15px] text-text-body leading-relaxed mb-6 max-w-xl"
          {...fadeUp(0.06)}
        >
          Free weekly FDA intelligence for food, supplement, and cosmetic brands.
          No product matching, no login required.
        </motion.p>

        {/* Form / Success */}
        <motion.div {...fadeUp(0.12)}>
          <AnimatePresence mode="wait">
            {status === "success" ? (
              <motion.div
                key="success"
                initial={reduce ? { opacity: 1 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2.5"
              >
                <span className="h-2 w-2 rounded-full bg-clear shrink-0" />
                <p className="text-sm font-medium text-text-primary">
                  Check your inbox.
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-3 sm:items-end"
              >
                <div className="flex-1">
                  <input
                    type="email"
                    aria-label="Email address"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === "error") setStatus("idle");
                    }}
                    required
                    autoComplete="email"
                    disabled={status === "loading"}
                    className="w-full bg-transparent border-0 border-b border-slate-300 focus:border-amber focus:ring-0 text-text-primary placeholder:text-text-secondary text-sm py-2 transition-colors duration-150 outline-none disabled:opacity-60"
                  />
                  {status === "error" && (
                    <p role="alert" className="text-xs text-urgent mt-1.5">{errorMessage}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded font-semibold text-sm transition-colors duration-150 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
                >
                  {status === "loading" && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  )}
                  Subscribe
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
