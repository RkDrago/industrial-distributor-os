"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCart, type CartItem } from "@/components/cart/CartProvider";
import { computeTotals, lineBreakdown } from "./pricing";
import type { PricedCartLineDto } from "./types";

export type CartPricingIssue = { productId: string; code: string; message: string };

type PricedCart = {
  lines: PricedCartLineDto[];
  totals: { subtotal: number; gstTotal: number; deliveryCharge: number; grandTotal: number };
  issues: CartPricingIssue[];
  /** True when the figures come from the server rather than a local preview. */
  authoritative: boolean;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/**
 * Prices the basket against the server.
 *
 * Renders a local preview immediately so the page is never blank, then replaces
 * it with the server's figures. Anything the server rejects (MOQ, stock,
 * withdrawn product) is surfaced rather than silently charged.
 */
export function usePricedCart(): PricedCart {
  const { items, hydrated } = useCart();
  const [server, setServer] = useState<{
    lines: PricedCartLineDto[];
    totals: { subtotal: number; gstTotal: number; deliveryCharge: number; grandTotal: number };
    issues: CartPricingIssue[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const signature = useMemo(
    () => items.map((i) => `${i.productId}:${i.qty}`).sort().join("|"),
    [items]
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!items.length) {
      setServer(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    fetch("/api/cart/price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items.map((i) => ({ productId: i.productId, qty: i.qty })) }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("pricing failed");
        return response.json();
      })
      .then((data) => {
        setServer({
          lines: Array.isArray(data.lines) ? data.lines : [],
          totals: data.totals ?? { subtotal: 0, gstTotal: 0, deliveryCharge: 0, grandTotal: 0 },
          issues: Array.isArray(data.issues) ? data.issues : [],
        });
        setError(null);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setServer(null);
        setError("We could not confirm live pricing. The totals below are an estimate.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [signature, hydrated, nonce, items.length]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  // Local fallback so the page renders instantly and still works if the
  // pricing endpoint is briefly unavailable.
  const previewLines = useMemo(
    () =>
      items.map((item) => {
        const breakdown = lineBreakdown(
          { price: { distributorPrice: item.distributorPrice, bulkSlabs: item.bulkSlabs }, gstPercent: item.gstPercent },
          item.qty
        );
        return {
          productId: item.productId,
          title: item.title,
          sku: item.sku,
          hsnCode: item.hsnCode,
          unit: item.unit,
          qty: item.qty,
          price: breakdown.unitPrice,
          gstPercent: breakdown.gstPercent,
          gst: breakdown.gstAmount,
          lineTotal: breakdown.taxable,
          image: item.image,
          slug: item.slug,
          moq: item.moq,
          stock: item.stock,
          unitPrice: breakdown.unitPrice,
          taxable: breakdown.taxable,
          total: breakdown.total,
          nextSlab: breakdown.nextSlab,
        } as PricedCartLineDto;
      }),
    [items]
  );

  const lines = server?.lines ?? previewLines;
  const totals = server ? server.totals : computeTotals(previewLines, null);

  return {
    lines,
    totals,
    issues: server?.issues ?? [],
    authoritative: Boolean(server),
    loading,
    error,
    reload,
  };
}

/** Look up a cart item by product id, used for qty limits in the cart table. */
export function findCartItem(items: CartItem[], productId: string) {
  return items.find((i) => i.productId === productId);
}
