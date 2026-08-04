"use client";

import { SafeImage } from "@/components/ui/SafeImage";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Shield,
  Lock,
  CreditCard,
  ShoppingBag,
  Plus,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Phone,
  User,
  Building,
  Home,
  Truck,
  Edit2,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import {
  Address,
  getCustomerAddresses,
  addCustomerAddress,
  setDefaultCustomerAddress,
  deleteCustomerAddress,
} from "@/services/addressService";
import { createOrder, PaymentMethod } from "@/services/orderService";
import { processRazorpayPayment } from "@/services/paymentService";

const inputClass =
  "w-full bg-[#F7F7F5] border border-[#E6E6E3] rounded-xl px-4 py-3 text-xs text-[#111111] placeholder-gray-400 focus:outline-none focus:border-[#F4512C] transition-colors font-medium";
const labelClass = "text-xs font-bold text-[#111111] block mb-1.5";

export default function CheckoutPage() {
  const { items, cartTotal, clearCart } = useCart();
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  // Active step: 1: Auth/Cart check, 2: Delivery Address, 3: Payment
  const [step, setStep] = useState<number>(1);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showAddressForm, setShowAddressForm] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Razorpay");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Address Form State
  const [addrForm, setAddrForm] = useState({
    fullName: "",
    phone: "",
    building: "",
    street: "",
    city: "",
    state: "",
    pinCode: "",
    landmark: "",
    isDefault: true,
  });

  // Load addresses when user is authenticated
  useEffect(() => {
    if (user && user.uid) {
      getCustomerAddresses(user.uid)
        .then((list) => {
          setAddresses(list);
          const def = list.find((a) => a.isDefault) || list[0];
          if (def && def.id) {
            setSelectedAddressId(def.id);
          }
          if (list.length === 0) {
            setShowAddressForm(true);
          }
        })
        .catch((err: any) => {
          console.error("Error loading addresses on checkout:", err?.code, err?.message, err);
        });

      if (profile) {
        setAddrForm((prev) => ({
          ...prev,
          fullName: prev.fullName || profile.name || "",
          phone: prev.phone || profile.phone || "",
        }));
      }
    }
  }, [user, profile]);

  // Handle step transitions
  useEffect(() => {
    if (user && step === 1) {
      setStep(2);
    }
  }, [user, step]);

  const deliveryFee = cartTotal >= 999 || items.length === 0 ? 0 : 99;
  const finalTotal = cartTotal + deliveryFee;

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  // Handle Save New Address
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !user.uid) {
      setErrorMsg("Authentication required: Please sign in before saving an address.");
      return;
    }

    if (!addrForm.fullName.trim()) { setErrorMsg("Full Name is required."); return; }
    if (!addrForm.phone.trim()) { setErrorMsg("Phone number is required."); return; }
    if (!addrForm.building.trim()) { setErrorMsg("Address Line 1 / Building is required."); return; }
    if (!addrForm.city.trim()) { setErrorMsg("City is required."); return; }
    if (!addrForm.state.trim()) { setErrorMsg("State is required."); return; }
    if (!addrForm.pinCode.trim()) { setErrorMsg("PIN Code is required."); return; }

    try {
      setIsProcessing(true);
      setErrorMsg("");

      const newId = await addCustomerAddress(user.uid, {
        fullName: addrForm.fullName.trim(),
        phone: addrForm.phone.trim(),
        building: addrForm.building.trim(),
        street: addrForm.street.trim(),
        addressLine1: addrForm.building.trim(),
        addressLine2: addrForm.street.trim(),
        city: addrForm.city.trim(),
        state: addrForm.state.trim(),
        pinCode: addrForm.pinCode.trim(),
        postalCode: addrForm.pinCode.trim(),
        country: "India",
        landmark: addrForm.landmark.trim(),
        isDefault: addrForm.isDefault,
      });

      const updated = await getCustomerAddresses(user.uid);
      setAddresses(updated);
      setSelectedAddressId(newId);
      setShowAddressForm(false);
    } catch (err: any) {
      console.error("Failed to save address:", err?.code, err?.message, err);
      if (err?.code === "permission-denied") {
        setErrorMsg("Permission denied: Unable to write to database. Please check your login session.");
      } else if (err?.code === "unauthenticated") {
        setErrorMsg("Please sign in before saving an address.");
      } else {
        setErrorMsg(err?.message || "Failed to save address. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Delete Address
  const handleDeleteAddr = async (addrId: string) => {
    if (!user) return;
    try {
      await deleteCustomerAddress(user.uid, addrId);
      const updated = await getCustomerAddresses(user.uid);
      setAddresses(updated);
      if (selectedAddressId === addrId) {
        setSelectedAddressId(updated[0]?.id || "");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Place Order / Payment Execution
  const handlePlaceOrder = async () => {
    if (!user || !profile) {
      router.push("/login?redirect=/checkout");
      return;
    }

    if (!selectedAddress) {
      setErrorMsg("Please select or add a delivery address to continue.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg("");

    try {
      if (paymentMethod === "COD") {
        // Cash on Delivery Flow
        const createdOrder = await createOrder(
          user.uid,
          profile.customerId || "STU-CUSTOMER",
          items,
          selectedAddress,
          "COD",
          "Pending",
          undefined,
          user.email || profile.email || ""
        );
        clearCart();
        router.push(`/checkout/success?orderId=${createdOrder.orderId}`);
      } else {
        // Razorpay Payment Flow
        const res = await fetch("/api/checkout/razorpay-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items, address: selectedAddress }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to create payment order");
        }

        const razorpayOrder = await res.json();

        // Process Razorpay Checkout Modal
        let rzpResponse: any = null;
        try {
          rzpResponse = await processRazorpayPayment({
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            keyId: razorpayOrder.keyId,
            customerName: selectedAddress.fullName || profile.name || "Customer",
            customerEmail: profile.email || user.email || "",
            customerPhone: selectedAddress.phone || profile.phone || "",
          });
        } catch (err: any) {
          if (err.message?.includes("cancelled")) {
            setIsProcessing(false);
            return;
          }
          throw err;
        }

        // Verify Payment Signature on Backend
        const verifyRes = await fetch("/api/checkout/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rzpResponse),
        });

        const verifyData = await verifyRes.json();
        if (!verifyData.verified) {
          throw new Error(verifyData.error || "Payment signature verification failed");
        }

        // Create Paid Order in Firestore
        const createdOrder = await createOrder(
          user.uid,
          profile.customerId || "STU-CUSTOMER",
          items,
          selectedAddress,
          "Razorpay",
          "Paid",
          {
            razorpayOrderId: rzpResponse.razorpay_order_id,
            razorpayPaymentId: rzpResponse.razorpay_payment_id,
          },
          user.email || profile.email || ""
        );

        clearCart();
        router.push(`/checkout/success?orderId=${createdOrder.orderId}`);
      }
    } catch (err: any) {
      console.error("Order processing error:", err);
      setErrorMsg(err.message || "Failed to process order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center px-4 py-16">
        <div className="bg-white border border-[#E6E6E3] rounded-3xl p-10 text-center max-w-md w-full shadow-xs">
          <div className="h-16 w-16 bg-[#F7F7F5] rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-[#111111] mb-2">Your Cart is Empty</h2>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            Add items to your cart before proceeding to checkout.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold px-7 py-3.5 rounded-xl transition-colors"
          >
            Start Shopping <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] py-10 md:py-16">
      <div className="mx-auto max-w-5xl px-4 md:px-8">
        {/* Header & Steps Indicator */}
        <div className="text-center mb-10">
          <h1 className="font-extrabold text-2xl md:text-3xl text-[#111111] tracking-tight mb-4">
            Checkout
          </h1>

          <div className="flex items-center justify-center gap-3 md:gap-5 text-xs font-bold text-gray-500">
            <div className={`flex items-center gap-2 ${step >= 1 ? "text-[#F4512C]" : ""}`}>
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  step >= 1 ? "bg-[#F4512C] text-white" : "bg-gray-200"
                }`}
              >
                1
              </span>
              Cart
            </div>
            <div className="w-8 md:w-12 h-px bg-[#E6E6E3]" />
            <div className={`flex items-center gap-2 ${step >= 2 ? "text-[#F4512C]" : ""}`}>
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  step >= 2 ? "bg-[#F4512C] text-white" : "bg-gray-200"
                }`}
              >
                2
              </span>
              Address
            </div>
            <div className="w-8 md:w-12 h-px bg-[#E6E6E3]" />
            <div className={`flex items-center gap-2 ${step >= 3 ? "text-[#F4512C]" : ""}`}>
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  step >= 3 ? "bg-[#F4512C] text-white" : "bg-gray-200"
                }`}
              >
                3
              </span>
              Payment
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 text-xs p-4 rounded-2xl font-medium">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Main Content Area */}
          <div className="flex-1 w-full">
            <AnimatePresence mode="wait">
              {/* ── STEP 1: AUTHENTICATION CHECK ── */}
              {step === 1 && !user && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white border border-[#E6E6E3] rounded-3xl p-6 md:p-8 shadow-xs text-center space-y-6"
                >
                  <div className="h-16 w-16 bg-[#FFF3F0] text-[#F4512C] rounded-full flex items-center justify-center mx-auto">
                    <User className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-xl text-[#111111]">Account Sign In Required</h2>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 leading-relaxed">
                      Please sign in or create an account to save your delivery address and manage your orders.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 max-w-md mx-auto">
                    <Link
                      href="/login?redirect=/checkout"
                      className="w-full bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold py-3.5 rounded-xl shadow-xs transition-colors"
                    >
                      Sign In to Account
                    </Link>
                    <Link
                      href="/register?redirect=/checkout"
                      className="w-full bg-[#F7F7F5] border border-[#E6E6E3] hover:bg-gray-100 text-[#111111] text-xs font-bold py-3.5 rounded-xl transition-colors"
                    >
                      Create New Account
                    </Link>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 2: DELIVERY ADDRESS MANAGEMENT ── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white border border-[#E6E6E3] rounded-3xl p-6 md:p-8 shadow-xs space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-extrabold text-lg text-[#111111]">Delivery Address</h2>
                      <p className="text-xs text-gray-500">Select or add your shipping location</p>
                    </div>

                    {!showAddressForm && (
                      <button
                        onClick={() => setShowAddressForm(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F4512C] hover:underline cursor-pointer"
                      >
                        <Plus className="h-4 w-4" /> Add New Address
                      </button>
                    )}
                  </div>

                  {/* Add New Address Form */}
                  {showAddressForm ? (
                    <form onSubmit={handleSaveAddress} className="space-y-4 pt-2 border-t border-[#E6E6E3]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Full Name *</label>
                          <input
                            type="text"
                            required
                            value={addrForm.fullName}
                            onChange={(e) => setAddrForm({ ...addrForm, fullName: e.target.value })}
                            className={inputClass}
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Phone Number *</label>
                          <input
                            type="tel"
                            required
                            value={addrForm.phone}
                            onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })}
                            className={inputClass}
                            placeholder="+91 98765 43210"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className={labelClass}>Flat / House / Building *</label>
                          <input
                            type="text"
                            required
                            value={addrForm.building}
                            onChange={(e) => setAddrForm({ ...addrForm, building: e.target.value })}
                            className={inputClass}
                            placeholder="Apt 4B, Sunset Towers"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className={labelClass}>Street / Area / Locality *</label>
                          <input
                            type="text"
                            required
                            value={addrForm.street}
                            onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })}
                            className={inputClass}
                            placeholder="MG Road, Indiranagar"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>City *</label>
                          <input
                            type="text"
                            required
                            value={addrForm.city}
                            onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                            className={inputClass}
                            placeholder="Bengaluru"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>State *</label>
                          <input
                            type="text"
                            required
                            value={addrForm.state}
                            onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })}
                            className={inputClass}
                            placeholder="Karnataka"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>PIN Code *</label>
                          <input
                            type="text"
                            required
                            value={addrForm.pinCode}
                            onChange={(e) => setAddrForm({ ...addrForm, pinCode: e.target.value })}
                            className={inputClass}
                            placeholder="560038"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Landmark (Optional)</label>
                          <input
                            type="text"
                            value={addrForm.landmark}
                            onChange={(e) => setAddrForm({ ...addrForm, landmark: e.target.value })}
                            className={inputClass}
                            placeholder="Near Metro Station"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id="isDefault"
                          checked={addrForm.isDefault}
                          onChange={(e) => setAddrForm({ ...addrForm, isDefault: e.target.checked })}
                          className="rounded text-[#F4512C] focus:ring-[#F4512C]"
                        />
                        <label htmlFor="isDefault" className="text-xs text-gray-700 font-medium">
                          Set as default delivery address
                        </label>
                      </div>

                      <div className="flex items-center gap-3 pt-4">
                        <button
                          type="submit"
                          disabled={isProcessing}
                          className="bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold px-6 py-3 rounded-xl transition-colors cursor-pointer"
                        >
                          {isProcessing ? "Saving..." : "Save Address"}
                        </button>
                        {addresses.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowAddressForm(false)}
                            className="text-xs font-bold text-gray-500 hover:text-black py-3 px-4"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  ) : (
                    /* Address Cards List */
                    <div className="space-y-3">
                      {addresses.map((addr) => (
                        <div
                          key={addr.id}
                          onClick={() => setSelectedAddressId(addr.id || "")}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                            selectedAddressId === addr.id
                              ? "border-[#F4512C] bg-[#FFF3F0] ring-1 ring-[#F4512C]"
                              : "border-[#E6E6E3] bg-[#F7F7F5] hover:border-gray-300"
                          }`}
                        >
                          <div className="pt-0.5">
                            <input
                              type="radio"
                              name="address"
                              checked={selectedAddressId === addr.id}
                              onChange={() => setSelectedAddressId(addr.id || "")}
                              className="accent-[#F4512C]"
                            />
                          </div>

                          <div className="flex-1 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#111111]">{addr.fullName}</span>
                              {addr.isDefault && (
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600">
                              {addr.building}, {addr.street}, {addr.city}, {addr.state} - {addr.pinCode}
                            </p>
                            <p className="text-gray-500 font-medium">Phone: {addr.phone}</p>
                          </div>

                          {addr.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAddr(addr.id!);
                              }}
                              className="text-gray-400 hover:text-red-500 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        onClick={() => setStep(3)}
                        disabled={!selectedAddressId}
                        className="w-full bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold py-3.5 rounded-xl shadow-xs transition-colors mt-4 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        Continue to Payment <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── STEP 3: PAYMENT METHOD SELECTION ── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white border border-[#E6E6E3] rounded-3xl p-6 md:p-8 shadow-xs space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-extrabold text-lg text-[#111111]">Select Payment Method</h2>
                      <p className="text-xs text-gray-500">100% Secure & Encrypted Transactions</p>
                    </div>
                    <button
                      onClick={() => setStep(2)}
                      className="text-xs font-bold text-gray-500 hover:text-black cursor-pointer"
                    >
                      ← Edit Address
                    </button>
                  </div>

                  {/* Selected Delivery Address Preview */}
                  {selectedAddress && (
                    <div className="bg-[#F7F7F5] border border-[#E6E6E3] rounded-2xl p-4 text-xs space-y-1">
                      <div className="flex items-center gap-2 font-bold text-[#111111]">
                        <MapPin className="h-3.5 w-3.5 text-[#F4512C]" /> Delivering to: {selectedAddress.fullName}
                      </div>
                      <p className="text-gray-600 pl-5">
                        {selectedAddress.building}, {selectedAddress.street}, {selectedAddress.city} - {selectedAddress.pinCode}
                      </p>
                    </div>
                  )}

                  {/* Payment Options */}
                  <div className="space-y-3">
                    {/* Razorpay Option */}
                    <div
                      onClick={() => setPaymentMethod("Razorpay")}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        paymentMethod === "Razorpay"
                          ? "border-[#F4512C] bg-[#FFF3F0] ring-1 ring-[#F4512C]"
                          : "border-[#E6E6E3] bg-[#F7F7F5] hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="payment"
                          checked={paymentMethod === "Razorpay"}
                          onChange={() => setPaymentMethod("Razorpay")}
                          className="accent-[#F4512C]"
                        />
                        <div>
                          <span className="font-bold text-xs text-[#111111] block">
                            Razorpay (UPI / Credit & Debit Cards / Net Banking / Wallets)
                          </span>
                          <span className="text-[11px] text-gray-500">
                            Instant online payment with GPay, PhonePe, Cards & Banking
                          </span>
                        </div>
                      </div>
                      <CreditCard className="h-5 w-5 text-[#F4512C] hidden sm:block" />
                    </div>

                    {/* COD Option */}
                    <div
                      onClick={() => setPaymentMethod("COD")}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        paymentMethod === "COD"
                          ? "border-[#F4512C] bg-[#FFF3F0] ring-1 ring-[#F4512C]"
                          : "border-[#E6E6E3] bg-[#F7F7F5] hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="payment"
                          checked={paymentMethod === "COD"}
                          onChange={() => setPaymentMethod("COD")}
                          className="accent-[#F4512C]"
                        />
                        <div>
                          <span className="font-bold text-xs text-[#111111] block">
                            Cash on Delivery (COD)
                          </span>
                          <span className="text-[11px] text-gray-500">
                            Pay in cash upon doorstep package delivery
                          </span>
                        </div>
                      </div>
                      <Truck className="h-5 w-5 text-emerald-600 hidden sm:block" />
                    </div>
                  </div>

                  {/* Complete Order Button */}
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isProcessing}
                    className="w-full bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold py-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />{" "}
                        {paymentMethod === "COD"
                          ? `Confirm Order (₹${finalTotal.toLocaleString("en-IN")})`
                          : `Pay ₹${finalTotal.toLocaleString("en-IN")} via Razorpay`}
                      </>
                    )}
                  </button>

                  <p className="text-center text-[10px] text-gray-400 flex items-center justify-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-emerald-600" /> Payments verified securely on server
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar Order Summary */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="bg-white border border-[#E6E6E3] rounded-3xl p-6 shadow-xs sticky top-24 space-y-4">
              <h3 className="font-bold text-sm text-[#111111]">Order Summary</h3>

              <div className="space-y-3 pb-4 border-b border-[#E6E6E3] max-h-60 overflow-y-auto">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-3 text-xs">
                    <div className="h-12 w-12 bg-[#F7F7F5] rounded-lg relative overflow-hidden flex-shrink-0 border border-[#E6E6E3]">
                      {item.image ? (
                        <SafeImage src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
                      ) : (
                        <ShoppingBag className="h-5 w-5 text-gray-300 m-auto" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[#111111] truncate">{item.name}</h4>
                      <p className="text-gray-400 text-[10px]">
                        Qty: {item.quantity} {item.size ? `| Size: ${item.size}` : ""}
                      </p>
                    </div>
                    <span className="font-bold text-[#111111]">
                      ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-xs text-gray-600 pb-4 border-b border-[#E6E6E3]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-black">₹{cartTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge</span>
                  <span className="font-semibold text-[#F4512C]">
                    {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm font-bold text-[#111111]">
                <span>Total Amount</span>
                <span className="text-base text-[#F4512C]">₹{finalTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
