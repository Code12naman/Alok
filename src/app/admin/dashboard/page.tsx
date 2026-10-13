"use client";

import { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { adminDb } from "@/firebase/config";
import { getProducts, FirestoreProduct } from "@/services/productService";
import { getOrders, NormalizedOrder } from "@/services/orderService";
import {
  FiBox,
  FiShoppingCart,
  FiUsers,
  FiClock,
  FiAlertTriangle,
  FiTrendingUp,
  FiPackage,
  FiArrowRight,
  FiLoader,
} from "react-icons/fi";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAdminAuth } from "@/context/AdminAuthContext";

const LOW_STOCK_THRESHOLD = 5;
const RECENT_ORDER_LIMIT = 5;

interface Stats {
  products: number;
  orders: number;
  customers: number;
  pendingOrders: number;
  lowStock: number;
}

function formatOrderDate(order: NormalizedOrder) {
  return order.createdAtFormatted !== "—" ? order.createdAtFormatted : "Date unavailable";
}

export default function AdminDashboard() {
  const { user, role, loading: authLoading } = useAdminAuth();
  const [stats, setStats] = useState<Stats>({ products: 0, orders: 0, customers: 0, pendingOrders: 0, lowStock: 0 });
  const [lowStockProducts, setLowStockProducts] = useState<FirestoreProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<NormalizedOrder[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || role !== "admin") return;

    let active = true;
    async function fetchDashboardData() {
      setStatsLoading(true);
      setInventoryLoading(true);
      setOrdersLoading(true);
      setInventoryError(null);
      setOrdersError(null);

      const [countsResult, productsResult, ordersResult] = await Promise.allSettled([
        Promise.all([
          getCountFromServer(collection(adminDb, "products")),
          getCountFromServer(collection(adminDb, "orders")),
          getCountFromServer(query(collection(adminDb, "users"), where("role", "==", "customer"))),
          getCountFromServer(query(collection(adminDb, "orders"), where("status", "==", "Pending"))),
        ]),
        getProducts(),
        getOrders(),
      ]);

      if (!active) return;

      if (countsResult.status === "fulfilled") {
        const [products, orders, users, pendingOrders] = countsResult.value;
        setStats((current) => ({
          ...current,
          products: products.data().count,
          orders: orders.data().count,
          customers: users.data().count,
          pendingOrders: pendingOrders.data().count,
        }));
      } else {
        console.error("Dashboard stats error:", countsResult.reason);
      }
      setStatsLoading(false);

      if (productsResult.status === "fulfilled") {
        const activeProducts = productsResult.value.filter(
          (product) => product.status === "active" && Number.isFinite(Number(product.stock))
        );
        const lowStock = activeProducts
          .filter((product) => Number(product.stock) <= LOW_STOCK_THRESHOLD)
          .sort((a, b) => Number(a.stock) - Number(b.stock));
        setLowStockProducts(lowStock);
        setStats((current) => ({ ...current, lowStock: lowStock.length }));
      } else {
        console.error("Dashboard inventory error:", productsResult.reason);
        setInventoryError("Could not load inventory alerts. Please try again.");
      }
      setInventoryLoading(false);

      if (ordersResult.status === "fulfilled") {
        const sorted = [...ordersResult.value]
          .sort((a, b) => {
            const aSeconds = Number(a.createdAt?.seconds || 0);
            const bSeconds = Number(b.createdAt?.seconds || 0);
            return bSeconds - aSeconds;
          })
          .slice(0, RECENT_ORDER_LIMIT);
        setRecentOrders(sorted);
      } else {
        console.error("Dashboard recent orders error:", ordersResult.reason);
        setOrdersError("Could not load recent orders. Please try again.");
      }
      setOrdersLoading(false);
    }

    fetchDashboardData();
    return () => {
      active = false;
    };
  }, [user, role, authLoading]);

  const isLoading = authLoading || statsLoading;
  const cards = [
    { title: "Total Products", value: stats.products, icon: FiBox, color: "text-blue-400", bg: "bg-blue-500/10", href: "/admin/products" },
    { title: "Total Orders", value: stats.orders, icon: FiShoppingCart, color: "text-green-400", bg: "bg-green-500/10", href: "/admin/orders" },
    { title: "Customers", value: stats.customers, icon: FiUsers, color: "text-purple-400", bg: "bg-purple-500/10", href: "/admin/customers" },
    { title: "Pending Orders", value: stats.pendingOrders, icon: FiClock, color: "text-yellow-400", bg: "bg-yellow-500/10", href: "/admin/orders" },
  ];
  const quickActions = [
    { label: "Add Product", href: "/admin/products/add", icon: FiBox, color: "bg-[#ff6500]" },
    { label: "View Orders", href: "/admin/orders", icon: FiShoppingCart, color: "bg-blue-600" },
    { label: "Manage Categories", href: "/admin/categories", icon: FiPackage, color: "bg-purple-600" },
    { label: "View Customers", href: "/admin/customers", icon: FiUsers, color: "bg-green-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, i) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Link href={card.href} className="group block rounded-xl border border-white/[0.07] bg-[#141414] p-5 transition-colors hover:border-white/15">
              <div className="mb-4 flex items-start justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}><card.icon className={`h-5 w-5 ${card.color}`} /></div>
                <FiTrendingUp className="h-4 w-4 text-white/20 transition-colors group-hover:text-white/40" />
              </div>
              <p className="mb-1 text-xs text-white/50">{card.title}</p>
              <p className="font-display text-3xl font-bold tracking-wider">{isLoading ? <span className="text-white/20">—</span> : card.value}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/50">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {quickActions.map((action, i) => (
            <motion.div key={action.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.07 }}>
              <Link href={action.href} className={`flex items-center gap-3 rounded-xl ${action.color} p-4 transition-opacity hover:opacity-90`}>
                <action.icon className="h-5 w-5 text-white" /><span className="text-sm font-semibold text-white">{action.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-white/[0.07] bg-[#141414] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold"><FiAlertTriangle className="h-4 w-4 text-yellow-400" /> Low Stock Alert</h3>
            <span className="text-[11px] text-white/40">At or below {LOW_STOCK_THRESHOLD}</span>
          </div>
          {inventoryLoading ? <div className="flex h-32 items-center justify-center"><FiLoader className="h-5 w-5 animate-spin text-[#ff6500]" /></div>
            : inventoryError ? <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-xs text-red-300">{inventoryError}</p>
              : lowStockProducts.length === 0 ? <div className="flex h-32 flex-col items-center justify-center text-sm text-white/40">No active products need restocking.</div>
                : <div className="space-y-2">{lowStockProducts.slice(0, 6).map((product) => <Link key={product.id} href={`/admin/products/edit/${product.id}`} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#0a0a0a] p-3 transition-colors hover:border-yellow-500/40"><span className="min-w-0 truncate text-xs font-semibold text-white/90">{product.name}</span><span className="ml-3 shrink-0 text-xs font-bold text-yellow-400">{product.stock} left</span></Link>)}<Link href="/admin/products" className="inline-flex items-center gap-1 text-xs font-bold text-[#ff6500] hover:underline">View all products <FiArrowRight /></Link></div>}
        </section>

        <section className="rounded-xl border border-white/[0.07] bg-[#141414] p-6">
          <div className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 font-semibold"><FiShoppingCart className="h-4 w-4 text-green-400" /> Recent Orders</h3><Link href="/admin/orders" className="text-xs font-bold text-[#ff6500] hover:underline">View all</Link></div>
          {ordersLoading ? <div className="flex h-32 items-center justify-center"><FiLoader className="h-5 w-5 animate-spin text-[#ff6500]" /></div>
            : ordersError ? <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-xs text-red-300">{ordersError}</p>
              : recentOrders.length === 0 ? <div className="flex h-32 items-center justify-center text-sm text-white/40">No orders found.</div>
                : <div className="space-y-2">{recentOrders.map((order) => {
                  const customerName = order.customer.name?.trim() || "Guest Customer";
                  const orderReference = order.orderNumber || order.orderId;

                  return (
                    <Link
                      key={order.id}
                      href={`/admin/orders/${order.id}`}
                      className="block rounded-lg border border-white/[0.06] bg-[#0a0a0a] p-3 transition-colors hover:border-white/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[#ff6500]">{customerName}</p>
                          <p className="mt-1 truncate text-[10px] text-white/50">
                            #{orderReference} · {formatOrderDate(order)}
                          </p>
                        </div>
                        <div className="min-w-0 shrink-0 text-right">
                          <p className="text-xs font-bold text-[#ff6500]">₹{order.finalAmount.toLocaleString("en-IN")}</p>
                          <p className="mt-1 max-w-32 truncate text-[10px] text-white/50">
                            {order.status} · {order.paymentStatus}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}</div>}
        </section>
      </div>
    </div>
  );
}
