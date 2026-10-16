"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Info, MapPin, PackageCheck, Plus, ShieldCheck, ShoppingCart, Trash2 } from "lucide-react";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Checkbox, Input, Textarea } from "@/components/ui/form";
import { useCart } from "@/components/cart/CartProvider";
import { useToast } from "@/components/ui/Toast";
import { usePricedCart } from "@/lib/use-priced-cart";
import { formatINR, formatPrice, formatQty } from "@/lib/format";
import {
  loadAddresses,
  loadCompany,
  newId,
  removeAddress,
  rememberOrder,
  saveAddress,
  saveCompany,
  EMPTY_COMPANY,
  type CompanyProfile,
  type SavedAddress,
} from "@/lib/local-store";

type AddressForm = {
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
};

const EMPTY_ADDRESS: AddressForm = { label: "Delivery address", line1: "", line2: "", city: "", state: "", pincode: "" };

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function CheckoutView() {
  const router = useRouter();
  const { push } = useToast();
  const { items, hydrated, clear } = useCart();
  const { lines, totals, issues, loading, error } = usePricedCart();

  const [company, setCompany] = useState<CompanyProfile>(EMPTY_COMPANY);
  const [billing, setBilling] = useState<AddressForm>(EMPTY_ADDRESS);
  const [delivery, setDelivery] = useState<AddressForm>(EMPTY_ADDRESS);
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [saveThisAddress, setSaveThisAddress] = useState(true);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveProfile, setSaveProfile] = useState(true);

  // Generated once per checkout attempt so a retry after a network blip cannot
  // create a second order.
  const idempotencyKey = useRef<string>("");
  const attempted = useRef(false);

  useEffect(() => {
    idempotencyKey.current = newId();
    setCompany(loadCompany());
    setSavedAddresses(loadAddresses());
  }, []);

  useEffect(() => {
    if (sameAsBilling) return;
    // Keep the delivery form populated when the user unsets the checkbox.
    setDelivery((current) => (current.line1 ? current : { ...billing, label: "Delivery address" }));
  }, [sameAsBilling, billing]);

  const effectiveDelivery = sameAsBilling ? { ...billing, label: "Delivery address" } : delivery;

  const subtotalCount = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);

  function validate() {
    const next: Record<string, string> = {};
    if (company.contactName.trim().length < 2) next.contactName = "Enter the name of the person placing the order.";
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(company.email.trim())) next.email = "Enter a valid email address.";
    if (company.phone.replace(/[^\d]/g, "").length < 8) next.phone = "Enter a valid contact number.";
    if (company.companyName.trim().length < 2) next.companyName = "Company name is required for a business order.";
    if (company.gstin.trim() && !GSTIN_PATTERN.test(company.gstin.trim().toUpperCase())) {
      next.gstin = "GSTIN should look like 27AABCS1429P1ZV.";
    }

    const checkAddress = (address: AddressForm, prefix: string) => {
      if (!address.line1.trim()) next[`${prefix}.line1`] = "Address line 1 is required.";
      if (!address.city.trim()) next[`${prefix}.city`] = "City is required.";
      if (!address.state.trim()) next[`${prefix}.state`] = "State is required.";
      if (!/^[0-9]{6}$/.test(address.pincode.trim())) next[`${prefix}.pincode`] = "Enter a 6-digit PIN code.";
    };

    checkAddress(billing, "billing");
    if (!sameAsBilling) checkAddress(effectiveDelivery, "delivery");

    if (!items.length) next.items = "Your basket is empty.";
    if (issues.length) next.items = "Resolve the quantity warnings in your basket before placing the order.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (submitting) return;

    if (!validate()) {
      setFormError("Please correct the highlighted fields and try again.");
      const firstInvalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      firstInvalid?.focus();
      firstInvalid?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    attempted.current = true;
    setSubmitting(true);

    const profile: CompanyProfile = {
      companyName: company.companyName.trim(),
      contactName: company.contactName.trim(),
      email: company.email.trim(),
      phone: company.phone.trim(),
      gstin: company.gstin.trim().toUpperCase(),
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: profile.contactName,
          customerEmail: profile.email,
          contactPhone: profile.phone,
          companyName: profile.companyName,
          gstin: profile.gstin,
          notes,
          paymentMethod: "enquiry",
          idempotencyKey: idempotencyKey.current,
          billingAddress: {
            label: "Billing address",
            line1: billing.line1,
            line2: billing.line2,
            city: billing.city,
            state: billing.state,
            pincode: billing.pincode,
            country: "India",
          },
          shippingAddress: {
            label: "Delivery address",
            line1: effectiveDelivery.line1,
            line2: effectiveDelivery.line2,
            city: effectiveDelivery.city,
            state: effectiveDelivery.state,
            pincode: effectiveDelivery.pincode,
            country: "India",
          },
          items: items.map((item) => ({ productId: item.productId, qty: item.qty })),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          typeof data?.error === "string" ? data.error : "We could not place this order. Please try again.";
        setFormError(message);
        setSubmitting(false);
        // A new key so a corrected retry is a genuinely new submission.
        idempotencyKey.current = newId();
        push({ tone: "error", title: "Order not placed", description: message });
        return;
      }

      const order = data.order;
      if (saveProfile) saveCompany(profile);
      if (saveThisAddress && billing.line1) {
        const address: SavedAddress = {
          id: newId(),
          label: billing.label || "Delivery address",
          line1: billing.line1,
          line2: billing.line2,
          city: billing.city,
          state: billing.state,
          pincode: billing.pincode,
        };
        saveAddress(address);
      }

      rememberOrder({
        orderNumber: order.orderNumber,
        id: order.id,
        total: order.grandTotal,
        itemCount: subtotalCount,
        at: new Date().toISOString(),
        email: profile.email,
      });

      clear();
      push({
        tone: "success",
        title: `Order ${order.orderNumber} placed`,
        description: "We have emailed the details to our sales team.",
      });
      router.push("/checkout/success");
    } catch {
      setFormError(
        "We could not reach the server. Check your connection and try again — your order has not been placed twice."
      );
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (items.length === 0 && !attempted.current) {
    return (
      <EmptyState
        icon={<ShoppingCart size={22} />}
        title="Nothing to check out"
        description="Your basket is empty. Add products from the catalogue, or send us a bulk requirement for a quotation."
        action={
          <>
            <Link href="/products" className="btn btn-primary">
              Explore products
            </Link>
            <Link href="/quote" className="btn btn-outline">
              Request a bulk quote
            </Link>
          </>
        }
      />
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="space-y-6">
        {formError && (
          <Alert tone="danger" title="We couldn't place this order">
            {formError}
          </Alert>
        )}
        {error && (
          <Alert tone="warning" title="Prices are an estimate">
            {error}
          </Alert>
        )}

        {/* ------------------------------------------------------ business details */}
        <section className="rounded-card border border-line bg-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-navy-900">Business details</h2>
              <p className="mt-1 text-xs leading-5 text-muted">
                Used on your invoice. Your GSTIN lets us raise a tax invoice in your company name.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Company name"
              required
              value={company.companyName}
              onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
              error={errors.companyName}
              autoComplete="organization"
              placeholder="Shakti Fabrication Works"
            />
            <Input
              label="GSTIN"
              optional
              value={company.gstin}
              onChange={(e) => setCompany({ ...company, gstin: e.target.value.toUpperCase() })}
              error={errors.gstin}
              hint="Leave blank if you do not have one."
              placeholder="27AABCS1429P1ZV"
              maxLength={15}
            />
            <Input
              label="Contact name"
              required
              value={company.contactName}
              onChange={(e) => setCompany({ ...company, contactName: e.target.value })}
              error={errors.contactName}
              autoComplete="name"
            />
            <Input
              label="Phone number"
              required
              type="tel"
              value={company.phone}
              onChange={(e) => setCompany({ ...company, phone: e.target.value })}
              error={errors.phone}
              autoComplete="tel"
              placeholder="+91 98200 12345"
            />
            <div className="sm:col-span-2">
              <Input
                label="Email address"
                required
                type="email"
                value={company.email}
                onChange={(e) => setCompany({ ...company, email: e.target.value })}
                error={errors.email}
                hint="Order confirmation and tracking details are sent here."
                autoComplete="email"
              />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- addresses */}
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
            <MapPin size={17} className="text-brand-600" />
            Billing &amp; delivery
          </h2>

          {savedAddresses.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-navy-700">Use a saved address</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {savedAddresses.map((address) => (
                  <button
                    key={address.id}
                    type="button"
                    onClick={() =>
                      setBilling({
                        label: address.label,
                        line1: address.line1,
                        line2: address.line2,
                        city: address.city,
                        state: address.state,
                        pincode: address.pincode,
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-chip border border-line bg-canvas px-3 py-2 text-xs font-medium text-navy-700 transition hover:border-lineStrong"
                  >
                    <MapPin size={13} className="text-brand-600" />
                    <span className="max-w-[200px] truncate">
                      {address.label}: {address.line1}, {address.city}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-navy-900">Billing address</legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Address line 1"
                  required
                  value={billing.line1}
                  onChange={(e) => setBilling({ ...billing, line1: e.target.value })}
                  error={errors["billing.line1"]}
                  autoComplete="address-line1"
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  label="Address line 2"
                  optional
                  value={billing.line2}
                  onChange={(e) => setBilling({ ...billing, line2: e.target.value })}
                  autoComplete="address-line2"
                  placeholder="Plot, building, area"
                />
              </div>
              <Input
                label="City"
                required
                value={billing.city}
                onChange={(e) => setBilling({ ...billing, city: e.target.value })}
                error={errors["billing.city"]}
                autoComplete="address-level2"
              />
              <Input
                label="State"
                required
                value={billing.state}
                onChange={(e) => setBilling({ ...billing, state: e.target.value })}
                error={errors["billing.state"]}
                autoComplete="address-level1"
              />
              <Input
                label="PIN code"
                required
                inputMode="numeric"
                maxLength={6}
                value={billing.pincode}
                onChange={(e) => setBilling({ ...billing, pincode: e.target.value.replace(/[^\d]/g, "") })}
                error={errors["billing.pincode"]}
                autoComplete="postal-code"
              />
            </div>
          </fieldset>

          <div className="mt-5 border-t border-line pt-5">
            <Checkbox
              label="Deliver to the billing address"
              checked={sameAsBilling}
              onChange={(e) => setSameAsBilling(e.target.checked)}
            />

            {!sameAsBilling && (
              <fieldset className="mt-5">
                <legend className="text-sm font-semibold text-navy-900">Delivery address</legend>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Input
                      label="Address line 1"
                      required
                      value={delivery.line1}
                      onChange={(e) => setDelivery({ ...delivery, line1: e.target.value })}
                      error={errors["delivery.line1"]}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      label="Address line 2"
                      optional
                      value={delivery.line2}
                      onChange={(e) => setDelivery({ ...delivery, line2: e.target.value })}
                    />
                  </div>
                  <Input
                    label="City"
                    required
                    value={delivery.city}
                    onChange={(e) => setDelivery({ ...delivery, city: e.target.value })}
                    error={errors["delivery.city"]}
                  />
                  <Input
                    label="State"
                    required
                    value={delivery.state}
                    onChange={(e) => setDelivery({ ...delivery, state: e.target.value })}
                    error={errors["delivery.state"]}
                  />
                  <Input
                    label="PIN code"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    value={delivery.pincode}
                    onChange={(e) => setDelivery({ ...delivery, pincode: e.target.value.replace(/[^\d]/g, "") })}
                    error={errors["delivery.pincode"]}
                  />
                </div>
              </fieldset>
            )}
          </div>

          <div className="mt-4">
            <Textarea
              label="Order notes"
              optional
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Site name, required delivery window, purchase order number…"
              rows={3}
              maxLength={1000}
            />
          </div>
        </section>

        {/* ------------------------------------------------------- payment method */}
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-navy-900">How payment works</h2>
          <div className="mt-3 flex items-start gap-3 rounded-card border border-brand-200 bg-brand-50 p-3.5">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand-600" />
            <div className="text-sm">
              <p className="font-semibold text-brand-800">Order on account — we confirm, then invoice you</p>
              <p className="mt-1 text-[13px] leading-5 text-brand-800/90">
                Placing this order sends your requirement to our sales team. We confirm availability, the applicable
                quantity rate and delivery, then raise a GST invoice for payment by your normal business process.
              </p>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted">
            <Info size={14} className="mt-0.5 shrink-0" />
            Online card or UPI payment is not enabled on this deployment. Nothing is charged automatically when you
            submit this order.
          </p>
        </section>

        {/* -------------------------------------------------------- order review */}
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
            <PackageCheck size={17} className="text-brand-600" />
            Review your items
          </h2>
          <ul className="mt-4 divide-y divide-line">
            {(lines.length ? lines : []).map((line) => (
              <li key={line.productId} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy-900">{line.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    SKU {line.sku} · {formatPrice(line.unitPrice ?? line.price)} × {formatQty(line.qty)}
                    {line.gstPercent ? ` · GST ${line.gstPercent}%` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-navy-900">
                  {formatINR(line.taxable ?? line.lineTotal)}
                </p>
              </li>
            ))}
          </ul>
          {loading && <p className="mt-2 text-xs text-muted">Confirming prices with the catalogue…</p>}
          {issues.length > 0 && (
            <Alert tone="warning" className="mt-4" title="Quantity warnings">
              <ul className="space-y-1">
                {issues.map((issue, index) => (
                  <li key={`${issue.productId}-${index}`} className="flex items-start gap-2">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    {issue.message}
                  </li>
                ))}
              </ul>
              <Link href="/cart" className="btn btn-outline btn-sm mt-3">
                Fix in basket
              </Link>
            </Alert>
          )}
        </section>
      </div>

      {/* -------------------------------------------------------------- summary */}
      <aside className="lg:sticky lg:top-32">
        <div className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-navy-900">Order total</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Subtotal (excl. GST)</dt>
              <dd className="font-medium tabular-nums text-navy-900">{formatINR(totals.subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">GST</dt>
              <dd className="font-medium tabular-nums text-navy-900">{formatINR(totals.gstTotal)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Delivery</dt>
              <dd className="font-medium tabular-nums text-navy-900">
                {totals.deliveryCharge > 0 ? formatINR(totals.deliveryCharge) : "No charge configured"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
              <dt className="font-semibold text-navy-900">Total</dt>
              <dd className="text-lg font-bold tabular-nums text-navy-900">{formatINR(totals.grandTotal)}</dd>
            </div>
          </dl>

          <div className="mt-4 rounded-chip bg-canvas p-3 text-xs leading-5 text-muted">
            Total for {subtotalCount} unit{subtotalCount === 1 ? "" : "s"} across {items.length} product
            {items.length === 1 ? "" : "s"}. Figures are recalculated on our server when you submit.
          </div>

          <Checkbox
            className="mt-4"
            label="Save these details on this device for next time"
            checked={saveProfile}
            onChange={(e) => setSaveProfile(e.target.checked)}
            hint="Stored in your browser only. You can clear it from your account page."
          />
          <Checkbox
            className="mt-3"
            label="Save this delivery address"
            checked={saveThisAddress}
            onChange={(e) => setSaveThisAddress(e.target.checked)}
          />

          <button type="submit" className="btn btn-primary btn-lg btn-block mt-5" disabled={submitting} aria-busy={submitting || undefined}>
            {submitting ? "Placing order…" : "Place order"}
          </button>

          <p className="mt-3 text-xs leading-5 text-muted">
            By placing this order you are requesting supply at the listed quantity rate. Our team confirms stock and
            delivery before invoicing.
          </p>
        </div>

        {savedAddresses.length > 0 && (
          <div className="mt-4 rounded-card border border-line bg-surface p-4">
            <p className="text-xs font-semibold text-navy-700">Saved addresses</p>
            <ul className="mt-2 space-y-2">
              {savedAddresses.map((address) => (
                <li key={address.id} className="flex items-start justify-between gap-3 text-xs text-muted">
                  <span className="min-w-0">
                    <span className="block font-medium text-navy-800">{address.label}</span>
                    {address.line1}, {address.city} {address.pincode}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSavedAddresses(removeAddress(address.id))}
                    className="shrink-0 rounded p-1 text-navy-300 transition hover:text-danger"
                    aria-label={`Remove saved address ${address.label}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
            <Link href="/account/addresses" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
              <Plus size={13} />
              Manage addresses
            </Link>
          </div>
        )}
      </aside>
    </form>
  );
}
