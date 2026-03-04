import type { Metadata } from "next";
import PricingHero from "@/components/marketing/PricingHero";
import PricingFeatures from "@/components/marketing/PricingFeatures";
import { RevealSection } from "@/components/marketing/RevealSection";
import { SignupForm } from "@/components/marketing/SignupForm";

export const metadata: Metadata = {
  title: "Pricing — Policy Canary",
  description:
    "Monitor your products against every FDA change. $99/mo for 5 products included, $10/mo per additional product. 14-day free trial.",
};

const faqs = [
  {
    q: "How does per-product pricing work?",
    a: "Monitor includes 5 products at $99/mo. Each additional product is $10/mo. Add or remove products anytime from your dashboard.",
  },
  {
    q: "What counts as a product?",
    a: "Any specific SKU you sell \u2014 a supplement formula, food product, cosmetic item, OTC drug, medical device, etc. Variants of the same formula (size, flavor) count as one product.",
  },
  {
    q: "What happens after the 14-day trial?",
    a: "Subscribe for full access. Or keep 1 product monitored free with weekly digest emails. No data is deleted.",
  },
  {
    q: "What if I need more than 100 products?",
    a: "Contact us. We\u2019ll set up portfolio monitoring with custom pricing and dedicated support.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No annual contracts, no cancellation fees. Manage everything from your billing dashboard.",
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero + Calculator — warm gradient, glass-morph card */}
      <PricingHero />

      {/* What You Get — bento grid with amber gradient cards */}
      <PricingFeatures />

      {/* FAQ */}
      <RevealSection>
        <section
          id="faq"
          className="py-20 px-6 bg-slate-50 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent pointer-events-none" />
          <div className="max-w-4xl mx-auto soft-card p-10 md:p-14 relative z-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <p className="font-mono text-[11px] text-amber-text uppercase tracking-widest mb-6 font-semibold">
              FAQ
            </p>
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-slate-900 mb-10 leading-tight">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {faqs.map(({ q, a }) => (
                <div
                  key={q}
                  className="p-6 bg-white rounded-xl border border-slate-100 shadow-sm"
                >
                  <h3 className="font-semibold text-slate-900 mb-3 text-lg">
                    {q}
                  </h3>
                  <p className="text-slate-500 leading-relaxed text-sm">
                    {a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* Signup CTA — dark gradient with cost math */}
      <section
        id="signup"
        className="py-24 px-6 bg-white"
      >
        <div
          className="max-w-4xl mx-auto text-center rounded-xl px-6 py-12 md:p-14 border border-white/10"
          style={{ background: "var(--gradient-dark-surface)" }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Know before the warning letter.
          </h2>
          {/* Cost comparison */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-400 line-through decoration-slate-500">
                $25K–$100K+
              </p>
              <p className="text-xs font-mono text-slate-500 uppercase tracking-wide mt-0.5">
                One warning letter
              </p>
            </div>
            <span className="text-slate-600 text-xl">vs</span>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber">$99 / month</p>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wide mt-0.5">
                Policy Canary Monitor
              </p>
            </div>
          </div>
          <p className="text-slate-400 mb-8">
            Your Marine Collagen Powder. Your BHA Eye Cream. Monitored.
            <br />
            Intelligence delivered to your inbox — start free.
          </p>
          <div className="flex justify-center">
            <SignupForm dark={true} />
          </div>
        </div>
      </section>
    </>
  );
}
