"use client";

import { SafeImage } from "@/components/ui/SafeImage";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export function PromoBanners() {
  // Countdown state: 2h 15m 45s
  const [timeLeft, setTimeLeft] = useState({
    hours: 2,
    minutes: 15,
    seconds: 45,
    millis: 30,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const totalSec = prev.hours * 3600 + prev.minutes * 60 + prev.seconds;
        if (totalSec <= 0) {
          return { hours: 0, minutes: 0, seconds: 0, millis: 0 };
        }
        const nextSec = totalSec - 1;
        const hours = Math.floor(nextSec / 3600);
        const minutes = Math.floor((nextSec % 3600) / 60);
        const seconds = nextSec % 60;
        const millis = Math.floor(Math.random() * 80) + 10;
        return { hours, minutes, seconds, millis };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const format = (n: number) => String(n).padStart(2, "0");

  return (
    <section className="bg-white py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Banner 1: Flash Sale (Orange) ── */}
          <div className="relative bg-gradient-to-r from-[#F4512C] to-[#E03A16] rounded-3xl overflow-hidden p-6 sm:p-8 text-white min-h-[260px] flex flex-col justify-between shadow-sm">
            {/* Overlay product image */}
            <div className="absolute right-0 bottom-0 top-0 w-1/2 overflow-hidden pointer-events-none opacity-90">
              <SafeImage
                src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800"
                alt="Flash Sale Shoe"
                fill
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="object-cover object-center"
              />
            </div>

            <div className="relative z-10 max-w-[55%]">
              <span className="inline-block bg-white/20 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
                Flash Sale
              </span>
              <h3 className="font-extrabold text-2xl sm:text-3xl tracking-tight leading-tight mb-4">
                Up To 70% Off
              </h3>

              {/* Countdown timer */}
              <div className="flex items-center gap-2 mb-6">
                {[
                  { label: "HRS", val: format(timeLeft.hours) },
                  { label: "MIN", val: format(timeLeft.minutes) },
                  { label: "SEC", val: format(timeLeft.seconds) },
                  { label: "MS", val: format(timeLeft.millis) },
                ].map((unit, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="bg-white/20 backdrop-blur-xs px-2.5 py-1.5 rounded-lg text-center min-w-[36px]">
                      <span className="block font-bold text-sm leading-none">{unit.val}</span>
                    </div>
                    {i < 3 && <span className="font-bold text-xs opacity-75">:</span>}
                  </div>
                ))}
              </div>

              <Link
                href="/shop?sale=true"
                className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-[#F4512C] text-xs font-bold px-5 py-3 rounded-xl transition-all shadow-xs"
              >
                Shop Sale Now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* ── Banner 2: Summer Collection (Dark) ── */}
          <div className="relative bg-[#111111] rounded-3xl overflow-hidden p-6 sm:p-8 text-white min-h-[260px] flex flex-col justify-between shadow-sm">
            {/* Overlay model image */}
            <div className="absolute right-0 bottom-0 top-0 w-1/2 overflow-hidden pointer-events-none opacity-80">
              <SafeImage
                src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=800"
                alt="Summer Collection"
                fill
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="object-cover object-top"
              />
            </div>

            <div className="relative z-10 max-w-[55%]">
              <span className="inline-block bg-white/10 text-gray-300 text-[11px] font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
                New Collection
              </span>
              <h3 className="font-extrabold text-2xl sm:text-3xl tracking-tight leading-tight mb-2">
                Summer 2026
              </h3>
              <p className="text-gray-400 text-xs font-medium mb-6 leading-relaxed">
                Discover the latest trends and fresh styles curated for modern lifestyles.
              </p>

              <Link
                href="/shop"
                className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-[#111111] text-xs font-bold px-5 py-3 rounded-xl transition-all shadow-xs"
              >
                Shop Collection <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
