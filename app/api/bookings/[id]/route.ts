import { connectDB } from "@/lib/db";
import { Booking } from "@/models/Booking";
import { getAdminSession, requireAdmin } from "@/lib/auth";
import { cleanText, fail, isObjectId, isSameOrigin, ok, serverError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["booked", "confirmed", "completed", "cancelled"] as const;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const denied = requireAdmin();
  if (denied) return denied;
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site submissions are not allowed.", 403);
  if (!isObjectId(params.id)) return fail("Invalid booking reference.", 400);

  try {
    const body = await req.json().catch(() => null);
    await connectDB();

    const booking = await Booking.findById(params.id);
    if (!booking) return fail("That booking could not be found.", 404);

    const update: Record<string, any> = {};
    if (body?.status !== undefined) {
      const status = cleanText(body.status, 20);
      if (!ALLOWED.includes(status as any)) return fail("That booking status is not supported.", 422);
      if (status !== booking.status) {
        update.status = status;
        update.$push = {
          statusHistory: {
            status,
            at: new Date(),
            by: getAdminSession()?.email ?? "operations",
            note: cleanText(body?.statusNote, 200) || `Marked ${status}`,
          },
        };
      }
    }
    if (body?.adminNote !== undefined) update.adminNote = cleanText(body.adminNote, 2000);

    if (!Object.keys(update).length) return fail("Nothing to update.", 400);

    const updated = await Booking.findByIdAndUpdate(params.id, update, { new: true }).lean<any>();
    return ok({ ok: true, item: { ...updated, _id: String(updated._id) } });
  } catch (error) {
    return serverError("api/bookings/[id]:PATCH", error);
  }
}
