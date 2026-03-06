"use client";

import { useState } from "react";
import { Link2, Linkedin, Twitter, Mail, Check } from "lucide-react";

export function ShareButtons({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const encoded = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={copyLink}
        className="text-text-secondary hover:text-amber transition-colors"
        aria-label="Copy link"
      >
        {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
      </button>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-text-secondary hover:text-amber transition-colors"
        aria-label="Share on LinkedIn"
      >
        <Linkedin className="w-4 h-4" />
      </a>
      <a
        href={`https://x.com/intent/tweet?url=${encoded}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-text-secondary hover:text-amber transition-colors"
        aria-label="Share on X"
      >
        <Twitter className="w-4 h-4" />
      </a>
      <a
        href={`mailto:?subject=${encodedTitle}&body=${encoded}`}
        className="text-text-secondary hover:text-amber transition-colors"
        aria-label="Share via email"
      >
        <Mail className="w-4 h-4" />
      </a>
    </div>
  );
}
