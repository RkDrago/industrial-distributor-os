import { asInt, cleanText, isEmail, isGstin, isObjectId, isPhone } from "./http";
import { normaliseSlabs } from "./pricing";

/**
 * Request-body validation.
 *
 * Every write path runs through one of these parsers so that nothing
 * unvalidated reaches Mongoose, and so the shape stored in the database does
 * not depend on what a browser decided to send.
 */

/**
 * Result of a payload parse.
 *
 * Modelled as a single object rather than a discriminated union on purpose:
 * this project compiles with `strict: false`, where boolean literal types are
 * widened and `if (!result.ok)` would not narrow the union for the compiler.
 * `value` is only meaningful when `ok` is true, and `errors` only when it is
 * false — `succeed`/`reject` below are the only ways to build one.
 */
export type Parsed<T> = { ok: boolean; value: T; errors: string[] };

const MAX_QTY = 100000;
const MAX_PRICE = 100_000_000;

function reject<T>(errors: string[]): Parsed<T> {
  return { ok: false, value: undefined as unknown as T, errors };
}

function succeed<T>(value: T): Parsed<T> {
  return { ok: true, value, errors: [] };
}

const fail = reject;

/* ---------------------------------------------------------------- address */
export type ParsedAddress = {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export function parseAddress(raw: any, { required = true }: { required?: boolean } = {}): Parsed<ParsedAddress> {
  if (!raw || typeof raw !== "object") {
    return required
      ? reject<ParsedAddress>(["A delivery address is required."])
      : succeed<ParsedAddress>({ line1: "", city: "", state: "", pincode: "", country: "India" });
  }
  const value: ParsedAddress = {
    label: cleanText(raw.label, 60) || undefined,
    line1: cleanText(raw.line1, 180),
    line2: cleanText(raw.line2, 180) || undefined,
    city: cleanText(raw.city, 80),
    state: cleanText(raw.state, 80),
    pincode: cleanText(raw.pincode, 12),
    country: cleanText(raw.country, 80) || "India",
  };
  const errors: string[] = [];
  if (required) {
    if (!value.line1) errors.push("Address line 1 is required.");
    if (!value.city) errors.push("City is required.");
    if (!value.state) errors.push("State is required.");
    if (!/^[0-9]{6}$/.test(value.pincode)) errors.push("A valid 6-digit PIN code is required.");
  }
  return errors.length ? reject<ParsedAddress>(errors) : succeed(value);
}

/* ---------------------------------------------------------------- product */
export type ParsedProduct = {
  title?: string;
  sku?: string;
  hsnCode?: string;
  categoryId?: string | null;
  brandId?: string | null;
  description?: string;
  shortDescription?: string;
  specifications?: { key: string; value: string }[];
  images?: string[];
  stock?: number;
  moq?: number;
  unit?: string;
  price?: { mrp: number; distributorPrice: number; bulkSlabs: { minQty: number; price: number }[] };
  gstPercent?: number;
  featured?: boolean;
  isActive?: boolean;
};

export function parseProductInput(body: any, { partial = false }: { partial?: boolean } = {}): Parsed<ParsedProduct> {
  const errors: string[] = [];
  const out: ParsedProduct = {};

  const has = (key: string) => body?.[key] !== undefined && body?.[key] !== null;

  if (!partial || has("title")) {
    const title = cleanText(body?.title, 180);
    if (title.length < 3) errors.push("Product name must be at least 3 characters.");
    else out.title = title;
  }

  if (!partial || has("sku")) {
    const sku = cleanText(body?.sku, 40).toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9\-_.]{1,38}$/.test(sku)) {
      errors.push("SKU must be 2–39 characters using letters, numbers, dash, dot or underscore.");
    } else out.sku = sku;
  }

  if (has("hsnCode")) {
    const hsn = cleanText(body.hsnCode, 12);
    if (hsn && !/^[0-9]{4,8}$/.test(hsn)) errors.push("HSN code must be 4–8 digits.");
    else out.hsnCode = hsn;
  } else if (!partial) {
    out.hsnCode = "";
  }

  if (has("categoryId")) {
    const id = cleanText(body.categoryId, 40);
    if (id && !isObjectId(id)) errors.push("Select a valid category.");
    else out.categoryId = id || null;
  } else if (!partial) out.categoryId = null;

  if (has("brandId")) {
    const id = cleanText(body.brandId, 40);
    if (id && !isObjectId(id)) errors.push("Select a valid brand.");
    else out.brandId = id || null;
  } else if (!partial) out.brandId = null;

  if (has("description")) out.description = cleanText(body.description, 4000);
  else if (!partial) out.description = "";
  if (has("shortDescription")) out.shortDescription = cleanText(body.shortDescription, 320);
  else if (!partial) out.shortDescription = "";

  if (has("specifications")) {
    if (!Array.isArray(body.specifications)) errors.push("Specifications must be a list of key/value pairs.");
    else {
      const specs = body.specifications
        .map((s: any) => ({ key: cleanText(s?.key, 60), value: cleanText(s?.value, 160) }))
        .filter((s: any) => s.key && s.value)
        .slice(0, 40);
      out.specifications = specs;
    }
  } else if (!partial) out.specifications = [];

  if (has("images")) {
    if (!Array.isArray(body.images)) errors.push("Images must be a list of URLs.");
    else {
      const images = body.images
        .map((u: any) => cleanText(u, 500))
        .filter((u: string) => /^https?:\/\//i.test(u))
        .slice(0, 8);
      if (body.images.length && !images.length) errors.push("Image URLs must start with http:// or https://.");
      out.images = images;
    }
  } else if (!partial) out.images = [];

  if (has("stock")) {
    const stock = Number(body.stock);
    if (!Number.isFinite(stock) || stock < 0 || stock > 10_000_000) errors.push("Stock must be a number of 0 or more.");
    else out.stock = Math.floor(stock);
  } else if (!partial) out.stock = 0;

  if (has("moq")) {
    const moq = Number(body.moq);
    if (!Number.isFinite(moq) || moq < 1 || moq > MAX_QTY) errors.push("Minimum order quantity must be 1 or more.");
    else out.moq = Math.floor(moq);
  } else if (!partial) out.moq = 1;

  if (has("unit")) out.unit = cleanText(body.unit, 40) || "per piece";
  else if (!partial) out.unit = "per piece";

  if (has("gstPercent")) {
    const gst = Number(body.gstPercent);
    if (!Number.isFinite(gst) || gst < 0 || gst > 28) errors.push("GST percentage must be between 0 and 28.");
    else out.gstPercent = gst;
  } else if (!partial) out.gstPercent = 18;

  if (has("featured")) out.featured = Boolean(body.featured);
  else if (!partial) out.featured = false;

  if (has("isActive")) out.isActive = Boolean(body.isActive);
  else if (!partial) out.isActive = true;

  // Pricing: distributorPrice is the only figure the storefront sells at.
  const priceRaw = body?.price ?? {};
  const priceTouched = has("price") || !partial;
  if (priceTouched) {
    const mrp = Number(priceRaw.mrp ?? 0);
    const distributorPrice = Number(priceRaw.distributorPrice ?? 0);
    if (!Number.isFinite(distributorPrice) || distributorPrice <= 0) {
      errors.push("Distributor price must be greater than zero.");
    }
    if (distributorPrice > MAX_PRICE) errors.push("Distributor price is unrealistically high.");
    if (!Number.isFinite(mrp) || mrp < 0) errors.push("MRP must be zero or more.");
    if (mrp > 0 && distributorPrice > mrp) {
      // Not fatal by itself, but almost always a data-entry mistake.
      errors.push("Distributor price cannot be higher than the MRP.");
    }

    const slabs = normaliseSlabs(priceRaw.bulkSlabs);
    if (Array.isArray(priceRaw.bulkSlabs) && priceRaw.bulkSlabs.length) {
      const seen = new Set<number>();
      for (const slab of slabs) {
        if (slab.minQty < 2 || slab.minQty > MAX_QTY) {
          errors.push("Bulk tier quantities must be between 2 and 100,000.");
          break;
        }
        if (slab.price <= 0) {
          errors.push("Bulk tier prices must be greater than zero.");
          break;
        }
        if (slab.price > distributorPrice) {
          errors.push("Bulk tier prices must not be higher than the base distributor price.");
          break;
        }
        if (seen.has(slab.minQty)) {
          errors.push("Bulk tiers cannot repeat the same quantity.");
          break;
        }
        seen.add(slab.minQty);
      }
    }

    out.price = { mrp: Math.max(0, mrp || 0), distributorPrice, bulkSlabs: slabs };
  }

  return errors.length ? reject<ParsedProduct>(errors) : succeed(out);
}

