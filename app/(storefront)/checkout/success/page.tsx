import Link from "next/link";
import { cookies } from "next/headers";
import { CheckCircle2, FileText, Mail, PackageSearch, Truck } from "lucide-react";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { ORDER_REF_COOKIE, verifyOrderRef } from "@/lib/order-token";
import { ClearCart } from "@/components/cart/ClearCart";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { companyInfo } from "@/lib/company";
import { formatDate, formatINR, formatPrice, formatQty } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: false },
};

/**
 * Confirmation page.
 *
 * Reads the signed order reference set when the order was created, so it can
 * show exactly the order that was just placed without an endpoint that
 * enumerates orders. There is no route that accepts an arbitrary order id.
 */
export default async function CheckoutSuccessPage() {
  const orderId = verifyOrderRef(cookies().get(ORDER_REF_COOKIE)?.value);

  let order: any = null;
  if (orderId) {
    try {
      await connectDB();
      order = await Order.findById(orderId).lean<any>();
    } catch (error) {
      console.error("[checkout/success] unable to load order", error);
    }
  }

  return (
    <div className="shell-narrow py-10 lg:py-14">
      <ClearCart />

      <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-success-soft text-brand-600">
            <CheckCircle2 size={24} />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-navy-900 sm:text-2xl">Thank you — your order has been received</h1>
            {order ? (
              <p className="mt-2 text-sm leading-6 text-muted">
                We have recorded order <span className="font-semibold text-navy-800">{order.orderNumber}</span> placed on{" "}
                {formatDate(order.createdAt)}. Our team is confirming stock, the applicable quantity rate and delivery,
                and will contact you on {order.customerEmail || "your email address"}.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted">
                Your order was submitted. If you do not see the confirmation below, check the email address on the order
                or contact our team with your order number.
              </p>
            )}
          </div>
        </div>

        {order && (
          <>
            <dl className="mt-7 grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted">Order number</dt>
                <dd className="mt-1 text-sm font-semibold text-navy-900">{order.orderNumber}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Status</dt>
                <dd className="mt-1">
                  <OrderStatusBadge status={order.orderStatus} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Order total</dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums text-navy-900">
                  {formatINR(order.grandTotal)}
                </dd>
              </div>
            </dl>

            <div className="mt-7 border-t border-line pt-6">
              <h2 className="text-base font-semibold text-navy-900">Items on this order</h2>
              <ul className="mt-3 divide-y divide-line">
                {order.items?.map((line: any, index: number) => (
                  <li key={`${line.sku}-${index}`} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy-900">{line.title}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        SKU {line.sku}
                        {line.hsnCode ? ` · HSN ${line.hsnCode}` : ""} · {formatPrice(line.price)} ×{" "}
                        {formatQty(line.qty)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-navy-900">
                      {formatINR(line.lineTotal)}
                    </p>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Subtotal (excl. GST)</dt>
                  <dd className="tabular-nums text-navy-900">{formatINR(order.subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">GST</dt>
                  <dd className="tabular-nums text-navy-900">{formatINR(order.gstTotal)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Delivery</dt>
                  <dd className="tabular-nums text-navy-900">
                    {order.deliveryCharge > 0 ? formatINR(order.deliveryCharge) : "To be confirmed"}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-line pt-2.5">
                  <dt className="font-semibold text-navy-900">Total</dt>
                  <dd className="text-base font-bold tabular-nums text-navy-900">{formatINR(order.grandTotal)}</dd>
                </div>
              </dl>
            </div>
          </>
        )}

        {/* ------------------------------------------------------- next steps */}
        <div className="mt-8 border-t border-line pt-6">
          <h2 className="text-base font-semibold text-navy-900">What happens next</h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Mail,
                title: "We confirm your order",
                copy: "Our team reviews stock and the rate that applies at your quantity, then contacts you to confirm.",
              },
              {
                icon: FileText,
                title: "GST invoice issued",
                copy: "You receive a tax invoice with GST and HSN details for your records and payment process.",
              },
              {
                icon: Truck,
                title: "Dispatch and tracking",
                copy: "Once shipped, the courier and tracking reference appear against the order.",
              },
              {
                icon: PackageSearch,
                title: "Track any time",
                copy: "Use your order number and email address on the tracking page to see the current status.",
              },
            ].map(({ icon: Icon, title, copy }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-chip bg-brand-50 text-brand-600">
                  <Icon size={17} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-navy-900">{title}</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-muted">{copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-6">
          <Link href="/track" className="btn btn-primary">
            Track this order
          </Link>
          <Link href="/products" className="btn btn-outline">
            Continue shopping
          </Link>
          <Link href="/account/orders" className="btn btn-ghost">
            My orders
          </Link>
        </div>

        {companyInfo.email && (
          <p className="mt-5 text-xs leading-5 text-muted">
            Questions about this order? Email{" "}
            <a href={`mailto:${companyInfo.email}`} className="link-brand">
              {companyInfo.email}
            </a>{" "}
            quoting your order number.
          </p>
        )}
      </div>
    </div>
  );
}
