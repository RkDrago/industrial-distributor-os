import { connectDB } from "./db";
import { getNotificationState } from "./settings";
import { Order } from "@/models/Order";
import { Inquiry } from "@/models/Inquiry";
import { Booking } from "@/models/Booking";
import { formatINRShort } from "./format";

/**
 * The notification centre is derived from records that already exist rather
 * than a parallel event log, so it can never claim an event the database does
 * not have. "Read" state is a single timestamp, which is why this is a pull
 * feed (the dashboard polls) and not a push channel.
 */

export type NotificationKind = "order" | "booking" | "inquiry" | "status";

export type AdminNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  summary: string;
  href: string;
  at: string;
  unread: boolean;
};

const STATUS_COPY: Record<string, string> = {
  pending: "marked pending",
  confirmed: "confirmed",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
};

export async function buildNotifications(limit = 40): Promise<{
  items: AdminNotification[];
  unreadCount: number;
  lastSeenAt: string | null;
}> {
  await connectDB();
  const { lastSeenAt } = await getNotificationState();
  const seenAt = lastSeenAt ? lastSeenAt.getTime() : 0;

  const [orders, inquiries, bookings] = await Promise.all([
    Order.find({}, "orderNumber companyName contactName customerEmail grandTotal orderStatus statusHistory createdAt")
      .sort({ createdAt: -1 })
      .limit(60)
      .lean<any[]>(),
    Inquiry.find({}, "inquiryNumber productTitle guestName guestEmail quantity status createdAt")
      .sort({ createdAt: -1 })
      .limit(40)
      .lean<any[]>(),
    Booking.find({}, "bookingNumber serviceType customerName companyName date slot status createdAt")
      .sort({ createdAt: -1 })
      .limit(40)
      .lean<any[]>(),
  ]);

  const items: AdminNotification[] = [];

  for (const order of orders) {
    const at = new Date(order.createdAt);
    const who = order.companyName || order.contactName || order.customerEmail || "Customer";
    items.push({
      id: `order-${order._id}`,
      kind: "order",
      title: `New order ${order.orderNumber ?? ""}`.trim(),
      summary: `${who} · ${formatINRShort(order.grandTotal)}`,
      href: `/admin/orders/${order._id}`,
      at: at.toISOString(),
      unread: at.getTime() > seenAt,
    });

    // Only surface meaningful status transitions, not the initial "new" entry.
    for (const entry of order.statusHistory ?? []) {
      if (!entry?.status || entry.status === "new") continue;
      const when = entry.at ? new Date(entry.at) : at;
      const copy = STATUS_COPY[entry.status] ?? entry.status;
      items.push({
        id: `status-${order._id}-${entry.status}-${when.getTime()}`,
        kind: "status",
        title: `Order ${order.orderNumber ?? ""} ${copy}`.trim(),
        summary: `${who} · updated by ${entry.by || "operations"}`,
        href: `/admin/orders/${order._id}`,
        at: when.toISOString(),
        unread: when.getTime() > seenAt,
      });
    }
  }

  for (const inquiry of inquiries) {
    const at = new Date(inquiry.createdAt);
    const who = inquiry.guestCompany || inquiry.guestName || inquiry.guestEmail || "Enquirer";
    items.push({
      id: `inquiry-${inquiry._id}`,
      kind: "inquiry",
      title: `New enquiry ${inquiry.inquiryNumber ?? ""}`.trim(),
      summary: `${who} · ${inquiry.productTitle ?? "Product"} · Qty ${inquiry.quantity ?? 1}`,
      href: `/admin/inquiries?focus=${inquiry._id}`,
      at: at.toISOString(),
      unread: at.getTime() > seenAt,
    });
  }

  for (const booking of bookings) {
    const at = new Date(booking.createdAt);
    const who = booking.companyName || booking.customerName || "Customer";
    items.push({
      id: `booking-${booking._id}`,
      kind: "booking",
      title: `New booking ${booking.bookingNumber ?? ""}`.trim(),
      summary: `${who} · ${booking.serviceType ?? "Appointment"}${booking.date ? ` · ${booking.date}` : ""}`,
      href: `/admin/bookings?focus=${booking._id}`,
      at: at.toISOString(),
      unread: at.getTime() > seenAt,
    });
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    items: items.slice(0, limit),
    unreadCount: items.filter((i) => i.unread).length,
    lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
  };
}
