/**
 * Browser-side storage for things that legitimately belong to this device.
 *
 * Checkout is guest-based (there is no customer session), so the basket,
 * the buyer's own invoice details and their saved delivery addresses live
 * locally and are used purely to prefill forms. Nothing here is treated as
 * authoritative by the server.
 */

export const STORAGE_KEYS = {
  cart: "ngz.cart.v1",
  company: "ngz.company.v1",
  addresses: "ngz.addresses.v1",
  recentOrders: "ngz.recent-orders.v1",
} as const;

export type CompanyProfile = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  gstin: string;
};

export type SavedAddress = {
  id: string;
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
};

export type RecentOrder = {
  orderNumber: string;
  id: string;
  total: number;
  itemCount: number;
  at: string;
  email: string;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — non-fatal */
  }
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* ------------------------------------------------------------- company */
export const EMPTY_COMPANY: CompanyProfile = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  gstin: "",
};

export function loadCompany(): CompanyProfile {
  return { ...EMPTY_COMPANY, ...read<Partial<CompanyProfile>>(STORAGE_KEYS.company, {}) };
}

export function saveCompany(profile: CompanyProfile): void {
  write(STORAGE_KEYS.company, profile);
}

/* ----------------------------------------------------------- addresses */
export function loadAddresses(): SavedAddress[] {
  const list = read<SavedAddress[]>(STORAGE_KEYS.addresses, []);
  return Array.isArray(list) ? list.filter((a) => a && a.id) : [];
}

export function saveAddress(address: SavedAddress): SavedAddress[] {
  const list = loadAddresses();
  const index = list.findIndex((a) => a.id === address.id);
  const next = index >= 0 ? list.map((a, i) => (i === index ? address : a)) : [...list, address];
  write(STORAGE_KEYS.addresses, next);
  return next;
}

export function removeAddress(id: string): SavedAddress[] {
  const next = loadAddresses().filter((a) => a.id !== id);
  write(STORAGE_KEYS.addresses, next);
  return next;
}

/* -------------------------------------------------------- recent orders */
export function loadRecentOrders(): RecentOrder[] {
  const list = read<RecentOrder[]>(STORAGE_KEYS.recentOrders, []);
  return Array.isArray(list) ? list : [];
}

export function rememberOrder(order: RecentOrder): void {
  const list = loadRecentOrders().filter((o) => o.orderNumber !== order.orderNumber);
  write(STORAGE_KEYS.recentOrders, [order, ...list].slice(0, 20));
}

export function forgetOrder(orderNumber: string): void {
  write(
    STORAGE_KEYS.recentOrders,
    loadRecentOrders().filter((o) => o.orderNumber !== orderNumber)
  );
}

export function clearLocalData(): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEYS.company);
    window.localStorage.removeItem(STORAGE_KEYS.addresses);
    window.localStorage.removeItem(STORAGE_KEYS.recentOrders);
  } catch {
    /* ignore */
  }
}
