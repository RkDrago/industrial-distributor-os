import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BadgeCheck, FileText, MessageSquareQuote, Package, Phone, Ruler, ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { ProductGallery } from "@/components/product/ProductGallery";
import { PurchasePanel } from "@/components/product/PurchasePanel";
import { ProductCard } from "@/components/product/ProductCard";
import { Badge } from "@/components/ui/Badge";
import { getProductDetail, getSafeCommerceSettings } from "@/lib/catalog";
import { companyInfo } from "@/lib/company";
import { discountPercent, gstPercentOf, mrpOf, priceRange } from "@/lib/pricing";
import { formatPrice, formatQty } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { item } = await getProductDetail(params.slug);
  if (!item) return { title: "Product not found" };
  return {
    title: item.title,
    description:
      item.shortDescription ||
      `Buy ${item.title} (SKU ${item.sku}) for your business — bulk pricing, GST invoice and stock visibility.`,
  };
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const [{ item, related, error }, settings] = await Promise.all([
    getProductDetail(params.slug),
    getSafeCommerceSettings(),
  ]);

  if (error) {
    return (
      <div className="shell py-16">
        <div className="mx-auto max-w-lg rounded-card border border-line bg-surface p-8 text-center">
          <h1 className="text-xl font-bold text-navy-900">We couldn&apos;t load this product</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            The catalogue is temporarily unavailable. Please try again in a moment, or browse the full catalogue.
          </p>
          <Link href="/products" className="btn btn-primary mt-5">
            Back to catalogue
          </Link>
        </div>
      </div>
    );
  }

  if (!item) notFound();

  const priced = { price: item.price, gstPercent: item.gstPercent };
  const gstPercent = gstPercentOf(priced);
  const list = mrpOf(priced);
  const base = Number(item.price?.distributorPrice) || 0;
  const saving = discountPercent(list, base);
  const range = priceRange(priced);
  const moq = Math.max(1, Number(item.moq) || 1);
  const stock = Math.max(0, Number(item.stock) || 0);
  const specifications = (item.specifications ?? []).filter((s) => s?.key && s?.value);

  return (
    <div className="shell py-7 lg:py-10">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Products", href: "/products" },
          ...(item.category
            ? [{ label: item.category.name, href: `/products?category=${item.category.slug}` }]
            : []),
          { label: item.title },
        ]}
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
        <div>
          <ProductGallery images={item.images} title={item.title} />

          {/* Specifications sit with the image on desktop for easy comparison. */}
          {specifications.length > 0 && (
            <section className="mt-6 hidden lg:block">
              <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
                <Ruler size={17} className="text-brand-600" />
                Specifications
              </h2>
              <div className="mt-3 overflow-hidden rounded-card border border-line bg-surface">
                <table className="table">
                  <caption className="sr-only">Technical specifications</caption>
                  <tbody>
                    {specifications.map((spec, index) => (
                      <tr key={`${spec.key}-${index}`}>
                        <th scope="row" className="w-2/5 bg-canvas text-left text-xs font-semibold uppercase tracking-wide text-muted">
                          {spec.key}
                        </th>
                        <td className="text-navy-800">{spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {item.brand && (
              <Link href={`/products?brand=${item.brand.slug}`} className="badge badge-neutral hover:border-lineStrong">
                {item.brand.name}
              </Link>
            )}
            {item.category && (
              <Link href={`/products?category=${item.category.slug}`} className="badge badge-neutral hover:border-lineStrong">
                {item.category.name}
              </Link>
            )}
            {item.featured && <Badge tone="brand">Featured</Badge>}
          </div>

          <h1 className="mt-3 text-2xl font-bold leading-tight tracking-[-0.015em] text-navy-900 sm:text-[28px]">
            {item.title}
          </h1>

          {item.shortDescription && (
            <p className="mt-3 text-sm leading-6 text-navy-600">{item.shortDescription}</p>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 rounded-card border border-line bg-surface p-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">SKU</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-navy-900">{item.sku}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">HSN code</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-navy-900">{item.hsnCode || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Min. order qty</dt>
              <dd className="mt-0.5 font-semibold text-navy-900">
                {formatQty(moq)} {item.unit ? <span className="font-normal text-muted">{item.unit}</span> : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">GST rate</dt>
              <dd className="mt-0.5 font-semibold text-navy-900">{gstPercent}%</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Availability</dt>
              <dd className="mt-0.5 font-semibold text-navy-900">
                {stock <= 0 ? (
                  <span className="text-danger">Out of stock</span>
                ) : stock <= settings.lowStockThreshold ? (
                  <span className="text-warning">{formatQty(stock)} in stock</span>
                ) : (
                  <span className="text-brand-700">In stock</span>
                )}
              </dd>
            </div>
            {range.min > 0 && range.min < base && (
              <div>
                <dt className="text-xs text-muted">Best tier rate</dt>
                <dd className="mt-0.5 font-semibold text-brand-700">{formatPrice(range.min)}</dd>
              </div>
            )}
          </dl>

          <div className="mt-5">
            <PurchasePanel product={item} lowStockThreshold={settings.lowStockThreshold} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2.5 rounded-card border border-line bg-surface p-3.5">
              <ShieldCheck size={17} className="mt-0.5 shrink-0 text-brand-600" />
              <p className="text-xs leading-5 text-muted">
                Order totals, GST and stock are validated on our server before the order is accepted.
              </p>
            </div>
            <div className="flex items-start gap-2.5 rounded-card border border-line bg-surface p-3.5">
              <FileText size={17} className="mt-0.5 shrink-0 text-brand-600" />
              <p className="text-xs leading-5 text-muted">
                A GST invoice with HSN codes is issued for every order and is available in your account.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-card border border-line bg-surface p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <BadgeCheck size={17} className="text-brand-600" />
              Need a different specification or a larger volume?
            </p>
            <p className="mt-1.5 text-xs leading-5 text-muted">
              Send us the details and our team will confirm availability, the rate that applies at your volume and the
              delivery arrangement in writing.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/quote?product=${encodeURIComponent(item.slug)}&sku=${encodeURIComponent(item.sku)}&qty=${moq}`}
                className="btn btn-outline btn-sm"
              >
                <MessageSquareQuote size={15} />
                <span>Request a bulk quote</span>
              </Link>
              {companyInfo.phone && (
                <a href={`tel:${companyInfo.phone.replace(/\s/g, "")}`} className="btn btn-ghost btn-sm">
                  <Phone size={15} />
                  <span>{companyInfo.phone}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------ description */}
      {item.description && item.description !== item.shortDescription && (
        <section className="mt-10 max-w-3xl">
          <h2 className="text-base font-semibold text-navy-900">Product description</h2>
          <p className="prose-body mt-3 whitespace-pre-line">{item.description}</p>
        </section>
      )}

      {/* Specifications again for mobile, where the gallery column is shorter. */}
      {specifications.length > 0 && (
        <section className="mt-10 lg:hidden">
          <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
            <Ruler size={17} className="text-brand-600" />
            Specifications
          </h2>
          <div className="mt-3 overflow-hidden rounded-card border border-line bg-surface">
            <table className="table">
              <caption className="sr-only">Technical specifications</caption>
              <tbody>
                {specifications.map((spec, index) => (
                  <tr key={`m-${spec.key}-${index}`}>
                    <th scope="row" className="w-2/5 bg-canvas text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      {spec.key}
                    </th>
                    <td className="text-navy-800">{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- related */}
      {related.length > 0 && (
        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-semibold text-navy-900">Related products</h2>
            {item.category && (
              <Link href={`/products?category=${item.category.slug}`} className="btn btn-outline btn-sm">
                <Package size={15} />
                <span>All {item.category.name}</span>
              </Link>
            )}
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((product) => (
              <ProductCard key={product._id} product={product} lowStockThreshold={settings.lowStockThreshold} />
            ))}
          </div>
        </section>
      )}

      {/* Keeps the sticky mobile bar from covering the last row of content. */}
      <div className="h-20 lg:hidden" aria-hidden="true" />
    </div>
  );
}
