"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, PackageSearch, RefreshCw } from "lucide-react";
import { formatRelative } from "@/lib/format";
import type { AdminNotificationDto } from "@/lib/types";

/**
 * Notification centre.
 *
 * Polls the feed on an interval. This is polling, not push — the UI says so,
 * and the copy deliberately avoids implying real-time delivery. Failures are
 * shown quietly so a transient network problem cannot spam the operator.
 */
const POLL_MS = 10_000;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminNotificationDto[]>([]);
  const [unread, setUnread] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [failed, setFailed] = useState(false);
  const [marking, setMarking] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      const data = await response.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnread(Number(data.unreadCount) || 0);
      setLastUpdated(new Date());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function markRead() {
    setMarking(true);
    try {
      const response = await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" } });
      if (response.ok) {
        const data = await response.json();
        setItems(Array.isArray(data.items) ? data.items : []);
        setUnread(Number(data.unreadCount) || 0);
      }
    } catch {
      /* the next poll will correct the state */
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative grid h-10 w-10 place-items-center rounded-control border border-white/15 text-white transition hover:bg-white/10"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-400 px-1 text-[10px] font-bold text-navy-900">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-card border border-line bg-surface shadow-pop animate-fadeUp">
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-navy-900">Notifications</p>
              <p className="mt-0.5 text-[11px] text-muted">
                {failed
                  ? "Could not refresh — retrying every 10 seconds"
                  : lastUpdated
                    ? `Refreshes every 10 seconds · ${formatRelative(lastUpdated)}`
                    : "Loading…"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={load}
                className="rounded p-1.5 text-navy-400 transition hover:bg-navy-50 hover:text-navy-700"
                aria-label="Refresh notifications"
              >
                <RefreshCw size={15} />
              </button>
              <button
                type="button"
                onClick={markRead}
                disabled={marking || unread === 0}
                className="rounded p-1.5 text-navy-400 transition hover:bg-navy-50 hover:text-navy-700 disabled:opacity-40"
                aria-label="Mark all as read"
              >
                <CheckCheck size={15} />
              </button>
            </div>
          </div>

          <ul className="max-h-[380px] divide-y divide-line overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-10 text-center">
                <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-navy-50 text-navy-400">
                  <PackageSearch size={18} />
                </span>
                <p className="mt-3 text-sm font-medium text-navy-900">Nothing new</p>
                <p className="mt-1 text-xs text-muted">New orders, bookings and enquiries appear here.</p>
              </li>
            )}
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-start gap-3 px-4 py-3 transition hover:bg-canvas ${
                    item.unread ? "bg-brand-50/60" : ""
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      item.unread ? "bg-brand-500" : "bg-navy-200"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-navy-900">{item.title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted">{item.summary}</span>
                    <span className="mt-1 block text-[11px] text-navy-300">{formatRelative(item.at)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="border-t border-line bg-canvas px-4 py-2.5">
            <Link
              href="/admin/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              Open the full notification log
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
