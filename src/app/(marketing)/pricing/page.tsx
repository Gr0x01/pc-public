import type { Metadata } from "next";
import PricingTable from "@/components/marketing/PricingTable";
import { SignupForm } from "@/components/marketing/SignupForm";
import { RevealSection } from "@/components/marketing/RevealSection";

export const metadata: Metadata = {
  title: "Pricing — Policy Canary",
  description:
    "Monitor $49/mo. Monitor+Research $249/mo. 5 products included. +$6/mo per additional product.",
};

const faqs = [
  {
    q: "How does per-product billing work?",
    a: "Each plan includes 5 products. If you have more, each additional product is $6/mo. You control exactly which products are monitored — add or remove anytime.",
  },
  {
    q: "What counts as a product?",
    a: "Any specific SKU you sell — a supplement formula, food product, or cosmetic item. Variants (size, flavor) of the same formula count as one product.",
  },
  {
    q: "Can I change plans?",
    a: "Yes. Upgrade or downgrade at any time. Changes take effect at your next billing date. No lock-in, no annual contracts at launch.",
  },
  {
    q: "Is annual billing available?",
    a: "Monthly billing only at launch. Annual billing — with a meaningful discount — will be added once we have retention data to price it fairly.",
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-white py-20 px-6 text-center border-b border-border">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
            Simple, transparent pricing.
          </h1>
          <p className="text-text-secondary text-lg">
            Start free. Upgrade when you need product intelligence.
            <br />
            No hidden fees, no annual lock-in.
          </p>
        </div>
      </section>

      {/* Pricing table */}
      <RevealSection>
        <PricingTable />
      </RevealSection>

      {/* FAQ */}
      <RevealSection delay={0.05}>
        <section className="bg-white py-24 px-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-text-primary mb-10 text-center">
              Frequently asked
            </h2>
            <div className="space-y-8">
              {faqs.map(({ q, a }) => (
                <div key={q}>
                  <h3 className="font-semibold text-text-primary mb-2">{q}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* Signup CTA */}
      <section className="bg-surface-dark py-20 px-6">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber mb-4">
            Paid plans launching soon
          </p>
          <h2 className="text-3xl font-bold text-white mb-4">
            Add your email for early access.
          </h2>
          <p className="text-slate-300 mb-8">
            Free weekly digest starts immediately. Product intelligence when
            paid plans go live.
          </p>
          <div className="flex justify-center">
            <SignupForm />
          </div>
        </div>
      </section>
    </>
  );
}
