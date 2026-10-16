import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { getAdminSession, requireAdmin } from "@/lib/auth";
import { cleanText, fail, isObjectId, isSameOrigin, ok, serverError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["new", "pending", "confirmed", "shipped", "delivered", "cancelled"] as const;
const ALLOWED_PAYMENT_STATUSES = ["not_applicable", "pending", "paid", "failed", "refunded"] as const;

/** Full order detail. Administrator only — orders contain customer PII. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const denied = requireAdmin();
  if (denied) return denied;
  if (!isObjectId(params.id)) return fail("Invalid order reference.", 400);

  try {
    await connectDB();
    const order = await Order.findById(params.id).lean<any>();
    if (!order) return fail("That order could not be found.", 404);
    return ok({ item: { ...order, _id: String(order._id) } });
  } catch (error) {
    return serverError("api/orders/[id]:GET", error);
  }
}

/**
 * Update the operational fields of an order.
 *
 * Status changes are appended to statusHistory so the customer-facing timeline
 * is a real record of what happened, not a synthesised guess. Cancelling an
 * order returns its quantities to stock exactly once.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const denied = requireAdmin();
  if (denied) return denied;
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site submissions are not allowed.", 403);
  if (!isObjectId(params.id)) return fail("Invalid order reference.", 400);

  try {
    const body = await req.json().catch(() => null);
    await connectDB();

    const order = await Order.findById(params.id);
    if (!order) return fail("That order could not be found.", 404);

    const update: Record<string, any> = {};
    let statusChanged = false;

    if (body?.orderStatus !== undefined) {
      const status = cleanText(body.orderStatus, 20);
      if (!ALLOWED_STATUSES.includes(status as any)) return fail("That order status is not supported.", 422);
      if (status !== order.orderStatus) {
        update.orderStatus = status;
        statusChanged = true;
      }
    }

    if (body?.paymentStatus !== undefined) {
      const paymentStatus = cleanText(body.paymentStatus, 20);
      if (!ALLOWED_PAYMENT_STATUSES.includes(paymentStatus as any)) {
        return fail("That payment status is not supported.", 422);
      }
      update.paymentStatus = paymentStatus;
    }

    if (body?.trackingNumber !== undefined) update.trackingNumber = cleanText(body.trackingNumber, 60);
    if (body?.courier !== undefined) update.courier = cleanText(body.courier, 80);
    if (body?.adminNote !== undefined) update.adminNote = cleanText(body.adminNote, 2000);

    // Shipping details cannot be marked shipped without a reference to share.
    const nextStatus = update.orderStatus ?? order.orderStatus;
    if (nextStatus === "shipped" && !(update.trackingNumber ?? order.trackingNumber)?.trim()) {
      return fail("Add a tracking number or courier reference before marking this order shipped.", 422);
    }

    if (!Object.keys(update).length) return fail("Nothing to update.", 400);

    if (statusChanged) {
      const actor = getAdminSession()?.email ?? "operations";
      update.$push = {
        statusHistory: {
          status: update.orderStatus,
          at: new Date(),
          by: actor,
          note: cleanText(body?.statusNote, 200) || `Status changed to ${update.orderStatus}`,
        },
      };

      // Cancelling releases the stock the order had reserved.
      if (update.orderStatus === "cancelled" && order.orderStatus !== "cancelled") {
        await Promise.all(
          (order.items ?? []).map((item: any) =>
            item?.productId
              ? Product.updateOne({ _id: item.productId }, { $inc: { stock: Math.max(0, Number(item.qty) || 0) } })
              : Promise.resolve()
          )
        );
      }
    }

    const updated = await Order.findByIdAndUpdate(params.id, update, { new: true }).lean<any>();
    return ok({ ok: true, item: { ...updated, _id: String(updated._id) } });
  } catch (error) {
    return serverError("api/orders/[id]:PATCH", error);
  }
}
