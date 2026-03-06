"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, Mail } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "loading" | "success" | "error";

function LoginForm() {
  const reduce = useReducedMotion();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "auth_failed") {
      setStatus("error");
      setErrorMessage("That link has expired or is invalid. Please request a new one.");
    }
  }, [searchParams]);

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
            {status === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Mail className="h-4 w-4" aria-hidden="true" />
            )}
            Send magic link
          </button>

          <AnimatePresence>
            {status === "error" && (
              <motion.div
                initial={reduce ? { opacity: 1 } : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="bg-urgent-muted border border-urgent/15 rounded px-3 py-2.5 mt-1"
              >
                <p className="text-sm text-urgent">{errorMessage}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-surface-muted flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <a href="/" className="block text-center mb-8">
          <span className="font-mono text-xs text-amber uppercase tracking-[0.2em]">
            Policy Canary
          </span>
        </a>

        <div className="bg-surface rounded-lg overflow-hidden border border-border shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.04)]">
          <div className="h-[3px] bg-gradient-to-r from-canary via-amber to-canary" />

          <div className="p-8">
            <div className="mb-6">
              <h1 className="font-serif text-2xl font-bold text-text-primary">
                Sign in
              </h1>
              <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
                Enter your email and we&apos;ll send a secure link.
              </p>
            </div>

            <Suspense fallback={<div className="h-24" />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>

        <p className="text-center text-sm text-text-secondary mt-6">
          Not signed up yet?{" "}
          <a
            href="/#signup"
            className="text-amber font-medium hover:text-amber-action underline underline-offset-2 transition-colors duration-150"
          >
            Join the pilot
          </a>
        </p>
        {process.env.NODE_ENV === "development" && (
          <p className="text-center text-xs text-text-secondary/50 mt-3">
            <a href="/app/dashboard" className="hover:text-text-secondary transition-colors duration-150">
              dev bypass
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
