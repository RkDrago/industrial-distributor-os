import { AdminPageHeader } from "@/components/admin/ui";
import { CategoriesView } from "@/components/admin/CategoriesView";

export const metadata = { title: "Categories", robots: { index: false, follow: false } };

export default function AdminCategoriesPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Categories"
        description="The groupings customers browse by, with the number of products and units in each. Hiding a category keeps its products intact."
      />
      <CategoriesView />
    </>
  );
}
