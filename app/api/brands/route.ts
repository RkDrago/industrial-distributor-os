import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Brand } from "@/models/Brand";
import { Product } from "@/models/Product";
import { requireAdmin } from "@/lib/auth";
import { cleanText, fail, isSameOrigin, ok, serverError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const rows = await Brand.find().sort({ name: 1 }).lean<any[]>();
    const counts = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$brandId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map<string, number>(counts.map((c: any) => [String(c._id), c.count]));
    return ok({
      items: rows.map((row) => ({
        ...row,
        _id: String(row._id),
        productCount: countMap.get(String(row._id)) ?? 0,
      })),
    });
  } catch (error) {
    return serverError("api/brands:GET", error);
  }
}

export async function POST(req: Request) {
  const denied = requireAdmin();
  if (denied) return denied;
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site form submissions are not allowed.", 403);

  try {
    const body = await req.json().catch(() => null);
    const name = cleanText(body?.name, 120);
    if (name.length < 2) return fail("Brand name must be at least 2 characters.", 422);

    const slug = name
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);

    await connectDB();
    const clash = await Brand.findOne({ slug }).lean();
    if (clash) return fail("A brand with that name already exists.", 409);

    const created = await Brand.create({
      name,
      slug,
      logo: /^https?:\/\//i.test(cleanText(body?.logo, 500)) ? cleanText(body.logo, 500) : "",
    });

    return NextResponse.json({ ok: true, id: String(created._id) }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 11000) return fail("A brand with that name already exists.", 409);
    return serverError("api/brands:POST", error);
  }
}
