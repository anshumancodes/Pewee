import { Metadata } from "next";
import { getAllBlogs, formatDate } from "@/lib/blog";
import BlogCard from "@/components/blog/blog-cards";
import { siteConfig, defaultShareMetadata } from "@/site.config";

// Incremental static regeneration; CMS edits also trigger on-demand revalidation
export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: siteConfig.title },
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    ...defaultShareMetadata.openGraph,
    title: siteConfig.ogTitle,
    description: siteConfig.ogDescription,
    url: "/",
    type: "website",
  },
  twitter: {
    ...defaultShareMetadata.twitter,
    title: siteConfig.ogTitle,
    description: siteConfig.ogDescription,
  },
};

export default async function BlogPage() {
  const blogs = await getAllBlogs(100);

  return (
    <div className="space-y-12 pt-4 sm:pt-8">
      {/* ── Header ── */}
      <header className=" pb-10">
        <h1 className="font-head text-4xl font-normal tracking-tight text-foreground sm:text-5xl">
          Blogs
        </h1>
      </header>

      {/* ── Articles List ── */}
      <section aria-label="Blog posts list">
        {blogs.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface/30 p-12 text-center">
            <p className="font-sans text-sm text-muted">
              No posts found. Check back soon for new articles.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/80">
            {blogs.map((blog) => (
              <BlogCard
                key={blog._id}
                title={blog.title}
                dateLabel={formatDate(blog.createdAt)}
                dateIso={blog.createdAt}
                author={blog.author}
                href={`/blog/${blog.slug}`}
                coverImg={blog.coverImg}
                excerpt={blog.excerpt}
                tags={blog.tags}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
