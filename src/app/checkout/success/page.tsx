"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Package, Truck, ArrowRight, ShoppingBag, MapPin, CreditCard } from "lucide-react";
import Image from "next/image";
import { getOrderById, OrderData } from "@/services/orderService";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get("orderId") || "";

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      getOrderById(orderId)
        .then((data) => setOrder(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [orderId]);

  return (
    <div className="min-h-screen bg-[#F7F7F5] py-12 md:py-16">
      <div className="mx-auto max-w-2xl px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white border border-[#E6E6E3] rounded-3xl p-6 md:p-10 shadow-xs space-y-8"
        >
          {/* Header Badge */}
          <div className="text-center space-y-3">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#111111] tracking-tight">
              Order Placed Successfully!
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              Thank you for shopping with STREETMODE. Your order is being processed.
            </p>

            <div className="inline-block bg-[#F7F7F5] border border-[#E6E6E3] rounded-xl px-4 py-2 mt-2">
              <span className="text-xs font-bold text-[#111111]">
                Order ID: <strong className="text-[#F4512C]">{orderId || "STM-2026-847291"}</strong>
              </span>
            </div>
          </div>

          {loading ? (
            <div className="h-40 bg-[#F7F7F5] rounded-2xl animate-pulse" />
          ) : order ? (
            <div className="space-y-6">
              {/* Estimated Delivery Banner */}
              <div className="bg-[#FFF3F0] border border-[#F4512C]/20 rounded-2xl p-4 flex items-center gap-3">
                <Truck className="h-6 w-6 text-[#F4512C] flex-shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-[#111111] block">Estimated Delivery Date</span>
                  <span className="text-gray-600 font-medium">
                    Delivered by {new Date(Date.now() + 5 * 86400000).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>

              {/* Order Items List */}
              <div className="space-y-3 border-b border-[#E6E6E3] pb-6">
                <h3 className="font-bold text-xs text-[#111111] uppercase tracking-wider">
                  Purchased Items ({order.items.length})
                </h3>
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-[#F7F7F5] p-3 rounded-xl border border-[#E6E6E3]">
                    <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-white flex-shrink-0 border border-[#E6E6E3]">
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                      ) : (
                        <ShoppingBag className="h-6 w-6 text-gray-300 m-auto" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <h4 className="font-bold text-[#111111] truncate">{item.name}</h4>
                      <p className="text-gray-500 text-[11px]">
                        Qty: {item.quantity} {item.size ? `| Size: ${item.size}` : ""} {item.color ? `| Color: ${item.color}` : ""}
                      </p>
                    </div>
                    <span className="font-extrabold text-xs text-[#111111]">
                      ₹{item.subtotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Order Summary & Address Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-[#F7F7F5] border border-[#E6E6E3] p-4 rounded-2xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#111111] mb-1">
                    <MapPin className="h-4 w-4 text-[#F4512C]" /> Shipping Address
                  </div>
                  <p className="font-bold text-[#111111]">{order.deliveryAddress.fullName}</p>
                  <p className="text-gray-600">
                    {order.deliveryAddress.building}, {order.deliveryAddress.street}
                  </p>
                  <p className="text-gray-600">
                    {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pinCode}
                  </p>
                  <p className="text-gray-500 font-medium">Phone: {order.deliveryAddress.phone}</p>
                </div>

                <div className="bg-[#F7F7F5] border border-[#E6E6E3] p-4 rounded-2xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#111111] mb-1">
                    <CreditCard className="h-4 w-4 text-[#F4512C]" /> Payment Summary
                  </div>
                  <p className="text-gray-600 flex justify-between">
                    <span>Payment Method:</span>
                    <strong className="text-[#111111]">{order.paymentMethod}</strong>
                  </p>
                  <p className="text-gray-600 flex justify-between">
                    <span>Payment Status:</span>
                    <strong className={order.paymentStatus === "Paid" ? "text-emerald-600" : "text-amber-600"}>
                      {order.paymentStatus}
                    </strong>
                  </p>
                  <p className="text-gray-600 flex justify-between pt-1 border-t border-[#E6E6E3]">
                    <span>Total Amount Paid:</span>
                    <strong className="text-[#F4512C] font-extrabold text-sm">
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
              className="flex-1 bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold py-3.5 rounded-xl shadow-xs transition-colors text-center"
            >
              Track Order
            </Link>
            <Link
              href="/account/orders"
              className="flex-1 bg-[#F7F7F5] border border-[#E6E6E3] hover:bg-gray-100 text-[#111111] text-xs font-bold py-3.5 rounded-xl transition-colors text-center"
            >
              View My Orders
            </Link>
            <Link
              href="/shop"
              className="flex-1 border border-[#E6E6E3] hover:bg-gray-50 text-gray-700 text-xs font-bold py-3.5 rounded-xl transition-colors text-center"
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
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-[#F4512C] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
