"use client";

import { useReducer } from "react";
import { useReducedMotion, AnimatePresence, motion } from "framer-motion";
import { z } from "zod";
import { Loader2 } from "lucide-react";

// Client-side pre-validation only — server is authoritative.
// Keep in sync with /src/app/api/signup/route.ts SignupSchema.
const SignupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().max(100).optional(),
});

type Status = "idle" | "loading" | "success" | "error";

interface State {
  email: string;
  name: string;
  status: Status;
  errorMessage: string;
  subscribedName: string;
}

type Action =
  | { type: "SET_EMAIL"; payload: string }
  | { type: "SET_NAME"; payload: string }
  | { type: "SUBMIT" }
  | { type: "SUCCESS"; name: string }
  | { type: "ERROR"; message: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_EMAIL":
      return { ...state, email: action.payload };
    case "SET_NAME":
      return { ...state, name: action.payload };
    case "SUBMIT":
      return { ...state, status: "loading", errorMessage: "" };
    case "SUCCESS":
      return { ...state, status: "success", subscribedName: action.name };
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
    name: "",
    status: "idle",
    errorMessage: "",
    subscribedName: "",
  });

  const inputClasses = dark
    ? "bg-slate-800/80 border border-slate-600/50 text-white placeholder:text-slate-400 rounded px-4 py-2.5 text-sm focus:border-amber focus:outline-none"
    : "border border-border bg-white rounded px-4 py-2.5 text-sm focus:border-amber focus:outline-none text-text-primary placeholder:text-text-secondary";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = SignupSchema.safeParse({
      email: state.email,
      name: state.name || undefined,
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
          name: state.name || undefined,
          source: "signup_form",
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

      dispatch({ type: "SUCCESS", name: state.name });
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
            <p className="text-white font-semibold text-lg">
              You&apos;re on the list
              {state.subscribedName ? `, ${state.subscribedName}` : ""}!
            </p>
            <p className="text-slate-300 text-sm mt-1">
              We&apos;ll help you add your first products next.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-3"
          >
            <input
              type="text"
              placeholder="Your name (optional)"
              value={state.name}
              onChange={(e) =>
                dispatch({ type: "SET_NAME", payload: e.target.value })
              }
              className={inputClasses}
              disabled={state.status === "loading"}
            />
            <input
              type="email"
              placeholder="Work email"
              value={state.email}
              onChange={(e) =>
                dispatch({ type: "SET_EMAIL", payload: e.target.value })
              }
              required
              className={inputClasses}
              disabled={state.status === "loading"}
            />
            <button
              type="submit"
              disabled={state.status === "loading"}
              className="bg-surface-dark text-white px-6 py-3 rounded font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#1E293B] transition-colors duration-150 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {state.status === "loading" && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Start Free
            </button>

            {state.status === "error" && (
              <p className="text-sm text-urgent mt-1">{state.errorMessage}</p>
            )}

            <p className="text-xs text-slate-400 mt-1">
              We&apos;ll personalize based on the products you add after signup.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
