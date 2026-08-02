"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";

const floatingCards = [
  {
    name: "Air Max 270",
    price: "₹12,999",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400",
    position: "top-12 right-6 sm:right-12 lg:right-16",
    delay: 0,
  },
  {
    name: "Wireless Headphones",
    price: "₹8,999",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400",
    position: "top-1/2 -translate-y-1/2 right-12 sm:right-24 lg:right-32",
    delay: 0.5,
  },
  {
    name: "Smart Watch",
    price: "₹19,999",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400",
    position: "bottom-16 right-4 sm:right-10 lg:right-14",
    delay: 1,
  },
];

const customerAvatars = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120",
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden min-h-[calc(100svh-96px)] flex items-center bg-black border-b border-[#E6E6E3]">
      {/* ── 1. HERO BACKGROUND VIDEO ── */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1400"
        className="absolute inset-0 w-full h-full object-cover object-center z-0 pointer-events-none"
        style={{ filter: "brightness(0.85) contrast(1.05) saturate(0.9)" }}
      >
        <source src="/videos/jessiejiranzhai_pindown.io_1785598803.mp4" type="video/mp4" />
      </video>

      {/* ── 2. CINEMATIC OVERLAY FOR READABILITY ── */}
      {/* Desktop: Left-heavy gradient overlay */}
      <div
        className="absolute inset-0 z-10 pointer-events-none hidden md:block"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.52) 35%, rgba(0,0,0,0.2) 65%, rgba(0,0,0,0.05) 100%)",
        }}
      />
      {/* Mobile: Top-to-bottom dark gradient */}
      <div
        className="absolute inset-0 z-10 pointer-events-none md:hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.85) 100%)",
        }}
      />
      {/* Bottom smooth fade to next section */}
      <div
        className="absolute bottom-0 inset-x-0 h-16 z-10 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(247,247,245,1) 0%, rgba(247,247,245,0) 100%)",
        }}
      />

      {/* ── 3. HERO CONTENT ── */}
      <div className="relative z-20 mx-auto max-w-[1440px] px-4 md:px-8 w-full py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* ── Left Column Content (~45% on desktop) ── */}
          <div className="lg:col-span-6 flex flex-col items-start space-y-6 text-left">
            
            {/* Orange Badge over Video */}
            <span className="inline-block text-[11px] font-bold tracking-wider text-[#F4512C] uppercase bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20">
              TRENDING NOW
            </span>

            {/* Heading */}
            <h1 className="font-extrabold text-4xl sm:text-5xl lg:text-6xl text-white leading-[1.05] tracking-tight drop-shadow-sm">
              Discover Products <br />
              <span className="text-white">You&apos;ll Love</span>
            </h1>

            {/* Subtext */}
            <p className="text-white/85 text-sm md:text-base max-w-md leading-relaxed font-medium">
              Shop the latest trending products curated for modern lifestyles. Exceptional quality delivered to your doorstep.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-2 bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold px-7 py-4 rounded-xl shadow-md transition-all hover:scale-[1.02]"
              >
                Shop Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/categories"
                className="inline-flex items-center justify-center bg-black/30 hover:bg-black/50 text-white border border-white/40 backdrop-blur-md text-xs font-bold px-7 py-4 rounded-xl transition-all"
              >
                Explore Collection
              </Link>
            </div>

            {/* Customer Proof */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/20 w-full max-w-md">
              <div className="flex -space-x-2 overflow-hidden">
                {customerAvatars.map((src, i) => (
                  <Image
                    key={i}
                    src={src}
                    alt="Customer avatar"
                    width={32}
                    height={32}
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white/50 object-cover"
                  />
                ))}
              </div>
              <div className="text-xs text-white/90 font-medium">
                <div className="flex items-center gap-1 text-[#F4A623]">
                  {Array(5).fill(null).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-[#F4A623]" />
                  ))}
                </div>
                <span>Loved by 50,000+ customers worldwide</span>
              </div>
            </div>

          </div>

          {/* ── Right Column: Glassmorphism Floating Product Cards ── */}
          <div className="lg:col-span-6 relative hidden md:block min-h-[400px]">
            {floatingCards.map((card, idx) => (
              <motion.div
                key={card.name}
                initial={{ y: 0 }}
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: card.delay,
                }}
                className={`absolute ${card.position} z-20 flex items-center gap-3 bg-white/90 backdrop-blur-md p-2.5 pr-4 rounded-2xl shadow-lg border border-white/40 hover:shadow-xl transition-shadow max-w-[210px]`}
              >
                <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-[#F7F7F5] flex-shrink-0 border border-gray-100">
                  <Image src={card.image} alt={card.name} fill className="object-cover" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#111111] truncate">{card.name}</h4>
                  <p className="text-[11px] font-extrabold text-[#F4512C]">{card.price}</p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
