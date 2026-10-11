"use client";

import { SafeImage } from "@/components/ui/SafeImage";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Package,
  MapPin,
  CreditCard,
  ShoppingBag,
  ArrowLeft,
  Check,
} from "lucide-react";
import { getOrderById, OrderData, OrderStatus } from "@/services/orderService";
import { ReturnExchangeActions } from "@/components/orders/return-exchange-actions";

const trackingSteps: { status: OrderStatus; label: string }[] = [
  { status: "Order Confirmed", label: "Order Confirmed" },
  { status: "Processing", label: "Processing" },
  { status: "Shipped", label: "Shipped" },
  { status: "Out for Delivery", label: "Out for Delivery" },
  { status: "Delivered", label: "Delivered" },
];

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = (params?.orderId as string) || "";

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      getOrderById(orderId)
        .then(setOrder)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [orderId]);

  // Determine current active step index in timeline
  const getStepIndex = (currentStatus: OrderStatus) => {
    const idx = trackingSteps.findIndex((s) => s.status === currentStatus);
    return idx >= 0 ? idx : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-[#F4512C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
        <div className="bg-card border border-border rounded-3xl p-10 text-center max-w-md w-full shadow-xs space-y-4">
          <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <Package className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-card-foreground">Order Not Found</h2>
          <p className="text-xs text-muted-foreground">
            We couldn&apos;t locate order #{orderId}. Please check your order ID and try again.
          </p>
          <Link
            href="/account/orders"
            className="inline-block bg-[#F4512C] text-white text-xs font-bold px-6 py-3 rounded-xl"
          >
            Return to My Orders
          </Link>
        </div>
      </div>
    );
  }

  const currentStepIdx = getStepIndex(order.orderStatus);

  return (
    <div className="min-h-screen bg-background py-10 md:py-16">
      <div className="mx-auto max-w-4xl px-4 md:px-8 space-y-8">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/account/orders"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F4512C] hover:underline mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Orders
            </Link>
            <h1 className="font-extrabold text-2xl md:text-3xl text-foreground tracking-tight">
              Order Details
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Order ID: <strong className="text-[#F4512C]">#{order.orderId}</strong>
            </p>
          </div>

          <div className="text-right">
            <span className="bg-foreground text-background text-xs font-bold px-3 py-1 rounded-full inline-block">
              {order.orderStatus}
            </span>
          </div>
        </div>

        {/* ── VISUAL TRACKING TIMELINE ── */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
          <h2 className="font-extrabold text-base text-card-foreground">Shipment Tracking</h2>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-2 pt-2">
            {trackingSteps.map((step, idx) => {
              const isCompleted = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div
                  key={step.status}
                  className="flex md:flex-col items-center gap-4 md:gap-2 flex-1 relative z-10 w-full md:w-auto"
                >
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? "bg-[#F4512C] text-white ring-4 ring-[#FFF3F0]"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : idx + 1}
                  </div>

                  <div className="md:text-center text-xs">
                    <span
                      className={`font-bold block ${
                        isCurrent
                          ? "text-[#F4512C]"
                          : isCompleted
                          ? "text-card-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] text-muted-foreground font-medium block">In Progress</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Itemized Receipt & Delivery Info */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Purchased Items List (7 cols) */}
          <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-card-foreground uppercase tracking-wider">
              Order Items ({order.items.length})
            </h3>

            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-secondary p-3 rounded-2xl border border-border">
                  <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-card flex-shrink-0 border border-border">
                    {item.image ? (
                      <SafeImage src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
                    ) : (
                      <ShoppingBag className="h-6 w-6 text-muted-foreground m-auto" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <h4 className="font-bold text-card-foreground truncate">{item.name}</h4>
                    <p className="text-muted-foreground text-[11px]">
                      Qty: {item.quantity} {item.size ? `| Size: ${item.size}` : ""} {item.color ? `| Color: ${item.color}` : ""}
                    </p>
                    <p className="font-extrabold text-[#F4512C] text-xs mt-1">
                      ₹{item.price.toLocaleString("en-IN")} each
                    </p>
                  </div>
                  <span className="font-extrabold text-xs text-card-foreground">
                    ₹{item.subtotal.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4">
              <ReturnExchangeActions order={order} />
            </div>
          </div>

          {/* Delivery & Payment Details (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Delivery Address Card */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-card-foreground mb-2">
                <MapPin className="h-4 w-4 text-[#F4512C]" /> Delivery Address
              </div>
              <p className="font-bold text-card-foreground">{order.deliveryAddress.fullName}</p>
              <p className="text-muted-foreground">
                {order.deliveryAddress.building}, {order.deliveryAddress.street}
              </p>
              <p className="text-muted-foreground">
                {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pinCode}
              </p>
              <p className="text-muted-foreground font-medium">Phone: {order.deliveryAddress.phone}</p>
            </div>

            {/* Payment Summary Card */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-card-foreground mb-2">
                <CreditCard className="h-4 w-4 text-[#F4512C]" /> Payment Details
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-semibold text-card-foreground">₹{order.subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery Charge</span>
                <span className="font-semibold text-[#F4512C]">
                  {order.deliveryCharge === 0 ? "FREE" : `₹${order.deliveryCharge}`}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Payment Method</span>
                <strong className="text-card-foreground">{order.paymentMethod}</strong>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Payment Status</span>
                <strong className={order.paymentStatus === "Paid" ? "text-emerald-600" : "text-amber-600"}>
                  {order.paymentStatus}
                </strong>
              </div>

              <div className="flex justify-between items-center text-sm font-extrabold text-card-foreground pt-3 border-t border-border">
                <span>Total Amount Paid</span>
                <span className="text-base text-[#F4512C]">₹{order.finalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
