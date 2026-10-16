"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Boxes, PackagePlus, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { AdminPanel } from "./ui";
import { Badge, StockBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/Overlay";
import { useToast } from "@/components/ui/Toast";
import { formatINR, formatNumber, formatPercent } from "@/lib/format";
import type { CatalogueFacets } from "@/lib/catalogue-params";
import type { BrandDto, CategoryDto, ProductDto } from "@/lib/types";

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "price-asc", label: "Price low to high" },
  { value: "price-desc", label: "Price high to low" },
  { value: "stock-desc", label: "Most stock" },
];

const PAGE_SIZE = 20;

/**
 * Product management.
 *
 * Both creating and editing a product happen on dedicated sub-routes
 * (/admin/products/new and /admin/products/[id]/edit) rather than in a modal,
 * so the full editor has room to breathe and a refresh or back button behaves
 * the way people expect. This view only lists, filters and archives.
 */
export function ProductsView({
  initialCategory = "",
  initialBrand = "",
  initialSearch = "",
}: {
  initialCategory?: string;
  initialBrand?: string;
  initialSearch?: string;
}) {
  const [items, setItems] = useState<ProductDto[]>([]);
  // The catalogue facets only list options that currently have products, so the
  // form uses the complete lists — otherwise a brand you just created could not
  // be assigned until it already had a product.
  const [allCategories, setAllCategories] = useState<CategoryDto[]>([]);
  const [allBrands, setAllBrands] = useState<BrandDto[]>([]);
  const [facets, setFacets] = useState<CatalogueFacets>({ categories: [], brands: [] });
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(initialSearch);
  const [query, setQuery] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [brand, setBrand] = useState(initialBrand);
  const [availability, setAvailability] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [removing, setRemoving] = useState<ProductDto | null>(null);
  const [removingBusy, setRemovingBusy] = useState(false);

  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sort,
        includeInactive: "1",
      });
      if (query) params.set("search", query);
      if (category) params.set("category", category);
      if (brand) params.set("brand", brand);
      if (availability) params.set("availability", availability);

      const response = await fetch(`/api/products?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      const data = await response.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total) || 0);
      setPages(Number(data.totalPages) || 1);
      setFacets({
        categories: Array.isArray(data.facets?.categories) ? data.facets.categories : [],
        brands: Array.isArray(data.facets?.brands) ? data.facets.brands : [],
      });
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, query, category, brand, availability, sort]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [categoryResponse, brandResponse] = await Promise.all([
        fetch("/api/categories?includeInactive=1", { cache: "no-store" }),
        fetch("/api/brands", { cache: "no-store" }),
      ]);
      const [categoryData, brandData] = await Promise.all([
        categoryResponse.ok ? categoryResponse.json() : { items: [] },
        brandResponse.ok ? brandResponse.json() : { items: [] },
      ]);
      if (cancelled) return;
      setAllCategories(Array.isArray(categoryData.items) ? categoryData.items : []);
      setAllBrands(Array.isArray(brandData.items) ? brandData.items : []);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const activeFilterCount = [query, category, brand, availability].filter(Boolean).length;
  const productCountByCategory = new Map(facets.categories.map((entry) => [entry.slug, entry.count]));
  const productCountByBrand = new Map(facets.brands.map((entry) => [entry.slug, entry.count]));

  async function remove(mode: "archive" | "delete") {
    if (!removing || removingBusy) return;
    setRemovingBusy(true);
    try {
      const response = await fetch(`/api/products/${removing._id}?mode=${mode}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        push({
          tone: "warning",
          title: mode === "delete" ? "Product archived instead" : "Could not archive",
          description: typeof data?.error === "string" ? data.error : "Please try again.",
        });
      } else {
        push({
          tone: "success",
          title: mode === "delete" ? `${removing.title} deleted` : `${removing.title} archived`,
          description: mode === "archive" ? "It is hidden from the storefront but kept on past orders." : undefined,
        });
      }
      setRemoving(null);
      await load();
    } catch {
      push({ tone: "error", title: "Could not reach the server" });
    } finally {
      setRemovingBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <AdminPanel
        title="Filters"
        description={
          activeFilterCount
            ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} applied`
            : "Search and narrow the catalogue. Archived products are included here."
        }
        actions={
          <>
            <Button size="sm" variant="outline" onClick={load} loading={loading} icon={<RefreshCw size={15} />}>
              Refresh
            </Button>
            <Link href="/admin/products/new" className="btn btn-primary btn-sm">
              <PackagePlus size={15} aria-hidden="true" />
              Add product
            </Link>
          </>
        }
      >
        <div className="grid gap-4 p-5 lg:grid-cols-5">
          <form
            className="lg:col-span-2"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setQuery(search.trim());
            }}
          >
            <label className="label" htmlFor="product-search">
              Search
            </label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
              <input
                id="product-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Product name, SKU or HSN code"
                className="field pl-9 pr-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setQuery("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-navy-300 hover:text-navy-700"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </form>

          <div>
            <label className="label" htmlFor="product-category">
              Category
            </label>
            <select
              id="product-category"
              value={category}
              onChange={(event) => {
                setPage(1);
                setCategory(event.target.value);
              }}
              className="field"
            >
              <option value="">All categories</option>
              {allCategories.map((entry) => (
                <option key={entry._id} value={entry.slug}>
                  {entry.isActive === false ? `${entry.name} (hidden)` : entry.name}
                  {productCountByCategory.has(entry.slug) ? ` (${productCountByCategory.get(entry.slug)})` : " (0)"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="product-brand">
              Brand
            </label>
            <select
              id="product-brand"
              value={brand}
              onChange={(event) => {
                setPage(1);
                setBrand(event.target.value);
              }}
              className="field"
            >
              <option value="">All brands</option>
              {allBrands.map((entry) => (
                <option key={entry._id} value={entry.slug}>
                  {entry.name}
                  {productCountByBrand.has(entry.slug) ? ` (${productCountByBrand.get(entry.slug)})` : " (0)"}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="product-availability">
                Stock
              </label>
              <select
                id="product-availability"
                value={availability}
                onChange={(event) => {
                  setPage(1);
                  setAvailability(event.target.value);
                }}
                className="field"
              >
                <option value="">Any</option>
                <option value="in">In stock</option>
                <option value="out">Out of stock</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="product-sort">
                Sort
              </label>
              <select
                id="product-sort"
                value={sort}
                onChange={(event) => {
                  setPage(1);
                  setSort(event.target.value);
                }}
                className="field"
              >
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </AdminPanel>

      {error ? (
        <ErrorState
          title="Products could not be loaded"
          description="The request failed. Check that the database is reachable and try again."
          onRetry={load}
        />
      ) : (
        <AdminPanel
          title={`Products (${formatNumber(total)})`}
          description={`Page ${page} of ${pages}`}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">
                Showing {items.length} of {formatNumber(total)} products
              </p>
              {pages > 1 && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                    Previous
                  </Button>
                  <span className="text-xs tabular-nums text-navy-700">
                    {page} / {pages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    disabled={page >= pages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          }
        >
          {loading && items.length === 0 ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-navy-50 text-navy-400">
                <Boxes size={20} />
              </span>
              <p className="mt-3 text-sm font-semibold text-navy-900">
                {activeFilterCount ? "No products match these filters" : "No products yet"}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted">
                {activeFilterCount
                  ? "Clear a filter or search for a different term."
                  : "Add your first product, or run npm run seed to load the sample catalogue."}
              </p>
              <Link href="/admin/products/new" className="btn btn-primary mt-4">
                <Plus size={16} aria-hidden="true" />
                Add product
              </Link>
            </div>
          ) : (
            <>
              <div className="table-wrap hidden lg:block">
                <table className="table">
                  <caption className="sr-only">Catalogue products</caption>
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col">Category</th>
                      <th scope="col">Price</th>
                      <th scope="col">MOQ</th>
                      <th scope="col">Stock</th>
                      <th scope="col">GST</th>
                      <th scope="col">State</th>
                      <th scope="col" className="text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((product) => (
                      <tr key={product._id}>
                        <td className="max-w-[280px]">
                          <p className="truncate font-medium text-navy-900" title={product.title}>
                            {product.title}
                          </p>
                          <p className="text-xs text-muted">
                            SKU {product.sku}
                            {product.hsnCode ? ` · HSN ${product.hsnCode}` : ""}
                          </p>
                        </td>
                        <td className="text-navy-800">{product.category?.name ?? "Uncategorised"}</td>
                        <td className="tabular-nums">
                          {formatINR(product.price?.distributorPrice)}
                          {product.price?.bulkSlabs?.length ? (
                            <span className="block text-xs text-muted">{product.price.bulkSlabs.length} bulk tiers</span>
                          ) : null}
                        </td>
                        <td className="tabular-nums">{formatNumber(product.moq)}</td>
                        <td>
                          <StockBadge stock={product.stock} />
                        </td>
                        <td className="tabular-nums">{formatPercent(product.gstPercent)}</td>
                        <td>
                          <div className="flex flex-wrap gap-1.5">
                            {product.isActive === false ? <Badge tone="neutral">Archived</Badge> : null}
                            {product.featured ? <Badge tone="brand">Featured</Badge> : null}
                            {product.isActive !== false && !product.featured ? <Badge tone="success">Live</Badge> : null}
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/admin/products/${product._id}/edit`} className="btn btn-outline btn-sm">
                              <Pencil size={14} aria-hidden="true" />
                              Edit
                            </Link>
                            <Link href={`/products/${product.slug}`} className="btn btn-ghost btn-sm">
                              View
                            </Link>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRemoving(product)}
                              aria-label={`Remove ${product.title}`}
                              icon={<Trash2 size={14} />}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-line lg:hidden">
                {items.map((product) => (
                  <li key={product._id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy-900">{product.title}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          SKU {product.sku} · {product.category?.name ?? "Uncategorised"}
                        </p>
                      </div>
                      <StockBadge stock={product.stock} />
                    </div>
                    <p className="mt-2 text-sm text-navy-800">
                      {formatINR(product.price?.distributorPrice)} · MOQ {formatNumber(product.moq)} · GST{" "}
                      {formatPercent(product.gstPercent)}
                    </p>
                    {product.isActive === false && (
                      <p className="mt-2">
                        <Badge tone="neutral">Archived</Badge>
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={`/admin/products/${product._id}/edit`} className="btn btn-outline btn-sm">
                        Edit
                      </Link>
                      <Button size="sm" variant="ghost" onClick={() => setRemoving(product)}>
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </AdminPanel>
      )}

      {/* ------------------------------------------------------------ removal */}
      <Modal
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.title ?? "this product"}?`}
        description="Archive keeps it on past orders and invoices. Deleting is permanent and only possible for a product that has never been ordered."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setRemoving(null)} disabled={removingBusy}>
              Cancel
            </Button>
            <Button variant="navy" onClick={() => remove("archive")} disabled={removingBusy}>
              Archive product
            </Button>
            <Button variant="danger" onClick={() => remove("delete")} loading={removingBusy} loadingLabel="Removing…">
              Delete permanently
            </Button>
          </>
        }
      >
        {removing && (
          <p className="text-sm leading-6 text-navy-700">
            <span className="font-medium">{removing.sku}</span> currently has {formatNumber(removing.stock)} in stock and{" "}
            {removing.price?.bulkSlabs?.length ?? 0} bulk tier(s). Archiving hides it from the storefront immediately.
          </p>
        )}
      </Modal>
    </div>
  );
}
