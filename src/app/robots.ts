import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/blog/*", "/pricing", "/sample", "/login", "/privacy", "/terms"],
      disallow: ["/app/*", "/api/*"],
    },
    sitemap: "https://policycanary.io/sitemap.xml",
  };
}
