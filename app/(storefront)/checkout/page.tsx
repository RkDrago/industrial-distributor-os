import Link from "next/link";
import { CheckoutView } from "./CheckoutView";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";

export const metadata = {
  title: "Checkout",
  description:
    "Review your order, confirm company and GST details, and place your order. No account required — you can track the order with your email address.",
  robots: { index: false, follow: true },
};

export default function CheckoutPage() {
  return (
    <div className="shell py-7 lg:py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Basket", href: "/cart" }, { label: "Checkout" }]} />
      <header className="mt-5 mb-6">
        <h1 className="text-2xl font-bold tracking-[-0.015em] text-navy-900 sm:text-3xl">Checkout</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Enter your billing and delivery details. No account is needed — you can track the order afterwards with your
          order number and email.{" "}
          <Link href="/track" className="link-brand">
            Already placed an order?
          </Link>
        </p>
      </header>
      <CheckoutView />
    </div>
  );
}
