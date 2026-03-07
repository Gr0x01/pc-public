export default function SampleReport() {
  return (
    <div className="max-w-[600px] mx-auto">
      {/* Email container */}
      <div className="bg-white rounded-lg border border-border shadow-[0_2px_12px_rgba(0,0,0,0.10)] overflow-hidden relative">
        {/* Canary top rule */}
        <div className="h-[3px] bg-canary" />

        {/* Header */}
        <div data-section="header" className="px-10 pt-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-dark.png" width={110} height={10} alt="Policy Canary" />
          <p className="text-[13px] text-text-secondary mt-1">
            Product Intelligence Briefing — March 7, 2026
          </p>
        </div>

        {/* BLUF */}
        <div data-section="bluf" className="px-10 py-6">
          <p className="text-lg font-semibold text-text-primary leading-snug">
            2 of your 3 products are affected this week.
          </p>
          <p className="text-base text-text-body leading-relaxed mt-3">
            A warning letter targeting marine collagen identity testing and a proposed BHA ban
            both affect products in your portfolio. Action items and deadlines below.
          </p>
        </div>

        {/* ZONE 1: YOUR PRODUCTS */}
        <div className="px-10">
          <p className="text-[11px] font-bold tracking-[1.5px] text-text-secondary mb-4">
            YOUR PRODUCTS
          </p>

          {/* Product 1: Marine Collagen Powder */}
          <div data-section="product-1" className="mb-6">
            <h3 className="font-serif text-[22px] font-bold text-text-primary leading-snug mb-4">
              Marine Collagen Powder
            </h3>

            <div className="mb-3">
              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 mr-1.5">
                Urgent
              </span>
              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-text-secondary">
                Sample Warning Letter
              </span>
            </div>

            <p className="text-base text-text-body leading-relaxed mb-3">
              Coastal Nutrition Co. received a warning letter for identity-testing failures
              on marine-sourced collagen. The FDA cited that COA-only documentation was
              insufficient — ingredient-specific identity tests are required. Your
              product contains marine collagen as a primary ingredient and is directly
              affected by this enforcement precedent.
            </p>

            {/* Action items */}
            <div data-section="actions-1" className="bg-slate-50 border-l-4 border-amber pl-5 pr-5 py-4 mb-3">
              <p className="text-[11px] font-bold tracking-[1.5px] text-text-secondary mb-2">
                ITEMS TO CONSIDER
              </p>
              <p className="text-[15px] text-text-body leading-relaxed mb-1.5">
                1. Audit your identity testing protocols for marine collagen against
                21 CFR 111.75(a)(1)(ii)
              </p>
              <p className="text-[15px] text-text-body leading-relaxed mb-1.5">
                2. Verify COA documentation includes marine collagen-specific identity
                tests, not just generic protein analysis
              </p>
              <p className="text-[15px] text-text-body leading-relaxed mb-1.5">
                3. Confirm with your contract manufacturer that identity tests are
                performed per batch, not per lot
              </p>
              <p className="text-[15px] font-bold text-amber mt-2">
                Deadline: June 30, 2026
              </p>
            </div>

            <p className="font-mono text-[13px] text-text-secondary">
              <span>21 CFR 111.75(a)(1)(ii)</span>{" "}
              <a href="#" className="underline">View source document →</a>
            </p>

            <p className="text-xs text-text-tertiary italic mt-2">
              AI-generated analysis. Verify with source documents.
            </p>
          </div>

          {/* Divider between products */}
          <hr className="border-t border-border my-8 mx-0" />

          {/* Product 2: Daily Greens Superfood Blend */}
          <div data-section="product-2" className="mb-6">
            <h3 className="font-serif text-[22px] font-bold text-text-primary leading-snug mb-4">
              Daily Greens Superfood Blend
            </h3>

            <div className="mb-3">
              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber mr-1.5">
                Watch
              </span>
              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-text-secondary">
                Comment closes May 15, 2026
              </span>
            </div>

            <p className="text-base text-text-body leading-relaxed mb-3">
              FDA proposed revoking the GRAS status of butylated hydroxyanisole (BHA)
              in food products. Your Daily Greens blend lists BHA as a preservative.
              If finalized, products containing BHA must reformulate or be removed from
              market. Comment period open.
            </p>

            {/* Action items */}
            <div className="bg-slate-50 border-l-4 border-amber pl-5 pr-5 py-4 mb-3">
              <p className="text-[11px] font-bold tracking-[1.5px] text-text-secondary mb-2">
                ITEMS TO CONSIDER
              </p>
              <p className="text-[15px] text-text-body leading-relaxed mb-1.5">
                1. Evaluate alternative preservative systems for your blend
                (tocopherols, rosemary extract)
              </p>
              <p className="text-[15px] text-text-body leading-relaxed mb-1.5">
                2. Submit public comment if this rule would impact your business
                — comment period closes May 15, 2026
              </p>
              <p className="text-[15px] text-text-body leading-relaxed">
                3. Begin reformulation planning — if finalized, compliance deadline
                is expected 18-24 months from final rule
              </p>
              <p className="text-[15px] font-bold text-amber mt-2">
                Deadline: May 15, 2026 (comment period)
              </p>
            </div>

            <p className="font-mono text-[13px] text-text-secondary">
              <span>21 CFR 172.110</span>{" "}
              <a href="#" className="underline">View source document →</a>
            </p>

            <p className="text-xs text-text-tertiary italic mt-2">
              AI-generated analysis. Verify with source documents.
            </p>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-t border-border my-8 mx-10" />

        {/* ZONE 2: YOUR INDUSTRY */}
        <div data-section="industry">
          <p className="text-[11px] font-bold tracking-[1.5px] text-text-secondary px-10 mb-4">
            YOUR INDUSTRY
          </p>

          <div className="px-10 pb-4">
            <p className="text-base font-semibold text-text-primary leading-snug mb-1">
              FDA Announces Increased CGMP Inspection Frequency for Dietary Supplements
            </p>
            <p className="text-[15px] text-text-body leading-relaxed mb-1">
              CFSAN announced a 40% increase in supplement manufacturing inspections
              for FY2026, focusing on identity testing and contamination controls...
            </p>
            <p className="font-mono text-[13px]">
              <a href="#" className="text-text-secondary underline">Source →</a>
            </p>
          </div>

          <div className="px-10 pb-4">
            <p className="text-base font-semibold text-text-primary leading-snug mb-1">
              MoCRA Biennial Registration Renewal Deadline Approaching — July 2026
            </p>
            <p className="text-[15px] text-text-body leading-relaxed mb-1">
              Cosmetic facility registrations must be renewed by July 1, 2026. FDA
              has begun sending reminder notices to registered facilities...
            </p>
            <p className="font-mono text-[13px]">
              <a href="#" className="text-text-secondary underline">Source →</a>
            </p>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-t border-border my-8 mx-10" />

        {/* ZONE 3: ACROSS FDA */}
        <div data-section="across-fda">
          <p className="text-[11px] font-bold tracking-[1.5px] text-text-secondary px-10 mb-4">
            ACROSS FDA THIS WEEK
          </p>

          <p className="text-sm text-text-body px-10 mb-3">
            FDA approves new food contact substance notification for recycled PET packaging{" "}
            <a href="#" className="text-text-secondary underline">Source →</a>
          </p>
          <p className="text-sm text-text-body px-10 mb-3">
            CDER issues draft guidance on biosimilar product labeling requirements{" "}
            <a href="#" className="text-text-secondary underline">Source →</a>
          </p>
          <p className="text-sm text-text-body px-10 mb-3">
            CTP proposes restrictions on characterizing flavors in tobacco products{" "}
            <a href="#" className="text-text-secondary underline">Source →</a>
          </p>
          <p className="text-sm text-text-body px-10 mb-3">
            CDRH recalls Class II infusion pump over software dosing error{" "}
            <a href="#" className="text-text-secondary underline">Source →</a>
          </p>
        </div>

        {/* Web app CTA */}
        <div className="text-center py-4">
          <a href="#" className="text-sm text-amber underline">
            View full regulatory feed in the web app →
          </a>
        </div>

        {/* Footer */}
        <hr className="border-t border-border mx-10" />
        <div data-section="footer" className="px-10 py-6">
          <p className="text-xs text-text-tertiary leading-relaxed whitespace-pre-line">
            {"Policy Canary | Product Intelligence Briefing\nAI-generated from public FDA sources. Regulatory intelligence for your review, not legal advice. Verify with source documents and qualified professionals. Policy Canary is not a law firm."}
          </p>
          <p className="text-[13px] text-text-tertiary mt-3">
            <a href="#" className="text-text-tertiary underline">Manage your products</a>
            {" · "}
            <a href="#" className="text-text-tertiary underline">LinkedIn</a>
          </p>
          <p className="text-xs text-text-tertiary mt-2">
            Policy Canary, 9901 Brodie Lane Ste 160 #1323, Austin, TX 78748
          </p>
        </div>
      </div>
    </div>
  );
}
