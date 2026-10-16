import { connectDB } from "@/lib/db";
import { Inquiry } from "@/models/Inquiry";
import { getAdminSession, requireAdmin } from "@/lib/auth";
import { cleanText, fail, isObjectId, isSameOrigin, ok, serverError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["new", "contacted", "quoted", "closed"] as const;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const denied = requireAdmin();
  if (denied) return denied;
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site submissions are not allowed.", 403);
  if (!isObjectId(params.id)) return fail("Invalid enquiry reference.", 400);

  try {
    const body = await req.json().catch(() => null);
    await connectDB();

    const inquiry = await Inquiry.findById(params.id);
    if (!inquiry) return fail("That enquiry could not be found.", 404);

    const update: Record<string, any> = {};
    let statusChanged = false;

    if (body?.status !== undefined) {
      const status = cleanText(body.status, 20);
      if (!ALLOWED.includes(status as any)) return fail("That enquiry status is not supported.", 422);
      if (status !== inquiry.status) {
        update.status = status;
        statusChanged = true;
      }
    }

    if (body?.quoteAmount !== undefined) {
      const amount = Number(body.quoteAmount);
      if (body.quoteAmount === "" || body.quoteAmount === null) {
        update.quoteAmount = undefined;
      } else if (!Number.isFinite(amount) || amount < 0) {
        return fail("Quote amount must be zero or more.", 422);
      } else {
        update.quoteAmount = Math.round(amount * 100) / 100;
      }
    }

    if (body?.adminNote !== undefined) update.adminNote = cleanText(body.adminNote, 2000);

    if (!Object.keys(update).length) return fail("Nothing to update.", 400);

    if (statusChanged) {
      update.$push = {
        statusHistory: {
          status: update.status,
          at: new Date(),
          by: getAdminSession()?.email ?? "operations",
          note: cleanText(body?.statusNote, 200) || `Marked ${update.status}`,
        },
      };
    }

    const updated = await Inquiry.findByIdAndUpdate(params.id, update, { new: true }).lean<any>();
    return ok({ ok: true, item: { ...updated, _id: String(updated._id) } });
  } catch (error) {
    return serverError("api/inquiries/[id]:PATCH", error);
  }
}
