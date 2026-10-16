import { TrackView } from "./TrackView";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";

export const metadata = {
  title: "Track an order",
  description:
    "Follow your industrial order from received to delivered. Enter your order number and the email address used on the order.",
};

export default function TrackPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const initial = typeof searchParams.order === "string" ? searchParams.order.toUpperCase() : "";

  return (
    <div className="shell py-7 lg:py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Track order" }]} />
      <header className="mt-5 mb-6">
        <h1 className="text-2xl font-bold tracking-[-0.015em] text-navy-900 sm:text-3xl">Track your order</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          See the current status, delivery address and full invoice breakdown for any order you have placed with us.
        </p>
      </header>
      <TrackView initialOrderNumber={initial} />
    </div>
  );
}
