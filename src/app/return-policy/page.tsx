"use client";

import { MessageCircle, ShieldCheck } from "lucide-react";
import {
  getWhatsAppUrl,
  whatsappConfigurationMessage,
} from "@/lib/whatsapp";

const exchangeMessage = `Hi Classic Threads! I want to request an exchange.

Order ID:
Product name:
Current size:
Preferred size:
Reason for exchange:

Please guide me through the exchange process. Thank you!`;

const policySections = [
  {
    title: "Eligibility",
    body: "Return and exchange eligibility depends on the item, its condition, and the applicable consumer rights in your location. Classic Threads will review each request through WhatsApp before confirming the available next step.",
  },
  {
    title: "Request window",
    body: "The request window is a business policy that must be confirmed by Classic Threads before publication. Please contact support as soon as possible after delivery so your request can be reviewed within any applicable legal or store timeframe.",
  },
  {
    title: "Product condition and packaging",
    body: "Items should be unworn, unused, unwashed, and returned with original tags and packaging where reasonably possible. Support will explain the condition requirements for your item and will not override rights that apply by law.",
  },
  {
    title: "Size and fit exchanges",
    body: "Size or fit exchanges are subject to the store’s confirmed exchange rules and available stock. Share the current and preferred sizes in your WhatsApp message so support can check the options.",
  },
  {
    title: "Wrong, damaged, defective, or incorrectly described products",
    body: "If an item is wrong, damaged, defective, or materially different from its description, contact support promptly with your order details and clear photographs. We will guide you through the appropriate resolution under applicable law and the confirmed store policy.",
  },
  {
    title: "Exchange availability",
    body: "An exchange can only be confirmed after the requested replacement is checked for availability. If the preferred item or size is unavailable, support will explain the alternatives available under the confirmed policy.",
  },
  {
    title: "Return shipping and pickup",
    body: "Who pays return shipping and whether pickup is available are configurable business terms that must be confirmed by Classic Threads. Support will provide the applicable instructions for your approved request; do not send an item before receiving guidance.",
  },
  {
    title: "Refund processing",
    body: "For an eligible return where a refund is the applicable resolution, support will explain the approval and processing steps. Refund timing and method are configurable business terms that must be confirmed, and applicable consumer rights continue to apply.",
  },
];

export default function ReturnPolicyPage() {
  const exchangeUrl = getWhatsAppUrl(exchangeMessage);

  return (
    <div className="min-h-screen bg-background py-12 md:py-20">
      <div className="mx-auto max-w-4xl px-4 md:px-8">
        <header className="text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#F4512C]">
            Customer care
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Return &amp; Exchange Policy
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            We want to help resolve product and order concerns clearly and fairly.
            Contact support before sending anything back so we can guide you.
          </p>
        </header>

        <div className="mt-10 space-y-4">
          {policySections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-7">
              <h2 className="text-base font-bold text-card-foreground md:text-lg">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-3xl border border-[#F4512C]/20 bg-[#FFF3F0] p-6 md:p-8">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#F4512C]" />
            <div>
              <h2 className="text-lg font-bold text-card-foreground">How to contact support</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                All return and exchange queries are handled directly through WhatsApp.
                Include your order ID, product name, sizes, and a short explanation.
                You must send the message yourself; this button does not automatically
                approve or submit an exchange request to Classic Threads.
              </p>
            </div>
          </div>

          {exchangeUrl ? (
            <a
              href={exchangeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3.5 text-xs font-bold text-white transition-colors hover:bg-[#1DA851] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2 sm:w-auto"
            >
              <MessageCircle className="h-4 w-4" />
              Request Exchange on WhatsApp
            </a>
          ) : (
            <div
              role="status"
              className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium leading-5 text-amber-800"
            >
              {whatsappConfigurationMessage}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