/* ------------------------------------------------------------------ order */
export type ParsedOrder = {
  contactName: string;
  customerEmail: string;
  contactPhone: string;
  companyName: string;
  gstin: string;
  notes: string;
  paymentMethod: string;
  idempotencyKey: string | null;
  billingAddress: ParsedAddress;
  shippingAddress: ParsedAddress;
  items: { productId: string; qty: number }[];
};

const PAYMENT_METHODS = new Set(["enquiry", "bank_transfer", "credit", "cod"]);

export function parseOrderInput(body: any): Parsed<ParsedOrder> {
  const errors: string[] = [];

  const contactName = cleanText(body?.contactName, 120);
  if (contactName.length < 2) errors.push("Please provide the name of the person placing the order.");

  const customerEmail = cleanText(body?.customerEmail, 254).toLowerCase();
  if (!isEmail(customerEmail)) errors.push("A valid email address is required.");

  const contactPhone = cleanText(body?.contactPhone, 24);
  if (!isPhone(contactPhone)) errors.push("A valid contact phone number is required.");

  const companyName = cleanText(body?.companyName, 160);
  if (companyName.length < 2) errors.push("Company name is required for a business order.");

  const gstin = cleanText(body?.gstin, 20).toUpperCase();
  if (gstin && !isGstin(gstin)) errors.push("GSTIN format looks incorrect (for example 27AABCS1429P1ZV).");

  const paymentMethodRaw = cleanText(body?.paymentMethod, 40) || "enquiry";
  const paymentMethod = PAYMENT_METHODS.has(paymentMethodRaw) ? paymentMethodRaw : "enquiry";

  if (!Array.isArray(body?.items) || !body.items.length) {
    errors.push("Add at least one product before placing an order.");
  } else if (body.items.length > 50) {
    errors.push("A single order cannot contain more than 50 products.");
  }

  const items: { productId: string; qty: number }[] = [];
  if (Array.isArray(body?.items)) {
    for (const raw of body.items) {
      if (!isObjectId(raw?.productId)) {
        errors.push("One of the products in your basket is no longer valid. Please remove it and try again.");
        continue;
      }
      const qty = asInt(raw?.qty, 0, 0, MAX_QTY);
      if (qty < 1) {
        errors.push("Every product needs a quantity of at least 1.");
        continue;
      }
      items.push({ productId: String(raw.productId), qty });
    }
  }

  const billing = parseAddress(body?.billingAddress);
  const shipping = parseAddress(body?.shippingAddress);
  if (!billing.ok) errors.push(...billing.errors.map((e) => `Billing address: ${e}`));
  if (!shipping.ok) errors.push(...shipping.errors.map((e) => `Delivery address: ${e}`));

  const idempotencyKeyRaw = cleanText(body?.idempotencyKey, 80);
  const idempotencyKey = /^[A-Za-z0-9_-]{8,80}$/.test(idempotencyKeyRaw) ? idempotencyKeyRaw : null;

  if (errors.length) return reject<ParsedOrder>(errors);

  return succeed<ParsedOrder>({
    contactName,
    customerEmail,
    contactPhone,
    companyName,
    gstin,
    notes: cleanText(body?.notes, 1000),
    paymentMethod,
    idempotencyKey,
    billingAddress: billing.value,
    shippingAddress: shipping.value,
    items,
  });
}

