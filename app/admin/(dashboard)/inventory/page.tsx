import { AdminPageHeader } from "@/components/admin/ui";
import { InventoryView } from "@/components/admin/InventoryView";

export const metadata = { title: "Inventory", robots: { index: false, follow: false } };

export default function AdminInventoryPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Inventory"
        description="What is on the shelves, what is running low, and what customers cannot currently order. Stock figures are the same ones checkout enforces."
      />
      <InventoryView />
    </>
  );
}
