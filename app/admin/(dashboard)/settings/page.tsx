import { AdminPageHeader } from "@/components/admin/ui";
import { SettingsView } from "@/components/admin/SettingsView";

export const metadata = { title: "Settings", robots: { index: false, follow: false } };

export default function AdminSettingsPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Business"
        title="Settings"
        description="Delivery charges and stock thresholds. These are the only operational values checkout depends on, and each one explains its own effect."
      />
      <SettingsView />
    </>
  );
}
