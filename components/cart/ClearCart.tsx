"use client";

import { useEffect } from "react";
import { useCart } from "./CartProvider";

/** Empties the basket after a successful order. Renders nothing. */
export function ClearCart() {
  const { clear, hydrated, items } = useCart();

  useEffect(() => {
    if (hydrated && items.length > 0) clear();
  }, [hydrated, items.length, clear]);

  return null;
}
