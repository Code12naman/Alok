import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, address } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Backend price recalculation
    const subtotal = items.reduce((sum: number, item: any) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;
      return sum + price * qty;
    }, 0);

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
          receipt: `receipt_${Date.now()}`,
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
      // Return simulated order payload when running without secret API key configured
      const mockOrderId = `order_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      return NextResponse.json({
        id: mockOrderId,
        amount: amountInPaisa,
        currency: "INR",
        keyId: keyId || "rzp_test_mockkey",
        isSimulated: true,
      });
    }
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
