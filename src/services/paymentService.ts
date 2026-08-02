/**
 * Dynamically loads the Razorpay Checkout SDK script into the browser context.
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
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
    const options = {
      key: keyId,
      amount: amount,
      currency: "INR",
      name: "STREETMODE",
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
      handler: function (response: RazorpaySuccessResponse) {
        resolve(response);
      },
      modal: {
        ondismiss: function () {
          reject(new Error("Payment window was cancelled by user."));
        },
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on("payment.failed", function (response: any) {
      reject(new Error(response?.error?.description || "Payment failed"));
    });
    rzp.open();
  });
};
