"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, RefreshCw, ShoppingCart, Trash2 } from "lucide-react";
import { ProductImage } from "@/components/product/ProductImage";
import { QuantityStepper } from "@/components/product/QuantityStepper";
import { useCart } from "@/components/cart/CartProvider";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { Alert } from "@/components/ui/feedback";
import { usePricedCart } from "@/lib/use-priced-cart";
import { formatINR, formatPrice, formatQty } from "@/lib/format";

export function CartView() {
  const { items, hydrated, setQty, remove, clear, lineCount } = useCart();
  const { lines, totals, issues, authoritative, loading, error, reload } = usePricedCart();

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart size={22} />}
        title="Your basket is empty"
        description="Add products from the catalogue to place an order or request a quotation."
        action={
          <>
            <Link href="/products" className="btn btn-primary">
              Explore products
            </Link>
            <Link href="/quote" className="btn btn-outline">
              Request a bulk quote
            </Link>
          </>
        }
      />
    );
  }

  const byId = new Map(lines.map((line) => [line.productId, line]));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-sm text-muted">
            {lineCount} product{lineCount === 1 ? "" : "s"} in your basket
            {loading && <span className="ml-2 text-xs">· confirming prices…</span>}
          </p>
          <button
            type="button"
            onClick={clear}
            className="text-xs font-semibold text-muted transition hover:text-danger"
          >
            Clear basket
          </button>
        </div>

        {error && (
          <Alert
            tone="warning"
            className="mt-4"
            title="Showing estimated prices"
            action={
              <button type="button" onClick={reload} className="btn btn-outline btn-sm">
                <RefreshCw size={14} />
                <span>Retry</span>
              </button>
            }
          >
            {error} Your basket is unchanged.
          </Alert>
        )}

        {issues.length > 0 && (
          <Alert tone="warning" className="mt-4" title="Some quantities need attention">
            <ul className="mt-1 space-y-1">
              {issues.map((issue, index) => (
                <li key={`${issue.productId}-${index}`} className="flex items-start gap-2">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  {issue.message}
                </li>
              ))}
            </ul>
          </Alert>
        )}

        <ul className="mt-4 space-y-3">
          {items.map((item) => {
            const line = byId.get(item.productId);
            const unitPrice = line?.unitPrice ?? line?.price ?? item.distributorPrice;
            const taxable = line?.taxable ?? 0;
            return (
              <li key={item.productId} className="rounded-card border border-line bg-surface p-4">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Link
                    href={`/products/${item.slug}`}
                    className="h-24 w-24 shrink-0 overflow-hidden rounded-chip"
                  >
                    <ProductImage src={item.image} alt="" className="h-full w-full" />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/products/${item.slug}`}
                          className="text-[15px] font-semibold leading-snug text-navy-900 transition hover:text-brand-700"
                        >
                          {item.title}
                        </Link>
                        <p className="mt-1 text-xs text-muted">
                          SKU {item.sku}
                          {item.hsnCode ? ` · HSN ${item.hsnCode}` : ""}
                          {line?.gstPercent ? ` · GST ${line.gstPercent}%` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(item.productId)}
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted transition hover:text-danger"
                        aria-label={`Remove ${item.title} from basket`}
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <QuantityStepper
                          value={item.qty}
                          onChange={(next) => setQty(item.productId, next)}
                          min={item.moq}
                          max={item.stock > 0 ? item.stock : undefined}
                          size="sm"
                          label={`Quantity for ${item.title}`}
                          showBounds={false}
                        />
                        <p className="mt-1.5 text-[11px] text-muted">
                          Min {formatQty(item.moq)}
                          {item.stock > 0 ? ` · ${formatQty(item.stock)} available` : " · currently unavailable"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-muted">
                          {formatPrice(unitPrice)} × {formatQty(item.qty)}
                        </p>
                        <p className="text-base font-bold tabular-nums text-navy-900">{formatINR(taxable)}</p>
                        {line?.nextSlab && (
                          <p className="mt-0.5 text-[11px] text-brand-700">
                            Add {formatQty(line.nextSlab.minQty - item.qty)} more for {formatPrice(line.nextSlab.price)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/products" className="btn btn-outline">
            Continue shopping
          </Link>
          <Link href="/quote" className="btn btn-ghost">
            Request a bulk quote instead
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------------------ summary */}
      <aside className="lg:sticky lg:top-32">
        <div className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-navy-900">Order summary</h2>

          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Subtotal (excl. GST)</dt>
              <dd className="font-medium tabular-nums text-navy-900">{formatINR(totals.subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">GST</dt>
              <dd className="font-medium tabular-nums text-navy-900">{formatINR(totals.gstTotal)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Delivery</dt>
              <dd className="font-medium tabular-nums text-navy-900">
                {totals.deliveryCharge > 0 ? formatINR(totals.deliveryCharge) : "Calculated at checkout"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
              <dt className="font-semibold text-navy-900">Total payable</dt>
              <dd className="text-lg font-bold tabular-nums text-navy-900">{formatINR(totals.grandTotal)}</dd>
            </div>
          </dl>

          <Link href="/checkout" className="btn btn-primary btn-lg btn-block mt-5">
            <span>Proceed to checkout</span>
            <ArrowRight size={17} />
          </Link>

          <p className="mt-3 text-xs leading-5 text-muted">
            {authoritative
              ? "Totals confirmed against live catalogue pricing, MOQ and stock."
              : "Totals will be confirmed against live catalogue pricing when you reach checkout."}
          </p>

          <ul className="mt-4 space-y-2 border-t border-line pt-4 text-xs leading-5 text-muted">
            <li>GST invoice with HSN codes issued on every order.</li>
            <li>Nothing is charged until our team confirms the order.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
