"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Plus, Trash2, Upload } from "lucide-react";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/form";
import type { BrandDto, CategoryDto, ProductDto } from "@/lib/types";

export type Slab = { minQty: string; price: string };
export type Spec = { key: string; value: string };

export type Draft = {
  title: string;
  sku: string;
  hsnCode: string;
  categoryId: string;
  brandId: string;
  unit: string;
  moq: string;
  stock: string;
  gstPercent: string;
  featured: boolean;
  isActive: boolean;
  mrp: string;
  distributorPrice: string;
  bulkSlabs: Slab[];
  shortDescription: string;
  description: string;
  specifications: Spec[];
  images: string[];
};

export const EMPTY_DRAFT: Draft = {
  title: "",
  sku: "",
  hsnCode: "",
  categoryId: "",
  brandId: "",
  unit: "per piece",
  moq: "1",
  stock: "0",
  gstPercent: "18",
  featured: false,
  isActive: true,
  mrp: "",
  distributorPrice: "",
  bulkSlabs: [],
  shortDescription: "",
  description: "",
  specifications: [],
  images: [],
};

/** Turn a stored product into the editable draft the form understands. */
export function productToDraft(product: ProductDto): Draft {
  return {
    title: product.title ?? "",
    sku: product.sku ?? "",
    hsnCode: product.hsnCode ?? "",
    categoryId: product.categoryId ?? "",
    brandId: product.brandId ?? "",
    unit: product.unit ?? "per piece",
    moq: String(product.moq ?? 1),
    stock: String(product.stock ?? 0),
    gstPercent: String(product.gstPercent ?? 18),
    featured: Boolean(product.featured),
    isActive: product.isActive !== false,
    mrp: product.price?.mrp ? String(product.price.mrp) : "",
    distributorPrice: product.price?.distributorPrice ? String(product.price.distributorPrice) : "",
    bulkSlabs: (product.price?.bulkSlabs ?? []).map((slab) => ({
      minQty: String(slab.minQty),
      price: String(slab.price),
    })),
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    specifications: (product.specifications ?? []).map((spec) => ({ key: spec.key ?? "", value: spec.value ?? "" })),
    images: Array.isArray(product.images) ? [...product.images] : [],
  };
}

export type ProductPayload = {
  title: string;
  sku: string;
  hsnCode: string;
  categoryId: string | null;
  brandId: string | null;
  unit: string;
  moq: number;
  stock: number;
  gstPercent: number;
  featured: boolean;
  isActive: boolean;
  price: { mrp: number; distributorPrice: number; bulkSlabs: { minQty: number; price: number }[] };
  shortDescription: string;
  description: string;
  specifications: { key: string; value: string }[];
  images: string[];
};

export function buildProductPayload(draft: Draft): ProductPayload {
  return {
    title: draft.title,
    sku: draft.sku,
    hsnCode: draft.hsnCode,
    categoryId: draft.categoryId || null,
    brandId: draft.brandId || null,
    unit: draft.unit || "per piece",
    moq: Number(draft.moq || 1),
    stock: Number(draft.stock || 0),
    gstPercent: Number(draft.gstPercent || 0),
    featured: draft.featured,
    isActive: draft.isActive,
    price: {
      mrp: Number(draft.mrp || 0),
      distributorPrice: Number(draft.distributorPrice || 0),
      bulkSlabs: draft.bulkSlabs
        .filter((slab) => slab.minQty !== "" && slab.price !== "")
        .map((slab) => ({ minQty: Number(slab.minQty), price: Number(slab.price) })),
    },
    shortDescription: draft.shortDescription,
    description: draft.description,
    specifications: draft.specifications.filter((spec) => spec.key.trim() && spec.value.trim()),
    images: draft.images,
  };
}

/**
 * Warn before losing edits. Fires on browser/tab navigation (`beforeunload`)
 * and on the Cancel button, which is where people actually lose work.
 */
