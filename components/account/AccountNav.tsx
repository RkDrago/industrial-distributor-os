"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, FileText, LayoutDashboard, MapPin, MessageSquareQuote, Settings, Truck, UserRound } from "lucide-react";

const LINKS = [
  { href: "/account", label: "Overview", icon: LayoutDashboard },
  { href: "/account/orders", label: "My orders", icon: Truck },
  { href: "/account/inquiries", label: "Quotes & enquiries", icon: MessageSquareQuote },
  { href: "/account/invoices", label: "Invoices", icon: FileText },
  { href: "/account/addresses", label: "Saved addresses", icon: MapPin },
  { href: "/account/profile", label: "Company profile", icon: Building2 },
  { href: "/account/settings", label: "Account settings", icon: Settings },
];

export function AccountNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile: horizontally scrollable chips so the nav never wraps awkwardly. */}
      <nav className="lg:hidden" aria-label="Account sections">
        <ul className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href} className="shrink-0">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-chip border px-3 py-2 text-[13px] font-medium transition ${
                    active
                      ? "border-brand-200 bg-brand-50 text-brand-800"
                      : "border-line bg-surface text-navy-600 hover:border-lineStrong"
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav className="hidden lg:block" aria-label="Account sections">
        <ul className="sticky top-32 space-y-0.5 rounded-card border border-line bg-surface p-2">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-control px-3 py-2.5 text-sm transition ${
                    active ? "bg-brand-50 font-semibold text-brand-800" : "text-navy-600 hover:bg-navy-50"
                  }`}
                >
                  <Icon size={17} className={active ? "text-brand-600" : "text-navy-400"} />
                  {label}
                </Link>
              </li>
            );
          })}
          <li className="mt-1 border-t border-line pt-1">
            <Link
              href="/track"
              className="flex items-center gap-2.5 rounded-control px-3 py-2.5 text-sm text-navy-600 transition hover:bg-navy-50"
            >
              <UserRound size={17} className="text-navy-400" />
              Track without saving
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
