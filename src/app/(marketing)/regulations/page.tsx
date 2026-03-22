import type { Metadata } from "next";
import { getPublishedPages } from "@/lib/intelligence/queries";
import { IntelPageCard } from "@/components/intelligence/IntelPageCard";
import ContentCTA from "@/components/marketing/ContentCTA";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "FDA Regulation Intelligence | Policy Canary",
  description:
    "Plain-language analysis of FDA regulations — what changed, who is affected, and what companies need to do next.",
};

export default async function RegulationsPage() {
  const pages = await getPublishedPages("regulation");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-12">
        <h1 className="font-serif text-4xl font-bold text-text-primary mb-3">
          Regulation Intelligence
        </h1>
        <p className="text-lg text-text-secondary max-w-2xl">
          Plain-language analysis of FDA regulations — what changed, who is
          affected, and what companies need to do next.
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
            Regulation intelligence pages coming soon. Check back shortly.
          </p>
        )}
      </section>

      {/* CTA */}
      <ContentCTA
        heading="Stop reading the Federal Register \u2014 let us do it"
        description="Policy Canary tracks regulations that affect your product categories and tells you exactly what to do. Start your free trial."
      />
    </div>
  );
}
