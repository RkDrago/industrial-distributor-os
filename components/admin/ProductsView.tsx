"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes,
  ImagePlus,
  PackagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AdminPanel } from "./ui";
import { Badge, StockBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/Overlay";
import { useToast } from "@/components/ui/Toast";
import { formatINR, formatNumber, formatPercent } from "@/lib/format";
import type { CatalogueFacets } from "@/lib/catalogue-params";
import type { BrandDto, CategoryDto, ProductDto } from "@/lib/types";

type Slab = { minQty: string; price: string };
type Spec = { key: string; value: string };

type Draft = {
  title: string;
  sku: string;
  hsnCode: string;
  categoryId: string;
  brandId: string;
  unit: string;
  moq: string;
  stock: string;
  gstPercent: string;
  featured: boolean;
  isActive: boolean;
  mrp: string;
  distributorPrice: string;
  bulkSlabs: Slab[];
  shortDescription: string;
  description: string;
  specifications: Spec[];
  images: string[];
};

const EMPTY_DRAFT: Draft = {
  title: "",
  sku: "",
  hsnCode: "",
  categoryId: "",
  brandId: "",
  unit: "per piece",
  moq: "1",
  stock: "0",
  gstPercent: "18",
  featured: false,
  isActive: true,
  mrp: "",
  distributorPrice: "",
  bulkSlabs: [],
  shortDescription: "",
  description: "",
  specifications: [],
  images: [],
};

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
 * The form mirrors what the server actually stores: SKU, HSN code, minimum
 * order quantity, GST rate, distributor price and quantity-based tiers. Bulk
 * tiers are edited as explicit rows so a price break can never be implied.
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

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDto | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

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

  function openCreate() {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setFormError(null);
    setUploadNote(null);
    setFormOpen(true);
  }

  function openEdit(product: ProductDto) {
    setEditing(product);
    setDraft({
      title: product.title ?? "",
      sku: product.sku ?? "",
      hsnCode: product.hsnCode ?? "",
      categoryId: product.categoryId ?? "",
      brandId: product.brandId ?? "",
      unit: product.unit ?? "per piece",
      moq: String(product.moq ?? 1),
      stock: String(product.stock ?? 0),
      gstPercent: String(product.gstPercent ?? 18),
      featured: Boolean(product.featured),
      isActive: product.isActive !== false,
      mrp: product.price?.mrp ? String(product.price.mrp) : "",
      distributorPrice: product.price?.distributorPrice ? String(product.price.distributorPrice) : "",
      bulkSlabs: (product.price?.bulkSlabs ?? []).map((slab) => ({ minQty: String(slab.minQty), price: String(slab.price) })),
      shortDescription: product.shortDescription ?? "",
      description: product.description ?? "",
      specifications: (product.specifications ?? []).map((spec) => ({ key: spec.key ?? "", value: spec.value ?? "" })),
      images: Array.isArray(product.images) ? [...product.images] : [],
    });
    setFormError(null);
    setUploadNote(null);
    setFormOpen(true);
  }

  const payload = useMemo(
    () => ({
      title: draft.title,
      sku: draft.sku,
      hsnCode: draft.hsnCode,
      categoryId: draft.categoryId || null,
      brandId: draft.brandId || null,
      unit: draft.unit || "per piece",
      moq: Number(draft.moq || 1),
      stock: Number(draft.stock || 0),
      gstPercent: Number(draft.gstPercent || 0),
      featured: draft.featured,
      isActive: draft.isActive,
      price: {
        mrp: Number(draft.mrp || 0),
        distributorPrice: Number(draft.distributorPrice || 0),
        bulkSlabs: draft.bulkSlabs
          .filter((slab) => slab.minQty !== "" && slab.price !== "")
          .map((slab) => ({ minQty: Number(slab.minQty), price: Number(slab.price) })),
      },
      shortDescription: draft.shortDescription,
      description: draft.description,
      specifications: draft.specifications.filter((spec) => spec.key.trim() && spec.value.trim()),
      images: draft.images,
    }),
    [draft]
  );

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const response = await fetch(editing ? `/api/products/${editing._id}` : "/api/products", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = Array.isArray(data?.errors) && data.errors.length ? data.errors[0] : data?.error;
        setFormError(typeof detail === "string" ? detail : "The product could not be saved.");
        return;
      }
      push({
        tone: "success",
        title: editing ? `${payload.title} updated` : `${payload.title} added to the catalogue`,
        description: editing ? "Storefront pages already reflect this change." : "It is now visible on the storefront.",
      });
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setUploadNote(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setUploadNote(
          typeof data?.error === "string"
            ? `${data.error}. Paste an image URL instead.`
            : "The upload failed. Paste an image URL instead."
        );
        return;
      }
      if (typeof data?.url === "string") {
        setDraft((current) => ({ ...current, images: [...current.images, data.url].slice(0, 8) }));
        setUploadNote("Image uploaded.");
      }
    } catch {
      setUploadNote("The upload failed. Paste an image URL instead.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

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
            <Button size="sm" onClick={openCreate} icon={<PackagePlus size={15} />}>
              Add product
            </Button>
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
              <Button className="mt-4" onClick={openCreate} icon={<Plus size={16} />}>
                Add product
              </Button>
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
                            <Link href={`/products/${product.slug}`} className="btn btn-ghost btn-sm">
                              View
                            </Link>
                            <Button size="sm" variant="outline" onClick={() => openEdit(product)} icon={<Pencil size={14} />}>
                              Edit
                            </Button>
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
                      <Button size="sm" variant="outline" onClick={() => openEdit(product)}>
                        Edit
                      </Button>
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

      {/* ------------------------------------------------------- create / edit */}
      <Modal
        open={formOpen}
        onClose={() => {
          if (!saving) {
            setFormOpen(false);
            setEditing(null);
          }
        }}
        title={editing ? `Edit ${editing.title}` : "Add a product"}
        description="Everything here is what the storefront, checkout and invoices read from."
        size="lg"
      >
        <form onSubmit={save} className="space-y-7" noValidate>
          {formError && (
            <Alert tone="danger" title="Could not save">
              {formError}
            </Alert>
          )}

          {/* Basics */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-navy-900">Product details</legend>
            <Input
              label="Product name"
              value={draft.title}
              onChange={(event) => setDraft((d) => ({ ...d, title: event.target.value }))}
              placeholder="Industrial Safety Helmet with Ratchet Suspension"
              required
              hint="Customers see this everywhere. The web address is generated from it."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="SKU"
                value={draft.sku}
                onChange={(event) => setDraft((d) => ({ ...d, sku: event.target.value.toUpperCase() }))}
                placeholder="PPE-1001"
                required
                hint="Letters, numbers, dash, dot or underscore."
              />
              <Input
                label="HSN code"
                value={draft.hsnCode}
                onChange={(event) => setDraft((d) => ({ ...d, hsnCode: event.target.value }))}
                placeholder="650610"
                optional
                hint="4–8 digits. Printed on invoices."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Category"
                value={draft.categoryId}
                onChange={(event) => setDraft((d) => ({ ...d, categoryId: event.target.value }))}
                hint="Controls which filter the product appears under."
              >
                <option value="">Uncategorised</option>
                {allCategories.map((entry) => (
                  <option key={entry._id} value={entry._id}>
                    {entry.name}
                    {entry.isActive === false ? " (hidden)" : ""}
                  </option>
                ))}
              </Select>
              <Select
                label="Brand"
                value={draft.brandId}
                onChange={(event) => setDraft((d) => ({ ...d, brandId: event.target.value }))}
              >
                <option value="">No brand</option>
                {allBrands.map((entry) => (
                  <option key={entry._id} value={entry._id}>
                    {entry.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Minimum order quantity"
                type="number"
                min={1}
                step={1}
                value={draft.moq}
                onChange={(event) => setDraft((d) => ({ ...d, moq: event.target.value }))}
                required
                hint="Smallest quantity a customer may order."
              />
              <Input
                label="Stock on hand"
                type="number"
                min={0}
                step={1}
                value={draft.stock}
                onChange={(event) => setDraft((d) => ({ ...d, stock: event.target.value }))}
                required
              />
              <Input
                label="Unit"
                value={draft.unit}
                onChange={(event) => setDraft((d) => ({ ...d, unit: event.target.value }))}
                placeholder="per piece"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="GST percentage"
                type="number"
                min={0}
                max={28}
                step="0.01"
                value={draft.gstPercent}
                onChange={(event) => setDraft((d) => ({ ...d, gstPercent: event.target.value }))}
                required
                hint="Applied per line at checkout, calculated on the server."
              />
              <div className="flex flex-col justify-end gap-3 pt-1">
                <Checkbox
                  label="Feature on the homepage"
                  checked={draft.featured}
                  onChange={(event) => setDraft((d) => ({ ...d, featured: event.target.checked }))}
                />
                <Checkbox
                  label="Listed on the storefront"
                  checked={draft.isActive}
                  onChange={(event) => setDraft((d) => ({ ...d, isActive: event.target.checked }))}
                  hint="Uncheck to archive it without losing order history."
                />
              </div>
            </div>
          </fieldset>

          {/* Pricing */}
          <fieldset className="space-y-4 border-t border-line pt-6">
            <legend className="text-sm font-semibold text-navy-900">Pricing</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Distributor price"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={draft.distributorPrice}
                onChange={(event) => setDraft((d) => ({ ...d, distributorPrice: event.target.value }))}
                required
                hint="The price your customers pay. Excludes GST."
              />
              <Input
                label="MRP"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={draft.mrp}
                onChange={(event) => setDraft((d) => ({ ...d, mrp: event.target.value }))}
                optional
                hint="Used to show the saving. Cannot be lower than the distributor price."
              />
            </div>

            <div className="rounded-chip border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-navy-900">Bulk price tiers</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Quantity ranges the customer sees in the price table. Tier prices must not exceed the base price.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDraft((d) => ({ ...d, bulkSlabs: [...d.bulkSlabs, { minQty: "", price: "" }] }))}
                  icon={<Plus size={14} />}
                >
                  Add tier
                </Button>
              </div>

              {draft.bulkSlabs.length === 0 ? (
                <p className="mt-3 text-xs text-muted">No bulk tiers. Customers pay the distributor price at any quantity.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {draft.bulkSlabs.map((slab, index) => (
                    <li key={index} className="flex flex-wrap items-end gap-3">
                      <div className="w-32">
                        <label className="label" htmlFor={`slab-qty-${index}`}>
                          From quantity
                        </label>
                        <input
                          id={`slab-qty-${index}`}
                          type="number"
                          min={2}
                          step={1}
                          value={slab.minQty}
                          onChange={(event) =>
                            setDraft((d) => ({
                              ...d,
                              bulkSlabs: d.bulkSlabs.map((entry, i) =>
                                i === index ? { ...entry, minQty: event.target.value } : entry
                              ),
                            }))
                          }
                          className="field"
                        />
                      </div>
                      <div className="w-36">
                        <label className="label" htmlFor={`slab-price-${index}`}>
                          Unit price
                        </label>
                        <input
                          id={`slab-price-${index}`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={slab.price}
                          onChange={(event) =>
                            setDraft((d) => ({
                              ...d,
                              bulkSlabs: d.bulkSlabs.map((entry, i) =>
                                i === index ? { ...entry, price: event.target.value } : entry
                              ),
                            }))
                          }
                          className="field"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDraft((d) => ({ ...d, bulkSlabs: d.bulkSlabs.filter((_, i) => i !== index) }))}
                        aria-label={`Remove tier ${index + 1}`}
                        icon={<Trash2 size={14} />}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </fieldset>

          {/* Content */}
          <fieldset className="space-y-4 border-t border-line pt-6">
            <legend className="text-sm font-semibold text-navy-900">Description and specifications</legend>
            <Input
              label="Short summary"
              value={draft.shortDescription}
              onChange={(event) => setDraft((d) => ({ ...d, shortDescription: event.target.value }))}
              placeholder="High-density shell with a six-point ratchet harness."
              optional
              hint="One line, shown on product cards and search results."
            />
            <Textarea
              label="Full description"
              rows={4}
              value={draft.description}
              onChange={(event) => setDraft((d) => ({ ...d, description: event.target.value }))}
              optional
            />

            <div className="rounded-chip border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-navy-900">Specifications</p>
                  <p className="mt-0.5 text-xs text-muted">Shown as a readable table on the product page.</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDraft((d) => ({ ...d, specifications: [...d.specifications, { key: "", value: "" }] }))}
                  icon={<Plus size={14} />}
                >
                  Add row
                </Button>
              </div>

              {draft.specifications.length === 0 ? (
                <p className="mt-3 text-xs text-muted">No specifications listed yet.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {draft.specifications.map((spec, index) => (
                    <li key={index} className="flex flex-wrap items-end gap-3">
                      <div className="min-w-[140px] flex-1">
                        <label className="label" htmlFor={`spec-key-${index}`}>
                          Label
                        </label>
                        <input
                          id={`spec-key-${index}`}
                          value={spec.key}
                          onChange={(event) =>
                            setDraft((d) => ({
                              ...d,
                              specifications: d.specifications.map((entry, i) =>
                                i === index ? { ...entry, key: event.target.value } : entry
                              ),
                            }))
                          }
                          placeholder="Material"
                          className="field"
                        />
                      </div>
                      <div className="min-w-[160px] flex-[1.5]">
                        <label className="label" htmlFor={`spec-value-${index}`}>
                          Value
                        </label>
                        <input
                          id={`spec-value-${index}`}
                          value={spec.value}
                          onChange={(event) =>
                            setDraft((d) => ({
                              ...d,
                              specifications: d.specifications.map((entry, i) =>
                                i === index ? { ...entry, value: event.target.value } : entry
                              ),
                            }))
                          }
                          placeholder="HDPE shell"
                          className="field"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setDraft((d) => ({ ...d, specifications: d.specifications.filter((_, i) => i !== index) }))
                        }
                        aria-label={`Remove specification ${index + 1}`}
                        icon={<Trash2 size={14} />}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </fieldset>

          {/* Images */}
          <fieldset className="space-y-4 border-t border-line pt-6">
            <legend className="text-sm font-semibold text-navy-900">Images</legend>
            <p className="text-xs leading-5 text-muted">
              Up to 8 images. The first one is used on product cards. Products without an image fall back to a neutral
              placeholder rather than showing a broken picture.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                id="product-image-upload"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadImage(file);
                }}
              />
              <Button
                size="sm"
                variant="outline"
                loading={uploading}
                loadingLabel="Uploading…"
                onClick={() => fileRef.current?.click()}
                icon={<Upload size={15} />}
              >
                Upload image
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDraft((d) => ({ ...d, images: [...d.images, ""].slice(0, 8) }))}
                icon={<ImagePlus size={15} />}
              >
                Add image URL
              </Button>
            </div>

            {uploadNote && (
              <Alert tone={uploadNote === "Image uploaded." ? "success" : "warning"}>{uploadNote}</Alert>
            )}

            {draft.images.length > 0 && (
              <ul className="space-y-2.5">
                {draft.images.map((url, index) => (
                  <li key={index} className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="label" htmlFor={`image-${index}`}>
                        Image {index + 1}
                        {index === 0 ? " · card image" : ""}
                      </label>
                      <input
                        id={`image-${index}`}
                        value={url}
                        onChange={(event) =>
                          setDraft((d) => ({
                            ...d,
                            images: d.images.map((entry, i) => (i === index ? event.target.value : entry)),
                          }))
                        }
                        placeholder="https://…"
                        className="field"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDraft((d) => ({ ...d, images: d.images.filter((_, i) => i !== index) }))}
                      aria-label={`Remove image ${index + 1}`}
                      icon={<Trash2 size={14} />}
                    />
                  </li>
                ))}
              </ul>
            )}
          </fieldset>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving} loadingLabel="Saving…">
              {editing ? "Save product" : "Create product"}
            </Button>
          </div>
        </form>
      </Modal>

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
