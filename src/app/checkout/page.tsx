"use client";

import { SafeImage } from "@/components/ui/SafeImage";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Lock,
  CreditCard,
  ShoppingBag,
  Plus,
  MapPin,
  ArrowRight,
  User,
  Truck,
  Trash2,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import {
  Address,
  getCustomerAddresses,
  addCustomerAddress,
  deleteCustomerAddress,
} from "@/services/addressService";
import { generateOrderId, PaymentMethod } from "@/services/orderService";
import { isOrderIdentifier } from "@/lib/identifiers";
import {
  PaymentCancelledError,
  processRazorpayPayment,
} from "@/services/paymentService";
import { safePaymentErrorMessage } from "@/lib/payment-errors";

const inputClass =
  "w-full bg-secondary border border-border rounded-xl px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#F4512C] transition-colors font-medium";
const labelClass = "text-xs font-bold text-foreground block mb-1.5";

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const body = await response.text();
  const contentType = response.headers.get("content-type") || "";
  let parsed: unknown;
  if (contentType.includes("application/json")) {
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = undefined;
    }
  }

  if (!response.ok) {
    const errorMessage = parsed && typeof parsed === "object" && "error" in parsed &&
      typeof parsed.error === "string"
      ? parsed.error
      : `Checkout API returned HTTP ${response.status}.`;
    throw new CheckoutApiError(errorMessage, response.status, parsed);
  }

  if (!contentType.includes("application/json")) {
    throw new CheckoutApiError(
      response.status === 404
        ? "Checkout service is not available in this deployment. Please try again after the latest deployment is published."
        : `Checkout service returned an unexpected response (${response.status}).`,
      response.status,
      undefined
    );
  }

  if (parsed === undefined) {
    throw new CheckoutApiError(
      "Checkout service returned an invalid response. Please try again.",
      response.status,
      undefined
    );
  }
  return parsed as T;
}

class CheckoutApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly responseBody: unknown
  ) {
    super(message);
    this.name = "CheckoutApiError";
  }
}

