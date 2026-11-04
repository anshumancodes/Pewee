import { jwtVerify, SignJWT } from "jose";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE = "admin_token";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export interface AdminSession {
  sub: string;
  email?: string;
  name?: string;
  role: "ADMIN";
}

let warned = false;

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is not set. Add it to your environment variables.");
    }
    if (!warned) {
      console.warn("[auth] JWT_SECRET is not set — using an insecure development secret.");
      warned = true;
    }
    return new TextEncoder().encode("pewee-insecure-dev-secret");
  }
  return new TextEncoder().encode(secret);
}

export async function signAdminToken(user: {
  id: string;
  email: string;
  name: string;
  role: string;
}): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getJwtSecret());
}

/** Returns the admin session for a token, or null if missing/invalid/not admin. */
export async function verifyAdminToken(token?: string): Promise<AdminSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (payload.role !== "ADMIN" || !payload.sub) return null;
    return {
      sub: payload.sub,
      email: payload.email as string | undefined,
      name: payload.name as string | undefined,
      role: "ADMIN",
    };
  } catch {
    return null;
  }
}

export function getAdminSession(req: NextRequest): Promise<AdminSession | null> {
  return verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
}
