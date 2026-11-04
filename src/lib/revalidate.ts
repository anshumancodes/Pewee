import { revalidatePath } from "next/cache";

/**
 * Refresh every public page that can show a post after it changes in the CMS,
 * so readers see edits immediately instead of waiting for the hourly ISR window.
 * This is also the natural hook point for future "on publish" side-effects
 * (e.g. sending a newsletter).
 */
export function revalidatePostPaths(...slugs: (string | undefined)[]) {
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
  revalidatePath("/rss.xml");
  for (const slug of slugs) {
    if (slug) revalidatePath(`/blog/${slug}`);
  }
}
