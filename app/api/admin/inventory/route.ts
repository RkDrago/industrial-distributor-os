import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { requireAdmin } from "@/lib/auth";
import { asInt, cleanText, ok, serverError } from "@/lib/http";
import { getCommerceSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stock health across the catalogue. Administrator only. */
export async function GET(req: Request) {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    await connectDB();
    const url = new URL(req.url);
    const view = cleanText(url.searchParams.get("view"), 20) || "low";
    const page = asInt(url.searchParams.get("page"), 1, 1, 10_000);
    const pageSize = asInt(url.searchParams.get("pageSize"), 20, 1, 100);
    const settings = await getCommerceSettings();

    const base: Record<string, any> = { isActive: true };
    let query: Record<string, any> = { ...base };
    if (view === "low") query.stock = { $gt: 0, $lte: settings.lowStockThreshold };
    else if (view === "out") query.stock = { $lte: 0 };
    else if (view === "archived") {
      query = { isActive: false };
    }

    const [items, total, summaryRows, categoryDocs] = await Promise.all([
      Product.find(query)
        .sort({ stock: 1, title: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .select("title slug sku hsnCode stock moq unit price.distributorPrice gstPercent categoryId isActive")
        .lean<any[]>(),
      Product.countDocuments(query),
      Product.aggregate([
        { $match: base },
        {
          $group: {
            _id: null,
            products: { $sum: 1 },
            unitsInStock: { $sum: "$stock" },
            retailValue: { $sum: { $multiply: ["$stock", "$price.distributorPrice"] } },
            outOfStock: { $sum: { $cond: [{ $lte: ["$stock", 0] }, 1, 0] } },
            lowStock: {
              $sum: {
                $cond: [{ $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", settings.lowStockThreshold] }] }, 1, 0],
              },
            },
          },
        },
      ]),
      Category.find({ isActive: true }).select("name").lean<any[]>(),
    ]);

    const categoryNames = new Map(categoryDocs.map((c: any) => [String(c._id), c.name]));
    const summary = summaryRows[0] ?? { products: 0, unitsInStock: 0, retailValue: 0, outOfStock: 0, lowStock: 0 };

    return ok({
      items: items.map((p) => ({
        ...p,
        _id: String(p._id),
        categoryName: p.categoryId ? categoryNames.get(String(p.categoryId)) ?? "Uncategorised" : "Uncategorised",
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      view,
      lowStockThreshold: settings.lowStockThreshold,
      summary: {
        products: summary.products ?? 0,
        unitsInStock: summary.unitsInStock ?? 0,
        retailValue: Math.round((summary.retailValue ?? 0) * 100) / 100,
        outOfStock: summary.outOfStock ?? 0,
        lowStock: summary.lowStock ?? 0,
      },
    });
  } catch (error) {
    return serverError("api/admin/inventory:GET", error);
  }
}
