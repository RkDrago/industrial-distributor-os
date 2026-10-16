"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Archive, Pencil, Plus, RefreshCw, Tags, Trash2 } from "lucide-react";
import { AdminPanel } from "./ui";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Checkbox, Input, Textarea } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/Overlay";
import { useToast } from "@/components/ui/Toast";
import { formatNumber } from "@/lib/format";
import type { CategoryDto } from "@/lib/types";

type Draft = {
  name: string;
  description: string;
  image: string;
  isActive: boolean;
};

const EMPTY: Draft = { name: "", description: "", image: "", isActive: true };

/**
 * Product categories.
 *
 * Deleting a category that products still reference is refused by the server and
 * the category is hidden instead, so no product silently loses its place in the
 * catalogue. The confirmation copy here says that up front.
 */
export function CategoriesView() {
  const [items, setItems] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<CategoryDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<CategoryDto | null>(null);
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/categories?includeInactive=1", { cache: "no-store" });
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
    setDraft(EMPTY);
    setFormError(null);
    setCreating(true);
  }

  function openEdit(category: CategoryDto) {
    setDraft({
      name: category.name,
      description: category.description ?? "",
      image: category.image ?? "",
      isActive: category.isActive !== false,
    });
    setFormError(null);
    setEditing(category);
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
    const target = editing ? `/api/categories/${editing._id}` : "/api/categories";
    try {
      const response = await fetch(target, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormError(typeof data?.error === "string" ? data.error : "The category could not be saved.");
        return;
      }
      push({ tone: "success", title: editing ? "Category updated" : `Category “${draft.name}” created` });
      closeForm();
      await load();
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function archive(category: CategoryDto) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/categories/${category._id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        push({ tone: "error", title: "Could not archive", description: data?.error ?? "Please try again." });
        return;
      }
      push({
        tone: "success",
        title: `${category.name} hidden`,
        description: "Products stay assigned to it; it no longer appears as a filter or on the storefront.",
      });
      await load();
    } catch {
      push({ tone: "error", title: "Could not reach the server" });
    } finally {
      setBusy(false);
    }
  }

  async function remove(category: CategoryDto) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/categories/${category._id}?mode=delete`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        push({
          tone: "warning",
          title: "Category kept",
          description: typeof data?.error === "string" ? data.error : "Products still use this category.",
        });
        await load();
        return;
      }
      push({ tone: "success", title: `${category.name} deleted` });
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
          title="Categories could not be loaded"
          description="The request failed. Check that the database is reachable and try again."
          onRetry={load}
        />
      ) : (
        <AdminPanel
          title={`Categories (${formatNumber(items.length)})`}
          description="Grouping customers browse by. Hidden categories keep their products but stop appearing on the storefront."
          actions={
            <>
              <Button size="sm" variant="outline" onClick={load} loading={loading} icon={<RefreshCw size={15} />}>
                Refresh
              </Button>
              <Button size="sm" onClick={openCreate} icon={<Plus size={15} />}>
                New category
              </Button>
            </>
          }
        >
          {loading && items.length === 0 ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-navy-50 text-navy-400">
                <Tags size={20} />
              </span>
              <p className="mt-3 text-sm font-semibold text-navy-900">No categories yet</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted">
                Create the first category, or run <code className="rounded bg-navy-50 px-1 py-0.5">npm run seed</code> to load the
                sample catalogue.
              </p>
              <Button className="mt-4" onClick={openCreate} icon={<Plus size={16} />}>
                New category
              </Button>
            </div>
          ) : (
            <>
              <div className="table-wrap hidden lg:block">
                <table className="table">
                  <caption className="sr-only">Product categories</caption>
                  <thead>
                    <tr>
                      <th scope="col">Category</th>
                      <th scope="col">Products</th>
                      <th scope="col">Stock</th>
                      <th scope="col">Visibility</th>
                      <th scope="col" className="text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((category) => (
                      <tr key={category._id}>
                        <td className="max-w-[320px]">
                          <p className="font-medium text-navy-900">{category.name}</p>
                          {category.description && (
                            <p className="truncate text-xs text-muted" title={category.description}>
                              {category.description}
                            </p>
                          )}
                        </td>
                        <td className="tabular-nums">{formatNumber(category.productCount ?? 0)}</td>
                        <td className="tabular-nums">{formatNumber(category.totalStock ?? 0)}</td>
                        <td>
                          {category.isActive === false ? <Badge tone="neutral">Hidden</Badge> : <Badge tone="success">Visible</Badge>}
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/admin/products?category=${encodeURIComponent(category.slug)}`}
                              className="btn btn-ghost btn-sm"
                            >
                              Products
                            </Link>
                            <Button size="sm" variant="outline" onClick={() => openEdit(category)} icon={<Pencil size={14} />}>
                              Edit
                            </Button>
                            {category.isActive === false ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEdit(category)}
                                aria-label={`Restore ${category.name}`}
                                icon={<Archive size={14} />}
                              >
                                Restore
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => archive(category)}
                                disabled={busy}
                                aria-label={`Hide ${category.name}`}
                                icon={<Archive size={14} />}
                              >
                                Hide
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRemoving(category)}
                              aria-label={`Delete ${category.name}`}
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
                {items.map((category) => (
                  <li key={category._id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy-900">{category.name}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatNumber(category.productCount ?? 0)} products · {formatNumber(category.totalStock ?? 0)} units
                        </p>
                      </div>
                      {category.isActive === false ? <Badge tone="neutral">Hidden</Badge> : <Badge tone="success">Visible</Badge>}
                    </div>
                    {category.description && <p className="mt-2 text-xs leading-5 text-muted">{category.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(category)}>
                        Edit
                      </Button>
                      {category.isActive === false ? (
                        <Button size="sm" variant="ghost" onClick={() => openEdit(category)}>
                          Restore
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => archive(category)} disabled={busy}>
                          Hide
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setRemoving(category)}>
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
        title={editing ? `Edit ${editing.name}` : "New category"}
        description="Categories group the catalogue on the storefront and in the filter panel."
        size="md"
      >
        <form onSubmit={save} className="space-y-5" noValidate>
          {formError && (
            <Alert tone="danger" title="Could not save">
              {formError}
            </Alert>
          )}

          <Input
            label="Category name"
            value={draft.name}
            onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
            placeholder="PPE & Safety"
            required
            hint="The web address is generated from the name."
          />

          <Textarea
            label="Description"
            rows={3}
            value={draft.description}
            onChange={(event) => setDraft((d) => ({ ...d, description: event.target.value }))}
            hint="Shown on the category page and the homepage card."
          />

          <Input
            label="Image URL"
            value={draft.image}
            onChange={(event) => setDraft((d) => ({ ...d, image: event.target.value }))}
            placeholder="https://…"
            optional
            hint="Leave blank to use a neutral placeholder on the storefront."
          />

          <Checkbox
            label="Show this category on the storefront"
            checked={draft.isActive}
            onChange={(event) => setDraft((d) => ({ ...d, isActive: event.target.checked }))}
          />

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
            <Button variant="outline" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} loadingLabel="Saving…">
              {editing ? "Save category" : "Create category"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(removing)}
        busy={busy}
        title={`Delete ${removing?.name ?? "this category"}?`}
        description={
          removing?.productCount
            ? `${removing.productCount} products still use this category. Deleting is refused and the category is hidden instead, so nothing disappears from the catalogue by accident.`
            : "This category has no products, so it will be removed permanently."
        }
        confirmLabel="Delete category"
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && remove(removing)}
      />
    </div>
  );
}
