"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* ── Nav link with active indicator + hover underline ──── */
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`hidden sm:block relative text-sm font-medium py-1 group/link transition-colors duration-150 ${
        isActive ? "text-text-primary" : "text-text-body hover:text-text-primary"
      }`}
    >
      {children}
      {/* Hover underline — slides in from left */}
      {!isActive && (
        <span className="absolute left-0 right-0 bottom-0 h-px bg-current origin-left scale-x-0 transition-transform duration-150 ease-out group-hover/link:scale-x-100" />
      )}
      {/* Active indicator — accent bar */}
      {isActive && (
        <span className="absolute left-1 right-1 -bottom-0.5 h-0.5 bg-canary rounded-full" />
      )}
    </Link>
  );
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const active = scrolled || hovered;

  return (
    <header className="sticky top-0 z-50 px-4 pt-3">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`h-14 max-w-6xl mx-auto px-5 md:px-6 flex items-center justify-between border transition-all duration-300 ease-out ${
          active
            ? "border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_12px_30px_rgba(15,23,42,0.10)]"
            : "border-transparent bg-transparent"
        }`}
        style={{ borderRadius: active ? 6 : 0 }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span
            className="h-2 w-2 rounded-full bg-canary group-hover:scale-110 transition-transform duration-150"
            aria-hidden="true"
          />
          <span className="font-semibold text-text-primary font-sans tracking-tight">
            Policy Canary
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-6">
          {/* Content links */}
          <NavLink href="/blog">Blog</NavLink>
          <NavLink href="/pricing">Pricing</NavLink>
          <NavLink href="/sample">Sample Email</NavLink>

          {/* Sign in — ghost button, separate tier */}
          <Link
            href="/login"
            className="hidden md:block text-sm font-medium text-text-body border border-border rounded px-3 py-1.5 transition-all duration-150 hover:border-border-strong hover:text-text-primary hover:bg-surface-muted"
          >
            Sign in
          </Link>

          {/* Primary CTA */}
          <Link
            href="/#signup"
            className="bg-surface-dark text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-[#1E293B] hover:scale-[1.02] transition-all duration-150"
          >
            Start Free
          </Link>
        </nav>
      </div>
    </header>
  );
}
