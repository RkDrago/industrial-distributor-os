"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, RefreshCw, Search, X } from "lucide-react";
import { AdminPanel } from "./ui";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { Alert, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Overlay";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, formatINR, formatNumber } from "@/lib/format";
import type { OrderDto } from "@/lib/types";

const STATUS_FILTERS = [
  { value: "all", label: "All orders" },
  { value: "new", label: "Received" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const PAGE_SIZE = 20;

export function OrdersView({ initialSearch = "" }: { initialSearch?: string }) {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState(initialSearch);
  const [query, setQuery] = useState(initialSearch);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ ok: number; failed: string[] } | null>(null);
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (status !== "all") params.set("status", status);
      if (query) params.set("search", query);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const response = await fetch(`/api/orders?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      const data = await response.json();
      setOrders(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total) || 0);
      setPages(Number(data.totalPages) || 1);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, status, query, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to page 1 whenever the filters change.
  useEffect(() => {
    setPage(1);
  }, [status, query, from, to]);

  const visibleIds = useMemo(() => orders.map((order) => order._id), [orders]);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  function exportCsv() {
    const rows = [
      ["Order", "Date", "Company", "Contact", "Email", "GSTIN", "Status", "Subtotal", "GST", "Total"],
      ...orders.map((order) => [
        order.orderNumber,
        new Date(order.createdAt).toISOString(),
        order.companyName ?? "",
        order.contactName ?? "",
        order.customerEmail ?? "",
        order.gstin ?? "",
        order.orderStatus,
        String(order.subtotal ?? 0),
        String(order.gstTotal ?? 0),
        String(order.grandTotal ?? 0),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `orders-page-${page}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Bulk confirmation.
   *
   * Each order is updated through the normal single-order endpoint, so every
   * change still goes through the same validation, history and stock handling —
   * there is no shortcut that bypasses those rules. Partial failures are
   * reported rather than hidden.
   */
  async function bulkConfirm() {
    setBulkBusy(true);
    const failed: string[] = [];
    let ok = 0;

    for (const id of selected) {
      const order = orders.find((entry) => entry._id === id);
      try {
        const response = await fetch(`/api/orders/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderStatus: "confirmed",
            statusNote: "Bulk confirmed from the orders list",
          }),
        });
        if (response.ok) ok += 1;
        else failed.push(order?.orderNumber ?? id);
      } catch {
        failed.push(order?.orderNumber ?? id);
      }
    }

    setBulkResults({ ok, failed });
    setBulkBusy(false);
    setBulkOpen(false);
    setSelected([]);
    push({
      tone: failed.length ? "error" : "success",
      title: failed.length ? `${ok} orders confirmed, ${failed.length} failed` : `${ok} orders confirmed`,
      description: failed.length ? `Not updated: ${failed.join(", ")}` : "Status history recorded for each order.",
    });
    await load();
  }

  return (
    <div className="space-y-5">
      {bulkResults && (
        <Alert
          tone={bulkResults.failed.length ? "warning" : "success"}
          title={
            bulkResults.failed.length
              ? `${bulkResults.ok} order(s) confirmed, ${bulkResults.failed.length} could not be updated`
              : `${bulkResults.ok} order(s) marked as confirmed`
          }
        >
          {bulkResults.failed.length > 0 && <p>These were left unchanged: {bulkResults.failed.join(", ")}.</p>}
          <button type="button" onClick={() => setBulkResults(null)} className="btn btn-ghost btn-sm mt-2">
            Dismiss
          </button>
        </Alert>
      )}

      <AdminPanel
        title="Filters"
        description="Narrow the list by status, customer or date range."
        actions={
          <Button size="sm" variant="outline" onClick={load} loading={loading} icon={<RefreshCw size={15} />}>
            Refresh
          </Button>
        }
      >
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <form
            className="sm:col-span-2"
            onSubmit={(event) => {
              event.preventDefault();
              setQuery(search.trim());
            }}
          >
            <label className="label" htmlFor="order-search">
              Search
            </label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
              <input
                id="order-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Order number, company, email, GSTIN"
                className="field pl-9 pr-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setQuery("");
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
            <label className="label" htmlFor="order-status">
              Status
            </label>
            <select id="order-status" value={status} onChange={(e) => setStatus(e.target.value)} className="field">
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="order-from">
                From
              </label>
              <input id="order-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="order-to">
                To
              </label>
              <input id="order-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="field" />
            </div>
          </div>
        </div>
      </AdminPanel>

      {error ? (
        <ErrorState
          title="Orders could not be loaded"
          description="The request failed. Check that the database is reachable and try again."
          onRetry={load}
        />
      ) : (
        <AdminPanel
          title={`Orders (${formatNumber(total)})`}
          description={`Page ${page} of ${pages}`}
          actions={
            <>
              <Button size="sm" variant="outline" onClick={exportCsv} icon={<Download size={15} />} disabled={orders.length === 0}>
                Export page
              </Button>
              <Link href="/admin/inventory" className="btn btn-outline btn-sm">
                Inventory
              </Link>
            </>
          }
          footer={
            pages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  Showing {orders.length} of {formatNumber(total)} orders
                </p>
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
              </div>
            ) : (
              <p className="text-xs text-muted">Showing {orders.length} of {formatNumber(total)} orders</p>
            )
          }
        >
          {loading && orders.length === 0 ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <p className="px-5 py-14 text-center text-sm text-muted">
              No orders match these filters. Clear the search or widen the date range.
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="table-wrap hidden lg:block">
                <table className="table">
                  <caption className="sr-only">Customer orders</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="w-10">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-lineStrong accent-[#0B9B70]"
                          checked={allSelected}
                          onChange={(event) =>
                            setSelected(event.target.checked ? visibleIds : [])
                          }
                          aria-label="Select all orders on this page"
                        />
                      </th>
                      <th scope="col">Order</th>
                      <th scope="col">Customer</th>
                      <th scope="col">Items</th>
                      <th scope="col">Total</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order._id} className={selected.includes(order._id) ? "bg-brand-50/50" : undefined}>
                        <td>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-lineStrong accent-[#0B9B70]"
                            checked={selected.includes(order._id)}
                            onChange={(event) =>
                              setSelected((current) =>
                                event.target.checked
                                  ? [...current, order._id]
                                  : current.filter((id) => id !== order._id)
                              )
                            }
                            aria-label={`Select order ${order.orderNumber}`}
                          />
                        </td>
                        <td>
                          <Link href={`/admin/orders/${order._id}`} className="font-semibold text-navy-900 hover:text-brand-700">
                            {order.orderNumber ?? "—"}
                          </Link>
                          <p className="mt-0.5 text-xs text-muted">{formatDateTime(order.createdAt)}</p>
                        </td>
                        <td>
                          <p className="text-sm text-navy-800">{order.companyName || order.contactName || "—"}</p>
                          <p className="mt-0.5 text-xs text-muted">{order.customerEmail || "—"}</p>
                          {order.gstin && <p className="mt-0.5 text-xs text-navy-300">GSTIN {order.gstin}</p>}
                        </td>
                        <td className="tabular-nums">{order.items?.length ?? 0}</td>
                        <td className="font-semibold tabular-nums">{formatINR(order.grandTotal ?? 0)}</td>
                        <td>
                          <OrderStatusBadge status={order.orderStatus} />
                        </td>
                        <td className="text-right">
                          <Link href={`/admin/orders/${order._id}`} className="btn btn-outline btn-sm">
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards — the table is unusable at 360px. */}
              <ul className="divide-y divide-line lg:hidden">
                {orders.map((order) => (
                  <li key={order._id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/admin/orders/${order._id}`} className="text-sm font-semibold text-navy-900">
                          {order.orderNumber ?? "—"}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted">{formatDateTime(order.createdAt)}</p>
                      </div>
                      <OrderStatusBadge status={order.orderStatus} />
                    </div>
                    <p className="mt-2 text-sm text-navy-800">{order.companyName || order.contactName || "—"}</p>
                    <p className="mt-0.5 text-xs text-muted">{order.customerEmail || "—"}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-semibold tabular-nums text-navy-900">
                        {formatINR(order.grandTotal ?? 0)}
                      </span>
                      <Link href={`/admin/orders/${order._id}`} className="btn btn-outline btn-sm">
                        Open order
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </AdminPanel>
      )}

      {selected.length > 0 && (
        <div className="sticky bottom-4 z-30 mx-auto flex w-fit flex-wrap items-center justify-center gap-3 rounded-control border border-line bg-surface px-4 py-2.5 shadow-raised">
          <p className="text-sm text-navy-800">
            {selected.length} order{selected.length === 1 ? "" : "s"} selected
          </p>
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="btn btn-primary btn-sm"
            disabled={bulkBusy}
          >
            <CheckCircle2 size={15} />
            <span>Mark as confirmed</span>
          </button>
          <button type="button" onClick={() => setSelected([])} className="btn btn-ghost btn-sm">
            Clear
          </button>
        </div>
      )}

      <ConfirmDialog
        open={bulkOpen}
        busy={bulkBusy}
        tone="primary"
        title={`Mark ${selected.length} order${selected.length === 1 ? "" : "s"} as confirmed?`}
        description="Each order's status history will record the change and who made it. Orders already confirmed are unaffected."
        confirmLabel="Confirm orders"
        onCancel={() => setBulkOpen(false)}
        onConfirm={bulkConfirm}
      />
    </div>
  );
}
