import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { requireAdmin } from "@/lib/auth";
import { cleanText, fail, isObjectId, isSameOrigin, ok, serverError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const denied = requireAdmin();
  if (denied) return denied;
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site form submissions are not allowed.", 403);
  if (!isObjectId(params.id)) return fail("Invalid category.", 400);

  try {
    const body = await req.json().catch(() => null);
    const update: Record<string, any> = {};

    if (body?.name !== undefined) {
      const name = cleanText(body.name, 120);
      if (name.length < 2) return fail("Category name must be at least 2 characters.", 422);
      update.name = name;
      update.slug = name
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
    }
    if (body?.description !== undefined) update.description = cleanText(body.description, 400);
    if (body?.image !== undefined) {
      const image = cleanText(body.image, 500);
      update.image = /^https?:\/\//i.test(image) ? image : "";
    }
    if (body?.isActive !== undefined) update.isActive = Boolean(body.isActive);

    if (!Object.keys(update).length) return fail("Nothing to update.", 400);

    await connectDB();
    const updated = await Category.findByIdAndUpdate(params.id, { $set: update }, { new: true }).lean<any>();
    if (!updated) return fail("That category could not be found.", 404);
    return ok({ ok: true, item: { ...updated, _id: String(updated._id) } });
  } catch (error: any) {
    if (error?.code === 11000) return fail("A category with that name already exists.", 409);
    return serverError("api/categories/[id]:PATCH", error);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const denied = requireAdmin();
  if (denied) return denied;
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site form submissions are not allowed.", 403);
  if (!isObjectId(params.id)) return fail("Invalid category.", 400);

  try {
    await connectDB();
    const mode = new URL(req.url).searchParams.get("mode") === "delete" ? "delete" : "archive";

    if (mode === "archive") {
      const updated = await Category.findByIdAndUpdate(params.id, { $set: { isActive: false } }, { new: true });
      if (!updated) return fail("That category could not be found.", 404);
      return ok({ ok: true, mode: "archive" });
    }

    const count = await Product.countDocuments({ categoryId: params.id });
    if (count > 0) {
      return fail(
        `${count} product${count === 1 ? "" : "s"} still use this category, so it has been hidden instead of deleted. Reassign them first to delete it.`,
        409,
        { archived: true }
      );
    }

    const removed = await Category.findByIdAndDelete(params.id);
    if (!removed) return fail("That category could not be found.", 404);
    return ok({ ok: true, mode: "delete" });
  } catch (error) {
    return serverError("api/categories/[id]:DELETE", error);
  }
}
