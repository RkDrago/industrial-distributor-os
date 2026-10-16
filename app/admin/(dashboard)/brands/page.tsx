import { AdminPageHeader } from "@/components/admin/ui";
import { BrandsView } from "@/components/admin/BrandsView";

export const metadata = { title: "Brands", robots: { index: false, follow: false } };

export default function AdminBrandsPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Brands"
        description="Manufacturers and trade names you stock. A brand can only be deleted once no products reference it."
      />
      <BrandsView />
    </>
  );
}
