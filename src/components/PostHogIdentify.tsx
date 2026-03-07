"use client";

import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogIdentify({
  userId,
  email,
  companyName,
  accessLevel,
}: {
  userId: string;
  email?: string;
  companyName?: string | null;
  accessLevel?: string;
}) {
  const posthog = usePostHog();

  useEffect(() => {
    if (posthog && userId) {
      const properties: Record<string, string> = {};
      if (email) properties.email = email;
      if (companyName) properties.company_name = companyName;
      if (accessLevel) properties.access_level = accessLevel;
      posthog.identify(userId, Object.keys(properties).length > 0 ? properties : undefined);
    }
  }, [posthog, userId, email, companyName, accessLevel]);

  return null;
}
