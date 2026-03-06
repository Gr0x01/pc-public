"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (handled.current) return;

      if (
        (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
        session
      ) {
        handled.current = true;

        // Sync user record (upsert in users table, link email_subscribers)
        try {
          await fetch("/api/auth/sync-user", { method: "POST" });
        } catch (e) {
          console.error("[auth/callback] sync-user failed:", e);
        }

        // Redirect based on next param — allowlisted values only
        const next = searchParams.get("next");
        if (next === "checkout") {
          router.replace("/app/feed?checkout=start");
        } else if (next === "onboarding") {
          router.replace("/app/onboarding");
        } else {
          router.replace("/app/feed");
        }
      } else if (event === "INITIAL_SESSION" && !session) {
        // No session detected from URL hash or code — auth failed
        handled.current = true;
        router.replace("/login?error=auth_failed");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="inline-block h-6 w-6 border-2 border-canary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-slate-400">Signing you in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
