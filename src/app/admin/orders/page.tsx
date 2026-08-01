"use client";

import { useState, useEffect } from "react";
import { getOrders, updateOrderStatus, FirestoreOrder, OrderStatus } from "@/services/orderService";
import { FiLoader, FiShoppingCart, FiChevronDown } from "react-icons/fi";

const STATUSES: OrderStatus[] = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  Confirmed: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Processing: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  Shipped: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  Delivered: "bg-green-500/15 text-green-400 border-green-500/20",
  Cancelled: "bg-red-500/15 text-red-400 border-red-500/20",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<FirestoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    getOrders().then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = statusFilter === "all" ? orders : orders.filter(o => o.status === statusFilter);

  const handleStatusChange = async (id: string, status: OrderStatus) => {
    setUpdating(id);
    try {
      await updateOrderStatus(id, status);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    } catch { alert("Failed to update status."); }
    setUpdating(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Orders</h1>
          <p className="text-white/40 text-sm mt-0.5">{orders.length} total orders</p>
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#141414] border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><FiLoader className="w-8 h-8 text-[#ff6500] animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-16 text-center">
          <FiShoppingCart className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/50">No orders yet.</p>
          <p className="text-white/30 text-sm mt-1">Orders placed by customers will appear here.</p>
        </div>
      ) : (
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-white/40 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-medium">Order ID</th>
                  <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Customer</th>
                  <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Items</th>
                  <th className="text-left px-5 py-3 font-medium">Total</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-white/40">#{order.id?.slice(-8)}</td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <div>
                        <p className="text-sm">{order.customerName || "—"}</p>
                        <p className="text-xs text-white/30">{order.customerEmail || "—"}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-white/60 hidden sm:table-cell">{order.products?.length || 0} items</td>
                    <td className="px-5 py-3 font-semibold">₹{order.totalAmount?.toLocaleString() || "—"}</td>
                    <td className="px-5 py-3">
                      <div className="relative">
                        <select
                          value={order.status}
                          onChange={e => handleStatusChange(order.id!, e.target.value as OrderStatus)}
                          disabled={updating === order.id}
                          className={`text-xs px-2.5 py-1.5 rounded-full border font-medium focus:outline-none cursor-pointer appearance-none pr-6 ${STATUS_COLORS[order.status] || ""} bg-transparent`}
                        >
                          {STATUSES.map(s => <option key={s} value={s} className="bg-[#141414] text-white">{s}</option>)}
                        </select>
                        <FiChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-current opacity-60" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
