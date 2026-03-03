export default function SampleReport() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Report card */}
      <div className="bg-white rounded-lg border border-border shadow-[0_2px_12px_rgba(0,0,0,0.10)] overflow-hidden">
        {/* Canary top rule */}
        <div className="h-[3px] bg-canary" />

        <div className="p-6 pb-4">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-amber bg-amber-muted px-2 py-0.5 rounded">
              Warning Letter Issued
            </span>
            <span className="text-xs text-text-secondary">Oct 14, 2025</span>
          </div>

          {/* Product name */}
          <h2 className="font-serif text-2xl font-bold text-text-primary mb-1">
            Marine Collagen Powder
          </h2>
          <p className="font-mono text-xs text-text-secondary mb-5">
            FDA CFSAN Warning Letters · 21 CFR 111.75(a)(1)(ii)
          </p>

          {/* Event reference */}
          <div className="bg-surface-muted rounded p-3 mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-1">
              FDA Action
            </p>
            <p className="text-sm text-text-body">
              Warning Letter WL-2025-CFSAN-0847 — NovaBiotics Inc. (Oct 14,
              2025). Identity testing failures for marine-sourced collagen.
            </p>
          </div>

          {/* Analysis */}
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-2">
              Analysis
            </p>
            <p className="text-sm text-text-body leading-relaxed">
              NovaBiotics failed to confirm the identity of marine collagen
              concentrate through appropriate laboratory testing prior to use.
              The FDA cited missing ingredient-specific identity tests —
              COA-only documentation was deemed insufficient.
            </p>
          </div>

          {/* Action items */}
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-3">
              Required Actions
            </p>
            <ol className="space-y-2">
              {[
                { id: "identity-audit", text: "Audit your identity testing protocols for marine collagen against 21 CFR 111.75(a)(1)(ii)" },
                { id: "coa-verify", text: "Verify COA documentation includes marine collagen-specific identity tests, not just generic protein analysis" },
                { id: "batch-testing", text: "Confirm with your contract manufacturer that identity tests are performed per batch, not per lot" },
              ].map(({ id, text }, i) => (
                <li key={id} className="flex gap-3 text-sm text-text-body">
                  <span className="flex-shrink-0 h-5 w-5 rounded-full bg-amber-muted text-amber text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Deadline */}
          <div className="flex items-center gap-2 pt-4 border-t border-border">
            <span className="font-semibold text-amber text-sm">
              Review complete by Q2 2026
            </span>
          </div>
        </div>
      </div>

      {/* What free subscribers see */}
      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-3 text-center">
          What free subscribers see
        </p>
        <div className="bg-surface-subtle border border-border rounded-lg p-4">
          <p className="text-sm font-semibold text-text-primary leading-snug">
            FDA Updates Identity Testing Requirements for Marine-Sourced
            Supplements — Oct 14, 2025
          </p>
          <p className="text-xs text-text-secondary mt-2 italic">
            No product match. No action items. No analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
