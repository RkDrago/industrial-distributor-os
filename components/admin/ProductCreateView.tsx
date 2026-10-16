"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AdminPanel, AdminPageHeader } from "./ui";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/Toast";
import type { BrandDto, CategoryDto } from "@/lib/types";
import { EMPTY_DRAFT, ProductForm, type Draft, type ProductPayload } from "./ProductForm";

/**
 * The add-product screen. It lives on its own route (/admin/products/new)
 * instead of a modal so the full editor — pricing tiers, specifications and
 * images — has room to breathe, and so a refresh or back button behaves the
 * way people expect.
 */
export function ProductCreateView() {
  const router = useRouter();
  const { push } = useToast();
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [brands, setBrands] = useState<BrandDto[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState(false);

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadOptions() {
    setLoadingOptions(true);
    try {
      const [categoryResponse, brandResponse] = await Promise.all([
        fetch("/api/categories?includeInactive=1", { cache: "no-store" }),
        fetch("/api/brands", { cache: "no-store" }),
      ]);
      if (!categoryResponse.ok || !brandResponse.ok) throw new Error("failed");
      const [categoryData, brandData] = await Promise.all([categoryResponse.json(), brandResponse.json()]);
      setCategories(Array.isArray(categoryData.items) ? categoryData.items : []);
      setBrands(Array.isArray(brandData.items) ? brandData.items : []);
      setOptionsError(false);
    } catch {
      setOptionsError(true);
    } finally {
      setLoadingOptions(false);
    }
  }

  // Initial load only; the retry button calls loadOptions again.
  useEffect(() => {
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(payload: ProductPayload) {
    if (saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = Array.isArray(data?.errors) && data.errors.length ? data.errors[0] : data?.error;
        setFormError(typeof detail === "string" ? detail : "The product could not be saved.");
        return;
      }
      push({
        tone: "success",
        title: `${payload.title} added to the catalogue`,
        description: "It is now visible on the storefront.",
      });
      router.push("/admin/products");
      router.refresh();
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Add a product"
        description="Everything here is what the storefront, checkout and invoices read from."
        actions={
          <Link href="/admin/products" className="btn btn-outline btn-sm">
            <ArrowLeft size={15} aria-hidden="true" />
            Back to products
          </Link>
        }
      />

      {optionsError ? (
        <ErrorState
          title="Categories and brands could not be loaded"
          description="The form needs the category and brand lists before it can save. Check that the database is reachable and try again."
          onRetry={loadOptions}
        />
      ) : loadingOptions ? (
        <div className="rounded-card border border-line bg-surface p-5">
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        </div>
      ) : (
        <AdminPanel title="Product details" description="Fields marked with * are required.">
          <ProductForm
            draft={draft}
            setDraft={setDraft}
            categories={categories}
            brands={brands}
            saving={saving}
            formError={formError}
            onSubmit={save}
            onCancel={() => router.push("/admin/products")}
            submitLabel="Create product"
            className="space-y-7 p-5"
          />
        </AdminPanel>
      )}
    </div>
  );
}
