import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { connectDB } from "./db";
import { fail } from "./http";
import { User } from "@/models/User";

/**
 * Admin authentication.
 *
 * A deliberately small surface, with a signed, HttpOnly, SameSite=Lax cookie.
 * No third-party session store is required, and no admin data is reachable
 * without a valid signature.
 *
 * Two credential sources are accepted:
 *  1. The environment operator (ADMIN_EMAIL / ADMIN_PASSWORD or
 *     ADMIN_PASSWORD_HASH) — a break-glass account that survives a database
 *     problem, useful for recovering access.
 *  2. Administrator records in the users collection, created by the default
 *     admin bootstrap or by an operator.
 *
 * Customer checkout is guest-based, so there is no customer session to manage.
 */

export const ADMIN_COOKIE = "ngz_admin";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

export type AdminSession = {
  email: string;
  role: "admin";
  exp: number;
};

function secret(): string {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 24) {
    throw new Error(
      "ADMIN_SESSION_SECRET must be set to a random string of at least 24 characters (see .env.example)."
    );
  }
  return value;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(email: string): { token: string; expiresAt: Date } {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = base64url(JSON.stringify({ email, role: "admin", exp, n: randomBytes(8).toString("hex") }));
  return { token: `${payload}.${sign(payload)}`, expiresAt: new Date(exp) };
}

export function verifySessionToken(token: string | undefined | null): AdminSession | null {
  if (!token || typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return null;
  }

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data?.exp || typeof data.exp !== "number" || data.exp < Date.now()) return null;
    if (data.role !== "admin" || typeof data.email !== "string") return null;
    return { email: data.email, role: "admin", exp: data.exp };
  } catch {
    return null;
  }
}

/** Current admin session from the request cookies, or null. */
export function getAdminSession(): AdminSession | null {
  try {
    return verifySessionToken(cookies().get(ADMIN_COOKIE)?.value);
  } catch {
    return null;
  }
}

export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
};

/**
 * Guard for API route handlers.
 * Returns a 401/403 NextResponse to return directly, or null when authorised.
 */
export function requireAdmin(): ReturnType<typeof fail> | null {
  const session = getAdminSession();
  if (!session) return fail("Administrator sign-in required.", 401);
  return null;
}

/** Constant-time credential check against the environment operator account. */
async function envOperatorMatches(email: string, password: string): Promise<boolean> {
  const configuredEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const configuredPassword = process.env.ADMIN_PASSWORD || "";
  const configuredHash = process.env.ADMIN_PASSWORD_HASH || "";

  if (!configuredEmail || (!configuredPassword && !configuredHash)) return false;

  const emailMatches =
    email.length === configuredEmail.length &&
    timingSafeEqual(Buffer.from(email), Buffer.from(configuredEmail));

  let passwordMatches = false;
  if (configuredHash) {
    try {
      passwordMatches = await bcrypt.compare(password, configuredHash);
    } catch {
      passwordMatches = false;
    }
  } else if (configuredPassword) {
    passwordMatches =
      password.length === configuredPassword.length &&
      timingSafeEqual(Buffer.from(password), Buffer.from(configuredPassword));
  }

  // Always run both comparisons to keep the response time stable.
  return emailMatches && passwordMatches;
}

/**
 * Credential check against administrators stored in the users collection.
 * A database outage must not take the environment operator down with it, which
 * is why this reports `false` instead of throwing.
 */
async function databaseAdminMatches(email: string, password: string): Promise<boolean> {
  if (!email || !password) return false;
  try {
    await connectDB();
    const user = await User.findOne({ email, role: "admin" }).lean<any>();
    if (!user?.password) return false;
    return await bcrypt.compare(password, String(user.password));
  } catch (error) {
    console.error("[auth] administrator lookup failed", error);
    return false;
  }
}

/**
 * Verify an administrator sign-in against both credential sources.
 * The environment operator is checked first so a database problem can never
 * lock the operator out of their own deployment.
 */
export async function verifyAdminCredentials(email: unknown, password: unknown): Promise<boolean> {
  const providedEmail = String(email ?? "").trim().toLowerCase();
  const providedPassword = String(password ?? "");
  if (!providedEmail || !providedPassword) return false;

  if (await envOperatorMatches(providedEmail, providedPassword)) return true;
  return databaseAdminMatches(providedEmail, providedPassword);
}

/**
 * True when the environment operator is configured. This is synchronous and
 * only describes the environment; the sign-in route also accepts a database
 * administrator, so use `hasAnyAdminAccount` before refusing a sign-in.
 */
export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_EMAIL &&
      (process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD_HASH) &&
      process.env.ADMIN_SESSION_SECRET
  );
}
