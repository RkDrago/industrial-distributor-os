import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

function pageWindow(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - (sorted[index - 1] as number) > 1) result.push("gap");
    result.push(page);
  });
  return result;
}

/**
 * Link-based pagination so catalogue pages stay server rendered, shareable
 * and crawlable. `buildHref` receives the target page number.
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
  className,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const items = pageWindow(page, totalPages);

  return (
    <nav className={`flex flex-wrap items-center justify-center gap-1.5 ${className ?? ""}`} aria-label="Pagination">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className="btn btn-outline btn-sm" rel="prev">
          <ChevronLeft size={16} />
          <span>Previous</span>
        </Link>
      ) : (
        <span className="btn btn-outline btn-sm" aria-disabled="true">
          <ChevronLeft size={16} />
          <span>Previous</span>
        </span>
      )}

      {items.map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="px-1.5 text-sm text-muted" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={buildHref(item)}
            aria-current={item === page ? "page" : undefined}
            className={`btn btn-sm !px-3 ${
              item === page ? "btn-navy" : "btn-outline"
            }`}
            aria-label={`Page ${item}`}
          >
            {item}
          </Link>
        )
      )}

      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className="btn btn-outline btn-sm" rel="next">
          <span>Next</span>
          <ChevronRight size={16} />
        </Link>
      ) : (
        <span className="btn btn-outline btn-sm" aria-disabled="true">
          <span>Next</span>
          <ChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}
