import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lubrfsslflnecagxruxu.supabase.co",
        pathname: "/storage/v1/object/public/blog-images/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "policy-canary",
  project: "policy-canary-web",

  // Only upload source maps in CI/Vercel (requires SENTRY_AUTH_TOKEN env var)
  silent: !process.env.CI,

  // Upload source maps for better stack traces
  widenClientFileUpload: true,

  // Automatically tree-shake unused Sentry code
  disableLogger: true,

  // Hide source maps from the client
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Tunnel Sentry events through the app to avoid ad blockers
  tunnelRoute: "/monitoring",
});
