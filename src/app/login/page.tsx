"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
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
    } else if (errorParam === "missing_code") {
      setStatus("error");
      setErrorMessage("Something went wrong with the login link. Please try again.");
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
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        shouldCreateUser: true,
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
          className="text-center py-4"
        >
          <p className="text-white font-semibold text-base">Check your inbox</p>
          <p className="text-sm text-slate-400 mt-1">
            We sent a link to{" "}
            <span className="text-canary font-mono">{submittedEmail}</span>
          </p>
          <p className="text-xs text-slate-500 mt-3">
            The link expires in 1 hour. Check spam if it doesn&apos;t arrive.
          </p>
        </motion.div>
      ) : (
        <motion.form key="form" onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="border border-white/20 bg-white/5 rounded px-4 py-2.5 text-sm text-white focus:border-canary focus:outline-none placeholder:text-slate-500"
            disabled={status === "loading"}
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="bg-amber text-white px-6 py-3 rounded font-semibold text-sm flex items-center justify-center gap-2 hover:bg-amber/90 transition-colors duration-150 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {status === "loading" && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Send magic link
          </button>
          {status === "error" && (
            <p className="text-sm text-urgent mt-1">{errorMessage}</p>
          )}
        </motion.form>
      )}
    </AnimatePresence>
  );
}

export default function LoginPage() {
  return (
    <div className="hero-gradient min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="bg-white/5 border border-white/10 rounded overflow-hidden">
          <div className="h-[3px] bg-canary" />
          <div className="p-8">
            <div className="mb-6">
              <p className="font-mono text-xs text-slate-400 uppercase tracking-widest mb-2">
                Policy Canary
              </p>
              <h1 className="font-serif text-2xl font-bold text-white">Sign in</h1>
              <p className="text-sm text-slate-400 mt-1">
                We&apos;ll send a magic link to your inbox.
              </p>
            </div>
            <Suspense fallback={<div className="h-20" />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 mt-6">
          Not a subscriber yet?{" "}
          <a href="/#signup" className="text-slate-400 hover:text-white underline transition-colors">
            Join the free weekly digest
          </a>
        </p>
        {process.env.NODE_ENV === "development" && (
          <p className="text-center text-xs text-slate-600 mt-3">
            <a href="/app/dashboard" className="hover:text-slate-400 transition-colors">
              ↳ dev bypass
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
