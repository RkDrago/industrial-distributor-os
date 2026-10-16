"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { STORAGE_KEYS } from "@/lib/local-store";
import { computeTotals, lineBreakdown, type BulkSlab } from "@/lib/pricing";

/**
 * The basket is held on the device (there is no customer account) and only ever
 * carries *display* data plus the requested quantity. Every price it shows is a
 * preview: the cart, checkout and order APIs all recompute the real figures
 * from the product record on the server.
 */

export type CartItem = {
  productId: string;
  slug: string;
  title: string;
  sku: string;
  hsnCode?: string;
  unit?: string;
  image?: string;
  moq: number;
  stock: number;
  gstPercent: number;
  distributorPrice: number;
  bulkSlabs: BulkSlab[];
  qty: number;
};

type Action =
  | { type: "hydrate"; items: CartItem[] }
  | { type: "add"; item: Omit<CartItem, "qty">; qty: number }
  | { type: "setQty"; productId: string; qty: number }
  | { type: "remove"; productId: string }
  | { type: "clear" };

export const MAX_LINE_QTY = 100000;
const MIN_QTY = 1;

function clampQty(qty: number, moq: number, stock: number): number {
  const floor = Math.max(MIN_QTY, Number.isFinite(moq) && moq > 0 ? moq : MIN_QTY);
  let next = Math.floor(Number(qty));
  if (!Number.isFinite(next)) next = floor;
  next = Math.min(Math.max(next, floor), MAX_LINE_QTY);
  // Never offer more than stock when stock is known.
  if (Number.isFinite(stock) && stock > 0 && next > stock) next = Math.max(floor, stock);
  return next;
}

function reducer(state: CartItem[], action: Action): CartItem[] {
  switch (action.type) {
    case "hydrate":
      return action.items;
    case "add": {
      const existing = state.find((i) => i.productId === action.item.productId);
      if (existing) {
        return state.map((i) =>
          i.productId === action.item.productId
            ? { ...i, ...action.item, qty: clampQty(i.qty + action.qty, action.item.moq, action.item.stock) }
            : i
        );
      }
      return [...state, { ...action.item, qty: clampQty(action.qty, action.item.moq, action.item.stock) }];
    }
    case "setQty":
      return state.map((i) =>
        i.productId === action.productId ? { ...i, qty: clampQty(action.qty, i.moq, i.stock) } : i
      );
    case "remove":
      return state.filter((i) => i.productId !== action.productId);
    case "clear":
      return [];
    default:
      return state;
  }
}

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  count: number;
  /** Distinct product count, used for copy like "3 products". */
  lineCount: number;
  preview: { subtotal: number; gstTotal: number; grandTotal: number };
  add: (item: Omit<CartItem, "qty">, qty: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(reducer, []);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.cart);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          dispatch({
            type: "hydrate",
            items: parsed
              .filter((i: any) => i && typeof i.productId === "string" && Number.isFinite(Number(i.qty)))
              .map((i: any) => ({
                ...i,
                moq: Number(i.moq) || 1,
                stock: Number(i.stock) || 0,
                gstPercent: Number(i.gstPercent) || 18,
                distributorPrice: Number(i.distributorPrice) || 0,
                bulkSlabs: Array.isArray(i.bulkSlabs) ? i.bulkSlabs : [],
                qty: clampQty(Number(i.qty), Number(i.moq) || 1, Number(i.stock) || 0),
              })),
          });
        }
      }
    } catch {
      /* corrupt storage is non-fatal */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(items));
    } catch {
      /* ignore quota errors */
    }
  }, [items, hydrated]);

  const preview = useMemo(() => {
    const lines = items.map((item) => {
      const b = lineBreakdown(
        { price: { distributorPrice: item.distributorPrice, bulkSlabs: item.bulkSlabs }, gstPercent: item.gstPercent },
        item.qty
      );
      return { gst: b.gstAmount, lineTotal: b.taxable } as any;
    });
    return computeTotals(lines, null);
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      hydrated,
      count: items.reduce((sum, i) => sum + i.qty, 0),
      lineCount: items.length,
      preview,
      add: (item, qty) => dispatch({ type: "add", item, qty }),
      setQty: (productId, qty) => dispatch({ type: "setQty", productId, qty }),
      remove: (productId) => dispatch({ type: "remove", productId }),
      clear: () => dispatch({ type: "clear" }),
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
    }),
    [items, hydrated, preview, isOpen]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}

/** Convenience hook for "Add to cart" buttons. */
export function useAddToCart() {
  const { add, openCart } = useCart();
  return useCallback(
    (item: Omit<CartItem, "qty">, qty: number, options?: { openDrawer?: boolean }) => {
      add(item, qty);
      if (options?.openDrawer !== false) openCart();
    },
    [add, openCart]
  );
}

/** Serialise a cart item for the pricing/order APIs. */
export function toOrderPayload(items: CartItem[]) {
  return items.map((i) => ({ productId: i.productId, qty: i.qty }));
}
