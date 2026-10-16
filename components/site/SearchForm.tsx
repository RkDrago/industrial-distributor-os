"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";

/**
 * Product search.
 *
 * Submitting navigates to the catalogue with the query in the URL, so results
 * stay shareable, back-button friendly and server rendered.
 */
export function SearchForm({
  variant = "header",
  initialValue,
  placeholder = "Search products, brands, or SKU...",
  className,
  ariaLabel = "Search products",
}: {
  variant?: "header" | "hero" | "inline";
  initialValue?: string;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue ?? "");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const query = value.trim();
    const next = new URLSearchParams();
    if (query) next.set("search", query);
    // Preserve an active category so search works inside a department. The
    // current URL is read at submit time rather than with useSearchParams,
    // which would force every page rendering the header into a Suspense
    // boundary just to be prerenderable.
    const category = new URLSearchParams(window.location.search).get("category");
    if (category) next.set("category", category);
    router.push(`/products${next.toString() ? `?${next.toString()}` : ""}`);
  }

  if (variant === "hero") {
    return (
      <form onSubmit={submit} className={`w-full ${className ?? ""}`} role="search" aria-label={ariaLabel}>
        <div className="flex flex-col gap-2 rounded-card border border-white/15 bg-white p-2 shadow-raised sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={19} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" aria-hidden="true" />
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              aria-label={ariaLabel}
              className="h-12 w-full rounded-control bg-transparent pl-11 pr-3 text-[15px] text-ink outline-none placeholder:text-navy-300"
            />
          </div>
          <button type="submit" className="btn btn-primary h-12 shrink-0 px-6">
            <Search size={17} />
            <span>Search</span>
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className={`relative ${className ?? ""}`} role="search" aria-label={ariaLabel}>
      <Search
        size={variant === "header" ? 17 : 18}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-300"
        aria-hidden="true"
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={`field ${variant === "header" ? "!min-h-10 pl-9 pr-9 text-sm" : "pl-10 pr-10"}`}
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-navy-300 hover:text-navy-600"
          aria-label="Clear search"
        >
          <X size={15} />
        </button>
      )}
    </form>
  );
}
