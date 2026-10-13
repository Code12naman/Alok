"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Truck, ShoppingBag, MapPin, CreditCard } from "lucide-react";
import { getOrderById, OrderData, OrderLookupError } from "@/services/orderService";
import { SafeImage } from "@/components/ui/SafeImage";
import { ReturnExchangeActions } from "@/components/orders/return-exchange-actions";
import { useAuth } from "@/context/AuthContext";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get("orderId") || "";
  const { user, loading: authLoading } = useAuth();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!authLoading && orderId && user) {
      getOrderById(orderId, user.uid)
        .then((data) => setOrder(data))
        .catch((error: unknown) => {
          console.error("[CheckoutSuccess] Order lookup failed:", error instanceof OrderLookupError ? error.code : "unknown");
          setLookupError(error instanceof Error ? error.message : "Unable to load this order.");
        })
        .finally(() => setLoading(false));
    } else if (!user) {
      // Authentication has settled; no customer order lookup is allowed.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      setLookupError("Your session is no longer active. Please sign in to view this order.");
    }
  }, [authLoading, orderId, user]);

  return (
    <div className="min-h-screen bg-background py-12 md:py-16">
      <div className="mx-auto max-w-2xl px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-card border border-border rounded-3xl p-6 md:p-10 shadow-xs space-y-8"
        >
          {/* Header Badge */}
          <div className="text-center space-y-3">
            <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-card-foreground tracking-tight">
              Order Placed Successfully!
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Thank you for shopping with STREETMODE. Your order is being processed.
            </p>

            <div className="inline-block bg-secondary border border-border rounded-xl px-4 py-2 mt-2">
              <span className="text-xs font-bold text-card-foreground">
                Order ID: <strong className="text-primary">{orderId || "—"}</strong>
              </span>
            </div>
          </div>

          {authLoading || loading ? (
            <div className="h-40 bg-secondary rounded-2xl animate-pulse" />
          ) : lookupError ? (
            <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-5 text-center text-xs text-red-700 dark:text-red-300">
              {lookupError}
            </div>
          ) : order ? (
            <div className="space-y-6">
              <ReturnExchangeActions order={order} />
              {/* Estimated Delivery Banner */}
              <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
                <Truck className="h-6 w-6 text-primary flex-shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-card-foreground block">Estimated Delivery Date</span>
                  <span className="text-muted-foreground font-medium">
                    Delivery timing will be shared by the support team.
                  </span>
                </div>
              </div>

              {/* Order Items List */}
              <div className="space-y-3 border-b border-border pb-6">
                <h3 className="font-bold text-xs text-card-foreground uppercase tracking-wider">
                  Purchased Items ({order.items.length})
                </h3>
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-secondary p-3 rounded-xl border border-border">
                    <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-card flex-shrink-0 border border-border">
                      {item.image ? (
                        <SafeImage src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                      ) : (
                        <ShoppingBag className="h-6 w-6 text-muted-foreground m-auto" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <h4 className="font-bold text-card-foreground truncate">{item.name}</h4>
                      <p className="text-muted-foreground text-[11px]">
                        Qty: {item.quantity} {item.size ? `| Size: ${item.size}` : ""} {item.color ? `| Color: ${item.color}` : ""}
                      </p>
                    </div>
                    <span className="font-extrabold text-xs text-card-foreground">
                      ₹{item.subtotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Order Summary & Address Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-secondary border border-border p-4 rounded-2xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-card-foreground mb-1">
                    <MapPin className="h-4 w-4 text-primary" /> Shipping Address
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

                <div className="bg-secondary border border-border p-4 rounded-2xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-card-foreground mb-1">
                    <CreditCard className="h-4 w-4 text-primary" /> Payment Summary
                  </div>
                  <p className="text-muted-foreground flex justify-between">
                    <span>Payment Method:</span>
                    <strong className="text-card-foreground">{order.paymentMethod}</strong>
                  </p>
                  <p className="text-muted-foreground flex justify-between">
                    <span>Payment Status:</span>
                    <strong className={order.paymentStatus === "Paid" ? "text-emerald-600" : "text-amber-600"}>
                      {order.paymentStatus}
                    </strong>
                  </p>
                  <p className="text-muted-foreground flex justify-between pt-1 border-t border-border">
                    <span>Total Amount Paid:</span>
                    <strong className="text-primary font-extrabold text-sm">
                      ₹{order.finalAmount.toLocaleString("en-IN")}
                    </strong>
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href={`/orders/${orderId}`}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold py-3.5 rounded-xl shadow-xs transition-colors text-center"
            >
              Track Order
            </Link>
            <Link
              href="/account/orders"
              className="flex-1 bg-secondary border border-border hover:bg-accent/10 text-secondary-foreground text-xs font-bold py-3.5 rounded-xl transition-colors text-center"
            >
              View My Orders
            </Link>
            <Link
              href="/shop"
              className="flex-1 border border-border hover:bg-secondary text-foreground text-xs font-bold py-3.5 rounded-xl transition-colors text-center"
            >
              Continue Shopping
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-[#F4512C] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
