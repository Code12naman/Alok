import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyFirebaseAdmin } from "@/lib/server-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUid = await verifyFirebaseAdmin(request);
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "An order ID is required." }, { status: 400 });

    const orderRef = getAdminDb().collection("orders").doc(id);
    const snapshot = await orderRef.get();
    if (!snapshot.exists) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    await orderRef.update({
      archivedAt: new Date(),
      archivedBy: adminUid,
      archiveReason: "Admin retention archive",
      updatedAt: new Date(),
    });
    return NextResponse.json({ success: true, action: "archived" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to archive order.";
    const status = message.includes("Authentication") || message.includes("privileges") || message.includes("Admin")
      ? 401
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyFirebaseAdmin(request);
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "An order ID is required." }, { status: 400 });
    }

    const orderRef = getAdminDb().collection("orders").doc(id);
    const orderSnapshot = await orderRef.get();
    if (!orderSnapshot.exists) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const order = orderSnapshot.data() || {};
    const hasPaymentReference = Boolean(
      order.razorpayOrderId ||
      order.razorpayPaymentId ||
      order.paymentConfirmedAt ||
      order.paymentConfirmedBy ||
      order.refundId ||
      order.refundedAt
    );
    const isSafeToDelete =
      order.orderStatus === "Cancelled" &&
      (order.paymentStatus === "Pending" || order.paymentStatus === "Failed") &&
      Boolean(order.stockRestoredAt) &&
      !hasPaymentReference;

    if (!isSafeToDelete) {
      return NextResponse.json(
        {
          error:
            "This order cannot be deleted because it may affect payment, inventory, refund, or audit records. Cancel or retain it instead.",
        },
        { status: 409 }
      );
    }

    await orderRef.delete();
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to delete order.";
    const status = message.includes("Authentication") || message.includes("privileges") || message.includes("Admin")
      ? 401
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
