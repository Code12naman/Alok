"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ChevronDown, MessageCircle, X } from "lucide-react";
import { OrderData, OrderItem } from "@/services/orderService";
import { getProductById, FirestoreProduct } from "@/services/productService";
import { getWhatsAppUrl, whatsappConfigurationMessage } from "@/lib/whatsapp";

type RequestType = "return" | "exchange";

const reasons = [
  ["wrong_item", "Wrong item received"],
  ["damaged_item", "Item arrived damaged"],
  ["defective_item", "Product is defective"],
  ["size_fit", "Size or fit issue"],
  ["other", "Other"],
] as const;

function isEligibleOrder(order: OrderData) {
  return order.orderStatus === "Delivered" && order.paymentStatus === "Paid";
}

function itemLabel(item: OrderItem) {
  return [item.name, item.size && `Size: ${item.size}`, item.color && `Color: ${item.color}`]
    .filter(Boolean)
    .join(" · ");
}

export function ReturnExchangeActions({ order }: { order: OrderData }) {
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState<(typeof reasons)[number][0]>("size_fit");
  const [explanation, setExplanation] = useState("");
  const [preferredSize, setPreferredSize] = useState("");
  const [preferredColor, setPreferredColor] = useState("");
  const [product, setProduct] = useState<FirestoreProduct | null>(null);

  const eligible = isEligibleOrder(order);
  const selectedItem = order.items[selectedIndex];
  const deliveryTimestamp = (order as OrderData & { deliveredAt?: unknown }).deliveredAt;

  useEffect(() => {
    if (requestType !== "exchange" || !selectedItem?.productId) {
      return;
    }

    let cancelled = false;
    getProductById(selectedItem.productId)
      .then((value) => {
        if (!cancelled) setProduct(value);
      })
      .catch((error) => {
        if (!cancelled) console.warn("ReturnExchangeActions: product lookup failed:", error);
      })

    return () => {
      cancelled = true;
    };
  }, [requestType, selectedItem?.productId]);

  const openRequest = (type: RequestType) => {
    setRequestType(type);
    setProduct(null);
    setSelectedIndex(0);
    setQuantity(1);
    setReason("size_fit");
    setExplanation("");
    setPreferredSize("");
    setPreferredColor("");
  };

  const closeRequest = () => setRequestType(null);

  const handleItemChange = (index: number) => {
    setSelectedIndex(index);
    setQuantity(1);
    setProduct(null);
  };

  const handleContinue = () => {
    if (!selectedItem || !requestType) return;

    const requestedVariant = requestType === "exchange"
      ? [product?.sizes?.length ? `Size: ${preferredSize || product.sizes[0]}` : "", product?.colors?.length ? `Color: ${preferredColor || product.colors[0]}` : ""]
          .filter(Boolean)
          .join(", ") || "Please advise on available replacement variant"
      : "";
    const message = [
      `Hi Classic Threads! I want to request a ${requestType}.`,
      "",
      `Order ID: ${order.orderId}`,
      `Product name: ${selectedItem.name}`,
      `Product ID: ${selectedItem.productId || "Not available"}`,
      `Selected quantity: ${quantity}`,
      `Purchased variant: ${[selectedItem.size && `Size: ${selectedItem.size}`, selectedItem.color && `Color: ${selectedItem.color}`].filter(Boolean).join(", ") || "Not specified"}`,
      requestType === "exchange" ? `Requested replacement variant: ${requestedVariant}` : "",
      `Reason: ${reasons.find(([value]) => value === reason)?.[1] || reason}`,
      explanation.trim() ? `Additional explanation: ${explanation.trim()}` : "",
      "",
      "Please guide me through the process. I will review and send this message myself. Thank you!",
    ].filter(Boolean).join("\n");
    const url = getWhatsAppUrl(message);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!eligible) {
    return (
      <p className="text-[11px] leading-5 text-muted-foreground">
        Return and exchange options become available after an order is delivered and paid.
        Current status: {order.orderStatus}.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => openRequest("return")}
          className="rounded-xl border border-[#F4512C] px-4 py-2.5 text-xs font-bold text-[#F4512C] transition-colors hover:bg-[#FFF3F0]"
        >
          Return
        </button>
        <button
          type="button"
          onClick={() => openRequest("exchange")}
          className="rounded-xl bg-[#F4512C] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#DD3F1E]"
        >
          Exchange
        </button>
      </div>
      {!deliveryTimestamp && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-5 text-muted-foreground">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Delivery date is not recorded on this order. Support will confirm the applicable request window.
        </p>
      )}

      {requestType && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="return-exchange-title">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-card p-6 shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="return-exchange-title" className="text-lg font-bold text-card-foreground">
                  Request {requestType === "return" ? "a return" : "an exchange"}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">Order #{order.orderId}</p>
              </div>
              <button type="button" onClick={closeRequest} aria-label="Close request form" className="rounded-full p-2 text-muted-foreground hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-xs font-bold text-card-foreground">
                Product and variant
                <span className="relative mt-2 block">
                  <select value={selectedIndex} onChange={(event) => handleItemChange(Number(event.target.value))} className="w-full appearance-none rounded-xl border border-input bg-secondary px-3 py-3 pr-9 text-xs text-foreground">
                    {order.items.map((item, index) => <option key={`${item.productId}-${index}`} value={index}>{itemLabel(item)} · Purchased qty: {item.quantity}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </span>
              </label>

              <label className="block text-xs font-bold text-card-foreground">
                Quantity
                <select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-input bg-secondary px-3 py-3 text-xs text-foreground">
                  {Array.from({ length: selectedItem.quantity }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
                </select>
              </label>

              {requestType === "exchange" && (
                <div className="rounded-2xl border border-border bg-secondary p-4">
                  <p className="text-xs font-bold text-card-foreground">Preferred replacement variant</p>
                  {product ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {product.sizes?.length ? <label className="text-xs text-muted-foreground">Size<select value={preferredSize || product.sizes[0]} onChange={(event) => setPreferredSize(event.target.value)} className="mt-1 w-full rounded-lg border border-input bg-card px-2 py-2 text-xs text-foreground">{product.sizes.map((size) => <option key={size}>{size}</option>)}</select></label> : null}
                      {product.colors?.length ? <label className="text-xs text-muted-foreground">Color<select value={preferredColor || product.colors[0]} onChange={(event) => setPreferredColor(event.target.value)} className="mt-1 w-full rounded-lg border border-input bg-card px-2 py-2 text-xs text-foreground">{product.colors.map((color) => <option key={color}>{color}</option>)}</select></label> : null}
                    </div>
                  ) : <p className="mt-2 text-xs leading-5 text-muted-foreground">Current product options could not be checked. Support will confirm availability; no replacement is promised.</p>}
                </div>
              )}

              <label className="block text-xs font-bold text-card-foreground">
                Reason
                <select value={reason} onChange={(event) => setReason(event.target.value as typeof reason)} className="mt-2 w-full rounded-xl border border-input bg-secondary px-3 py-3 text-xs text-foreground">
                  {reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>

              <label className="block text-xs font-bold text-card-foreground">
                Explanation <span className="font-normal text-muted-foreground">(optional)</span>
                <textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} rows={3} maxLength={500} className="mt-2 w-full resize-y rounded-xl border border-input bg-secondary px-3 py-3 text-xs text-foreground outline-none focus:border-[#F4512C]" placeholder="Add any helpful details" />
              </label>

              <div className="rounded-2xl border border-border bg-secondary p-4 text-xs leading-5 text-muted-foreground">
                This opens a prefilled WhatsApp message. Review it and send it yourself; opening WhatsApp does not submit, approve, refund, or complete a request.
              </div>

              {getWhatsAppUrl() ? (
                <button type="button" onClick={handleContinue} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3.5 text-xs font-bold text-white hover:bg-[#1DA851]">
                  <MessageCircle className="h-4 w-4" /> Continue on WhatsApp
                </button>
              ) : <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{whatsappConfigurationMessage}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
