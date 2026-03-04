"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Detects `?checkout=start` in the URL and auto-triggers the Stripe checkout flow.
 * Used after login redirect when user clicked "Start free trial" while unauthenticated.
 */
export default function AutoCheckout() {
  const searchParams = useSearchParams();
  const triggered = useRef(false);

  useEffect(() => {
    if (searchParams.get("checkout") === "start" && !triggered.current) {
      triggered.current = true;
      fetch("/api/stripe/checkout", { method: "POST" })
        .then((r) => r.json())
        .then(({ url }) => {
          if (url) window.location.href = url;
        })
        .catch(console.error);
    }
  }, [searchParams]);

  return null;
}
