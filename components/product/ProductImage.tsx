"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

/**
 * Product image.
 *
 * Catalogue images (including URLs an administrator pastes in) are rendered as
 * plain <img> so any host works without a build-time allow list, and a broken
 * or missing URL degrades to a neutral placeholder instead of a layout break.
 */
export function ProductImage({
  src,
  alt,
  className = "",
  imgClassName = "",
  priority = false,
  sizes,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  return (
    // Positioning is left to the caller: passing both `relative` and `absolute`
    // here would let whichever Tailwind emits last win unpredictably.
    <span className={`block overflow-hidden bg-navy-50 ${className}`}>
      {showFallback ? (
        <span className="flex h-full min-h-[96px] w-full flex-col items-center justify-center gap-1.5 text-navy-300">
          <ImageIcon size={26} aria-hidden="true" />
          <span className="text-[10px] font-medium uppercase tracking-wider">No image</span>
        </span>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src as string}
          alt={alt}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover ${imgClassName}`}
        />
      )}
    </span>
  );
}
