import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A signed reference to a single order.
 *
 * After checkout we drop this in an HttpOnly cookie so the confirmation page
 * can render the order that was just placed without asking the customer to
 * re-enter their email, and without any endpoint that enumerates orders.
 * It carries no personal data — only an order id.
 */

const COOKIE_NAME = "ngz_order_ref";
const TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

export const ORDER_REF_COOKIE = COOKIE_NAME;

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.NEXTAUTH_SECRET || "";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(`order-ref:${value}`).digest("base64url");
}

export function createOrderRef(orderId: string): string {
  return `${orderId}.${sign(orderId)}`;
}

export function verifyOrderRef(token: string | undefined | null): string | null {
  if (!token || typeof token !== "string") return null;
  const index = token.lastIndexOf(".");
  if (index < 0) return null;
  const orderId = token.slice(0, index);
  const signature = token.slice(index + 1);
  if (!orderId || !signature) return null;

  let expected: string;
  try {
    expected = sign(orderId);
  } catch {
    return null;
  }

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return orderId;
}

export const ORDER_REF_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: TTL_MS / 1000,
};
