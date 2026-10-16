"use client";

import { useEffect, useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { formatQty } from "@/lib/format";

/**
 * Quantity control.
 *
 * Typing is never silently rewritten while the field is focused, and the value
 * is clamped to the product's minimum order quantity and available stock on
 * blur, so a customer cannot submit a quantity the server will reject.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  step = 1,
  size = "md",
  disabled = false,
  label = "Quantity",
  showBounds = true,
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: "sm" | "md";
  disabled?: boolean;
  label?: string;
  showBounds?: boolean;
  className?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const floor = Math.max(1, Number(min) || 1);
  const ceiling = Number.isFinite(max) && (max as number) > 0 ? Math.max(floor, max as number) : Infinity;

  function clamp(next: number) {
    if (!Number.isFinite(next)) return floor;
    return Math.min(Math.max(Math.floor(next), floor), ceiling);
  }

  function commit(raw: string) {
    const parsed = Number(raw);
    const next = clamp(Number.isFinite(parsed) && raw.trim() !== "" ? parsed : value);
    setDraft(String(next));
    if (next !== value) onChange(next);
  }

  const height = size === "sm" ? "h-9" : "h-11";
  const buttonWidth = size === "sm" ? "w-9" : "w-11";
  const iconSize = size === "sm" ? 14 : 16;

  return (
    <div className={className}>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <div
        className={`inline-flex ${height} items-stretch overflow-hidden rounded-control border border-lineStrong bg-surface`}
      >
        <button
          type="button"
          onClick={() => commit(String(value - step))}
          disabled={disabled || value <= floor}
          className={`grid ${buttonWidth} place-items-center text-navy-600 transition hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-40`}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          <Minus size={iconSize} />
        </button>
        <input
          id={id}
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit((e.target as HTMLInputElement).value);
            }
          }}
          className={`w-14 border-x border-lineStrong bg-transparent text-center text-sm font-semibold tabular-nums text-navy-900 outline-none focus:bg-brand-50 disabled:bg-navy-50`}
          aria-label={label}
          aria-describedby={showBounds ? `${id}-bounds` : undefined}
        />
        <button
          type="button"
          onClick={() => commit(String(value + step))}
          disabled={disabled || value >= ceiling}
          className={`grid ${buttonWidth} place-items-center text-navy-600 transition hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-40`}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          <Plus size={iconSize} />
        </button>
      </div>
      {showBounds && (
        <p className="mt-1.5 text-[11px] leading-4 text-muted" id={`${id}-bounds`}>
          {Number.isFinite(ceiling) ? `Min ${formatQty(floor)} · up to ${formatQty(ceiling as number)} in stock` : `Min ${formatQty(floor)}`}
        </p>
      )}
    </div>
  );
}
