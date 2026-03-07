import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPostBySlug, getPublishedPosts, getRelatedPosts } from "@/lib/blog/queries";
import { CATEGORY_LABELS, calculateReadingTime } from "@/lib/blog/types";
import { MarkdownContent } from "@/components/blog/MarkdownContent";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { BlogSidebar } from "@/components/blog/BlogSidebar";
import { ShareButtons } from "@/components/blog/ShareButtons";
import { PostCard } from "@/components/blog/PostCard";
import { SignupForm } from "@/components/marketing/SignupForm";

export const revalidate = 3600;

const SITE_URL = "https://policycanary.io";

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
      ...(post.cover_image_url && {
        images: [{ url: post.cover_image_url }],
      }),
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

  const readingTime = calculateReadingTime(post.word_count);
  const postUrl = `${SITE_URL}/blog/${post.slug}`;

  const relatedPosts = await getRelatedPosts(post.category, post.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.seo_title || post.title,
    description: post.seo_description || post.excerpt,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    url: postUrl,
    ...(post.cover_image_url && { image: post.cover_image_url }),
    publisher: {
      "@type": "Organization",
      name: "Policy Canary",
      url: SITE_URL,
    },
  };

  const jsonLdString = JSON.stringify(jsonLd).replace(/</g, "\\u003c");

  return (
    <div className="min-h-screen">
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString }}
      />

      <article className="max-w-6xl mx-auto px-6 pt-16 pb-16">
        {/* Breadcrumbs */}
        <nav className="mb-8 text-sm text-text-secondary">
          <Link
            href="/blog"
            className="hover:text-amber transition-colors duration-150"
          >
            Blog
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/blog?category=${post.category}`}
            className="hover:text-amber transition-colors duration-150"
          >
            {CATEGORY_LABELS[post.category]}
          </Link>
        </nav>

        {/* Metadata */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-medium text-amber-text bg-amber-muted px-2.5 py-1 rounded">
            {CATEGORY_LABELS[post.category]}
          </span>
          {date && post.published_at && (
            <time dateTime={post.published_at} className="text-sm text-text-secondary">
              {date}
            </time>
          )}
          <span className="text-sm text-text-secondary">{readingTime} min read</span>
        </div>

        {/* Title */}
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-text-primary mb-4 max-w-4xl">
          {post.title}
        </h1>

        {/* Excerpt */}
        <p className="text-xl text-text-body mb-6 max-w-3xl">
          {post.excerpt}
        </p>

        {/* Hero image */}
        {post.cover_image_url && (
          <div className="relative w-full aspect-video rounded overflow-hidden mb-12">
            <Image
              src={post.cover_image_url}
              alt={post.title}
              fill
              className="object-cover"
              sizes="(max-width: 1152px) 100vw, 1152px"
              priority
            />
          </div>
        )}

        {/* Two-column layout */}
        <div className="flex gap-12 lg:gap-16">
          {/* Main content */}
          <main className="flex-1 min-w-0 max-w-[720px]">
            <MarkdownContent content={post.content} />

            {/* Mobile-only: share + newsletter */}
            <div className="lg:hidden mt-12 space-y-8">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
                  Share this article
                </h4>
                <ShareButtons url={postUrl} title={post.title} />
              </div>
              <div className="bg-surface-dark rounded-lg p-6 text-center">
                <h4 className="text-base font-semibold text-white mb-1">
                  Policy Canary Weekly
                </h4>
                <p className="text-sm text-slate-400 mb-4">
                  Free FDA intelligence every Friday.
                </p>
                <SignupForm dark={true} />
              </div>
            </div>
          </main>

          {/* Sidebar (desktop only) */}
          <BlogSidebar url={postUrl} title={post.title} />
        </div>
      </article>

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <h2 className="font-serif text-2xl font-bold text-text-primary mb-6">
            More in {CATEGORY_LABELS[post.category]}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {relatedPosts.map((related) => (
              <PostCard key={related.id} post={related} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-surface-dark py-16">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            What if this analysis was about YOUR&nbsp;products?
          </h2>
          <p className="text-slate-300 mb-6">
            Policy Canary monitors the FDA for your specific products — by name,
            by ingredient, by facility. Join the&nbsp;pilot.
          </p>
          <div className="flex justify-center">
            <SignupForm dark={true} />
          </div>
        </div>
      </section>
    </div>
  );
}
