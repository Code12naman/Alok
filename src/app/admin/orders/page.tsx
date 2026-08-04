"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getOrders,
  updateOrderStatus,
  NormalizedOrder,
  OrderStatus,
} from "@/services/orderService";
import {
  FiLoader,
  FiShoppingCart,
  FiChevronDown,
  FiSearch,
  FiArrowRight,
  FiPhone,
} from "react-icons/fi";

const STATUSES: OrderStatus[] = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Confirmed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Order Confirmed": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Processing: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  Shipped: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  "Out for Delivery": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Delivered: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<NormalizedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const fetched = await getOrders();
      setOrders(fetched);
    } catch (err) {
      console.error("[AdminOrders] Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (id: string, status: OrderStatus) => {
    setUpdating(id);
    try {
      await updateOrderStatus(id, status);
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status, orderStatus: status } : o))
      );
    } catch (err) {
      console.error("[AdminOrders] Failed to update status:", err);
      alert("Failed to update status.");
    } finally {
      setUpdating(null);
    }
  };

  const filtered = orders.filter((order) => {
    const matchesStatus =
      statusFilter === "all" ||
      order.status === statusFilter ||
      order.orderStatus === statusFilter;

    if (!matchesStatus) return false;

    if (!searchQuery.trim()) return true;

    const q = searchQuery.trim().toLowerCase();
    const orderIdMatch =
      order.orderId?.toLowerCase().includes(q) ||
      order.orderNumber?.toLowerCase().includes(q) ||
      order.id?.toLowerCase().includes(q);
    const customerMatch =
      order.customer.name.toLowerCase().includes(q) ||
      order.customer.email.toLowerCase().includes(q) ||
      order.customer.phone.toLowerCase().includes(q);

    return orderIdMatch || customerMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] border border-white/[0.07] p-5 rounded-2xl">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white">Orders Management</h1>
          <p className="text-xs text-white/50 font-medium mt-1">
            Manage, pack, and update customer store orders ({orders.length} total)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, name, phone, email..."
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#ff6500]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#ff6500] cursor-pointer"
          >
            <option value="all">All Statuses ({orders.length})</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table Container */}
      {loading ? (
        <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-16 flex items-center justify-center">
          <FiLoader className="w-8 h-8 text-[#ff6500] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-16 text-center">
          <FiShoppingCart className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/60 font-bold text-sm">No orders found.</p>
          <p className="text-white/40 text-xs mt-1">
            {searchQuery
              ? `No orders matching "${searchQuery}"`
              : "Customer orders will appear here once placed."}
          </p>
        </div>
      ) : (
        <div className="bg-[#141414] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.02] text-white/40 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Order ID</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="px-5 py-3.5">Items</th>
                  <th className="px-5 py-3.5">Total</th>
                  <th className="px-5 py-3.5">Payment</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((order) => {
                  const itemCount = order.items?.length || 0;
                  const itemLabel = `${itemCount} ${itemCount === 1 ? "item" : "items"}`;
                  const orderDisplayId = order.orderNumber || order.orderId || order.id;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Order ID */}
                      <td className="px-5 py-4 font-mono font-bold text-white/90">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="hover:text-[#ff6500] transition-colors"
                        >
                          #{orderDisplayId}
                        </Link>
                        <p className="text-[10px] text-white/40 font-sans font-medium mt-0.5">
                          {order.createdAtFormatted}
                        </p>
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4">
                        <p className="font-bold text-white text-xs">{order.customer.name}</p>
                        <p className="text-[11px] text-white/40 truncate max-w-[180px]">
                          {order.customer.email}
                        </p>
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-4 font-mono text-white/70">
                        <span className="inline-flex items-center gap-1">
                          <FiPhone className="w-3 h-3 text-white/40" />
                          {order.customer.phone}
                        </span>
                      </td>

                      {/* Items */}
                      <td className="px-5 py-4 font-medium text-white/70">{itemLabel}</td>

                      {/* Total */}
                      <td className="px-5 py-4 font-extrabold text-white text-sm">
                        ₹{order.finalAmount.toLocaleString("en-IN")}
                      </td>

                      {/* Payment */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            order.paymentMethod === "Razorpay"
                              ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                              : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {order.paymentMethod}
                        </span>
                        <p className="text-[10px] text-white/40 mt-0.5 font-medium">
                          {order.paymentStatus}
                        </p>
                      </td>

                      {/* Status Selector */}
                      <td className="px-5 py-4">
                        <div className="relative inline-block">
                          <select
                            value={order.status}
                            onChange={(e) =>
                              handleStatusChange(order.id, e.target.value as OrderStatus)
                            }
                            disabled={updating === order.id}
                            className={`text-xs px-2.5 py-1 rounded-full border font-bold focus:outline-none cursor-pointer appearance-none pr-6 ${
                              STATUS_COLORS[order.status] ||
                              "bg-gray-500/15 text-gray-300 border-gray-500/20"
                            } bg-transparent`}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s} className="bg-[#141414] text-white">
                                {s}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-current opacity-70" />
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#ff6500] hover:underline"
                        >
                          View Details <FiArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
