import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { DynamicIslandTOC } from "@/components/blog/dynamic-island-toc";
import { ArticleJsonLd } from "@/components/JsonLd";
import { ArrowLeft } from "lucide-react";
import { ShareButton } from "@/components/blog/share-button";
import {
  getBlogBySlug,
  formatDateLong,
  calcReadTime,
  getExcerpt,
  getAllBlogs,
} from "@/lib/blog";
import { siteConfig, absoluteUrl } from "@/site.config";

// Revalidate cached pages every hour
export const revalidate = 3600;

// Pre-render all known blog slugs at build time
// (new posts are rendered on demand and cached afterwards)
export async function generateStaticParams() {
  const blogs = await getAllBlogs(200);
  return blogs.map((b) => ({ slug: b.slug }));
}

// Cover image if it's a raster image, otherwise the site's default share image
function getOgImage(coverImg?: string | null): string {
  const isSvg = coverImg?.match(/\.svg(\?|$)/i);
  return absoluteUrl(coverImg && !isSvg ? coverImg : siteConfig.ogImage);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    return { title: "Post not found" };
  }

  const excerpt = getExcerpt(blog.content, 160);

  const ogImage = getOgImage(blog.coverImg);
  const author = blog.author || siteConfig.author.name;

  const pageTitle =
    blog.title.length <= 55
      ? `${blog.title} | ${siteConfig.name}`
      : `${blog.title.slice(0, 55).trimEnd()}… | ${siteConfig.name}`;

  return {
    title: {
      absolute: pageTitle,
    },
    description: excerpt,
    authors: [{ name: author, url: siteConfig.author.url }],
    creator: author,
    publisher: siteConfig.name,
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      title: blog.title,
      description: excerpt,
      type: "article",
      url: `/blog/${slug}`,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      publishedTime: blog.createdAt,
      modifiedTime: blog.updatedAt || blog.createdAt,
      authors: [author],
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: blog.title,
        },
      ],
    },
    twitter: {
      card: siteConfig.twitterCard,
      ...(siteConfig.twitterHandle && {
        site: siteConfig.twitterHandle,
        creator: siteConfig.twitterHandle,
      }),
      title: blog.title,
      description: excerpt,
      images: [{ url: ogImage, width: 1200, height: 630, alt: blog.title }],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) notFound();

  const htmlContent = blog.content;
  const readTime = calcReadTime(htmlContent);
  const excerpt = getExcerpt(htmlContent, 160);

  const ogImage = getOgImage(blog.coverImg);

  return (
    <>
      {/* Structured data for Google rich search results */}
      <ArticleJsonLd
        post={{
          title: blog.title,
          slug: blog.slug,
          createdAt: blog.createdAt,
          updatedAt: blog.updatedAt,
          description: excerpt,
          image: ogImage,
          author: blog.author,
          tags: blog.tags,
        }}
      />

      {/* Floating dynamic island table-of-contents */}
      <DynamicIslandTOC />

      <article className="mx-auto max-w-3xl pt-2 pb-16 text-zinc-100">
        {/* Navigation Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-10 flex flex-wrap items-center justify-between gap-3"
        >
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 font-sans underline text-sm font-medium tracking-[0.16em] text-muted transition-colors hover:text-foreground"
          >
            <span aria-hidden="true">
              <ArrowLeft size={14} />
            </span>
            <span>All Posts</span>
          </Link>
          <ShareButton slug={blog.slug} />
        </nav>

        {/* ── ARTICLE HEADER ── */}
        <header className="mb-12 border-b border-border/80 pb-10">
          {/* Metadata Row */}
          <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 font-sans text-xs text-muted">
            <span className=" px-3 py-1 font-medium text-neutral-300">
              {blog.author || siteConfig.author.name}
            </span>

            <span aria-hidden="true">·</span>

            {blog.createdAt && (
              <time dateTime={blog.createdAt} className="tracking-wide">
                {formatDateLong(blog.createdAt)}
              </time>
            )}

            <span aria-hidden="true">·</span>

            <span className="inline-flex items-center gap-1.5">
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
                className="text-neutral-500"
              >
                <circle
                  cx="6"
                  cy="6"
                  r="5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <path
                  d="M6 3.5V6.2L7.8 7.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
              {readTime} min read
            </span>
          </div>

          {/* Single H1 Heading */}
          <h1 className="font-head text-3xl font-normal leading-[1.18] tracking-tight text-foreground sm:text-5xl">
            {blog.title}
          </h1>
        </header>

        {/* ── ARTICLE CONTENT ── */}
        <section
          aria-label="Article content"
          className="prose prose-invert max-w-none
            prose-headings:font-head prose-headings:font-normal prose-headings:tracking-tight prose-headings:text-foreground
            prose-h2:mt-12 prose-h2:mb-4 prose-h2:text-2xl sm:prose-h2:text-3xl
            prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-xl
            prose-p:mb-6 prose-p:font-body prose-p:text-[17px] prose-p:leading-[1.85] prose-p:text-neutral-300
            prose-a:text-foreground prose-a:underline prose-a:decoration-neutral-600 prose-a:underline-offset-4 hover:prose-a:decoration-foreground
            prose-strong:text-foreground prose-strong:font-semibold
            prose-blockquote:border-l-neutral-700 prose-blockquote:font-serif prose-blockquote:text-neutral-400 prose-blockquote:italic
            prose-code:rounded prose-code:border prose-code:border-border prose-code:bg-surface prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-xs prose-code:text-neutral-200
            prose-pre:rounded-xl prose-pre:border prose-pre:border-border prose-pre:bg-black prose-pre:p-4 prose-pre:text-neutral-100
            prose-img:mx-auto prose-img:rounded-xl prose-img:border prose-img:border-border
            prose-hr:my-10 prose-hr:border-border"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        {/* ── ARTICLE FOOTER ── */}
        <footer className="mt-16 border-t border-border/80 pt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 font-sans text-xs text-muted transition-colors hover:text-foreground"
            >
              <span aria-hidden="true">
                <ArrowLeft />
              </span>
              <span>Back to all posts</span>
            </Link>

            {siteConfig.discussLink && (
              <Link
                href={siteConfig.discussLink.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans text-xs text-muted transition-colors hover:text-foreground"
              >
                Discuss on {siteConfig.discussLink.label} ↗
              </Link>
            )}
          </div>
        </footer>
      </article>
    </>
  );
}
