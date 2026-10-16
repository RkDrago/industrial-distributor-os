"use client";

import { useEffect, useState } from "react";
import { IndianRupee, PackageCheck, RefreshCw, Save, Truck } from "lucide-react";
import { AdminPanel, DefinitionNote } from "./ui";
import { Alert, InlineLoading } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/Toast";
import { formatINR, formatNumber } from "@/lib/format";

type Settings = {
  deliveryCharge: number;
  freeDeliveryThreshold: number;
  lowStockThreshold: number;
};

/**
 * Operational settings.
 *
 * These values are read by checkout and by inventory alerts, so the form states
 * exactly what each one changes. Nothing here is a guess: an unset value means
 * zero, which is why a fresh deployment never invents a delivery fee.
 */
export function SettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState({ deliveryCharge: "", freeDeliveryThreshold: "", lowStockThreshold: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { push } = useToast();

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/settings", { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      const data = await response.json();
      const incoming: Settings = {
        deliveryCharge: Number(data?.settings?.deliveryCharge) || 0,
        freeDeliveryThreshold: Number(data?.settings?.freeDeliveryThreshold) || 0,
        lowStockThreshold: Number(data?.settings?.lowStockThreshold) || 0,
      };
      setSettings(incoming);
      setDraft({
        deliveryCharge: String(incoming.deliveryCharge),
        freeDeliveryThreshold: String(incoming.freeDeliveryThreshold),
        lowStockThreshold: String(incoming.lowStockThreshold),
      });
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryCharge: draft.deliveryCharge === "" ? 0 : Number(draft.deliveryCharge),
          freeDeliveryThreshold: draft.freeDeliveryThreshold === "" ? 0 : Number(draft.freeDeliveryThreshold),
          lowStockThreshold: draft.lowStockThreshold === "" ? 0 : Number(draft.lowStockThreshold),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormError(typeof data?.error === "string" ? data.error : "The settings could not be saved.");
        return;
      }
      const saved: Settings = {
        deliveryCharge: Number(data?.settings?.deliveryCharge) || 0,
        freeDeliveryThreshold: Number(data?.settings?.freeDeliveryThreshold) || 0,
        lowStockThreshold: Number(data?.settings?.lowStockThreshold) || 0,
      };
      setSettings(saved);
      setDraft({
        deliveryCharge: String(saved.deliveryCharge),
        freeDeliveryThreshold: String(saved.freeDeliveryThreshold),
        lowStockThreshold: String(saved.lowStockThreshold),
      });
      push({
        tone: "success",
        title: "Settings saved",
        description: "Checkout, inventory alerts and the catalogue now use these values.",
      });
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <InlineLoading label="Loading settings…" />;

  if (error || !settings) {
    return (
      <Alert
        tone="danger"
        title="Settings could not be loaded"
        action={
          <Button size="sm" variant="outline" onClick={load} icon={<RefreshCw size={15} />}>
            Try again
          </Button>
        }
      >
        The request failed. Check that the database is reachable.
      </Alert>
    );
  }

  return (
    <form onSubmit={save} className="space-y-5" noValidate>
      <AdminPanel
        title="Delivery and stock thresholds"
        description="Applied immediately to new orders and to the inventory alerts below."
      >
        <div className="grid gap-5 p-5 lg:grid-cols-3">
          <div className="space-y-3">
            <Input
              label="Delivery charge"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={draft.deliveryCharge}
              onChange={(event) => setDraft((d) => ({ ...d, deliveryCharge: event.target.value }))}
              hint="Added to order totals before GST. Enter 0 for no delivery charge."
            />
            <p className="flex items-start gap-2 rounded-chip bg-canvas px-3 py-2 text-xs leading-5 text-muted">
              <Truck size={14} className="mt-0.5 shrink-0" />
              <span>Currently {formatINR(settings.deliveryCharge)} per order.</span>
            </p>
          </div>

          <div className="space-y-3">
            <Input
              label="Free delivery above"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={draft.freeDeliveryThreshold}
              onChange={(event) => setDraft((d) => ({ ...d, freeDeliveryThreshold: event.target.value }))}
              hint="Order subtotal from which delivery is waived. Enter 0 to never waive it."
            />
            <p className="flex items-start gap-2 rounded-chip bg-canvas px-3 py-2 text-xs leading-5 text-muted">
              <IndianRupee size={14} className="mt-0.5 shrink-0" />
              <span>
                {settings.freeDeliveryThreshold > 0
                  ? `Orders of ${formatINR(settings.freeDeliveryThreshold)} or more ship free.`
                  : "Delivery is always charged at the rate above."}
              </span>
            </p>
          </div>

          <div className="space-y-3">
            <Input
              label="Low stock threshold"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={draft.lowStockThreshold}
              onChange={(event) => setDraft((d) => ({ ...d, lowStockThreshold: event.target.value }))}
              hint="Items at or below this count appear in inventory alerts."
            />
            <p className="flex items-start gap-2 rounded-chip bg-canvas px-3 py-2 text-xs leading-5 text-muted">
              <PackageCheck size={14} className="mt-0.5 shrink-0" />
              <span>Flagging anything with {formatNumber(settings.lowStockThreshold)} units or fewer.</span>
            </p>
          </div>
        </div>

        <div className="border-t border-line p-5">
          {formError && (
            <Alert tone="danger" className="mb-4" title="Could not save">
              {formError}
            </Alert>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DefinitionNote>
              Delivery charges and thresholds are configuration, so the storefront never assumes a shipping fee. Setting a
              charge to 0 removes it from every new order total.
            </DefinitionNote>
            <Button type="submit" loading={saving} loadingLabel="Saving…" icon={<Save size={16} />}>
              Save settings
            </Button>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel title="Locale and tax" description="Fixed by the way this deployment is built.">
        <dl className="divide-y divide-line">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
            <dt className="text-sm text-navy-800">Currency</dt>
            <dd className="text-sm text-muted">Indian Rupee (₹), two decimal places</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
            <dt className="text-sm text-navy-800">GST</dt>
            <dd className="text-sm text-muted">Per product, calculated server-side on every order line</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
            <dt className="text-sm text-navy-800">HSN codes</dt>
            <dd className="text-sm text-muted">Stored on each product and printed on invoices</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
            <dt className="text-sm text-navy-800">Payment capture</dt>
            <dd className="text-sm text-muted">Not enabled — orders are collected as enquiries or bank transfer</dd>
          </div>
        </dl>
      </AdminPanel>
    </form>
  );
}
