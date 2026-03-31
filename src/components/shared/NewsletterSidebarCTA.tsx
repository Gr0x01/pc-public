"use client";

import { useState } from "react";

export function NewsletterSidebarCTA() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = new FormData(form).get("email") as string;
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
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="bg-surface-dark rounded-lg p-5">
      <h4 className="text-sm font-semibold text-white mb-1">
        Policy Canary Weekly
      </h4>
      <p className="text-xs text-slate-400 mb-3">
        Free FDA intelligence every Friday.
      </p>
      {status === "success" ? (
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
          <p className="text-sm text-slate-300">You&apos;re subscribed.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="you@company.com"
            required
            autoComplete="email"
            disabled={status === "loading"}
            className="w-full text-sm px-3 py-2 rounded bg-white/10 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber mb-2"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full text-sm font-medium px-3 py-2 rounded bg-amber text-surface-dark hover:bg-amber/90 transition-colors disabled:opacity-70"
          >
            {status === "loading" ? "Subscribing..." : "Subscribe"}
          </button>
          {status === "error" && (
            <p className="text-xs text-red-400 mt-2">Something went wrong. Try again.</p>
          )}
        </form>
      )}
    </div>
  );
}
