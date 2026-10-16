import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Inquiry } from "@/models/Inquiry";
import { requireAdmin } from "@/lib/auth";
import { asInt, cleanText, ok, serverError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Customer directory.
 *
 * There is no customer account store in this system, so the list is *derived*
 * from the orders and enquiries a business has actually placed. Nothing is
 * invented, and businesses with only enquiries are shown as leads.
 */
export async function GET(req: Request) {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    await connectDB();
    const url = new URL(req.url);
    const page = asInt(url.searchParams.get("page"), 1, 1, 10_000);
    const pageSize = asInt(url.searchParams.get("pageSize"), 20, 1, 100);
    const search = cleanText(url.searchParams.get("search"), 80);

    const match: Record<string, any> = {};
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      match.$or = [{ companyName: rx }, { customerEmail: rx }, { contactName: rx }, { gstin: rx }];
    }

    const pipeline: mongoose.PipelineStage[] = [
      { $match: match },
      {
        $group: {
          _id: { $toLower: { $ifNull: ["$customerEmail", "$contactName"] } },
          companyName: { $last: "$companyName" },
          contactName: { $last: "$contactName" },
          email: { $last: "$customerEmail" },
          phone: { $last: "$contactPhone" },
          gstin: { $last: "$gstin" },
          city: { $last: "$shippingAddress.city" },
          state: { $last: "$shippingAddress.state" },
          orderCount: { $sum: 1 },
          value: { $sum: { $ifNull: ["$grandTotal", 0] } },
          lastOrderAt: { $max: "$createdAt" },
        },
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { value: -1, lastOrderAt: -1 } },
    ];

    const [rows, inquiryRows] = await Promise.all([
      Order.aggregate(pipeline),
      Inquiry.aggregate([
        { $match: search ? match : {} },
        {
          $group: {
            _id: { $toLower: "$guestEmail" },
            companyName: { $last: "$guestCompany" },
            contactName: { $last: "$guestName" },
            email: { $last: "$guestEmail" },
            phone: { $last: "$guestPhone" },
            enquiryCount: { $sum: 1 },
            lastEnquiryAt: { $max: "$createdAt" },
          },
        },
      ]),
    ]);

    const inquiryMap = new Map(inquiryRows.filter((r) => r._id).map((r) => [String(r._id), r]));

    // Any enquiry-only contact is a lead worth following up.
    for (const inquiry of inquiryRows) {
      if (!inquiry._id) continue;
      const key = String(inquiry._id);
      if (!rows.some((r) => String(r._id) === key)) {
        rows.push({
          _id: inquiry._id,
          companyName: inquiry.companyName,
          contactName: inquiry.contactName,
          email: inquiry.email,
          phone: inquiry.phone,
          orderCount: 0,
          value: 0,
          lastOrderAt: null,
        } as any);
      }
    }

    const enriched = rows.map((row) => {
      const inquiry = inquiryMap.get(String(row._id));
      return {
        id: String(row._id),
        companyName: row.companyName || row.contactName || row.email || "Unknown",
        contactName: row.contactName || "",
        email: row.email || "",
        phone: row.phone || "",
        gstin: row.gstin || "",
        city: row.city || "",
        state: row.state || "",
        orderCount: row.orderCount ?? 0,
        enquiryCount: inquiry?.enquiryCount ?? 0,
        value: Math.round((row.value ?? 0) * 100) / 100,
        lastActivityAt: row.lastOrderAt ?? inquiry?.lastEnquiryAt ?? null,
        isLead: (row.orderCount ?? 0) === 0,
      };
    });

    enriched.sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return new Date(b.lastActivityAt ?? 0).getTime() - new Date(a.lastActivityAt ?? 0).getTime();
    });

    const total = enriched.length;
    const items = enriched.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

    return ok({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      summary: {
        buyers: enriched.filter((c) => c.orderCount > 0).length,
        leads: enriched.filter((c) => c.isLead).length,
        totalValue: Math.round(enriched.reduce((s, c) => s + c.value, 0) * 100) / 100,
      },
    });
  } catch (error) {
    return serverError("api/admin/customers:GET", error);
  }
}
