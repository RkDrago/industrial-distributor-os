import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { getCommerceSettings } from "@/lib/settings";
import { asInt, cleanText, fail, isObjectId, isSameOrigin, ok, rateLimit, serverError, sweepRateLimit } from "@/lib/http";
import { buildLine, computeTotals, lineBreakdown } from "@/lib/pricing";
import { getClientIp } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LINES = 50;
const MAX_QTY = 100000;

/**
 * Authoritative pricing for the basket.
 *
 * The browser sends only product ids and quantities. Names, prices, bulk tiers,
 * GST and stock all come from the database, so a tampered local cart can never
 * control what the customer is charged. Issues (MOQ, stock, unavailable) are
 * returned so the UI can explain exactly what needs fixing.
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site requests are not allowed.", 403);

  try {
    sweepRateLimit();
    const limited = rateLimit(`cart-price:${getClientIp(req)}`, 120, 60_000);
    if (!limited.allowed) return fail("Too many pricing requests. Please slow down.", 429);

    const body = await req.json().catch(() => null);
    const rawItems = Array.isArray(body?.items) ? body.items.slice(0, MAX_LINES) : [];
    if (!rawItems.length) {
      const settings = await getCommerceSettings();
      return ok({ lines: [], totals: computeTotals([], settings), settings, issues: [] });
    }

    await connectDB();

    const requested = new Map<string, number>();
    const issues: { productId: string; code: string; message: string }[] = [];

    for (const raw of rawItems) {
      const productId = cleanText(raw?.productId, 40);
      if (!isObjectId(productId)) {
        issues.push({ productId: "", code: "invalid", message: "An item in your basket is no longer valid and has been removed." });
        continue;
      }
      const qty = asInt(raw?.qty, 1, 1, MAX_QTY);
      requested.set(productId, (requested.get(productId) ?? 0) + qty);
    }

    const products = await Product.find({ _id: { $in: [...requested.keys()] } }).lean<any[]>();
    const found = new Map(products.map((p) => [String(p._id), p]));

    const lines: any[] = [];
    const settings = await getCommerceSettings();

    for (const [productId, requestedQty] of requested) {
      const product = found.get(productId);

      if (!product || !product.isActive) {
        issues.push({ productId, code: "unavailable", message: "One product is no longer available and has been removed from your basket." });
        continue;
      }

      const moq = Math.max(1, Number(product.moq) || 1);
      const stock = Math.max(0, Number(product.stock) || 0);

      if (stock <= 0) {
        issues.push({ productId, code: "out_of_stock", message: `${product.title} is currently out of stock.` });
        continue;
      }

      let qty = requestedQty;
      if (qty < moq) {
        issues.push({
          productId,
          code: "moq_not_met",
          message: `${product.title} has a minimum order quantity of ${moq}.`,
        });
        qty = moq;
      }
      if (qty > stock) {
        issues.push({
          productId,
          code: "insufficient_stock",
          message: `Only ${stock} units of ${product.title} are available.`,
        });
        qty = stock;
      }

      const line = buildLine(product, qty);
      const breakdown = lineBreakdown(product, qty);
      lines.push({
        ...line,
        slug: product.slug,
        moq,
        stock,
        unit: product.unit,
        hsnCode: product.hsnCode,
        nextSlab: breakdown.nextSlab,
        unitPrice: breakdown.unitPrice,
        taxable: breakdown.taxable,
        total: breakdown.total,
      });
    }

    return ok({
      lines,
      totals: computeTotals(lines, settings),
      settings,
      issues,
    });
  } catch (error) {
    return serverError("api/cart/price:POST", error);
  }
}
