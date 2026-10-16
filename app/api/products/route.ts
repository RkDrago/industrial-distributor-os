import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { getAdminSession, requireAdmin } from "@/lib/auth";
import { cleanText, fail, isSameOrigin, ok, rateLimit, serverError, sweepRateLimit } from "@/lib/http";
import { parseProductInput } from "@/lib/validators";
import { queryCatalogue } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public catalogue query.
 *
 * Supports search, category/brand/price/availability filters, sorting and
 * pagination, and returns facet counts so the filter panel can show how many
 * products each option would yield. Shares its implementation with the
 * catalogue page so the two can never disagree.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const includeInactive =
      url.searchParams.get("includeInactive") === "1" && Boolean(getAdminSession());

    const result = await queryCatalogue({
      search: url.searchParams.get("search") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      brand: url.searchParams.get("brand") ?? undefined,
      availability: url.searchParams.get("availability") ?? undefined,
      minPrice: url.searchParams.get("minPrice") ? Number(url.searchParams.get("minPrice")) : null,
      maxPrice: url.searchParams.get("maxPrice") ? Number(url.searchParams.get("maxPrice")) : null,
      sort: url.searchParams.get("sort") ?? undefined,
      page: Number(url.searchParams.get("page") ?? 1),
      pageSize: Number(url.searchParams.get("pageSize") ?? 12),
      featuredOnly: url.searchParams.get("featured") === "true",
      includeInactive,
    });

    if (result.error) return fail("Unable to load products right now. Please try again.", 503);
    return ok(result);
  } catch (error) {
    return serverError("api/products:GET", error);
  }
}

/** Create a product. Administrator only. */
export async function POST(req: Request) {
  const denied = requireAdmin();
  if (denied) return denied;
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site form submissions are not allowed.", 403);

  try {
    sweepRateLimit();
    const limited = rateLimit(`products:create:${getAdminSession()?.email}`, 60, 60_000);
    if (!limited.allowed) return fail("Too many product changes in a row. Please wait a moment.", 429);

    const body = await req.json().catch(() => null);
    const parsed = parseProductInput(body, { partial: false });
    if (!parsed.ok) return fail(parsed.errors[0], 422, { errors: parsed.errors });

    await connectDB();
    const value = parsed.value as Required<Pick<any, "title" | "sku">>;
    const slug = cleanText(value.title, 180)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);

    const existing = await Product.findOne({ $or: [{ sku: value.sku }, { slug }] }).lean<any>();
    if (existing) {
      const conflict = existing.sku === value.sku ? "SKU" : "Product name";
      return fail(`${conflict} already exists. Use a different ${conflict.toLowerCase()}.`, 409);
    }

    const created = await Product.create({ ...value, slug, type: "product" });
    return NextResponse.json({ ok: true, id: String(created._id), slug }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 11000) return fail("That SKU or product name is already in use.", 409);
    return serverError("api/products:POST", error);
  }
}
