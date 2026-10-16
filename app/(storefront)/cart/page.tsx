import { CartView } from "./CartView";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";

export const metadata = {
  title: "Your basket",
  description: "Review the products, quantities and quantities-based rates in your basket before checkout.",
};

export default function CartPage() {
  return (
    <div className="shell py-7 lg:py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Basket" }]} />
      <header className="mt-5 mb-6">
        <h1 className="text-2xl font-bold tracking-[-0.015em] text-navy-900 sm:text-3xl">Your basket</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Adjust quantities to move between bulk tiers. Prices are per unit and exclude GST.
        </p>
      </header>
      <CartView />
    </div>
  );
}
