import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { requireAdmin } from "@/lib/auth";
import { cleanText, fail, isSameOrigin, ok, serverError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(value: string) {
  return cleanText(value, 120)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function GET(req: Request) {
  try {
    await connectDB();
    const includeInactive = new URL(req.url).searchParams.get("includeInactive") === "1";
    const query = includeInactive ? {} : { isActive: true };
    const rows = await Category.find(query).sort({ name: 1 }).lean<any[]>();

    const counts = await Product.aggregate([
      { $match: includeInactive ? {} : { isActive: true } },
      { $group: { _id: "$categoryId", count: { $sum: 1 }, stock: { $sum: "$stock" } } },
    ]);
    const countMap = new Map<string, { count: number; stock: number }>(
      counts.map((c: any) => [String(c._id), { count: c.count, stock: c.stock ?? 0 }])
    );

    return ok({
      items: rows.map((row) => ({
        ...row,
        _id: String(row._id),
        parentId: row.parentId ? String(row.parentId) : null,
        productCount: countMap.get(String(row._id))?.count ?? 0,
        totalStock: countMap.get(String(row._id))?.stock ?? 0,
      })),
    });
  } catch (error) {
    return serverError("api/categories:GET", error);
  }
}

export async function POST(req: Request) {
  const denied = requireAdmin();
  if (denied) return denied;
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site form submissions are not allowed.", 403);

  try {
    const body = await req.json().catch(() => null);
    const name = cleanText(body?.name, 120);
    if (name.length < 2) return fail("Category name must be at least 2 characters.", 422);

    await connectDB();
    const slug = slugify(cleanText(body?.slug, 120) || name);
    if (!slug) return fail("Category name must contain letters or numbers.", 422);

    const clash = await Category.findOne({ slug }).lean();
    if (clash) return fail("A category with that name already exists.", 409);

    const parentId = body?.parentId && mongoose.isValidObjectId(body.parentId) ? body.parentId : null;

    const created = await Category.create({
      name,
      slug,
      description: cleanText(body?.description, 400),
      image: /^https?:\/\//i.test(cleanText(body?.image, 500)) ? cleanText(body.image, 500) : "",
      parentId,
      isActive: body?.isActive === undefined ? true : Boolean(body.isActive),
    });

    return NextResponse.json({ ok: true, id: String(created._id) }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 11000) return fail("A category with that name already exists.", 409);
    return serverError("api/categories:POST", error);
  }
}
