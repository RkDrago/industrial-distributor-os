/**
 * Shared formatting helpers so currency, dates and quantities render
 * identically on the storefront, in the customer account area and in admin.
 */

const inr2 = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inr0 = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Whole-rupee formatting for headline prices: ₹1,25,000 */
export function formatINRShort(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "₹0";
  return `₹${inr0.format(Math.round(n))}`;
}

/** Two-decimal formatting for anything that participates in a total. */
export function formatINR(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "₹0.00";
  return `₹${inr2.format(n)}`;
}

/** Price that hides trailing .00 so product cards stay clean. */
export function formatPrice(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "₹0";
  return Number.isInteger(n) ? `₹${inr0.format(n)}` : `₹${inr2.format(n)}`;
}

export function formatQty(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return inr0.format(n);
}

export function formatNumber(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-IN");
}

export function formatPercent(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0%";
  return `${Number.isInteger(n) ? n : inr2.format(n)}%`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}, ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return formatDate(d);
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  new: "Order received",
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function orderStatusLabel(status: string | null | undefined): string {
  if (!status) return "Order received";
  return ORDER_STATUS_LABELS[status] ?? status;
}

const INQUIRY_STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quote sent",
  closed: "Closed",
};

export function inquiryStatusLabel(status: string | null | undefined): string {
  if (!status) return "New";
  return INQUIRY_STATUS_LABELS[status] ?? status;
}

const BOOKING_STATUS_LABELS: Record<string, string> = {
  booked: "Booked",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function bookingStatusLabel(status: string | null | undefined): string {
  if (!status) return "Booked";
  return BOOKING_STATUS_LABELS[status] ?? status;
}

export function titleCase(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** "2 days ago" style copy for the notification feed. */
export function timeAgoShort(value: string | Date | null | undefined): string {
  return formatRelative(value);
}
