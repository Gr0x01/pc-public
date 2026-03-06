import type { Metadata } from "next";
import Hero from "@/components/marketing/Hero";
import FeatureComparison from "@/components/marketing/FeatureComparison";
import ProductShowcase from "@/components/marketing/ProductShowcase";
import BuyerRoleCard from "@/components/marketing/BuyerRoleCard";
import { RevealSection } from "@/components/marketing/RevealSection";
import WeeklyIntelligence from "@/components/marketing/WeeklyIntelligence";
import NewsletterCapture from "@/components/marketing/NewsletterCapture";
import PilotSignup from "@/components/marketing/PilotSignup";
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

      {/* Newsletter Capture — free weekly, no auth */}
      <NewsletterCapture />

      {/* Who It's For — handles its own staggered reveal */}
      <BuyerRoleCard />

      {/* Pilot Signup — full-bleed dark, merged stats + form */}
      <PilotSignup />
    </>
  );
}
