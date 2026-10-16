import Link from "next/link";
import { Clock, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { BrandLockup } from "./Brand";
import type { StorefrontCategory } from "@/lib/catalog";
import { companyInfo } from "@/lib/company";

/**
 * Footer.
 *
 * Contact details are read from configuration. Anything the distributor has not
 * supplied (email, phone, address, GSTIN) is simply omitted rather than filled
 * with placeholder claims.
 */
export function SiteFooter({ categories }: { categories: StorefrontCategory[] }) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="shell py-12">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
          <div>
            <BrandLockup href="/" />
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted">
              A business-to-business supply platform for mechanical components, electrical supplies, safety equipment,
              tools and hardware — with transparent bulk pricing and GST-ready invoicing.
            </p>
            <div className="mt-5 flex items-start gap-2.5 rounded-card border border-brand-200 bg-brand-50 p-3">
              <ShieldCheck size={17} className="mt-0.5 shrink-0 text-brand-600" />
              <p className="text-[13px] leading-5 text-brand-800">
                Every order is validated on our side, priced from our catalogue, and invoiced with GST and HSN details.
              </p>
            </div>
          </div>

          <nav aria-labelledby="footer-departments">
            <h2 id="footer-departments" className="text-sm font-semibold text-navy-900">
              Departments
            </h2>
            <ul className="mt-4 space-y-2.5">
              {categories.slice(0, 7).map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/products?category=${category.slug}`}
                    className="text-sm text-muted transition hover:text-brand-700"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
              {categories.length === 0 && (
                <li className="text-sm text-muted">
                  <Link href="/products" className="transition hover:text-brand-700">
                    Browse all products
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          <nav aria-labelledby="footer-support">
            <h2 id="footer-support" className="text-sm font-semibold text-navy-900">
              Ordering &amp; support
            </h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/products" className="text-sm text-muted transition hover:text-brand-700">
                  Browse the catalogue
                </Link>
              </li>
              <li>
                <Link href="/quote" className="text-sm text-muted transition hover:text-brand-700">
                  Request a bulk quote
                </Link>
              </li>
              <li>
                <Link href="/track" className="text-sm text-muted transition hover:text-brand-700">
                  Track an order
                </Link>
              </li>
              <li>
                <Link href="/account" className="text-sm text-muted transition hover:text-brand-700">
                  My account &amp; invoices
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-muted transition hover:text-brand-700">
                  Contact our team
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className="text-sm font-semibold text-navy-900">Talk to us</h2>
            {companyInfo.email || companyInfo.phone || companyInfo.address ? (
              <ul className="mt-4 space-y-3 text-sm text-muted">
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
                {companyInfo.address && (
                  <li className="flex items-start gap-2.5">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-brand-600" />
                    <span className="leading-6">{companyInfo.address}</span>
                  </li>
                )}
                <li className="flex items-start gap-2.5">
                  <Clock size={16} className="mt-0.5 shrink-0 text-brand-600" />
                  <span>Enquiries answered in the order they are received</span>
                </li>
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-6 text-muted">
                Contact details have not been published yet. Use the{" "}
                <Link href="/contact" className="font-semibold text-brand-700 underline underline-offset-2">
                  contact form
                </Link>{" "}
                and our team will respond.
              </p>
            )}

            <Link href="/quote" className="btn btn-outline btn-sm mt-5">
              Request a bulk quote
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="shell flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            © {year} {companyInfo.legalName || companyInfo.name}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
            {companyInfo.gstin && <span>GSTIN {companyInfo.gstin}</span>}
            <span>GST invoices on every order</span>
            <span>Bulk pricing available</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
