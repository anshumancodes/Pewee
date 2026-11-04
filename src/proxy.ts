import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/auth";
import { siteConfig } from "@/site.config";

// The CMS lives in src/app/dashboard. If a custom route is configured
// (pewee.config.json → cms.path), next.config.ts rewrites it to /dashboard,
// so both prefixes are guarded here.
const PROTECTED_PREFIXES = [...new Set([siteConfig.cmsPath, "/dashboard"])];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Guards every CMS route. Write API routes check the session themselves.
export async function proxy(req: NextRequest) {
  if (!isProtected(req.nextUrl.pathname)) return NextResponse.next();

  const token = req.cookies.get(ADMIN_COOKIE)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/auth?reason=unauthenticated", req.url));
  }

  if (!(await verifyAdminToken(token))) {
    // Token expired, tampered with, or not an admin token
    return NextResponse.redirect(new URL("/auth?reason=session_expired", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Matchers must be static, so match page routes broadly (skipping the API,
  // Next internals, the public blog and files with an extension) and filter above.
  matcher: ["/((?!api/|_next/|auth(?:/|$)|blog(?:/|$)|.*\\.[^/]+$).*)"],
};
