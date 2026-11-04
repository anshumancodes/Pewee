import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/site.config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...new Set([siteConfig.cmsPath, "/dashboard"]), "/auth", "/api/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
