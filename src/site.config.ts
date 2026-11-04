/**
 * ─────────────────────────────────────────────────────────────
 *  Pewee site configuration
 * ─────────────────────────────────────────────────────────────
 *  All public branding — name, description, logo, author, social
 *  links, SEO defaults, CMS route — lives in /pewee.config.json.
 *  Run `npm run setup` to generate it interactively, or edit it by hand.
 *
 *  This module maps that JSON onto the `siteConfig` object the app uses.
 *  Secrets (database, JWT) never belong here; they live in .env.
 *
 *  NEXT_PUBLIC_APP_URL, if set, overrides `siteUrl` (handy for previews).
 */
import raw from "../pewee.config.json";

export interface SocialLink {
  label: string;
  href: string;
}

export interface Announcement {
  /** Bold lead-in text, e.g. "New:" */
  lead: string;
  /** Text rendered as the link */
  linkText: string;
  href: string;
}

export type TwitterCard = "summary" | "summary_large_image";

/** Shape of pewee.config.json. Every field is optional so hand edits can't crash the build. */
interface PeweeConfigFile {
  configured?: boolean;
  siteName?: string;
  tagline?: string;
  description?: string;
  siteUrl?: string;
  language?: string;
  locale?: string;
  timezone?: string;
  contactEmail?: string;
  author?: { name?: string; bio?: string };
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterCard?: string;
    twitterHandle?: string;
    robots?: string;
  };
  socials?: Partial<Record<SocialKey, string>>;
  branding?: { logo?: string; favicon?: string; themeColor?: string; showCredit?: boolean };
  cms?: { path?: string };
}

type SocialKey = "github" | "twitter" | "linkedin" | "instagram" | "youtube" | "website";

const SOCIAL_LABELS: Record<SocialKey, string> = {
  github: "GitHub",
  twitter: "X",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  youtube: "YouTube",
  website: "Website",
};

const file = raw as PeweeConfigFile;
const trim = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || trim(file.siteUrl) || "http://localhost:3000").replace(
  /\/+$/,
  ""
);

const name = trim(file.siteName) || "pewee";
const description = trim(file.description) || trim(file.seo?.description);
const seoTitle = trim(file.seo?.title) || name;
const seoDescription = trim(file.seo?.description) || description;
const logo = trim(file.branding?.logo) || "/Pewee..png";

/** Normalise "/admin/" or "admin" to "/admin". */
const cmsPath = `/${trim(file.cms?.path).replace(/^\/+|\/+$/g, "") || "dashboard"}`;

const twitterHandleRaw = trim(file.seo?.twitterHandle).replace(/^@/, "");

const socialLinks: SocialLink[] = (Object.keys(SOCIAL_LABELS) as SocialKey[])
  .map((key) => ({ label: SOCIAL_LABELS[key], href: trim(file.socials?.[key]) }))
  .filter((l) => l.href);

export const siteConfig = {
  /** Blog name — shown in the navbar, footer, dashboard and page titles. */
  name,

  /** Short line under the name in the footer. */
  tagline: trim(file.tagline),

  /** Default <title> for the home page. */
  title: seoTitle,

  /** Default meta description, also used for the blog index and RSS feed. */
  description: seoDescription,

  /** What the blog is about (RSS channel and structured data). */
  about: description || seoDescription,

  /** Open Graph / Twitter title and description (fall back to the SEO defaults). */
  ogTitle: trim(file.seo?.ogTitle) || seoTitle,
  ogDescription: trim(file.seo?.ogDescription) || seoDescription,

  /** Absolute public URL, without a trailing slash. */
  url: siteUrl,

  /** Logo shown in the navbar (path inside /public). */
  logo,

  /** Default social-share image (path inside /public or absolute URL). */
  ogImage: trim(file.seo?.ogImage) || logo,

  /** Favicon / app icon (path inside /public). */
  icon: trim(file.branding?.favicon) || logo,

  locale: trim(file.locale) || "en_US",
  language: trim(file.language) || "en",
  /** IANA timezone used to format post dates. Empty = server timezone. */
  timezone: trim(file.timezone) || undefined,
  themeColor: trim(file.branding?.themeColor) || "#161616",

  keywords: (file.seo?.keywords ?? []).map(trim).filter(Boolean),

  /** Default robots directive, e.g. "index, follow" or "noindex, nofollow". */
  robots: trim(file.seo?.robots) || "index, follow",

  twitterCard: (file.seo?.twitterCard === "summary" ? "summary" : "summary_large_image") as TwitterCard,

  /** Twitter / X handle (with @) used for share cards. Empty to omit. */
  twitterHandle: twitterHandleRaw ? `@${twitterHandleRaw}` : "",

  /** Public contact email (used in structured data). */
  contactEmail: trim(file.contactEmail),

  /** Default author for SEO metadata and posts without an author. */
  author: {
    name: trim(file.author?.name) || name,
    bio: trim(file.author?.bio),
    url: siteUrl,
  },

  /** Social links shown in the footer and in structured data. Order is preserved. */
  socialLinks,

  /** Route of the CMS dashboard, e.g. "/dashboard". */
  cmsPath,

  /**
   * Optional "Discuss" link shown at the bottom of every article
   * (e.g. your X/Twitter or Mastodon profile). Set to null to hide.
   */
  discussLink: null as SocialLink | null,

  /**
   * Optional dismissible announcement banner shown above the navbar.
   * Set to null to hide it.
   */
  announcement: null as Announcement | null,

  /** Small "Built with" credit in the footer. */
  credit: (file.branding?.showCredit === false
    ? null
    : { label: "Pewee", href: "https://github.com/anshumancodes/Pewee" }) as SocialLink | null,

  /** Google Analytics measurement ID (G-XXXX). Set NEXT_PUBLIC_GA_ID to enable. */
  googleAnalyticsId: process.env.NEXT_PUBLIC_GA_ID ?? "",
};

/** Resolve a path (e.g. "/blog/foo" or "/og.png") to an absolute URL on this site. */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Site-wide Open Graph / Twitter fields. Next.js replaces (not merges) a parent's
 * `openGraph`/`twitter` objects, so pages that set their own spread these in.
 */
export const defaultShareMetadata = {
  openGraph: {
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    images: [{ url: siteConfig.ogImage, alt: siteConfig.name }],
  },
  twitter: {
    card: siteConfig.twitterCard,
    ...(siteConfig.twitterHandle && {
      site: siteConfig.twitterHandle,
      creator: siteConfig.twitterHandle,
    }),
    images: [siteConfig.ogImage],
  },
};

/** Path inside the CMS, e.g. cmsHref("/manage-blog") → "/dashboard/manage-blog". */
export function cmsHref(subpath = ""): string {
  return `${cmsPath}${subpath}`;
}
