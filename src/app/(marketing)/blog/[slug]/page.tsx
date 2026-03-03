import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostBySlug, getPublishedPosts } from "@/lib/blog/queries";
import { CATEGORY_LABELS } from "@/lib/blog/types";
import { MarkdownContent } from "@/components/blog/MarkdownContent";
import { SignupForm } from "@/components/marketing/SignupForm";
import Link from "next/link";

export const revalidate = 3600;

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};

  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt;

  return {
    title: `${title} | Policy Canary`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.published_at ?? undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.seo_title || post.title,
    description: post.seo_description || post.excerpt,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    url: `https://policycanary.io/blog/${post.slug}`,
    publisher: {
      "@type": "Organization",
      name: "Policy Canary",
      url: "https://policycanary.io",
    },
  };

  // Escape </script> sequences to prevent HTML injection in JSON-LD
  const jsonLdString = JSON.stringify(jsonLd).replace(/</g, "\\u003c");

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString }}
      />

      {/* Post Header */}
      <article className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <div className="mb-8">
          <Link
            href="/blog"
            className="text-sm text-text-secondary hover:text-amber transition-colors duration-150"
          >
            &larr; Back to Blog
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-medium text-amber-text bg-amber-muted px-2.5 py-1 rounded-full">
            {CATEGORY_LABELS[post.category]}
          </span>
          {date && post.published_at && (
            <time dateTime={post.published_at} className="text-sm text-text-secondary">
              {date}
            </time>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
          {post.title}
        </h1>
        <p className="text-lg text-text-secondary mb-10">{post.excerpt}</p>

        <MarkdownContent content={post.content} />
      </article>

      {/* CTA */}
      <section className="bg-surface-dark py-16">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            Get the weekly FDA roundup
          </h2>
          <p className="text-slate-300 mb-6">
            Free regulatory intelligence delivered every Monday. No spam, cancel
            anytime.
          </p>
          <div className="flex justify-center">
            <SignupForm dark={true} />
          </div>
        </div>
      </section>
    </div>
  );
}
