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
    if (!id) return NextResponse.json({ error: "A customer ID is required." }, { status: 400 });

    const userRef = getAdminDb().collection("users").doc(id);
    const snapshot = await userRef.get();
    if (!snapshot.exists) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    if (snapshot.get("role") !== "customer") {
      return NextResponse.json({ error: "Only customer profiles can be archived." }, { status: 403 });
    }

    await userRef.update({
      accountStatus: "archived",
      archivedAt: new Date(),
      archivedBy: adminUid,
      updatedAt: new Date(),
    });
    return NextResponse.json({ success: true, action: "archived" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to archive customer.";
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
      return NextResponse.json({ error: "A customer ID is required." }, { status: 400 });
    }

    const db = getAdminDb();
    const userRef = db.collection("users").doc(id);
    const userSnapshot = await userRef.get();
    if (!userSnapshot.exists) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }
    if (userSnapshot.get("role") !== "customer") {
      return NextResponse.json({ error: "Only customer profiles can be deleted." }, { status: 403 });
    }

    const ordersSnapshot = await db.collection("orders").where("userId", "==", id).limit(1).get();
    if (!ordersSnapshot.empty) {
      return NextResponse.json(
        { error: "This customer has order history and cannot be deleted. Cancel or archive the orders instead." },
        { status: 409 }
      );
    }

    const subcollections = await userRef.listCollections();
    for (const subcollection of subcollections) {
      const relatedSnapshot = await subcollection.limit(1).get();
      if (!relatedSnapshot.empty) {
        return NextResponse.json(
          { error: "This customer has related account data and cannot be deleted without a safe retention policy." },
          { status: 409 }
        );
      }
    }

    await userRef.delete();
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to delete customer.";
    const status = message.includes("Authentication") || message.includes("privileges") || message.includes("Admin")
      ? 401
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
