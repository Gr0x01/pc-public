import type { Metadata } from "next";
import Hero from "@/components/marketing/Hero";
import FeatureComparison from "@/components/marketing/FeatureComparison";
import ProductShowcase from "@/components/marketing/ProductShowcase";
import BuyerRoleCard from "@/components/marketing/BuyerRoleCard";
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

      {/* Stats — dark gradient background */}
      <RevealSection>
        <section
          className="py-24 px-6"
          style={{ background: "var(--gradient-dark-surface)" }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                The FDA is shrinking.
                <br />
                Enforcement is not.
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto">
                3,859 FDA staff positions cut since January 2025. Warning letter
                volume is unchanged. The risk didn&apos;t shrink — your visibility
                into it did.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
              <div className="text-center border-t border-white/10 pt-8">
                <p className="text-5xl md:text-7xl font-bold text-white mb-2">
                  <StatCounter end={3859} />
                </p>
                <p className="font-mono text-xs text-slate-400 uppercase tracking-widest mb-2">
                  FDA positions cut
                </p>
                <p className="text-xs text-slate-500">
                  Since Jan 2025 — DOGE workforce reductions.
                </p>
              </div>
              <div className="text-center border-t border-white/10 pt-8">
                <p className="text-5xl md:text-7xl font-bold text-white mb-2">
                  <StatCounter end={1200} suffix="+" />
                </p>
                <p className="font-mono text-xs text-slate-400 uppercase tracking-widest mb-2">
                  Warning letters / year
                </p>
                <p className="text-xs text-slate-500">
                  Each one names specific products, violations, and deadlines.
                </p>
              </div>
              <div className="text-center border-t border-white/10 pt-8">
                <p className="text-5xl md:text-7xl font-bold text-white mb-2">
                  <StatCounter end={72} suffix=" hrs" />
                </p>
                <p className="font-mono text-xs text-slate-400 uppercase tracking-widest mb-2">
                  To respond
                </p>
                <p className="text-xs text-slate-500">
                  Late response to a warning letter escalates to import alerts.
                </p>
              </div>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* How It Works */}
      <RevealSection delay={0.1}>
        <section className="bg-surface-muted py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
                How it works
              </h2>
              <p className="text-text-secondary max-w-xl mx-auto">
                Three steps from FDA action to your inbox — all automated.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  title: "Monitor",
                  body: "We watch Federal Register documents, FDA warning letters, openFDA enforcement actions, and RSS feeds — continuously.",
                  tags: ["FDA Warning Letters", "Federal Register", "openFDA", "RSS Feeds"],
                  stat: null,
                },
                {
                  step: "02",
                  title: "Analyze",
                  body: "We match each action against your products by name and ingredient. Only relevant changes trigger a full analysis.",
                  tags: null,
                  stat: "32 products checked · 3 affected",
                },
                {
                  step: "03",
                  title: "Alert",
                  body: "You get a product-specific email with what happened, which products are affected, and exactly what to do.",
                  tags: null,
                  stat: "< 24 hrs from FDA publish to your inbox",
                },
              ].map(({ step, title, body, tags, stat }) => (
                <div
                  key={step}
                  className="bg-white rounded border border-border p-6 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="font-mono text-xs font-bold text-amber bg-amber-muted rounded px-2 py-0.5">
                      {step}
                    </span>
                    <h3 className="text-lg font-bold text-text-primary">
                      {title}
                    </h3>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed mb-4">
                    {body}
                  </p>
                  {tags && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="font-mono text-[10px] text-text-secondary bg-surface-subtle border border-border rounded px-1.5 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {stat && (
                    <p className="font-mono text-xs text-text-secondary">
                      {stat}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* Who It's For */}
      <RevealSection delay={0.05}>
        <BuyerRoleCard />
      </RevealSection>

      {/* Social Proof — dark gradient */}
      <RevealSection>
        <section
          className="py-20 px-6"
          style={{
            background:
              "radial-gradient(ellipse at 80% 20%, rgba(234,193,0,0.07) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(217,119,6,0.09) 0%, transparent 55%), #0F172A",
          }}
        >
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-2xl md:text-3xl font-semibold text-white mb-4 leading-snug">
              &ldquo;Finally — something that tells me what to do, not just what
              happened.&rdquo;
            </p>
            <p className="text-slate-400 text-sm mb-12">
              — QA Director, dietary supplement brand &middot; 47 products
              monitored
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-white/10 pt-10">
              {[
                { value: "50+", label: "Brands in beta" },
                { value: "4", label: "FDA data sources monitored" },
                {
                  value: "<24 hrs",
                  label: "FDA pub \u2192 subscriber email",
                },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-bold text-white mb-1">{value}</p>
                  <p className="text-xs font-mono text-slate-400 uppercase tracking-wide">
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
