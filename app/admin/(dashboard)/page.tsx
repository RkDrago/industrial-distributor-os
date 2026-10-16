import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminPageHeader } from "@/components/admin/ui";

export default function AdminHomePage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Operations overview"
        title="Today at a glance"
        description="Orders, enquiries and stock as they stand right now, counted from live records."
        actions={
          <>
            <a href="/admin/orders" className="btn btn-primary btn-sm">
              Manage orders
            </a>
            <a href="/admin/products/new" className="btn btn-outline btn-sm">
              Add a product
            </a>
          </>
        }
      />
      <AdminOverview />
    </>
  );
}
