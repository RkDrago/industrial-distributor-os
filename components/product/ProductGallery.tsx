"use client";

import { useEffect, useState } from "react";
import { ProductImage } from "./ProductImage";

/**
 * Product gallery.
 *
 * Thumbnails are real buttons so the gallery is keyboard operable, and when a
 * product has no images the placeholder is shown once instead of an empty strip.
 */
export function ProductGallery({ images, title }: { images?: string[]; title: string }) {
  const list = (images ?? []).filter(Boolean);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (active > list.length - 1) setActive(0);
  }, [list.length, active]);

  return (
    <div>
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <ProductImage
          src={list[active]}
          alt={`${title} — image ${list.length ? active + 1 : 0} of ${list.length}`}
          className="aspect-[4/3] w-full"
          priority
          sizes="(max-width: 1024px) 100vw, 560px"
        />
      </div>

      {list.length > 1 && (
        <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1" role="group" aria-label="Product images">
          {list.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-current={index === active ? "true" : undefined}
              aria-label={`Show image ${index + 1} of ${list.length}`}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-chip border-2 transition ${
                index === active ? "border-brand-500" : "border-line hover:border-lineStrong"
              }`}
            >
              <ProductImage src={image} alt="" className="h-full w-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
