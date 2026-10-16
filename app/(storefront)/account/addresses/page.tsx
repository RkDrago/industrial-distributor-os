import { AddressesView } from "@/components/account/AddressesView";

export const metadata = { title: "Saved addresses", robots: { index: false, follow: false } };

export default function AccountAddressesPage() {
  return <AddressesView />;
}
