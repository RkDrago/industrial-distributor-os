import Link from "next/link";
import { Check, Layers, Tag, Wallet, X } from "lucide-react";
import { buildCatalogueHref } from "@/lib/catalogue-params";

type Facets = {
  categories: { id: string; name: string; slug: string; count: number }[];
  brands: { id: string; name: string; slug: string; count: number }[];
};

const AVAILABILITY = [
  { value: "", label: "All products" },
  { value: "in", label: "In stock only" },
  { value: "out", label: "Out of stock" },
];

/**
 * Catalogue filters.
 *
 * Every facet is a link, and the price range is a plain GET form, so filtering
 * works entirely on the server — no JavaScript required, each result set has a
 * real shareable URL, and the browser back button behaves as expected.
 */
export function FilterPanel({
  facets,
  current,
  onNavigate,
}: {
  facets: Facets;
  current: Record<string, string | string[] | undefined>;
  onNavigate?: () => void;
}) {
  const activeCategory = typeof current.category === "string" ? current.category : "";
  const activeBrand = typeof current.brand === "string" ? current.brand : "";
  const activeAvailability = typeof current.availability === "string" ? current.availability : "";
  const minPrice = typeof current.minPrice === "string" ? current.minPrice : "";
  const maxPrice = typeof current.maxPrice === "string" ? current.maxPrice : "";

  const activeCount =
    (activeCategory ? 1 : 0) + (activeBrand ? 1 : 0) + (activeAvailability ? 1 : 0) + (minPrice || maxPrice ? 1 : 0);

  const hidden: { name: string; value: string }[] = [];
  for (const key of ["search", "category", "brand", "availability", "sort"]) {
    const value = current[key];
    const single = Array.isArray(value) ? value[0] : value;
    if (single) hidden.push({ name: key, value: single });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-navy-900">Filters</h2>
        {activeCount > 0 && (
          <Link href={buildCatalogueHref(current, { category: null, brand: null, availability: null, minPrice: null, maxPrice: null })} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
            <X size={13} />
            Clear all ({activeCount})
          </Link>
        )}
      </div>

      {/* ------------------------------------------------------------ category */}
      <fieldset className="rounded-card border border-line bg-surface p-4">
        <legend className="flex items-center gap-2 px-1 text-[13px] font-semibold text-navy-900">
          <Layers size={15} className="text-brand-600" />
          Category
        </legend>
        <ul className="mt-1 space-y-0.5">
          <li>
            <Link
              href={buildCatalogueHref(current, { category: null })}
              onClick={onNavigate}
              aria-current={!activeCategory ? "true" : undefined}
              className={`flex items-center justify-between gap-2 rounded-chip px-2.5 py-2 text-sm transition ${
                !activeCategory ? "bg-brand-50 font-semibold text-brand-800" : "text-navy-600 hover:bg-navy-50"
              }`}
            >
              <span className="truncate">All categories</span>
            </Link>
          </li>
          {facets.categories.map((category) => {
            const active = activeCategory === category.slug;
            return (
              <li key={category.id}>
                <Link
                  href={buildCatalogueHref(current, { category: active ? null : category.slug })}
                  onClick={onNavigate}
                  aria-current={active ? "true" : undefined}
                  className={`flex items-center justify-between gap-2 rounded-chip px-2.5 py-2 text-sm transition ${
                    active ? "bg-brand-50 font-semibold text-brand-800" : "text-navy-600 hover:bg-navy-50"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    {active && <Check size={13} className="shrink-0 text-brand-600" />}
                    <span className="truncate">{category.name}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">{category.count}</span>
                </Link>
              </li>
            );
          })}
          {facets.categories.length === 0 && <li className="px-2.5 py-2 text-sm text-muted">No categories yet.</li>}
        </ul>
      </fieldset>

      {/* --------------------------------------------------------------- brand */}
      {facets.brands.length > 0 && (
        <fieldset className="rounded-card border border-line bg-surface p-4">
          <legend className="flex items-center gap-2 px-1 text-[13px] font-semibold text-navy-900">
            <Tag size={15} className="text-brand-600" />
            Brand
          </legend>
          <ul className="mt-1 max-h-64 space-y-0.5 overflow-y-auto pr-1">
            <li>
              <Link
                href={buildCatalogueHref(current, { brand: null })}
                onClick={onNavigate}
                className={`flex items-center justify-between gap-2 rounded-chip px-2.5 py-2 text-sm transition ${
                  !activeBrand ? "bg-brand-50 font-semibold text-brand-800" : "text-navy-600 hover:bg-navy-50"
                }`}
              >
                <span className="truncate">All brands</span>
              </Link>
            </li>
            {facets.brands.map((brand) => {
              const active = activeBrand === brand.slug;
              return (
                <li key={brand.id}>
                  <Link
                    href={buildCatalogueHref(current, { brand: active ? null : brand.slug })}
                    onClick={onNavigate}
                    aria-current={active ? "true" : undefined}
                    className={`flex items-center justify-between gap-2 rounded-chip px-2.5 py-2 text-sm transition ${
                      active ? "bg-brand-50 font-semibold text-brand-800" : "text-navy-600 hover:bg-navy-50"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      {active && <Check size={13} className="shrink-0 text-brand-600" />}
                      <span className="truncate">{brand.name}</span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted">{brand.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      {/* -------------------------------------------------------- availability */}
      <fieldset className="rounded-card border border-line bg-surface p-4">
        <legend className="px-1 text-[13px] font-semibold text-navy-900">Availability</legend>
        <ul className="mt-1 space-y-0.5">
          {AVAILABILITY.map((option) => {
            const active = activeAvailability === option.value;
            return (
              <li key={option.value || "all"}>
                <Link
                  href={availabilityHref(current, option.value)}
                  onClick={onNavigate}
                  aria-current={active ? "true" : undefined}
                  className={`flex items-center gap-2 rounded-chip px-2.5 py-2 text-sm transition ${
                    active ? "bg-brand-50 font-semibold text-brand-800" : "text-navy-600 hover:bg-navy-50"
                  }`}
                >
                  <span
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                      active ? "border-brand-500 bg-brand-500" : "border-lineStrong"
                    }`}
                    aria-hidden="true"
                  >
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  {option.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {/* --------------------------------------------------------------- price */}
      <form action="/products" method="get" className="rounded-card border border-line bg-surface p-4">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-navy-900">
          <Wallet size={15} className="text-brand-600" />
          Unit price (₹)
        </p>
        {hidden.map((field) => (
          <input key={field.name} type="hidden" name={field.name} value={field.value} />
        ))}
        <div className="mt-3 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <label className="sr-only" htmlFor="filter-min-price">
              Minimum unit price in rupees
            </label>
            <input
              id="filter-min-price"
              name="minPrice"
              type="number"
              min={0}
              inputMode="numeric"
              defaultValue={minPrice}
              placeholder="Min"
              className="field !min-h-10 text-sm"
            />
          </div>
          <span className="text-muted" aria-hidden="true">
            –
          </span>
          <div className="min-w-0 flex-1">
            <label className="sr-only" htmlFor="filter-max-price">
              Maximum unit price in rupees
            </label>
            <input
              id="filter-max-price"
              name="maxPrice"
              type="number"
              min={0}
              inputMode="numeric"
              defaultValue={maxPrice}
              placeholder="Max"
              className="field !min-h-10 text-sm"
            />
          </div>
        </div>
        <button type="submit" className="btn btn-outline btn-sm btn-block mt-3">
          Apply price range
        </button>
      </form>
    </div>
  );
}

/** Availability links clear the parameter when "All products" is chosen. */
function availabilityHref(current: Record<string, string | string[] | undefined>, value: string) {
  return buildCatalogueHref(current, { availability: value || null });
}
