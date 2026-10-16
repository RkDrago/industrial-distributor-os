import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { getStorefrontCategories } from "@/lib/catalog";

/**
 * Storefront chrome. Category navigation is read on the server so the header
 * ships as markup rather than waiting on a client fetch.
 */
export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const categories = await getStorefrontCategories();

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-control focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>
      <SiteHeader categories={categories} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <CartDrawer />
      <SiteFooter categories={categories} />
    </div>
  );
}
