"use client";

import { useEffect, useState } from "react";
import { FileText, Printer, Search } from "lucide-react";
import { Alert, InlineLoading } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/form";
import { BrandMark } from "@/components/site/Brand";
import { companyInfo } from "@/lib/company";
import { formatDate, formatINR, formatPrice, formatQty } from "@/lib/format";
import { loadCompany } from "@/lib/local-store";
import type { TrackedOrderDto } from "@/lib/types";

/**
 * Invoice lookup and print view.
 *
 * The invoice is rendered from the order the server released for the matching
 * order number and email, so the figures on it are the figures that were stored
 * — never re-calculated in the browser.
 */
export function InvoicesView({
  initialOrderNumber = "",
  initialEmail = "",
}: {
  initialOrderNumber?: string;
  initialEmail?: string;
}) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [email, setEmail] = useState(initialEmail);
  const [order, setOrder] = useState<TrackedOrderDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialOrderNumber && initialEmail) lookup(initialOrderNumber, initialEmail);
    else {
      const stored = loadCompany();
      if (!initialEmail && stored.email) setEmail(stored.email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <section className="rounded-card border border-line bg-surface p-5 no-print">
        <h2 className="text-base font-semibold text-navy-900">Open an invoice</h2>
        <p className="mt-1 text-xs leading-5 text-muted">
          Enter the order number and the email address used at checkout to view the tax invoice for that order.
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
          <Button type="submit" loading={loading} loadingLabel="Opening…" icon={<Search size={16} />}>
            Open invoice
          </Button>
        </form>
        {error && (
          <Alert tone="danger" className="mt-4" title="We couldn't open that invoice">
            {error}
          </Alert>
        )}
      </section>

      {loading && <InlineLoading label="Preparing invoice…" />}

      {order && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 no-print">
            <p className="text-sm text-muted">
              Invoice for order <span className="font-semibold text-navy-800">{order.orderNumber}</span>
            </p>
            <Button
              variant="outline"
              size="sm"
              icon={<Printer size={15} />}
              onClick={() => window.print()}
            >
              Print or save as PDF
            </Button>
          </div>

          <article className="rounded-card border border-line bg-white p-6 sm:p-8">
            <header className="flex flex-wrap items-start justify-between gap-5 border-b border-line pb-6">
              <div className="flex items-start gap-3">
                <BrandMark size={38} />
                <div>
                  <p className="text-base font-bold text-navy-900">{companyInfo.name}</p>
                  {companyInfo.address && (
                    <p className="mt-1 max-w-xs text-xs leading-5 text-muted">{companyInfo.address}</p>
                  )}
                  <p className="mt-1 text-xs text-muted">
                    {companyInfo.email}
                    {companyInfo.phone ? ` · ${companyInfo.phone}` : ""}
                  </p>
                  {companyInfo.gstin && <p className="mt-1 text-xs text-muted">GSTIN {companyInfo.gstin}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Tax invoice</p>
                <p className="mt-1 text-sm font-semibold text-navy-900">{order.orderNumber}</p>
                <p className="mt-1 text-xs text-muted">Dated {formatDate(order.createdAt)}</p>
                <p className="mt-1 text-xs text-muted">Status: {order.orderStatus}</p>
              </div>
            </header>

            <div className="grid gap-6 border-b border-line py-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Billed to</p>
                <p className="mt-2 text-sm font-semibold text-navy-900">{order.companyName || order.contactName}</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {order.contactName}
                  <br />
                  {order.customerEmail}
                  <br />
                  {order.contactPhone}
                </p>
                {order.gstin && <p className="mt-1 text-xs text-muted">GSTIN {order.gstin}</p>}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Delivered to</p>
                <address className="mt-2 text-xs not-italic leading-5 text-muted">
                  {order.shippingAddress?.line1}
                  {order.shippingAddress?.line2 ? `, ${order.shippingAddress.line2}` : ""}
                  <br />
                  {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.pincode}
                  <br />
                  {order.shippingAddress?.country || "India"}
                </address>
              </div>
            </div>

            <div className="table-wrap mt-6">
              <table className="table">
                <caption className="sr-only">Invoice line items with HSN and GST</caption>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Description</th>
                    <th scope="col">HSN</th>
                    <th scope="col">Qty</th>
                    <th scope="col">Rate</th>
                    <th scope="col">GST</th>
                    <th scope="col">Taxable</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((line, index) => (
                    <tr key={`${line.sku}-${index}`}>
                      <td className="tabular-nums text-muted">{index + 1}</td>
                      <td>
                        <p className="font-medium text-navy-900">{line.title}</p>
                        <p className="mt-0.5 text-xs text-muted">SKU {line.sku}</p>
                      </td>
                      <td className="tabular-nums">{line.hsnCode || "—"}</td>
                      <td className="tabular-nums">{formatQty(line.qty)}</td>
                      <td className="tabular-nums">{formatPrice(line.price)}</td>
                      <td className="tabular-nums">{line.gstPercent}%</td>
                      <td className="font-semibold tabular-nums">{formatINR(line.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="mt-6 space-y-2 text-sm sm:max-w-xs sm:ml-auto">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Taxable value</dt>
                <dd className="tabular-nums text-navy-900">{formatINR(order.subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Total GST</dt>
                <dd className="tabular-nums text-navy-900">{formatINR(order.gstTotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="tabular-nums text-navy-900">
                  {order.deliveryCharge > 0 ? formatINR(order.deliveryCharge) : "Not charged"}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2.5">
                <dt className="font-semibold text-navy-900">Invoice total</dt>
                <dd className="text-base font-bold tabular-nums text-navy-900">{formatINR(order.grandTotal)}</dd>
              </div>
            </dl>

            <footer className="mt-8 border-t border-line pt-5">
              <p className="text-xs leading-5 text-muted">
                This is a computer-generated invoice raised against your order. Amounts in Indian Rupees. Goods remain
                the property of {companyInfo.name} until paid in full.
                {order.trackingNumber
                  ? ` Dispatched via ${order.courier || "courier"} — reference ${order.trackingNumber}.`
                  : ""}
              </p>
            </footer>
          </article>
        </>
      )}

      {!order && !loading && (
        <div className="flex items-start gap-2.5 rounded-card border border-line bg-canvas p-4 no-print">
          <FileText size={15} className="mt-0.5 shrink-0 text-brand-600" />
          <p className="text-xs leading-5 text-muted">
            Invoices carry GST and HSN detail for every line, so your accounts team can file them directly.
          </p>
        </div>
      )}
    </div>
  );
}