function safeCheckoutResponseBody(value: unknown): Record<string, string | boolean> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const body: Record<string, string | boolean> = {};
  if ("error" in value && typeof value.error === "string") {
    body.error = safePaymentErrorMessage(new Error(value.error));
  }
  if ("verified" in value && typeof value.verified === "boolean") {
    body.verified = value.verified;
  }
  return Object.keys(body).length ? body : undefined;
}

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
  const [checkoutAttemptId, setCheckoutAttemptId] = useState("");
  const [checkoutAttemptKey, setCheckoutAttemptKey] = useState("");

  useEffect(() => {
    if (!user?.uid) return;

    const storageKey = `classic-threads-checkout-attempt:${user.uid}`;
    const storedId = window.sessionStorage.getItem(storageKey);
    const keyStorageKey = `${storageKey}:key`;
    const storedKey = window.sessionStorage.getItem(keyStorageKey);
    const hasStoredKey = storedKey && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storedKey);
    const id = isOrderIdentifier(storedId) && hasStoredKey ? storedId : generateOrderId();
    const key = isOrderIdentifier(storedId) && hasStoredKey ? storedKey : window.crypto.randomUUID();
    window.sessionStorage.setItem(storageKey, id);
    window.sessionStorage.setItem(keyStorageKey, key);
    const stateUpdate = window.setTimeout(() => {
      setCheckoutAttemptId(id);
      setCheckoutAttemptKey(key);
    }, 0);
    return () => window.clearTimeout(stateUpdate);
  }, [user?.uid]);

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
        .catch((err: unknown) => {
          console.error("Error loading addresses on checkout:", errorCode(err), errorMessage(err, ""), err);
        });

      if (profile) {
        // Profile data is external state synchronized into the form.
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (!authLoading && user && step === 1) {
      // Advance only after Firebase authentication has finished initializing.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(2);
    }
  }, [authLoading, user, step]);

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
    } catch (err: unknown) {
      console.error("Failed to save address:", errorCode(err), errorMessage(err, ""), err);
      if (errorCode(err) === "permission-denied") {
        setErrorMsg("Permission denied: Unable to write to database. Please check your login session.");
      } else if (errorCode(err) === "unauthenticated") {
        setErrorMsg("Please sign in before saving an address.");
      } else {
        setErrorMsg(errorMessage(err, "Failed to save address. Please try again."));
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
    if (!checkoutAttemptId) {
      setErrorMsg("Preparing a secure order ID. Please try again in a moment.");
      return;
    }

    if (!selectedAddress) {
      setErrorMsg("Please select or add a delivery address to continue.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg("");
    let stage = "validate-checkout";

    try {
      if (!selectedAddress.id) {
        throw new Error("The selected delivery address is invalid. Please select it again.");
      }
      const idToken = await user.getIdToken();
      const storageKey = `classic-threads-checkout-attempt:${user.uid}`;
      const clearCheckoutAttempt = () => {
        window.sessionStorage.removeItem(storageKey);
        window.sessionStorage.removeItem(`${storageKey}:key`);
      };
      const rotateCheckoutAttempt = () => {
        const nextOrderId = generateOrderId();
        const nextAttemptKey = window.crypto.randomUUID();
        window.sessionStorage.setItem(storageKey, nextOrderId);
        window.sessionStorage.setItem(`${storageKey}:key`, nextAttemptKey);
        setCheckoutAttemptId(nextOrderId);
        setCheckoutAttemptKey(nextAttemptKey);
      };
      stage = "reserve-order-id";
      const reservationResponse = await fetch("/api/checkout/reserve-order-id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ orderId: checkoutAttemptId, attemptKey: checkoutAttemptKey }),
      });
      try {
        await readApiResponse<{ orderId?: string }>(reservationResponse);
      } catch (error) {
        if (error instanceof CheckoutApiError && error.status === 409) {
          const nextOrderId = generateOrderId();
          const nextAttemptKey = window.crypto.randomUUID();
          const storageKey = `classic-threads-checkout-attempt:${user.uid}`;
          window.sessionStorage.setItem(storageKey, nextOrderId);
          window.sessionStorage.setItem(`${storageKey}:key`, nextAttemptKey);
          setCheckoutAttemptId(nextOrderId);
          setCheckoutAttemptKey(nextAttemptKey);
          throw new Error("A rare order ID conflict occurred. A new ID is ready; please place your order again.");
        }
        throw error;
      }

      const createCodOrder = async () => {
        stage = "create-cod-order";
        const response = await fetch("/api/checkout/create-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            items,
            addressId: selectedAddress.id,
            paymentMethod: "COD",
            checkoutAttemptId,
            checkoutAttemptKey,
          }),
        });
        const data = await readApiResponse<{ error?: string; orderId?: string }>(response);
        if (!data.orderId) throw new Error("Checkout API returned no order ID.");
        return { orderId: data.orderId };
      };

      if (paymentMethod === "COD") {
        const createdOrder = await createCodOrder();
        clearCheckoutAttempt();
        clearCart();
        router.push(`/checkout/success?orderId=${encodeURIComponent(createdOrder.orderId)}`);
      } else {
        stage = "create-razorpay-order";
        const res = await fetch("/api/checkout/razorpay-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            items,
            addressId: selectedAddress.id,
            checkoutAttemptId,
            checkoutAttemptKey,
          }),
        });

        const razorpayOrder = await readApiResponse<{
          id?: string;
          amount?: number;
          currency?: string;
          keyId?: string;
          orderId?: string;
          alreadyPaid?: boolean;
          error?: string;
        }>(res);
        if (razorpayOrder.alreadyPaid && razorpayOrder.orderId) {
          clearCheckoutAttempt();
          clearCart();
          router.push(`/checkout/success?orderId=${encodeURIComponent(razorpayOrder.orderId)}`);
          return;
        }
        if (
          !razorpayOrder.id ||
          !razorpayOrder.amount ||
          razorpayOrder.currency !== "INR" ||
          !razorpayOrder.keyId
        ) {
          throw new Error("Razorpay returned incomplete payment details.");
        }

        let rzpResponse: Awaited<ReturnType<typeof processRazorpayPayment>>;
        stage = "open-razorpay-checkout";
        try {
          rzpResponse = await processRazorpayPayment({
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            keyId: razorpayOrder.keyId,
            customerName: selectedAddress.fullName || profile.name || "Customer",
            customerEmail: profile.email || user.email || "",
            customerPhone: selectedAddress.phone || profile.phone || "",
          });
        } catch (err: unknown) {
          if (err instanceof PaymentCancelledError) {
            stage = "cancel-razorpay-checkout";
            const cancelResponse = await fetch("/api/checkout/cancel-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({ orderId: checkoutAttemptId, attemptKey: checkoutAttemptKey }),
            });
            const cancelData = await readApiResponse<{
              cancelled?: boolean;
              paid?: boolean;
              orderId?: string;
              error?: string;
            }>(cancelResponse);
            if (!cancelResponse.ok) {
              throw new Error(cancelData.error || "Unable to confirm payment cancellation.");
            }
            if (cancelData.paid && cancelData.orderId) {
              clearCheckoutAttempt();
              clearCart();
              router.push(`/checkout/success?orderId=${encodeURIComponent(cancelData.orderId)}`);
              return;
            }
            if (cancelData.cancelled) rotateCheckoutAttempt();
            return;
          }
          throw err;
        }

        stage = "verify-razorpay-payment";
        const verifyRes = await fetch("/api/checkout/verify-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            ...rzpResponse,
            checkoutAttemptId,
            checkoutAttemptKey,
          }),
        });

        const verifyData = await readApiResponse<{ verified?: boolean; error?: string }>(verifyRes);
        if (!verifyData.verified) {
          throw new Error(verifyData.error || "Payment signature verification failed");
        }

        clearCheckoutAttempt();
        clearCart();
        router.push(`/checkout/success?orderId=${encodeURIComponent(checkoutAttemptId)}`);
      }
    } catch (err: unknown) {
      const details = {
        stage,
        errorType: err instanceof Error ? err.name : typeof err,
        errorMessage: safePaymentErrorMessage(err),
        ...(err instanceof CheckoutApiError
          ? {
              httpStatus: err.status,
              ...(safeCheckoutResponseBody(err.responseBody)
                ? { apiResponseBody: safeCheckoutResponseBody(err.responseBody) }
                : {}),
            }
          : {}),
      };
      console.error("Checkout order processing failed.", details);
      setErrorMsg(errorMessage(err, "Failed to process order. Please try again."));
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
        <div className="bg-card border border-border rounded-3xl p-10 text-center max-w-md w-full shadow-xs">
          <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-card-foreground mb-2">Your Cart is Empty</h2>
          <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
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
    <div className="min-h-screen bg-background py-10 md:py-16">
      <div className="mx-auto max-w-5xl px-4 md:px-8">
        {/* Header & Steps Indicator */}
        <div className="text-center mb-10">
          <h1 className="font-extrabold text-2xl md:text-3xl text-foreground tracking-tight mb-4">
            Checkout
          </h1>

          <div className="flex items-center justify-center gap-3 md:gap-5 text-xs font-bold text-muted-foreground">
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
            <div className="w-8 md:w-12 h-px bg-border" />
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
            <div className="w-8 md:w-12 h-px bg-border" />
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
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs p-4 rounded-2xl font-medium">
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
                  className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-xs text-center space-y-6"
                >
                  <div className="h-16 w-16 bg-[#FFF3F0] text-[#F4512C] rounded-full flex items-center justify-center mx-auto">
                    <User className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-xl text-card-foreground">Account Sign In Required</h2>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
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
                      className="w-full bg-secondary border border-border hover:bg-secondary/80 text-foreground text-xs font-bold py-3.5 rounded-xl transition-colors"
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
                  className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-xs space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-extrabold text-lg text-card-foreground">Delivery Address</h2>
                      <p className="text-xs text-muted-foreground">Select or add your shipping location</p>
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
                    <form onSubmit={handleSaveAddress} className="space-y-4 pt-2 border-t border-border">
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
                        <label htmlFor="isDefault" className="text-xs text-foreground font-medium">
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
                            className="text-xs font-bold text-muted-foreground hover:text-foreground py-3 px-4"
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
                              ? "border-[#F4512C] bg-orange-500/10 ring-1 ring-[#F4512C]"
                              : "border-border bg-secondary hover:border-muted-foreground"
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
                              <span className="font-bold text-foreground">{addr.fullName}</span>
                              {addr.isDefault && (
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-muted-foreground">
                              {addr.building}, {addr.street}, {addr.city}, {addr.state} - {addr.pinCode}
                            </p>
                            <p className="text-muted-foreground font-medium">Phone: {addr.phone}</p>
                          </div>

                          {addr.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAddr(addr.id!);
                              }}
                              className="text-muted-foreground hover:text-red-500 p-1"
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
                  className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-xs space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-extrabold text-lg text-card-foreground">Select Payment Method</h2>
                      <p className="text-xs text-muted-foreground">100% Secure & Encrypted Transactions</p>
                    </div>
                    <button
                      onClick={() => setStep(2)}
                      className="text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      ← Edit Address
                    </button>
                  </div>

                  {/* Selected Delivery Address Preview */}
                  {selectedAddress && (
                    <div className="bg-secondary border border-border rounded-2xl p-4 text-xs space-y-1">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <MapPin className="h-3.5 w-3.5 text-[#F4512C]" /> Delivering to: {selectedAddress.fullName}
                      </div>
                      <p className="text-muted-foreground pl-5">
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
                          ? "border-[#F4512C] bg-orange-500/10 ring-1 ring-[#F4512C]"
                          : "border-border bg-secondary hover:border-muted-foreground"
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
                          <span className="font-bold text-xs text-foreground block">
                            Razorpay (UPI / Credit & Debit Cards / Net Banking / Wallets)
                          </span>
                          <span className="text-[11px] text-muted-foreground">
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
                          ? "border-[#F4512C] bg-orange-500/10 ring-1 ring-[#F4512C]"
                          : "border-border bg-secondary hover:border-muted-foreground"
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
                          <span className="font-bold text-xs text-foreground block">
                            Cash on Delivery (COD)
                          </span>
                          <span className="text-[11px] text-muted-foreground">
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
            <div className="bg-card border border-border rounded-3xl p-6 shadow-xs sticky top-24 space-y-4">
              <h3 className="font-bold text-sm text-card-foreground">Order Summary</h3>

              <div className="space-y-3 pb-4 border-b border-border max-h-60 overflow-y-auto">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-3 text-xs">
                    <div className="h-12 w-12 bg-secondary rounded-lg relative overflow-hidden flex-shrink-0 border border-border">
                      {item.image ? (
                        <SafeImage src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
                      ) : (
                        <ShoppingBag className="h-5 w-5 text-muted-foreground m-auto" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-card-foreground truncate">{item.name}</h4>
                      <p className="text-muted-foreground text-[10px]">
                        Qty: {item.quantity} {item.size ? `| Size: ${item.size}` : ""}
                      </p>
                    </div>
                    <span className="font-bold text-card-foreground">
                      ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-xs text-muted-foreground pb-4 border-b border-border">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-foreground">₹{cartTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge</span>
                  <span className="font-semibold text-[#F4512C]">
                    {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm font-bold text-card-foreground">
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
