import type { ReactNode } from "react";
import { bookingStatusLabel, inquiryStatusLabel, orderStatusLabel } from "@/lib/format";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

export function Badge({
  tone = "neutral",
  children,
  className,
  icon,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span className={`badge badge-${tone} ${className ?? ""}`}>
      {icon}
      {children}
    </span>
  );
}

const ORDER_TONES: Record<string, BadgeTone> = {
  new: "info",
  pending: "warning",
  confirmed: "brand",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
};

export function OrderStatusBadge({ status }: { status?: string | null }) {
  const key = status ?? "new";
  return <Badge tone={ORDER_TONES[key] ?? "neutral"}>{orderStatusLabel(key)}</Badge>;
}

const INQUIRY_TONES: Record<string, BadgeTone> = {
  new: "info",
  contacted: "warning",
  quoted: "brand",
  closed: "neutral",
};

export function InquiryStatusBadge({ status }: { status?: string | null }) {
  const key = status ?? "new";
  return <Badge tone={INQUIRY_TONES[key] ?? "neutral"}>{inquiryStatusLabel(key)}</Badge>;
}

const BOOKING_TONES: Record<string, BadgeTone> = {
  booked: "info",
  confirmed: "brand",
  completed: "success",
  cancelled: "danger",
};

export function BookingStatusBadge({ status }: { status?: string | null }) {
  const key = status ?? "booked";
  return <Badge tone={BOOKING_TONES[key] ?? "neutral"}>{bookingStatusLabel(key)}</Badge>;
}

export function StockBadge({
  stock,
  lowThreshold = 10,
}: {
  stock: number | null | undefined;
  lowThreshold?: number;
}) {
  const n = Number(stock ?? 0);
  if (!Number.isFinite(n) || n <= 0) return <Badge tone="danger">Out of stock</Badge>;
  if (n <= lowThreshold) return <Badge tone="warning">{`Low stock · ${n} left`}</Badge>;
  return <Badge tone="success">In stock</Badge>;
}
