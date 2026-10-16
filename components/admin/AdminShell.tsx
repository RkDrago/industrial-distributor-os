"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  Boxes,
  ClipboardList,
  Contact,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  Settings,
  ShoppingBag,
  Tags,
  Truck,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/site/Brand";
import { NotificationBell } from "./NotificationBell";

const NAV_GROUPS: { title: string; links: { href: string; label: string; icon: any }[] }[] = [
  {
    title: "Operations",
    links: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
      { href: "/admin/inquiries", label: "Enquiries & quotes", icon: PackageSearch },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    title: "Catalogue",
    links: [
      { href: "/admin/products", label: "Products", icon: Boxes },
      { href: "/admin/categories", label: "Categories", icon: Tags },
      { href: "/admin/brands", label: "Brands", icon: Contact },
      { href: "/admin/inventory", label: "Inventory", icon: Truck },
    ],
  },
  {
    title: "Business",
    links: [
      { href: "/admin/customers", label: "Customers", icon: Contact },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/admin/session", { method: "DELETE" });
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const nav = (
    <nav className="space-y-6" aria-label="Operations dashboard">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-navy-400">{group.title}</p>
          <ul className="mt-2 space-y-0.5">
            {group.links.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-control px-3 py-2.5 text-sm transition ${
                      active ? "bg-brand-500 font-semibold text-white" : "text-navy-100 hover:bg-white/10"
                    }`}
                  >
                    <Icon size={17} className={active ? "text-white" : "text-navy-300"} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* ------------------------------------------------------- desktop sidebar */}
      <aside className="hidden bg-navy-900 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <BrandMark size={32} />
          <div className="leading-tight">
            <p className="text-[15px] font-bold text-white">Norgez</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-navy-300">Operations</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">{nav}</div>
        <div className="border-t border-white/10 p-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-control px-3 py-2.5 text-sm text-navy-200 transition hover:bg-white/10"
          >
            <ExternalLink size={16} />
            View storefront
          </Link>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-sm text-navy-200 transition hover:bg-white/10 disabled:opacity-60"
          >
            <LogOut size={16} />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
          <p className="mt-2 truncate px-3 text-[11px] text-navy-400" title={email}>
            {email}
          </p>
        </div>
      </aside>

      {/* -------------------------------------------------------- mobile header */}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-40 bg-navy-900">
          <div className="flex h-14 items-center gap-3 px-4">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-control border border-white/15 text-white lg:hidden"
              aria-label="Open dashboard menu"
              aria-expanded={menuOpen}
            >
              <Menu size={19} />
            </button>
            <div className="flex items-center gap-2.5 lg:hidden">
              <BrandMark size={28} />
              <span className="text-sm font-semibold text-white">Operations</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <NotificationBell />
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* --------------------------------------------------------- mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60 animate-fadeIn" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 top-0 flex h-full w-[min(300px,86vw)] flex-col bg-navy-900 shadow-pop animate-fadeIn">
            <div className="flex items-center justify-between px-4 py-4">
              <span className="flex items-center gap-2.5">
                <BrandMark size={30} />
                <span className="text-sm font-bold text-white">Norgez Operations</span>
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-control border border-white/15 text-white"
                aria-label="Close menu"
              >
                <X size={17} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">{nav}</div>
            <div className="border-t border-white/10 p-3">
              <Link href="/" className="flex items-center gap-2.5 rounded-control px-3 py-2.5 text-sm text-navy-200">
                <ExternalLink size={16} />
                View storefront
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-sm text-navy-200"
              >
                <LogOut size={16} />
                Sign out
              </button>
              <p className="mt-2 truncate px-3 text-[11px] text-navy-400">{email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