/* ---------------------------------------------------------------- enquiry */
export type ParsedInquiry = {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCompany: string;
  guestGstin: string;
  productId: string | null;
  productTitle: string;
  productSku: string;
  quantity: number;
  message: string;
};

export function parseInquiryInput(body: any): Parsed<ParsedInquiry> {
  const errors: string[] = [];

  const guestName = cleanText(body?.guestName, 120);
  if (guestName.length < 2) errors.push("Please enter your name.");

  const guestEmail = cleanText(body?.guestEmail, 254).toLowerCase();
  if (!isEmail(guestEmail)) errors.push("A valid work email address is required.");

  const guestPhone = cleanText(body?.guestPhone, 24);
  if (!isPhone(guestPhone)) errors.push("A valid phone number is required.");

  const productTitle = cleanText(body?.productTitle, 200);
  if (productTitle.length < 2) errors.push("Tell us which product you are asking about.");

  const quantity = asInt(body?.quantity, 1, 1, MAX_QTY);

  const guestGstin = cleanText(body?.guestGstin, 20).toUpperCase();
  if (guestGstin && !isGstin(guestGstin)) errors.push("GSTIN format looks incorrect.");

  const productIdRaw = cleanText(body?.productId, 40);
  const productId = isObjectId(productIdRaw) ? productIdRaw : null;

  if (errors.length) return reject<ParsedInquiry>(errors);

  return succeed<ParsedInquiry>({
    guestName,
    guestEmail,
    guestPhone,
    guestCompany: cleanText(body?.guestCompany, 160),
    guestGstin,
    productId,
    productTitle,
    productSku: cleanText(body?.productSku, 40),
    quantity,
    message: cleanText(body?.message, 2000),
  });
}

