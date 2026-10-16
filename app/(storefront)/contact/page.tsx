import { ContactView } from "./ContactView";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";

export const metadata = {
  title: "Contact our team",
  description:
    "Send us a product requirement, ask for technical help, or book a call with our industrial supply team.",
};

export default function ContactPage() {
  return (
    <div className="shell py-7 lg:py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
      <header className="mt-5 mb-6">
        <h1 className="text-2xl font-bold tracking-[-0.015em] text-navy-900 sm:text-3xl">Talk to our team</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Send us what you need — a part number, a description or a specification — and we will identify the closest
          match in the catalogue and confirm availability and pricing.
        </p>
      </header>
      <ContactView />
    </div>
  );
}
