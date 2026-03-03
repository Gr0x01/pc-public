import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <div className="h-14 max-w-6xl mx-auto px-5 md:px-6 flex items-center justify-between rounded-full border border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_12px_30px_rgba(15,23,42,0.10)]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span
            className="h-2 w-2 rounded-full bg-accent group-hover:scale-110 transition-transform duration-150"
            aria-hidden="true"
          />
          <span className="font-semibold text-text-primary font-sans tracking-tight">
            Policy Canary
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-5">
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
            href="/login"
            className="hidden md:block text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
          >
            Sign in
          </Link>
          <Link
            href="/#signup"
            className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-accent/90 transition-colors duration-150"
          >
            Start Free
          </Link>
        </nav>
      </div>
    </header>
  );
}
