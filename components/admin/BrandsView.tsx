"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Contact, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { AdminPanel } from "./ui";
import { Button } from "@/components/ui/Button";
import { Alert, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/Overlay";
import { useToast } from "@/components/ui/Toast";
import { formatNumber } from "@/lib/format";
import type { BrandDto } from "@/lib/types";

/**
 * Brands and manufacturers.
 *
 * A brand that products still reference cannot be deleted — the server refuses
 * and says how many products are in the way, so the catalogue cannot be left
 * with dangling references.
 */
export function BrandsView() {
  const [items, setItems] = useState<BrandDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<BrandDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", logo: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<BrandDto | null>(null);
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/brands", { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      const data = await response.json();
      setItems(Array.isArray(data.items) ? data.items : []);
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

  function openCreate() {
    setDraft({ name: "", logo: "" });
    setFormError(null);
    setCreating(true);
  }

  function openEdit(brand: BrandDto) {
    setDraft({ name: brand.name, logo: brand.logo ?? "" });
    setFormError(null);
    setEditing(brand);
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setFormError(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const response = await fetch(editing ? `/api/brands/${editing._id}` : "/api/brands", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormError(typeof data?.error === "string" ? data.error : "The brand could not be saved.");
        return;
      }
      push({ tone: "success", title: editing ? "Brand updated" : `Brand “${draft.name}” created` });
      closeForm();
      await load();
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(brand: BrandDto) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/brands/${brand._id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        push({
          tone: "warning",
          title: "Brand kept",
          description: typeof data?.error === "string" ? data.error : "Products still use this brand.",
        });
        return;
      }
      push({ tone: "success", title: `${brand.name} deleted` });
      await load();
    } catch {
      push({ tone: "error", title: "Could not reach the server" });
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-5">
      {error ? (
        <ErrorState
          title="Brands could not be loaded"
          description="The request failed. Check that the database is reachable and try again."
          onRetry={load}
        />
      ) : (
        <AdminPanel
          title={`Brands (${formatNumber(items.length)})`}
          description="Manufacturers and trade names customers recognise. Only brands with products appear in the storefront trust strip."
          actions={
            <>
              <Button size="sm" variant="outline" onClick={load} loading={loading} icon={<RefreshCw size={15} />}>
                Refresh
              </Button>
              <Button size="sm" onClick={openCreate} icon={<Plus size={15} />}>
                New brand
              </Button>
            </>
          }
        >
          {loading && items.length === 0 ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-navy-50 text-navy-400">
                <Contact size={20} />
              </span>
              <p className="mt-3 text-sm font-semibold text-navy-900">No brands yet</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted">
                Add the manufacturers you stock, then assign them to products.
              </p>
              <Button className="mt-4" onClick={openCreate} icon={<Plus size={16} />}>
                New brand
              </Button>
            </div>
          ) : (
            <>
              <div className="table-wrap hidden lg:block">
                <table className="table">
                  <caption className="sr-only">Product brands</caption>
                  <thead>
                    <tr>
                      <th scope="col">Brand</th>
                      <th scope="col">Web address</th>
                      <th scope="col">Products</th>
                      <th scope="col" className="text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((brand) => (
                      <tr key={brand._id}>
                        <td>
                          <p className="font-medium text-navy-900">{brand.name}</p>
                          {brand.logo && <p className="truncate text-xs text-muted">{brand.logo}</p>}
                        </td>
                        <td className="text-navy-800">/products?brand={brand.slug}</td>
                        <td className="tabular-nums">{formatNumber(brand.productCount ?? 0)}</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/admin/products?brand=${encodeURIComponent(brand.slug)}`} className="btn btn-ghost btn-sm">
                              Products
                            </Link>
                            <Button size="sm" variant="outline" onClick={() => openEdit(brand)} icon={<Pencil size={14} />}>
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRemoving(brand)}
                              aria-label={`Delete ${brand.name}`}
                              icon={<Trash2 size={14} />}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-line lg:hidden">
                {items.map((brand) => (
                  <li key={brand._id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy-900">{brand.name}</p>
                      <p className="mt-0.5 text-xs text-muted">{formatNumber(brand.productCount ?? 0)} products</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(brand)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRemoving(brand)}>
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </AdminPanel>
      )}

      <Modal
        open={creating || Boolean(editing)}
        onClose={closeForm}
        title={editing ? `Edit ${editing.name}` : "New brand"}
        description="Brands are shown on product pages and can be used as a catalogue filter."
        size="sm"
      >
        <form onSubmit={save} className="space-y-5" noValidate>
          {formError && (
            <Alert tone="danger" title="Could not save">
              {formError}
            </Alert>
          )}

          <Input
            label="Brand name"
            value={draft.name}
            onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
            placeholder="Nordkraft"
            required
          />

          <Input
            label="Logo URL"
            value={draft.logo}
            onChange={(event) => setDraft((d) => ({ ...d, logo: event.target.value }))}
            placeholder="https://…"
            optional
          />

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
            <Button variant="outline" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} loadingLabel="Saving…">
              {editing ? "Save brand" : "Create brand"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(removing)}
        busy={busy}
        title={`Delete ${removing?.name ?? "this brand"}?`}
        description={
          removing?.productCount
            ? `${removing.productCount} products still use this brand, so deleting will be refused. Reassign them first.`
            : "No products use this brand, so it will be removed permanently."
        }
        confirmLabel="Delete brand"
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && remove(removing)}
      />
    </div>
  );
}
