"use client";

import posthog from "posthog-js";

/**
 * Client-side event tracking. Use for UI interactions that don't
 * go through an API route (feed clicks, item views, filter changes).
 */
export function trackEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
}
