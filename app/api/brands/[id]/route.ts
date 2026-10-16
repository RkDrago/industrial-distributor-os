import { connectDB } from "@/lib/db";
import { Brand } from "@/models/Brand";
import { Product } from "@/models/Product";
import { requireAdmin } from "@/lib/auth";
import { cleanText, fail, isObjectId, isSameOrigin, ok, serverError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const denied = requireAdmin();
  if (denied) return denied;
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site form submissions are not allowed.", 403);
  if (!isObjectId(params.id)) return fail("Invalid brand.", 400);

  try {
    const body = await req.json().catch(() => null);
    const update: Record<string, any> = {};

    if (body?.name !== undefined) {
      const name = cleanText(body.name, 120);
      if (name.length < 2) return fail("Brand name must be at least 2 characters.", 422);
      update.name = name;
      update.slug = name
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
    }
    if (body?.logo !== undefined) {
      const logo = cleanText(body.logo, 500);
      update.logo = /^https?:\/\//i.test(logo) ? logo : "";
    }

    if (!Object.keys(update).length) return fail("Nothing to update.", 400);

    await connectDB();
    const updated = await Brand.findByIdAndUpdate(params.id, { $set: update }, { new: true }).lean<any>();
    if (!updated) return fail("That brand could not be found.", 404);
    return ok({ ok: true, item: { ...updated, _id: String(updated._id) } });
  } catch (error: any) {
    if (error?.code === 11000) return fail("A brand with that name already exists.", 409);
    return serverError("api/brands/[id]:PATCH", error);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const denied = requireAdmin();
  if (denied) return denied;
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site form submissions are not allowed.", 403);
  if (!isObjectId(params.id)) return fail("Invalid brand.", 400);

  try {
    await connectDB();
    const count = await Product.countDocuments({ brandId: params.id });
    if (count > 0) {
      return fail(
        `${count} product${count === 1 ? "" : "s"} still use this brand. Reassign them before deleting it.`,
        409
      );
    }
    const removed = await Brand.findByIdAndDelete(params.id);
    if (!removed) return fail("That brand could not be found.", 404);
    return ok({ ok: true });
  } catch (error) {
    return serverError("api/brands/[id]:DELETE", error);
  }
}
