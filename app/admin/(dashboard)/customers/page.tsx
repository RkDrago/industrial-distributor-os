import { AdminPageHeader } from "@/components/admin/ui";
import { CustomersView } from "@/components/admin/CustomersView";

export const metadata = { title: "Customers", robots: { index: false, follow: false } };

export default function AdminCustomersPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Business"
        title="Customers"
        description="The companies you have traded with, assembled from their orders and enquiries. Businesses that enquired but have not ordered yet are marked as leads so you can follow up."
      />
      <CustomersView />
    </>
  );
}
