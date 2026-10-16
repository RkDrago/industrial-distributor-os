import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { cleanText, fail, getClientIp, isEmail, isSameOrigin, ok, rateLimit, serverError, sweepRateLimit } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Guest order tracking.
 *
 * There is no customer login, so an order is only released when the caller
 * knows *both* the order number and the email address on the order. Responses
 * are rate limited and intentionally vague about which of the two was wrong.
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site submissions are not allowed.", 403);

  try {
    sweepRateLimit();
    const ip = getClientIp(req);
    const limited = rateLimit(`track:${ip}`, 15, 10 * 60_000);
    if (!limited.allowed) {
      return fail(
        `Too many lookup attempts. Please try again in ${Math.ceil(limited.retryAfter / 60)} minute(s).`,
        429
      );
    }

    const body = await req.json().catch(() => null);
    const orderNumber = cleanText(body?.orderNumber, 40).toUpperCase();
    const email = cleanText(body?.email, 254).toLowerCase();

    if (!orderNumber || !isEmail(email)) {
      return fail("Enter the order number and the email address used on the order.", 422);
    }

    await connectDB();
    const order = await Order.findOne({ orderNumber, customerEmail: email }).lean<any>();

    if (!order) {
      return fail(
        "We could not match that order number and email address. Check the confirmation email, or contact us and we'll look it up.",
        404
      );
    }

    return ok({
      order: {
        id: String(order._id),
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        items: order.items,
        subtotal: order.subtotal,
        gstTotal: order.gstTotal,
        deliveryCharge: order.deliveryCharge ?? 0,
        grandTotal: order.grandTotal,
        companyName: order.companyName,
        gstin: order.gstin,
        contactName: order.contactName,
        customerEmail: order.customerEmail,
        contactPhone: order.contactPhone,
        billingAddress: order.billingAddress,
        shippingAddress: order.shippingAddress,
        statusHistory: order.statusHistory ?? [],
        trackingNumber: order.trackingNumber,
        courier: order.courier,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    return serverError("api/orders/track:POST", error);
  }
}
