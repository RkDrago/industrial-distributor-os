import { QuoteView } from "./QuoteView";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";

export const metadata = {
  title: "Request a bulk quote",
  description:
    "Send your industrial requirement for a written quotation with bulk rates, GST breakdown and delivery details. No obligation.",
};

export default function QuotePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const one = (key: string) => (typeof searchParams[key] === "string" ? (searchParams[key] as string) : "");

  return (
    <div className="shell py-7 lg:py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Request a bulk quote" }]} />
      <header className="mt-5 mb-6">
        <p className="eyebrow">Bulk purchasing</p>
        <h1 className="mt-2 text-2xl font-bold tracking-[-0.015em] text-navy-900 sm:text-3xl">
          Request a bulk quote
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Tell us what you need and how much of it. We confirm availability, the rate that applies at your volume,
          applicable GST and the delivery arrangement before you commit to anything.
        </p>
      </header>
      <QuoteView
        prefillProduct={one("product").replace(/-/g, " ")}
        prefillSku={one("sku")}
        prefillQty={one("qty")}
      />
    </div>
  );
}
