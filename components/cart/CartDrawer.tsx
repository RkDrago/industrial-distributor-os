"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Drawer } from "@/components/ui/Overlay";
import { useCart } from "./CartProvider";
import { formatINR, formatPrice, formatQty } from "@/lib/format";
import { lineBreakdown } from "@/lib/pricing";

export function CartDrawer() {
  const { items, isOpen, closeCart, setQty, remove, preview, lineCount } = useCart();
  const router = useRouter();

  const lineFor = (item: (typeof items)[number]) =>
    lineBreakdown(
      { price: { distributorPrice: item.distributorPrice, bulkSlabs: item.bulkSlabs }, gstPercent: item.gstPercent },
      item.qty
    );

  return (
    <Drawer
      open={isOpen}
      onClose={closeCart}
      title="Your basket"
      description={lineCount > 0 ? `${lineCount} product${lineCount === 1 ? "" : "s"}` : undefined}
      footer={
        items.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Subtotal (excl. GST)</span>
              <span className="font-semibold text-navy-900">{formatINR(preview.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">GST</span>
              <span className="font-semibold text-navy-900">{formatINR(preview.gstTotal)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="font-semibold text-navy-900">Estimated total</span>
              <span className="text-lg font-bold text-navy-900">{formatINR(preview.grandTotal)}</span>
            </div>
            <p className="text-xs text-muted">
              Final figures are confirmed on the checkout page before you place the order.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn btn-primary flex-1"
                onClick={() => {
                  closeCart();
                  router.push("/checkout");
                }}
              >
                Proceed to checkout
              </button>
              <Link href="/cart" className="btn btn-outline flex-1" onClick={closeCart}>
                View basket
              </Link>
            </div>
          </div>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-navy-50 text-navy-400">
            <ShoppingCart size={22} />
          </span>
          <p className="mt-4 font-semibold text-navy-900">Your basket is empty</p>
          <p className="mt-1 max-w-[26ch] text-sm text-muted">
            Browse the catalogue and add the products your team needs.
          </p>
          <Link href="/products" className="btn btn-primary mt-5" onClick={closeCart}>
            Explore products
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const breakdown = lineFor(item);
            const atMoq = item.qty <= item.moq;
            return (
              <li key={item.productId} className="flex gap-3 rounded-card border border-line p-3">
                <Link
                  href={`/products/${item.slug}`}
                  onClick={closeCart}
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-chip bg-navy-50"
                >
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="grid h-full place-items-center text-[10px] text-navy-300">No image</span>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${item.slug}`}
                    onClick={closeCart}
                    className="line-clamp-2 text-sm font-semibold text-navy-900 hover:text-brand-700"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">
                    {item.sku} · {formatPrice(breakdown.unitPrice)} {item.unit ?? ""}
                  </p>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center rounded-chip border border-lineStrong">
                      <button
                        type="button"
                        onClick={() => setQty(item.productId, item.qty - 1)}
                        disabled={atMoq}
                        className="grid h-8 w-8 place-items-center rounded-l-chip text-navy-600 transition hover:bg-navy-50 disabled:opacity-40"
                        aria-label={`Reduce quantity of ${item.title}`}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="min-w-9 px-1 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                        {formatQty(item.qty)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(item.productId, item.qty + 1)}
                        className="grid h-8 w-8 place-items-center rounded-r-chip text-navy-600 transition hover:bg-navy-50"
                        aria-label={`Increase quantity of ${item.title}`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-navy-900">{formatINR(breakdown.taxable)}</p>
                      <button
                        type="button"
                        onClick={() => remove(item.productId)}
                        className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted transition hover:text-danger"
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    </div>
                  </div>

                  {atMoq && item.moq > 1 && (
                    <p className="mt-1.5 text-[11px] text-muted">Minimum order quantity is {formatQty(item.moq)}.</p>
                  )}
                  {breakdown.nextSlab && (
                    <p className="mt-1 text-[11px] text-brand-700">
                      Add {formatQty(breakdown.nextSlab.minQty - item.qty)} more for{" "}
                      {formatPrice(breakdown.nextSlab.price)} per unit.
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Drawer>
  );
}
