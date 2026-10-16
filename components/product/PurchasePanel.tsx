"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeIndianRupee, Check, MessageSquareQuote, ShoppingCart, Truck } from "lucide-react";
import { QuantityStepper } from "./QuantityStepper";
import { BulkPriceTable } from "./BulkPriceTable";
import { useCart } from "@/components/cart/CartProvider";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { formatINR, formatPrice, formatQty } from "@/lib/format";
import { discountPercent, gstPercentOf, lineBreakdown, mrpOf } from "@/lib/pricing";
import type { ProductDto } from "@/lib/types";

/**
 * Purchase panel.
 *
 * The price shown updates as the quantity crosses a tier, and the totals are
 * re-derived on the server before the order is accepted — this is a preview,
 * not the source of truth.
 */
export function PurchasePanel({ product, lowStockThreshold = 10 }: { product: ProductDto; lowStockThreshold?: number }) {
  const { add, openCart } = useCart();
  const { push } = useToast();
  const moq = Math.max(1, Number(product.moq) || 1);
  const stock = Math.max(0, Number(product.stock) || 0);
  const outOfStock = stock <= 0;
  const [qty, setQty] = useState(moq);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const timers = useRef<number[]>([]);
  const orderBlockRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => timers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  // The mobile bar only appears once the real order block has scrolled away,
  // so it never covers the controls it duplicates.
  useEffect(() => {
    const node = orderBlockRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { rootMargin: "-96px 0px 0px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const priced = useMemo(() => ({ price: product.price, gstPercent: product.gstPercent }), [product]);
  const breakdown = useMemo(() => lineBreakdown(priced, qty), [priced, qty]);
  const list = mrpOf(priced);
  const saving = discountPercent(list, breakdown.unitPrice);
  const gstPercent = gstPercentOf(priced);

  const quoteHref = `/quote?product=${encodeURIComponent(product.slug)}&sku=${encodeURIComponent(product.sku)}&qty=${qty}`;

  function handleAdd() {
    if (outOfStock || adding) return;
    setAdding(true);
    add(
      {
        productId: product._id,
        slug: product.slug,
        title: product.title,
        sku: product.sku,
        hsnCode: product.hsnCode,
        unit: product.unit,
        image: product.images?.[0],
        moq,
        stock,
        gstPercent,
        distributorPrice: Number(product.price?.distributorPrice) || 0,
        bulkSlabs: product.price?.bulkSlabs ?? [],
      },
      qty
    );
    push({
      tone: "success",
      title: "Added to basket",
      description: `${formatQty(qty)} × ${product.title}`,
    });
    setAdding(false);
    setAdded(true);
    openCart();
    timers.current.push(window.setTimeout(() => setAdded(false), 1500));
  }

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------- price */}
      <div className="rounded-card border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Your rate</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="text-[28px] font-bold leading-none tracking-tight text-navy-900">
                {formatPrice(breakdown.unitPrice)}
              </span>
              <span className="text-sm text-muted">{product.unit ?? "per unit"}</span>
              {list > breakdown.unitPrice && (
                <span className="text-sm text-navy-300 line-through">{formatPrice(list)}</span>
              )}
              {saving > 0 && <Badge tone="brand">{`${saving}% below MRP`}</Badge>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">at {formatQty(qty)} units</p>
            <p className="text-sm font-semibold text-navy-900">{formatINR(breakdown.taxable)} excl. GST</p>
          </div>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-line pt-4 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Taxable value</dt>
            <dd className="font-medium tabular-nums text-navy-900">{formatINR(breakdown.taxable)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">GST @ {gstPercent}%</dt>
            <dd className="font-medium tabular-nums text-navy-900">{formatINR(breakdown.gstAmount)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 sm:col-span-2 sm:border-t sm:border-line sm:pt-2.5">
            <dt className="font-semibold text-navy-900">Total for {formatQty(qty)} units</dt>
            <dd className="text-base font-bold tabular-nums text-navy-900">{formatINR(breakdown.total)}</dd>
          </div>
        </dl>
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted">
          <BadgeIndianRupee size={14} className="mt-0.5 shrink-0 text-brand-600" />
          Prices exclude GST. The GST amount above is added at checkout and shown on your invoice.
        </p>
      </div>

      {/* --------------------------------------------------------- add to cart */}
      <div ref={orderBlockRef} id="order-panel" className="rounded-card border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-navy-900">Order quantity</p>
            <p className="mt-0.5 text-xs text-muted">
              Minimum order quantity {formatQty(moq)}
              {!outOfStock && stock <= lowStockThreshold && ` · only ${formatQty(stock)} in stock`}
            </p>
          </div>
          {outOfStock ? (
            <Badge tone="danger">Out of stock</Badge>
          ) : (
            <Badge tone="success">In stock</Badge>
          )}
        </div>

        <div className="mt-4">
          <QuantityStepper
            value={qty}
            onChange={setQty}
            min={moq}
            max={outOfStock ? undefined : stock}
            disabled={outOfStock}
            label="Order quantity"
          />
        </div>

        {breakdown.nextSlab && (
          <p className="mt-3 rounded-chip bg-brand-50 px-3 py-2 text-xs leading-5 text-brand-800">
            Add {formatQty(breakdown.nextSlab.minQty - qty)} more to reach {formatPrice(breakdown.nextSlab.price)} per
            unit.
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock || adding || added}
            className="btn btn-primary btn-lg flex-1"
            aria-busy={adding || undefined}
          >
            {added ? <Check size={18} /> : <ShoppingCart size={18} />}
            <span>{outOfStock ? "Out of stock" : added ? "Added to basket" : "Add to basket"}</span>
          </button>
          <Link href={quoteHref} className="btn btn-outline btn-lg flex-1">
            <MessageSquareQuote size={18} />
            <span>Request a quote</span>
          </Link>
        </div>

        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted">
          <Truck size={14} className="mt-0.5 shrink-0 text-brand-600" />
          Delivery charges, if any, are confirmed on the checkout page and shown before you place the order. We never
          add costs after the fact.
        </p>
      </div>

      {/* ---------------------------------------------------- sticky mobile bar */}
      {showSticky && !outOfStock && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 p-3 shadow-raised backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-muted">
                {formatQty(qty)} × {formatPrice(breakdown.unitPrice)}
              </p>
              <p className="text-sm font-bold text-navy-900">{formatINR(breakdown.total)}</p>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || added}
              className="btn btn-primary ml-auto min-w-0 flex-1"
              aria-label={`Add ${product.title} to basket`}
            >
              {added ? <Check size={17} /> : <ShoppingCart size={17} />}
              <span className="truncate">{added ? "Added" : "Add to basket"}</span>
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------- tiers */}
      <div className="rounded-card border border-line bg-surface p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-navy-900">Quantity-based pricing</h2>
        <p className="mt-1 text-xs leading-5 text-muted">
          Buy more, pay less per unit. The rate for your selected quantity is highlighted.
        </p>
        <div className="mt-3">
          <BulkPriceTable product={priced} qty={qty} compact />
        </div>
      </div>
    </div>
  );
}
