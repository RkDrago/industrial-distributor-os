import Link from "next/link";
import { AccountNav } from "@/components/account/AccountNav";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";

export const metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell py-7 lg:py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "My account" }]} />

      <header className="mt-5">
        <h1 className="text-2xl font-bold tracking-[-0.015em] text-navy-900 sm:text-3xl">My account</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Orders, quotations and invoices for your business. Checkout does not require an account, so anything you saved
          here lives in this browser only — orders and enquiries are matched using your email address.
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>

      <div className="mt-10 rounded-card border border-line bg-canvas p-4">
        <p className="text-xs leading-5 text-muted">
          Looking after the catalogue?{" "}
          <Link href="/admin" className="link-brand">
            Open the operations dashboard
          </Link>{" "}
          — it requires an administrator sign-in.
        </p>
      </div>
    </div>
  );
}
