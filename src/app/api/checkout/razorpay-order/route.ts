import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type { Orders } from "razorpay/dist/types/orders";
import { verifyFirebaseBearerToken } from "@/lib/server-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { isOrderIdentifier } from "@/lib/identifiers";
import { ownsOrderIdReservation } from "@/lib/order-id-reservation";
import {
  enforcePaymentRateLimit,
  getRazorpayClient,
  getRazorpayKeyId,
  logPaymentRouteFailure,
  PaymentRateLimitError,
} from "@/lib/razorpay-server";
import {
  recordCapturedPayment,
  releaseUnlinkedReservation,
} from "@/lib/razorpay-order-state";
import { checkoutDeliveryChargePaise, toPaise } from "@/lib/razorpay-utils";

export const runtime = "nodejs";

interface CheckoutItemInput {
  productId?: unknown;
  quantity?: unknown;
  size?: unknown;
  color?: unknown;
}

interface CheckoutBody {
  items?: CheckoutItemInput[];
  addressId?: unknown;
  checkoutAttemptId?: unknown;
  checkoutAttemptKey?: unknown;
}

interface NormalizedItem {
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
}

class CheckoutError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "CheckoutError";
  }
}

function isDocumentId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

function normalizeItems(input: CheckoutItemInput[] | undefined): NormalizedItem[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > 50) {
    throw new CheckoutError("The cart is empty or contains too many items.", 400);
  }

  const items = new Map<string, NormalizedItem>();
  let totalQuantity = 0;
  for (const raw of input) {
    if (!isDocumentId(raw.productId)) {
      throw new CheckoutError("The cart contains an invalid product.", 400);
    }
    const quantity = Number(raw.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      throw new CheckoutError("The cart contains an invalid quantity.", 400);
    }
    totalQuantity += quantity;
    if (totalQuantity > 100) {
      throw new CheckoutError("The cart contains too many items.", 400);
    }

    const size = typeof raw.size === "string" ? raw.size.trim() : "";
    const color = typeof raw.color === "string" ? raw.color.trim() : "";
    if (size.length > 80 || color.length > 80) {
      throw new CheckoutError("The cart contains an invalid product option.", 400);
    }
    const key = JSON.stringify([raw.productId, size, color]);
    const current = items.get(key);
    if (current) current.quantity += quantity;
    else items.set(key, {
      productId: raw.productId,
      quantity,
      ...(size ? { size } : {}),
      ...(color ? { color } : {}),
    });
  }
  return [...items.values()];
}

function imageUrl(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "url" in value && typeof value.url === "string") {
    return value.url;
  }
  return "";
}

