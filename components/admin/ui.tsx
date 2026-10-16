import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Info } from "lucide-react";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-1.5 text-xl font-bold tracking-[-0.015em] text-navy-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  href,
  hrefLabel,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "brand" | "warning" | "danger";
  href?: string;
  hrefLabel?: string;
}) {
  const toneClass = {
    neutral: "bg-navy-50 text-navy-600",
    brand: "bg-brand-50 text-brand-600",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
  }[tone];

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        {icon && <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-chip ${toneClass}`}>{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-[-0.02em] text-navy-900">{value}</p>
      {hint && <p className="mt-1 text-xs leading-5 text-muted">{hint}</p>}
      {href && hrefLabel && (
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
          {hrefLabel}
          <ArrowUpRight size={13} />
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-card border border-line bg-surface p-5 transition hover:border-lineStrong hover:shadow-card"
      >
        {body}
      </Link>
    );
  }

  return <div className="rounded-card border border-line bg-surface p-5">{body}</div>;
}

/** Wraps a table with its heading and an optional note. */
export function AdminPanel({
  title,
  description,
  actions,
  children,
  footer,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-card border border-line bg-surface ${className ?? ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-navy-900">{title}</h2>
          {description && <p className="mt-1 text-xs leading-5 text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
      {footer && <div className="border-t border-line bg-canvas px-5 py-3">{footer}</div>}
    </section>
  );
}

/** Explains a metric's definition rather than leaving the operator guessing. */
export function DefinitionNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 flex items-start gap-2 rounded-chip bg-canvas px-3 py-2 text-xs leading-5 text-muted">
      <Info size={14} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function MobileCardRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <span className="text-right text-sm text-navy-800">{children}</span>
    </div>
  );
}
