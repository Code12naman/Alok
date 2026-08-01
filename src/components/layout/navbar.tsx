"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FiHeart, FiMenu, FiSearch, FiShoppingBag, FiUser, FiX } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { CartDrawer } from "./cart-drawer";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Shop", href: "/shop" },
  { name: "Lookbook", href: "/categories" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/checkout" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="fixed left-0 right-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-5"
        aria-label="Primary navigation"
      >
        <motion.div
          animate={{
            backgroundColor: isScrolled ? "rgba(11, 11, 11, 0.92)" : "rgba(11, 11, 11, 0.32)",
            borderRadius: isScrolled ? 18 : 999,
            boxShadow: isScrolled ? "0 18px 55px rgba(0, 0, 0, 0.35)" : "0 10px 35px rgba(0, 0, 0, 0.12)",
          }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-[1600px] border border-white/15 px-4 py-3 backdrop-blur-xl sm:px-5"
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <Link href="/" className="relative z-10 flex w-fit items-center gap-3" aria-label="Street Mode home">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ff6a00] text-[11px] font-bold tracking-[0.18em] text-white">SM</span>
              <span className="hidden font-display text-2xl leading-none tracking-[0.15em] text-white sm:block">STREET MODE</span>
            </Link>

            <div className="hidden xl:flex items-center gap-7 2xl:gap-10">
              {navLinks.map((link) => (
                <Link key={link.name} href={link.href} className="group relative py-2 font-display text-xl uppercase tracking-[0.14em] text-white/80 transition-colors hover:text-white">
                  {link.name}
                  <span className="absolute bottom-0 left-1/2 h-px w-0 -translate-x-1/2 bg-[#ff6a00] transition-all duration-300 group-hover:w-full" />
                </Link>
              ))}
            </div>

            <div className="relative z-10 flex items-center justify-end gap-1 sm:gap-2">
              <div className="hidden items-center gap-1 md:flex">
                <Button variant="ghost" size="icon" aria-label="Search" className="rounded-full text-white hover:bg-white/10 hover:text-white"><FiSearch className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" aria-label="Wishlist" className="rounded-full text-white hover:bg-white/10 hover:text-white"><FiHeart className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" aria-label="Profile" className="rounded-full text-white hover:bg-white/10 hover:text-white"><FiUser className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" aria-label="Open cart" onClick={() => setCartOpen(true)} className="relative rounded-full text-white hover:bg-white/10 hover:text-white">
                  <FiShoppingBag className="h-4 w-4" />
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff6a00] px-1 text-[10px] font-semibold text-white">2</span>
                </Button>
              </div>
              <button
                type="button"
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((open) => !open)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-white/10 xl:hidden"
              >
                {mobileMenuOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, clipPath: "inset(0 0 100% 0 round 0 0 24px 24px)" }}
            animate={{ opacity: 1, clipPath: "inset(0 0 0% 0 round 0 0 24px 24px)" }}
            exit={{ opacity: 0, clipPath: "inset(0 0 100% 0 round 0 0 24px 24px)" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 flex min-h-svh flex-col bg-[#0b0b0b]/98 px-7 pb-10 pt-30 text-white backdrop-blur-2xl"
          >
            <nav className="flex flex-1 flex-col justify-center gap-5" aria-label="Mobile navigation">
              {navLinks.map((link, index) => (
                <motion.div key={link.name} initial={{ opacity: 0, x: -22 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 + index * 0.06 }}>
                  <Link href={link.href} onClick={() => setMobileMenuOpen(false)} className="block border-b border-white/10 pb-4 font-display text-5xl uppercase leading-none tracking-[0.08em] transition-colors hover:text-[#ff6a00] sm:text-6xl">
                    {link.name}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="flex items-center justify-between border-t border-white/15 pt-6">
              <span className="text-[10px] uppercase tracking-[0.28em] text-white/50">Urban essentials / 2026</span>
              <button type="button" onClick={() => { setMobileMenuOpen(false); setCartOpen(true); }} className="rounded-full bg-[#ff6a00] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white">Cart (2)</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
