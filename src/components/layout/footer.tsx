"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaInstagram, FaTiktok, FaYoutube, FaCreditCard, FaCcMastercard, FaCcVisa, FaCcPaypal } from "react-icons/fa6";
import { ArrowRight } from "lucide-react";

export function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="bg-black text-white pt-16 pb-8 border-t border-[#E6E6E3]">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-16">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-full bg-[#F4512C] text-white flex items-center justify-center font-extrabold text-xs tracking-tighter shadow-sm flex-shrink-0">
                CT
              </span>
              <div className="flex flex-col text-left">
                <span className="font-extrabold text-base md:text-lg tracking-tight text-white leading-none">
                  CLASSIC <span className="text-[#F4512C]">THREAD</span>
                </span>
                <span className="text-[9px] font-bold tracking-widest text-gray-400 uppercase mt-0.5 leading-none">
                  MJ FASHION HUB
                </span>
              </div>
            </Link>
            <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
              Curated apparel, footwear, accessories, and modern lifestyle fashion. Premium crafted, quality checked, and delivered with care.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Link href="#" aria-label="Instagram" className="h-9 w-9 bg-white/10 rounded-full flex items-center justify-center text-gray-300 hover:bg-[#F4512C] hover:text-white transition-colors">
                <FaInstagram className="h-4 w-4" />
              </Link>
              <Link href="#" aria-label="TikTok" className="h-9 w-9 bg-white/10 rounded-full flex items-center justify-center text-gray-300 hover:bg-[#F4512C] hover:text-white transition-colors">
                <FaTiktok className="h-4 w-4" />
              </Link>
              <Link href="#" aria-label="YouTube" className="h-9 w-9 bg-white/10 rounded-full flex items-center justify-center text-gray-300 hover:bg-[#F4512C] hover:text-white transition-colors">
                <FaYoutube className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Shop Column */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-gray-200 mb-4">Shop</h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li><Link href="/shop" className="hover:text-[#F4512C] transition-colors">New Arrivals</Link></li>
              <li><Link href="/shop" className="hover:text-[#F4512C] transition-colors">Best Sellers</Link></li>
              <li><Link href="/categories" className="hover:text-[#F4512C] transition-colors">Categories</Link></li>
              <li><Link href="/shop?sale=true" className="hover:text-[#F4512C] transition-colors">Sale & Offers</Link></li>
            </ul>
          </div>

          {/* Help Column */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-gray-200 mb-4">Help & Support</h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li><Link href="/checkout" className="hover:text-[#F4512C] transition-colors">Contact Us</Link></li>
              <li><Link href="#" className="hover:text-[#F4512C] transition-colors">Shipping Information</Link></li>
              <li><Link href="#" className="hover:text-[#F4512C] transition-colors">Returns & Exchanges</Link></li>
              <li><Link href="#" className="hover:text-[#F4512C] transition-colors">FAQs</Link></li>
            </ul>
          </div>

          {/* Newsletter Column */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-gray-200 mb-4">Newsletter</h4>
            <p className="text-xs text-gray-400 mb-3">Get 10% off your first order when you subscribe.</p>
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#F4512C] transition-colors"
              />
              <button
                type="submit"
                className="bg-[#F4512C] hover:bg-[#DD3F1E] text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                Subscribe <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} CLASSIC THREAD — MJ FASHION HUB. All rights reserved.</p>
          
          <div className="flex items-center gap-4 text-gray-400 text-lg">
            <FaCcVisa className="hover:text-white transition-colors" />
            <FaCcMastercard className="hover:text-white transition-colors" />
            <FaCcPaypal className="hover:text-white transition-colors" />
            <FaCreditCard className="hover:text-white transition-colors" />
          </div>

          <div className="flex gap-6">
            <Link href="#" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
