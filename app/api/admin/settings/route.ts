import { requireAdmin } from "@/lib/auth";
import { fail, isSameOrigin, ok, serverError } from "@/lib/http";
import { getCommerceSettings, saveCommerceSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Operational settings: delivery charges and stock thresholds. */
export async function GET() {
  const denied = requireAdmin();
  if (denied) return denied;
  try {
    return ok({ settings: await getCommerceSettings() });
  } catch (error) {
    return serverError("api/admin/settings:GET", error);
  }
}

export async function PUT(req: Request) {
  const denied = requireAdmin();
  if (denied) return denied;
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site submissions are not allowed.", 403);

  try {
    const body = await req.json().catch(() => null);
    const number = (value: unknown, label: string) => {
      if (value === "" || value === null || value === undefined) return 0;
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) throw new Error(`${label} must be zero or more.`);
      if (n > 10_000_000) throw new Error(`${label} is unrealistically high.`);
      return n;
    };

    try {
      const settings = {
        deliveryCharge: number(body?.deliveryCharge, "Delivery charge"),
        freeDeliveryThreshold: number(body?.freeDeliveryThreshold, "Free delivery threshold"),
        lowStockThreshold: Math.floor(number(body?.lowStockThreshold, "Low stock threshold")),
      };
      const saved = await saveCommerceSettings(settings);
      return ok({ ok: true, settings: saved });
    } catch (validationError) {
      return fail(validationError instanceof Error ? validationError.message : "Invalid settings.", 422);
    }
  } catch (error) {
    return serverError("api/admin/settings:PUT", error);
  }
}
