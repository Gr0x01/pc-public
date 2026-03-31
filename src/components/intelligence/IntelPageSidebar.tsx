"use client";

import { useEffect, useState } from "react";
import { ShareButtons } from "@/components/blog/ShareButtons";
import { NewsletterSidebarCTA } from "@/components/shared/NewsletterSidebarCTA";
import { DeadlineTimeline } from "./DeadlineTimeline";

interface TocItem {
  id: string;
  text: string;
}

interface Deadline {
  date: string;
  label: string;
}

/** Pick the most relevant deadlines for the sidebar: up to 2 upcoming + 1 most recent past. */
function pickSidebarDeadlines(deadlines: Deadline[], max = 3): Deadline[] {
  const now = new Date();
  const sorted = [...deadlines].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const future = sorted.filter((d) => new Date(d.date) > now);
  const past = sorted.filter((d) => new Date(d.date) <= now);

  const picked: Deadline[] = [];
  // Most recent past as context anchor
  if (past.length > 0) picked.push(past[past.length - 1]);
  // Next upcoming deadlines
  picked.push(...future.slice(0, max - picked.length));

  return picked.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export function IntelPageSidebar({
  url,
  title,
  deadlines = [],
}: {
  url: string;
  title: string;
  deadlines?: Deadline[];
}) {
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

  const sidebarDeadlines = pickSidebarDeadlines(deadlines);
  const hasMoreDeadlines = deadlines.length > sidebarDeadlines.length;

  return (
    <aside className="hidden lg:block w-[260px] flex-shrink-0">
      <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto space-y-8">
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
                      document
                        .getElementById(item.id)
                        ?.scrollIntoView({ behavior: "smooth" });
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

        {/* Key Deadlines (truncated) */}
        {sidebarDeadlines.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
              Key Deadlines
            </h4>
            <DeadlineTimeline deadlines={sidebarDeadlines} compact />
            {hasMoreDeadlines && (
              <a
                href="#timeline"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("timeline")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-xs text-amber hover:text-amber/80 font-medium transition-colors"
              >
                View full timeline ({deadlines.length} dates)
              </a>
            )}
          </div>
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
