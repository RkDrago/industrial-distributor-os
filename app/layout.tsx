
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartProvider";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const ogImage = "/images/og-image.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Norgez Industrial | Industrial supplies for business",
    template: "%s | Norgez Industrial",
  },

  description:
    "Source industrial products for your business — compare bulk prices, order with GST invoices, and track every order in one place.",

  applicationName: "Norgez Industrial",

  openGraph: {
    type: "website",
    siteName: "Norgez Industrial",
    title: "Industrial Supplies. Made Simple.",
    description:
      "Find quality industrial products, compare bulk prices, and order for your business in one place.",
    url: siteUrl,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Norgez Industrial — Industrial supplies for business",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Industrial Supplies. Made Simple.",
    description:
      "Find quality industrial products, compare bulk prices, and order for your business in one place.",
    images: [
      {
        url: ogImage,
        alt: "Norgez Industrial — Industrial supplies for business",
      },
    ],
  },

  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN" className={inter.variable}>
      <body>
        <ToastProvider>
          <CartProvider>{children}</CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
