"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  IndianRupee,
  MessageSquareQuote,
  PackageSearch,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { AdminPanel, DefinitionNote, MetricCard } from "./ui";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { Alert, ErrorState, TableSkeleton } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { formatINR, formatNumber, formatRelative } from "@/lib/format";
import type { AdminNotificationDto } from "@/lib/types";

type Stats = {
  orders: { total: number; open: number; cancelled: number };
  revenue: { windowDays: number; windowTotal: number; windowOrderCount: number };
  inquiries: { new: number; open: number };
  bookings: { upcoming: number };
  catalogue: { active: number; archived: number; lowStock: number; outOfStock: number; lowStockThreshold: number };
  recentOrders: {
    _id: string;
    orderNumber?: string;
    companyName?: string;
    contactName?: string;
    customerEmail?: string;
    grandTotal?: number;
    orderStatus: string;
    createdAt: string;
  }[];
  topCategories: { id: string; name: string; slug: string; products: number; stockValue: number }[];
  notifications: AdminNotificationDto[];
  notificationsUnread: number;
};

export function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      setStats(await response.json());
      setError(false);
      setRefreshedAt(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <ErrorState
        title="We could not load the dashboard"
        description="The metrics could not be read from the database. Check that MongoDB is reachable, then retry."
        onRetry={load}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {refreshedAt ? `Updated ${formatRelative(refreshedAt)}` : "Loading metrics…"} · figures are counted live, not
          cached
        </p>
        <Button size="sm" variant="outline" onClick={load} loading={loading} icon={<RefreshCw size={15} />}>
          Refresh
        </Button>
      </div>

      {loading && !stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-card border border-line bg-surface p-5">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton mt-3 h-8 w-20" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Open orders"
              value={formatNumber(stats.orders.open)}
              hint={`${formatNumber(stats.orders.total)} orders all time`}
              icon={<ShoppingBag size={17} />}
              tone="brand"
              href="/admin/orders"
              hrefLabel="Manage orders"
            />
            <MetricCard
              label={`Revenue · last ${stats.revenue.windowDays} days`}
              value={formatINR(stats.revenue.windowTotal)}
              hint={`${formatNumber(stats.revenue.windowOrderCount)} orders in this period`}
              icon={<IndianRupee size={17} />}
              tone="brand"
            />
            <MetricCard
              label="New enquiries"
              value={formatNumber(stats.inquiries.new)}
              hint={`${formatNumber(stats.inquiries.open)} open in total`}
              icon={<MessageSquareQuote size={17} />}
              tone={stats.inquiries.new > 0 ? "warning" : "neutral"}
              href="/admin/inquiries"
              hrefLabel="Review enquiries"
            />
            <MetricCard
              label="Stock attention"
              value={formatNumber(stats.catalogue.lowStock + stats.catalogue.outOfStock)}
              hint={`${formatNumber(stats.catalogue.outOfStock)} out of stock · ${formatNumber(
                stats.catalogue.lowStock
              )} low (≤${stats.catalogue.lowStockThreshold})`}
              icon={<AlertTriangle size={17} />}
              tone={stats.catalogue.outOfStock > 0 ? "danger" : stats.catalogue.lowStock > 0 ? "warning" : "neutral"}
              href="/admin/inventory"
              hrefLabel="Open inventory"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <MetricCard
              label="Active products"
              value={formatNumber(stats.catalogue.active)}
              hint={`${formatNumber(stats.catalogue.archived)} archived`}
              icon={<PackageSearch size={17} />}
              href="/admin/products"
              hrefLabel="Manage catalogue"
            />
            <MetricCard
              label="Upcoming bookings"
              value={formatNumber(stats.bookings.upcoming)}
              hint="Calls and site visits that are booked or confirmed"
              icon={<CalendarClock size={17} />}
              href="/admin/bookings"
              hrefLabel="View bookings"
            />
            <MetricCard
              label="Cancelled orders"
              value={formatNumber(stats.orders.cancelled)}
              hint="Kept for the record; stock is returned on cancellation"
              icon={<ShoppingBag size={17} />}
              tone={stats.orders.cancelled > 0 ? "warning" : "neutral"}
            />
          </div>

          <DefinitionNote>
            Revenue counts non-cancelled orders placed in the last {stats.revenue.windowDays} days, using the order total
            stored when the order was placed (taxable value + GST + any configured delivery charge). It is not a
            payments-received figure, because payment is settled through your normal invoicing process.
          </DefinitionNote>

          <div className="grid gap-4 lg:grid-cols-2">
            <AdminPanel
              title="Recent orders"
              description="The latest orders received through the storefront."
              actions={
                <Link href="/admin/orders" className="btn btn-outline btn-sm">
                  View all
                </Link>
              }
            >
              {stats.recentOrders.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted">
                  No orders yet. New orders appear here as soon as they are placed.
                </p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Order</th>
                        <th scope="col">Customer</th>
                        <th scope="col">Total</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentOrders.map((order) => (
                        <tr key={order._id}>
                          <td>
                            <Link href={`/admin/orders/${order._id}`} className="font-semibold text-navy-900 hover:text-brand-700">
                              {order.orderNumber ?? "—"}
                            </Link>
                            <p className="mt-0.5 text-xs text-muted">{formatRelative(order.createdAt)}</p>
                          </td>
                          <td>
                            <p className="text-sm text-navy-800">{order.companyName || order.contactName || "—"}</p>
                            <p className="mt-0.5 text-xs text-muted">{order.customerEmail || "—"}</p>
                          </td>
                          <td className="tabular-nums">{formatINR(order.grandTotal ?? 0)}</td>
                          <td>
                            <OrderStatusBadge status={order.orderStatus} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminPanel>

            <div className="space-y-4">
              <AdminPanel
                title="Recent activity"
                description="New orders, bookings, enquiries and status changes. This feed polls every 10 seconds."
                actions={
                  <Link href="/admin/notifications" className="btn btn-outline btn-sm">
                    Full log
                  </Link>
                }
              >
                {stats.notifications.length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-muted">No activity recorded yet.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {stats.notifications.map((item) => (
                      <li key={item.id} className="flex items-start gap-3 px-5 py-3">
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            item.unread ? "bg-brand-500" : "bg-navy-200"
                          }`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <Link href={item.href} className="text-[13px] font-semibold text-navy-900 hover:text-brand-700">
                            {item.title}
                          </Link>
                          <p className="mt-0.5 text-xs leading-5 text-muted">{item.summary}</p>
                        </div>
                        <span className="shrink-0 text-[11px] text-navy-300">{formatRelative(item.at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </AdminPanel>

              <AdminPanel
                title="Stock value by category"
                description="Units on hand valued at the distributor price, highest first."
              >
                {stats.topCategories.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-muted">No stock recorded yet.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {stats.topCategories.map((category) => (
                      <li key={category.id} className="flex items-center justify-between gap-4 px-5 py-3">
                        <div className="min-w-0">
                          <Link
                            href={`/products?category=${category.slug}`}
                            className="text-sm font-medium text-navy-800 hover:text-brand-700"
                          >
                            {category.name}
                          </Link>
                          <p className="mt-0.5 text-xs text-muted">{formatNumber(category.products)} products</p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-navy-900">
                          {formatINR(category.stockValue)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </AdminPanel>
            </div>
          </div>

          {stats.inquiries.new > 0 && (
            <Alert tone="warning" title={`${stats.inquiries.new} new enquir${stats.inquiries.new === 1 ? "y" : "ies"} waiting`}>
              Respond quickly — enquiries usually turn into orders when they are answered the same day.
              <div className="mt-3">
                <Link href="/admin/inquiries" className="btn btn-outline btn-sm">
                  Open enquiries
                </Link>
              </div>
            </Alert>
          )}
        </>
      ) : (
        <TableSkeleton rows={4} cols={4} />
      )}
    </div>
  );
}
