import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Optional custom CMS route from pewee.config.json (set by `npm run setup`).
function readCmsPath(): string {
  try {
    const cfg = JSON.parse(readFileSync(join(import.meta.dirname, "pewee.config.json"), "utf8"));
    const path = String(cfg?.cms?.path ?? "").replace(/^\/+|\/+$/g, "");
    return path ? `/${path}` : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

const cmsPath = readCmsPath();
const customCms = cmsPath !== "/dashboard";

const nextConfig: NextConfig = {
  // Pin the project root so a lockfile in a parent folder isn't picked up
  turbopack: {
    root: import.meta.dirname,
  },

  // The CMS pages live in src/app/dashboard. A custom route is served from
  // there via a rewrite, and the old /dashboard URL redirects to it.
  ...(customCms && {
    async redirects() {
      return [
        { source: "/dashboard", destination: cmsPath, permanent: false },
        { source: "/dashboard/:path*", destination: `${cmsPath}/:path*`, permanent: false },
      ];
    },
    async rewrites() {
      return {
        beforeFiles: [
          { source: cmsPath, destination: "/dashboard" },
          { source: `${cmsPath}/:path*`, destination: "/dashboard/:path*" },
        ],
      };
    },
  }),
};

export default nextConfig;
