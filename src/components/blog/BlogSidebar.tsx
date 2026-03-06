"use client";

import { useEffect, useState } from "react";
import { ShareButtons } from "./ShareButtons";

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
        <div className="bg-surface-dark rounded-lg p-5">
          <h4 className="text-sm font-semibold text-white mb-1">
            Policy Canary Weekly
          </h4>
          <p className="text-xs text-slate-400 mb-3">
            Free FDA intelligence every Friday.
          </p>
          <form
            action="/api/signup"
            method="POST"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const email = new FormData(form).get("email") as string;
              if (!email) return;
              fetch("/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, source: "blog_sidebar" }),
              });
              form.reset();
              const btn = form.querySelector("button");
              if (btn) {
                btn.textContent = "Subscribed!";
                setTimeout(() => { btn.textContent = "Subscribe"; }, 2000);
              }
            }}
          >
            <input
              type="email"
              name="email"
              placeholder="you@company.com"
              required
              className="w-full text-sm px-3 py-2 rounded bg-white/10 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber mb-2"
            />
            <button
              type="submit"
              className="w-full text-sm font-medium px-3 py-2 rounded bg-amber text-surface-dark hover:bg-amber/90 transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
