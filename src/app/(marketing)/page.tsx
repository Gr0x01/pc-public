import type { Metadata } from "next";
import Hero from "@/components/marketing/Hero";
import FeatureComparison from "@/components/marketing/FeatureComparison";
import ProductShowcase from "@/components/marketing/ProductShowcase";
import BuyerRoleCard from "@/components/marketing/BuyerRoleCard";
import HowItWorksSection from "@/components/marketing/HowItWorksSection";
import { RevealSection } from "@/components/marketing/RevealSection";
import { SignupForm } from "@/components/marketing/SignupForm";
import { StatCounter } from "@/components/marketing/StatCounter";

export const metadata: Metadata = {
  title: "Policy Canary — FDA Regulatory Intelligence for Your Products",
  description:
    "Product-level FDA monitoring. Know which of your products are affected — by name and ingredient — before the warning letter arrives.",
};

export default function LandingPage() {
  return (
    <>
      {/* Hero — full width, no reveal wrapper */}
      <Hero />

      {/* Feature Comparison — moved up to 2nd position */}
      <RevealSection delay={0.05}>
        <FeatureComparison />
      </RevealSection>

      {/* Product Dashboard Showcase */}
      <RevealSection>
        <ProductShowcase />
      </RevealSection>

      {/* Stats — light background */}
      <RevealSection>
        <section className="bg-white py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
                The FDA is shrinking.
                <br />
                Enforcement is not.
              </h2>
              <p className="text-text-secondary max-w-xl mx-auto">
                3,859 FDA staff positions cut since January 2025. Warning letter
                volume is unchanged. The risk didn&apos;t shrink — your visibility
                into it did.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
              <div className="text-center border-t border-border pt-8">
                <p className="text-5xl md:text-7xl font-bold text-text-primary mb-2">
                  <StatCounter end={3859} />
                </p>
                <p className="font-mono text-xs text-text-secondary uppercase tracking-widest mb-2">
                  FDA positions cut
                </p>
                <p className="text-xs text-text-secondary">
                  Since Jan 2025 — DOGE workforce reductions.
                </p>
              </div>
              <div className="text-center border-t border-border pt-8">
                <p className="text-5xl md:text-7xl font-bold text-text-primary mb-2">
                  <StatCounter end={1200} suffix="+" />
                </p>
                <p className="font-mono text-xs text-text-secondary uppercase tracking-widest mb-2">
                  Warning letters / year
                </p>
                <p className="text-xs text-text-secondary">
                  Each one names specific products, violations, and deadlines.
                </p>
              </div>
              <div className="text-center border-t border-border pt-8">
                <p className="text-5xl md:text-7xl font-bold text-text-primary mb-2">
                  <StatCounter end={72} suffix=" hrs" />
                </p>
                <p className="font-mono text-xs text-text-secondary uppercase tracking-widest mb-2">
                  To respond
                </p>
                <p className="text-xs text-text-secondary">
                  Late response to a warning letter escalates to import alerts.
                </p>
              </div>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* How It Works */}
      <HowItWorksSection />

      {/* Who It's For */}
      <RevealSection delay={0.05}>
        <BuyerRoleCard />
      </RevealSection>

      {/* Social Proof — light background */}
      <RevealSection>
        <section className="bg-surface-muted py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-2xl md:text-3xl font-semibold text-text-primary mb-4 leading-snug">
              &ldquo;Finally — something that tells me what to do, not just what
              happened.&rdquo;
            </p>
            <p className="text-text-secondary text-sm mb-12">
              — QA Director, dietary supplement brand &middot; 47 products
              monitored
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-border pt-10">
              {[
                { value: "50+", label: "Brands in beta" },
                { value: "4", label: "FDA data sources monitored" },
                {
                  value: "<24 hrs",
                  label: "FDA pub \u2192 subscriber email",
                },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-bold text-text-primary mb-1">{value}</p>
                  <p className="text-xs font-mono text-text-secondary uppercase tracking-wide">
                    {label}
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
        className="py-24 px-6"
        style={{ background: "var(--gradient-dark-surface)" }}
      >
        <div className="max-w-xl mx-auto text-center">
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
              <p className="text-2xl font-bold text-amber">$49 / month</p>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wide mt-0.5">
                Policy Canary Monitor
              </p>
            </div>
          </div>
          <p className="text-slate-400 mb-8">
            Product-level intelligence for supplement, food, and cosmetics
            brands.
            <br />
            Start free — upgrade when you add your products.
          </p>
          <div className="flex justify-center">
            <SignupForm dark={true} />
          </div>
        </div>
      </section>
    </>
  );
}
