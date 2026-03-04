import Link from "next/link";
import { Check, Minus } from "lucide-react";
import CheckoutButton from "./CheckoutButton";

const features = [
  { label: "Weekly headline digest", free: true, monitor: true, research: true },
  { label: "Product-specific intelligence", free: false, monitor: true, research: true },
  { label: "Urgent product alerts", free: false, monitor: true, research: true },
  { label: "Products included", free: "—", monitor: "5", research: "5" },
  { label: "Web app access", free: false, monitor: true, research: true },
  { label: "AI search", free: false, monitor: false, research: true },
  { label: "Enforcement database", free: false, monitor: false, research: true },
  { label: "Trend analysis", free: false, monitor: false, research: true },
];

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-sm text-text-secondary">{value}</span>;
  }
  return value ? (
    <Check className="h-4 w-4 text-clear mx-auto" aria-label="Included" />
  ) : (
    <Minus className="h-4 w-4 text-text-secondary mx-auto" aria-label="Not included" />
  );
}

export default function PricingTable() {
  return (
    <section className="bg-surface-muted py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-text-primary text-center mb-4">
          Simple, transparent pricing
        </h2>
        <p className="text-text-secondary text-center mb-12 max-w-xl mx-auto">
          Start free. Add your products and upgrade when you need product
          intelligence.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th scope="col" className="text-left pb-6 pr-4 w-2/5" />
                {/* Free */}
                <th scope="col" className="pb-6 px-4 text-center">
                  <div className="bg-white border border-border rounded-lg p-4">
                    <p className="font-semibold text-text-primary text-sm mb-1">Free</p>
                    <p className="text-2xl font-bold text-text-primary">$0</p>
                    <p className="text-xs text-text-secondary mt-1">/month</p>
                    <Link
                      href="/login"
                      className="mt-3 block bg-surface-subtle border border-border text-text-body text-sm font-semibold px-4 py-2 rounded hover:bg-surface-subtle/80 transition-colors duration-150"
                    >
                      Get Started
                    </Link>
                  </div>
                </th>
                {/* Monitor */}
                <th scope="col" className="pb-6 px-4 text-center">
                  <div className="bg-white border-2 border-amber rounded-lg p-4 relative">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber text-white text-xs font-bold px-3 py-0.5 rounded-full">
                      POPULAR
                    </span>
                    <p className="font-semibold text-text-primary text-sm mb-1">Monitor</p>
                    <p className="text-2xl font-bold text-text-primary">$99</p>
                    <p className="text-xs text-text-secondary mt-1">/month</p>
                    <CheckoutButton />
                  </div>
                </th>
                {/* Monitor+Research */}
                <th scope="col" className="pb-6 px-4 text-center">
                  <div className="bg-white border border-border rounded-lg p-4 relative">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-400 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                      COMING SOON
                    </span>
                    <p className="font-semibold text-text-primary text-sm mb-1">Monitor+Research</p>
                    <p className="text-2xl font-bold text-text-primary">$399</p>
                    <p className="text-xs text-text-secondary mt-1">/month</p>
                    <span className="mt-3 block bg-surface-subtle border border-border text-text-secondary text-sm font-semibold px-4 py-2 rounded cursor-not-allowed opacity-60">
                      Coming Soon
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, i) => (
                <tr
                  key={feature.label}
                  className={i % 2 === 0 ? "bg-white" : "bg-surface-muted"}
                >
                  <td className="py-3 pr-4 text-sm text-text-body">{feature.label}</td>
                  <td className="py-3 px-4 text-center">
                    <FeatureCell value={feature.free} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <FeatureCell value={feature.monitor} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <FeatureCell value={feature.research} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Per-product note */}
        <div className="mt-6 text-center">
          <p className="text-sm text-text-secondary">
            Includes 5 products.{" "}
            <span className="font-medium text-text-body">+$6/mo per additional product.</span>
          </p>
        </div>

        {/* Value anchor */}
        <div className="mt-8 text-center">
          <p className="text-sm text-text-secondary italic">
            $99/mo &lt; 1 hour of a regulatory consultant&apos;s time.
          </p>
        </div>
      </div>
    </section>
  );
}
