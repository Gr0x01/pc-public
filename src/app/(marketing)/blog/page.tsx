import { Suspense } from "react";
import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/blog/queries";
import { BLOG_CATEGORIES, type BlogCategory } from "@/lib/blog/types";
import { PostCard } from "@/components/blog/PostCard";
import { CategoryFilter } from "@/components/blog/CategoryFilter";
import { FeaturedPost } from "@/components/blog/FeaturedPost";
import { SignupForm } from "@/components/marketing/SignupForm";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Regulatory Analysis | Policy Canary",
  description:
    "FDA regulatory intelligence, warning letter analyses, and weekly roundups for brands across all FDA-regulated categories.",
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const validCategory = BLOG_CATEGORIES.includes(category as BlogCategory)
    ? (category as BlogCategory)
    : undefined;

  const posts = await getPublishedPosts(validCategory);

  const featuredPost = posts[0];
  const remainingPosts = posts.slice(1);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-12">
        <h1 className="font-serif text-4xl font-bold text-text-primary mb-3">
          Regulatory Analysis
        </h1>
        <p className="text-lg text-text-secondary max-w-2xl">
          FDA regulatory intelligence, warning letter breakdowns, and actionable
          analysis for brands across all FDA-regulated categories.
        </p>
      </section>

      {/* Filter + Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="mb-8">
          <Suspense fallback={null}>
            <CategoryFilter />
          </Suspense>
        </div>

        {posts.length > 0 ? (
          <div className="space-y-8">
            {/* Featured post */}
            {featuredPost && <FeaturedPost post={featuredPost} />}

            {/* Grid */}
            {remainingPosts.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 3col:grid-cols-3">
                {remainingPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-text-secondary text-center py-16">
            No posts yet. Check back soon.
          </p>
        )}
      </section>

      {/* CTA */}
      <section className="bg-surface-dark py-16">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            What if this analysis was about YOUR products?
          </h2>
          <p className="text-slate-300 mb-6">
            Policy Canary monitors the FDA for your specific products — by name,
            by ingredient, by facility. Join the pilot.
          </p>
          <div className="flex justify-center">
            <SignupForm dark={true} />
          </div>
        </div>
      </section>
    </div>
  );
}
