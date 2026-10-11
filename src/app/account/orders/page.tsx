"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShoppingBag, ArrowRight, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getUserOrders, OrderData } from "@/services/orderService";
import { SafeImage } from "@/components/ui/SafeImage";
import { ReturnExchangeActions } from "@/components/orders/return-exchange-actions";

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/account/orders");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      getUserOrders(user.uid)
        .then(setOrders)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-[#F4512C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] py-10 md:py-16">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        
        {/* Breadcrumb / Title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-extrabold text-2xl md:text-3xl text-[#111111] tracking-tight">
              My Orders
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-1">
              View order history and track active shipments
            </p>
          </div>

          <Link href="/account" className="text-xs font-bold text-[#F4512C] hover:underline">
            ← Back to Account
          </Link>
        </div>

        {orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-[#E6E6E3] rounded-3xl p-12 text-center max-w-lg mx-auto shadow-xs"
          >
            <div className="h-20 w-20 bg-[#F7F7F5] rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <ShoppingBag className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold text-[#111111] mb-2">No Orders Found</h2>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              You haven&apos;t placed any orders yet. Start exploring our collections today!
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold px-8 py-3.5 rounded-xl shadow-xs transition-colors"
            >
              Start Shopping <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4 max-w-4xl">
            {orders.map((order, idx) => (
              <motion.div
                key={order.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white border border-[#E6E6E3] rounded-3xl p-5 md:p-6 shadow-xs space-y-4"
              >
                {/* Header Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E6E6E3] text-xs">
                  <div>
                    <span className="font-extrabold text-sm text-[#111111] block">
                      Order #{order.orderId}
                    </span>
                    <span className="text-gray-400 text-[11px]">
                      Placed on {order.createdAt
                        ? new Date(order.createdAt?.seconds ? order.createdAt.seconds * 1000 : order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : "Date unavailable"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-3 py-1 rounded-full">
                      {order.orderStatus}
                    </span>
                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${order.paymentStatus === "Paid" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Items Preview */}
                <div className="space-y-3">
                  {order.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="flex items-center gap-3">
                      <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-[#F7F7F5] border border-[#E6E6E3] flex-shrink-0">
                        {item.image ? (
                          <SafeImage src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                        ) : (
                          <ShoppingBag className="h-6 w-6 text-gray-300 m-auto" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-xs">
                        <h4 className="font-bold text-[#111111] truncate">{item.name}</h4>
                        <p className="text-gray-500 text-[11px]">
                          Qty: {item.quantity} {item.size ? `| Size: ${item.size}` : ""}
                        </p>
                      </div>
                      <span className="font-extrabold text-xs text-[#111111]">
                        ₹{item.subtotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer Action Strip */}
                <div className="flex items-center justify-between pt-4 border-t border-[#E6E6E3]">
                  <div>
                    <span className="text-[11px] text-gray-500 block">Total Amount</span>
                    <span className="font-extrabold text-base text-[#F4512C]">
                      ₹{order.finalAmount.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <Link
                    href={`/orders/${order.orderId}`}
                    className="inline-flex items-center gap-1.5 bg-[#111111] hover:bg-black text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors"
                  >
                    View Details & Track <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="border-t border-[#E6E6E3] pt-4">
                  <ReturnExchangeActions order={order} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
