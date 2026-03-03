import type { Metadata } from "next";
import SampleReport from "@/components/marketing/SampleReport";
import { SignupForm } from "@/components/marketing/SignupForm";
import { RevealSection } from "@/components/marketing/RevealSection";

export const metadata: Metadata = {
  title: "Sample Intelligence Report — Policy Canary",
  description:
    "See what a product-specific intelligence report looks like for Marine Collagen Powder.",
};

export default function SamplePage() {
  return (
    <>
      {/* Intro */}
      <section className="bg-white py-20 px-6 text-center border-b border-border">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber mb-3">
            Sample Report
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
            This is what lands in your inbox.
          </h1>
          <p className="text-text-secondary text-lg">
            This report is generated for a subscriber who monitors{" "}
            <strong className="text-text-primary">Marine Collagen Powder</strong>.
            When the FDA takes action affecting that ingredient, they get this —
            not a generic headline.
          </p>
        </div>
      </section>

      {/* Report */}
      <RevealSection>
        <section className="bg-surface-muted py-20 px-6">
          <SampleReport />
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
            Free weekly digest to start. When you add your products, we match
            every FDA action against your specific ingredients.
          </p>
          <div className="flex justify-center">
            <SignupForm />
          </div>
        </div>
      </section>
    </>
  );
}
