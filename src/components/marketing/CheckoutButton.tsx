"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function CheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });

      if (res.status === 401) {
        window.location.href = "/login?next=checkout";
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="mt-3 block w-full bg-amber text-white text-sm font-semibold px-4 py-2 rounded hover:bg-amber/90 transition-colors duration-150 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mx-auto" aria-hidden="true" />
        ) : (
          "Start 14-day free trial"
        )}
      </button>
      {error && (
        <p className="text-xs text-urgent mt-1 text-center">{error}</p>
      )}
    </div>
  );
}
