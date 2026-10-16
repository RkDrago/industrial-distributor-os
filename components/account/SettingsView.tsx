"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HardDrive, Lock, ShieldCheck, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/Overlay";
import { useToast } from "@/components/ui/Toast";
import { useCart } from "@/components/cart/CartProvider";
import { STORAGE_KEYS, clearLocalData, loadAddresses, loadCompany, loadRecentOrders } from "@/lib/local-store";

export function SettingsView() {
  const { push } = useToast();
  const { items, clear } = useCart();
  const [pendingClear, setPendingClear] = useState(false);
  const [counts, setCounts] = useState({ addresses: 0, orders: 0, hasProfile: false });

  useEffect(() => {
    const profile = loadCompany();
    setCounts({
      addresses: loadAddresses().length,
      orders: loadRecentOrders().length,
      hasProfile: Object.values(profile).some((value) => value.trim().length > 0),
    });
  }, []);

  function doClear() {
    clearLocalData();
    setCounts({ addresses: 0, orders: 0, hasProfile: false });
    setPendingClear(false);
    push({ tone: "info", title: "Saved details cleared", description: "Your basket has been left untouched." });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
          <HardDrive size={17} className="text-brand-600" />
          What is stored on this device
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted">
          This deployment places orders as a guest, so nothing about you is stored on our servers beyond the orders and
          enquiries you submit. These items live in your browser:
        </p>

        <dl className="mt-4 divide-y divide-line rounded-card border border-line">
          {[
            { term: "Company profile", detail: counts.hasProfile ? "Saved" : "Empty" },
            { term: "Saved addresses", detail: `${counts.addresses} address${counts.addresses === 1 ? "" : "es"}` },
            { term: "Order numbers from this device", detail: `${counts.orders} order${counts.orders === 1 ? "" : "s"}` },
            { term: "Basket", detail: `${items.length} product${items.length === 1 ? "" : "s"}` },
          ].map((row) => (
            <div key={row.term} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <dt className="text-navy-700">{row.term}</dt>
              <dd className="font-medium text-navy-900">{row.detail}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setPendingClear(true)}
            className="btn btn-outline text-danger"
            disabled={!counts.hasProfile && !counts.addresses && !counts.orders}
          >
            <Trash2 size={16} />
            <span>Clear saved details</span>
          </button>
          {items.length > 0 && (
            <button type="button" onClick={clear} className="btn btn-ghost">
              Empty basket
            </button>
          )}
        </div>
      </section>

      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
          <Lock size={17} className="text-brand-600" />
          Privacy &amp; data
        </h2>
        <ul className="mt-3 space-y-2.5 text-sm leading-6 text-navy-600">
          <li className="flex items-start gap-2.5">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-600" />
            Orders and enquiries are stored with your company, GSTIN and delivery details so we can invoice and deliver.
          </li>
          <li className="flex items-start gap-2.5">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-600" />
            Order status and invoices are only released when an order number and the matching email address are supplied
            together.
          </li>
          <li className="flex items-start gap-2.5">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-600" />
            Marketing email is not sent from this platform; notifications are limited to the orders and enquiries you
            submit.
          </li>
        </ul>
        <p className="mt-4 text-xs leading-5 text-muted">
          To have an order or enquiry record removed,{" "}
          <Link href="/contact" className="link-brand">
            contact our team
          </Link>{" "}
          with the reference number.
        </p>
      </section>

      <Alert tone="info" title="No password to manage">
        Checkout is guest-based on this deployment, so there is no password, two-factor setting or session to manage
        here. Looking for the operations dashboard?{" "}
        <Link href="/admin" className="font-semibold underline underline-offset-2">
          Sign in as an administrator
        </Link>
        .
      </Alert>

      <ConfirmDialog
        open={pendingClear}
        title="Clear saved details from this browser?"
        description="Your company profile, saved addresses and the list of order numbers will be removed. Orders already placed are unaffected."
        confirmLabel="Clear saved details"
        onCancel={() => setPendingClear(false)}
        onConfirm={doClear}
      />

      <p className="text-xs text-muted">
        Storage keys used: {Object.values(STORAGE_KEYS).join(", ")}.
      </p>
    </div>
  );
}
