import type { Metadata } from "next";
import Hero from "@/components/marketing/Hero";
import FeatureComparison from "@/components/marketing/FeatureComparison";
import ProductShowcase from "@/components/marketing/ProductShowcase";
import BuyerRoleCard from "@/components/marketing/BuyerRoleCard";
import { RevealSection } from "@/components/marketing/RevealSection";
import { SignupForm } from "@/components/marketing/SignupForm";
import DayAtFda from "@/components/marketing/DayAtFda";

export const metadata: Metadata = {
  title: "Policy Canary — FDA Regulatory Intelligence for Your Products",
  description:
    "Product-level FDA monitoring. Know which of your products are affected — by name and ingredient — before the warning letter arrives.",
};

export default function LandingPage() {
  return (
    <>
      {/* Hero — full width, handles its own animations */}
      <Hero />

      {/* Feature Comparison — handles its own staggered reveal */}
      <FeatureComparison />

      {/* Dashboard — depth layer, email is primary */}
      <RevealSection>
        <ProductShowcase />
      </RevealSection>

      {/* A Day at the FDA — noise vs signal story */}
      <DayAtFda />

      {/* Who It's For — handles its own staggered reveal */}
      <BuyerRoleCard />

      {/* Social Proof */}
      <RevealSection>
        <section className="py-20 px-6 bg-slate-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent pointer-events-none" />
          <div className="max-w-4xl mx-auto text-center soft-card p-10 md:p-14 relative z-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <p className="font-mono text-[11px] text-amber-text uppercase tracking-widest mb-6 font-semibold">
              EARLY ACCESS
            </p>
            <p className="text-2xl md:text-4xl font-semibold tracking-tight text-slate-900 mb-6 leading-tight">
              &ldquo;Finally — something that tells me what to do, not just what
              happened.&rdquo;
            </p>
            <p className="text-slate-500 text-[15px] mb-12">
              — QA Director, dietary supplement brand &middot; 47 products
              monitored
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-slate-100 pt-10">
              {[
                { value: "4", label: "FDA data sources monitored" },
                {
                  value: "<24 hrs",
                  label: "FDA pub \u2192 subscriber email",
                },
                { value: "169K", label: "FDA substances indexed" },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="text-3xl font-bold text-slate-900 mb-2">{value}</p>
                  <p className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">
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
