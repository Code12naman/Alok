"use client";

import { MessageCircle, ShieldCheck } from "lucide-react";
import {
  getWhatsAppUrl,
  isWhatsAppNumberConfigured,
  whatsappConfigurationMessage,
} from "@/lib/whatsapp";

export default function ContactPage() {
  const whatsappUrl = getWhatsAppUrl();

  return (
    <div className="min-h-screen bg-background py-12 md:py-20">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#F4512C]">
            We&apos;re here to help
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Contact Us
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground md:text-base">
            Have a question about an order, a product, or your Classic Threads
            experience? Our support team is ready to help.
          </p>
        </div>

        <section className="mx-auto mt-10 max-w-3xl rounded-3xl border border-border bg-card p-7 text-center shadow-sm md:p-12">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F7EE] text-[#128C7E]">
            <MessageCircle className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-card-foreground">
            Chat with Us on WhatsApp
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Have a question about your order or products? Message us directly on WhatsApp.
          </p>

          {isWhatsAppNumberConfigured && whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3.5 text-xs font-bold text-white transition-colors hover:bg-[#1DA851] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
            >
              <MessageCircle className="h-4 w-4" />
              Contact on WhatsApp
            </a>
          ) : (
            <div
              role="status"
              className="mx-auto mt-7 max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium leading-5 text-amber-800"
            >
              {whatsappConfigurationMessage}
            </div>
          )}

          <div className="mt-8 flex items-start gap-3 rounded-2xl bg-secondary p-4 text-left">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#F4512C]" />
            <p className="text-xs leading-5 text-muted-foreground">
              WhatsApp will open in a new tab. Please review and send your message
              yourself; opening WhatsApp does not submit a request to our website.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
