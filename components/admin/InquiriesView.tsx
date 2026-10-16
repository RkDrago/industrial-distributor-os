"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquareQuote, RefreshCw, Search, X } from "lucide-react";
import { AdminPanel } from "./ui";
import { InquiryStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/Overlay";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import type { InquiryDto } from "@/lib/types";

const STATUS_FILTERS = [
  { value: "all", label: "All enquiries" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "quoted", label: "Quote sent" },
  { value: "closed", label: "Closed" },
];

const PAGE_SIZE = 20;

type Draft = {
  status: string;
  quoteAmount: string;
  adminNote: string;
};

/**
 * Enquiries and quotations.
 *
 * A quote is only ever recorded against an enquiry that actually exists, and
 * the amount is validated again on the server, so the figure shown to the
 * customer cannot be set from the browser alone.
 */
export function InquiriesView({ focusId = "", initialSearch = "" }: { focusId?: string; initialSearch?: string }) {
  const [items, setItems] = useState<InquiryDto[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState(initialSearch);
  const [query, setQuery] = useState(initialSearch);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [active, setActive] = useState<InquiryDto | null>(null);
  const [draft, setDraft] = useState<Draft>({ status: "new", quoteAmount: "", adminNote: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (status !== "all") params.set("status", status);
      if (query) params.set("search", query);
      const response = await fetch(`/api/inquiries?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      const data = await response.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total) || 0);
      setPages(Number(data.totalPages) || 1);
      setStatusCounts(data.statusCounts ?? {});
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, status, query]);

  useEffect(() => {
    load();
  }, [load]);

  // Deep links from the notification feed open the matching enquiry.
  useEffect(() => {
    if (!focusId || !items.length) return;
    const match = items.find((entry) => entry._id === focusId);
    if (match) openEditor(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, items]);

  function openEditor(inquiry: InquiryDto) {
    setActive(inquiry);
    setFormError(null);
    setDraft({
      status: inquiry.status ?? "new",
      quoteAmount: inquiry.quoteAmount === undefined || inquiry.quoteAmount === null ? "" : String(inquiry.quoteAmount),
      adminNote: inquiry.adminNote ?? "",
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!active || saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`/api/inquiries/${active._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: draft.status,
          quoteAmount: draft.quoteAmount === "" ? "" : Number(draft.quoteAmount),
          adminNote: draft.adminNote,
          statusNote: draft.status === active.status ? undefined : `Marked ${draft.status}`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormError(typeof data?.error === "string" ? data.error : "The enquiry could not be updated.");
        return;
      }
      push({
        tone: "success",
        title: `${active.inquiryNumber ?? "Enquiry"} updated`,
        description: draft.quoteAmount ? `Quote recorded at ${formatINR(Number(draft.quoteAmount))}.` : "Status and notes saved.",
      });
      setActive(null);
      await load();
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const counts = [
    { label: "New", value: statusCounts.new ?? 0, tone: "badge-info" },
    { label: "Contacted", value: statusCounts.contacted ?? 0, tone: "badge-warning" },
    { label: "Quoted", value: statusCounts.quoted ?? 0, tone: "badge-brand" },
    { label: "Closed", value: statusCounts.closed ?? 0, tone: "badge-neutral" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {counts.map((entry) => (
          <div key={entry.label} className="rounded-card border border-line bg-surface p-4">
            <p className="text-[13px] font-medium text-muted">{entry.label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-navy-900">{formatNumber(entry.value)}</p>
          </div>
        ))}
      </div>

      <AdminPanel
        title="Filters"
        description="Find an enquiry by reference, product, company or contact."
        actions={
          <Button size="sm" variant="outline" onClick={load} loading={loading} icon={<RefreshCw size={15} />}>
            Refresh
          </Button>
        }
      >
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <form
            className="sm:col-span-2"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setQuery(search.trim());
            }}
          >
            <label className="label" htmlFor="inquiry-search">
              Search
            </label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
              <input
                id="inquiry-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Reference, product, name or email"
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
            <label className="label" htmlFor="inquiry-status">
              Status
            </label>
            <select
              id="inquiry-status"
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
              className="field"
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </AdminPanel>

      {error ? (
        <ErrorState
          title="Enquiries could not be loaded"
          description="The request failed. Check that the database is reachable and try again."
          onRetry={load}
        />
      ) : (
        <AdminPanel
          title={`Enquiries (${formatNumber(total)})`}
          description={`Page ${page} of ${pages}`}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">
                Showing {items.length} of {formatNumber(total)} enquiries
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
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="px-5 py-14 text-center text-sm text-muted">
              No enquiries match these filters. Clear the search or choose another status.
            </p>
          ) : (
            <>
              <div className="table-wrap hidden lg:block">
                <table className="table">
                  <caption className="sr-only">Product enquiries</caption>
                  <thead>
                    <tr>
                      <th scope="col">Reference</th>
                      <th scope="col">Product</th>
                      <th scope="col">Customer</th>
                      <th scope="col">Qty</th>
                      <th scope="col">Quote</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((inquiry) => (
                      <tr key={inquiry._id}>
                        <td>
                          <p className="font-medium text-navy-900">{inquiry.inquiryNumber ?? "—"}</p>
                          <p className="text-xs text-muted">{formatDate(inquiry.createdAt)}</p>
                        </td>
                        <td className="max-w-[220px]">
                          <p className="truncate text-navy-800" title={inquiry.productTitle}>
                            {inquiry.productTitle ?? "—"}
                          </p>
                          {inquiry.productSku && <p className="text-xs text-muted">SKU {inquiry.productSku}</p>}
                        </td>
                        <td>
                          <p className="text-navy-800">{inquiry.guestCompany || inquiry.guestName || "—"}</p>
                          <p className="text-xs text-muted">{inquiry.guestEmail}</p>
                        </td>
                        <td className="tabular-nums">{formatNumber(inquiry.quantity ?? 1)}</td>
                        <td className="tabular-nums">
                          {inquiry.quoteAmount ? formatINR(inquiry.quoteAmount) : <span className="text-muted">Not quoted</span>}
                        </td>
                        <td>
                          <InquiryStatusBadge status={inquiry.status} />
                        </td>
                        <td className="text-right">
                          <Button size="sm" variant="outline" onClick={() => openEditor(inquiry)}>
                            Open
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-line lg:hidden">
                {items.map((inquiry) => (
                  <li key={inquiry._id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy-900">{inquiry.inquiryNumber ?? "Enquiry"}</p>
                        <p className="mt-0.5 text-xs text-muted">{formatDate(inquiry.createdAt)}</p>
                      </div>
                      <InquiryStatusBadge status={inquiry.status} />
                    </div>
                    <p className="mt-3 text-sm text-navy-800">{inquiry.productTitle ?? "—"}</p>
                    <p className="mt-1 text-xs text-muted">
                      {inquiry.guestCompany || inquiry.guestName} · Qty {formatNumber(inquiry.quantity ?? 1)}
                      {inquiry.quoteAmount ? ` · ${formatINR(inquiry.quoteAmount)}` : ""}
                    </p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => openEditor(inquiry)}>
                      Open enquiry
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
        title={active?.inquiryNumber ? `Enquiry ${active.inquiryNumber}` : "Enquiry"}
        description={active?.productTitle}
        size="md"
      >
        {active && (
          <form onSubmit={save} className="space-y-5" noValidate>
            <dl className="grid gap-3 rounded-chip bg-canvas p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Contact</dt>
                <dd className="text-navy-800">
                  {active.guestName} · {active.guestEmail}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Phone</dt>
                <dd className="text-navy-800">{active.guestPhone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Company</dt>
                <dd className="text-navy-800">{active.guestCompany || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">GSTIN</dt>
                <dd className="text-navy-800">{active.guestGstin || "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Quantity</dt>
                <dd className="text-navy-800">{formatNumber(active.quantity ?? 1)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">SKU</dt>
                <dd className="text-navy-800">{active.productSku || "—"}</dd>
              </div>
            </dl>

            {active.message && (
              <div className="rounded-chip border border-line p-4">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  <MessageSquareQuote size={13} />
                  Customer message
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-navy-800">{active.message}</p>
              </div>
            )}

            {formError && (
              <Alert tone="danger" title="Could not save">
                {formError}
              </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Status" value={draft.status} onChange={(event) => setDraft((d) => ({ ...d, status: event.target.value }))}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="quoted">Quote sent</option>
                <option value="closed">Closed</option>
              </Select>
              <Input
                label="Quoted amount"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={draft.quoteAmount}
                onChange={(event) => setDraft((d) => ({ ...d, quoteAmount: event.target.value }))}
                hint="Excluding GST. Leave blank to clear an existing quote."
              />
            </div>

            <Textarea
              label="Internal note"
              rows={3}
              value={draft.adminNote}
              onChange={(event) => setDraft((d) => ({ ...d, adminNote: event.target.value }))}
              hint="Only visible to your team."
            />

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
              <Button variant="outline" onClick={() => setActive(null)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" loading={saving} loadingLabel="Saving…">
                Save enquiry
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
