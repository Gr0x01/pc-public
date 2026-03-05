import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-surface-dark border-t border-border-dark">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Tagline */}
          <p className="text-sm text-slate-400 max-w-md">
            Policy Canary — Regulatory intelligence for supplement, food, and
            cosmetic brands.
          </p>

          {/* Links */}
          <nav className="flex flex-wrap gap-6">
            <Link
              href="/blog"
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors duration-150"
            >
              Blog
            </Link>
            <Link
              href="/sample"
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors duration-150"
            >
              Sample Report
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors duration-150"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors duration-150"
            >
              Terms
            </Link>
          </nav>
        </div>

        <div className="mt-8 pt-8 border-t border-border-dark">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Policy Canary. FDA intelligence is
            informational only — not legal advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
