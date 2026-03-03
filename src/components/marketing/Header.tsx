import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border">
      <div className="h-16 max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span
            className="h-2 w-2 rounded-full bg-amber group-hover:scale-110 transition-transform duration-150"
            aria-hidden="true"
          />
          <span className="font-bold text-text-primary font-sans tracking-tight">
            Policy Canary
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-6">
          <Link
            href="/pricing"
            className="hidden sm:block text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
          >
            Pricing
          </Link>
          <Link
            href="/sample"
            className="hidden sm:block text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
          >
            Sample Report
          </Link>
          <Link
            href="/#signup"
            className="bg-amber text-white text-sm font-semibold px-4 py-2 rounded hover:bg-amber/90 transition-colors duration-150"
          >
            Start Free
          </Link>
        </nav>
      </div>
    </header>
  );
}
