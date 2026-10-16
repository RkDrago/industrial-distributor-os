import { InvoicesView } from "@/components/account/InvoicesView";

export const metadata = { title: "Invoices", robots: { index: false, follow: false } };

export default function AccountInvoicesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const one = (key: string) => (typeof searchParams[key] === "string" ? (searchParams[key] as string) : "");
  return <InvoicesView initialOrderNumber={one("order").toUpperCase()} initialEmail={one("email")} />;
}
