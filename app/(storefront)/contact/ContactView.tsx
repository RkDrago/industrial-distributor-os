"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarClock, CheckCircle2, Mail, Phone, Send } from "lucide-react";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/Toast";
import { companyInfo } from "@/lib/company";
import { loadCompany, saveCompany } from "@/lib/local-store";

const SERVICE_TYPES = [
  "Bulk quotation call",
  "Technical product matching",
  "Account & credit setup",
  "Site stock audit",
];

type Mode = "message" | "book";

export function ContactView() {
  const { push } = useToast();
  const [mode, setMode] = useState<Mode>("message");

  // shared contact fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // booking fields
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("Any time");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<{ kind: Mode; value: string } | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    const stored = loadCompany();
    setName(stored.contactName);
    setEmail(stored.email);
    setPhone(stored.phone);
    setCompanyName(stored.companyName);
  }, []);

  function validate() {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim())) next.email = "Enter a valid email address.";
    if (phone.replace(/[^\d]/g, "").length < 8) next.phone = "Enter a valid phone number.";
    if (mode === "message" && subject.trim().length < 3) next.subject = "What can we help with?";
    if (mode === "message" && message.trim().length < 5) next.message = "Add a short description of your requirement.";
    if (mode === "book" && !/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = "Choose a preferred date.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (submittingRef.current) return;
    if (!validate()) {
      setFormError("Please correct the highlighted fields.");
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      if (mode === "book") {
        const response = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceType,
            customerName: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            companyName: companyName.trim(),
            date,
            slot,
            notes: message.trim(),
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const error = typeof data?.error === "string" ? data.error : "We could not book that slot.";
          setFormError(error);
          push({ tone: "error", title: "Booking not created", description: error });
          return;
        }
        setReference({ kind: "book", value: data.bookingNumber ?? "booked" });
        push({ tone: "success", title: "Appointment booked" });
      } else {
        const response = await fetch("/api/inquiries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestName: name.trim(),
            guestEmail: email.trim(),
            guestPhone: phone.trim(),
            guestCompany: companyName.trim(),
            productTitle: subject.trim(),
            quantity: 1,
            message: message.trim(),
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const error = typeof data?.error === "string" ? data.error : "We could not send your message.";
          setFormError(error);
          push({ tone: "error", title: "Message not sent", description: error });
          return;
        }
        setReference({ kind: "message", value: data.inquiryNumber ?? "received" });
        saveCompany({
          companyName: companyName.trim(),
          contactName: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          gstin: loadCompany().gstin,
        });
        push({ tone: "success", title: "Message sent", description: "Our team will respond shortly." });
      }
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (reference) {
    return (
      <div className="rounded-card border border-brand-200 bg-success-soft p-6 sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-brand-600">
          <CheckCircle2 size={24} />
        </span>
        <h2 className="mt-4 text-xl font-bold text-navy-900">
          {reference.kind === "book" ? "Your appointment is booked" : "Thanks — we have your message"}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-navy-600">
          Reference <span className="font-semibold text-navy-900">{reference.value}</span>. Our team has been notified and
          will get back to you at {email}.
          {reference.kind === "book" && date ? ` We have you pencilled in for ${date} (${slot}).` : ""}
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <button type="button" className="btn btn-outline" onClick={() => setReference(null)}>
            Send another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div>
        {/* -------------------------------------------------------- mode switch */}
        <div className="inline-flex rounded-control border border-line bg-surface p-1" role="tablist" aria-label="Contact options">
          {([
            { id: "message", label: "Send a message", icon: Mail },
            { id: "book", label: "Book a call", icon: CalendarClock },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={`inline-flex items-center gap-2 rounded-chip px-4 py-2.5 text-sm font-semibold transition ${
                mode === id ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-navy-50"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} noValidate className="mt-5 rounded-card border border-line bg-surface p-5 sm:p-6">
          {formError && (
            <Alert tone="danger" className="mb-5" title="We couldn't send this">
              {formError}
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Your name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              autoComplete="name"
            />
            <Input
              label="Company name"
              optional
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              autoComplete="organization"
            />
            <Input
              label="Email address"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
            />
            <Input
              label="Phone number"
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={errors.phone}
              autoComplete="tel"
            />

            {mode === "message" ? (
              <>
                <div className="sm:col-span-2">
                  <Input
                    label="What can we help with?"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    error={errors.subject}
                    placeholder="e.g. Need a replacement for a discontinued pump coupling"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Textarea
                    label="Details"
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    error={errors.message}
                    rows={5}
                    maxLength={2000}
                    placeholder="Part numbers, quantities, drawings reference, required date…"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="sm:col-span-2">
                  <Select
                    label="What would you like to discuss?"
                    required
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                  >
                    {SERVICE_TYPES.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </Select>
                </div>
                <Input
                  label="Preferred date"
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  error={errors.date}
                  min={new Date().toISOString().slice(0, 10)}
                />
                <Select label="Preferred time" value={slot} onChange={(e) => setSlot(e.target.value)}>
                  {["Any time", "10:00 – 11:00", "11:00 – 12:00", "14:00 – 15:00", "15:00 – 16:00", "16:00 – 17:00"].map(
                    (option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    )
                  )}
                </Select>
                <div className="sm:col-span-2">
                  <Textarea
                    label="Anything we should prepare?"
                    optional
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder="Products you would like to review, current suppliers, volumes…"
                  />
                </div>
              </>
            )}
          </div>

          <Button
            type="submit"
            className="mt-5"
            loading={submitting}
            loadingLabel={mode === "book" ? "Booking…" : "Sending…"}
            icon={<Send size={16} />}
          >
            {mode === "book" ? "Book appointment" : "Send message"}
          </Button>
          <p className="mt-3 text-xs leading-5 text-muted">
            We use these details only to respond to your request. See our team&apos;s contact details alongside.
          </p>
        </form>
      </div>

      <aside className="space-y-4">
        <div className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-navy-900">Contact our team</h2>
          {companyInfo.email || companyInfo.phone || companyInfo.address ? (
            <ul className="mt-3 space-y-3 text-sm text-navy-600">
              {companyInfo.email && (
                <li className="flex items-start gap-2.5">
                  <Mail size={16} className="mt-0.5 shrink-0 text-brand-600" />
                  <a href={`mailto:${companyInfo.email}`} className="transition hover:text-brand-700">
                    {companyInfo.email}
                  </a>
                </li>
              )}
              {companyInfo.phone && (
                <li className="flex items-start gap-2.5">
                  <Phone size={16} className="mt-0.5 shrink-0 text-brand-600" />
                  <a href={`tel:${companyInfo.phone.replace(/\s/g, "")}`} className="transition hover:text-brand-700">
                    {companyInfo.phone}
                  </a>
                </li>
              )}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted">
              Telephone and email details have not been published for this deployment. The form reaches the same team.
            </p>
          )}
        </div>

        <div className="rounded-card border border-line bg-canvas p-4">
          <h2 className="text-sm font-semibold text-navy-900">Faster than a form?</h2>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            For a price on a specific volume, a quotation request gets you a reference number immediately.
          </p>
          <a href="/quote" className="btn btn-outline btn-sm btn-block mt-3">
            Request a bulk quote
          </a>
        </div>
      </aside>
    </div>
  );
}
