"use client";

import { SafeImage } from "@/components/ui/SafeImage";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getFlashSaleCountdown, parseFlashSaleEndAt } from "@/lib/flash-sale";

export function PromoBanners() {
  const saleEndAt = parseFlashSaleEndAt(process.env.NEXT_PUBLIC_FLASH_SALE_END_AT);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (saleEndAt === null) return;

    const initialUpdate = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(timer);
    };
  }, [saleEndAt]);

  const timeLeft = saleEndAt !== null && now !== null ? getFlashSaleCountdown(saleEndAt, now) : null;
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
              {timeLeft?.expired ? (
                <p className="mb-6 text-sm font-bold" role="status">Flash sale ended</p>
              ) : timeLeft ? (
                <div className="mb-6 flex items-center gap-2" aria-label="Time remaining in flash sale">
                  {[
                    { label: "DAYS", val: format(timeLeft.days) },
                    { label: "HRS", val: format(timeLeft.hours) },
                    { label: "MIN", val: format(timeLeft.minutes) },
                    { label: "SEC", val: format(timeLeft.seconds) },
                  ].map((unit, i) => (
                    <div key={unit.label} className="flex items-center gap-2">
                      <div className="min-w-[36px] rounded-lg bg-white/20 px-2.5 py-1.5 text-center backdrop-blur-xs">
                        <span className="block text-sm font-bold leading-none">{unit.val}</span>
                        <span className="mt-1 block text-[8px] font-semibold tracking-wide">{unit.label}</span>
                      </div>
                      {i < 3 && <span className="text-xs font-bold opacity-75">:</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mb-6 text-xs font-semibold text-white/90" role="status">
                  Sale end date to be announced
                </p>
              )}

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
