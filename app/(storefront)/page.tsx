import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  Building2,
  ClipboardList,
  FileText,
  Headphones,
  Layers,
  PackageSearch,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { getStorefrontBrands, getStorefrontCategories, toProductDto } from "@/lib/catalog";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductImage } from "@/components/product/ProductImage";
import { SearchForm } from "@/components/site/SearchForm";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/feedback";
import { formatNumber } from "@/lib/format";
import type { ProductDto } from "@/lib/types";

export const metadata = {
  title: "Industrial Supplies. Made Simple.",
  description:
    "Find quality industrial products, compare bulk prices, and order for your business in one place — with GST invoices and order tracking.",
};

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1567789884554-0b844b597180?auto=format&fit=crop&w=1600&q=80";

/** Homepage data. A database hiccup must not take the marketing page down. */
async function getHomepageData() {
  try {
    await connectDB();
    const [featured, popular, totalActive] = await Promise.all([
      Product.find({ isActive: true, featured: true })
        .sort({ stock: -1 })
        .limit(4)
        .select("title slug sku hsnCode images stock moq unit price gstPercent categoryId brandId")
        .lean<any[]>(),
      Product.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(8)
        .select("title slug sku hsnCode images stock moq unit price gstPercent categoryId brandId")
        .lean<any[]>(),
      Product.countDocuments({ isActive: true }),
    ]);

    const { Category } = await import("@/models/Category");
    const { Brand } = await import("@/models/Brand");
    const [categories, brands] = await Promise.all([
      Category.find({ isActive: true }).select("name slug").lean<any[]>(),
      Brand.find().select("name slug").lean<any[]>(),
    ]);

    const categoryMap = new Map(categories.map((c: any) => [String(c._id), { id: String(c._id), name: c.name, slug: c.slug }]));
    const brandMap = new Map(brands.map((b: any) => [String(b._id), { id: String(b._id), name: b.name, slug: b.slug }]));

    // toProductDto strips Mongo subdocument ids (and their toJSON methods),
    // which cannot be handed to the client components that render these cards.
    const decorate = (rows: any[]): ProductDto[] =>
      rows.map((row) => ({
        ...toProductDto(row),
        category: row.categoryId ? categoryMap.get(String(row.categoryId)) ?? null : null,
        brand: row.brandId ? brandMap.get(String(row.brandId)) ?? null : null,
      }));

    return { featured: decorate(featured), popular: decorate(popular), totalActive };
  } catch (error) {
    console.error("[home] catalogue unavailable", error);
    return { featured: [] as ProductDto[], popular: [] as ProductDto[], totalActive: 0 };
  }
}

