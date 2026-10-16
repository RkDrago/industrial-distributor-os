/**
 * Quantity-tier pricing and GST maths.
 *
 * This module is intentionally free of any database or React dependency: the
 * browser uses it to preview prices, and the API routes use the very same
 * functions to recompute an order before it is written. Client-submitted
 * totals are never trusted — they are always re-derived here from the stored
 * product record plus the requested quantity.
 */

export type BulkSlab = { minQty: number; price: number };

export type PricedProduct = {
  price?: {
    mrp?: number | null;
    distributorPrice?: number | null;
    bulkSlabs?: BulkSlab[] | null;
  } | null;
  gstPercent?: number | null;
};

export type CartLineInput = {
  key: string;
  productId: string;
  title: string;
  sku: string;
  hsnCode?: string;
  unit?: string;
  image?: string;
  qty: number;
  moq: number;
  stock: number;
  unitPrice: number;
  gstPercent: number;
};

export type ComputedLine = {
  productId: string;
  title: string;
  sku: string;
  hsnCode?: string;
  unit?: string;
  image?: string;
  qty: number;
  price: number;
  gstPercent: number;
  gst: number;
  lineTotal: number;
};

export type OrderTotals = {
  subtotal: number;
  gstTotal: number;
  deliveryCharge: number;
  grandTotal: number;
};

export function round2(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/** Slabs sorted ascending by minQty, ignoring anything malformed. */
export function normaliseSlabs(slabs: BulkSlab[] | null | undefined): BulkSlab[] {
  if (!Array.isArray(slabs)) return [];
  return slabs
    .filter((s) => s && Number.isFinite(Number(s.minQty)) && Number.isFinite(Number(s.price)))
    .map((s) => ({ minQty: Number(s.minQty), price: Number(s.price) }))
    .filter((s) => s.minQty > 0 && s.price >= 0)
    .sort((a, b) => a.minQty - b.minQty);
}

/** Base (single-unit) price for a product. */
export function baseUnitPrice(product: PricedProduct): number {
  const p = Number(product?.price?.distributorPrice ?? 0);
  return Number.isFinite(p) && p > 0 ? p : 0;
}

export function mrpOf(product: PricedProduct): number {
  const p = Number(product?.price?.mrp ?? 0);
  return Number.isFinite(p) && p > 0 ? p : 0;
}

/** The slab in effect for a given quantity, or null when the base price applies. */
export function applicableSlab(product: PricedProduct, qty: number): BulkSlab | null {
  const slabs = normaliseSlabs(product?.price?.bulkSlabs);
  let match: BulkSlab | null = null;
  for (const slab of slabs) {
    if (qty >= slab.minQty) match = slab;
  }
  return match;
}

/** Unit price for a quantity, including bulk tiers. */
export function unitPriceForQty(product: PricedProduct, qty: number): number {
  const slab = applicableSlab(product, qty);
  return slab ? slab.price : baseUnitPrice(product);
}

/** The next tier that would unlock a better price, for "add N more" prompts. */
export function nextSlab(product: PricedProduct, qty: number): BulkSlab | null {
  const slabs = normaliseSlabs(product?.price?.bulkSlabs);
  return slabs.find((s) => s.minQty > qty) ?? null;
}

/** Cheapest and dearest unit prices a product can reach, for range labels. */
export function priceRange(product: PricedProduct): { min: number; max: number } {
  const base = baseUnitPrice(product);
  const slabs = normaliseSlabs(product?.price?.bulkSlabs);
  const prices = [base, ...slabs.map((s) => s.price)].filter((p) => p > 0);
  if (!prices.length) return { min: 0, max: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function hasBulkPricing(product: PricedProduct): boolean {
  const slabs = normaliseSlabs(product?.price?.bulkSlabs);
  if (!slabs.length) return false;
  return slabs.some((s) => s.price < baseUnitPrice(product));
}

export function discountPercent(list: number | null | undefined, price: number | null | undefined): number {
  const l = Number(list ?? 0);
  const p = Number(price ?? 0);
  if (!l || !p || p >= l) return 0;
  return round2(((l - p) / l) * 100);
}

export function gstPercentOf(product: PricedProduct): number {
  const g = Number(product?.gstPercent ?? 18);
  return Number.isFinite(g) && g >= 0 ? g : 18;
}

/** Full money breakdown for one product line, tax inclusive/exclusive kept explicit. */
export function lineBreakdown(product: PricedProduct, qty: number) {
  const unitPrice = unitPriceForQty(product, qty);
  const gstPercent = gstPercentOf(product);
  const taxable = round2(unitPrice * qty);
  const gstAmount = round2((taxable * gstPercent) / 100);
  return {
    unitPrice,
    gstPercent,
    taxable,
    gstAmount,
    total: round2(taxable + gstAmount),
    slab: applicableSlab(product, qty),
    nextSlab: nextSlab(product, qty),
  };
}

/**
 * Order totals. GST is calculated per line so mixed-rate baskets stay correct,
 * and delivery is only applied when it has actually been configured.
 */
export function computeTotals(
  lines: ComputedLine[],
  settings?: { deliveryCharge?: number; freeDeliveryThreshold?: number } | null
): OrderTotals {
  const subtotal = round2(lines.reduce((sum, l) => sum + Number(l.lineTotal || 0), 0));
  const gstTotal = round2(lines.reduce((sum, l) => sum + Number(l.gst || 0), 0));

  const configuredCharge = Number(settings?.deliveryCharge ?? 0);
  const threshold = Number(settings?.freeDeliveryThreshold ?? 0);
  let deliveryCharge = 0;
  if (configuredCharge > 0 && subtotal > 0) {
    deliveryCharge = threshold > 0 && subtotal >= threshold ? 0 : round2(configuredCharge);
  }

  return {
    subtotal,
    gstTotal,
    deliveryCharge,
    grandTotal: round2(subtotal + gstTotal + deliveryCharge),
  };
}

/** Build the canonical line record used by both the cart preview and the server. */
export function buildLine(product: PricedProduct & { _id: string; title: string; sku: string; hsnCode?: string; unit?: string; images?: string[] }, qty: number): ComputedLine {
  const b = lineBreakdown(product, qty);
  return {
    productId: String(product._id),
    title: product.title,
    sku: product.sku,
    hsnCode: product.hsnCode,
    unit: product.unit,
    image: product.images?.[0],
    qty,
    price: b.unitPrice,
    gstPercent: b.gstPercent,
    gst: b.gstAmount,
    lineTotal: b.taxable,
  };
}

/** Stock cover label used on product cards and the detail page. */
export function stockState(stock: number | null | undefined, lowThreshold = 10) {
  const n = Number(stock ?? 0);
  if (!Number.isFinite(n) || n <= 0) return { state: "out" as const, label: "Out of stock", tone: "danger" as const };
  if (n <= lowThreshold) return { state: "low" as const, label: `Low stock · ${n} left`, tone: "warning" as const };
  return { state: "in" as const, label: "In stock", tone: "success" as const };
}
