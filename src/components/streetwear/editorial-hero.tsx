"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { FiArrowUpRight, FiAward, FiRefreshCw, FiTruck } from "react-icons/fi";
import { FloatingProductCard } from "./floating-product-card";

const benefits = [
  { label: "Premium Quality", icon: FiAward },
  { label: "Free Shipping", icon: FiTruck },
  { label: "Easy Returns", icon: FiRefreshCw },
];

const floatingProducts = [
  { name: "Oversized Hoodie", category: "Heavyweight Cotton", price: "₹2,499", badge: "New", image: "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&q=85&w=1000" },
  { name: "Urban Runner", category: "Limited Drop", price: "₹4,999", badge: "Limited Drop", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=85&w=1000" },
  { name: "Utility Cargo", category: "Relaxed Fit", price: "₹2,999", badge: "Bestseller", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=85&w=1000" },
];

const lineTransition = (delay: number) => ({ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] as const });

export function EditorialHero() {
  const cardsRef = useRef<HTMLElement>(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 80, damping: 20 });
  const smoothY = useSpring(pointerY, { stiffness: 80, damping: 20 });
  const parallaxX = useTransform(smoothX, [-0.5, 0.5], [-10, 10]);
  const parallaxY = useTransform(smoothY, [-0.5, 0.5], [-10, 10]);

  function handleCardMove(event: React.MouseEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  }

  function resetCardParallax() {
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    // Mobile: min-h-[80svh] so video fills most of viewport. Desktop: full 100svh.
    <section className="relative isolate min-h-[80svh] overflow-hidden rounded-2xl sm:rounded-3xl lg:min-h-[100svh] lg:rounded-4xl text-white shadow-[0_30px_100px_rgba(0,0,0,0.28)]">
      {/* Background video */}
      <div className="absolute inset-0 -z-20" aria-hidden="true">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1200"
          className="h-full w-full object-cover object-[60%_center] brightness-110 lg:object-center lg:brightness-125"
        >
          <source src="/videos/jesswharehinga888_pindown.io_1785417443.mp4" type="video/mp4" />
        </video>
        {/* Gradient overlay for text readability on mobile */}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-black/10 lg:hidden" />
      </div>

      {/*
        Mobile: flex-col, py-16 padding to breathe.
        Desktop: grid with two columns, full viewport height, centered.
        The inner div no longer forces min-h-[100svh] — the outer section handles minimum height.
      */}
      <div className="flex flex-col items-center px-5 py-16 text-center sm:px-8 sm:py-20 lg:grid lg:min-h-[100svh] lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:items-center lg:gap-16 lg:px-14 lg:py-20 lg:text-left xl:px-20">

        {/* ── Text column ── */}
        <div className="flex w-full max-w-lg flex-col items-center lg:max-w-2xl lg:items-start">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={lineTransition(0.05)}
            className="text-[10px] font-semibold uppercase tracking-[0.38em] text-white/65"
          >
            Drop 01 / New Season
          </motion.p>

          {/* Heading: fluid clamp — 44px on 375px, scales up naturally to 86px on desktop */}
          <h1 className="mt-5 text-[clamp(2.75rem,14vw,8.6rem)] leading-[0.82] tracking-[-0.06em] lg:mt-6">
            <motion.span
              initial={{ opacity: 0, y: 42 }}
              animate={{ opacity: 1, y: 0 }}
              transition={lineTransition(0.12)}
              className="block"
            >
              URBAN
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 42 }}
              animate={{ opacity: 1, y: 0 }}
              transition={lineTransition(0.22)}
              className="block text-[#ff6a00]"
            >
              PULSE
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 42 }}
              animate={{ opacity: 1, y: 0 }}
              transition={lineTransition(0.32)}
              className="block"
            >
              COLLECTION
            </motion.span>
          </h1>

          {/* Description: 2 lines max on mobile */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={lineTransition(0.42)}
            className="mt-5 max-w-xs text-sm leading-relaxed text-white/75 line-clamp-2 lg:mt-8 lg:max-w-md lg:text-base lg:line-clamp-none"
          >
            Modern silhouettes for the pace of the city. Precision-cut essentials, elevated fabrics, and quiet confidence in every layer.
          </motion.p>

          {/* Buttons — full width on mobile, auto on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={lineTransition(0.52)}
            className="mt-6 flex w-full flex-col gap-3 lg:mt-9 lg:w-auto lg:flex-row"
          >
            <Link
              href="/shop"
              className="group inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full bg-[#ff6a00] px-7 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-white shadow-[0_0_28px_rgba(255,106,0,0.24)] transition duration-300 hover:scale-[1.03] hover:shadow-[0_0_34px_rgba(255,106,0,0.45)] active:scale-[0.97]"
            >
              Shop Collection <FiArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </Link>
            <Link
              href="/about"
              className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-white/30 bg-white/5 px-7 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-white backdrop-blur-sm transition duration-300 hover:scale-[1.03] hover:border-white/60 hover:bg-white/10 active:scale-[0.97]"
            >
              Explore Lookbook
            </Link>
          </motion.div>

          {/* Benefits strip — horizontal scroll on mobile, 3-column grid on desktop */}
          <motion.ul
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={lineTransition(0.62)}
            className="mt-6 flex w-full gap-3 overflow-x-auto scrollbar-hide pb-1 lg:mt-10 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0"
          >
            {benefits.map(({ label, icon: Icon }) => (
              <li
                key={label}
                className="flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm lg:shrink lg:rounded-none lg:border-0 lg:border-t lg:border-white/20 lg:bg-transparent lg:px-0 lg:pt-3 lg:backdrop-blur-none"
              >
                <Icon className="h-4 w-4 shrink-0 text-[#ff6a00]" />
                {label}
              </li>
            ))}
          </motion.ul>
        </div>

        {/*
          ── Floating product cards ──
          Hidden on mobile (they'd overlap heading and nav).
          Shown on desktop as a 2-column parallax grid.
        */}
        <aside
          ref={cardsRef}
          onMouseMove={handleCardMove}
          onMouseLeave={resetCardParallax}
          className="hidden lg:relative lg:grid lg:grid-cols-2 lg:gap-x-8 lg:gap-y-20 lg:justify-self-end"
        >
          <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(circle,rgba(255,106,0,0.3),transparent_68%)] blur-3xl" aria-hidden="true" />
          {floatingProducts.map((product, index) => (
            <motion.div
              key={product.name}
              style={{ x: parallaxX, y: parallaxY }}
              className={
                index === 1
                  ? "translate-x-5"
                  : index === 2
                  ? "col-start-2 translate-x-2"
                  : "col-start-1"
              }
            >
              <FloatingProductCard {...product} delay={0.35 + index * 0.16} />
            </motion.div>
          ))}
        </aside>
      </div>
    </section>
  );
}
