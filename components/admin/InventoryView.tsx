"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Boxes, PackageX, RefreshCw, Wallet } from "lucide-react";
import { AdminPanel, MetricCard } from "./ui";
import { StockBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/Overlay";
import { useToast } from "@/components/ui/Toast";
import { formatINR, formatNumber } from "@/lib/format";

type InventoryRow = {
  _id: string;
  title: string;
  slug: string;
  sku: string;
  hsnCode?: string;
  stock: number;
  moq: number;
  unit?: string;
  price?: { distributorPrice?: number };
  gstPercent?: number;
  categoryName?: string;
  isActive?: boolean;
};

type Summary = {
  products: number;
  unitsInStock: number;
  retailValue: number;
  outOfStock: number;
  lowStock: number;
};

const VIEWS = [
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
  { value: "all", label: "All active" },
  { value: "archived", label: "Archived" },
];

const PAGE_SIZE = 20;

/**
 * Inventory health.
 *
 * The lists are driven by the same threshold the settings page controls, and a
 * stock correction is a direct, deliberate edit — there is no bulk "set
 * everything" action, because a mis-typed number here changes what customers
 * can order.
 */
export function InventoryView() {
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [threshold, setThreshold] = useState(10);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [view, setView] = useState("low");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [active, setActive] = useState<InventoryRow | null>(null);
  const [newStock, setNewStock] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), view });
      const response = await fetch(`/api/admin/inventory?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      const data = await response.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total) || 0);
      setPages(Number(data.totalPages) || 1);
      setSummary(data.summary ?? null);
      setThreshold(Number(data.lowStockThreshold) || 0);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, view]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveStock(event: React.FormEvent) {
    event.preventDefault();
    if (!active || saving) return;
    const next = Number(newStock);
    if (!Number.isFinite(next) || next < 0) {
      setFormError("Enter a stock count of zero or more.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`/api/products/${active._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: Math.floor(next) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormError(typeof data?.error === "string" ? data.error : "The stock level could not be updated.");
        return;
      }
      push({
        tone: "success",
        title: `${active.sku} stock set to ${formatNumber(Math.floor(next))}`,
        description: "The storefront and checkout use this figure immediately.",
      });
      setActive(null);
      await load();
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active products"
          value={formatNumber(summary?.products ?? 0)}
          hint="Listed on the storefront"
          icon={<Boxes size={17} />}
        />
        <MetricCard
          label="Units in stock"
          value={formatNumber(summary?.unitsInStock ?? 0)}
          hint="Sum of all active stock counts"
          icon={<Boxes size={17} />}
          tone="brand"
        />
        <MetricCard
          label="Low stock"
          value={formatNumber(summary?.lowStock ?? 0)}
          hint={`${formatNumber(threshold)} units or fewer`}
          icon={<AlertTriangle size={17} />}
          tone="warning"
          href="/admin/inventory"
          hrefLabel="Review low stock"
        />
        <MetricCard
          label="Out of stock"
          value={formatNumber(summary?.outOfStock ?? 0)}
          hint="Cannot be ordered until restocked"
          icon={<PackageX size={17} />}
          tone="danger"
        />
      </div>

      <AdminPanel
        title="Stock value"
        description="Distributor price × units in stock, across active products. This is the value held on your shelves, not revenue."
        actions={
          <Button size="sm" variant="outline" onClick={load} loading={loading} icon={<RefreshCw size={15} />}>
            Refresh
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-3 p-5">
          <span className="grid h-9 w-9 place-items-center rounded-chip bg-brand-50 text-brand-600">
            <Wallet size={17} />
          </span>
          <p className="text-2xl font-bold tabular-nums text-navy-900">{formatINR(summary?.retailValue ?? 0)}</p>
          <Link href="/admin/settings" className="link-brand ml-auto text-sm">
            Change the low stock threshold
          </Link>
        </div>
      </AdminPanel>

      {error ? (
        <ErrorState
          title="Inventory could not be loaded"
          description="The request failed. Check that the database is reachable and try again."
          onRetry={load}
        />
      ) : (
        <AdminPanel
          title="Stock levels"
          description={`Page ${page} of ${pages}`}
          actions={
            <div className="flex flex-wrap items-center gap-1 rounded-control border border-line p-0.5" role="group" aria-label="Inventory view">
              {VIEWS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setView(option.value);
                  }}
                  aria-pressed={view === option.value}
                  className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold transition ${
                    view === option.value ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-canvas"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          }
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
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="px-5 py-14 text-center text-sm text-muted">
              {view === "low"
                ? "Nothing is running low right now."
                : view === "out"
                  ? "No products are out of stock."
                  : view === "archived"
                    ? "No archived products."
                    : "No active products to show."}
            </p>
          ) : (
            <>
              <div className="table-wrap hidden lg:block">
                <table className="table">
                  <caption className="sr-only">Stock levels by product</caption>
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col">Category</th>
                      <th scope="col">Stock</th>
                      <th scope="col">MOQ</th>
                      <th scope="col">Unit price</th>
                      <th scope="col">Stock value</th>
                      <th scope="col" className="text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => {
                      const price = Number(row.price?.distributorPrice ?? 0);
                      return (
                        <tr key={row._id}>
                          <td className="max-w-[260px]">
                            <p className="truncate font-medium text-navy-900" title={row.title}>
                              {row.title}
                            </p>
                            <p className="text-xs text-muted">
                              SKU {row.sku}
                              {row.hsnCode ? ` · HSN ${row.hsnCode}` : ""}
                            </p>
                          </td>
                          <td className="text-navy-800">{row.categoryName ?? "Uncategorised"}</td>
                          <td>
                            <div className="flex flex-col gap-1">
                              <span className="tabular-nums text-navy-900">{formatNumber(row.stock)}</span>
                              <StockBadge stock={row.stock} lowThreshold={threshold} />
                            </div>
                          </td>
                          <td className="tabular-nums">{formatNumber(row.moq)}</td>
                          <td className="tabular-nums">{formatINR(price)}</td>
                          <td className="tabular-nums">{formatINR(price * Math.max(0, row.stock))}</td>
                          <td className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActive(row);
                                setNewStock(String(row.stock ?? 0));
                                setFormError(null);
                              }}
                            >
                              Adjust stock
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-line lg:hidden">
                {items.map((row) => (
                  <li key={row._id} className="p-5">
                    <p className="text-sm font-semibold text-navy-900">{row.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      SKU {row.sku} · {row.categoryName ?? "Uncategorised"}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <span className="tabular-nums text-sm text-navy-900">{formatNumber(row.stock)} in stock</span>
                      <StockBadge stock={row.stock} lowThreshold={threshold} />
                    </div>
                    <p className="mt-1.5 text-xs text-muted">
                      {formatINR(row.price?.distributorPrice)} · MOQ {formatNumber(row.moq)}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => {
                        setActive(row);
                        setNewStock(String(row.stock ?? 0));
                        setFormError(null);
                      }}
                    >
                      Adjust stock
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </AdminPanel>
      )}

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title="Adjust stock"
        description={active ? `${active.title} · SKU ${active.sku}` : undefined}
        size="sm"
      >
        {active && (
          <form onSubmit={saveStock} className="space-y-5" noValidate>
            <div className="rounded-chip bg-canvas p-4 text-sm">
              <p className="text-muted">Current stock</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-navy-900">{formatNumber(active.stock)}</p>
            </div>

            {formError && (
              <Alert tone="danger" title="Could not save">
                {formError}
              </Alert>
            )}

            <Input
              label="New stock count"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={newStock}
              onChange={(event) => setNewStock(event.target.value)}
              hint="This is the total on hand, not the change. Use it after a stock take."
              required
            />

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
              <Button variant="outline" onClick={() => setActive(null)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" loading={saving} loadingLabel="Saving…">
                Set stock level
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
