"use client";

import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogIdentify({
  userId,
  email,
}: {
  userId: string;
  email?: string;
}) {
  const posthog = usePostHog();

  useEffect(() => {
    if (posthog && userId) {
      posthog.identify(userId, email ? { email } : undefined);
    }
  }, [posthog, userId, email]);

  return null;
}
