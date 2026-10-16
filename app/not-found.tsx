import Link from "next/link";
import { PackageSearch } from "lucide-react";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-16">
      <div className="w-full max-w-md rounded-card border border-line bg-surface p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
          <PackageSearch size={22} />
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-muted">Error 404</p>
        <h1 className="mt-2 text-xl font-bold text-navy-900">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          The link may be out of date, or the product may have been removed from the catalogue.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Link href="/products" className="btn btn-primary">
            Browse the catalogue
          </Link>
          <Link href="/" className="btn btn-outline">
            Go to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
