"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Mail, Phone, RefreshCw, Search, UserPlus, Users, X } from "lucide-react";
import { AdminPanel, MetricCard } from "./ui";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import type { CustomerDto } from "@/lib/types";

const PAGE_SIZE = 20;

/**
 * Customer directory.
 *
 * There is no customer account store in this system, so this list is derived
 * from the orders and enquiries a business has actually placed. A business with
 * enquiries but no orders is shown as a lead rather than being dressed up as a
 * buyer.
 */
export function CustomersView() {
  const [items, setItems] = useState<CustomerDto[]>([]);
  const [summary, setSummary] = useState<{ buyers: number; leads: number; totalValue: number } | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (query) params.set("search", query);
      const response = await fetch(`/api/admin/customers?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      const data = await response.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total) || 0);
      setPages(Number(data.totalPages) || 1);
      setSummary(data.summary ?? null);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Companies ordered"
          value={formatNumber(summary?.buyers ?? 0)}
          hint="Accounts with at least one order"
          icon={<Users size={17} />}
        />
        <MetricCard
          label="Leads to follow up"
          value={formatNumber(summary?.leads ?? 0)}
          hint="Enquired but have not ordered yet"
          icon={<UserPlus size={17} />}
          tone="warning"
        />
        <MetricCard
          label="Ordered value"
          value={formatINR(summary?.totalValue ?? 0)}
          hint="Across all orders shown in this directory"
          icon={<Users size={17} />}
          tone="brand"
        />
      </div>

      <AdminPanel
        title="Search"
        description="Match on company, contact name, email or GSTIN."
        actions={
          <Button size="sm" variant="outline" onClick={load} loading={loading} icon={<RefreshCw size={15} />}>
            Refresh
          </Button>
        }
      >
        <form
          className="p-5"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setQuery(search.trim());
          }}
        >
          <label className="label" htmlFor="customer-search">
            Find a customer
          </label>
          <div className="relative max-w-lg">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <input
              id="customer-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Company, name, email or GSTIN"
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
      </AdminPanel>

      {error ? (
        <ErrorState
          title="Customers could not be loaded"
          description="The request failed. Check that the database is reachable and try again."
          onRetry={load}
        />
      ) : (
        <AdminPanel
          title={`Companies (${formatNumber(total)})`}
          description={`Page ${page} of ${pages}`}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">
                Showing {items.length} of {formatNumber(total)} companies
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
              No companies match this search. Orders and enquiries create this directory automatically.
            </p>
          ) : (
            <>
              <div className="table-wrap hidden lg:block">
                <table className="table">
                  <caption className="sr-only">Companies that have ordered or enquired</caption>
                  <thead>
                    <tr>
                      <th scope="col">Company</th>
                      <th scope="col">Contact</th>
                      <th scope="col">Location</th>
                      <th scope="col">Orders</th>
                      <th scope="col">Enquiries</th>
                      <th scope="col">Value</th>
                      <th scope="col">Last activity</th>
                      <th scope="col" className="text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-navy-900">{row.companyName}</span>
                            {row.isLead && <Badge tone="warning">Lead</Badge>}
                          </div>
                          {row.gstin && <p className="text-xs text-muted">GSTIN {row.gstin}</p>}
                        </td>
                        <td>
                          <p className="text-navy-800">{row.contactName || "—"}</p>
                          <p className="text-xs text-muted">{row.email}</p>
                        </td>
                        <td className="text-navy-800">
                          {row.city ? `${row.city}${row.state ? `, ${row.state}` : ""}` : "—"}
                        </td>
                        <td className="tabular-nums">{formatNumber(row.orderCount)}</td>
                        <td className="tabular-nums">{formatNumber(row.enquiryCount)}</td>
                        <td className="tabular-nums">{row.value > 0 ? formatINR(row.value) : <span className="text-muted">—</span>}</td>
                        <td className="text-navy-800">{row.lastActivityAt ? formatDate(row.lastActivityAt) : "—"}</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/admin/orders?search=${encodeURIComponent(row.email)}`} className="btn btn-outline btn-sm">
                              Orders
                            </Link>
                            {row.enquiryCount > 0 && (
                              <Link href={`/admin/inquiries?search=${encodeURIComponent(row.email)}`} className="btn btn-ghost btn-sm">
                                Enquiries
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-line lg:hidden">
                {items.map((row) => (
                  <li key={row.id} className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-navy-900">{row.companyName}</p>
                      {row.isLead && <Badge tone="warning">Lead</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {row.contactName || "Contact not provided"}
                      {row.city ? ` · ${row.city}` : ""}
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <dt className="text-muted">Orders</dt>
                        <dd className="tabular-nums text-navy-800">{formatNumber(row.orderCount)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Value</dt>
                        <dd className="tabular-nums text-navy-800">{row.value > 0 ? formatINR(row.value) : "—"}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href={`mailto:${row.email}`} className="btn btn-outline btn-sm">
                        <Mail size={15} />
                        <span>Email</span>
                      </a>
                      {row.phone && (
                        <a href={`tel:${row.phone.replace(/\s+/g, "")}`} className="btn btn-ghost btn-sm">
                          <Phone size={15} />
                          <span>Call</span>
                        </a>
                      )}
                      <Link href={`/admin/orders?search=${encodeURIComponent(row.email)}`} className="btn btn-ghost btn-sm">
                        Orders
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </AdminPanel>
      )}
    </div>
  );
}
