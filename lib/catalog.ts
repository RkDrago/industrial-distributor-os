import { cache } from "react";
import { connectDB } from "./db";
import { Category } from "@/models/Category";
import { Brand } from "@/models/Brand";
import { Product } from "@/models/Product";
import { DEFAULT_SETTINGS } from "@/models/AdminState";
import { getCommerceSettings, type CommerceSettings } from "./settings";
import { cleanText, isObjectId } from "./http";
import type { CatalogueQuery, CatalogueFacets } from "./catalogue-params";
import type { ProductDto } from "./types";

/**
 * Server-side catalogue helpers for the storefront chrome.
 *
 * All of these degrade instead of throwing so a database hiccup cannot take
 * down navigation; pages render their own explicit error state instead.
 */

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount: number;
};

export const getStorefrontCategories = cache(async (): Promise<StorefrontCategory[]> => {
  try {
    await connectDB();
    const rows = await Category.find({ isActive: true }).sort({ name: 1 }).lean<any[]>();
    const counts = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map<string, number>(counts.map((c: any) => [String(c._id), c.count]));

    return rows
      .map((row) => ({
        id: String(row._id),
        name: row.name ?? "",
        slug: row.slug ?? "",
        description: row.description ?? "",
        image: row.image ?? "",
        productCount: countMap.get(String(row._id)) ?? 0,
      }))
      .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name));
  } catch (error) {
    console.error("[catalog] categories unavailable", error);
    return [];
  }
});

export const getStorefrontBrands = cache(async () => {
  try {
    await connectDB();
    const rows = await Brand.find().sort({ name: 1 }).lean<any[]>();
    const counts = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$brandId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map<string, number>(counts.map((c: any) => [String(c._id), c.count]));
    return rows
      .map((row) => ({
        id: String(row._id),
        name: row.name ?? "",
        slug: row.slug ?? "",
        logo: row.logo ?? "",
        productCount: countMap.get(String(row._id)) ?? 0,
      }))
      .filter((b) => b.productCount > 0);
  } catch (error) {
    console.error("[catalog] brands unavailable", error);
    return [];
  }
});

/** Delivery settings with a safe default when the database is unreachable. */
export const getSafeCommerceSettings = cache(async (): Promise<CommerceSettings> => {
  try {
    return await getCommerceSettings();
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
});

/* ----------------------------------------------------------- catalogue */

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  "price-asc": { "price.distributorPrice": 1 },
  "price-desc": { "price.distributorPrice": -1 },
  "name-asc": { title: 1 },
  "stock-desc": { stock: -1 },
};

