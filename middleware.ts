import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge gate for the admin area.
 *
 * Verifies the signed session cookie before an admin page is rendered. Every
 * admin API additionally re-checks the session server-side, so this is the
 * outer layer rather than the only one.
 *
 * The signature is HMAC-SHA256 over the payload — identical to lib/auth.ts,
 * implemented with Web Crypto because middleware runs on the Edge runtime.
 */

const ADMIN_COOKIE = "ngz_admin";

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function isValidSession(token: string | undefined): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!token || !secret || secret.length < 24) return false;

  const index = token.lastIndexOf(".");
  if (index <= 0) return false;
  const payload = token.slice(0, index);
  const signature = token.slice(index + 1);

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const expected = bytesToBase64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
    if (!constantTimeEqual(signature, expected)) return false;

    const data = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
    return Boolean(data?.exp && typeof data.exp === "number" && data.exp > Date.now() && data.role === "admin");
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const authenticated = await isValidSession(token);

  if (pathname === "/admin/login") {
    if (authenticated) {
      const target = request.nextUrl.searchParams.get("next");
      const safeTarget = target && target.startsWith("/admin") ? target : "/admin";
      return NextResponse.redirect(new URL(safeTarget, request.url));
    }
    return NextResponse.next();
  }

  if (!authenticated) {
    const login = new URL("/admin/login", request.url);
    // Preserve where the operator was heading so sign-in is one hop.
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
