"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, FileText, PackageSearch, Search, Truck } from "lucide-react";
import { Alert, InlineLoading } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/form";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { loadRecentOrders, type RecentOrder } from "@/lib/local-store";
import { companyInfo } from "@/lib/company";
import { formatDate, formatINR, formatPrice, formatQty } from "@/lib/format";
import type { TrackedOrderDto } from "@/lib/types";

export function TrackView({ initialOrderNumber = "" }: { initialOrderNumber?: string }) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<TrackedOrderDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentOrder[]>([]);

  useEffect(() => {
    setRecent(loadRecentOrders());
  }, []);

  const lookup = useCallback(async (number: string, mail: string) => {
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
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!orderNumber.trim() || !email.trim()) {
      setError("Enter both the order number and the email address used on the order.");
      return;
    }
    lookup(orderNumber.trim(), email.trim());
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div>
        <form onSubmit={submit} className="rounded-card border border-line bg-surface p-5" noValidate>
          <h2 className="text-base font-semibold text-navy-900">Find your order</h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Enter the order number from your confirmation and the email address you used. Both must match.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Order number"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              placeholder="NGZ-240101-4A7"
              autoComplete="off"
            />
            <Input
              label="Email address"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>

          <Button type="submit" className="mt-4" loading={loading} loadingLabel="Looking up…" icon={<Search size={16} />}>
            Track order
          </Button>

          {error && (
            <Alert tone="danger" className="mt-4" title="We couldn't find that order">
              {error}
            </Alert>
          )}
        </form>

        {loading && <InlineLoading label="Looking up your order…" />}

        {order && (
          <div className="mt-6 space-y-6">
            <section className="rounded-card border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-navy-900">{order.orderNumber}</h2>
                  <p className="mt-1 text-xs text-muted">
                    Placed {formatDate(order.createdAt)} · {order.companyName || order.contactName}
                  </p>
                </div>
                <OrderStatusBadge status={order.orderStatus} />
              </div>

              <dl className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted">Order total</dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums text-navy-900">
                    {formatINR(order.grandTotal)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Items</dt>
                  <dd className="mt-1 text-sm font-semibold text-navy-900">{order.items?.length ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">GSTIN</dt>
                  <dd className="mt-1 text-sm font-semibold text-navy-900">{order.gstin || "Not provided"}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-card border border-line bg-surface p-5">
              <h2 className="text-base font-semibold text-navy-900">Progress</h2>
              <div className="mt-4">
                <OrderTimeline
                  status={order.orderStatus}
                  history={order.statusHistory}
                  trackingNumber={order.trackingNumber}
                  courier={order.courier}
                />
              </div>
            </section>

            <section className="rounded-card border border-line bg-surface p-5">
              <h2 className="text-base font-semibold text-navy-900">Items &amp; invoice detail</h2>
              <div className="table-wrap mt-3">
                <table className="table">
                  <caption className="sr-only">Order items with tax detail</caption>
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col">Qty</th>
                      <th scope="col">Rate</th>
                      <th scope="col">GST</th>
                      <th scope="col">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items?.map((line, index) => (
                      <tr key={`${line.sku}-${index}`}>
                        <td>
                          <p className="font-medium text-navy-900">{line.title}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            SKU {line.sku}
                            {line.hsnCode ? ` · HSN ${line.hsnCode}` : ""}
                          </p>
                        </td>
                        <td className="tabular-nums">{formatQty(line.qty)}</td>
                        <td className="tabular-nums">{formatPrice(line.price)}</td>
                        <td className="tabular-nums">{line.gstPercent}%</td>
                        <td className="font-semibold tabular-nums">{formatINR(line.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm sm:max-w-xs sm:ml-auto">
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="tabular-nums text-navy-900">{formatINR(order.subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">GST</dt>
                  <dd className="tabular-nums text-navy-900">{formatINR(order.gstTotal)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Delivery</dt>
                  <dd className="tabular-nums text-navy-900">
                    {order.deliveryCharge > 0 ? formatINR(order.deliveryCharge) : "To be confirmed"}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-line pt-2.5">
                  <dt className="font-semibold text-navy-900">Total</dt>
                  <dd className="text-base font-bold tabular-nums text-navy-900">{formatINR(order.grandTotal)}</dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-wrap gap-2.5 border-t border-line pt-4">
                <Link
                  href={`/account/invoices?order=${encodeURIComponent(order.orderNumber)}&email=${encodeURIComponent(
                    order.customerEmail ?? ""
                  )}`}
                  className="btn btn-outline btn-sm"
                >
                  <FileText size={15} />
                  <span>View printable invoice</span>
                </Link>
                <Link href="/contact" className="btn btn-ghost btn-sm">
                  <PackageSearch size={15} />
                  <span>Ask about this order</span>
                </Link>
              </div>
            </section>

            <section className="rounded-card border border-line bg-surface p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
                <Truck size={17} className="text-brand-600" />
                Delivery address
              </h2>
              <address className="mt-3 text-sm not-italic leading-6 text-navy-600">
                {order.shippingAddress?.line1}
                {order.shippingAddress?.line2 ? `, ${order.shippingAddress.line2}` : ""}
                <br />
                {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.pincode}
                <br />
                {order.shippingAddress?.country || "India"}
              </address>
            </section>
          </div>
        )}
      </div>

      <aside className="space-y-4">
        {recent.length > 0 && (
          <div className="rounded-card border border-line bg-surface p-5">
            <h2 className="text-sm font-semibold text-navy-900">Orders from this device</h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              Stored in this browser only. We still need the email address to open an order.
            </p>
            <ul className="mt-3 space-y-2">
              {recent.map((entry) => (
                <li key={entry.orderNumber}>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderNumber(entry.orderNumber);
                      setEmail(entry.email);
                      lookup(entry.orderNumber, entry.email);
                    }}
                    className="w-full rounded-chip border border-line px-3 py-2.5 text-left transition hover:border-lineStrong hover:bg-canvas"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-navy-800">{entry.orderNumber}</span>
                      <span className="text-xs tabular-nums text-muted">{formatINR(entry.total)}</span>
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted">{formatDate(entry.at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-navy-900">Need a hand?</h2>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            If you cannot find your order number, our team can look it up from your company name and email address.
          </p>
          {companyInfo.email && (
            <a href={`mailto:${companyInfo.email}`} className="btn btn-outline btn-sm btn-block mt-3">
              Email {companyInfo.email}
            </a>
          )}
          <Link href="/contact" className="btn btn-ghost btn-sm btn-block mt-2">
            Contact form
          </Link>
        </div>

        <div className="flex items-start gap-2.5 rounded-card border border-line bg-canvas p-4">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning" />
          <p className="text-xs leading-5 text-muted">
            We only release order details when the order number and email address both match, to protect customer data.
          </p>
        </div>
      </aside>
    </div>
  );
}
