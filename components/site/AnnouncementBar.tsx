"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Info, X } from "lucide-react";

const STORAGE_KEY = "ngz.announcement-dismissed.v1";

/**
 * Business notice strip.
 *
 * The copy states only what the platform actually does (GST invoicing, bulk
 * pricing, enquiry handling) — no delivery-time promises or claims the
 * distributor has not confirmed.
 */
export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (dismissed) return null;

  return (
    <div className="bg-navy-900 text-white">
      <div className="shell flex min-h-10 items-center justify-between gap-3 py-1.5">
        <p className="flex items-center gap-2 text-[13px] leading-tight text-navy-100">
          <Info size={14} className="shrink-0 text-brand-300" />
          <span>
            <span className="font-semibold text-white">Buying in bulk?</span>{" "}
            <span className="hidden sm:inline">
              Send us your requirement and get a written quotation with GST and delivery details.{" "}
            </span>
            <Link href="/quote" className="font-semibold text-brand-300 underline underline-offset-2">
              Request a quote
            </Link>
          </span>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded p-1 text-navy-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss announcement"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
