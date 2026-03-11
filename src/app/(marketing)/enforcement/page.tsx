import type { Metadata } from "next";
import { getPublishedPages } from "@/lib/intelligence/queries";
import { IntelPageCard } from "@/components/intelligence/IntelPageCard";
import { SignupForm } from "@/components/marketing/SignupForm";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "FDA Enforcement Intelligence | Policy Canary",
  description:
    "Warning letter analysis, recall tracking, and enforcement action summaries for FDA-regulated companies.",
};

export default async function EnforcementPage() {
  const pages = await getPublishedPages("enforcement");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-12">
        <h1 className="font-serif text-4xl font-bold text-text-primary mb-3">
          Enforcement Intelligence
        </h1>
        <p className="text-lg text-text-secondary max-w-2xl">
          Warning letter analysis, recall tracking, and enforcement history for
          FDA-regulated companies — with business impact context.
        </p>
      </section>

      {/* Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        {pages.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 3col:grid-cols-3">
            {pages.map((page) => (
              <IntelPageCard key={page.id} page={page} />
            ))}
          </div>
        ) : (
          <p className="text-text-secondary text-center py-16">
            Enforcement intelligence pages coming soon. Check back shortly.
          </p>
        )}
      </section>

      {/* CTA */}
      <section className="bg-surface-dark py-16">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            Know about enforcement actions before your competitors
          </h2>
          <p className="text-slate-300 mb-6">
            Policy Canary surfaces FDA enforcement actions relevant to your
            category — with analysis, not just headlines.
            Join the&nbsp;pilot.
          </p>
          <div className="flex justify-center">
            <SignupForm dark={true} />
          </div>
        </div>
      </section>
    </div>
  );
}
