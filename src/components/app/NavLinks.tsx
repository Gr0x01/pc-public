"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/app/feed", label: "Feed", matchPrefixes: ["/app/feed", "/app/items"] },
  { href: "/app/search", label: "Search", matchPrefixes: ["/app/search"] },
  { href: "/app/products", label: "Products", matchPrefixes: ["/app/products"] },
] as const;

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = item.matchPrefixes.some((p) => pathname.startsWith(p));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative px-3 py-1.5 text-sm font-medium transition-colors duration-100 ${
              isActive
                ? "text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {item.label}
            {isActive && (
              <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-amber" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
