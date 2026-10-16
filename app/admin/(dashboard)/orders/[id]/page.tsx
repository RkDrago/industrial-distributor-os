import { OrderDetailView } from "@/components/admin/OrderDetailView";

export const metadata = { title: "Order detail", robots: { index: false, follow: false } };

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  return <OrderDetailView id={params.id} />;
}