export async function POST(request: Request) {
  let stage = "authentication";
  try {
    const uid = await verifyFirebaseBearerToken(request);
    stage = "rate-limit";
    await enforcePaymentRateLimit(uid, "create");

    let body: CheckoutBody;
    try {
      body = await request.json() as CheckoutBody;
    } catch {
      return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
    }

    const orderId = body.checkoutAttemptId;
    const attemptKey = body.checkoutAttemptKey;
    if (
      !isOrderIdentifier(orderId) ||
      typeof attemptKey !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attemptKey) ||
      !isDocumentId(body.addressId)
    ) {
      return NextResponse.json({ error: "Checkout details are invalid." }, { status: 400 });
    }

    const items = normalizeItems(body.items);
    stage = "razorpay-configuration";
    const client = getRazorpayClient();
    const keyId = getRazorpayKeyId();
    stage = "load-checkout-records";
    const db = getAdminDb();
    const orderRef = db.collection("orders").doc(orderId);
    const reservationRef = db.collection("orderIdReservations").doc(orderId);
    const profileRef = db.collection("users").doc(uid);
    const addressRef = profileRef.collection("addresses").doc(body.addressId);
    const productQuantities = new Map<string, number>();
    for (const item of items) {
      productQuantities.set(
        item.productId,
        (productQuantities.get(item.productId) || 0) + item.quantity
      );
    }

    stage = "reserve-inventory";
    const prepared = await db.runTransaction(async (transaction) => {
      const [orderSnapshot, reservationSnapshot, profileSnapshot, addressSnapshot] = await Promise.all([
        transaction.get(orderRef),
        transaction.get(reservationRef),
        transaction.get(profileRef),
        transaction.get(addressRef),
      ]);

      if (
        !reservationSnapshot.exists ||
        !ownsOrderIdReservation(reservationSnapshot.data() || {}, uid, orderId, attemptKey)
      ) {
        throw new CheckoutError("This checkout attempt is not reserved for your account.", 409);
      }

      if (orderSnapshot.exists) {
        const order = orderSnapshot.data() || {};
        if (order.userId !== uid || order.checkoutAttemptKey !== attemptKey || order.paymentMethod !== "Razorpay") {
          throw new CheckoutError("This order ID is already in use.", 409);
        }
        if (order.paymentStatus === "Paid") {
          return { state: "paid" as const };
        }
        if (order.paymentStatus === "Cancelled") {
          throw new CheckoutError("This checkout was cancelled. Start a new checkout attempt.", 409);
        }

        if (typeof order.razorpayOrderId === "string") {
          if (order.inventoryReserved !== true) {
            const quantities = new Map<string, number>();
            for (const item of Array.isArray(order.items) ? order.items : []) {
              if (isDocumentId(item.productId) && Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0) {
                quantities.set(item.productId, (quantities.get(item.productId) || 0) + Number(item.quantity));
              }
            }
            const products = [...quantities].map(([productId, quantity]) => ({
              productId,
              quantity,
              ref: db.collection("products").doc(productId),
            }));
            const snapshots = [];
            for (const product of products) snapshots.push(await transaction.get(product.ref));
            for (const [index, snapshot] of snapshots.entries()) {
              const product = snapshot.data() || {};
              if (!snapshot.exists || product.status !== "active" || Number(product.stock) < products[index].quantity) {
                throw new CheckoutError("One or more products are no longer available for retry.", 409);
              }
            }
            for (const [index, snapshot] of snapshots.entries()) {
              const product = snapshot.data() || {};
              transaction.update(products[index].ref, {
                stock: Number(product.stock) - products[index].quantity,
                updatedAt: FieldValue.serverTimestamp(),
              });
            }
          }
          transaction.update(orderRef, {
            paymentStatus: "Pending",
            paymentFailureCode: FieldValue.delete(),
            inventoryReserved: true,
            updatedAt: FieldValue.serverTimestamp(),
          });
          return {
            state: "existing" as const,
            razorpayOrderId: order.razorpayOrderId,
            amountPaise: Number(order.amountPaise),
          };
        }

        const initStartedAt = Number(order.razorpayInitStartedAt) || 0;
        if (order.paymentInitStatus === "creating" && Date.now() - initStartedAt < 120_000) {
          throw new CheckoutError("Your payment order is still being prepared. Please retry shortly.", 409);
        }

        if (order.inventoryReserved !== true) {
          const quantities = new Map<string, number>();
          for (const item of Array.isArray(order.items) ? order.items : []) {
            if (isDocumentId(item.productId) && Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0) {
              quantities.set(item.productId, (quantities.get(item.productId) || 0) + Number(item.quantity));
            }
          }
          const products = [...quantities].map(([productId, quantity]) => ({
            productId,
            quantity,
            ref: db.collection("products").doc(productId),
          }));
          const snapshots = [];
          for (const product of products) snapshots.push(await transaction.get(product.ref));
          for (const [index, snapshot] of snapshots.entries()) {
            const product = snapshot.data() || {};
            if (!snapshot.exists || product.status !== "active" || Number(product.stock) < products[index].quantity) {
              throw new CheckoutError("One or more products are no longer available for retry.", 409);
            }
          }
          for (const [index, snapshot] of snapshots.entries()) {
            const product = snapshot.data() || {};
            transaction.update(products[index].ref, {
              stock: Number(product.stock) - products[index].quantity,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        }

        transaction.update(orderRef, {
          paymentInitStatus: "creating",
          paymentStatus: "Pending",
          paymentFailureCode: FieldValue.delete(),
          inventoryReserved: true,
          razorpayInitStartedAt: Date.now(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return {
          state: "recover" as const,
          amountPaise: Number(order.amountPaise),
        };
      }

      if (!profileSnapshot.exists || !addressSnapshot.exists) {
        throw new CheckoutError("The selected delivery address is no longer available.", 400);
      }

      const profile = profileSnapshot.data() || {};
      if (typeof profile.customerId !== "string" || !profile.customerId) {
        throw new CheckoutError("Customer profile is incomplete. Refresh your account and try again.", 400);
      }

      const productRecords = [...productQuantities].map(([productId, quantity]) => ({
        productId,
        quantity,
        ref: db.collection("products").doc(productId),
      }));
      const productSnapshots = [];
      for (const product of productRecords) {
        productSnapshots.push(await transaction.get(product.ref));
      }

      const productData = new Map<string, Record<string, unknown>>();
      for (const [index, snapshot] of productSnapshots.entries()) {
        const product = snapshot.data() || {};
        const input = productRecords[index];
        const unitPaise = toPaise(Number(product.price));
        const stock = Number(product.stock);
        if (
          !snapshot.exists ||
          product.status !== "active" ||
          unitPaise === null ||
          !Number.isFinite(stock) ||
          stock < input.quantity
        ) {
          throw new CheckoutError("One or more products are unavailable or out of stock.", 400);
        }
        productData.set(input.productId, { ...product, unitPaise });
      }

      for (const item of items) {
        const product = productData.get(item.productId)!;
        const sizes = Array.isArray(product.sizes) ? product.sizes.map(String) : [];
        const colors = Array.isArray(product.colors) ? product.colors.map(String) : [];
        if (
          (item.size && sizes.length > 0 && !sizes.includes(item.size)) ||
          (item.color && colors.length > 0 && !colors.includes(item.color))
        ) {
          throw new CheckoutError("One or more selected product options are no longer available.", 400);
        }
      }

      const orderItems = items.map((item) => {
        const product = productData.get(item.productId)!;
        const unitPaise = Number(product.unitPaise);
        const subtotalPaise = unitPaise * item.quantity;
        return {
          productId: item.productId,
          name: typeof product.name === "string" ? product.name : "Product",
          image: imageUrl(Array.isArray(product.images) ? product.images[0] : product.thumbnail),
          price: unitPaise / 100,
          quantity: item.quantity,
          subtotal: subtotalPaise / 100,
          ...(item.size ? { size: item.size } : {}),
          ...(item.color ? { color: item.color } : {}),
        };
      });

      for (const { productId, quantity, ref } of productRecords) {
        const product = productData.get(productId)!;
        transaction.update(ref, {
          stock: Number(product.stock) - quantity,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      const subtotalPaise = orderItems.reduce(
        (sum, item) => sum + Math.round(item.subtotal * 100),
        0
      );
      const deliveryChargePaise = checkoutDeliveryChargePaise(subtotalPaise);
      const amountPaise = subtotalPaise + deliveryChargePaise;
      if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
        throw new CheckoutError("The order total is invalid.", 400);
      }

      const address = addressSnapshot.data() || {};
      const building = typeof address.building === "string" && address.building.trim()
        ? address.building.trim()
        : typeof address.addressLine1 === "string" ? address.addressLine1.trim() : "";
      const street = typeof address.street === "string" && address.street.trim()
        ? address.street.trim()
        : typeof address.addressLine2 === "string" ? address.addressLine2.trim() : "";
      const pinCode = typeof address.pinCode === "string" && address.pinCode.trim()
        ? address.pinCode.trim()
        : typeof address.postalCode === "string" ? address.postalCode.trim() : "";
      const shippingAddress = {
        fullName: typeof address.fullName === "string" ? address.fullName.trim() : "",
        phone: typeof address.phone === "string" ? address.phone.trim() : "",
        building,
        street,
        addressLine1: building,
        addressLine2: street,
        city: typeof address.city === "string" ? address.city.trim() : "",
        state: typeof address.state === "string" ? address.state.trim() : "",
        pinCode,
        postalCode: pinCode,
        country: typeof address.country === "string" ? address.country.trim() : "India",
        ...(typeof address.landmark === "string" && address.landmark.trim()
          ? { landmark: address.landmark.trim() }
          : {}),
      };
      if (
        !shippingAddress.fullName ||
        !shippingAddress.phone ||
        !shippingAddress.building ||
        !shippingAddress.city ||
        !shippingAddress.state ||
        !shippingAddress.pinCode
      ) {
        throw new CheckoutError("The selected delivery address is incomplete.", 400);
      }
      const order = {
        orderNumber: orderId,
        orderId,
        userId: uid,
        customerId: profile.customerId,
        customer: {
          name: shippingAddress.fullName || "Customer",
          email: typeof profile.email === "string" ? profile.email : "",
          phone: shippingAddress.phone,
        },
        customerName: shippingAddress.fullName || "Customer",
        customerEmail: typeof profile.email === "string" ? profile.email : "",
        shippingAddress,
        deliveryAddress: shippingAddress,
        items: orderItems,
        products: orderItems,
        subtotal: subtotalPaise / 100,
        discount: 0,
        couponCode: "",
        deliveryCharge: deliveryChargePaise / 100,
        finalAmount: amountPaise / 100,
        totalAmount: amountPaise / 100,
        amountPaise,
        currency: "INR",
        paymentMethod: "Razorpay",
        paymentStatus: "Pending",
        orderStatus: "Pending",
        status: "Pending",
        checkoutAttemptId: orderId,
        checkoutAttemptKey: attemptKey,
        paymentInitStatus: "creating",
        razorpayInitStartedAt: Date.now(),
        inventoryReserved: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      transaction.create(orderRef, order);
      return { state: "new" as const, amountPaise };
    });

    if (prepared.state === "paid") {
      return NextResponse.json({ alreadyPaid: true, orderId });
    }

    let providerOrder: Orders.RazorpayOrder | undefined;
    if (prepared.state === "existing") {
      stage = "fetch-existing-razorpay-order";
      providerOrder = await client.orders.fetch(prepared.razorpayOrderId);
    } else {
      stage = "find-existing-razorpay-order";
      let existingProviderOrders: { items: Orders.RazorpayOrder[] };
      try {
        existingProviderOrders = await client.orders.all({ receipt: orderId });
      } catch (error) {
        if (prepared.state === "new") {
          await releaseUnlinkedReservation(db, orderId, uid, attemptKey);
        }
        throw error;
      }
      providerOrder = existingProviderOrders.items.find((candidate) =>
        Number(candidate.amount) === prepared.amountPaise &&
        candidate.currency === "INR" &&
        candidate.notes?.userId === uid &&
        candidate.notes?.checkoutAttemptId === orderId &&
        candidate.notes?.checkoutAttemptKey === attemptKey
      );
      if (!providerOrder) {
        stage = "create-razorpay-order";
        try {
          providerOrder = await client.orders.create({
            amount: prepared.amountPaise,
            currency: "INR",
            receipt: orderId,
            partial_payment: false,
            notes: {
              userId: uid,
              checkoutAttemptId: orderId,
              checkoutAttemptKey: attemptKey,
            },
          });
        } catch (error) {
          try {
            const retryLookup = await client.orders.all({ receipt: orderId });
            providerOrder = retryLookup.items.find((candidate) =>
              Number(candidate.amount) === prepared.amountPaise &&
              candidate.currency === "INR" &&
              candidate.notes?.userId === uid &&
              candidate.notes?.checkoutAttemptId === orderId &&
              candidate.notes?.checkoutAttemptKey === attemptKey
            );
            if (!providerOrder) {
              await releaseUnlinkedReservation(db, orderId, uid, attemptKey);
              throw error;
            }
          } catch (lookupError) {
            if (lookupError === error) throw error;
            logPaymentRouteFailure("reconcile-razorpay-order-after-create-error", lookupError);
            throw error;
          }
        }
      }

      stage = "link-razorpay-order";
      await db.runTransaction(async (transaction) => {
        const currentOrder = await transaction.get(orderRef);
        if (!currentOrder.exists) throw new Error("Checkout order could not be confirmed.");
        const current = currentOrder.data() || {};
        if (
          current.userId !== uid ||
          current.checkoutAttemptKey !== attemptKey ||
          current.paymentStatus === "Cancelled" ||
          current.paymentStatus === "Paid" ||
          Number(current.amountPaise) !== prepared!.amountPaise
        ) {
          throw new CheckoutError("The checkout order changed while payment was initializing.", 409);
        }
        transaction.update(orderRef, {
          razorpayOrderId: providerOrder!.id,
          paymentInitStatus: "ready",
          paymentStatus: current.paymentStatus === "Failed" ? "Pending" : current.paymentStatus,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
    }

    if (
      !providerOrder ||
      Number(providerOrder.amount) !== prepared.amountPaise ||
      providerOrder.currency !== "INR"
    ) {
      throw new Error("Razorpay returned an invalid payment order.");
    }

    if (providerOrder.status === "paid") {
      stage = "reconcile-captured-payment";
      const payments = await client.orders.fetchPayments(providerOrder.id);
      const capturedPayment = payments.items.find((payment) => payment.status === "captured");
      if (capturedPayment) {
        await recordCapturedPayment(db, orderId, capturedPayment, uid, attemptKey);
        return NextResponse.json({ alreadyPaid: true, orderId });
      }
    }

    return NextResponse.json({
      id: providerOrder.id,
      amount: Number(providerOrder.amount),
      currency: providerOrder.currency,
      keyId,
      orderId,
    });
  } catch (error: unknown) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof PaymentRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof Error && /authentication|token/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error && /not configured/i.test(error.message)) {
      logPaymentRouteFailure(stage, error);
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    logPaymentRouteFailure(stage, error);
    return NextResponse.json({ error: "Unable to initialize payment. Please retry." }, { status: 502 });
  }
}
