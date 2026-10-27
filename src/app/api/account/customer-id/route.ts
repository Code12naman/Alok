import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { verifyFirebaseBearerToken } from "@/lib/server-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { generateReadableIdentifier, isCustomerIdentifier } from "@/lib/identifiers";

export async function POST(request: Request) {
  try {
    const uid = await verifyFirebaseBearerToken(request);
    const db = getAdminDb();
    const profileRef = db.collection("users").doc(uid);
    const rejectedIds = new Set<string>();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const result = await db.runTransaction<{ customerId?: string; collision?: string }>(async (transaction) => {
        const profileSnapshot = await transaction.get(profileRef);
        if (!profileSnapshot.exists) {
          throw new Error("Customer profile not found.");
        }

        const currentId = profileSnapshot.data()?.customerId;
        const candidate = isCustomerIdentifier(currentId) && !rejectedIds.has(currentId)
          ? currentId
          : generateReadableIdentifier("CUS");
        const reservationRef = db.collection("customerIds").doc(candidate);
        const [reservationSnapshot, matchingCustomers] = await Promise.all([
          transaction.get(reservationRef),
          transaction.get(db.collection("users").where("customerId", "==", candidate)),
        ]);

        if (
          (reservationSnapshot.exists && reservationSnapshot.data()?.userId !== uid) ||
          matchingCustomers.docs.some((customer) => customer.id !== uid)
        ) {
          return { collision: candidate };
        }

        if (!reservationSnapshot.exists) {
          transaction.set(reservationRef, {
            userId: uid,
            createdAt: FieldValue.serverTimestamp(),
          });
        }
        if (currentId !== candidate) {
          transaction.update(profileRef, { customerId: candidate });
        }

        return { customerId: candidate };
      });

      if (result.customerId) return NextResponse.json({ customerId: result.customerId });
      if (result.collision) rejectedIds.add(result.collision);
    }

    return NextResponse.json(
      { error: "Unable to reserve a unique customer ID. Please try again." },
      { status: 503 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to assign a customer ID.";
    const status = message.includes("Authentication") || message.includes("token") ? 401 : 500;
    console.error("Customer ID assignment failed:", message);
    return NextResponse.json({ error: message }, { status });
  }
}
