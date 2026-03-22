import Link from "next/link";

interface ContentCTAProps {
  heading?: string;
  description?: string;
}

export default function ContentCTA({
  heading = "What if this analysis was about YOUR\u00a0products?",
  description = "Policy Canary monitors the FDA for your specific products \u2014 by name, by ingredient, by facility. Start your free trial.",
}: ContentCTAProps) {
  return (
    <section className="bg-surface-dark py-16">
      <div className="max-w-xl mx-auto px-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">{heading}</h2>
        <p className="text-slate-300 mb-6">{description}</p>
        <Link
          href="/login?next=checkout"
          className="inline-block bg-canary text-surface-dark px-6 py-3 rounded-lg font-semibold text-sm hover:bg-canary/90 transition-colors duration-150"
        >
          Start Free Trial
        </Link>
      </div>
    </section>
  );
}
