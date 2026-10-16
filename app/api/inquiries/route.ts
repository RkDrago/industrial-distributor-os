import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Inquiry } from "@/models/Inquiry";
import { requireAdmin } from "@/lib/auth";
import { notifyDistributor, emailRow, emailTable } from "@/lib/email";
import {
  asInt,
  cleanText,
  fail,
  getClientIp,
  isSameOrigin,
  ok,
  rateLimit,
  serverError,
  sweepRateLimit,
} from "@/lib/http";
import { parseInquiryInput } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildInquiryNumber(): string {
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const random = Math.floor(Math.random() * 46656)
    .toString(36)
    .toUpperCase()
    .padStart(3, "0");
  return `ENQ-${stamp}-${random}`;
}

/** Submit an enquiry. Open to guests — this is the primary lead capture path. */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site submissions are not allowed.", 403);

  try {
    sweepRateLimit();
    const limited = rateLimit(`inquiry:${getClientIp(req)}`, 8, 10 * 60_000);
    if (!limited.allowed) {
      return fail("You have sent several enquiries already. Please call us if it is urgent.", 429);
    }

    const body = await req.json().catch(() => null);
    const parsed = parseInquiryInput(body);
    if (!parsed.ok) return fail(parsed.errors[0], 422, { errors: parsed.errors });
    const input = parsed.value;

    await connectDB();
    const created = await Inquiry.create({
      ...input,
      inquiryNumber: buildInquiryNumber(),
      status: "new",
      statusHistory: [{ status: "new", at: new Date(), by: "website", note: "Enquiry submitted" }],
    });

    notifyDistributor(
      `New enquiry ${created.inquiryNumber}: ${input.productTitle}`,
      emailTable(
        emailRow("Reference", created.inquiryNumber) +
          emailRow("Product", input.productTitle) +
          emailRow("SKU", input.productSku || "—") +
          emailRow("Quantity", input.quantity) +
          emailRow("Name", input.guestName) +
          emailRow("Company", input.guestCompany || "—") +
          emailRow("Email", input.guestEmail) +
          emailRow("Phone", input.guestPhone) +
          emailRow("Message", input.message || "—")
      )
    ).catch(() => undefined);

    return NextResponse.json(
      { ok: true, inquiryNumber: created.inquiryNumber, id: String(created._id) },
      { status: 201, headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return serverError("api/inquiries:POST", error);
  }
}

/** Enquiry list for operations. Administrator only. */
export async function GET(req: Request) {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    await connectDB();
    const url = new URL(req.url);
    const page = asInt(url.searchParams.get("page"), 1, 1, 10_000);
    const pageSize = asInt(url.searchParams.get("pageSize"), 20, 1, 100);
    const status = cleanText(url.searchParams.get("status"), 20);
    const search = cleanText(url.searchParams.get("search"), 80);

    const query: Record<string, any> = {};
    if (status && status !== "all") query.status = status;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ productTitle: rx }, { guestName: rx }, { guestEmail: rx }, { guestCompany: rx }, { inquiryNumber: rx }];
    }

    const [items, total, statusCounts] = await Promise.all([
      Inquiry.find(query).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean<any[]>(),
      Inquiry.countDocuments(query),
      Inquiry.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    return ok({
      items: items.map((i) => ({ ...i, _id: String(i._id) })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      statusCounts: Object.fromEntries(statusCounts.map((s: any) => [String(s._id), s.count])),
    });
  } catch (error) {
    return serverError("api/inquiries:GET", error);
  }
}
