import { connectDB } from "./db";
import { AdminState, DEFAULT_SETTINGS } from "@/models/AdminState";

export type CommerceSettings = {
  deliveryCharge: number;
  freeDeliveryThreshold: number;
  lowStockThreshold: number;
};

const COMMERCE_KEY = "commerce";
const NOTIFICATIONS_KEY = "notifications";

function normalise(value: unknown): CommerceSettings {
  const v = (value ?? {}) as Partial<CommerceSettings>;
  const num = (input: unknown, fallback: number) => {
    const n = Number(input);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  return {
    deliveryCharge: num(v.deliveryCharge, DEFAULT_SETTINGS.deliveryCharge),
    freeDeliveryThreshold: num(v.freeDeliveryThreshold, DEFAULT_SETTINGS.freeDeliveryThreshold),
    lowStockThreshold: num(v.lowStockThreshold, DEFAULT_SETTINGS.lowStockThreshold),
  };
}

/**
 * Delivery charges and stock thresholds are configuration, never assumptions.
 * Unset values are zero, so the storefront never invents a shipping fee.
 */
export async function getCommerceSettings(): Promise<CommerceSettings> {
  try {
    await connectDB();
    const doc = await AdminState.findOne({ key: COMMERCE_KEY }).lean<any>();
    return normalise(doc?.value);
  } catch (error) {
    console.error("[settings] unable to read commerce settings", error);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveCommerceSettings(input: Partial<CommerceSettings>): Promise<CommerceSettings> {
  const next = normalise(input);
  await connectDB();
  await AdminState.findOneAndUpdate(
    { key: COMMERCE_KEY },
    { $set: { key: COMMERCE_KEY, value: next } },
    { upsert: true, new: true }
  );
  return next;
}

export async function getNotificationState(): Promise<{ lastSeenAt: Date | null }> {
  try {
    await connectDB();
    const doc = await AdminState.findOne({ key: NOTIFICATIONS_KEY }).lean<any>();
    const lastSeenAt = doc?.lastSeenAt ? new Date(doc.lastSeenAt) : null;
    return { lastSeenAt: lastSeenAt && !Number.isNaN(lastSeenAt.getTime()) ? lastSeenAt : null };
  } catch (error) {
    console.error("[settings] unable to read notification state", error);
    return { lastSeenAt: null };
  }
}

export async function markNotificationsSeen(at: Date = new Date()): Promise<void> {
  await connectDB();
  await AdminState.findOneAndUpdate(
    { key: NOTIFICATIONS_KEY },
    { $set: { key: NOTIFICATIONS_KEY, lastSeenAt: at } },
    { upsert: true, new: true }
  );
}
