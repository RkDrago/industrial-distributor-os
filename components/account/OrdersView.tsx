"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, PackageSearch, Search } from "lucide-react";
import { Alert, InlineLoading } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/form";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { formatDate, formatINR, formatPrice, formatQty } from "@/lib/format";
import { loadRecentOrders, rememberOrder, type RecentOrder } from "@/lib/local-store";
import type { TrackedOrderDto } from "@/lib/types";

export function OrdersView({ initialOrderNumber = "", initialEmail = "" }: { initialOrderNumber?: string; initialEmail?: string }) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [email, setEmail] = useState(initialEmail);
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const [order, setOrder] = useState<TrackedOrderDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRecent(loadRecentOrders());
  }, []);

  useEffect(() => {
    if (initialOrderNumber && initialEmail) lookup(initialOrderNumber, initialEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOrderNumber, initialEmail]);

  async function lookup(number: string, mail: string) {
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const response = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: number, email: mail }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data?.error === "string" ? data.error : "We could not find that order.");
        return;
      }
      setOrder(data.order);
      rememberOrder({
        orderNumber: data.order.orderNumber,
        id: data.order.id,
        total: data.order.grandTotal,
        itemCount: (data.order.items ?? []).reduce((sum: number, line: any) => sum + (line.qty ?? 0), 0),
        at: data.order.createdAt,
        email: data.order.customerEmail ?? mail,
      });
      setRecent(loadRecentOrders());
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!orderNumber.trim() || !email.trim()) {
      setError("Enter both the order number and the email address used on the order.");
      return;
    }
    lookup(orderNumber.trim().toUpperCase(), email.trim());
  }

  return (
    <div className="space-y-6">
      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="text-base font-semibold text-navy-900">Find an order</h2>
        <p className="mt-1 text-xs leading-5 text-muted">
          We match on the order number and the email address used at checkout, so only you can open your order.
        </p>
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate>
          <Input
            label="Order number"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
            placeholder="NGZ-240101-4A7"
          />
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
          <Button type="submit" loading={loading} loadingLabel="Looking up…" icon={<Search size={16} />}>
            Find
          </Button>
        </form>
        {error && (
          <Alert tone="danger" className="mt-4" title="We couldn't find that order">
            {error}
          </Alert>
        )}
      </section>

      {loading && <InlineLoading label="Loading order…" />}

      {order && (
        <section className="rounded-card border border-line bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-navy-900">{order.orderNumber}</h2>
              <p className="mt-0.5 text-xs text-muted">Placed {formatDate(order.createdAt)}</p>
            </div>
            <OrderStatusBadge status={order.orderStatus} />
          </div>

          <ul className="mt-4 divide-y divide-line border-t border-line">
            {order.items?.map((line, index) => (
              <li key={`${line.sku}-${index}`} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy-900">{line.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    SKU {line.sku} · {formatPrice(line.price)} × {formatQty(line.qty)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-navy-900">{formatINR(line.lineTotal)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted">Order total</p>
              <p className="mt-0.5 text-base font-bold tabular-nums text-navy-900">{formatINR(order.grandTotal)}</p>
            </div>
            <div className="sm:text-right">
              <Link
                href={`/account/invoices?order=${encodeURIComponent(order.orderNumber)}&email=${encodeURIComponent(
                  order.customerEmail ?? ""
                )}`}
                className="btn btn-outline btn-sm"
              >
                <FileText size={15} />
                <span>View invoice</span>
              </Link>
            </div>
          </div>

          <div className="mt-5 border-t border-line pt-5">
            <h3 className="text-sm font-semibold text-navy-900">Progress</h3>
            <div className="mt-3">
              <OrderTimeline
                status={order.orderStatus}
                history={order.statusHistory}
                trackingNumber={order.trackingNumber}
                courier={order.courier}
              />
            </div>
          </div>
        </section>
      )}

      <section className="rounded-card border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line p-5">
          <div>
            <h2 className="text-base font-semibold text-navy-900">Orders from this device</h2>
            <p className="mt-0.5 text-xs text-muted">Stored locally so you can reopen them quickly.</p>
          </div>
          <span className="badge badge-neutral">{recent.length}</span>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-navy-50 text-navy-400">
              <PackageSearch size={20} />
            </span>
            <p className="mt-3 text-sm font-semibold text-navy-900">No orders recorded here yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted">
              If you ordered from another device, use the form above with the email address from that order.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((entry) => (
              <li key={entry.orderNumber} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-900">{entry.orderNumber}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDate(entry.at)} · {formatINR(entry.total)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOrderNumber(entry.orderNumber);
                      setEmail(entry.email);
                      lookup(entry.orderNumber, entry.email);
                    }}
                    className="btn btn-outline btn-sm"
                  >
                    Open
                  </button>
                  <Link
                    href={`/account/invoices?order=${encodeURIComponent(entry.orderNumber)}&email=${encodeURIComponent(
                      entry.email
                    )}`}
                    className="btn btn-ghost btn-sm"
                  >
                    Invoice
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs leading-5 text-muted">
        Need an order that is not listed?{" "}
        <Link href="/track" className="link-brand">
          Use the tracking page
        </Link>{" "}
        or{" "}
        <Link href="/contact" className="link-brand">
          contact our team
        </Link>
        .
      </p>
    </div>
  );
}
