"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div
      className={[
        "[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-text-primary [&_h2]:mt-10 [&_h2]:mb-4",
        "[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-text-primary [&_h3]:mt-8 [&_h3]:mb-3",
        "[&_p]:text-base [&_p]:text-text-secondary [&_p]:leading-7 [&_p]:mb-5",
        "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-5 [&_ul]:text-text-secondary [&_ul]:leading-7",
        "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-5 [&_ol]:text-text-secondary [&_ol]:leading-7",
        "[&_li]:mb-1.5",
        "[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent/80",
        "[&_strong]:font-semibold [&_strong]:text-text-primary",
        "[&_blockquote]:border-l-4 [&_blockquote]:border-accent/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-text-secondary [&_blockquote]:my-6",
        "[&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono",
        "[&_pre]:bg-slate-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-5 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_hr]:my-8 [&_hr]:border-border",
        "[&_table]:w-full [&_table]:border-collapse [&_table]:mb-5",
        "[&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:bg-slate-50",
        "[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2",
      ].join(" ")}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
