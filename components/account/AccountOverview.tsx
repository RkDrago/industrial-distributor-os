"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, Clock, PackageSearch, Truck } from "lucide-react";
import { Skeleton } from "@/components/ui/feedback";
import { formatDate, formatINR } from "@/lib/format";
import { loadCompany, loadRecentOrders, type CompanyProfile, type RecentOrder } from "@/lib/local-store";

export function AccountOverview() {
  const [hydrated, setHydrated] = useState(false);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [orders, setOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    const profile = loadCompany();
    const hasProfile = Object.values(profile).some((value) => value.trim().length > 0);
    setCompany(hasProfile ? profile : null);
    setOrders(loadRecentOrders());
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-line bg-surface p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
            <Building2 size={14} className="text-brand-600" />
            Company
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-navy-900">
            {company?.companyName || "Not saved yet"}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {company?.contactName || "Add your details to speed up checkout"}
          </p>
        </div>

        <div className="rounded-card border border-line bg-surface p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
            <Clock size={14} className="text-brand-600" />
            Orders from this device
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-navy-900">{orders.length}</p>
          <p className="mt-0.5 text-xs text-muted">
            {orders.length ? `Most recent ${formatDate(orders[0].at)}` : "No orders placed in this browser"}
          </p>
        </div>

        <div className="rounded-card border border-line bg-surface p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
            <Truck size={14} className="text-brand-600" />
            Order value
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-navy-900">
            {formatINR(orders.reduce((sum, order) => sum + (order.total || 0), 0))}
          </p>
          <p className="mt-0.5 text-xs text-muted">Total across orders placed here</p>
        </div>
      </div>

      {orders.length > 0 ? (
        <section className="rounded-card border border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
            <h2 className="text-base font-semibold text-navy-900">Recent orders</h2>
            <Link href="/account/orders" className="text-sm font-semibold text-brand-700 hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {orders.slice(0, 4).map((order) => (
              <li key={order.orderNumber} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-900">{order.orderNumber}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDate(order.at)} · {order.itemCount} unit{order.itemCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums text-navy-900">{formatINR(order.total)}</span>
                  <Link
                    href={`/account/orders?order=${encodeURIComponent(order.orderNumber)}&email=${encodeURIComponent(
                      order.email
                    )}`}
                    className="btn btn-outline btn-sm"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="rounded-card border border-dashed border-lineStrong bg-surface p-6 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-navy-50 text-navy-400">
            <PackageSearch size={20} />
          </span>
          <h2 className="mt-3 text-base font-semibold text-navy-900">No orders yet</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-muted">
            Once you place an order it appears here, with a link to track it and download the invoice.
          </p>
          <Link href="/products" className="btn btn-primary btn-sm mt-4">
            Start with the catalogue
          </Link>
        </div>
      )}
    </div>
  );
}
