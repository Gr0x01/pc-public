"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { SignupForm } from "@/components/marketing/SignupForm";
import Logo from "@/components/ui/Logo";

type Status = "idle" | "loading" | "success" | "error";

function LoginForm() {
  const reduce = useReducedMotion();
  const searchParams = useSearchParams();
  const authFailed = searchParams.get("error") === "auth_failed";
  const authFailedMessage = "That link has expired or is invalid. Please request a new one.";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setStatus("error");
      setErrorMessage("Please enter your email address.");
      return;
    }
    setStatus("loading");
    setErrorMessage("");
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const nextParam = searchParams.get("next");
    const callbackUrl = nextParam
      ? `${siteUrl}/auth/callback?next=${encodeURIComponent(nextParam)}`
      : `${siteUrl}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: callbackUrl,
        shouldCreateUser: false,
      },
    });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message ?? "Something went wrong. Please try again.");
      return;
    }
    setSubmittedEmail(trimmed);
    setStatus("success");
  }

  const showError = status === "error" || (status === "idle" && authFailed);
  const displayedError = status === "error" ? errorMessage : authFailedMessage;

  return (
    <AnimatePresence mode="wait">
      {status === "success" ? (
        <motion.div
          key="success"
          initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center py-2"
        >
          <motion.div
            initial={reduce ? {} : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, type: "spring", bounce: 0.4, delay: 0.1 }}
            className="mx-auto mb-4"
          >
            <div className="w-14 h-14 rounded-full bg-clear-muted flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7 text-clear" />
            </div>
          </motion.div>

          <h2 className="font-sans text-xl font-semibold text-text-primary">
            Check your inbox
          </h2>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">
            We sent a magic link to{" "}
            <span className="font-mono text-amber font-medium">{submittedEmail}</span>
          </p>
          <p className="text-xs text-text-secondary/70 mt-4">
            The link expires in 1 hour. Check spam if it doesn&apos;t arrive.
          </p>

          <button
            onClick={() => {
              setStatus("idle");
              setSubmittedEmail("");
            }}
            className="mt-5 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 underline underline-offset-2"
          >
            Use a different email
          </button>
        </motion.div>
      ) : (
        <motion.form key="form" onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label htmlFor="login-email" className="block text-xs font-medium text-text-secondary mb-1.5">
              Work email
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full border border-border bg-surface rounded px-4 py-2.5 text-sm text-text-primary focus:border-amber focus:ring-1 focus:ring-amber/30 focus:outline-none placeholder:text-text-secondary/50 transition-colors duration-150"
              disabled={status === "loading"}
            />
          </div>
          <button
            type="submit"
            disabled={status === "loading"}
            className="bg-amber text-white px-6 py-3 rounded font-semibold text-sm flex items-center justify-center gap-2 hover:bg-amber-action transition-colors duration-150 disabled:opacity-70 disabled:cursor-not-allowed mt-1"
          >
            {status === "loading" && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Send magic link
          </button>

          <AnimatePresence>
            {showError && (
              <motion.div
                initial={reduce ? { opacity: 1 } : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="bg-urgent-muted border border-urgent/15 rounded px-3 py-2.5 mt-1"
              >
                <p className="text-sm text-urgent">{displayedError}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Pilot promotion panel (left / bottom)                             */
/* ------------------------------------------------------------------ */
function PilotPanel({ reduce }: { reduce: boolean | null }) {
  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 } as const,
          animate: { opacity: 1, y: 0 } as const,
          transition: { duration: 0.45, ease: "easeOut" as const, delay },
        };

  return (
    <div className="flex flex-col justify-center h-full">
      <motion.p
        className="font-mono text-[11px] text-amber-text uppercase tracking-widest mb-4 font-semibold"
        {...fade(0)}
      >
        Pilot Program
      </motion.p>

      <motion.h2 className="text-3xl font-bold text-white leading-tight tracking-tight" {...fade(0.06)}>
        Track FDA changes by product&nbsp;name.
      </motion.h2>

      <motion.p
        className="text-slate-300 mt-4 leading-relaxed max-w-md"
        {...fade(0.12)}
      >
        Product-level FDA monitoring for supplement, food, and
        cosmetics brands. When a regulation affects your Marine
        Collagen Powder, you know&nbsp;first.
      </motion.p>

      <motion.p
        className="text-slate-500 text-sm mt-3 max-w-md"
        {...fade(0.16)}
      >
        Join the pilot to get early&nbsp;access.
      </motion.p>

      <motion.div className="mt-10" {...fade(0.22)}>
        <SignupForm dark={true} />
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  const reduce = useReducedMotion();

  return (
    <>
      <div className="h-[3px] bg-gradient-to-r from-canary via-amber to-canary" />

      <div className="min-h-[calc(100vh-3px)] section-soft px-5 py-10 md:px-8 md:py-14 lg:py-20">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="soft-card overflow-hidden"
            initial={reduce ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1.02fr_0.98fr]">
              <div
                className="px-6 py-10 md:px-10 md:py-12 lg:px-12 lg:py-14"
                style={{ background: "var(--gradient-dark-surface)" }}
              >
                <PilotPanel reduce={reduce} />
              </div>

              <div className="bg-surface-muted px-6 py-10 md:px-10 md:py-12 lg:px-12 lg:py-14 flex items-center">
                <div className="w-full max-w-sm mx-auto">
                  <Link href="/" className="inline-block mb-8">
                    <Logo className="h-3 text-text-primary" />
                  </Link>

                  <div className="mb-6">
                    <h1 className="font-serif text-2xl font-bold text-text-primary">
                      Sign in
                    </h1>
                    <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
                      Existing pilot members.
                    </p>
                  </div>

                  <Suspense fallback={<div className="h-24" />}>
                    <LoginForm />
                  </Suspense>

                  {process.env.NODE_ENV === "development" && (
                    <p className="text-xs text-text-secondary/50 mt-4">
                      <Link href="/app/dashboard" className="hover:text-text-secondary transition-colors duration-150">
                        dev bypass
                      </Link>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
