"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2 } from "lucide-react";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/Toast";
import { EMPTY_COMPANY, loadCompany, saveCompany, type CompanyProfile } from "@/lib/local-store";

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function ProfileView() {
  const { push } = useToast();
  const [profile, setProfile] = useState<CompanyProfile>(EMPTY_COMPANY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProfile(loadCompany());
  }, []);

  function validate() {
    const next: Record<string, string> = {};
    if (profile.companyName.trim().length < 2) next.companyName = "Company name is required.";
    if (profile.contactName.trim().length < 2) next.contactName = "Enter a contact name.";
    if (profile.email.trim() && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(profile.email.trim())) {
      next.email = "Enter a valid email address.";
    }
    if (profile.phone.trim() && profile.phone.replace(/[^\d]/g, "").length < 8) {
      next.phone = "Enter a valid phone number.";
    }
    if (profile.gstin.trim() && !GSTIN_PATTERN.test(profile.gstin.trim().toUpperCase())) {
      next.gstin = "GSTIN should look like 27AABCS1429P1ZV.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    const clean: CompanyProfile = {
      companyName: profile.companyName.trim(),
      contactName: profile.contactName.trim(),
      email: profile.email.trim(),
      phone: profile.phone.trim(),
      gstin: profile.gstin.trim().toUpperCase(),
    };
    saveCompany(clean);
    setProfile(clean);
    setSaved(true);
    push({ tone: "success", title: "Company profile saved", description: "Checkout will now be pre-filled." });
    window.setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} noValidate className="rounded-card border border-line bg-surface p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
          <Building2 size={17} className="text-brand-600" />
          Company profile
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted">
          These details prefill checkout and quotation requests. Your GSTIN is checked again when an order is placed, so
          an invoice is always raised against a valid number.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input
            label="Company name"
            required
            value={profile.companyName}
            onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
            error={errors.companyName}
            autoComplete="organization"
            placeholder="Shakti Fabrication Works"
          />
          <Input
            label="GSTIN"
            optional
            value={profile.gstin}
            onChange={(e) => setProfile({ ...profile, gstin: e.target.value.toUpperCase() })}
            error={errors.gstin}
            maxLength={15}
            hint="15 characters, e.g. 27AABCS1429P1ZV."
            placeholder="27AABCS1429P1ZV"
          />
          <Input
            label="Contact name"
            required
            value={profile.contactName}
            onChange={(e) => setProfile({ ...profile, contactName: e.target.value })}
            error={errors.contactName}
            autoComplete="name"
          />
          <Input
            label="Phone number"
            optional
            type="tel"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            error={errors.phone}
            autoComplete="tel"
          />
          <div className="sm:col-span-2">
            <Input
              label="Email address"
              optional
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              error={errors.email}
              autoComplete="email"
              hint="Used so we can look up your orders and enquiries."
            />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button type="submit">Save profile</Button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700">
              <CheckCircle2 size={16} />
              Saved
            </span>
          )}
        </div>
      </form>

      <Alert tone="info" title="Where this is stored">
        Your company profile is kept in this browser only. It is never used to authorise anything — the server validates
        every order against its own records.
      </Alert>
    </div>
  );
}
