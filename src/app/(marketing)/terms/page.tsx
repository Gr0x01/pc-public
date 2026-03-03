import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Policy Canary",
};

export default function TermsPage() {
  return (
    <section className="bg-white py-20 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-text-primary mb-4">
          Terms of Service
        </h1>
        <p className="text-text-secondary mb-8 text-sm">
          Last updated: March 2026
        </p>
        <div className="prose prose-sm text-text-body space-y-6">
          <p>
            Policy Canary provides regulatory intelligence reports based on
            publicly available FDA data. Our service is informational only and
            does not constitute legal or regulatory compliance advice.
          </p>
          <p>
            By using Policy Canary, you agree to use the information provided
            as a starting point for your own compliance review — not as a
            substitute for qualified regulatory counsel.
          </p>
          <p>
            Paid subscriptions are billed monthly. You may cancel at any time.
            Refunds for unused portions of a billing period are not provided.
          </p>
          <p>
            We reserve the right to terminate accounts that misuse the service,
            resell access, or use our data for automated scraping.
          </p>
          <p className="text-text-secondary text-xs">
            This is a summary. Full terms of service will be published before
            paid plans launch.
          </p>
        </div>
      </div>
    </section>
  );
}
