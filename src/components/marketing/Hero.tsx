import Link from "next/link";

export default function Hero() {
  return (
    <section
      className="min-h-[85vh] flex flex-col items-center justify-center px-6 text-center"
      style={{
        background:
          "radial-gradient(ellipse at 70% 15%, rgba(217,119,6,0.05) 0%, transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(234,193,0,0.04) 0%, transparent 55%), #FFFFFF",
      }}
    >
      <div className="max-w-4xl mx-auto">
        <h1 className="font-serif text-4xl md:text-6xl font-bold text-text-primary leading-tight">
          The FDA changed something.
          <br />
          Was it about your products?
        </h1>

        <p className="text-lg text-text-secondary max-w-2xl mx-auto mt-6 leading-relaxed">
          Product-level FDA monitoring for supplement, food, and cosmetics
          brands. Know which of your products are affected — by name and
          ingredient — before the warning letter arrives.
        </p>

        {/* CTA row */}
        <div className="flex gap-4 mt-8 flex-wrap justify-center">
          <Link
            href="/#signup"
            className="bg-amber text-white font-semibold px-8 py-3.5 rounded hover:bg-amber/90 transition-colors duration-150"
          >
            Start Free
          </Link>
          <Link
            href="/sample"
            className="border border-border text-text-primary font-semibold px-8 py-3.5 rounded hover:bg-surface-subtle transition-colors duration-150"
          >
            See a Sample Report
          </Link>
        </div>

        {/* Email preview mockup — stacked card approach */}
        <div className="relative max-w-xl mx-auto mt-12">
          {/* Main card */}
          <div
            className="relative z-30 bg-white rounded overflow-hidden text-left"
            style={{
              boxShadow:
                "0 4px 6px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.08), 0 32px 64px rgba(0,0,0,0.16)",
            }}
          >
            {/* Email chrome bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-subtle border-b border-border">
              {/* macOS traffic lights */}
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
              </div>
              <p className="font-mono text-[11px] text-text-secondary truncate ml-2">
                From: Policy Canary &middot; Marine Collagen Powder: FDA Action Required
              </p>
            </div>

            {/* Canary top rule */}
            <div className="h-[3px] bg-canary" />

            <div className="p-4 pb-2">
              <p className="text-xs font-mono text-text-secondary mb-1">
                YOUR PRODUCTS &middot; URGENT
              </p>
              <h3 className="font-serif text-xl font-bold text-text-primary flex items-center gap-2.5">
                <span className="relative inline-flex shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-urgent opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-urgent" />
                </span>
                Marine Collagen Powder
              </h3>
            </div>

            <div className="px-4 pb-3">
              <p className="font-mono text-xs text-text-secondary">
                FDA Warning Letter — Identity Testing &middot; 21 CFR 111.75(a)(1)(ii)
              </p>
            </div>

            <div className="px-4 pb-4">
              <p className="text-sm text-text-body mb-3">
                NovaBiotics failed identity testing for marine collagen. COA-only
                documentation was deemed insufficient by the FDA. Your product
                uses the same ingredient — action required.
              </p>
              <ol className="text-sm text-text-body space-y-1.5 list-decimal list-inside">
                <li>Audit identity testing protocols against 21 CFR 111.75(a)(1)(ii)</li>
                <li>Verify COA includes marine collagen-specific identity tests</li>
                <li>Confirm per-batch testing with your contract manufacturer</li>
              </ol>
              <p className="mt-3 font-semibold text-sm text-amber">
                Action required by Q2 2026
              </p>
            </div>

            {/* Fade-out overlay */}
            <div className="h-16 bg-gradient-to-t from-white to-transparent relative z-10 -mt-6" />
          </div>

          {/* Peek card 1 — Biotin (all clear) */}
          <div className="relative z-20 mx-4 bg-white rounded overflow-hidden border border-border/60 shadow-md">
            <div className="h-[2px] bg-canary" />
            <div className="px-4 py-2.5 flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-clear shrink-0" />
              <span className="font-serif text-sm font-semibold text-text-secondary">
                Biotin Complex 5000mcg
              </span>
              <span className="ml-auto font-mono text-xs text-clear">
                All clear
              </span>
            </div>
          </div>

          {/* Peek card 2 — Turmeric (dimmed) */}
          <div className="relative z-10 mx-8 bg-white/70 rounded overflow-hidden border border-border/30 shadow-sm">
            <div className="h-[2px] bg-canary opacity-40" />
            <div className="px-4 py-2 flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-border shrink-0" />
              <span className="font-serif text-xs font-semibold text-text-secondary/50">
                Turmeric Joint Formula
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