export type CatalogueResult = {
  items: ProductDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: CatalogueFacets;
  error: boolean;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Mongo subdocuments carry their own `_id` and a `toJSON` method, neither of
 * which can cross into a client component. Normalise the nested arrays into
 * plain objects so what reaches the browser is exactly what ProductDto says.
 */
function plainSpecifications(value: unknown): { key: string; value: string }[] {
  if (!Array.isArray(value)) return [];
  return value.map((spec: any) => ({ key: String(spec?.key ?? ""), value: String(spec?.value ?? "") }));
}

function plainBulkSlabs(value: unknown): { minQty: number; price: number }[] {
  if (!Array.isArray(value)) return [];
  return value.map((slab: any) => ({ minQty: Number(slab?.minQty) || 0, price: Number(slab?.price) || 0 }));
}

export function toProductDto(row: any): ProductDto {
  return {
    ...row,
    _id: String(row._id),
    categoryId: row.categoryId ? String(row.categoryId) : null,
    brandId: row.brandId ? String(row.brandId) : null,
    images: Array.isArray(row.images) ? row.images.map((url: any) => String(url)) : [],
    specifications: plainSpecifications(row.specifications),
    price: {
      mrp: Number(row.price?.mrp) || 0,
      distributorPrice: Number(row.price?.distributorPrice) || 0,
      bulkSlabs: plainBulkSlabs(row.price?.bulkSlabs),
    },
  };
}

/**
 * The single catalogue query used by both the public API and the catalogue
 * page, so filters, facets and pagination can never drift between them.
 */
export async function queryCatalogue(input: CatalogueQuery = {}): Promise<CatalogueResult> {
  const page = Math.max(1, Math.floor(Number(input.page) || 1));
  const pageSize = Math.min(Math.max(1, Math.floor(Number(input.pageSize) || 12)), 60);

  const empty: CatalogueResult = {
    items: [],
    total: 0,
    page,
    pageSize,
    totalPages: 1,
    facets: { categories: [], brands: [] },
    error: false,
  };

  try {
    await connectDB();

    const search = cleanText(input.search, 80);
    const categoryParam = cleanText(input.category, 60);
    const brandParam = cleanText(input.brand, 60);
    const availability = cleanText(input.availability, 12);
    const sortKey = cleanText(input.sort, 20) || "newest";

    const query: Record<string, any> = {};
    if (!input.includeInactive) query.isActive = true;

    if (categoryParam) {
      if (isObjectId(categoryParam)) query.categoryId = categoryParam;
      else {
        const category = await Category.findOne({ slug: categoryParam.toLowerCase() }).select("_id").lean<any>();
        query.categoryId = category?._id ?? null;
      }
    }
    if (brandParam) {
      if (isObjectId(brandParam)) query.brandId = brandParam;
      else {
        const brand = await Brand.findOne({ slug: brandParam.toLowerCase() }).select("_id").lean<any>();
        query.brandId = brand?._id ?? null;
      }
    }
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      query.$or = [{ title: rx }, { sku: rx }, { hsnCode: rx }, { shortDescription: rx }, { description: rx }];
    }

    // Note: Number(null) and Number("") are 0, which would silently become a
    // `$lte: 0` filter and hide the whole catalogue — so treat unset as absent.
    const toBound = (value: unknown) => {
      if (value === null || value === undefined || value === "") return Number.NaN;
      return Number(value);
    };
    const min = toBound(input.minPrice);
    const max = toBound(input.maxPrice);
    if (Number.isFinite(min) || Number.isFinite(max)) {
      const range: Record<string, number> = {};
      if (Number.isFinite(min)) range.$gte = Math.max(0, min);
      if (Number.isFinite(max)) range.$lte = Math.max(0, max);
      query["price.distributorPrice"] = range;
    }

    if (availability === "in") query.stock = { $gt: 0 };
    else if (availability === "out") query.stock = { $lte: 0 };

    if (input.featuredOnly) query.featured = true;

    const sort = SORTS[sortKey] ?? SORTS.newest;

    const [rows, total, categoryDocs, brandDocs] = await Promise.all([
      Product.find(query)
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .select(
          "title slug sku hsnCode shortDescription images stock moq unit price gstPercent featured isActive categoryId brandId"
        )
        .lean<any[]>(),
      Product.countDocuments(query),
      Category.find({ isActive: true }).sort({ name: 1 }).lean<any[]>(),
      Brand.find().sort({ name: 1 }).lean<any[]>(),
    ]);

    // Facet counts intentionally ignore the category/brand selection so a user
    // can switch facets instead of being trapped by an empty result set.
    const facetBase: Record<string, any> = { ...query };
    delete facetBase.categoryId;
    delete facetBase.brandId;

    const [categoryCounts, brandCounts] = await Promise.all([
      Product.aggregate([
        { $match: facetBase },
        { $group: { _id: "$categoryId", count: { $sum: 1 } } },
      ]),
      Product.aggregate([{ $match: facetBase }, { $group: { _id: "$brandId", count: { $sum: 1 } } }]),
    ]);

    const categoryCountMap = new Map<string, number>(categoryCounts.map((c: any) => [String(c._id), c.count]));
    const brandCountMap = new Map<string, number>(brandCounts.map((b: any) => [String(b._id), b.count]));
    const categoryMap = new Map(categoryDocs.map((c: any) => [String(c._id), c]));
    const brandMap = new Map(brandDocs.map((b: any) => [String(b._id), b]));

    const items: ProductDto[] = rows.map((row) => {
      const category = row.categoryId ? categoryMap.get(String(row.categoryId)) : null;
      const brand = row.brandId ? brandMap.get(String(row.brandId)) : null;
      return {
        ...toProductDto(row),
        category: category ? { id: String(category._id), name: category.name, slug: category.slug } : null,
        brand: brand ? { id: String(brand._id), name: brand.name, slug: brand.slug } : null,
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      facets: {
        categories: categoryDocs
          .map((c: any) => ({
            id: String(c._id),
            name: c.name,
            slug: c.slug,
            count: categoryCountMap.get(String(c._id)) ?? 0,
          }))
          .filter((c) => c.count > 0),
        brands: brandDocs
          .map((b: any) => ({
            id: String(b._id),
            name: b.name,
            slug: b.slug,
            count: brandCountMap.get(String(b._id)) ?? 0,
          }))
          .filter((b) => b.count > 0),
      },
      error: false,
    };
  } catch (error) {
    console.error("[catalog] catalogue query failed", error);
    return { ...empty, error: true };
  }
}

/** Resolve a product by slug (or id) including its category, brand and related items. */
export async function getProductDetail(idOrSlug: string) {
  try {
    await connectDB();
    const query = isObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() };
    const row = await Product.findOne(query).lean<any>();
    if (!row) return { item: null, related: [] as ProductDto[], error: false };
    if (!row.isActive) return { item: null, related: [] as ProductDto[], error: false };

    const [category, brand] = await Promise.all([
      row.categoryId ? Category.findById(row.categoryId).lean<any>() : Promise.resolve(null),
      row.brandId ? Brand.findById(row.brandId).lean<any>() : Promise.resolve(null),
    ]);

    const relatedQuery: Record<string, any> = { _id: { $ne: row._id }, isActive: true };
    if (row.categoryId) relatedQuery.categoryId = row.categoryId;
    else if (row.brandId) relatedQuery.brandId = row.brandId;

    let related = await Product.find(relatedQuery)
      .sort({ featured: -1, createdAt: -1 })
      .limit(4)
      .select("title slug sku hsnCode images stock moq unit price gstPercent categoryId brandId")
      .lean<any[]>();

    if (related.length === 0) {
      related = await Product.find({ _id: { $ne: row._id }, isActive: true })
        .sort({ featured: -1, createdAt: -1 })
        .limit(4)
        .select("title slug sku hsnCode images stock moq unit price gstPercent categoryId brandId")
        .lean<any[]>();
    }

    return {
      item: {
        ...toProductDto(row),
        category: category ? { id: String(category._id), name: category.name, slug: category.slug } : null,
        brand: brand ? { id: String(brand._id), name: brand.name, slug: brand.slug } : null,
      } as ProductDto,
      related: related.map((r) => toProductDto(r)),
      error: false,
    };
  } catch (error) {
    console.error("[catalog] product detail failed", error);
    return { item: null, related: [] as ProductDto[], error: true };
  }
}

export type { CatalogueQuery, CatalogueFacets };
