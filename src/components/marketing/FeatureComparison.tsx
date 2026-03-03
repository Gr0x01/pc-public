export default function FeatureComparison() {
  return (
    <section className="bg-surface-muted py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-text-primary text-center mb-4">
          The same FDA action.
          <br />
          Two completely different responses.
        </h2>
        <p className="text-text-secondary text-center mb-12 max-w-xl mx-auto">
          Generic digests tell you what happened. Product intelligence tells you
          what to do — about your specific products.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free — Generic */}
          <div className="bg-surface-subtle border border-border rounded p-6 opacity-80">
            <div className="mb-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary bg-surface-subtle border border-border rounded px-2 py-0.5">
                Free Weekly Digest
              </span>
            </div>
            <h3 className="font-sans text-base font-semibold text-text-primary mb-2 leading-snug">
              FDA Updates Identity Testing Requirements for Marine-Sourced
              Supplements — Oct 14, 2025
            </h3>
            <ul className="mt-3 space-y-1.5">
              {["Product name", "Action items", "Analysis", "Deadline"].map(
                (item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-text-secondary/60"
                  >
                    <span className="h-3 w-3 shrink-0">—</span>
                    <span className="line-through decoration-text-secondary/40">
                      {item}
                    </span>
                  </li>
                )
              )}
            </ul>
            <p className="text-xs text-text-secondary mt-4 pt-4 border-t border-border">
              Generic digest. Same for every subscriber.
            </p>
          </div>

          {/* Monitor — Product Intelligence */}
          <div className="bg-white border border-border rounded overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.10)]">
            <div className="h-[3px] bg-canary" />
            <div className="p-6">
              <div className="mb-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-amber bg-amber-muted rounded px-2 py-0.5">
                  Product Intelligence
                </span>
              </div>
              <h3 className="font-serif text-xl font-bold text-text-primary mb-2">
                Marine Collagen Powder
              </h3>
              <p className="text-sm text-text-body mb-3">
                NovaBiotics failed identity testing for marine collagen.
                COA-only documentation was deemed insufficient. Your product uses
                this ingredient.
              </p>
              <ol className="text-sm text-text-body space-y-1 list-decimal list-inside mb-3">
                <li>
                  Audit identity testing protocols against 21 CFR 111.75(a)(1)(ii)
                </li>
                <li>
                  Verify COA includes marine collagen-specific identity tests
                </li>
                <li>Confirm per-batch testing with contract manufacturer</li>
              </ol>
              <p className="font-semibold text-sm text-amber mb-2">
                Action required by Q2 2026
              </p>
              <p className="font-mono text-xs text-text-secondary">
                FDA CFSAN Warning Letters &middot; 21 CFR 111.75(a)(1)(ii)
              </p>
              <p className="text-xs text-text-secondary mt-4 pt-4 border-t border-border flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber inline-block" />
                Product intelligence. Specific to your products.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
