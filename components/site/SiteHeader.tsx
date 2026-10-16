"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  LayoutGrid,
  Menu,
  PackageSearch,
  ShoppingCart,
  Store,
  Truck,
  UserRound,
} from "lucide-react";
import { AnnouncementBar } from "./AnnouncementBar";
import { BrandLockup } from "./Brand";
import { SearchForm } from "./SearchForm";
import { Drawer } from "@/components/ui/Overlay";
import { useCart } from "@/components/cart/CartProvider";
import type { StorefrontCategory } from "@/lib/catalog";

export function SiteHeader({ categories }: { categories: StorefrontCategory[] }) {
  const pathname = usePathname();
  const { count, hydrated, openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Close transient menus whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
    setDeptOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!deptOpen) return;
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-department-menu]")) setDeptOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [deptOpen]);

  const accountActive = pathname.startsWith("/account") || pathname.startsWith("/track");

  return (
    <>
      <AnnouncementBar />
      <header
        className={`sticky top-0 z-50 border-b border-line bg-surface transition-shadow ${
          scrolled ? "shadow-card" : ""
        }`}
      >
        <div className="shell">
          <div className="flex h-[60px] items-center gap-3 lg:h-[68px]">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="btn btn-ghost !min-h-10 !px-2 lg:hidden"
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
            >
              <Menu size={21} />
            </button>

            <BrandLockup compact />

            <div className="hidden flex-1 justify-center px-4 md:flex">
              <SearchForm variant="header" className="w-full max-w-xl" />
            </div>

            <nav className="ml-auto flex items-center gap-0.5 lg:gap-1" aria-label="Account and basket">
              <Link
                href="/track"
                className="hidden items-center gap-2 rounded-control px-3 py-2 text-sm font-medium text-navy-600 transition hover:bg-navy-50 hover:text-navy-900 lg:inline-flex"
              >
                <Truck size={17} />
                <span>Track order</span>
              </Link>
              <Link
                href="/account"
                aria-current={accountActive ? "page" : undefined}
                className={`hidden items-center gap-2 rounded-control px-3 py-2 text-sm font-medium transition hover:bg-navy-50 lg:inline-flex ${
                  accountActive ? "text-brand-700" : "text-navy-600 hover:text-navy-900"
                }`}
              >
                <UserRound size={17} />
                <span>Account</span>
              </Link>

              <Link
                href="/account"
                className="inline-flex h-10 w-10 items-center justify-center rounded-control text-navy-600 transition hover:bg-navy-50 lg:hidden"
                aria-label="Account and order tracking"
              >
                <UserRound size={19} />
              </Link>

              <button
                type="button"
                onClick={openCart}
                className="relative inline-flex h-10 items-center gap-2 rounded-control px-2.5 text-navy-700 transition hover:bg-navy-50 lg:px-3"
                aria-label={`Basket${hydrated && count > 0 ? `, ${count} items` : ", empty"}`}
              >
                <span className="relative">
                  <ShoppingCart size={20} />
                  {hydrated && count > 0 && (
                    <span className="absolute -right-2.5 -top-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </span>
                <span className="hidden text-sm font-semibold lg:inline">Basket</span>
              </button>
            </nav>
          </div>

          {/* Mobile search sits in its own row so the header stays usable at 360px. */}
          <div className="pb-3 md:hidden">
            <SearchForm variant="header" />
          </div>
        </div>

        <div className="hidden border-t border-line lg:block">
          <div className="shell flex h-12 items-center gap-1">
            <div className="relative" data-department-menu>
              <button
                type="button"
                onClick={() => setDeptOpen((v) => !v)}
                aria-expanded={deptOpen}
                className="inline-flex items-center gap-2 rounded-control px-3 py-2 text-sm font-semibold text-navy-800 transition hover:bg-navy-50"
              >
                <LayoutGrid size={17} />
                <span>All departments</span>
                <ChevronDown size={15} className={`transition ${deptOpen ? "rotate-180" : ""}`} />
              </button>
              {deptOpen && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[min(560px,90vw)] rounded-card border border-line bg-surface p-2 shadow-pop animate-fadeUp">
                  <div className="grid grid-cols-2 gap-1">
                    {categories.length === 0 && (
                      <p className="col-span-2 px-3 py-4 text-sm text-muted">
                        Categories will appear here once products are published.
                      </p>
                    )}
                    {categories.map((category) => (
                      <Link
                        key={category.id}
                        href={`/products?category=${category.slug}`}
                        className="flex items-center justify-between gap-3 rounded-control px-3 py-2.5 text-sm text-navy-700 transition hover:bg-navy-50"
                      >
                        <span className="truncate">{category.name}</span>
                        <span className="shrink-0 text-xs text-muted">{category.productCount}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mx-1 h-5 w-px bg-line" />

            <div className="flex flex-1 items-center gap-0.5 overflow-hidden">
              {categories.slice(0, 6).map((category) => (
                <Link
                  key={category.id}
                  href={`/products?category=${category.slug}`}
                  className="whitespace-nowrap rounded-control px-3 py-2 text-sm text-navy-600 transition hover:bg-navy-50 hover:text-navy-900"
                >
                  {category.name}
                </Link>
              ))}
            </div>

            <Link
              href="/quote"
              className="ml-auto inline-flex items-center gap-2 whitespace-nowrap rounded-control px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              <PackageSearch size={17} />
              <span>Request bulk quote</span>
            </Link>
          </div>
        </div>
      </header>

      <Drawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        side="left"
        title="Menu"
        description="Browse departments and manage your order"
      >
        <nav className="space-y-1" aria-label="Mobile navigation">
          <Link href="/products" className="flex items-center gap-3 rounded-control px-3 py-3 text-sm font-semibold text-navy-800 hover:bg-navy-50">
            <Store size={18} className="text-brand-600" />
            All products
          </Link>
          <Link href="/quote" className="flex items-center gap-3 rounded-control px-3 py-3 text-sm font-semibold text-navy-800 hover:bg-navy-50">
            <PackageSearch size={18} className="text-brand-600" />
            Request a bulk quote
          </Link>
          <Link href="/track" className="flex items-center gap-3 rounded-control px-3 py-3 text-sm font-semibold text-navy-800 hover:bg-navy-50">
            <Truck size={18} className="text-brand-600" />
            Track an order
          </Link>
          <Link href="/account" className="flex items-center gap-3 rounded-control px-3 py-3 text-sm font-semibold text-navy-800 hover:bg-navy-50">
            <UserRound size={18} className="text-brand-600" />
            My account
          </Link>
        </nav>

        <div className="mt-6">
          <p className="eyebrow">Departments</p>
          <nav className="mt-3 space-y-0.5" aria-label="Departments">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="flex items-center justify-between gap-3 rounded-control px-3 py-2.5 text-sm text-navy-700 hover:bg-navy-50"
              >
                <span className="truncate">{category.name}</span>
                <span className="shrink-0 text-xs text-muted">{category.productCount}</span>
              </Link>
            ))}
            {categories.length === 0 && <p className="px-3 py-2 text-sm text-muted">No categories published yet.</p>}
          </nav>
        </div>
      </Drawer>
    </>
  );
}
