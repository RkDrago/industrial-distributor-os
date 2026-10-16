"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowUpDown } from "lucide-react";
import { SORT_OPTIONS, buildCatalogueHref } from "@/lib/catalogue-params";

/** Changing the sort rewrites the URL so the result set stays shareable. */
export function SortSelect({
  current,
  value,
}: {
  current: Record<string, string | string[] | undefined>;
  value: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown size={15} className="shrink-0 text-navy-400" aria-hidden="true" />
      <label className="sr-only" htmlFor="catalogue-sort">
        Sort products by
      </label>
      <select
        id="catalogue-sort"
        value={value}
        disabled={pending}
        onChange={(event) => {
          const href = buildCatalogueHref(current, { sort: event.target.value });
          startTransition(() => router.push(href));
        }}
        className="field !min-h-10 !w-auto text-sm"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {pending && <span className="text-xs text-muted">Updating…</span>}
    </div>
  );
}
