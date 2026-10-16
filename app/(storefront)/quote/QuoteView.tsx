"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, PackageSearch, Send } from "lucide-react";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/Toast";
import { loadCompany, saveCompany, type CompanyProfile } from "@/lib/local-store";

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * Bulk quotation request.
 *
 * Writes an enquiry the operations team can act on and returns a reference
 * number straight away — the same record that appears in the admin inbox, not
 * a separate "contact us" black hole.
 */
export function QuoteView({
  prefillProduct = "",
  prefillSku = "",
  prefillQty = "",
}: {
  prefillProduct?: string;
  prefillSku?: string;
  prefillQty?: string;
}) {
  const { push } = useToast();
  const [company, setCompany] = useState<CompanyProfile>({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    gstin: "",
  });
  const [requirement, setRequirement] = useState(prefillProduct ? `${prefillProduct} (SKU ${prefillSku})` : "");
  const [quantity, setQuantity] = useState(prefillQty);
  const [deliveryCity, setDeliveryCity] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    if (prefillProduct) {
      setRequirement(`${prefillProduct}${prefillSku ? ` (SKU ${prefillSku})` : ""}`);
    }
    if (prefillQty) setQuantity(prefillQty);
  }, [prefillProduct, prefillSku, prefillQty]);

  useEffect(() => {
    const stored = loadCompany();
    setCompany((current) => ({ ...stored, ...current }));
  }, []);

  function validate() {
    const next: Record<string, string> = {};
    if (company.companyName.trim().length < 2) next.companyName = "Company name is required.";
    if (company.contactName.trim().length < 2) next.contactName = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(company.email.trim())) next.email = "Enter a valid work email address.";
    if (company.phone.replace(/[^\d]/g, "").length < 8) next.phone = "Enter a valid phone number.";
    if (company.gstin.trim() && !GSTIN_PATTERN.test(company.gstin.trim().toUpperCase())) {
      next.gstin = "GSTIN should look like 27AABCS1429P1ZV.";
    }
    if (requirement.trim().length < 3) next.requirement = "Tell us what you need a quotation for.";
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 1) next.quantity = "Enter the quantity you need.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (submitting) return;
    if (!validate()) {
      setFormError("Please correct the highlighted fields.");
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const composed = [
        `Bulk quotation request.`,
        deliveryCity.trim() ? `Delivery location: ${deliveryCity.trim()}.` : "",
        message.trim(),
      ]
        .filter(Boolean)
        .join(" ");

      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: company.contactName.trim(),
          guestEmail: company.email.trim(),
          guestPhone: company.phone.trim(),
          guestCompany: company.companyName.trim(),
          guestGstin: company.gstin.trim().toUpperCase(),
          productTitle: requirement.trim(),
          productSku: prefillSku,
          quantity: Number(quantity) || 1,
          message: composed,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message_ = typeof data?.error === "string" ? data.error : "We could not send your request.";
        setFormError(message_);
        push({ tone: "error", title: "Request not sent", description: message_ });
        return;
      }

      saveCompany({
        companyName: company.companyName.trim(),
        contactName: company.contactName.trim(),
        email: company.email.trim(),
        phone: company.phone.trim(),
        gstin: company.gstin.trim().toUpperCase(),
      });
      setReference(data.inquiryNumber ?? "received");
      push({ tone: "success", title: "Quotation request sent", description: "Our team will respond shortly." });
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (reference) {
    return (
      <div className="rounded-card border border-brand-200 bg-success-soft p-6 sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-brand-600">
          <CheckCircle2 size={24} />
        </span>
        <h2 className="mt-4 text-xl font-bold text-navy-900">Your quotation request has been sent</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-navy-600">
          Reference <span className="font-semibold text-navy-900">{reference}</span>. Our sales team has been notified
          and will confirm availability, the rate that applies at your quantity, applicable GST and the delivery
          arrangement.
        </p>
        <ul className="mt-5 space-y-2 text-sm text-navy-700">
          <li>• We have recorded the requirement against a reference number you can quote in follow-ups.</li>
          <li>• You will receive our response at {company.email}.</li>
          <li>• Stock and lead time are confirmed before you commit to anything.</li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/products" className="btn btn-primary">
            Continue browsing products
          </Link>
          <Link href="/account/inquiries" className="btn btn-outline">
            View my enquiries
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <div className="space-y-6">
        {formError && (
          <Alert tone="danger" title="We couldn't send this request">
            {formError}
          </Alert>
        )}

        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
            <PackageSearch size={17} className="text-brand-600" />
            What do you need?
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Product, SKU or specification"
                required
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                error={errors.requirement}
                placeholder="e.g. Tapered roller bearing 30205, or M8 hex bolts grade 8.8"
                hint="A part number, a brand, or a plain description of the item all work."
              />
            </div>
            <Input
              label="Quantity required"
              required
              type="number"
              min={1}
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              error={errors.quantity}
              placeholder="500"
            />
            <Input
              label="Delivery city or site"
              optional
              value={deliveryCity}
              onChange={(e) => setDeliveryCity(e.target.value)}
              placeholder="Pune, Maharashtra"
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Additional requirement"
                optional
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Required by date, specification tolerances, packaging, annual volume, preferred brand…"
              />
            </div>
          </div>
        </section>

        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-navy-900">Your business details</h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Used to prepare an invoice-ready quotation. Saved on this device for next time.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Company name"
              required
              value={company.companyName}
              onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
              error={errors.companyName}
              autoComplete="organization"
            />
            <Input
              label="GSTIN"
              optional
              value={company.gstin}
              onChange={(e) => setCompany({ ...company, gstin: e.target.value.toUpperCase() })}
              error={errors.gstin}
              maxLength={15}
              placeholder="27AABCS1429P1ZV"
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
            />
            <div className="sm:col-span-2">
              <Input
                label="Work email address"
                required
                type="email"
                value={company.email}
                onChange={(e) => setCompany({ ...company, email: e.target.value })}
                error={errors.email}
                autoComplete="email"
              />
            </div>
          </div>

          <Button type="submit" className="mt-5" loading={submitting} loadingLabel="Sending…" icon={<Send size={16} />}>
            Send quotation request
          </Button>
        </section>
      </div>

      <aside className="space-y-4">
        <div className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-navy-900">What happens next</h2>
          <ol className="mt-3 space-y-3">
            {[
              "We check stock and the rate that applies at your quantity.",
              "You get a written quotation with GST, HSN and delivery details.",
              "Place the order when the quotation suits you, or ask us to revise it.",
            ].map((step, index) => (
              <li key={step} className="flex items-start gap-3 text-[13px] leading-5 text-navy-600">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-card border border-line bg-canvas p-4">
          <p className="text-xs leading-5 text-muted">
            Sending this request does not place an order or charge anything. It creates a quotation enquiry your team can
            reference.
          </p>
        </div>
      </aside>
    </form>
  );
}
