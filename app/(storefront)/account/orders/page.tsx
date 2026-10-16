import { OrdersView } from "@/components/account/OrdersView";

export const metadata = { title: "My orders", robots: { index: false, follow: false } };

export default function AccountOrdersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const one = (key: string) => (typeof searchParams[key] === "string" ? (searchParams[key] as string) : "");
  return (
    <OrdersView
      initialOrderNumber={one("order").toUpperCase()}
      initialEmail={one("email")}
    />
  );
}
