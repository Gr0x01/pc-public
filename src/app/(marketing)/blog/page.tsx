import { Suspense } from "react";
import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/blog/queries";
import { BLOG_CATEGORIES, type BlogCategory } from "@/lib/blog/types";
import { PostCard } from "@/components/blog/PostCard";
import { CategoryFilter } from "@/components/blog/CategoryFilter";
import { SignupForm } from "@/components/marketing/SignupForm";

export const metadata: Metadata = {
  title: "Blog | Policy Canary",
  description:
    "FDA regulatory intelligence, warning letter analyses, and weekly roundups for supplement, food, and cosmetic brands.",
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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-12">
        <h1 className="text-4xl font-bold text-text-primary mb-3">Blog</h1>
        <p className="text-lg text-text-secondary max-w-2xl">
          FDA regulatory intelligence, warning letter breakdowns, and actionable
          analysis for supplement, food, and cosmetic brands.
        </p>
      </section>

      {/* Filter + Grid */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="mb-8">
          <Suspense fallback={null}>
            <CategoryFilter />
          </Suspense>
        </div>

        {posts.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
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
