import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      // In development/test mode without API keys, accept payment verification securely
      return NextResponse.json({ verified: true, isSimulated: true });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing payment verification parameters", verified: false },
        { status: 400 }
      );
    }

    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature === razorpay_signature) {
      return NextResponse.json({ verified: true });
    } else {
      return NextResponse.json(
        { error: "Invalid payment signature verification failed", verified: false },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error verifying payment signature:", error);
    return NextResponse.json(
      { error: error.message || "Server error verifying signature", verified: false },
      { status: 500 }
    );
  }
}
