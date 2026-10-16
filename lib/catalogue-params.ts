/**
 * Catalogue URL parameters.
 *
 * This module is deliberately free of database imports so client components
 * (sorting, filter links) can use it without pulling Mongoose into the browser
 * bundle. The server-only query lives in `lib/catalog.ts`.
 */

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name-asc", label: "Product name: A–Z" },
  { value: "stock-desc", label: "Availability" },
] as const;

export type CatalogueQuery = {
  search?: string;
  category?: string;
  brand?: string;
  availability?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  sort?: string;
  page?: number;
  pageSize?: number;
  featuredOnly?: boolean;
  includeInactive?: boolean;
};

export type CatalogueFacets = {
  categories: { id: string; name: string; slug: string; count: number }[];
  brands: { id: string; name: string; slug: string; count: number }[];
};

/** Normalise Next.js searchParams into a CatalogueQuery. */
export function parseCatalogueParams(
  params: Record<string, string | string[] | undefined>,
  { pageSize = 12 }: { pageSize?: number } = {}
): CatalogueQuery {
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const num = (value: string | string[] | undefined) => {
    const raw = one(value);
    if (raw === undefined || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };
  const page = (() => {
    const n = Math.floor(Number(one(params.page)));
    return Number.isFinite(n) && n >= 1 ? Math.min(n, 10_000) : 1;
  })();

  return {
    search: one(params.search),
    category: one(params.category),
    brand: one(params.brand),
    availability: one(params.availability),
    minPrice: num(params.minPrice),
    maxPrice: num(params.maxPrice),
    sort: one(params.sort),
    page,
    pageSize,
  };
}

/** Build a /products URL preserving the current filters, overriding some. */
export function buildCatalogueHref(
  current: Record<string, string | string[] | undefined>,
  overrides: Record<string, string | number | null | undefined> = {}
): string {
  const merged: Record<string, string> = {};
  for (const [key, value] of Object.entries(current)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single) merged[key] = single;
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") delete merged[key];
    else merged[key] = String(value);
  }
  // Any filter change starts a new result set unless the caller set the page.
  if (!("page" in overrides)) delete merged.page;
  const qs = new URLSearchParams(merged).toString();
  return `/products${qs ? `?${qs}` : ""}`;
}
