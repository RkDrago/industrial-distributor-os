"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, BellRing, CalendarClock, CheckCheck, PackageSearch, RefreshCw, ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";
import { AdminPanel, DefinitionNote } from "./ui";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, formatRelative, formatNumber } from "@/lib/format";
import type { AdminNotificationDto } from "@/lib/types";

const KIND_ICON: Record<AdminNotificationDto["kind"], ReactNode> = {
  order: <ShoppingBag size={16} />,
  inquiry: <PackageSearch size={16} />,
  booking: <CalendarClock size={16} />,
  status: <Activity size={16} />,
};

const KIND_LABEL: Record<AdminNotificationDto["kind"], string> = {
  order: "Order",
  inquiry: "Enquiry",
  booking: "Booking",
  status: "Status change",
};

// Matches the bell in the dashboard header so both surfaces agree on freshness.
const REFRESH_MS = 10_000;

/**
 * Notification centre.
 *
 * This is a polled feed built from real records (orders, bookings, enquiries and
 * their status history) — it refreshes on an interval rather than pretending to
 * be a push channel. "Mark all as read" stores a single timestamp on the
 * server, so the state is shared between operators instead of per browser.
 */
export function NotificationsView() {
  const [items, setItems] = useState<AdminNotificationDto[]>([]);
  const [unread, setUnread] = useState(0);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { push } = useToast();
  const initialLoad = useRef(true);

  const load = useCallback(async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      const data = await response.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnread(Number(data.unreadCount) || 0);
      setLastSeenAt(data.lastSeenAt ?? null);
      setUpdatedAt(new Date());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
      initialLoad.current = false;
    }
  }, []);

  useEffect(() => {
    load("initial");
  }, [load]);

  // Poll while the tab is visible so a backgrounded tab stops making requests.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load("refresh");
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  async function markAllRead() {
    if (marking) return;
    setMarking(true);
    try {
      const response = await fetch("/api/notifications", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        push({ tone: "error", title: "Could not update notifications", description: "Please try again." });
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnread(Number(data.unreadCount) || 0);
      setLastSeenAt(data.lastSeenAt ?? null);
      setUpdatedAt(new Date());
      push({ tone: "success", title: "All notifications marked as read" });
    } catch {
      push({ tone: "error", title: "Could not reach the server" });
    } finally {
      setMarking(false);
    }
  }

  const visible = filter === "unread" ? items.filter((item) => item.unread) : items;

  return (
    <div className="space-y-5">
      <AdminPanel
        title={`Notifications${unread > 0 ? ` · ${formatNumber(unread)} unread` : ""}`}
        description={
          updatedAt
            ? `Last checked ${formatRelative(updatedAt.toISOString())} · refreshes every ${REFRESH_MS / 1000} seconds while this tab is open`
            : "Loading the feed…"
        }
        actions={
          <>
            <div className="flex items-center gap-1 rounded-control border border-line p-0.5" role="group" aria-label="Filter notifications">
              <button
                type="button"
                onClick={() => setFilter("all")}
                aria-pressed={filter === "all"}
                className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold transition ${
                  filter === "all" ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-canvas"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilter("unread")}
                aria-pressed={filter === "unread"}
                className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold transition ${
                  filter === "unread" ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-canvas"
                }`}
              >
                Unread
              </button>
            </div>
            <Button size="sm" variant="outline" onClick={() => load("refresh")} loading={refreshing} icon={<RefreshCw size={15} />}>
              Refresh
            </Button>
            <Button size="sm" onClick={markAllRead} loading={marking} disabled={unread === 0} icon={<CheckCheck size={15} />}>
              Mark all read
            </Button>
          </>
        }
        footer={
          <DefinitionNote>
            {lastSeenAt
              ? `Unread means the record was created or updated after ${formatDateTime(lastSeenAt)}. This is a polled feed, not real-time push.`
              : "Unread means the record was created or updated since the last time a teammate marked the feed as read. This is a polled feed, not real-time push."}
          </DefinitionNote>
        }
      >
        {error ? (
          <div className="p-5">
            <ErrorState
              title="Notifications could not be loaded"
              description="The request failed. Check that the database is reachable and try again."
              onRetry={() => load("initial")}
            />
          </div>
        ) : loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-navy-50 text-navy-400">
              <BellRing size={20} />
            </span>
            <p className="mt-3 text-sm font-semibold text-navy-900">
              {filter === "unread" ? "Nothing unread" : "No notifications yet"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted">
              {filter === "unread"
                ? "Everything in the feed has been reviewed."
                : "Orders, bookings, enquiries and status changes appear here as they happen."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((item) => (
              <li key={item.id} className={item.unread ? "bg-brand-50/40" : undefined}>
                <Link
                  href={item.href}
                  className="flex items-start gap-3.5 p-5 transition hover:bg-canvas focus-visible:bg-canvas"
                >
                  <span
                    className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-chip ${
                      item.unread ? "bg-brand-100 text-brand-700" : "bg-navy-50 text-navy-500"
                    }`}
                    aria-hidden="true"
                  >
                    {KIND_ICON[item.kind]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-navy-900">{item.title}</p>
                      {item.unread && <Badge tone="brand">Unread</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted" title={item.summary}>
                      {item.summary}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {KIND_LABEL[item.kind]} · {formatRelative(item.at)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
    </div>
  );
}
