import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root so a lockfile in a parent folder isn't picked up
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
