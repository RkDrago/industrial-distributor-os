import { CheckCircle2, CircleDashed, Clock, XCircle } from "lucide-react";
import { formatDateTime, orderStatusLabel } from "@/lib/format";
import type { StatusHistoryEntry } from "@/lib/types";

const FLOW = ["new", "pending", "confirmed", "shipped", "delivered"] as const;

/**
 * Order status timeline.
 *
 * Built from the order's stored statusHistory, so it only shows events that
 * actually happened and when. Remaining steps are listed as upcoming rather
 * than being given invented dates.
 */
export function OrderTimeline({
  status,
  history,
  trackingNumber,
  courier,
  compact = false,
}: {
  status: string;
  history?: StatusHistoryEntry[];
  trackingNumber?: string;
  courier?: string;
  compact?: boolean;
}) {
  const entries = (history ?? [])
    .map((entry) => ({
      ...entry,
      at: entry.at ? new Date(entry.at) : null,
    }))
    .filter((entry) => entry.at && !Number.isNaN(entry.at.getTime()))
    .sort((a, b) => (a.at as Date).getTime() - (b.at as Date).getTime());

  const cancelled = status === "cancelled";
  const currentIndex = FLOW.indexOf(status as (typeof FLOW)[number]);

  return (
    <div>
      {cancelled && (
        <div className="mb-4 flex items-start gap-2.5 rounded-card border border-[#F5C7C2] bg-danger-soft p-3.5">
          <XCircle size={17} className="mt-0.5 shrink-0 text-danger" />
          <div>
            <p className="text-sm font-semibold text-danger">This order was cancelled</p>
            <p className="mt-0.5 text-xs leading-5 text-danger/90">
              If this was not expected, contact our team and we will review it with you.
            </p>
          </div>
        </div>
      )}

      <ol className="space-y-0">
        {entries.map((entry, index) => {
          const last = index === entries.length - 1;
          const isCancelled = entry.status === "cancelled";
          return (
            <li key={`${entry.status}-${index}`} className="flex gap-3.5">
              <div className="flex flex-col items-center">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                    isCancelled ? "bg-danger-soft text-danger" : "bg-success-soft text-brand-600"
                  }`}
                >
                  {isCancelled ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                </span>
                {!last && <span className="my-0.5 w-px flex-1 bg-line" aria-hidden="true" />}
              </div>
              <div className={last ? "pb-0" : "pb-4"}>
                <p className="text-sm font-semibold text-navy-900">{orderStatusLabel(entry.status)}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatDateTime(entry.at)}
                  {entry.by && entry.by !== "website" && entry.by !== "system" ? ` · ${entry.by}` : ""}
                </p>
                {entry.note && <p className="mt-1 text-xs leading-5 text-navy-600">{entry.note}</p>}
                {entry.status === "shipped" && (trackingNumber || courier) && (
                  <p className="mt-1.5 inline-flex flex-wrap items-center gap-x-2 rounded-chip bg-canvas px-2.5 py-1 text-xs text-navy-700">
                    {courier && <span className="font-medium">{courier}</span>}
                    {trackingNumber && <span className="tabular-nums">{trackingNumber}</span>}
                  </p>
                )}
              </div>
            </li>
          );
        })}

        {entries.length === 0 && (
          <li className="flex gap-3.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy-50 text-navy-400">
              <Clock size={15} />
            </span>
            <div>
              <p className="text-sm font-semibold text-navy-900">{orderStatusLabel(status)}</p>
              <p className="mt-0.5 text-xs text-muted">No status updates recorded yet.</p>
            </div>
          </li>
        )}
      </ol>

      {!cancelled && !compact && currentIndex >= 0 && currentIndex < FLOW.length - 1 && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Still to come</p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            {FLOW.slice(currentIndex + 1).map((step) => (
              <li key={step} className="inline-flex items-center gap-1.5 text-xs text-navy-500">
                <CircleDashed size={13} className="text-navy-300" />
                {orderStatusLabel(step)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Compact horizontal progress used in tables and cards. */
export function OrderProgressBar({ status }: { status: string }) {
  const cancelled = status === "cancelled";
  const index = cancelled ? -1 : Math.max(0, FLOW.indexOf(status as (typeof FLOW)[number]));
  const percent = cancelled ? 100 : Math.round((index / (FLOW.length - 1)) * 100);

  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-navy-100" role="presentation">
        <div
          className={`h-full rounded-full ${cancelled ? "bg-danger" : "bg-brand-500"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-muted">{orderStatusLabel(status)}</p>
    </div>
  );
}
