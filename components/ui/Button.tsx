import Link from "next/link";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "navy" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "btn-primary",
  navy: "btn-navy",
  outline: "btn-outline",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

const SIZES: Record<Size, string> = { sm: "btn-sm", md: "", lg: "btn-lg" };

function classes(variant: Variant, size: Size, block: boolean, className?: string) {
  return ["btn", VARIANTS[variant], SIZES[size], block ? "btn-block" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    block = false,
    loading = false,
    loadingLabel,
    icon,
    iconRight,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={classes(variant, size, block, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
      {!loading && iconRight}
    </button>
  );
});

export type ButtonLinkProps = {
  href: string;
  variant?: Variant;
  size?: Size;
  block?: boolean;
  className?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
  children: ReactNode;
  prefetch?: boolean;
  target?: string;
  rel?: string;
  "aria-label"?: string;
};

/** Same visual contract as Button, but renders a real navigation link. */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  block = false,
  className,
  icon,
  iconRight,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link href={href} className={classes(variant, size, block, className)} {...rest}>
      {icon}
      <span>{children}</span>
      {iconRight}
    </Link>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-[spinSlow_.7s_linear_infinite]`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
