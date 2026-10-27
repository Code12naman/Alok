import { NextResponse } from "next/server";
import { verifyFirebaseBearerToken } from "@/lib/server-auth";

interface CheckoutItemInput {
  productId?: string;
  quantity?: number | string;
}

function firestoreValue(value: { stringValue?: string; integerValue?: string; doubleValue?: number } | undefined) {
  if (!value) return undefined;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return Number(value.integerValue);
  return value.doubleValue;
}

export async function POST(request: Request) {
  try {
    const uid = await verifyFirebaseBearerToken(request);
    const body = await request.json();
    const { items, checkoutAttemptId, checkoutAttemptKey } = body as {
      items?: CheckoutItemInput[];
      checkoutAttemptId?: string;
      checkoutAttemptKey?: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      return NextResponse.json({ error: "Firebase product validation is not configured." }, { status: 503 });
    }

    const aggregatedItems = new Map<string, { productId: string; quantity: number }>();
    for (const item of items) {
      const productId = item.productId?.trim();
      const quantity = Number(item.quantity);
      if (!productId || !Number.isInteger(quantity) || quantity < 1) {
        throw new Error("Cart contains an invalid product or quantity.");
      }
      const existing = aggregatedItems.get(productId);
      if (existing) existing.quantity += quantity;
      else aggregatedItems.set(productId, { productId, quantity });
    }

    const verifiedItems = await Promise.all([...aggregatedItems.values()].map(async (item) => {
      const productId = item.productId?.trim();
      const quantity = Number(item.quantity);

      const productResponse = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products/${encodeURIComponent(productId)}`
      );
      if (!productResponse.ok) {
        throw new Error("One or more products are no longer available.");
      }
      const product = await productResponse.json();
      const fields = product.fields || {};
      const status = firestoreValue(fields.status);
      const stock = Number(firestoreValue(fields.stock) || 0);
      const price = Number(firestoreValue(fields.price) || 0);
      if (status !== "active" || stock < quantity || price < 0) {
        throw new Error("One or more products are unavailable or out of stock.");
      }
      return { price, quantity };
    }));

    const subtotal = verifiedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const deliveryFee = subtotal >= 999 ? 0 : 99;
    const finalAmount = subtotal + deliveryFee;
    const amountInPaisa = Math.round(finalAmount * 100);

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // If Razorpay keys are provided, create official order via Razorpay API
    if (keyId && keySecret) {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authHeader}`,
        },
        body: JSON.stringify({
          amount: amountInPaisa,
          currency: "INR",
          receipt: `ct_${uid.slice(0, 16)}_${typeof checkoutAttemptId === "string" ? checkoutAttemptId.slice(-16) : Date.now()}`,
          notes: {
            userId: uid,
            checkoutAttemptId: typeof checkoutAttemptId === "string" ? checkoutAttemptId : "",
            checkoutAttemptKey: typeof checkoutAttemptKey === "string" ? checkoutAttemptKey : "",
          },
        }),
      });

      if (!razorpayRes.ok) {
        const errData = await razorpayRes.json();
        console.error("Razorpay order creation error:", errData);
        return NextResponse.json({ error: "Failed to create Razorpay order" }, { status: 500 });
      }

      const orderData = await razorpayRes.json();
      return NextResponse.json({
        id: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId,
      });
    } else {
      return NextResponse.json(
        { error: "Razorpay is not configured. Choose another available payment method." },
        { status: 503 }
      );
    }
  } catch (error: unknown) {
    console.error("Error creating Razorpay order:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("Authentication") || message.includes("token")
      ? 401
      : message.includes("not configured")
        ? 503
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
