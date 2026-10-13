"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getOrders,
  getAllowedOrderStatusTransitions,
  normalizeOrderStatus,
  updateOrderStatus,
  NormalizedOrder,
  OrderStatus,
} from "@/services/orderService";
import { archiveOrderAsAdmin, deleteOrderAsAdmin } from "@/services/adminDeletionService";
import {
  FiLoader,
  FiShoppingCart,
  FiChevronDown,
  FiSearch,
  FiArrowRight,
  FiPhone,
  FiTrash2,
  FiX,
  FiAlertTriangle,
} from "react-icons/fi";

const ALL_STATUSES: OrderStatus[] = [
  "Pending",
  "Order Confirmed",
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
  const [selectedOrder, setSelectedOrder] = useState<NormalizedOrder | null>(null);
  const [confirmationStep, setConfirmationStep] = useState<1 | 2>(1);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const fetched = await getOrders();
      setOrders(fetched.filter((order) => !order.archivedAt));
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
      await loadData();
    } catch (err) {
      console.error("[AdminOrders] Failed to update status:", err);
      alert(err instanceof Error ? err.message : "Failed to update order status.");
    } finally {
      setUpdating(null);
    }
  };

  const closeDeleteDialog = () => {
    if (deleting) return;
    setSelectedOrder(null);
    setConfirmationStep(1);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!selectedOrder || deleting) return;
    if (confirmationStep === 1) {
      setConfirmationStep(2);
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteOrderAsAdmin(selectedOrder.id);
      setSelectedOrder(null);
      setConfirmationStep(1);
      await loadData();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Unable to delete order.");
    } finally {
      setDeleting(false);
    }
  };

  const archiveOrder = async () => {
    if (!selectedOrder || deleting || archiving) return;
    setArchiving(true);
    setDeleteError(null);
    try {
      await archiveOrderAsAdmin(selectedOrder.id);
      setSelectedOrder(null);
      setConfirmationStep(1);
      await loadData();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Unable to archive order.");
    } finally {
      setArchiving(false);
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
            {ALL_STATUSES.map((s) => (
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
                  const currentStatus = normalizeOrderStatus(order.orderStatus || order.status);
                  const statusOptions = getAllowedOrderStatusTransitions(currentStatus);
                  if (process.env.NODE_ENV === "development") {
                    console.debug("[AdminOrders] status options", { currentStatus, statusOptions });
                  }

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
                            value={currentStatus}
                            onChange={(e) =>
                              handleStatusChange(order.id, e.target.value as OrderStatus)
                            }
                            disabled={updating === order.id}
                            className={`text-xs px-2.5 py-1 rounded-full border font-bold focus:outline-none cursor-pointer appearance-none pr-6 ${
                              STATUS_COLORS[normalizeOrderStatus(order.orderStatus || order.status)] ||
                              "bg-gray-500/15 text-gray-300 border-gray-500/20"
                            } bg-transparent`}
                          >
                            {statusOptions.map((s) => (
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
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(order);
                            setConfirmationStep(1);
                            setDeleteError(null);
                          }}
                          disabled={deleting || archiving}
                          aria-label={`Delete order ${orderDisplayId}`}
                          className="ml-3 inline-flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                          <FiTrash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteDialog();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-order-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-red-500/15 p-2.5 text-red-400">
                  <FiAlertTriangle className="h-5 w-5" />
                </span>
                <h2 id="delete-order-title" className="text-lg font-bold text-white">
                  {confirmationStep === 1 ? "Delete order?" : "Confirm permanent deletion"}
                </h2>
              </div>
              <button type="button" onClick={closeDeleteDialog} disabled={deleting} aria-label="Close dialog" className="text-white/50 hover:text-white disabled:opacity-50">
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <p className="text-white">
                <span className="font-bold">Order #{selectedOrder.orderNumber || selectedOrder.orderId || selectedOrder.id}</span>
                <span className="block text-white/60">Status: {selectedOrder.orderStatus}</span>
              </p>
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
                Permanent deletion removes this order record and is only allowed when the backend confirms no protected dependencies. For payment, refund, inventory, COD, or audit history, archive the order instead.
              </p>
              {confirmationStep === 2 && (
                <p className="text-xs font-bold text-red-300">This is the final confirmation. Permanently delete this order?</p>
              )}
              {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={archiveOrder} disabled={deleting || archiving} className="rounded-lg border border-amber-500/30 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/10 disabled:opacity-50">
                {archiving ? "Archiving..." : "Archive order"}
              </button>
              <button type="button" onClick={closeDeleteDialog} disabled={deleting || archiving} className="rounded-lg border border-white/10 px-4 py-2 text-xs font-bold text-white/70 hover:bg-white/5 disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} disabled={deleting} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60">
                {deleting && <FiLoader className="h-3.5 w-3.5 animate-spin" />}
                {confirmationStep === 1 ? "Continue" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
