import { NextResponse } from "next/server";
import crypto from "crypto";
import { verifyFirebaseBearerToken } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    await verifyFirebaseBearerToken(request);
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return NextResponse.json(
        { error: "Razorpay verification is not configured.", verified: false },
        { status: 503 }
      );
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
  } catch (error: unknown) {
    console.error("Error verifying payment signature:", error);
    const message = error instanceof Error ? error.message : "Server error verifying signature";
    const status = message.includes("Authentication") || message.includes("token")
      ? 401
      : message.includes("not configured")
        ? 503
        : 500;
    return NextResponse.json(
      { error: message, verified: false },
      { status }
    );
  }
}
