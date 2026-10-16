import { CheckCircle2 } from "lucide-react";
import { formatPrice, formatQty } from "@/lib/format";
import { baseUnitPrice, discountPercent, mrpOf, normaliseSlabs, type PricedProduct } from "@/lib/pricing";

/**
 * Quantity-based pricing table.
 *
 * Shows the base rate and every tier, marks the tier that the currently
 * selected quantity falls into, and states plainly that prices exclude GST so
 * nobody has to work out whether tax is included.
 */
export function BulkPriceTable({
  product,
  qty,
  compact = false,
}: {
  product: PricedProduct;
  qty?: number;
  compact?: boolean;
}) {
  const base = baseUnitPrice(product);
  const slabs = normaliseSlabs(product?.price?.bulkSlabs);
  const list = mrpOf(product);

  if (!base) {
    return <p className="text-sm text-muted">Pricing is available on request for this product.</p>;
  }

  const rows: { label: string; price: number; active: boolean; saving: number }[] = [
    { label: "1+", price: base, active: true, saving: discountPercent(list, base) },
    ...slabs.map((slab) => ({
      label: `${formatQty(slab.minQty)}+`,
      price: slab.price,
      active: false,
      saving: discountPercent(list, slab.price),
    })),
  ];

  const activeIndex = rows.reduce((best, row, index) => {
    if (typeof qty !== "number" || !Number.isFinite(qty)) return 0;
    const threshold = index === 0 ? 1 : slabs[index - 1]?.minQty ?? 1;
    return qty >= threshold ? index : best;
  }, 0);
  rows[activeIndex].active = true;

  const uniform = slabs.length === 0;

  return (
    <div>
      <div className="table-wrap rounded-card border border-line">
        <table className="table">
          <caption className="sr-only">Unit price by order quantity, excluding GST</caption>
          <thead>
            <tr>
              <th scope="col">Order quantity</th>
              <th scope="col">Unit price</th>
              {!compact && <th scope="col">Saving vs MRP</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.label}-${row.price}`} className={row.active ? "bg-brand-50/70" : undefined}>
                <td>
                  <span className="flex items-center gap-2 font-medium text-navy-800">
                    {row.active && <CheckCircle2 size={14} className="text-brand-600" aria-hidden="true" />}
                    {row.label}
                    {row.active && (
                      <span className="badge badge-brand">{typeof qty === "number" ? "Your quantity" : "Rate"}</span>
                    )}
                  </span>
                </td>
                <td className="font-semibold text-navy-900">{formatPrice(row.price)}</td>
                {!compact && (
                  <td className="text-muted">{row.saving > 0 ? `${row.saving}% below MRP` : "—"}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">
        {uniform
          ? "One rate applies at every quantity. Prices are per unit and exclude GST."
          : "Prices are per unit and exclude GST. The rate updates automatically as the quantity crosses each tier."}
      </p>
    </div>
  );
}
