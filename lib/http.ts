import { NextResponse } from "next/server";

/** Standard JSON success response. */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data as any, {
    ...init,
    headers: { "cache-control": "no-store", ...(init?.headers ?? {}) },
  });
}

/** Standard JSON error response. Never leaks internal error text. */
export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status, headers: { "cache-control": "no-store" } });
}

export function serverError(scope: string, error: unknown) {
  console.error(`[${scope}]`, error);
  return fail("Something went wrong on our side. Please try again.", 500);
}

const MAX_BODY_BYTES = 128 * 1024;

/** Parse a JSON request body with a size guard. Throws on malformed input. */
export async function readJson<T = Record<string, any>>(req: Request): Promise<T> {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) throw new Error("Request body too large");
  if (!raw) return {} as T;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Body must be a JSON object");
    }
    return parsed as T;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

/**
 * Reject cross-site state changes. The admin session cookie is SameSite=Lax,
 * and this closes the remaining origin-based gap for both admin and public
 * mutations (including older browsers without SameSite support).
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  // Same-origin form/fetch requests from some clients omit Origin; allow those
  // only when there is no Origin to contradict, and rely on SameSite cookies.
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const host = req.headers.get("host");
    if (host && originHost === host) return true;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl) {
      try {
        if (new URL(siteUrl).host === originHost) return true;
      } catch {
        /* ignore malformed env value */
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Small in-process rate limiter. Enough to blunt accidental loops and casual
 * form spam without adding an infrastructure dependency. Per-instance only —
 * front this with a real limiter if you deploy to many regions.
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, remaining: limit - bucket.count, retryAfter: 0 };
}

/** Occasionally clear expired buckets so a long-lived process cannot grow forever. */
export function sweepRateLimit() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

/** Collapse a user-supplied string to a safe bounded length. */
export function cleanText(value: unknown, max = 500): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim().slice(0, max);
}

export function isEmail(value: unknown): boolean {
  const s = String(value ?? "").trim();
  if (s.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(s);
}

/** Indian GSTIN: 2-digit state + 10-char PAN + entity + Z + checksum. */
export function isGstin(value: unknown): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(String(value ?? "").trim().toUpperCase());
}

export function isPhone(value: unknown): boolean {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export function isObjectId(value: unknown): boolean {
  return /^[0-9a-fA-F]{24}$/.test(String(value ?? ""));
}

export function asInt(value: unknown, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}
