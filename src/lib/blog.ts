import dbConnect from "@/db/dbconnect";
import { BlogModel } from "@/schemas/blog.schema";
import { siteConfig } from "@/site.config";

export interface BlogEntry {
  _id: string;
  title: string;
  slug: string;
  author: string;
  coverImg?: string | null;
  createdAt: string;
  updatedAt?: string;
  excerpt?: string;
  tags?: string[];
}

export interface BlogPost {
  _id?: string;
  title: string;
  content: string;
  author: string;
  slug: string;
  coverImg?: string | null;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
}

/** Posts visible to the public: not soft-deleted and not archived. */
export const PUBLISHED_FILTER = {
  deletedBy: { $exists: false },
  archived: { $ne: true },
};

/** Posts the admin can see in the CMS: everything not soft-deleted. */
export const NOT_DELETED_FILTER = {
  deletedBy: { $exists: false },
};

type LeanBlog = {
  _id: unknown;
  title: string;
  slug: string;
  author: string;
  content?: string;
  coverImg?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function toIso(d?: Date): string {
  return d ? new Date(d).toISOString() : "";
}

function toEntry(b: LeanBlog): BlogEntry {
  return {
    _id: String(b._id),
    title: b.title,
    slug: b.slug,
    author: b.author,
    coverImg: b.coverImg ?? null,
    createdAt: toIso(b.createdAt),
    updatedAt: toIso(b.updatedAt),
  };
}

// Server-side data access used by the public pages, sitemap and RSS feed.

export async function getAllBlogs(limit = 100): Promise<BlogEntry[]> {
  try {
    await dbConnect();
    const docs = await BlogModel.find(PUBLISHED_FILTER)
      .select("title slug author coverImg createdAt updatedAt")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<LeanBlog[]>();
    return docs.map(toEntry);
  } catch (error) {
    console.error("Failed to fetch all blogs:", error);
    return [];
  }
}

/** Published posts including their HTML content (used by the RSS feed). */
export async function getRecentPosts(limit = 20): Promise<BlogPost[]> {
  try {
    await dbConnect();
    const docs = await BlogModel.find(PUBLISHED_FILTER)
      .select("title slug author coverImg content createdAt updatedAt")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<LeanBlog[]>();
    return docs.map((b) => ({ ...toEntry(b), content: b.content ?? "" }));
  } catch (error) {
    console.error("Failed to fetch recent posts:", error);
    return [];
  }
}

export async function getBlogBySlug(slug: string): Promise<BlogPost | null> {
  try {
    await dbConnect();
    const b = await BlogModel.findOne({ slug, ...PUBLISHED_FILTER }).lean<LeanBlog>();
    if (!b) return null;
    return { ...toEntry(b), content: b.content ?? "" };
  } catch (error) {
    console.error(`Failed to fetch blog with slug "${slug}":`, error);
    return null;
  }
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(siteConfig.language, {
      timeZone: siteConfig.timezone,
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function formatDateLong(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(siteConfig.language, {
      timeZone: siteConfig.timezone,
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function calcReadTime(html: string): number {
  if (!html) return 1;
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = text.split(" ").filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

export function getExcerpt(html: string, maxLen = 150): string {
  if (!html) return "";
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[^;]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}
