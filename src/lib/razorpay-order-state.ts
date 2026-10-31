import "server-only";

import {
  FieldValue,
  type DocumentReference,
  type Firestore,
} from "firebase-admin/firestore";

interface CapturedPayment {
  id: string;
  order_id: string;
  amount: number | string;
  currency: string;
  status: string;
}

interface EventReceipt {
  ref: DocumentReference;
  eventType: string;
}

export async function recordCapturedPayment(
  db: Firestore,
  internalOrderId: string,
  payment: CapturedPayment,
  expectedUid?: string,
  expectedAttemptKey?: string,
  eventReceipt?: EventReceipt
): Promise<void> {
  const orderRef = db.collection("orders").doc(internalOrderId);

  await db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    const eventSnapshot = eventReceipt ? await transaction.get(eventReceipt.ref) : null;
    if (eventSnapshot?.exists) return;
    if (!orderSnapshot.exists) throw new Error("Payment order was not found.");

    const order = orderSnapshot.data() || {};
    if (
      (expectedUid && order.userId !== expectedUid) ||
      (expectedAttemptKey && order.checkoutAttemptKey !== expectedAttemptKey) ||
      order.paymentMethod !== "Razorpay" ||
      order.razorpayOrderId !== payment.order_id ||
      payment.status !== "captured" ||
      payment.currency !== "INR" ||
      Number(order.amountPaise) !== Number(payment.amount)
    ) {
      throw new Error("Payment details do not match the reserved order.");
    }

    if (order.paymentStatus === "Paid") {
      if (order.razorpayPaymentId !== payment.id) {
        throw new Error("A different payment has already been recorded for this order.");
      }
      if (eventReceipt) {
        transaction.create(eventReceipt.ref, {
          eventType: eventReceipt.eventType,
          processedAt: FieldValue.serverTimestamp(),
        });
      }
      return;
    }

    let inventoryIssue = false;
    const productQuantities = new Map<string, number>();
    for (const item of Array.isArray(order.items) ? order.items : []) {
      if (typeof item.productId === "string" && Number(item.quantity) > 0) {
        productQuantities.set(
          item.productId,
          (productQuantities.get(item.productId) || 0) + Number(item.quantity)
        );
      }
    }

    if (order.inventoryReserved !== true) {
      const productRecords = [...productQuantities].map(([productId, quantity]) => ({
        quantity,
        ref: db.collection("products").doc(productId),
      }));
      const snapshots = [];
      for (const product of productRecords) {
        snapshots.push(await transaction.get(product.ref));
      }

      const canReserve = snapshots.every((snapshot, index) => {
        const product = snapshot.data() || {};
        return snapshot.exists &&
          product.status === "active" &&
          Number(product.stock) >= productRecords[index].quantity;
      });

      if (canReserve) {
        for (const [index, snapshot] of snapshots.entries()) {
          const product = snapshot.data() || {};
          transaction.update(productRecords[index].ref, {
            stock: Number(product.stock) - productRecords[index].quantity,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      } else {
        inventoryIssue = true;
      }
    }

    transaction.update(orderRef, {
      paymentStatus: "Paid",
      paymentMethod: "Razorpay",
      razorpayPaymentId: payment.id,
      paymentVerifiedAt: FieldValue.serverTimestamp(),
      orderStatus: "Order Confirmed",
      status: "Order Confirmed",
      inventoryReserved: inventoryIssue ? false : true,
      ...(inventoryIssue ? { inventoryIssue: "Payment captured after stock reservation was released." } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (eventReceipt) {
      transaction.create(eventReceipt.ref, {
        eventType: eventReceipt.eventType,
        processedAt: FieldValue.serverTimestamp(),
      });
    }
  });
}

export async function recordFailedPayment(
  db: Firestore,
  internalOrderId: string,
  razorpayOrderId: string,
  paymentId: string,
  failureCode: string | null,
  eventReceipt: EventReceipt
): Promise<void> {
  const orderRef = db.collection("orders").doc(internalOrderId);

  await db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    const eventSnapshot = await transaction.get(eventReceipt.ref);
    if (eventSnapshot.exists) return;
    if (!orderSnapshot.exists) throw new Error("Payment order was not found.");

    const order = orderSnapshot.data() || {};
    if (order.paymentMethod !== "Razorpay" || order.razorpayOrderId !== razorpayOrderId) {
      throw new Error("Payment does not match the reserved order.");
    }

    if (order.paymentStatus !== "Paid" && order.paymentStatus !== "Cancelled") {
      const quantities = new Map<string, number>();
      for (const item of Array.isArray(order.items) ? order.items : []) {
        if (typeof item.productId === "string" && Number(item.quantity) > 0) {
          quantities.set(item.productId, (quantities.get(item.productId) || 0) + Number(item.quantity));
        }
      }
      const products = [...quantities].map(([productId, quantity]) => ({
        quantity,
        ref: db.collection("products").doc(productId),
      }));
      const snapshots = [];
      if (order.inventoryReserved === true) {
        for (const product of products) snapshots.push(await transaction.get(product.ref));
      }
      for (const [index, snapshot] of snapshots.entries()) {
        if (snapshot.exists) {
          const product = snapshot.data() || {};
          transaction.update(products[index].ref, {
            stock: (Number(product.stock) || 0) + products[index].quantity,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      transaction.update(orderRef, {
        paymentStatus: "Failed",
        razorpayPaymentId: paymentId,
        paymentFailureCode: failureCode || null,
        inventoryReserved: false,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    transaction.create(eventReceipt.ref, {
      eventType: eventReceipt.eventType,
      processedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function cancelUnpaidOrder(
  db: Firestore,
  internalOrderId: string,
  uid: string,
  attemptKey: string
): Promise<"cancelled" | "paid" | "not_found"> {
  const orderRef = db.collection("orders").doc(internalOrderId);

  return db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) return "not_found";
    const order = orderSnapshot.data() || {};

    if (order.userId !== uid || order.checkoutAttemptKey !== attemptKey) {
      throw new Error("This order does not belong to the authenticated checkout.");
    }
    if (order.paymentStatus === "Paid") return "paid";
    if (order.paymentStatus === "Cancelled") return "cancelled";
    if (!["Pending", "Failed"].includes(order.paymentStatus)) {
      throw new Error("This order cannot be cancelled.");
    }

    const quantities = new Map<string, number>();
    for (const item of Array.isArray(order.items) ? order.items : []) {
      if (typeof item.productId === "string" && Number(item.quantity) > 0) {
        quantities.set(item.productId, (quantities.get(item.productId) || 0) + Number(item.quantity));
      }
    }

    const products = [...quantities].map(([productId, quantity]) => ({
      quantity,
      ref: db.collection("products").doc(productId),
    }));
    const snapshots = [];
    if (order.inventoryReserved === true) {
      for (const product of products) snapshots.push(await transaction.get(product.ref));
    }

    for (const [index, snapshot] of snapshots.entries()) {
      if (snapshot.exists) {
        const product = snapshot.data() || {};
        transaction.update(products[index].ref, {
          stock: (Number(product.stock) || 0) + products[index].quantity,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    transaction.update(orderRef, {
      paymentStatus: "Cancelled",
      orderStatus: "Cancelled",
      status: "Cancelled",
      inventoryReserved: false,
      cancelledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return "cancelled";
  });
}

export async function releaseUnlinkedReservation(
  db: Firestore,
  internalOrderId: string,
  uid: string,
  attemptKey: string
): Promise<void> {
  const orderRef = db.collection("orders").doc(internalOrderId);

  await db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) return;
    const order = orderSnapshot.data() || {};
    if (
      order.userId !== uid ||
      order.checkoutAttemptKey !== attemptKey ||
      order.paymentStatus === "Paid" ||
      order.razorpayOrderId ||
      order.inventoryReserved !== true
    ) {
      return;
    }

    const quantities = new Map<string, number>();
    for (const item of Array.isArray(order.items) ? order.items : []) {
      if (typeof item.productId === "string" && Number(item.quantity) > 0) {
        quantities.set(item.productId, (quantities.get(item.productId) || 0) + Number(item.quantity));
      }
    }
    const products = [...quantities].map(([productId, quantity]) => ({
      quantity,
      ref: db.collection("products").doc(productId),
    }));
    const snapshots = [];
    for (const product of products) snapshots.push(await transaction.get(product.ref));
    for (const [index, snapshot] of snapshots.entries()) {
      if (snapshot.exists) {
        const product = snapshot.data() || {};
        transaction.update(products[index].ref, {
          stock: (Number(product.stock) || 0) + products[index].quantity,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    transaction.update(orderRef, {
      paymentStatus: "Failed",
      paymentInitStatus: "failed",
      paymentInitFailedAt: FieldValue.serverTimestamp(),
      inventoryReserved: false,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}
