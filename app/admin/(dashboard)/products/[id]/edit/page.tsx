import { ProductEditView } from "@/components/admin/ProductEditView";

export const metadata = { title: "Edit product", robots: { index: false, follow: false } };

export default function AdminProductEditPage({ params }: { params: { id: string } }) {
  return <ProductEditView id={params.id} />;
}
