"use client";

import { useState } from "react";

export function NewsletterEndCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mt-12 border-t border-border pt-10">
      {status === "success" ? (
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
          <p className="text-base text-text-primary font-medium">
            You&apos;re subscribed. First issue arrives next&nbsp;Friday.
          </p>
        </div>
      ) : (
        <>
          <h3 className="text-xl font-bold text-text-primary mb-1">
            Get this in your inbox every&nbsp;Friday.
          </h3>
          <p className="text-sm text-text-secondary mb-4">
            Free FDA intelligence digest. No account required.
          </p>
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-md">
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={status === "loading"}
              className="flex-1 text-sm px-3.5 py-2.5 rounded-lg border border-border bg-white text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber/20 focus:border-amber disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="text-sm font-semibold px-5 py-2.5 rounded-lg bg-surface-dark text-white hover:bg-surface-dark/90 transition-colors disabled:opacity-70 whitespace-nowrap"
            >
              {status === "loading" ? "..." : "Subscribe"}
            </button>
          </form>
          {status === "error" && (
            <p className="text-xs text-red-600 mt-2">Something went wrong. Try again.</p>
          )}
        </>
      )}
    </div>
  );
}
