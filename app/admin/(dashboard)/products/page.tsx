import { AdminPageHeader } from "@/components/admin/ui";
import { ProductsView } from "@/components/admin/ProductsView";

export const metadata = { title: "Products", robots: { index: false, follow: false } };

export default function AdminProductsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const one = (key: string) => (typeof searchParams[key] === "string" ? (searchParams[key] as string) : "");

  return (
    <>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Add and edit products, including SKU, HSN code, minimum order quantity, GST rate, distributor price and quantity-based bulk tiers."
      />
      <ProductsView initialCategory={one("category")} initialBrand={one("brand")} initialSearch={one("search")} />
    </>
  );
}
