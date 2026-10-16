import Link from "next/link";
import { redirect } from "next/navigation";
import { PackageSearch, X } from "lucide-react";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { FilterPanel } from "@/components/product/FilterPanel";
import { CatalogueFiltersPanel } from "@/components/product/CatalogueFiltersPanel";
import { SortSelect } from "@/components/product/SortSelect";
import { ProductCard } from "@/components/product/ProductCard";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { buildCatalogueHref, parseCatalogueParams } from "@/lib/catalogue-params";
import { getSafeCommerceSettings, queryCatalogue } from "@/lib/catalog";
import { formatINRShort, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Industrial product catalogue",
  description:
    "Search industrial products by name, brand, SKU or HSN code. Compare unit prices and bulk quantity rates, then order for your business.",
};

const PAGE_SIZE = 12;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CataloguePage({ searchParams }: { searchParams: SearchParams }) {
  const query = parseCatalogueParams(searchParams, { pageSize: PAGE_SIZE });
  const [result, settings] = await Promise.all([queryCatalogue(query), getSafeCommerceSettings()]);

  // A hand-typed page beyond the last one should show the last page, not an
  // empty grid.
  if (!result.error && result.total > 0 && result.page > result.totalPages) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      const single = Array.isArray(value) ? value[0] : value;
      if (single && key !== "page") params.set(key, single);
    }
    params.set("page", String(result.totalPages));
    redirect(`/products?${params.toString()}`);
  }

  const categoryName = result.facets.categories.find((c) => c.slug === query.category)?.name;
  const brandName = result.facets.brands.find((b) => b.slug === query.brand)?.name;
  const searchTerm = typeof searchParams.search === "string" ? searchParams.search : "";

  const heading = categoryName ?? (searchTerm ? `Results for “${searchTerm}”` : "Industrial catalogue");

  const activeChips: { label: string; href: string }[] = [];
  if (searchTerm) activeChips.push({ label: `Search: ${searchTerm}`, href: buildCatalogueHref(searchParams, { search: null }) });
  if (categoryName) activeChips.push({ label: categoryName, href: buildCatalogueHref(searchParams, { category: null }) });
  if (brandName) activeChips.push({ label: brandName, href: buildCatalogueHref(searchParams, { brand: null }) });
  if (query.availability === "in") activeChips.push({ label: "In stock only", href: buildCatalogueHref(searchParams, { availability: null }) });
  if (query.availability === "out") activeChips.push({ label: "Out of stock", href: buildCatalogueHref(searchParams, { availability: null }) });
  if (query.minPrice !== null || query.maxPrice !== null) {
    const from = query.minPrice !== null ? formatINRShort(query.minPrice) : "₹0";
    const to = query.maxPrice !== null ? formatINRShort(query.maxPrice) : "any";
    activeChips.push({ label: `Price ${from} – ${to}`, href: buildCatalogueHref(searchParams, { minPrice: null, maxPrice: null }) });
  }

  const activeFilterCount = activeChips.length - (searchTerm ? 1 : 0);
  const clearAllHref = "/products";

  const buildPageHref = (page: number) => buildCatalogueHref(searchParams, { page });

  return (
    <div className="shell py-7 lg:py-10">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Products", href: categoryName || brandName ? "/products" : undefined },
          ...(categoryName ? [{ label: categoryName }] : []),
          ...(brandName ? [{ label: brandName }] : []),
        ]}
      />

      <header className="mt-5">
        <h1 className="text-2xl font-bold tracking-[-0.015em] text-navy-900 sm:text-3xl">{heading}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          {categoryName
            ? "Products in this category with minimum order quantities and quantity-based rates. Prices are per unit and exclude GST."
            : "Browse the full industrial range. Every product lists its unit price, GST rate, minimum order quantity and stock position. Prices are per unit and exclude GST."}
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-8">
        <div>
          <CatalogueFiltersPanel activeCount={activeFilterCount} resultCount={result.total}>
            <FilterPanel facets={result.facets} current={searchParams} />
          </CatalogueFiltersPanel>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <p className="text-sm text-navy-700" aria-live="polite">
              {result.error ? (
                <span className="text-danger">Catalogue unavailable</span>
              ) : (
                <>
                  <span className="font-semibold text-navy-900">{formatNumber(result.total)}</span>{" "}
                  {result.total === 1 ? "product" : "products"}
                  {result.totalPages > 1 && (
                    <span className="text-muted">
                      {" "}
                      · page {result.page} of {result.totalPages}
                    </span>
                  )}
                </>
              )}
            </p>
            <SortSelect current={searchParams} value={query.sort ?? "newest"} />
          </div>

          {activeChips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <Link
                  key={chip.label}
                  href={chip.href}
                  className="inline-flex items-center gap-1.5 rounded-chip border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-navy-700 transition hover:border-lineStrong"
                >
                  {chip.label}
                  <X size={12} className="text-muted" aria-hidden="true" />
                  <span className="sr-only">Remove filter</span>
                </Link>
              ))}
              <Link href={clearAllHref} className="text-xs font-semibold text-brand-700 hover:underline">
                Clear all
              </Link>
            </div>
          )}

          <div className="mt-5">
            {result.error ? (
              <ErrorState
                title="The catalogue could not be loaded"
                description="We could not reach the product database. Check the connection and try again — your basket is not affected."
              />
            ) : result.items.length === 0 ? (
              <EmptyState
                icon={<PackageSearch size={22} />}
                title="No products match these filters"
                description={
                  activeChips.length > 0
                    ? "Try removing a filter, or search for a broader term such as a brand or a part category."
                    : "The catalogue is currently empty. Products will appear here once they are published."
                }
                action={
                  activeChips.length > 0 ? (
                    <>
                      <Link href={clearAllHref} className="btn btn-primary btn-sm">
                        Clear all filters
                      </Link>
                      <Link href="/quote" className="btn btn-outline btn-sm">
                        Request a bulk quote
                      </Link>
                    </>
                  ) : (
                    <Link href="/quote" className="btn btn-primary btn-sm">
                      Request a bulk quote
                    </Link>
                  )
                }
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((product, index) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    priority={index < 3}
                    lowStockThreshold={settings.lowStockThreshold}
                  />
                ))}
              </div>
            )}
          </div>

          {!result.error && (
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              buildHref={buildPageHref}
              className="mt-9"
            />
          )}
        </div>
      </div>
    </div>
  );
}
