import { SettingsView } from "@/components/account/SettingsView";

export const metadata = { title: "Account settings", robots: { index: false, follow: false } };

export default function AccountSettingsPage() {
  return <SettingsView />;
}
