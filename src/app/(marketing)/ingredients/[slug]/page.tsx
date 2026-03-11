import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  getPageByTypeAndSlug,
  getPublishedPages,
  getRelatedPages,
  getLinkedPages,
} from "@/lib/intelligence/queries";
import {
  calculateReadingTime,
  type IngredientData,
} from "@/lib/intelligence/types";
import { MarkdownContent } from "@/components/blog/MarkdownContent";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { IntelPageSidebar } from "@/components/intelligence/IntelPageSidebar";
import { StatusBadge } from "@/components/intelligence/StatusBadge";
import { CrossLinkSection } from "@/components/intelligence/CrossLinkSection";
import { IntelPageCard } from "@/components/intelligence/IntelPageCard";
import { SignupForm } from "@/components/marketing/SignupForm";

export const revalidate = 3600;

const SITE_URL = "https://policycanary.io";

export async function generateStaticParams() {
  const pages = await getPublishedPages("ingredient");
  return pages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageByTypeAndSlug("ingredient", slug);
  if (!page) return {};

  const title = page.seo_title || page.title;
  const description = page.seo_description || page.excerpt;

  return {
    title: `${title} | Policy Canary`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: page.published_at ?? undefined,
      ...(page.cover_image_url && {
        images: [{ url: page.cover_image_url }],
      }),
    },
  };
}

export default async function IngredientDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPageByTypeAndSlug("ingredient", slug);

  if (!page) {
    notFound();
  }

  const structured = page.structured_data as IngredientData;
  const date = page.published_at
    ? new Date(page.published_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const readingTime = calculateReadingTime(page.word_count);
  const pageUrl = `${SITE_URL}/ingredients/${page.slug}`;

  const [relatedPages, linkedPages] = await Promise.all([
    getRelatedPages("ingredient", page.slug),
    getLinkedPages(page.id),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.seo_title || page.title,
    description: page.seo_description || page.excerpt,
    datePublished: page.published_at,
    dateModified: page.updated_at,
    url: pageUrl,
    ...(page.cover_image_url && { image: page.cover_image_url }),
    about: {
      "@type": "ChemicalSubstance",
      name: page.title,
    },
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
            href="/ingredients"
            className="hover:text-amber transition-colors duration-150"
          >
            Ingredients
          </Link>
          <span className="mx-2">/</span>
          <span>{page.title}</span>
        </nav>

        {/* Metadata */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-medium text-amber-text bg-amber-muted px-2.5 py-1 rounded">
            Ingredient
          </span>
          {structured.fda_status && (
            <StatusBadge status={structured.fda_status} pageType="ingredient" />
          )}
          {date && page.published_at && (
            <time
              dateTime={page.published_at}
              className="text-sm text-text-secondary"
            >
              {date}
            </time>
          )}
          <span className="text-sm text-text-secondary">
            {readingTime} min read
          </span>
        </div>

        {/* Title */}
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-text-primary mb-4 max-w-4xl">
          {page.title}
        </h1>

        {/* Excerpt */}
        <p className="text-xl text-text-body mb-6 max-w-3xl">{page.excerpt}</p>

        {/* Hero image */}
        {page.cover_image_url && (
          <div className="relative w-full aspect-video rounded overflow-hidden mb-12">
            <Image
              src={page.cover_image_url}
              alt={page.title}
              fill
              className="object-cover"
              sizes="(max-width: 1152px) 100vw, 1152px"
              priority
            />
          </div>
        )}

        {/* Two-column layout */}
        <div className="flex gap-12 lg:gap-16">
          <main className="flex-1 min-w-0 max-w-[720px]">
            <MarkdownContent content={page.content} />
          </main>

          <IntelPageSidebar
            url={pageUrl}
            title={page.title}
            deadlines={structured.key_deadlines}
          />
        </div>
      </article>

      {/* Cross-links */}
      <CrossLinkSection pages={linkedPages} />

      {/* Related pages */}
      {relatedPages.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <h2 className="font-serif text-2xl font-bold text-text-primary mb-6">
            More Ingredient Intelligence
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {relatedPages.map((related) => (
              <IntelPageCard key={related.id} page={related} />
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
