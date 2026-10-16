"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Building2, MapPin, Package, RefreshCw, Save, Truck } from "lucide-react";
import { AdminPanel } from "./ui";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert, ErrorState, InlineLoading } from "@/components/ui/feedback";
import { Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, formatINR, formatPercent, formatPrice, formatQty } from "@/lib/format";
import type { AddressDto, OrderDto } from "@/lib/types";

const ORDER_STATUSES = [
  { value: "new", label: "Order received" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_STATUSES = [
  { value: "not_applicable", label: "Not applicable (enquiry order)" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

function AddressBlock({ title, address }: { title: string; address?: AddressDto | null }) {
  const lines = [address?.line1, address?.line2, address?.city, address?.state, address?.pincode]
    .filter(Boolean)
    .join(", ");
  return (
    <div className="rounded-chip border border-line p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <MapPin size={13} />
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-navy-800">{lines || "Not provided"}</p>
      {address?.country && <p className="text-xs text-muted">{address.country}</p>}
    </div>
  );
}

/**
 * A single order, with everything operations needs to act on it: who ordered,
 * what they ordered, the tax breakdown, where it goes, and the status controls.
 *
 * The status history shown at the bottom is the real audit trail written by the
 * server on every change — it is never reconstructed from the current status.
 */
export function OrderDetailView({ id }: { id: string }) {
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState({ orderStatus: "new", paymentStatus: "not_applicable", trackingNumber: "", courier: "", adminNote: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/orders/${id}`, { cache: "no-store" });
      if (response.status === 404) {
        setOrder(null);
        setError(true);
        return;
      }
      if (!response.ok) throw new Error("failed");
      const data = await response.json();
      const item: OrderDto = data.item;
      setOrder(item);
      setDraft({
        orderStatus: item.orderStatus ?? "new",
        paymentStatus: item.paymentStatus ?? "not_applicable",
        trackingNumber: item.trackingNumber ?? "",
        courier: item.courier ?? "",
        adminNote: item.adminNote ?? "",
      });
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!order || saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`/api/orders/${order._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderStatus: draft.orderStatus,
          paymentStatus: draft.paymentStatus,
          trackingNumber: draft.trackingNumber,
          courier: draft.courier,
          adminNote: draft.adminNote,
          statusNote: draft.orderStatus === order.orderStatus ? undefined : `Marked ${draft.orderStatus}`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormError(typeof data?.error === "string" ? data.error : "The order could not be updated.");
        return;
      }
      push({
        tone: "success",
        title: `${order.orderNumber} updated`,
        description:
          draft.orderStatus !== order.orderStatus
            ? `Status is now “${ORDER_STATUSES.find((s) => s.value === draft.orderStatus)?.label ?? draft.orderStatus}”.`
            : "Changes saved.",
      });
      await load();
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <InlineLoading label="Loading order…" />;

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link href="/admin/orders" className="btn btn-ghost btn-sm">
          <ArrowLeft size={15} />
          <span>Back to orders</span>
        </Link>
        <ErrorState
          title="That order could not be opened"
          description="It may have been removed, or the reference is incorrect."
          onRetry={load}
        />
      </div>
    );
  }

  const subtotal = Number(order.subtotal) || 0;
  const gstTotal = Number(order.gstTotal) || 0;
  const deliveryCharge = Number(order.deliveryCharge) || 0;
  const grandTotal = Number(order.grandTotal) || 0;
  const history = [...(order.statusHistory ?? [])].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/orders" className="btn btn-ghost btn-sm">
          <ArrowLeft size={15} />
          <span>Back to orders</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Placed {formatDateTime(order.createdAt)}</span>
          <Button size="sm" variant="outline" onClick={load} loading={loading} icon={<RefreshCw size={15} />}>
            Refresh
          </Button>
        </div>
      </div>

      <section className="rounded-card border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Order</p>
            <h2 className="mt-1 text-xl font-bold tracking-[-0.015em] text-navy-900">{order.orderNumber}</h2>
            <p className="mt-1 text-sm text-muted">
              {order.companyName || order.contactName || "Customer"} · {order.customerEmail}
            </p>
          </div>
          <div className="text-right">
            <OrderStatusBadge status={order.orderStatus} />
            <p className="mt-2 text-xl font-bold tabular-nums text-navy-900">{formatINR(grandTotal)}</p>
            <p className="text-xs text-muted">
              {formatQty((order.items ?? []).reduce((sum, line) => sum + (Number(line.qty) || 0), 0))} units ·{" "}
              {(order.items ?? []).length} line{(order.items ?? []).length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <AdminPanel title="Items" description="Prices and tax are the figures the server calculated when the order was placed.">
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">Order line items</caption>
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Qty</th>
                    <th scope="col">Unit price</th>
                    <th scope="col">GST</th>
                    <th scope="col" className="text-right">
                      Line total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items ?? []).map((line, index) => (
                    <tr key={`${line.sku}-${index}`}>
                      <td className="max-w-[280px]">
                        <p className="truncate font-medium text-navy-900" title={line.title}>
                          {line.title}
                        </p>
                        <p className="text-xs text-muted">
                          SKU {line.sku}
                          {line.hsnCode ? ` · HSN ${line.hsnCode}` : ""}
                          {line.unit ? ` · ${line.unit}` : ""}
                        </p>
                      </td>
                      <td className="tabular-nums">{formatQty(line.qty)}</td>
                      <td className="tabular-nums">{formatPrice(line.price)}</td>
                      <td className="tabular-nums">
                        {formatPercent(line.gstPercent)}
                        <span className="block text-xs text-muted">{formatINR(line.gst)}</span>
                      </td>
                      <td className="text-right tabular-nums">{formatINR(line.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="border-t border-line p-5 text-sm">
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums text-navy-800">{formatINR(subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-muted">GST</dt>
                <dd className="tabular-nums text-navy-800">{formatINR(gstTotal)}</dd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-muted">Delivery</dt>
                <dd className="tabular-nums text-navy-800">
                  {deliveryCharge > 0 ? formatINR(deliveryCharge) : "No charge"}
                </dd>
              </div>
              <div className="mt-1.5 flex items-center justify-between border-t border-line pt-3">
                <dt className="font-semibold text-navy-900">Grand total</dt>
                <dd className="text-base font-bold tabular-nums text-navy-900">{formatINR(grandTotal)}</dd>
              </div>
            </dl>
          </AdminPanel>

          <AdminPanel title="Customer and delivery" description="Exactly what the customer submitted at checkout.">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="rounded-chip border border-line p-4">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  <Building2 size={13} />
                  Business
                </p>
                <dl className="mt-2 space-y-1.5 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Company</dt>
                    <dd className="text-navy-800">{order.companyName || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Contact</dt>
                    <dd className="text-navy-800">
                      {order.contactName || "—"}
                      {order.contactPhone ? ` · ${order.contactPhone}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Email</dt>
                    <dd className="break-all text-navy-800">{order.customerEmail || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">GSTIN</dt>
                    <dd className="text-navy-800">{order.gstin || "Not provided"}</dd>
                  </div>
                </dl>
              </div>
              <AddressBlock title="Delivery address" address={order.shippingAddress} />
              <AddressBlock title="Billing address" address={order.billingAddress} />
              <div className="rounded-chip border border-line p-4">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  <Package size={13} />
                  Payment
                </p>
                <dl className="mt-2 space-y-1.5 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Method</dt>
                    <dd className="text-navy-800">{order.paymentMethod === "enquiry" ? "Order enquiry" : order.paymentMethod}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Status</dt>
                    <dd className="text-navy-800">
                      {PAYMENT_STATUSES.find((entry) => entry.value === (order.paymentStatus ?? "not_applicable"))?.label ??
                        order.paymentStatus}
                    </dd>
                  </div>
                  {order.notes && (
                    <div>
                      <dt className="text-xs text-muted">Customer notes</dt>
                      <dd className="whitespace-pre-line text-navy-800">{order.notes}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Status history"
            description={
              history.length
                ? `${history.length} recorded change${history.length === 1 ? "" : "s"}. This is the same timeline the customer sees.`
                : "No status changes recorded yet."
            }
          >
            {history.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted">This order still has its original status.</p>
            ) : (
              <ol className="divide-y divide-line">
                {history.map((entry, index) => (
                  <li key={`${entry.status}-${index}`} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy-900">
                        {ORDER_STATUSES.find((option) => option.value === entry.status)?.label ?? entry.status}
                      </p>
                      {entry.note && <p className="mt-0.5 text-xs text-muted">{entry.note}</p>}
                    </div>
                    <div className="text-right text-xs text-muted">
                      <p>{formatDateTime(entry.at)}</p>
                      <p>by {entry.by || "system"}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </AdminPanel>
        </div>

        <AdminPanel
          title="Update order"
          description="Changes are recorded in the status history with your account as the actor."
        >
          <form onSubmit={save} className="space-y-4 p-5" noValidate>
            {formError && (
              <Alert tone="danger" title="Could not save">
                {formError}
              </Alert>
            )}

            <Select
              label="Order status"
              value={draft.orderStatus}
              onChange={(event) => setDraft((d) => ({ ...d, orderStatus: event.target.value }))}
            >
              {ORDER_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select
              label="Payment status"
              value={draft.paymentStatus}
              onChange={(event) => setDraft((d) => ({ ...d, paymentStatus: event.target.value }))}
              hint="Recorded for your records. Payment capture is not automated."
            >
              {PAYMENT_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Input
              label="Tracking number"
              value={draft.trackingNumber}
              onChange={(event) => setDraft((d) => ({ ...d, trackingNumber: event.target.value }))}
              placeholder="SR8841209931"
              optional
              hint="Required before an order can be marked shipped."
            />

            <Input
              label="Courier"
              value={draft.courier}
              onChange={(event) => setDraft((d) => ({ ...d, courier: event.target.value }))}
              placeholder="SafeExpress"
              optional
            />

            <Textarea
              label="Internal note"
              rows={3}
              value={draft.adminNote}
              onChange={(event) => setDraft((d) => ({ ...d, adminNote: event.target.value }))}
              hint="Never shown to the customer."
            />

            {draft.orderStatus === "cancelled" && order.orderStatus !== "cancelled" && (
              <Alert tone="warning" title="Cancelling releases stock">
                The quantities on this order are returned to inventory when you save.
              </Alert>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Button type="submit" loading={saving} loadingLabel="Saving…" icon={<Save size={16} />}>
                Save changes
              </Button>
              {(order.trackingNumber || draft.courier) && (
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <Truck size={14} />
                  Customer sees this on their tracking page.
                </p>
              )}
            </div>
          </form>
        </AdminPanel>
      </div>
    </div>
  );
}
