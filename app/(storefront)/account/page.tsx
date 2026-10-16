import Link from "next/link";
import { ArrowRight, Building2, FileText, MapPin, MessageSquareQuote, Truck } from "lucide-react";
import { AccountOverview } from "@/components/account/AccountOverview";

export default function AccountOverviewPage() {
  return (
    <div className="space-y-6">
      <AccountOverview />

      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="text-base font-semibold text-navy-900">What you can do here</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[
            {
              href: "/account/orders",
              icon: Truck,
              title: "Follow your orders",
              copy: "Check the status of anything you have ordered, from received to delivered.",
            },
            {
              href: "/account/inquiries",
              icon: MessageSquareQuote,
              title: "Review quotations",
              copy: "See every enquiry you have sent and the quote we returned, with reference numbers.",
            },
            {
              href: "/account/invoices",
              icon: FileText,
              title: "Access invoices",
              copy: "Open a printable tax invoice with GST and HSN detail for any order.",
            },
            {
              href: "/account/addresses",
              icon: MapPin,
              title: "Save delivery addresses",
              copy: "Store your site and warehouse addresses to fill the checkout form in one click.",
            },
          ].map(({ href, icon: Icon, title, copy }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start gap-3 rounded-card border border-line p-4 transition hover:border-lineStrong hover:bg-canvas"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-chip bg-brand-50 text-brand-600">
                <Icon size={17} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-navy-900">
                  {title}
                  <ArrowRight size={14} className="text-navy-300 transition group-hover:translate-x-0.5" />
                </span>
                <span className="mt-1 block text-[13px] leading-5 text-muted">{copy}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
          <Building2 size={17} className="text-brand-600" />
          Company profile &amp; GSTIN
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-muted">
          Save your company name and GSTIN once and they are filled in automatically on every checkout and quotation
          request. Details are stored in this browser and validated again when you order.
        </p>
        <Link href="/account/profile" className="btn btn-outline btn-sm mt-4">
          Edit company profile
        </Link>
      </section>
    </div>
  );
}
