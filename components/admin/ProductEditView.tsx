"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AdminPanel, AdminPageHeader } from "./ui";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/Toast";
import type { BrandDto, CategoryDto, ProductDto } from "@/lib/types";
import { ProductForm, EMPTY_DRAFT, productToDraft, type Draft, type ProductPayload } from "./ProductForm";

/**
 * The edit-product screen. Like the add screen, it lives on its own route
 * (/admin/products/[id]/edit) instead of a modal so the full editor has room,
 * a refresh keeps working, and the back button behaves as people expect.
 */
export function ProductEditView({ id }: { id: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [brands, setBrands] = useState<BrandDto[]>([]);
  const [product, setProduct] = useState<ProductDto | null>(null);
  const [initialDraft, setInitialDraft] = useState<Draft>(EMPTY_DRAFT);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [productResponse, categoryResponse, brandResponse] = await Promise.all([
        fetch(`/api/products/${id}`, { cache: "no-store" }),
        fetch("/api/categories?includeInactive=1", { cache: "no-store" }),
        fetch("/api/brands", { cache: "no-store" }),
      ]);
      if (!productResponse.ok || !categoryResponse.ok || !brandResponse.ok) throw new Error("failed");
      const [productData, categoryData, brandData] = await Promise.all([
        productResponse.json(),
        categoryResponse.json(),
        brandResponse.json(),
      ]);
      const item = (productData?.item ?? null) as ProductDto | null;
      if (!item) throw new Error("failed");
      const next = productToDraft(item);
      setProduct(item);
      setInitialDraft(next);
      setDraft(next);
      setCategories(Array.isArray(categoryData.items) ? categoryData.items : []);
      setBrands(Array.isArray(brandData.items) ? brandData.items : []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(payload: ProductPayload) {
    if (saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "PATCH",
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
        title: `${payload.title} updated`,
        description: "Storefront pages already reflect this change.",
      });
      setInitialDraft(draft);
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
        title={product ? `Edit ${product.title}` : "Edit product"}
        description="Everything here is what the storefront, checkout and invoices read from."
        actions={
          <Link href="/admin/products" className="btn btn-outline btn-sm">
            <ArrowLeft size={15} aria-hidden="true" />
            Back to products
          </Link>
        }
      />

      {error ? (
        <ErrorState
          title="This product could not be loaded"
          description="The request failed. Check that the database is reachable and try again."
          onRetry={load}
        />
      ) : loading ? (
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
            initialDraft={initialDraft}
            categories={categories}
            brands={brands}
            saving={saving}
            formError={formError}
            onSubmit={save}
            onCancel={() => router.push("/admin/products")}
            submitLabel="Save product"
            className="space-y-7 p-5"
          />
        </AdminPanel>
      )}
    </div>
  );
}
