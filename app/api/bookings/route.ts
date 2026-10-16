import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Booking } from "@/models/Booking";
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
import { parseBookingInput } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildBookingNumber(): string {
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const random = Math.floor(Math.random() * 46656)
    .toString(36)
    .toUpperCase()
    .padStart(3, "0");
  return `BKG-${stamp}-${random}`;
}

/** Book a consultation slot (quotation call, site audit, account setup). */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site submissions are not allowed.", 403);

  try {
    sweepRateLimit();
    const limited = rateLimit(`booking:${getClientIp(req)}`, 8, 10 * 60_000);
    if (!limited.allowed) return fail("Too many booking attempts. Please try again later.", 429);

    const body = await req.json().catch(() => null);
    const parsed = parseBookingInput(body);
    if (!parsed.ok) return fail(parsed.errors[0], 422, { errors: parsed.errors });
    const input = parsed.value;

    await connectDB();
    const created = await Booking.create({
      ...input,
      bookingNumber: buildBookingNumber(),
      status: "booked",
      statusHistory: [{ status: "booked", at: new Date(), by: "website", note: "Booking created" }],
    });

    notifyDistributor(
      `New booking ${created.bookingNumber}`,
      emailTable(
        emailRow("Reference", created.bookingNumber) +
          emailRow("Service", input.serviceType) +
          emailRow("Date", input.date) +
          emailRow("Slot", input.slot) +
          emailRow("Name", input.customerName) +
          emailRow("Company", input.companyName || "—") +
          emailRow("Email", input.email) +
          emailRow("Phone", input.phone) +
          emailRow("Notes", input.notes || "—")
      )
    ).catch(() => undefined);

    return NextResponse.json(
      { ok: true, bookingNumber: created.bookingNumber },
      { status: 201, headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return serverError("api/bookings:POST", error);
  }
}

/** Booking list for operations. Administrator only. */
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
      query.$or = [{ bookingNumber: rx }, { customerName: rx }, { email: rx }, { companyName: rx }, { serviceType: rx }];
    }

    const [items, total] = await Promise.all([
      Booking.find(query).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean<any[]>(),
      Booking.countDocuments(query),
    ]);

    return ok({
      items: items.map((b) => ({ ...b, _id: String(b._id) })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    return serverError("api/bookings:GET", error);
  }
}
