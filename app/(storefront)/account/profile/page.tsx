import { ProfileView } from "@/components/account/ProfileView";

export const metadata = { title: "Company profile", robots: { index: false, follow: false } };

export default function AccountProfilePage() {
  return <ProfileView />;
}
