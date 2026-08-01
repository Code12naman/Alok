"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaInstagram, FaTiktok, FaYoutube, FaArrowRightLong } from "react-icons/fa6";
import { Button } from "@/components/ui/button";

export function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="border-t border-black/10 bg-[#f6f4ef] pt-20 pb-10 text-black">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-16 grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="mb-4 text-xs uppercase tracking-[0.4em] text-black/50">Street Mode</p>
            <h3 className="max-w-md text-5xl font-semibold leading-none tracking-[-0.08em]">Style with a purpose.</h3>
            <p className="mt-6 max-w-lg text-sm leading-7 text-black/65">
              A premium streetwear space built like an editorial spread: bold, graphic, and designed to feel alive.
            </p>
          </div>

          <div className="lg:col-span-3">
            <h4 className="mb-6 text-sm uppercase tracking-[0.28em] text-black/60">Shop</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="/shop" className="transition-colors hover:text-[#f97316]">New Arrivals</Link></li>
              <li><Link href="/shop" className="transition-colors hover:text-[#f97316]">Best Sellers</Link></li>
              <li><Link href="/categories" className="transition-colors hover:text-[#f97316]">Collections</Link></li>
              <li><Link href="/about" className="transition-colors hover:text-[#f97316]">Lookbook</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="mb-6 text-sm uppercase tracking-[0.28em] text-black/60">Social</h4>
            <div className="flex flex-col gap-4 text-sm">
              <Link href="#" className="flex items-center gap-2 transition-colors hover:text-[#15803d]"><FaInstagram /> Instagram</Link>
              <Link href="#" className="flex items-center gap-2 transition-colors hover:text-[#15803d]"><FaTiktok /> TikTok</Link>
              <Link href="#" className="flex items-center gap-2 transition-colors hover:text-[#15803d]"><FaYoutube /> YouTube</Link>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h4 className="mb-6 text-sm uppercase tracking-[0.28em] text-black/60">Newsletter</h4>
            <p className="mb-4 text-sm leading-7 text-black/65">Weekly drops, editorial edits, and limited release alerts.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email address"
                className="w-full rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#f97316]"
              />
              <Button variant="premium" size="icon" className="rounded-full bg-black">
                <FaArrowRightLong className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-black/10 pt-8 text-sm text-black/55 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} STREET MODE. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="transition-colors hover:text-black">Privacy Policy</Link>
            <Link href="#" className="transition-colors hover:text-black">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
