interface RazorpayFailureResponse {
  error?: { description?: string };
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal: { ondismiss: () => void };
}

interface RazorpayCheckoutInstance {
  on: (event: "payment.failed", callback: (response: RazorpayFailureResponse) => void) => void;
  open: () => void;
}

interface RazorpayCheckoutConstructor {
  new(options: RazorpayCheckoutOptions): RazorpayCheckoutInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayCheckoutConstructor;
  }
}

export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export class PaymentCancelledError extends Error {
  constructor() {
    super("Payment was cancelled.");
    this.name = "PaymentCancelledError";
  }
}

export class PaymentFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentFailedError";
  }
}

export const processRazorpayPayment = async ({
  orderId,
  amount,
  keyId,
  customerName,
  customerEmail,
  customerPhone,
}: {
  orderId: string;
  amount: number;
  keyId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}): Promise<RazorpaySuccessResponse> => {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    throw new Error("Razorpay SDK failed to load. Please check your internet connection.");
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const options: RazorpayCheckoutOptions = {
      key: keyId,
      amount: amount,
      currency: "INR",
      name: "Classic Threads MJ",
      description: `Order #${orderId}`,
      image: "/favicon.ico",
      order_id: orderId,
      prefill: {
        name: customerName || "",
        email: customerEmail || "",
        contact: customerPhone || "",
      },
      theme: {
        color: "#F4512C",
      },
      handler: (response: RazorpaySuccessResponse) => {
        if (settled) return;
        settled = true;
        resolve(response);
      },
      modal: {
        ondismiss: () => {
          if (settled) return;
          settled = true;
          reject(new PaymentCancelledError());
        },
      },
    };

    const RazorpayCheckout = window.Razorpay;
    if (!RazorpayCheckout) {
      reject(new Error("Razorpay Checkout SDK is unavailable."));
      return;
    }

    const rzp = new RazorpayCheckout(options);
    rzp.on("payment.failed", (response) => {
      if (settled) return;
      settled = true;
      reject(new PaymentFailedError(response?.error?.description || "Payment failed. Please try again."));
    });
    rzp.open();
  });
};
