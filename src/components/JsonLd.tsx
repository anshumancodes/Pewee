import { siteConfig, absoluteUrl } from "@/site.config";

export function WebsiteJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteConfig.name,
          description: siteConfig.about,
          url: siteConfig.url,
          inLanguage: siteConfig.language,
          author: {
            "@type": "Person",
            name: siteConfig.author.name,
            url: siteConfig.author.url,
            ...(siteConfig.author.bio && { description: siteConfig.author.bio }),
            ...(siteConfig.contactEmail && { email: siteConfig.contactEmail }),
            ...(siteConfig.socialLinks.length > 0 && {
              sameAs: siteConfig.socialLinks.map((l) => l.href),
            }),
          },
        }),
      }}
    />
  );
}

interface ArticleJsonLdProps {
  post: {
    title: string;
    slug: string;
    createdAt: string;
    updatedAt?: string;
    description?: string;
    image?: string;
    author?: string;
    tags?: string[];
  };
}

export function ArticleJsonLd({ post }: ArticleJsonLdProps) {
  const url = absoluteUrl(`/blog/${post.slug}`);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          datePublished: post.createdAt,
          dateModified: post.updatedAt || post.createdAt,
          author: {
            "@type": "Person",
            name: post.author || siteConfig.author.name,
            url: siteConfig.author.url,
          },
          publisher: {
            "@type": "Organization",
            name: siteConfig.name,
            url: siteConfig.url,
            logo: { "@type": "ImageObject", url: absoluteUrl(siteConfig.logo) },
          },
          url,
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": url,
          },
          ...(post.description ? { description: post.description } : {}),
          ...(post.image ? { image: post.image } : {}),
          ...(post.tags && post.tags.length > 0
            ? { keywords: post.tags.join(", ") }
            : {}),
        }),
      }}
    />
  );
}
