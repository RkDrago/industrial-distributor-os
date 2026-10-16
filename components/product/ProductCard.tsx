"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { ProductImage } from "./ProductImage";
import { QuantityStepper } from "./QuantityStepper";
import { useToast } from "@/components/ui/Toast";
import { useCart } from "@/components/cart/CartProvider";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, formatQty } from "@/lib/format";
import {
  baseUnitPrice,
  discountPercent,
  gstPercentOf,
  hasBulkPricing,
  lineBreakdown,
  mrpOf,
  priceRange,
  stockState,
} from "@/lib/pricing";
import type { ProductDto } from "@/lib/types";

/**
 * Catalogue card.
 *
 * Kept deliberately scannable: image, identity, the price you actually pay,
 * MOQ and stock. Bulk tiers are signalled rather than expanded — the full
 * table lives on the product page.
 */
export function ProductCard({
  product,
  priority = false,
  lowStockThreshold = 10,
}: {
  product: ProductDto;
  priority?: boolean;
  lowStockThreshold?: number;
}) {
  const { add } = useCart();
  const { push } = useToast();
  const [qty, setQty] = useState(Math.max(1, Number(product.moq) || 1));
  const [justAdded, setJustAdded] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => timers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  const stock = Number(product.stock) || 0;
  const moq = Math.max(1, Number(product.moq) || 1);
  const outOfStock = stock <= 0;
  const priced = { price: product.price, gstPercent: product.gstPercent };
  const list = mrpOf(priced);
  const base = baseUnitPrice(priced);
  const breakdown = lineBreakdown(priced, qty);
  const range = priceRange(priced);
  const saving = discountPercent(list, base);
  const bulk = hasBulkPricing(priced);
  const stockInfo = stockState(stock, lowStockThreshold);
  const href = `/products/${product.slug}`;

  function handleAdd() {
    if (outOfStock || justAdded) return;
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
        gstPercent: gstPercentOf(priced),
        distributorPrice: base,
        bulkSlabs: product.price?.bulkSlabs ?? [],
      },
      qty
    );
    push({
      tone: "success",
      title: "Added to basket",
      description: `${formatQty(qty)} × ${product.title}`,
    });
    // Brief guard against double-clicking the same card.
    setJustAdded(true);
    timers.current.push(window.setTimeout(() => setJustAdded(false), 900));
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-line bg-surface transition hover:border-lineStrong hover:shadow-card">
      <div className="relative">
        <Link href={href} className="block" tabIndex={-1} aria-hidden="true">
          <ProductImage
            src={product.images?.[0]}
            alt={product.title}
            className="aspect-[4/3] w-full"
            imgClassName="transition duration-500 group-hover:scale-[1.03]"
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </Link>

        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {bulk && <Badge tone="brand">Bulk pricing</Badge>}
          {saving > 0 && !bulk && <Badge tone="neutral">{`${saving}% off MRP`}</Badge>}
        </div>

        <div className="pointer-events-none absolute right-2.5 top-2.5">
          {outOfStock ? (
            <Badge tone="danger">Out of stock</Badge>
          ) : stockInfo.state === "low" ? (
            <Badge tone="warning">{`${formatQty(stock)} left`}</Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="truncate font-semibold uppercase tracking-wide text-navy-400">
            {product.brand?.name ?? product.category?.name ?? "Industrial"}
          </span>
          <span className="shrink-0 tabular-nums text-muted">{product.sku}</span>
        </div>

        <h3 className="mt-1.5 min-h-[2.6rem] text-[15px] font-semibold leading-[1.3] text-navy-900">
          <Link href={href} className="transition hover:text-brand-700">
            {product.title}
          </Link>
        </h3>

        <p className="mt-1 text-xs text-muted">
          MOQ {formatQty(moq)} {product.unit ? `· ${product.unit}` : ""}
        </p>

        <div className="mt-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-xl font-bold tracking-tight text-navy-900">{formatPrice(breakdown.unitPrice)}</span>
            <span className="text-xs text-muted">{product.unit ?? "per unit"}</span>
            {list > base && <span className="text-xs text-navy-300 line-through">{formatPrice(list)}</span>}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            + GST {gstPercentOf(priced)}% · HSN {product.hsnCode || "—"}
          </p>
          {bulk && (
            <p className="mt-1 text-xs font-medium text-brand-700">
              From {formatPrice(range.min)} at higher quantities
            </p>
          )}
        </div>

        {/* Stepper and CTA stack so the label is never truncated at 4-up. */}
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between gap-2">
            <QuantityStepper
              value={qty}
              onChange={setQty}
              min={moq}
              max={outOfStock ? undefined : stock}
              disabled={outOfStock}
              size="sm"
              label={`Quantity for ${product.title}`}
              showBounds={false}
            />
            <Link
              href={href}
              className="shrink-0 text-xs font-semibold text-navy-500 transition hover:text-brand-700"
            >
              View details
            </Link>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock || justAdded}
            className="btn btn-primary btn-sm btn-block mt-2"
            aria-label={`Add ${product.title} to basket`}
          >
            {justAdded ? <Check size={15} /> : <ShoppingCart size={15} />}
            <span>{outOfStock ? "Out of stock" : justAdded ? "Added to basket" : "Add to basket"}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
