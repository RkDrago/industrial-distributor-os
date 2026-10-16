import { connectDB } from "@/lib/db";
import { Inquiry } from "@/models/Inquiry";
import { cleanText, fail, getClientIp, isEmail, isSameOrigin, ok, rateLimit, serverError, sweepRateLimit } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Self-service enquiry lookup for the account area.
 *
 * There is no customer login, so this returns only the enquiries that match a
 * known email address. It is rate limited to blunt address enumeration, and it
 * deliberately exposes no other customer's data.
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site submissions are not allowed.", 403);

  try {
    sweepRateLimit();
    const limited = rateLimit(`inquiry-lookup:${getClientIp(req)}`, 12, 10 * 60_000);
    if (!limited.allowed) return fail("Too many lookups. Please try again shortly.", 429);

    const body = await req.json().catch(() => null);
    const email = cleanText(body?.email, 254).toLowerCase();
    if (!isEmail(email)) return fail("Enter a valid email address.", 422);

    await connectDB();
    const items = await Inquiry.find({ guestEmail: email })
      .sort({ createdAt: -1 })
      .limit(25)
      .select("inquiryNumber productTitle productSku quantity status quoteAmount message createdAt")
      .lean<any[]>();

    return ok({ items: items.map((i) => ({ ...i, _id: String(i._id) })) });
  } catch (error) {
    return serverError("api/inquiries/lookup:POST", error);
  }
}
