"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Detects `?checkout=start` in the URL and auto-triggers the Stripe checkout flow.
 * Used after login redirect when user clicked "Start free trial" while unauthenticated.
 */
export default function AutoCheckout() {
  const searchParams = useSearchParams();
  const triggered = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("checkout") === "start" && !triggered.current) {
      triggered.current = true;
      fetch("/api/stripe/checkout", { method: "POST" })
        .then((r) => {
          if (!r.ok) throw new Error("Checkout failed");
          return r.json();
        })
        .then(({ url }) => {
          if (url) window.location.href = url;
          else setError("Could not start checkout. Please try again from the pricing page.");
        })
        .catch(() => {
          setError("Could not start checkout. Please try again from the pricing page.");
        });
    }
  }, [searchParams]);

  if (!error) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg shadow-lg max-w-sm flex items-start gap-2">
      <span>{error}</span>
      <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 shrink-0">&times;</button>
    </div>
  );
}