/* ---------------------------------------------------------------- booking */
export type ParsedBooking = {
  serviceType: string;
  customerName: string;
  email: string;
  phone: string;
  companyName: string;
  date: string;
  slot: string;
  notes: string;
};

export function parseBookingInput(body: any): Parsed<ParsedBooking> {
  const errors: string[] = [];

  const serviceType = cleanText(body?.serviceType, 120);
  if (serviceType.length < 2) errors.push("Choose the type of appointment you need.");

  const customerName = cleanText(body?.customerName, 120);
  if (customerName.length < 2) errors.push("Please enter your name.");

  const email = cleanText(body?.email, 254).toLowerCase();
  if (!isEmail(email)) errors.push("A valid email address is required.");

  const phone = cleanText(body?.phone, 24);
  if (!isPhone(phone)) errors.push("A valid phone number is required.");

  const date = cleanText(body?.date, 20);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push("Choose a preferred date.");

  if (errors.length) return reject<ParsedBooking>(errors);

  return succeed<ParsedBooking>({
    serviceType,
    customerName,
    email,
    phone,
    companyName: cleanText(body?.companyName, 160),
    date,
    slot: cleanText(body?.slot, 40) || "Any time",
    notes: cleanText(body?.notes, 1000),
  });
}

/* ------------------------------------------------------------- pagination */
export function parsePagination(url: URL, defaultPageSize = 12) {
  const page = asInt(url.searchParams.get("page"), 1, 1, 10_000);
  const pageSize = asInt(url.searchParams.get("pageSize"), defaultPageSize, 1, 60);
  return { page, pageSize, skip: (page - 1) * pageSize };
}
