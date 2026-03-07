import type { Metadata } from "next";
import SampleWalkthrough from "@/components/marketing/SampleWalkthrough";
import { SignupForm } from "@/components/marketing/SignupForm";
import { RevealSection } from "@/components/marketing/RevealSection";

export const metadata: Metadata = {
  title: "Sample Product Intelligence Briefing — Policy Canary",
  description:
    "See what a Product Intelligence Briefing looks like — personalized to your specific products, with analysis and action items already written.",
};

export default function SamplePage() {
  return (
    <>
      {/* Intro */}
      <section className="bg-white py-20 px-6 text-center border-b border-border">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber mb-3">
            Sample Briefing
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
            This is what lands in your&nbsp;inbox.
          </h1>
          <p className="text-text-secondary text-lg">
            A Product Intelligence Briefing — showing what a subscriber
            monitoring 3 products would receive. Every FDA action reviewed,
            matched against their specific ingredients, with analysis and
            action items already written.
          </p>
          <p className="text-xs text-text-tertiary mt-4">
            Illustrative sample. Company names and specific details are fictional.
            Real briefings are personalized to your products.
          </p>
        </div>
      </section>

      {/* Walkthrough */}
      <section className="bg-surface-muted py-20 px-6">
        <SampleWalkthrough />
      </section>

      {/* The alternative — contrast section */}
      <RevealSection>
        <section className="bg-white py-16 px-6 border-t border-border">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text-secondary mb-6">
              The alternative
            </p>

            <div className="bg-surface-subtle border border-border rounded-lg p-6 opacity-80">
              <p className="text-sm text-text-body leading-relaxed mb-2">
                <span className="font-semibold text-text-primary">
                  FDA Updates Identity Testing Requirements for Marine-Sourced
                  Supplements
                </span>{" "}
                <span className="text-text-secondary">— Oct 14, 2025</span>
              </p>
              <p className="text-sm text-text-body leading-relaxed mb-4">
                <span className="font-semibold text-text-primary">
                  FDA Proposes Revoking GRAS Status of BHA in Food Products
                </span>{" "}
                <span className="text-text-secondary">— Feb 28, 2026</span>
              </p>
              <p className="text-xs text-text-tertiary italic">
                No product match. No action items. No deadlines. No analysis.
                Just headlines.
              </p>
            </div>

            <p className="text-sm text-text-secondary mt-6 max-w-lg mx-auto">
              Same two regulatory actions. The difference is the mapping — which
              of your products are affected, what to do, and by when.
            </p>
          </div>
        </section>
      </RevealSection>

      {/* CTA */}
      <section className="bg-surface-dark py-24 px-6">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Add your products.
            <br />
            Get this in your inbox.
          </h2>
          <p className="text-slate-300 mb-8">
            Add your products. We review every FDA action against your specific
            ingredients and deliver the analysis — so you don&apos;t have to.
          </p>
          <div className="flex justify-center">
            <SignupForm />
          </div>
        </div>
      </section>
    </>
  );
}
