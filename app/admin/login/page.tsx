import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BrandLockup } from "@/components/site/Brand";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = {
  title: "Administrator sign-in",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const next = typeof searchParams.next === "string" && searchParams.next.startsWith("/admin") ? searchParams.next : "/admin";

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="shell flex h-16 items-center justify-between">
          <BrandLockup subtitle="Operations" />
          <Link href="/" className="text-sm font-medium text-muted transition hover:text-brand-700">
            Back to storefront
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
            <span className="grid h-11 w-11 place-items-center rounded-chip bg-brand-50 text-brand-600">
              <ShieldCheck size={21} />
            </span>
            <h1 className="mt-4 text-xl font-bold text-navy-900">Administrator sign-in</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              The operations dashboard contains customer orders, enquiries and pricing. Access requires an administrator
              account.
            </p>
            <LoginForm next={next} />
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-muted">
            Sign in with the administrator configured through{" "}
            <code className="rounded bg-navy-50 px-1 py-0.5">ADMIN_EMAIL</code> and{" "}
            <code className="rounded bg-navy-50 px-1 py-0.5">ADMIN_PASSWORD</code>. If the database has no administrator
            yet, one is created from those values the first time this page is opened.
          </p>
        </div>
      </main>
    </div>
  );
}
