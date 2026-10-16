"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageSquareQuote, Search } from "lucide-react";
import { Alert, EmptyState, InlineLoading } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/form";
import { InquiryStatusBadge } from "@/components/ui/Badge";
import { formatDate, formatINR, formatQty } from "@/lib/format";
import { loadCompany } from "@/lib/local-store";

type InquiryRow = {
  _id: string;
  inquiryNumber?: string;
  productTitle?: string;
  productSku?: string;
  quantity?: number;
  status: string;
  quoteAmount?: number;
  message?: string;
  createdAt: string;
};

export function InquiriesView() {
  const [email, setEmail] = useState("");
  const [rows, setRows] = useState<InquiryRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadCompany();
    if (stored.email) setEmail(stored.email);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      setError("Enter the email address you used when sending the enquiry.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/inquiries/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data?.error === "string" ? data.error : "We could not look up those enquiries.");
        return;
      }
      setRows(Array.isArray(data.items) ? data.items : []);
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="text-base font-semibold text-navy-900">Look up your enquiries</h2>
        <p className="mt-1 text-xs leading-5 text-muted">
          Enter the email address you used on the enquiry form. Quote requests and product enquiries both appear here.
        </p>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end" noValidate>
          <Input
            label="Email address"
            type="email"
            className="sm:max-w-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
          <Button type="submit" loading={loading} loadingLabel="Searching…" icon={<Search size={16} />}>
            Find enquiries
          </Button>
        </form>
        {error && (
          <Alert tone="danger" className="mt-4" title="Lookup failed">
            {error}
          </Alert>
        )}
      </section>

      {loading && <InlineLoading label="Searching your enquiries…" />}

      {rows && rows.length === 0 && (
        <EmptyState
          icon={<MessageSquareQuote size={22} />}
          title="No enquiries under that address"
          description="Check the spelling of the email address, or send a new requirement and we will respond with a written quotation."
          action={
            <Link href="/quote" className="btn btn-primary btn-sm">
              Request a bulk quote
            </Link>
          }
        />
      )}

      {rows && rows.length > 0 && (
        <section className="rounded-card border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line p-5">
            <h2 className="text-base font-semibold text-navy-900">Your enquiries</h2>
            <span className="badge badge-neutral">{rows.length}</span>
          </div>
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li key={row._id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-900">{row.productTitle || "Enquiry"}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {row.inquiryNumber ? `${row.inquiryNumber} · ` : ""}
                      {formatDate(row.createdAt)}
                      {row.quantity ? ` · Qty ${formatQty(row.quantity)}` : ""}
                      {row.productSku ? ` · SKU ${row.productSku}` : ""}
                    </p>
                  </div>
                  <InquiryStatusBadge status={row.status} />
                </div>

                {row.quoteAmount ? (
                  <p className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-chip border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs text-brand-800">
                    <span className="font-semibold">Quoted {formatINR(row.quoteAmount)}</span>
                    <span className="text-brand-700/80">excl. GST — reply to the quotation to place the order</span>
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-muted">
                    {row.status === "new"
                      ? "We have received this and will respond shortly."
                      : row.status === "contacted"
                        ? "Our team has started working on this requirement."
                        : row.status === "closed"
                          ? "This enquiry is closed. Send a new one if your requirement has changed."
                          : "In progress."}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!rows && !loading && (
        <div className="flex items-start gap-2.5 rounded-card border border-line bg-canvas p-4">
          <MessageSquareQuote size={15} className="mt-0.5 shrink-0 text-brand-600" />
          <p className="text-xs leading-5 text-muted">
            Every enquiry gets a reference number like ENQ-240101-4A7, so you can quote it when you call us.
          </p>
        </div>
      )}
    </div>
  );
}
