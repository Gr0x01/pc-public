const roles = [
  {
    title: "Founder / CEO",
    detail: "32 SKUs \u00b7 40+ active ingredients",
    quote:
      "Which of my 32 SKUs is affected? I can\u2019t cross-reference 40+ ingredients manually after every FDA notice.",
  },
  {
    title: "QA Manager",
    detail: "Moisturizer line \u00b7 Next audit: Q2 2026",
    quote:
      "Does the new BHA guidance apply to our moisturizer line? I need to know before our next audit.",
  },
  {
    title: "Product Manager",
    detail: "Q3 launch timeline \u00b7 Collagen SKU at risk",
    quote:
      "What does this collagen identity testing warning mean for our Q3 launch timeline?",
  },
  {
    title: "VP Regulatory",
    detail: "47 products \u00b7 3 categories",
    quote:
      "I have 47 products. Show me which ones are affected \u2014 not a 500-page Federal Register summary.",
  },
];

export default function BuyerRoleCard() {
  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-text-primary text-center mb-4">
          You don&apos;t have a regulatory team.
          <br />
          You have Policy Canary.
        </h2>
        <p className="text-text-secondary text-center mb-12 max-w-xl mx-auto">
          Whether you&apos;re the founder, the quality lead, or the person who
          gets the call when something goes wrong — you need product-level
          answers, not regulatory summaries.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role) => (
            <div
              key={role.title}
              className="bg-white border border-border rounded p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150"
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-amber mb-1">
                {role.title}
              </p>
              <p className="font-mono text-xs text-text-secondary mb-3">
                {role.detail}
              </p>
              <p className="text-text-body text-sm leading-relaxed">
                &ldquo;{role.quote}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
