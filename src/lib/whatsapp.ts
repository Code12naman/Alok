const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

export const isWhatsAppNumberConfigured = /^\d{8,15}$/.test(whatsappNumber);

export const whatsappConfigurationMessage =
  "WhatsApp support is not configured yet. Please contact the store owner.";

export function getWhatsAppUrl(message?: string): string | null {
  if (!isWhatsAppNumberConfigured) return null;

  const baseUrl = `https://wa.me/${whatsappNumber}`;
  return message ? `${baseUrl}?text=${encodeURIComponent(message)}` : baseUrl;
}
