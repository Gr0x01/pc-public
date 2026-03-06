import type { Metadata } from "next";
import Hero from "@/components/marketing/Hero";
import FeatureComparison from "@/components/marketing/FeatureComparison";
import ProductShowcase from "@/components/marketing/ProductShowcase";
import BuyerRoleCard from "@/components/marketing/BuyerRoleCard";
import { RevealSection } from "@/components/marketing/RevealSection";
import { SignupForm } from "@/components/marketing/SignupForm";
import WeeklyIntelligence from "@/components/marketing/WeeklyIntelligence";
import { getLatestSnapshot } from "@/lib/intelligence/weekly-snapshot";

export const metadata: Metadata = {
  title: "Policy Canary — FDA Regulatory Intelligence for Your Products",
  description:
    "Product-level FDA monitoring. Know which of your products are affected — by name and ingredient — before the warning letter arrives.",
};

// Revalidate every 4 hours — snapshot updates weekly on Fridays
export const revalidate = 14400;

export default async function LandingPage() {
  const snapshot = await getLatestSnapshot();

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

      {/* Weekly Intelligence — live data from the FDA */}
      {snapshot && (
        <WeeklyIntelligence
          weekStart={snapshot.week_start}
          weekEnd={snapshot.week_end}
          narrative={snapshot.narrative}
          sectorCounts={snapshot.sector_counts}
          totalItems={snapshot.total_items}
          totalSectors={snapshot.total_sectors}
          totalSubstancesFlagged={snapshot.total_substances_flagged}
          totalDeadlines={snapshot.total_deadlines}
          showcaseItems={snapshot.showcase_items}
        />
      )}

      {/* Who It's For — handles its own staggered reveal */}
      <BuyerRoleCard />

      {/* Social Proof */}
      <RevealSection>
        <section className="py-20 px-6 bg-slate-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent pointer-events-none" />
          <div className="max-w-4xl mx-auto text-center soft-card p-10 md:p-14 relative z-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <p className="font-mono text-[11px] text-amber-text uppercase tracking-widest mb-6 font-semibold">
              PILOT PROGRAM
            </p>
            <p className="text-xl md:text-2xl font-medium tracking-tight text-slate-900 mb-6 leading-relaxed max-w-2xl mx-auto">
              Product-level FDA monitoring for food, supplement, and cosmetic
              brands. Your products matched against every regulatory change — by
              name and ingredient.
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

      {/* Signup CTA — dark gradient, pilot framing */}
      <section
        id="signup"
        className="py-24 px-6 bg-white"
      >
        <div
          className="max-w-4xl mx-auto text-center rounded-xl px-6 py-12 md:p-14 border border-white/10"
          style={{ background: "var(--gradient-dark-surface)" }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Don&apos;t find out from a recall notice.
          </h2>
          <p className="text-slate-400 mb-3 max-w-xl mx-auto">
            We&apos;re onboarding a small group of brands for early access to
            product-level FDA monitoring.
          </p>
          <p className="text-slate-500 mb-8 text-sm">
            Your Marine Collagen Powder. Your BHA Eye Cream. Monitored by name,
            matched by ingredient.
          </p>
          <div className="flex justify-center">
            <SignupForm dark={true} />
          </div>
        </div>
      </section>
    </>
  );
}
