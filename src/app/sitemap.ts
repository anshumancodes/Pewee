import type { MetadataRoute } from "next";
import { getAllBlogs } from "@/lib/blog";
import { absoluteUrl } from "@/site.config";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogs = await getAllBlogs(1000);
  const latest = blogs[0]?.updatedAt || blogs[0]?.createdAt;

  return [
    {
      url: absoluteUrl("/"),
      ...(latest && { lastModified: latest }),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/blog"),
      ...(latest && { lastModified: latest }),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...blogs.map((b) => ({
      url: absoluteUrl(`/blog/${b.slug}`),
      lastModified: b.updatedAt || b.createdAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
