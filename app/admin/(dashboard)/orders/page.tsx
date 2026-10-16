import { AdminPageHeader } from "@/components/admin/ui";
import { OrdersView } from "@/components/admin/OrdersView";

export const metadata = { title: "Orders", robots: { index: false, follow: false } };

export default function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const search = typeof searchParams.search === "string" ? searchParams.search : "";

  return (
    <>
      <AdminPageHeader
        eyebrow="Operations"
        title="Orders"
        description="Every order placed through the storefront. Open an order to inspect its items, GST breakdown, delivery address and status history."
      />
      <OrdersView initialSearch={search} />
    </>
  );
}
