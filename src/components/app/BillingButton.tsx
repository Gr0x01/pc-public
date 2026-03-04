"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function BillingButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Network error.");
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handlePortal}
        disabled={loading}
        className="text-xs text-slate-500 hover:text-slate-300 transition-colors duration-100 disabled:opacity-70"
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : (
          "Manage Billing"
        )}
      </button>
      {error && (
        <p className="absolute top-full right-0 text-xs text-red-400 mt-1 whitespace-nowrap">
          {error}
        </p>
      )}
    </div>
  );
}
