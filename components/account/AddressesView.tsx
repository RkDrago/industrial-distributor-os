"use client";

import { useEffect, useState } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/Toast";
import { Modal, ConfirmDialog } from "@/components/ui/Overlay";
import { loadAddresses, newId, removeAddress, saveAddress, type SavedAddress } from "@/lib/local-store";

type Draft = { id: string; label: string; line1: string; line2: string; city: string; state: string; pincode: string };

const EMPTY_DRAFT: Draft = { id: "", label: "Warehouse", line1: "", line2: "", city: "", state: "", pincode: "" };

/**
 * Saved delivery addresses.
 *
 * Held in this browser (checkout is guest-based) and used only to prefill the
 * checkout form — the server always re-validates the address that is submitted.
 */
export function AddressesView() {
  const { push } = useToast();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SavedAddress | null>(null);

  useEffect(() => {
    setAddresses(loadAddresses());
  }, []);

  function openNew() {
    setDraft({ ...EMPTY_DRAFT, id: newId() });
    setErrors({});
    setEditing(true);
  }

  function openEdit(address: SavedAddress) {
    setDraft({ ...address });
    setErrors({});
    setEditing(true);
  }

  function validate() {
    const next: Record<string, string> = {};
    if (draft.label.trim().length < 2) next.label = "Give this address a name, e.g. Warehouse or Site.";
    if (draft.line1.trim().length < 3) next.line1 = "Address line 1 is required.";
    if (draft.city.trim().length < 2) next.city = "City is required.";
    if (draft.state.trim().length < 2) next.state = "State is required.";
    if (!/^[0-9]{6}$/.test(draft.pincode.trim())) next.pincode = "Enter a 6-digit PIN code.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function save() {
    if (!validate()) return;
    setAddresses(
      saveAddress({
        id: draft.id,
        label: draft.label.trim(),
        line1: draft.line1.trim(),
        line2: draft.line2.trim(),
        city: draft.city.trim(),
        state: draft.state.trim(),
        pincode: draft.pincode.trim(),
      })
    );
    setEditing(false);
    push({ tone: "success", title: "Address saved", description: "It will be available at checkout." });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    setAddresses(removeAddress(pendingDelete.id));
    setPendingDelete(null);
    push({ tone: "info", title: "Address removed" });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-card border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-navy-900">Saved delivery addresses</h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              Stored in this browser so your warehouse and site addresses are one click away at checkout.
            </p>
          </div>
          <Button size="sm" icon={<Plus size={15} />} onClick={openNew}>
            Add address
          </Button>
        </div>
      </section>

      {addresses.length === 0 ? (
        <EmptyState
          icon={<MapPin size={22} />}
          title="No saved addresses"
          description="Add the addresses you order to most often. You can always enter a different one at checkout."
          action={
            <Button size="sm" icon={<Plus size={15} />} onClick={openNew}>
              Add your first address
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id} className="rounded-card border border-line bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-chip bg-brand-50 text-brand-600">
                    <MapPin size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{address.label}</p>
                    <address className="mt-1 text-xs not-italic leading-5 text-muted">
                      {address.line1}
                      {address.line2 ? <>, {address.line2}</> : null}
                      <br />
                      {address.city}, {address.state} {address.pincode}
                    </address>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2 border-t border-line pt-4">
                <button type="button" onClick={() => openEdit(address)} className="btn btn-outline btn-sm">
                  <Pencil size={14} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(address)}
                  className="btn btn-ghost btn-sm text-danger"
                >
                  <Trash2 size={14} />
                  <span>Remove</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Alert tone="info" title="How this is stored">
        Saved addresses live in this browser only. They are used to prefill the checkout form and are validated on the
        server when you place an order. Choose “Account settings” to clear them.
      </Alert>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title={draft.id && addresses.some((a) => a.id === draft.id) ? "Edit address" : "Add address"}
        description="Used to prefill the checkout form."
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={save}>
              Save address
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Address name"
              required
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              error={errors.label}
              placeholder="Warehouse, Site office, Head office"
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Address line 1"
              required
              value={draft.line1}
              onChange={(e) => setDraft({ ...draft, line1: e.target.value })}
              error={errors.line1}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Address line 2"
              optional
              value={draft.line2}
              onChange={(e) => setDraft({ ...draft, line2: e.target.value })}
            />
          </div>
          <Input
            label="City"
            required
            value={draft.city}
            onChange={(e) => setDraft({ ...draft, city: e.target.value })}
            error={errors.city}
          />
          <Input
            label="State"
            required
            value={draft.state}
            onChange={(e) => setDraft({ ...draft, state: e.target.value })}
            error={errors.state}
          />
          <Input
            label="PIN code"
            required
            inputMode="numeric"
            maxLength={6}
            value={draft.pincode}
            onChange={(e) => setDraft({ ...draft, pincode: e.target.value.replace(/[^\d]/g, "") })}
            error={errors.pincode}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Remove this address?"
        description={pendingDelete ? `${pendingDelete.label} — ${pendingDelete.line1}, ${pendingDelete.city}` : undefined}
        confirmLabel="Remove address"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
