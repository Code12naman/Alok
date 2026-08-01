"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { logoutUser } from "@/services/authService";
import {
  FiHome, FiBox, FiPlusSquare, FiList, FiShoppingCart,
  FiUsers, FiTag, FiSettings, FiLogOut, FiSearch,
  FiBell, FiMenu, FiX, FiChevronRight,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

const sidebarLinks = [
  { name: "Dashboard", href: "/admin/dashboard", icon: FiHome },
  {
    name: "Products",
    icon: FiBox,
    children: [
      { name: "All Products", href: "/admin/products", icon: FiBox },
      { name: "Add Product", href: "/admin/products/add", icon: FiPlusSquare },
    ],
  },
  { name: "Categories", href: "/admin/categories", icon: FiList },
  { name: "Orders", href: "/admin/orders", icon: FiShoppingCart },
  { name: "Customers", href: "/admin/customers", icon: FiUsers },
  { name: "Coupons", href: "/admin/coupons", icon: FiTag },
  { name: "Settings", href: "/admin/settings", icon: FiSettings },
];

function SidebarContent({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  const [productsOpen, setProductsOpen] = useState(
    pathname.startsWith("/admin/products")
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 flex items-center justify-between border-b border-white/10">
        <Link href="/admin/dashboard" onClick={onClose} className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded bg-[#ff6500] text-[10px] font-bold tracking-widest text-white">SM</span>
          <span className="font-bold tracking-[0.12em] text-base">ADMIN</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <FiX className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        {sidebarLinks.map((link) => {
          if (link.children) {
            const isGroupActive = pathname.startsWith("/admin/products");
            return (
              <div key={link.name}>
                <button
                  onClick={() => setProductsOpen((o) => !o)}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                    isGroupActive ? "bg-[#ff6500]/10 text-[#ff6500]" : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <link.icon className="w-4 h-4" />
                    {link.name}
                  </span>
                  <FiChevronRight className={`w-3.5 h-3.5 transition-transform ${productsOpen ? "rotate-90" : ""}`} />
                </button>
                <AnimatePresence>
                  {productsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {link.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          onClick={onClose}
                          className={`flex items-center gap-3 pl-10 pr-3 py-2 rounded-lg transition-colors text-sm mt-0.5 ${
                            pathname === child.href ? "bg-[#ff6500]/10 text-[#ff6500]" : "text-white/60 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <child.icon className="w-3.5 h-3.5" />
                          {child.name}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive ? "bg-[#ff6500]/10 text-[#ff6500]" : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <link.icon className="w-4 h-4" />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={async () => { await logoutUser(); onClose?.(); }}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-white/70 hover:bg-white/5 hover:text-red-400 transition-colors text-sm font-medium"
        >
          <FiLogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoginPage = pathname === "/admin/login";
  const isForbiddenPage = pathname === "/admin/forbidden";

  if (isLoginPage || isForbiddenPage) {
    return <AdminProtectedRoute>{children}</AdminProtectedRoute>;
  }

  const currentPageName =
    sidebarLinks
      .flatMap((l) => (l.children ? l.children : [l]))
      .find((l) => l.href === pathname)?.name || "Admin";

  return (
    <AdminProtectedRoute>
      <div className="flex min-h-screen bg-[#050505] text-white">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden lg:flex w-56 xl:w-64 border-r border-white/[0.07] bg-[#0a0a0a] flex-col flex-shrink-0">
          <SidebarContent pathname={pathname} />
        </aside>

        {/* MOBILE SIDEBAR OVERLAY */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.25 }}
                className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-white/10 flex flex-col"
              >
                <SidebarContent pathname={pathname} onClose={() => setMobileOpen(false)} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* TOP BAR */}
          <header className="h-14 border-b border-white/[0.07] bg-[#0a0a0a] flex items-center justify-between px-4 md:px-6 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden text-white/60 hover:text-white p-1.5 rounded-md hover:bg-white/5"
              >
                <FiMenu className="w-5 h-5" />
              </button>
              <h1 className="font-bold tracking-wider text-white/90 text-sm">
                {currentPageName}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-4 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#ff6500]/50 transition-colors w-48"
                />
              </div>
              <button className="relative text-white/50 hover:text-white transition-colors p-1.5">
                <FiBell className="w-4.5 h-4.5" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#ff6500] rounded-full" />
              </button>
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#ff6500] to-orange-400 flex-shrink-0" />
            </div>
          </header>

          {/* PAGE CONTENT */}
          <main className="flex-1 p-4 md:p-6 xl:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminProtectedRoute>
  );
}
