import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Inquiry } from "@/models/Inquiry";
import { Booking } from "@/models/Booking";
import { Product } from "@/models/Product";
import { requireAdmin } from "@/lib/auth";
import { ok, serverError } from "@/lib/http";
import { buildNotifications } from "@/lib/notifications";
import { getCommerceSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How many days of history the revenue figure covers. Stated in the UI. */
const REVENUE_WINDOW_DAYS = 30;

/**
 * Operations overview.
 *
 * Every number here is counted from the database at request time. The revenue
 * figure has an explicit window and excludes cancelled orders, and the UI
 * labels it that way rather than implying a lifetime total.
 */
export async function GET() {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    await connectDB();
    const settings = await getCommerceSettings();
    const windowStart = new Date(Date.now() - REVENUE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [
      totalOrders,
      openOrders,
      cancelledOrders,
      windowOrders,
      newInquiries,
      openInquiries,
      upcomingBookings,
      totalProducts,
      inactiveProducts,
      lowStock,
      outOfStock,
      recentOrders,
      topCategories,
      notificationFeed,
    ] = await Promise.all([
      Order.countDocuments({}),
      Order.countDocuments({ orderStatus: { $in: ["new", "pending", "confirmed", "shipped"] } }),
      Order.countDocuments({ orderStatus: "cancelled" }),
      Order.find({ createdAt: { $gte: windowStart }, orderStatus: { $ne: "cancelled" } }, "grandTotal").lean<any[]>(),
      Inquiry.countDocuments({ status: "new" }),
      Inquiry.countDocuments({ status: { $in: ["new", "contacted", "quoted"] } }),
      Booking.countDocuments({ status: { $in: ["booked", "confirmed"] } }),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: false }),
      Product.countDocuments({ isActive: true, stock: { $gt: 0, $lte: settings.lowStockThreshold } }),
      Product.countDocuments({ isActive: true, stock: { $lte: 0 } }),
      Order.find({}, "orderNumber companyName contactName customerEmail grandTotal orderStatus createdAt")
        .sort({ createdAt: -1 })
        .limit(6)
        .lean<any[]>(),
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: "$categoryId",
            products: { $sum: 1 },
            stockValue: { $sum: { $multiply: ["$stock", "$price.distributorPrice"] } },
          },
        },
        { $sort: { stockValue: -1 } },
        { $limit: 5 },
        {
          $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" },
        },
      ]),
      buildNotifications(6),
    ]);

    const revenueWindow = windowOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);

    const categoryIds = topCategories.map((c: any) => c._id).filter(Boolean);
    const categories = await (await import("@/models/Category")).Category.find({ _id: { $in: categoryIds } })
      .select("name slug")
      .lean<any[]>();
    const categoryMap = new Map(categories.map((c: any) => [String(c._id), c]));

    return ok({
      orders: {
        total: totalOrders,
        open: openOrders,
        cancelled: cancelledOrders,
      },
      revenue: {
        windowDays: REVENUE_WINDOW_DAYS,
        windowTotal: Math.round(revenueWindow * 100) / 100,
        windowOrderCount: windowOrders.length,
      },
      inquiries: { new: newInquiries, open: openInquiries },
      bookings: { upcoming: upcomingBookings },
      catalogue: {
        active: totalProducts,
        archived: inactiveProducts,
        lowStock,
        outOfStock,
        lowStockThreshold: settings.lowStockThreshold,
      },
      recentOrders: recentOrders.map((o) => ({ ...o, _id: String(o._id) })),
      topCategories: topCategories.map((c: any) => ({
        id: String(c._id),
        name: categoryMap.get(String(c._id))?.name ?? "Uncategorised",
        slug: categoryMap.get(String(c._id))?.slug ?? "",
        products: c.products,
        stockValue: Math.round((c.stockValue || 0) * 100) / 100,
      })),
      notifications: notificationFeed.items,
      notificationsUnread: notificationFeed.unreadCount,
    });
  } catch (error) {
    return serverError("api/admin/stats:GET", error);
  }
}
