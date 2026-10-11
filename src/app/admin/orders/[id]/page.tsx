"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  getOrderById,
  updateOrderStatus,
  NormalizedOrder,
  OrderStatus,
} from "@/services/orderService";
import { SafeImage } from "@/components/ui/SafeImage";
import {
  FiArrowLeft,
  FiLoader,
  FiUser,
  FiPhone,
  FiMapPin,
  FiCopy,
  FiCheck,
  FiCreditCard,
  FiShoppingBag,
  FiCalendar,
  FiChevronDown,
  FiAlertCircle,
} from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { markCodPaymentAsPaid } from "@/services/orderService";

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

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const orderIdParam = resolvedParams.id;

  const [order, setOrder] = useState<NormalizedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [confirmCodOpen, setConfirmCodOpen] = useState(false);
  const [codUpdating, setCodUpdating] = useState(false);
  const [codError, setCodError] = useState<string | null>(null);
  const { user, role } = useAuth();

  useEffect(() => {
    let active = true;
    getOrderById(orderIdParam)
      .then((data) => {
        if (active) setOrder(data);
      })
      .catch((err) => {
        console.error("[OrderDetails] Error loading order:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderIdParam]);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;
    setUpdating(true);
    try {
      await updateOrderStatus(order.id, newStatus);
      setOrder((prev) => (prev ? { ...prev, status: newStatus, orderStatus: newStatus } : null));
      showToast(`Order status updated to "${newStatus}"`);
    } catch (err) {
      console.error("[OrderDetails] Failed to update status:", err);
      alert("Failed to update status.");
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkCodPaid = async () => {
    if (!order || !user?.uid || role !== "admin" || codUpdating) return;

    setCodUpdating(true);
    setCodError(null);
    try {
      await markCodPaymentAsPaid(order.id, user.uid);
      setOrder((prev) => (prev ? { ...prev, paymentStatus: "Paid" } : null));
      setConfirmCodOpen(false);
      showToast("COD payment marked as paid.");
    } catch (error) {
      console.error("[OrderDetails] Failed to confirm COD payment:", error);
      setCodError(error instanceof Error ? error.message : "Failed to confirm COD payment.");
    } finally {
      setCodUpdating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text || text === "—" || text.includes("Not available")) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    showToast(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  if (loading) {
    return (
      <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-24 flex items-center justify-center">
        <FiLoader className="w-8 h-8 text-[#ff6500] animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-16 text-center space-y-4">
        <FiAlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Order Not Found</h2>
        <p className="text-xs text-white/50">
          No order found with ID &ldquo;{orderIdParam}&rdquo;.
        </p>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 bg-[#ff6500] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" /> Back to Orders
        </Link>
      </div>
    );
  }

  const addr = order.shippingAddress;
  const formattedFullAddress = [
    addr.fullName,
    addr.phone ? `Phone: ${addr.phone}` : null,
    [addr.building, addr.street].filter(Boolean).join(", "),
    addr.landmark ? `Landmark: ${addr.landmark}` : null,
    `${addr.city}, ${addr.state} - ${addr.pinCode}`,
    addr.country || "India",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#ff6500] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-lg border border-white/20 animate-bounce">
          {toastMsg}
        </div>
      )}

      {/* Top Header / Nav Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141414] border border-white/[0.07] p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-white">
                Order #{order.orderNumber}
              </h1>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  STATUS_COLORS[order.status] || "bg-gray-500/15 text-gray-300"
                }`}
              >
                {order.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/40 mt-1 font-medium">
              <span className="flex items-center gap-1">
                <FiCalendar className="w-3.5 h-3.5 text-[#ff6500]" /> Placed: {order.createdAtFormatted}
              </span>
              {order.updatedAtFormatted && (
                <span>Updated: {order.updatedAtFormatted}</span>
              )}
            </div>
          </div>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="text-xs font-bold text-white/50 hidden md:inline">Order Status:</span>
          <div className="relative">
            <select
              value={order.status}
              onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
              disabled={updating}
              className={`text-xs px-3.5 py-2 rounded-xl border font-bold focus:outline-none cursor-pointer appearance-none pr-8 ${
                STATUS_COLORS[order.status] || "bg-gray-500/15 text-gray-300"
              } bg-transparent`}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="bg-[#141414] text-white font-medium">
                  {s}
                </option>
              ))}
            </select>
            <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-70 text-current" />
          </div>
        </div>
      </div>

      {/* Main Grid: Left 2 cols = Products & Summary, Right 1 col = Customer, Address, Payment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ordered Products Section */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <FiShoppingBag className="w-4 h-4 text-[#ff6500]" /> Ordered Products ({order.items.length})
              </h3>
              <span className="text-xs text-white/40 font-medium">Items Snapshot</span>
            </div>

            <div className="divide-y divide-white/[0.05]">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-4 first:pt-0 last:pb-0 flex gap-4 items-center">
                  {/* Thumbnail */}
                  <div className="relative h-16 w-16 flex-shrink-0 bg-[#0a0a0a] rounded-xl overflow-hidden border border-white/10">
                    {item.image ? (
                      <SafeImage
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white/20">
                        <FiShoppingBag className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-1">
                      {item.name}
                    </h4>
                    <p className="text-[11px] font-mono text-white/40 mt-0.5">
                      ID: {item.productId}
                    </p>
                    <div className="flex flex-wrap gap-2 text-[11px] font-bold text-white/60 mt-1">
                      {item.size && (
                        <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                          Size: {item.size}
                        </span>
                      )}
                      {item.color && (
                        <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                          Color: {item.color}
                        </span>
                      )}
                      <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-white/80">
                        Qty: {item.quantity}
                      </span>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-extrabold text-sm text-white">
                      ₹{item.subtotal.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[11px] text-white/40 mt-0.5">
                      ₹{item.price.toLocaleString("en-IN")} × {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Details Section */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-6 space-y-4">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2 border-b border-white/[0.07] pb-4">
              <FiCreditCard className="w-4 h-4 text-[#ff6500]" /> Payment Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#0a0a0a] border border-white/[0.06] p-3.5 rounded-xl space-y-1.5">
                <span className="text-white/40 block text-[10px] font-bold uppercase">Payment Method</span>
                <span className="font-bold text-white text-sm block">{order.paymentMethod}</span>
                <span className="inline-block bg-white/10 text-white/80 px-2 py-0.5 rounded text-[10px] font-bold">
                  Status: {order.paymentStatus}
                </span>
                {order.paymentMethod === "COD" && order.paymentStatus === "Pending" && role === "admin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setCodError(null);
                      setConfirmCodOpen(true);
                    }}
                    disabled={codUpdating}
                    className="mt-2 w-full rounded-lg bg-[#ff6500] px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Mark as Paid
                  </button>
                )}
              </div>

              {(order.razorpayOrderId || order.razorpayPaymentId) && (
                <div className="bg-[#0a0a0a] border border-white/[0.06] p-3.5 rounded-xl space-y-1 font-mono text-[11px]">
                  <span className="text-white/40 block text-[10px] font-bold font-sans uppercase">Razorpay Verification</span>
                  {order.razorpayOrderId && (
                    <p className="text-white/80 truncate">
                      <span className="text-white/40 font-sans">Order ID:</span> {order.razorpayOrderId}
                    </p>
                  )}
                  {order.razorpayPaymentId && (
                    <p className="text-white/80 truncate">
                      <span className="text-white/40 font-sans">Payment ID:</span> {order.razorpayPaymentId}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] p-4 rounded-xl space-y-2.5 text-xs pt-3">
              <div className="flex items-center justify-between text-white/70">
                <span>Items Subtotal</span>
                <span>₹{order.subtotal.toLocaleString("en-IN")}</span>
              </div>

              {order.discount > 0 && (
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span>
                    Discount {order.couponCode ? `(${order.couponCode})` : ""}
                  </span>
                  <span>-₹{order.discount.toLocaleString("en-IN")}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-white/70">
                <span>Delivery Charge</span>
                <span>{order.deliveryCharge === 0 ? "FREE" : `₹${order.deliveryCharge}`}</span>
              </div>

              <div className="border-t border-white/10 pt-2.5 flex items-center justify-between font-extrabold text-sm text-white">
                <span>Final Total</span>
                <span className="text-base text-[#ff6500]">₹{order.finalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Customer Details Section */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-6 space-y-4">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2 border-b border-white/[0.07] pb-4">
              <FiUser className="w-4 h-4 text-[#ff6500]" /> Customer Details
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-[10px] font-bold text-white/40 uppercase block mb-0.5">Name</span>
                <p className="font-extrabold text-white text-sm">{order.customer.name}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-white/40 uppercase block mb-0.5">Email</span>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-white/80 font-medium truncate flex-1">{order.customer.email}</p>
                  {order.customer.email && !order.customer.email.includes("Not available") && (
                    <button
                      onClick={() => copyToClipboard(order.customer.email, "Email")}
                      className="p-1 text-white/40 hover:text-white transition-colors"
                      title="Copy Email"
                    >
                      {copiedField === "Email" ? <FiCheck className="w-3.5 h-3.5 text-emerald-400" /> : <FiCopy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-white/40 uppercase block mb-0.5">Phone Number</span>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-white/90 font-bold">{order.customer.phone}</p>
                  {order.customer.phone && order.customer.phone !== "—" && (
                    <button
                      onClick={() => copyToClipboard(order.customer.phone, "Phone")}
                      className="p-1 text-white/40 hover:text-white transition-colors"
                      title="Copy Phone"
                    >
                      {copiedField === "Phone" ? <FiCheck className="w-3.5 h-3.5 text-emerald-400" /> : <FiCopy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-white/40 uppercase block mb-0.5">Customer UID</span>
                <p className="font-mono text-[10px] text-white/50 truncate bg-[#0a0a0a] px-2.5 py-1.5 rounded-lg border border-white/5">
                  {order.userId || order.customerId}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Address Section */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <FiMapPin className="w-4 h-4 text-[#ff6500]" /> Delivery Address
              </h3>
              <button
                onClick={() => copyToClipboard(formattedFullAddress, "Full Address")}
                className="inline-flex items-center gap-1 bg-[#0a0a0a] hover:bg-white/10 text-white/80 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-white/10 transition-colors"
              >
                {copiedField === "Full Address" ? (
                  <>
                    <FiCheck className="w-3 h-3 text-emerald-400" /> Copied
                  </>
                ) : (
                  <>
                    <FiCopy className="w-3 h-3 text-[#ff6500]" /> COPY FULL ADDRESS
                  </>
                )}
              </button>
            </div>

            {/* Address Snapshot Box */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] p-4 rounded-xl space-y-2 text-xs">
              <p className="font-extrabold text-white text-sm">{addr.fullName}</p>
              <p className="font-mono text-white/80 font-bold flex items-center gap-1.5">
                <FiPhone className="w-3.5 h-3.5 text-[#ff6500]" /> {addr.phone || "—"}
              </p>

              <div className="text-white/70 space-y-1 pt-2 border-t border-white/10 font-medium leading-relaxed">
                {(addr.building || addr.street) && (
                  <p>{[addr.building, addr.street].filter(Boolean).join(", ")}</p>
                )}
                {addr.landmark && (
                  <p className="text-white/50 text-[11px]">Landmark: {addr.landmark}</p>
                )}
                <p className="font-bold text-white/90">
                  {addr.city}, {addr.state} - {addr.pinCode}
                </p>
                <p className="text-white/50 uppercase text-[10px] font-bold">{addr.country || "India"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {confirmCodOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="cod-confirmation-title">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-2xl">
            <h2 id="cod-confirmation-title" className="text-lg font-extrabold text-white">
              Confirm cash received
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Mark this COD payment as paid only after the cash has been physically received from the customer. This will not change the delivery status.
            </p>
            {codError && (
              <p role="alert" className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-xs leading-5 text-red-300">
                {codError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!codUpdating) setConfirmCodOpen(false);
                }}
                disabled={codUpdating}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-bold text-white/70 hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkCodPaid}
                disabled={codUpdating}
                className="rounded-xl bg-[#ff6500] px-4 py-2.5 text-xs font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {codUpdating ? "Updating..." : "Confirm payment received"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
