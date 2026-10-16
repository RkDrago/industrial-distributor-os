"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, RefreshCw, Search, X } from "lucide-react";
import { AdminPanel } from "./ui";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/Overlay";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import type { BookingDto } from "@/lib/types";

const STATUS_FILTERS = [
  { value: "all", label: "All bookings" },
  { value: "booked", label: "Booked" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PAGE_SIZE = 20;

/** Appointment bookings: quotation calls, site audits and account setup. */
export function BookingsView({ focusId = "" }: { focusId?: string }) {
  const [items, setItems] = useState<BookingDto[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [active, setActive] = useState<BookingDto | null>(null);
  const [draft, setDraft] = useState({ status: "booked", adminNote: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (status !== "all") params.set("status", status);
      if (query) params.set("search", query);
      const response = await fetch(`/api/bookings?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      const data = await response.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total) || 0);
      setPages(Number(data.totalPages) || 1);
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

  useEffect(() => {
    if (!focusId || !items.length) return;
    const match = items.find((entry) => entry._id === focusId);
    if (match) openEditor(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, items]);

  function openEditor(booking: BookingDto) {
    setActive(booking);
    setFormError(null);
    setDraft({ status: booking.status ?? "booked", adminNote: booking.adminNote ?? "" });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!active || saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`/api/bookings/${active._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: draft.status,
          adminNote: draft.adminNote,
          statusNote: draft.status === active.status ? undefined : `Marked ${draft.status}`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormError(typeof data?.error === "string" ? data.error : "The booking could not be updated.");
        return;
      }
      push({ tone: "success", title: `${active.bookingNumber ?? "Booking"} updated` });
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
      <AdminPanel
        title="Filters"
        description="Find a booking by reference, customer, company or service."
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
            <label className="label" htmlFor="booking-search">
              Search
            </label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
              <input
                id="booking-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Reference, name, email or service"
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
            <label className="label" htmlFor="booking-status">
              Status
            </label>
            <select
              id="booking-status"
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
          title="Bookings could not be loaded"
          description="The request failed. Check that the database is reachable and try again."
          onRetry={load}
        />
      ) : (
        <AdminPanel
          title={`Bookings (${formatNumber(total)})`}
          description={`Page ${page} of ${pages}`}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">
                Showing {items.length} of {formatNumber(total)} bookings
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
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-navy-50 text-navy-400">
                <CalendarClock size={20} />
              </span>
              <p className="mt-3 text-sm font-semibold text-navy-900">No bookings match these filters</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted">
                Bookings arrive from the contact page when a customer asks for a quotation call or site audit.
              </p>
            </div>
          ) : (
            <>
              <div className="table-wrap hidden lg:block">
                <table className="table">
                  <caption className="sr-only">Customer bookings</caption>
                  <thead>
                    <tr>
                      <th scope="col">Reference</th>
                      <th scope="col">Service</th>
                      <th scope="col">Customer</th>
                      <th scope="col">Preferred slot</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((booking) => (
                      <tr key={booking._id}>
                        <td>
                          <p className="font-medium text-navy-900">{booking.bookingNumber ?? "—"}</p>
                          <p className="text-xs text-muted">Requested {formatDate(booking.createdAt)}</p>
                        </td>
                        <td className="text-navy-800">{booking.serviceType ?? "—"}</td>
                        <td>
                          <p className="text-navy-800">{booking.companyName || booking.customerName || "—"}</p>
                          <p className="text-xs text-muted">{booking.email}</p>
                        </td>
                        <td className="text-navy-800">
                          {booking.date ? `${booking.date}${booking.slot ? ` · ${booking.slot}` : ""}` : "—"}
                        </td>
                        <td>
                          <BookingStatusBadge status={booking.status} />
                        </td>
                        <td className="text-right">
                          <Button size="sm" variant="outline" onClick={() => openEditor(booking)}>
                            Open
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-line lg:hidden">
                {items.map((booking) => (
                  <li key={booking._id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy-900">{booking.bookingNumber ?? "Booking"}</p>
                        <p className="mt-0.5 text-xs text-muted">{booking.serviceType}</p>
                      </div>
                      <BookingStatusBadge status={booking.status} />
                    </div>
                    <p className="mt-3 text-sm text-navy-800">{booking.companyName || booking.customerName}</p>
                    <p className="mt-1 text-xs text-muted">
                      {booking.date ? `${booking.date}${booking.slot ? ` · ${booking.slot}` : ""}` : "No slot chosen"}
                    </p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => openEditor(booking)}>
                      Open booking
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
        title={active?.bookingNumber ? `Booking ${active.bookingNumber}` : "Booking"}
        description={active?.serviceType}
        size="sm"
      >
        {active && (
          <form onSubmit={save} className="space-y-5" noValidate>
            <dl className="grid gap-3 rounded-chip bg-canvas p-4 text-sm">
              <div>
                <dt className="text-xs text-muted">Customer</dt>
                <dd className="text-navy-800">
                  {active.customerName}
                  {active.companyName ? ` · ${active.companyName}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Contact</dt>
                <dd className="text-navy-800">
                  {active.email} · {active.phone || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Preferred slot</dt>
                <dd className="text-navy-800">
                  {active.date || "—"}
                  {active.slot ? ` · ${active.slot}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Requested</dt>
                <dd className="text-navy-800">{formatDateTime(active.createdAt)}</dd>
              </div>
              {active.notes && (
                <div>
                  <dt className="text-xs text-muted">Customer notes</dt>
                  <dd className="whitespace-pre-line text-navy-800">{active.notes}</dd>
                </div>
              )}
            </dl>

            {formError && (
              <Alert tone="danger" title="Could not save">
                {formError}
              </Alert>
            )}

            <Select label="Status" value={draft.status} onChange={(event) => setDraft((d) => ({ ...d, status: event.target.value }))}>
              <option value="booked">Booked</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>

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
                Save booking
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
