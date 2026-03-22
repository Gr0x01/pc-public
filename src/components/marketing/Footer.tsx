import Link from "next/link";
import { Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-surface-dark border-t border-border-dark">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Link columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          <div>
            <p className="text-sm text-slate-400 max-w-xs">
              Policy Canary — Regulatory intelligence for supplement, food, and
              cosmetic&nbsp;brands.
            </p>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
              Product
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/sample"
                  className="text-sm text-slate-400 hover:text-slate-200 transition-colors duration-150"
                >
                  Sample Report
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-slate-400 hover:text-slate-200 transition-colors duration-150"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
              Intelligence
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/blog"
                  className="text-sm text-slate-400 hover:text-slate-200 transition-colors duration-150"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/ingredients"
                  className="text-sm text-slate-400 hover:text-slate-200 transition-colors duration-150"
                >
                  Ingredients
                </Link>
              </li>
              <li>
                <Link
                  href="/enforcement"
                  className="text-sm text-slate-400 hover:text-slate-200 transition-colors duration-150"
                >
                  Enforcement Actions
                </Link>
              </li>
              <li>
                <Link
                  href="/regulations"
                  className="text-sm text-slate-400 hover:text-slate-200 transition-colors duration-150"
                >
                  Regulations
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
              Company
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-slate-400 hover:text-slate-200 transition-colors duration-150"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-slate-400 hover:text-slate-200 transition-colors duration-150"
                >
                  Terms
                </Link>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/company/policy-canary/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-400 hover:text-slate-200 transition-colors duration-150 inline-flex items-center gap-1.5"
                >
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
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
