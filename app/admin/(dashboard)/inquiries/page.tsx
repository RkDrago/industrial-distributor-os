import { AdminPageHeader } from "@/components/admin/ui";
import { InquiriesView } from "@/components/admin/InquiriesView";

export const metadata = { title: "Enquiries & quotes", robots: { index: false, follow: false } };

export default function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const focus = typeof searchParams.focus === "string" ? searchParams.focus : "";
  const search = typeof searchParams.search === "string" ? searchParams.search : "";

  return (
    <>
      <AdminPageHeader
        eyebrow="Operations"
        title="Enquiries & quotes"
        description="Bulk enquiries from the storefront and quote requests. Record the amount you quoted so the customer's account area shows the same figure."
      />
      <InquiriesView focusId={focus} initialSearch={search} />
    </>
  );
}