function useUnsavedChangesGuard(onCancel: () => void, dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    function handler(event: BeforeUnloadEvent) {
      event.preventDefault();
      // Some browsers still need a returnValue set to show the prompt.
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  return () => {
    if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) return;
    onCancel();
  };
}

/**
 * The full product editor: SKU, HSN code, minimum order quantity, GST rate,
 * distributor price and quantity-based tiers. Bulk tiers are edited as
 * explicit rows so a price break can never be implied.
 *
 * It is rendered on the dedicated create (/admin/products/new) and edit
 * (/admin/products/[id]/edit) pages.
 */
export function ProductForm({
  draft,
  setDraft,
  initialDraft = EMPTY_DRAFT,
  categories,
  brands,
  saving,
  formError,
  onSubmit,
  onCancel,
  submitLabel = "Create product",
  className = "space-y-7",
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  /** Compared against `draft` to detect unsaved edits. */
  initialDraft?: Draft;
  categories: CategoryDto[];
  brands: BrandDto[];
  saving: boolean;
  formError: string | null;
  onSubmit: (payload: ProductPayload) => void;
  onCancel: () => void;
  submitLabel?: string;
  className?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const payload = useMemo(() => buildProductPayload(draft), [draft]);

  // Only guard once the form is interactive; the page-level skeleton state
  // means no edits are possible yet.
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initialDraft), [draft, initialDraft]);
  const confirmCancel = useUnsavedChangesGuard(onCancel, dirty && !saving);

  async function uploadImage(file: File) {
    setUploading(true);
    setUploadNote(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setUploadNote(
          typeof data?.error === "string"
            ? `${data.error}. Paste an image URL instead.`
            : "The upload failed. Paste an image URL instead."
        );
        return;
      }
      if (typeof data?.url === "string") {
        setDraft((current) => ({ ...current, images: [...current.images, data.url].slice(0, 8) }));
        setUploadNote("Image uploaded.");
      }
    } catch {
      setUploadNote("The upload failed. Paste an image URL instead.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(payload);
      }}
      className={className}
      noValidate
    >
      {formError && (
        <Alert tone="danger" title="Could not save">
          {formError}
        </Alert>
      )}

      {/* Basics */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-navy-900">Product details</legend>
        <Input
          label="Product name"
          value={draft.title}
          onChange={(event) => setDraft((d) => ({ ...d, title: event.target.value }))}
          placeholder="Industrial Safety Helmet with Ratchet Suspension"
          required
          hint="Customers see this everywhere. The web address is generated from it."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="SKU"
            value={draft.sku}
            onChange={(event) => setDraft((d) => ({ ...d, sku: event.target.value.toUpperCase() }))}
            placeholder="PPE-1001"
            required
            hint="Letters, numbers, dash, dot or underscore."
          />
          <Input
            label="HSN code"
            value={draft.hsnCode}
            onChange={(event) => setDraft((d) => ({ ...d, hsnCode: event.target.value }))}
            placeholder="650610"
            optional
            hint="4–8 digits. Printed on invoices."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Category"
            value={draft.categoryId}
            onChange={(event) => setDraft((d) => ({ ...d, categoryId: event.target.value }))}
            hint="Controls which filter the product appears under."
          >
            <option value="">Uncategorised</option>
            {categories.map((entry) => (
              <option key={entry._id} value={entry._id}>
                {entry.name}
                {entry.isActive === false ? " (hidden)" : ""}
              </option>
            ))}
          </Select>
          <Select
            label="Brand"
            value={draft.brandId}
            onChange={(event) => setDraft((d) => ({ ...d, brandId: event.target.value }))}
          >
            <option value="">No brand</option>
            {brands.map((entry) => (
              <option key={entry._id} value={entry._id}>
                {entry.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Minimum order quantity"
            type="number"
            min={1}
            step={1}
            value={draft.moq}
            onChange={(event) => setDraft((d) => ({ ...d, moq: event.target.value }))}
            required
            hint="Smallest quantity a customer may order."
          />
          <Input
            label="Stock on hand"
            type="number"
            min={0}
            step={1}
            value={draft.stock}
            onChange={(event) => setDraft((d) => ({ ...d, stock: event.target.value }))}
            required
          />
          <Input
            label="Unit"
            value={draft.unit}
            onChange={(event) => setDraft((d) => ({ ...d, unit: event.target.value }))}
            placeholder="per piece"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="GST percentage"
            type="number"
            min={0}
            max={28}
            step="0.01"
            value={draft.gstPercent}
            onChange={(event) => setDraft((d) => ({ ...d, gstPercent: event.target.value }))}
            required
            hint="Applied per line at checkout, calculated on the server."
          />
          <div className="flex flex-col justify-end gap-3 pt-1">
            <Checkbox
              label="Feature on the homepage"
              checked={draft.featured}
              onChange={(event) => setDraft((d) => ({ ...d, featured: event.target.checked }))}
            />
            <Checkbox
              label="Listed on the storefront"
              checked={draft.isActive}
              onChange={(event) => setDraft((d) => ({ ...d, isActive: event.target.checked }))}
              hint="Uncheck to archive it without losing order history."
            />
          </div>
        </div>
      </fieldset>

      {/* Pricing */}
      <fieldset className="space-y-4 border-t border-line pt-6">
        <legend className="text-sm font-semibold text-navy-900">Pricing</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Distributor price"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={draft.distributorPrice}
            onChange={(event) => setDraft((d) => ({ ...d, distributorPrice: event.target.value }))}
            required
            hint="The price your customers pay. Excludes GST."
          />
          <Input
            label="MRP"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={draft.mrp}
            onChange={(event) => setDraft((d) => ({ ...d, mrp: event.target.value }))}
            optional
            hint="Used to show the saving. Cannot be lower than the distributor price."
          />
        </div>

        <div className="rounded-chip border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-navy-900">Bulk price tiers</p>
              <p className="mt-0.5 text-xs text-muted">
                Quantity ranges the customer sees in the price table. Tier prices must not exceed the base price.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDraft((d) => ({ ...d, bulkSlabs: [...d.bulkSlabs, { minQty: "", price: "" }] }))}
              icon={<Plus size={14} />}
            >
              Add tier
            </Button>
          </div>

          {draft.bulkSlabs.length === 0 ? (
            <p className="mt-3 text-xs text-muted">No bulk tiers. Customers pay the distributor price at any quantity.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {draft.bulkSlabs.map((slab, index) => (
                <li key={index} className="flex flex-wrap items-end gap-3">
                  <div className="w-32">
                    <label className="label" htmlFor={`slab-qty-${index}`}>
                      From quantity
                    </label>
                    <input
                      id={`slab-qty-${index}`}
                      type="number"
                      min={2}
                      step={1}
                      value={slab.minQty}
                      onChange={(event) =>
                        setDraft((d) => ({
                          ...d,
                          bulkSlabs: d.bulkSlabs.map((entry, i) =>
                            i === index ? { ...entry, minQty: event.target.value } : entry
                          ),
                        }))
                      }
                      className="field"
                    />
                  </div>
                  <div className="w-36">
                    <label className="label" htmlFor={`slab-price-${index}`}>
                      Unit price
                    </label>
                    <input
                      id={`slab-price-${index}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={slab.price}
                      onChange={(event) =>
                        setDraft((d) => ({
                          ...d,
                          bulkSlabs: d.bulkSlabs.map((entry, i) =>
                            i === index ? { ...entry, price: event.target.value } : entry
                          ),
                        }))
                      }
                      className="field"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDraft((d) => ({ ...d, bulkSlabs: d.bulkSlabs.filter((_, i) => i !== index) }))}
                    aria-label={`Remove tier ${index + 1}`}
                    icon={<Trash2 size={14} />}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </fieldset>

      {/* Content */}
      <fieldset className="space-y-4 border-t border-line pt-6">
        <legend className="text-sm font-semibold text-navy-900">Description and specifications</legend>
        <Input
          label="Short summary"
          value={draft.shortDescription}
          onChange={(event) => setDraft((d) => ({ ...d, shortDescription: event.target.value }))}
          placeholder="High-density shell with a six-point ratchet harness."
          optional
          hint="One line, shown on product cards and search results."
        />
        <Textarea
          label="Full description"
          rows={4}
          value={draft.description}
          onChange={(event) => setDraft((d) => ({ ...d, description: event.target.value }))}
          optional
        />

        <div className="rounded-chip border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-navy-900">Specifications</p>
              <p className="mt-0.5 text-xs text-muted">Shown as a readable table on the product page.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDraft((d) => ({ ...d, specifications: [...d.specifications, { key: "", value: "" }] }))}
              icon={<Plus size={14} />}
            >
              Add row
            </Button>
          </div>

          {draft.specifications.length === 0 ? (
            <p className="mt-3 text-xs text-muted">No specifications listed yet.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {draft.specifications.map((spec, index) => (
                <li key={index} className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[140px] flex-1">
                    <label className="label" htmlFor={`spec-key-${index}`}>
                      Label
                    </label>
                    <input
                      id={`spec-key-${index}`}
                      value={spec.key}
                      onChange={(event) =>
                        setDraft((d) => ({
                          ...d,
                          specifications: d.specifications.map((entry, i) =>
                            i === index ? { ...entry, key: event.target.value } : entry
                          ),
                        }))
                      }
                      placeholder="Material"
                      className="field"
                    />
                  </div>
                  <div className="min-w-[160px] flex-[1.5]">
                    <label className="label" htmlFor={`spec-value-${index}`}>
                      Value
                    </label>
                    <input
                      id={`spec-value-${index}`}
                      value={spec.value}
                      onChange={(event) =>
                        setDraft((d) => ({
                          ...d,
                          specifications: d.specifications.map((entry, i) =>
                            i === index ? { ...entry, value: event.target.value } : entry
                          ),
                        }))
                      }
                      placeholder="HDPE shell"
                      className="field"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setDraft((d) => ({ ...d, specifications: d.specifications.filter((_, i) => i !== index) }))
                    }
                    aria-label={`Remove specification ${index + 1}`}
                    icon={<Trash2 size={14} />}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </fieldset>

      {/* Images */}
      <fieldset className="space-y-4 border-t border-line pt-6">
        <legend className="text-sm font-semibold text-navy-900">Images</legend>
        <p className="text-xs leading-5 text-muted">
          Up to 8 images. The first one is used on product cards. Products without an image fall back to a neutral
          placeholder rather than showing a broken picture.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            id="product-image-upload"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadImage(file);
            }}
          />
          <Button
            size="sm"
            variant="outline"
            loading={uploading}
            loadingLabel="Uploading…"
            onClick={() => fileRef.current?.click()}
            icon={<Upload size={15} />}
          >
            Upload image
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDraft((d) => ({ ...d, images: [...d.images, ""].slice(0, 8) }))}
            icon={<ImagePlus size={15} />}
          >
            Add image URL
          </Button>
        </div>

        {uploadNote && <Alert tone={uploadNote === "Image uploaded." ? "success" : "warning"}>{uploadNote}</Alert>}

        {draft.images.length > 0 && (
          <ul className="space-y-2.5">
            {draft.images.map((url, index) => (
              <li key={index} className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="label" htmlFor={`image-${index}`}>
                    Image {index + 1}
                    {index === 0 ? " · card image" : ""}
                  </label>
                  <input
                    id={`image-${index}`}
                    value={url}
                    onChange={(event) =>
                      setDraft((d) => ({
                        ...d,
                        images: d.images.map((entry, i) => (i === index ? event.target.value : entry)),
                      }))
                    }
                    placeholder="https://…"
                    className="field"
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDraft((d) => ({ ...d, images: d.images.filter((_, i) => i !== index) }))}
                  aria-label={`Remove image ${index + 1}`}
                  icon={<Trash2 size={14} />}
                />
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" onClick={confirmCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} loadingLabel="Saving…">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
