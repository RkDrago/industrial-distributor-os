import { ProductCreateView } from "@/components/admin/ProductCreateView";

export const metadata = { title: "Add product", robots: { index: false, follow: false } };

export default function AdminProductCreatePage() {
  return <ProductCreateView />;
}
