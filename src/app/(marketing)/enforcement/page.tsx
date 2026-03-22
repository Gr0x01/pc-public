import type { Metadata } from "next";
import { getPublishedPages } from "@/lib/intelligence/queries";
import { IntelPageCard } from "@/components/intelligence/IntelPageCard";
import ContentCTA from "@/components/marketing/ContentCTA";

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
      <ContentCTA
        heading="Know about enforcement actions before your competitors"
        description="Policy Canary surfaces FDA enforcement actions relevant to your category \u2014 with analysis, not just headlines. Start your free trial."
      />
    </div>
  );
}
