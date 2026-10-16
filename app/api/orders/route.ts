import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { requireAdmin } from "@/lib/auth";
import { getCommerceSettings } from "@/lib/settings";
import { notifyDistributor, emailRow, emailTable } from "@/lib/email";
import {
  asInt,
  cleanText,
  fail,
  getClientIp,
  isSameOrigin,
  ok,
  rateLimit,
  serverError,
  sweepRateLimit,
} from "@/lib/http";
import { buildLine, computeTotals } from "@/lib/pricing";
import { parseOrderInput } from "@/lib/validators";
import { ORDER_REF_COOKIE, ORDER_REF_COOKIE_OPTIONS, createOrderRef } from "@/lib/order-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LINES = 50;

function buildOrderNumber(): string {
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const random = Math.floor(Math.random() * 46656)
    .toString(36)
    .toUpperCase()
    .padStart(3, "0");
  return `NGZ-${stamp}-${random}`;
}

/**
 * Place an order.
 *
 * The client sends product ids, quantities and its own business details only.
 * Every price, tax figure and total is recomputed here from the product record,
 * and stock is decremented with a conditional update so two simultaneous
 * orders cannot both claim the last units.
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site submissions are not allowed.", 403);

  try {
    sweepRateLimit();
    const limited = rateLimit(`orders:create:${getClientIp(req)}`, 12, 10 * 60_000);
    if (!limited.allowed) {
      return fail("Too many order attempts. Please wait a few minutes and try again.", 429);
    }

    const body = await req.json().catch(() => null);
    const parsed = parseOrderInput(body);
    if (!parsed.ok) return fail(parsed.errors[0], 422, { errors: parsed.errors });
    const input = parsed.value;

    await connectDB();

    // Idempotency: a retried submission returns the original order instead of
    // creating a second one.
    if (input.idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey: input.idempotencyKey }).lean<any>();
      if (existing) {
        return ok({ ok: true, duplicate: true, order: publicOrder(existing) });
      }
    }

    const uniqueIds = [...new Set(input.items.map((i) => i.productId))].slice(0, MAX_LINES);
    const products = await Product.find({ _id: { $in: uniqueIds }, isActive: true }).lean<any[]>();
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const errors: string[] = [];
    const wanted: { product: any; qty: number }[] = [];

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        errors.push("One of the products in your basket is no longer available. Please remove it and try again.");
        continue;
      }
      const moq = Math.max(1, Number(product.moq) || 1);
      const stock = Math.max(0, Number(product.stock) || 0);

      if (item.qty < moq) {
        errors.push(`${product.title} has a minimum order quantity of ${moq}.`);
        continue;
      }
      if (stock <= 0) {
        errors.push(`${product.title} is out of stock.`);
        continue;
      }
      if (item.qty > stock) {
        errors.push(`Only ${stock} units of ${product.title} are available right now.`);
        continue;
      }

      const existingLine = wanted.find((w) => String(w.product._id) === String(product._id));
      if (existingLine) existingLine.qty += item.qty;
      else wanted.push({ product, qty: item.qty });
    }

    if (errors.length) return fail(errors[0], 409, { errors });
    if (!wanted.length) return fail("Your basket is empty.", 400);

    // Reserve stock first, rolling back completely if any line falls short.
    const reserved: { productId: any; qty: number }[] = [];
    for (const { product, qty } of wanted) {
      const result = await Product.updateOne(
        { _id: product._id, isActive: true, stock: { $gte: qty } },
        { $inc: { stock: -qty } }
      );
      if (result.modifiedCount !== 1) {
        await Promise.all(
          reserved.map((r) => Product.updateOne({ _id: r.productId }, { $inc: { stock: r.qty } }))
        );
        return fail(
          `${product.title} sold out while you were checking out. Adjust the quantity and try again.`,
          409,
          { errors: [`Insufficient stock for ${product.title}.`] }
        );
      }
      reserved.push({ productId: product._id, qty });
    }

    const lines = wanted.map(({ product, qty }) => buildLine(product, qty));
    const settings = await getCommerceSettings();
    const totals = computeTotals(lines, settings);

    const statusHistory = [
      { status: "new", at: new Date(), by: "website", note: "Order placed by customer" },
    ];

    let created: any;
    try {
      created = await Order.create({
        orderNumber: buildOrderNumber(),
        idempotencyKey: input.idempotencyKey ?? undefined,
        contactName: input.contactName,
        customerEmail: input.customerEmail,
        contactPhone: input.contactPhone,
        companyName: input.companyName,
        gstin: input.gstin,
        items: lines,
        billingAddress: input.billingAddress,
        shippingAddress: input.shippingAddress,
        subtotal: totals.subtotal,
        gstTotal: totals.gstTotal,
        deliveryCharge: totals.deliveryCharge,
        grandTotal: totals.grandTotal,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentMethod === "enquiry" ? "not_applicable" : "pending",
        orderStatus: "new",
        statusHistory,
        notes: input.notes,
      });
    } catch (error) {
      // Never leave stock reserved for an order that does not exist.
      await Promise.all(reserved.map((r) => Product.updateOne({ _id: r.productId }, { $inc: { stock: r.qty } })));
      throw error;
    }

    // Notification is best-effort: the order already exists and must not be lost.
    const itemRows = lines
      .map((l) => emailRow(`${l.title} (${l.sku})`, `${l.qty} × ₹${l.price.toFixed(2)} = ₹${l.lineTotal.toFixed(2)}`))
      .join("");
    notifyDistributor(
      `New order ${created.orderNumber}`,
      `${emailTable(
        itemRows +
          emailRow("Subtotal", `₹${totals.subtotal.toFixed(2)}`) +
          emailRow("GST", `₹${totals.gstTotal.toFixed(2)}`) +
          emailRow("Delivery", `₹${totals.deliveryCharge.toFixed(2)}`) +
          emailRow("Grand total", `₹${totals.grandTotal.toFixed(2)}`) +
          emailRow("Company", input.companyName) +
          emailRow("GSTIN", input.gstin || "Not provided") +
          emailRow("Contact", `${input.contactName} · ${input.customerEmail} · ${input.contactPhone}`) +
          emailRow(
            "Deliver to",
            `${input.shippingAddress.line1}, ${input.shippingAddress.city}, ${input.shippingAddress.state} ${input.shippingAddress.pincode}`
          )
      )}`
    ).catch(() => undefined);

    const response = NextResponse.json(
      { ok: true, order: publicOrder(created) },
      { status: 201, headers: { "cache-control": "no-store" } }
    );
    // Lets the confirmation page read exactly this order, and only this order.
    response.cookies.set(ORDER_REF_COOKIE, createOrderRef(String(created._id)), ORDER_REF_COOKIE_OPTIONS);
    return response;
  } catch (error) {
    return serverError("api/orders:POST", error);
  }
}

/** Order list for the operations dashboard. Administrator only. */
export async function GET(req: Request) {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    await connectDB();
    const url = new URL(req.url);
    const page = asInt(url.searchParams.get("page"), 1, 1, 10_000);
    const pageSize = asInt(url.searchParams.get("pageSize"), 20, 1, 100);
    const status = cleanText(url.searchParams.get("status"), 20);
    const search = cleanText(url.searchParams.get("search"), 80);
    const from = cleanText(url.searchParams.get("from"), 30);
    const to = cleanText(url.searchParams.get("to"), 30);

    const query: Record<string, any> = {};
    if (status && status !== "all") query.orderStatus = status;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ orderNumber: rx }, { companyName: rx }, { customerEmail: rx }, { contactName: rx }, { gstin: rx }];
    }
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from && !Number.isNaN(new Date(from).getTime())) range.$gte = new Date(from);
      if (to && !Number.isNaN(new Date(to).getTime())) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        range.$lte = end;
      }
      if (Object.keys(range).length) query.createdAt = range;
    }

    const [items, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean<any[]>(),
      Order.countDocuments(query),
    ]);

    return ok({
      items: items.map((o) => ({ ...o, _id: String(o._id) })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    return serverError("api/orders:GET", error);
  }
}

/** Strip anything internal before an order is returned to a public caller. */
function publicOrder(order: any) {
  return {
    id: String(order._id ?? order.id),
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    items: order.items,
    subtotal: order.subtotal,
    gstTotal: order.gstTotal,
    deliveryCharge: order.deliveryCharge ?? 0,
    grandTotal: order.grandTotal,
    companyName: order.companyName,
    gstin: order.gstin,
    contactName: order.contactName,
    customerEmail: order.customerEmail,
    contactPhone: order.contactPhone,
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    notes: order.notes,
    statusHistory: order.statusHistory ?? [],
    trackingNumber: order.trackingNumber,
    courier: order.courier,
    createdAt: order.createdAt,
  };
}
