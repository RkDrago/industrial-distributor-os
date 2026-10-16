import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_OPTIONS,
  createSessionToken,
  getAdminSession,
  isAdminConfigured,
  verifyAdminCredentials,
} from "@/lib/auth";
import { adminExistsInDatabase, ensureDefaultAdminOnce } from "@/lib/bootstrap-admin";
import { cleanText, fail, getClientIp, isSameOrigin, ok, rateLimit, serverError, sweepRateLimit } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin access is possible when the environment operator is configured or when
 * the users collection holds an administrator. Both the login page and the
 * sign-in handler read this, and the bootstrap below is what guarantees the
 * second case on a fresh deployment.
 */
async function accessState() {
  const bootstrap = await ensureDefaultAdminOnce();
  const configured = isAdminConfigured() || (await adminExistsInDatabase());
  return { configured, bootstrap: bootstrap.status };
}

/** Current admin session state, used to render the login form or the shell. */
export async function GET() {
  const session = getAdminSession();
  const { configured } = await accessState();
  return ok({
    configured,
    authenticated: Boolean(session),
    email: session?.email ?? null,
  });
}

/** Sign in with the configured administrator account. */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site sign-in attempts are not allowed.", 403);

  try {
    sweepRateLimit();
    const ip = getClientIp(req);
    // Credential stuffing is the realistic threat here, so throttle hard.
    const limited = rateLimit(`admin-login:${ip}`, 8, 15 * 60_000);
    if (!limited.allowed) {
      return fail(
        `Too many sign-in attempts. Try again in ${Math.ceil(limited.retryAfter / 60)} minute(s).`,
        429
      );
    }

    const { configured } = await accessState();
    if (!configured) {
      return fail(
        "Administrator access is not configured on this deployment. Set ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_SESSION_SECRET.",
        503
      );
    }
    if (!process.env.ADMIN_SESSION_SECRET) {
      // The session cookie cannot be signed without it, so fail clearly here
      // rather than surfacing an opaque 500 after a valid credential check.
      return fail("ADMIN_SESSION_SECRET is not set, so admin sessions cannot be signed.", 503);
    }

    const body = await req.json().catch(() => null);
    const email = cleanText(body?.email, 254);
    const password = String(body?.password ?? "");

    if (!email || !password) return fail("Enter your email address and password.", 422);
    if (password.length > 200) return fail("Email address or password is incorrect.", 401);

    const valid = await verifyAdminCredentials(email, password);
    if (!valid) return fail("Email address or password is incorrect.", 401);

    const { token, expiresAt } = createSessionToken(email.trim().toLowerCase());
    const response = NextResponse.json(
      { ok: true, email: email.trim().toLowerCase(), expiresAt: expiresAt.toISOString() },
      { headers: { "cache-control": "no-store" } }
    );
    response.cookies.set(ADMIN_COOKIE, token, ADMIN_COOKIE_OPTIONS);
    return response;
  } catch (error) {
    return serverError("api/admin/session:POST", error);
  }
}

/** Sign out. */
export async function DELETE(req: Request) {
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site requests are not allowed.", 403);
  const response = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  response.cookies.set(ADMIN_COOKIE, "", { ...ADMIN_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
