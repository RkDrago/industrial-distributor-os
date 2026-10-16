import { AdminPageHeader } from "@/components/admin/ui";
import { BookingsView } from "@/components/admin/BookingsView";

export const metadata = { title: "Bookings", robots: { index: false, follow: false } };

export default function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const focus = typeof searchParams.focus === "string" ? searchParams.focus : "";

  return (
    <>
      <AdminPageHeader
        eyebrow="Operations"
        title="Bookings"
        description="Appointments customers requested from the contact page — quotation calls, site stock audits and account setup."
      />
      <BookingsView focusId={focus} />
    </>
  );
}