export default async function HomePage() {
  const [{ featured, popular, totalActive }, categories, brands] = await Promise.all([
    getHomepageData(),
    getStorefrontCategories(),
    getStorefrontBrands(),
  ]);

  const catalogueProducts = featured.length ? featured : popular.slice(0, 4);
  const browsableCategories = categories.slice(0, 8);
  // Never show the same product twice on one page.
  const featuredIds = new Set(catalogueProducts.map((p) => p._id));
  const recentProducts = popular.filter((p) => !featuredIds.has(p._id)).slice(0, 4);

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative isolate overflow-hidden bg-navy-900">
        <ProductImage
          src={HERO_IMAGE}
          alt=""
          priority
          className="absolute inset-0 -z-10 h-full w-full"
          imgClassName="opacity-45"
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-br from-navy-950/95 via-navy-900/85 to-navy-900/70"
          aria-hidden="true"
        />

        <div className="shell grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="animate-fadeUp">
            <span className="inline-flex items-center gap-2 rounded-chip border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
              <Building2 size={14} className="text-brand-300" />
              Built for procurement teams and growing businesses
            </span>

            <h1 className="mt-5 text-[34px] font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-5xl lg:text-[3.4rem]">
              Industrial Supplies.
              <br />
              <span className="text-brand-300">Made Simple.</span>
            </h1>

            <p className="mt-5 max-w-xl text-[15px] leading-7 text-navy-100 sm:text-base">
              Find quality industrial products, compare bulk prices, and order for your business in one place.
            </p>

            <div className="mt-7 max-w-2xl">
              <SearchForm variant="hero" />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href="/products" className="btn btn-lg bg-white text-navy-900 hover:bg-navy-50">
                <span>Explore Products</span>
                <ArrowRight size={17} />
              </Link>
              <Link
                href="/quote"
                className="btn btn-lg border-white/25 bg-transparent text-white hover:bg-white/10"
              >
                <span>Request a Bulk Quote</span>
              </Link>
            </div>

            {totalActive > 0 && (
              <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-navy-200">
                <span className="inline-flex items-center gap-1.5">
                  <Layers size={14} className="text-brand-300" />
                  {formatNumber(totalActive)} products ready to order
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Search size={14} className="text-brand-300" />
                  Search by name, brand, SKU or HSN
                </span>
              </p>
            )}
          </div>

          {/* A real, useful panel rather than a decorative screenshot. */}
          <div className="animate-fadeUp rounded-card border border-white/15 bg-white/[0.07] p-5 backdrop-blur-md sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <BadgeIndianRupee size={17} className="text-brand-300" />
              How bulk pricing works
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-navy-100">
              Each product shows its unit price, minimum order quantity and every quantity-based rate. You always see the
              rate your quantity qualifies for before you order.
            </p>

            <div className="mt-4 overflow-hidden rounded-chip border border-white/15">
              <table className="w-full text-left text-[13px]">
                <caption className="sr-only">Illustration of quantity based pricing tiers</caption>
                <thead className="bg-white/10 text-navy-100">
                  <tr>
                    <th scope="col" className="px-3.5 py-2 font-medium">
                      Quantity
                    </th>
                    <th scope="col" className="px-3.5 py-2 font-medium">
                      Rate per unit
                    </th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  <tr className="border-t border-white/10">
                    <td className="px-3.5 py-2.5">1 – 49</td>
                    <td className="px-3.5 py-2.5 font-semibold">Listed unit price</td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="px-3.5 py-2.5">50 – 99</td>
                    <td className="px-3.5 py-2.5 font-semibold text-brand-300">Tier 1 rate</td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="px-3.5 py-2.5">100 +</td>
                    <td className="px-3.5 py-2.5 font-semibold text-brand-300">Tier 2 rate</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-navy-200">
              Tier quantities and rates come from the live catalogue — open any product to see its actual table.
            </p>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- trust strip */}
      <section className="border-b border-line bg-surface" aria-label="What you can expect">
        <div className="shell grid gap-x-8 gap-y-5 py-7 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: FileText, title: "GST invoices", copy: "HSN and tax breakdown on every order." },
            { icon: BadgeIndianRupee, title: "Transparent bulk pricing", copy: "Quantity tiers shown before you buy." },
            { icon: ShieldCheck, title: "Prices validated server-side", copy: "Your total is calculated on our side." },
            { icon: Truck, title: "Order tracking", copy: "Follow each order from received to delivered." },
          ].map(({ icon: Icon, title, copy }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-chip bg-brand-50 text-brand-600">
                <Icon size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-navy-900">{title}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-muted">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------- categories */}
      <section className="section">
        <div className="shell">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Shop by category</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.015em] text-navy-900 sm:text-3xl">
                Everything your operation runs on
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Mechanical components, electrical supplies, safety equipment, tools, hardware, pipes, fittings and
                consumables — all available in trade quantities.
              </p>
            </div>
            <Link href="/products" className="btn btn-outline btn-sm">
              <span>View all products</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {browsableCategories.length === 0 ? (
            <EmptyState
              className="mt-8"
              icon={<Layers size={22} />}
              title="No categories published yet"
              description="Categories will appear here as soon as products are added to the catalogue."
              action={
                <Link href="/products" className="btn btn-primary btn-sm">
                  Browse products
                </Link>
              }
            />
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {browsableCategories.map((category) => (
                <Link
                  key={category.id}
                  href={`/products?category=${category.slug}`}
                  className="group overflow-hidden rounded-card border border-line bg-surface transition hover:border-lineStrong hover:shadow-card"
                >
                  <ProductImage
                    src={category.image}
                    alt=""
                    className="aspect-[16/10] w-full"
                    imgClassName="transition duration-500 group-hover:scale-[1.04]"
                    sizes="(max-width: 640px) 100vw, 25vw"
                  />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-[15px] font-semibold leading-5 text-navy-900 group-hover:text-brand-700">
                        {category.name}
                      </h3>
                      <ArrowRight
                        size={16}
                        className="mt-0.5 shrink-0 text-navy-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600"
                      />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-muted">
                      {category.description || "Browse products in this category."}
                    </p>
                    <p className="mt-2.5 text-xs font-medium text-navy-400">
                      {formatNumber(category.productCount)} product{category.productCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------- bulk order callout */}
      <section className="shell">
        <div className="overflow-hidden rounded-card bg-navy-900">
          <div className="grid gap-8 p-7 sm:p-9 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:p-11">
            <div>
              <Badge tone="brand" className="!border-brand-500/40 !bg-brand-500/15 !text-brand-200">
                Larger requirement?
              </Badge>
              <h2 className="mt-4 text-2xl font-bold tracking-[-0.015em] text-white sm:text-3xl">
                Buying by the pallet, not the piece?
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-navy-100">
                Send us your list — quantities, SKUs or a specification — and our team will put together a written
                quotation. We confirm availability, the rate that applies at your volume, applicable GST and the delivery
                arrangement before you commit.
              </p>

              <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {[
                  "Written quotation with GST breakdown",
                  "Volume rates reviewed line by line",
                  "Stock and lead time confirmed upfront",
                  "One reference number to follow up with",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2 text-[13px] leading-5 text-navy-100">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" aria-hidden="true" />
                    {line}
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/quote" className="btn btn-lg btn-primary">
                  <PackageSearch size={17} />
                  <span>Request a Bulk Quote</span>
                </Link>
                <Link href="/contact" className="btn btn-lg border-white/25 bg-transparent text-white hover:bg-white/10">
                  <span>Talk to our team</span>
                </Link>
              </div>
            </div>

            <div className="rounded-card border border-white/12 bg-white/[0.06] p-5 backdrop-blur-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <ClipboardList size={17} className="text-brand-300" />
                What we need from you
              </h3>
              <ol className="mt-3.5 space-y-3">
                {[
                  "The products, or a description of what you need",
                  "Quantities per item",
                  "Delivery city or site location",
                  "Your GSTIN, so the quotation is invoice-ready",
                ].map((step, index) => (
                  <li key={step} className="flex items-start gap-3 text-[13px] leading-5 text-navy-100">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- products */}
      <section className="section">
        <div className="shell">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{featured.length ? "Featured products" : "Popular products"}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.015em] text-navy-900 sm:text-3xl">
                Fast-moving items from the catalogue
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Every card shows the unit price, GST rate, minimum order quantity and stock position before you add
                anything to your basket.
              </p>
            </div>
            <Link href="/products" className="btn btn-outline btn-sm">
              <span>Browse catalogue</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {catalogueProducts.length === 0 ? (
            <EmptyState
              className="mt-8"
              icon={<PackageSearch size={22} />}
              title="The catalogue is empty"
              description="Add products to the database (or run the seed script) and they will appear here automatically."
              action={
                <Link href="/products" className="btn btn-primary btn-sm">
                  Open catalogue
                </Link>
              }
            />
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {catalogueProducts.map((product, index) => (
                <ProductCard key={product._id} product={product} priority={index < 2} />
              ))}
            </div>
          )}

          {recentProducts.length > 0 && (
            <div className="mt-10">
              <h3 className="text-base font-semibold text-navy-900">Recently added</h3>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {recentProducts.map((product) => (
                  <ProductCard key={`recent-${product._id}`} product={product} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* --------------------------------------------------------------- brands */}
      {brands.length > 0 && (
        <section className="border-y border-line bg-surface py-9">
          <div className="shell">
            <h2 className="text-sm font-semibold text-navy-900">
              Brands stocked in the catalogue
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              Filter the catalogue by any of these manufacturers.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2.5">
              {brands.slice(0, 10).map((brand) => (
                <li key={brand.id}>
                  <Link
                    href={`/products?brand=${brand.slug}`}
                    className="inline-flex items-center gap-2 rounded-chip border border-line bg-canvas px-3.5 py-2 text-sm font-medium text-navy-700 transition hover:border-lineStrong hover:bg-surface"
                  >
                    {brand.name}
                    <span className="text-xs text-muted">{brand.productCount}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* --------------------------------------------------------- how it works */}
      <section id="how-it-works" className="section">
        <div className="shell">
          <p className="eyebrow">How ordering works</p>
          <h2 className="mt-2 max-w-2xl text-2xl font-bold tracking-[-0.015em] text-navy-900 sm:text-3xl">
            Four steps from requirement to delivery
          </h2>

          <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Search,
                title: "Find the right product",
                copy: "Search by product name, brand, SKU or HSN code, then narrow by category, brand, price or availability.",
              },
              {
                icon: BadgeIndianRupee,
                title: "Check the rate for your quantity",
                copy: "Every product shows its bulk tiers. Enter your quantity and the unit price updates to the tier you qualify for.",
              },
              {
                icon: ClipboardList,
                title: "Order, or request a quote",
                copy: "Place the order with your company and GST details, or send a bulk enquiry and we will quote you in writing.",
              },
              {
                icon: Truck,
                title: "Track it and get your invoice",
                copy: "Follow the order through received, confirmed, shipped and delivered, and keep the GST invoice for your records.",
              },
            ].map(({ icon: Icon, title, copy }, index) => (
              <li key={title} className="rounded-card border border-line bg-surface p-5">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-chip bg-navy-900 text-brand-300">
                    <Icon size={19} />
                  </span>
                  <span className="text-xs font-bold tabular-nums text-navy-200">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-navy-900">{title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-muted">{copy}</p>
              </li>
            ))}
          </ol>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/products" className="btn btn-primary">
              Explore Products
            </Link>
            <Link href="/track" className="btn btn-outline">
              Track an existing order
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- support */}
      <section className="shell pb-4">
        <div className="grid gap-4 rounded-card border border-line bg-surface p-6 sm:grid-cols-[1.4fr_1fr] sm:items-center sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-chip bg-brand-50 text-brand-600">
              <Headphones size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-navy-900">Not sure which part you need?</h2>
              <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted">
                Send us the specification, a part number, or a photo reference. Our sales team will identify the closest
                match in the catalogue and confirm availability and pricing.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 sm:justify-end">
            <Link href="/contact" className="btn btn-primary">
              <Headphones size={16} />
              <span>Contact our team</span>
            </Link>
            <Link href="/quote" className="btn btn-outline">
              Request a quote
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
