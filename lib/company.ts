/**
 * Public business details, read from configuration.
 *
 * Kept separate from the catalogue module so nothing that renders these values
 * can accidentally pull a database driver into the browser bundle. Anything the
 * distributor has not supplied is an empty string, and the UI omits it rather
 * than inventing a placeholder.
 */
export const companyInfo = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || "Norgez Industrial",
  legalName: process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME || "",
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
  phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "",
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "",
  gstin: process.env.NEXT_PUBLIC_COMPANY_GSTIN || "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
};

/** GST, shown on invoices and documents when configured. */
export const companyGstin = companyInfo.gstin;
