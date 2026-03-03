import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";

// Import and register Inngest functions here as they're created in Phase 2+.
// e.g.: import { federalRegisterIngest } from "@/lib/pipeline/ingest/federal-register";
// Functions not registered here will NOT fire, even if defined elsewhere.
const functions: Parameters<typeof serve>[0]["functions"] = [];

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
