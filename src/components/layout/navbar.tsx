"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Heart, ShoppingBag, User, X, Menu, ChevronDown } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { CartDrawer } from "./cart-drawer";
import { SearchOverlay } from "./search-overlay";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Shop", href: "/shop" },
  { name: "New Arrivals", href: "/shop?sort=newest" },
  { name: "Best Sellers", href: "/shop?sort=popular" },
  {
    name: "Categories",
    href: "/categories",
    dropdown: [
      { name: "Men", href: "/shop?category=Men" },
      { name: "Women", href: "/shop?category=Women" },
      { name: "Kids", href: "/shop?category=Kids" },
      { name: "Shoes", href: "/shop?category=Shoes" },
      { name: "Accessories", href: "/shop?category=Accessories" },
      { name: "Others", href: "/shop?category=Others" },
    ],
  },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/checkout" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  const pathname = usePathname();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      <header
        className={`sticky top-0 z-40 bg-white transition-shadow duration-300 border-b border-[#E6E6E3] ${
          isScrolled ? "shadow-sm" : ""
        }`}
      >
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 h-16 md:px-8">
          {/* ── Left: Logo ── */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open mobile menu"
              className="lg:hidden p-1.5 text-gray-700 hover:text-black transition"
            >
              <Menu className="h-6 w-6" />
            </button>

            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="h-8 w-8 rounded-full bg-[#F4512C] text-white flex items-center justify-center font-extrabold text-xs tracking-tighter shadow-sm flex-shrink-0">
                CT
              </span>
              <div className="flex flex-col text-left">
                <span className="font-extrabold text-sm sm:text-base md:text-lg tracking-tight text-[#111111] group-hover:text-[#F4512C] transition-colors leading-none">
                  CLASSIC <span className="text-[#F4512C]">THREAD</span>
                </span>
                <span className="text-[8px] sm:text-[9px] font-bold tracking-widest text-gray-400 uppercase mt-0.5 leading-none">
                  MJ FASHION HUB
                </span>
              </div>
            </Link>
          </div>

          {/* ── Center: Desktop Links ── */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-gray-700">
            {navLinks.map((link) => (
              <div
                key={link.name}
                className="relative group py-2"
                onMouseEnter={() => link.dropdown && setCategoryDropdownOpen(true)}
                onMouseLeave={() => link.dropdown && setCategoryDropdownOpen(false)}
              >
                <Link
                  href={link.href}
                  className={`flex items-center gap-1 transition-colors hover:text-[#F4512C] ${
                    pathname === link.href ? "text-[#F4512C] font-semibold" : ""
                  }`}
                >
                  {link.name}
                  {link.dropdown && <ChevronDown className="h-3.5 w-3.5 text-gray-400 group-hover:text-[#F4512C]" />}
                </Link>

                {/* Dropdown Menu */}
                {link.dropdown && (
                  <AnimatePresence>
                    {categoryDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-0 top-full w-48 bg-white border border-[#E6E6E3] shadow-md rounded-xl py-2 z-50"
                      >
                        {link.dropdown.map((sub) => (
                          <Link
                            key={sub.name}
                            href={sub.href}
                            className="block px-4 py-2 text-xs font-medium text-gray-700 hover:bg-[#F7F7F5] hover:text-[#F4512C] transition-colors"
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            ))}
          </nav>

          {/* ── Right: Action Icons ── */}
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Search button */}
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="p-2 text-gray-700 hover:text-[#F4512C] transition-colors rounded-full hover:bg-gray-100"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="relative p-2 text-gray-700 hover:text-[#F4512C] transition-colors rounded-full hover:bg-gray-100"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 h-4 min-w-4 bg-[#F4512C] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* User Account */}
            <Link
              href={user ? "/account" : "/login"}
              aria-label="Account"
              className="p-2 text-gray-700 hover:text-[#F4512C] transition-colors rounded-full hover:bg-gray-100 hidden sm:flex"
            >
              <User className="h-5 w-5" />
            </Link>

            {/* Cart Button */}
            <button
              onClick={() => setCartOpen(true)}
              aria-label={`Cart (${cartCount})`}
              className="relative p-2 text-gray-700 hover:text-[#F4512C] transition-colors rounded-full hover:bg-gray-100"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 h-4 min-w-4 bg-[#F4512C] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Slide-in Drawer ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs lg:hidden"
            />

            {/* Drawer panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-full max-w-xs bg-white flex flex-col shadow-xl lg:hidden"
              aria-label="Mobile Menu"
            >
              <div className="flex items-center justify-between p-5 border-b border-[#E6E6E3]">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
                  <span className="h-7 w-7 rounded-full bg-[#F4512C] text-white flex items-center justify-center font-bold text-xs">
                    N
                  </span>
                  <span className="font-bold text-lg text-[#111111]">
                    STREET<span className="text-[#F4512C]">MODE</span>
                  </span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-gray-500 hover:text-black rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm font-medium">
                {navLinks.map((link) => (
                  <div key={link.name}>
                    <Link
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2 text-gray-800 hover:text-[#F4512C] transition-colors"
                    >
                      {link.name}
                    </Link>
                    {link.dropdown && (
                      <div className="pl-4 space-y-2 mt-1 border-l-2 border-gray-100">
                        {link.dropdown.map((sub) => (
                          <Link
                            key={sub.name}
                            href={sub.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="block py-1 text-xs text-gray-500 hover:text-[#F4512C]"
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <hr className="border-[#E6E6E3] my-4" />

                <Link
                  href="/wishlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2 text-gray-800 hover:text-[#F4512C]"
                >
                  <span className="flex items-center gap-2">
                    <Heart className="h-4 w-4" /> Wishlist
                  </span>
                  {wishlistCount > 0 && (
                    <span className="bg-[#F4512C] text-white text-xs px-2 py-0.5 rounded-full font-bold">
                      {wishlistCount}
                    </span>
                  )}
                </Link>

                <Link
                  href={user ? "/account" : "/login"}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-2 text-gray-800 hover:text-[#F4512C]"
                >
                  <User className="h-4 w-4" /> {user ? "My Account" : "Sign In / Register"}
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
