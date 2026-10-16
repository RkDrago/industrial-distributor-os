import Link from "next/link";
import { Hexagon } from "lucide-react";

export function BrandMark({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-chip bg-brand-500 text-white ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Hexagon size={size * 0.58} strokeWidth={2.4} />
    </span>
  );
}

export function BrandLockup({
  tone = "dark",
  subtitle = "Industrial Supply",
  href = "/",
  compact = false,
}: {
  tone?: "dark" | "light";
  subtitle?: string | null;
  href?: string;
  compact?: boolean;
}) {
  const text = tone === "light" ? "text-white" : "text-navy-900";
  const sub = tone === "light" ? "text-navy-300" : "text-muted";

  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="Norgez Industrial — home">
      <BrandMark size={compact ? 30 : 34} />
      <span className="leading-none">
        <span className={`block text-[17px] font-bold tracking-[-0.01em] ${text}`}>Norgez</span>
        {subtitle && (
          <span className={`mt-0.5 block text-[10px] font-medium uppercase tracking-[0.14em] ${sub}`}>
            {subtitle}
          </span>
        )}
      </span>
    </Link>
  );
}
