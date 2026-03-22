import type { Metadata } from "next";
import { getPublishedPages } from "@/lib/intelligence/queries";
import { IntelPageCard } from "@/components/intelligence/IntelPageCard";
import ContentCTA from "@/components/marketing/ContentCTA";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "FDA Ingredient Intelligence | Policy Canary",
  description:
    "Regulatory intelligence on FDA-monitored ingredients — bans, restrictions, state actions, and what they mean for your products.",
};

export default async function IngredientsPage() {
  const pages = await getPublishedPages("ingredient");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-12">
        <h1 className="font-serif text-4xl font-bold text-text-primary mb-3">
          Ingredient Intelligence
        </h1>
        <p className="text-lg text-text-secondary max-w-2xl">
          Regulatory status, enforcement history, and business impact analysis
          for FDA-monitored ingredients — updated as new actions are published.
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
            Ingredient intelligence pages coming soon. Check back shortly.
          </p>
        )}
      </section>

      {/* CTA */}
      <ContentCTA
        heading="Get alerts when ingredient regulations change"
        description="Policy Canary monitors FDA actions for your specific ingredients and products. Start your free trial."
      />
    </div>
  );
}
