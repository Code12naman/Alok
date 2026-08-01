"use client";

import { useState, useEffect } from "react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import { FiBox, FiShoppingCart, FiDollarSign, FiUsers, FiClock, FiAlertTriangle, FiTrendingUp, FiPackage } from "react-icons/fi";
import { motion } from "framer-motion";
import Link from "next/link";

interface Stats {
  products: number;
  orders: number;
  customers: number;
  pendingOrders: number;
  lowStock: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ products: 0, orders: 0, customers: 0, pendingOrders: 0, lowStock: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const [products, orders, users, pendingOrders] = await Promise.allSettled([
          getCountFromServer(collection(db, "products")),
          getCountFromServer(collection(db, "orders")),
          getCountFromServer(query(collection(db, "users"), where("role", "==", "customer"))),
          getCountFromServer(query(collection(db, "orders"), where("status", "==", "Pending"))),
        ]);

        setStats({
          products: products.status === "fulfilled" ? products.value.data().count : 0,
          orders: orders.status === "fulfilled" ? orders.value.data().count : 0,
          customers: users.status === "fulfilled" ? users.value.data().count : 0,
          pendingOrders: pendingOrders.status === "fulfilled" ? pendingOrders.value.data().count : 0,
          lowStock: 0,
        });
      } catch (e) {
        console.error("Dashboard stats error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

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
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Link href={card.href} className="block bg-[#141414] border border-white/[0.07] rounded-xl p-5 hover:border-white/15 transition-colors group">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <FiTrendingUp className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
              </div>
              <p className="text-white/50 text-xs mb-1">{card.title}</p>
              <p className="text-3xl font-bold font-display tracking-wider">
                {loading ? <span className="text-white/20">—</span> : card.value}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((a, i) => (
            <motion.div key={a.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.07 }}>
              <Link href={a.href} className={`flex items-center gap-3 ${a.color} rounded-xl p-4 hover:opacity-90 transition-opacity`}>
                <a.icon className="w-5 h-5 text-white" />
                <span className="text-white text-sm font-semibold">{a.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FiAlertTriangle className="text-yellow-400 w-4 h-4" /> Low Stock Alert
          </h3>
          <div className="flex flex-col items-center justify-center h-32 text-white/30 text-sm">
            Low stock alerts will appear here.<br />
            <Link href="/admin/products" className="mt-3 text-[#ff6500] hover:underline text-xs">
              View all products →
            </Link>
          </div>
        </div>

        <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FiShoppingCart className="text-green-400 w-4 h-4" /> Recent Orders
          </h3>
          <div className="flex flex-col items-center justify-center h-32 text-white/30 text-sm">
            Recent orders will appear here.<br />
            <Link href="/admin/orders" className="mt-3 text-[#ff6500] hover:underline text-xs">
              View all orders →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
