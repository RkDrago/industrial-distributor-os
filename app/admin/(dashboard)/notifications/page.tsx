import { AdminPageHeader } from "@/components/admin/ui";
import { NotificationsView } from "@/components/admin/NotificationsView";

export const metadata = { title: "Notifications", robots: { index: false, follow: false } };

export default function AdminNotificationsPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Operations"
        title="Notifications"
        description="Every order, booking, enquiry and status change, in one feed. Unread state is shared across the team."
      />
      <NotificationsView />
    </>
  );
}
