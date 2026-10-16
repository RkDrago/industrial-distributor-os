"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";

/**
 * Renders the filter panel exactly once.
 *
 * On desktop the panel is the left sidebar. Below `lg` the very same markup is
 * repositioned as a full-screen sheet, which avoids duplicating form controls
 * (and their element ids) or shipping a second copy of the filters.
 */
export function CatalogueFiltersPanel({
  children,
  activeCount,
  resultCount,
}: {
  children: ReactNode;
  activeCount: number;
  resultCount: number;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-outline btn-block lg:hidden"
        aria-expanded={open}
        aria-controls="catalogue-filter-panel"
      >
        <SlidersHorizontal size={16} />
        <span>Filters{activeCount > 0 ? ` (${activeCount})` : ""}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] bg-canvas animate-fadeIn lg:hidden">
          <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-navy-900">Filters</p>
              <p className="text-xs text-muted">{resultCount} matching products</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn btn-ghost !min-h-9 !px-2"
              aria-label="Close filters"
            >
              <X size={18} />
            </button>
          </div>
          <div className="h-[calc(100%-64px)] overflow-y-auto p-4 pb-24">
            {children}
            <button type="button" onClick={() => setOpen(false)} className="btn btn-navy btn-block mt-5">
              Show {resultCount} product{resultCount === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      )}

      <div id="catalogue-filter-panel" className="hidden lg:block">
        {children}
      </div>
    </>
  );
}
