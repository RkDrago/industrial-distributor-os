import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { Brand } from "@/models/Brand";
import { Order } from "@/models/Order";
import { getAdminSession, requireAdmin } from "@/lib/auth";
import { cleanText, fail, isObjectId, isSameOrigin, ok, serverError } from "@/lib/http";
import { parseProductInput } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Look a product up by Mongo id or by slug. */
async function loadProduct(idOrSlug: string) {
  const query = isObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() };
  return Product.findOne(query).lean<any>();
}

/** Public product detail. Inactive products are hidden unless an admin asks. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const row = await loadProduct(params.id);
    if (!row) return fail("That product could not be found.", 404);
    if (!row.isActive && !getAdminSession()) return fail("That product is no longer available.", 404);

    const [category, brand] = await Promise.all([
      row.categoryId ? Category.findById(row.categoryId).lean<any>() : Promise.resolve(null),
      row.brandId ? Brand.findById(row.brandId).lean<any>() : Promise.resolve(null),
    ]);

    // Related products: same category first, then the same brand.
    const relatedQuery: Record<string, any> = { _id: { $ne: row._id }, isActive: true };
    if (row.categoryId) relatedQuery.categoryId = row.categoryId;
    else if (row.brandId) relatedQuery.brandId = row.brandId;
    const related = await Product.find(relatedQuery).sort({ featured: -1, createdAt: -1 }).limit(4).lean<any[]>();

    return ok({
      item: {
        ...row,
        _id: String(row._id),
        categoryId: row.categoryId ? String(row.categoryId) : null,
        brandId: row.brandId ? String(row.brandId) : null,
        category: category ? { id: String(category._id), name: category.name, slug: category.slug } : null,
        brand: brand ? { id: String(brand._id), name: brand.name, slug: brand.slug } : null,
      },
      related: related.map((r) => ({ ...r, _id: String(r._id) })),
    });
  } catch (error) {
    return serverError("api/products/[id]:GET", error);
  }
}

/** Update a product. Administrator only. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const denied = requireAdmin();
  if (denied) return denied;
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site form submissions are not allowed.", 403);

  try {
    const body = await req.json().catch(() => null);
    const parsed = parseProductInput(body, { partial: true });
    if (!parsed.ok) return fail(parsed.errors[0], 422, { errors: parsed.errors });

    await connectDB();
    const existing = await loadProduct(params.id);
    if (!existing) return fail("That product could not be found.", 404);

    const update: Record<string, any> = { ...parsed.value };

    // Keep the slug in step with the name, but never collide with another product.
    if (parsed.value.title) {
      const slug = cleanText(parsed.value.title, 180)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
      const clash = await Product.findOne({ slug, _id: { $ne: existing._id } }).select("_id").lean();
      if (clash) return fail("Another product already uses a very similar name.", 409);
      update.slug = slug;
    }

    if (parsed.value.sku) {
      const clash = await Product.findOne({ sku: parsed.value.sku, _id: { $ne: existing._id } })
        .select("_id")
        .lean();
      if (clash) return fail("That SKU is already in use.", 409);
    }

    // Pricing arrives as a whole object; merge so a partial edit cannot drop tiers.
    if (parsed.value.price) {
      update.price = {
        mrp: parsed.value.price.mrp,
        distributorPrice: parsed.value.price.distributorPrice,
        bulkSlabs: parsed.value.price.bulkSlabs,
      };
    }

    const updated = await Product.findByIdAndUpdate(existing._id, { $set: update }, { new: true, runValidators: true }).lean<any>();
    return ok({ ok: true, item: { ...updated, _id: String(updated._id) } });
  } catch (error: any) {
    if (error?.code === 11000) return fail("That SKU or product name is already in use.", 409);
    return serverError("api/products/[id]:PATCH", error);
  }
}

/**
 * Remove a product.
 *
 * Default behaviour is to archive (isActive = false) so existing orders and
 * invoices keep resolving their line items. A hard delete is only allowed for
 * a product that has never been ordered, which is why it must be explicit.
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const denied = requireAdmin();
  if (denied) return denied;
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site form submissions are not allowed.", 403);

  try {
    await connectDB();
    const existing = await loadProduct(params.id);
    if (!existing) return fail("That product could not be found.", 404);

    const mode = new URL(req.url).searchParams.get("mode") === "delete" ? "delete" : "archive";

    if (mode === "archive") {
      await Product.findByIdAndUpdate(existing._id, { $set: { isActive: false } });
      return ok({ ok: true, mode: "archive" });
    }

    const referenced = await Order.countDocuments({ "items.productId": existing._id });
    if (referenced > 0) {
      return fail(
        `This product appears on ${referenced} order${referenced === 1 ? "" : "s"}, so it has been archived instead of deleted to keep order history intact.`,
        409,
        { archived: true }
      );
    }

    await Product.findByIdAndDelete(existing._id);
    return ok({ ok: true, mode: "delete" });
  } catch (error) {
    return serverError("api/products/[id]:DELETE", error);
  }
}
