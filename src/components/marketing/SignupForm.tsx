"use client";

import { useReducer } from "react";
import { useReducedMotion, AnimatePresence, motion } from "framer-motion";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";

// Client-side pre-validation only — server is authoritative.
const SignupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  first_name: z.string().min(1, "Please enter your first name").max(50),
  last_name: z.string().min(1, "Please enter your last name").max(50),
  company: z.string().min(1, "Please enter your company name").max(200),
  feedback_consent: z.literal(true, {
    message: "Please agree to the terms to continue",
  }),
});

type Status = "idle" | "loading" | "success" | "error";

interface State {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  feedbackConsent: boolean;
  status: Status;
  errorMessage: string;
  submittedEmail: string;
}

type Action =
  | { type: "SET_EMAIL"; payload: string }
  | { type: "SET_FIRST_NAME"; payload: string }
  | { type: "SET_LAST_NAME"; payload: string }
  | { type: "SET_COMPANY"; payload: string }
  | { type: "SET_FEEDBACK_CONSENT"; payload: boolean }
  | { type: "SUBMIT" }
  | { type: "SUCCESS"; email: string }
  | { type: "ERROR"; message: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_EMAIL":
      return { ...state, email: action.payload };
    case "SET_FIRST_NAME":
      return { ...state, firstName: action.payload };
    case "SET_LAST_NAME":
      return { ...state, lastName: action.payload };
    case "SET_COMPANY":
      return { ...state, company: action.payload };
    case "SET_FEEDBACK_CONSENT":
      return { ...state, feedbackConsent: action.payload };
    case "SUBMIT":
      return { ...state, status: "loading", errorMessage: "" };
    case "SUCCESS":
      return { ...state, status: "success", submittedEmail: action.email };
    case "ERROR":
      return { ...state, status: "error", errorMessage: action.message };
    default:
      return state;
  }
}

interface SignupFormProps {
  dark?: boolean;
}

export function SignupForm({ dark = false }: SignupFormProps) {
  const reduce = useReducedMotion();
  const [state, dispatch] = useReducer(reducer, {
    email: "",
    firstName: "",
    lastName: "",
    company: "",
    feedbackConsent: false,
    status: "idle",
    errorMessage: "",
    submittedEmail: "",
  });

  const inputClasses = dark
    ? "bg-slate-800/80 border border-slate-600/50 text-white placeholder:text-slate-400 rounded px-4 py-2.5 text-sm focus:border-amber focus:outline-none"
    : "border border-border bg-white rounded px-4 py-2.5 text-sm focus:border-amber focus:outline-none text-text-primary placeholder:text-text-secondary";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = SignupSchema.safeParse({
      email: state.email,
      first_name: state.firstName,
      last_name: state.lastName,
      company: state.company,
      feedback_consent: state.feedbackConsent || undefined,
    });
    if (!parsed.success) {
      dispatch({
        type: "ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input",
      });
      return;
    }

    dispatch({ type: "SUBMIT" });

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state.email,
          first_name: state.firstName,
          last_name: state.lastName,
          company: state.company,
          feedback_consent: state.feedbackConsent,
        }),
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        dispatch({
          type: "ERROR",
          message: json.error?.message ?? "Something went wrong. Please try again.",
        });
        return;
      }

      dispatch({ type: "SUCCESS", email: state.email });
    } catch {
      dispatch({
        type: "ERROR",
        message: "Network error. Please check your connection and try again.",
      });
    }
  }

  return (
    <div className="w-full max-w-md">
      <AnimatePresence mode="wait">
        {state.status === "success" ? (
          <motion.div
            key="success"
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center py-4"
          >
            <p className={`font-semibold text-lg ${dark ? "text-white" : "text-text-primary"}`}>
              Check your email
            </p>
            <p className={`text-sm mt-2 ${dark ? "text-slate-300" : "text-text-secondary"}`}>
              We sent a magic link to{" "}
              <span className="text-canary font-mono">{state.submittedEmail}</span>
            </p>
            <p className={`text-xs mt-3 ${dark ? "text-slate-500" : "text-text-secondary"}`}>
              The link expires in 1 hour. Check spam if it doesn&apos;t arrive.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                aria-label="First name"
                placeholder="First name"
                value={state.firstName}
                onChange={(e) =>
                  dispatch({ type: "SET_FIRST_NAME", payload: e.target.value })
                }
                required
                autoComplete="given-name"
                className={inputClasses}
                disabled={state.status === "loading"}
              />
              <input
                type="text"
                aria-label="Last name"
                placeholder="Last name"
                value={state.lastName}
                onChange={(e) =>
                  dispatch({ type: "SET_LAST_NAME", payload: e.target.value })
                }
                required
                autoComplete="family-name"
                className={inputClasses}
                disabled={state.status === "loading"}
              />
            </div>
            <input
              type="text"
              aria-label="Company name"
              placeholder="Company name"
              value={state.company}
              onChange={(e) =>
                dispatch({ type: "SET_COMPANY", payload: e.target.value })
              }
              required
              autoComplete="organization"
              className={inputClasses}
              disabled={state.status === "loading"}
            />
            <input
              type="email"
              aria-label="Work email"
              placeholder="Work email"
              value={state.email}
              onChange={(e) =>
                dispatch({ type: "SET_EMAIL", payload: e.target.value })
              }
              required
              autoComplete="email"
              className={inputClasses}
              disabled={state.status === "loading"}
            />

            {/* Pilot agreement checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer group mt-1">
              <input
                type="checkbox"
                checked={state.feedbackConsent}
                onChange={(e) =>
                  dispatch({ type: "SET_FEEDBACK_CONSENT", payload: e.target.checked })
                }
                disabled={state.status === "loading"}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-amber accent-amber focus:ring-amber"
              />
              <span className={`text-xs leading-relaxed ${dark ? "text-slate-400" : "text-text-secondary"}`}>
                I agree to the{" "}
                <Link href="/terms" className={`underline ${dark ? "text-slate-300 hover:text-white" : "text-text-primary hover:text-text-primary"}`}>
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className={`underline ${dark ? "text-slate-300 hover:text-white" : "text-text-primary hover:text-text-primary"}`}>
                  Privacy Policy
                </Link>
                , and I&apos;m open to sharing feedback during the pilot. I can unsubscribe anytime.
              </span>
            </label>

            <button
              type="submit"
              disabled={state.status === "loading" || !state.feedbackConsent}
              className="bg-canary text-surface-dark px-6 py-3 rounded font-semibold text-sm flex items-center justify-center gap-2 hover:bg-canary/90 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {state.status === "loading" && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Join the Pilot
            </button>

            {state.status === "error" && (
              <p role="alert" className="text-sm text-urgent mt-1">{state.errorMessage}</p>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
