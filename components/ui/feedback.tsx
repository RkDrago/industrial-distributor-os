import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, PackageOpen, RefreshCw, XCircle } from "lucide-react";

type Tone = "info" | "success" | "warning" | "danger";

const ALERT_STYLES: Record<Tone, { wrap: string; icon: ReactNode }> = {
  info: { wrap: "border-[#CBD9F8] bg-info-soft text-info", icon: <Info size={18} /> },
  success: { wrap: "border-brand-200 bg-success-soft text-brand-700", icon: <CheckCircle2 size={18} /> },
  warning: { wrap: "border-[#F3DFB4] bg-warning-soft text-warning", icon: <AlertTriangle size={18} /> },
  danger: { wrap: "border-[#F5C7C2] bg-danger-soft text-danger", icon: <XCircle size={18} /> },
};

export function Alert({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const style = ALERT_STYLES[tone];
  return (
    <div
      className={`flex items-start gap-3 rounded-card border p-3.5 ${style.wrap} ${className ?? ""}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      <span className="mt-0.5 shrink-0">{style.icon}</span>
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5 opacity-90" : "opacity-90"}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-card border border-dashed border-lineStrong bg-surface px-6 py-14 text-center ${className ?? ""}`}
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-navy-50 text-navy-400" aria-hidden="true">
        {icon ?? <PackageOpen size={22} />}
      </span>
      <h3 className="mt-4 text-base font-semibold text-navy-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm leading-6 text-muted">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "We couldn't load this",
  description = "The request failed. Check your connection and try again.",
  onRetry,
  retryLabel = "Try again",
}: {
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="rounded-card border border-[#F5C7C2] bg-danger-soft p-6 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-white text-danger" aria-hidden="true">
        <AlertTriangle size={20} />
      </span>
      <h3 className="mt-3 text-base font-semibold text-navy-900">{title}</h3>
      <p className="mt-1.5 text-sm text-navy-600">{description}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-outline btn-sm mt-4">
          <RefreshCw size={15} />
          <span>{retryLabel}</span>
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4" aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className="h-9" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function InlineLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-16 text-sm text-muted" role="status" aria-live="polite">
      <svg className="h-4 w-4 animate-[spinSlow_.7s_linear_infinite]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span>{label}</span>
    </div>
  );
}
