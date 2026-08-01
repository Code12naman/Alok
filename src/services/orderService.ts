import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

const COL = "orders";

export type OrderStatus = "Pending" | "Confirmed" | "Processing" | "Shipped" | "Delivered" | "Cancelled";

export interface FirestoreOrder {
  id?: string;
  userId: string;
  customerName?: string;
  customerEmail?: string;
  products: { productId: string; name: string; price: number; qty: number; image?: string }[];
  totalAmount: number;
  paymentStatus?: string;
  status: OrderStatus;
  createdAt?: any;
  updatedAt?: any;
}

export const getOrders = async (): Promise<FirestoreOrder[]> => {
  const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreOrder));
};

export const updateOrderStatus = async (id: string, status: OrderStatus): Promise<void> => {
  await updateDoc(doc(db, COL, id), { status, updatedAt: serverTimestamp() });
};
