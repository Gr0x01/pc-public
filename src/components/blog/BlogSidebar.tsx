"use client";

import { useEffect, useState } from "react";
import { ShareButtons } from "./ShareButtons";
import { NewsletterSidebarCTA } from "@/components/shared/NewsletterSidebarCTA";

interface TocItem {
  id: string;
  text: string;
}

export function BlogSidebar({ url, title }: { url: string; title: string }) {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const headings = document.querySelectorAll("article h2[id]");
    const items: TocItem[] = Array.from(headings).map((h) => ({
      id: h.id,
      text: h.textContent || "",
    }));
    setTocItems(items);

    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px" }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, []);

  return (
    <aside className="hidden lg:block w-[260px] flex-shrink-0">
      <div className="sticky top-24 space-y-8">
        {/* Table of Contents */}
        {tocItems.length > 0 && (
          <nav aria-label="Table of contents">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
              On this page
            </h4>
            <ul className="space-y-1">
              {tocItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`block text-sm py-1 pl-3 border-l-2 transition-colors ${
                      activeId === item.id
                        ? "text-amber font-medium border-amber"
                        : "text-text-secondary border-transparent hover:text-text-primary hover:border-border"
                    }`}
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Share */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
            Share
          </h4>
          <ShareButtons url={url} title={title} />
        </div>

        {/* Newsletter CTA */}
        <NewsletterSidebarCTA />
      </div>
    </aside>
  );
}
