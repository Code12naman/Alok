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
    <section className="relative isolate min-h-[100svh] overflow-hidden rounded-4xl text-white shadow-[0_30px_100px_rgba(0,0,0,0.28)]">
      <div className="absolute inset-0 -z-20" aria-hidden="true">
        <video autoPlay muted loop playsInline preload="metadata" className="h-full w-full object-cover object-center brightness-125">
          <source src="/videos/jesswharehinga888_pindown.io_1785417443.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="grid min-h-[100svh] grid-cols-1 items-center gap-12 px-6 py-20 sm:px-10 md:gap-16 lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:gap-16 lg:px-14 xl:px-20">
        <div className="flex max-w-2xl flex-col items-center text-center lg:items-start lg:text-left">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={lineTransition(0.05)}
            className="text-[10px] font-semibold uppercase tracking-[0.38em] text-white/65"
          >
            Drop 01 / New Season
          </motion.p>

          <h1 className="mt-6 text-[clamp(4.2rem,8.2vw,8.6rem)] leading-[0.79] tracking-[-0.07em]">
            <motion.span initial={{ opacity: 0, y: 42 }} animate={{ opacity: 1, y: 0 }} transition={lineTransition(0.12)} className="block">URBAN</motion.span>
            <motion.span initial={{ opacity: 0, y: 42 }} animate={{ opacity: 1, y: 0 }} transition={lineTransition(0.22)} className="block text-[#ff6a00]">PULSE</motion.span>
            <motion.span initial={{ opacity: 0, y: 42 }} animate={{ opacity: 1, y: 0 }} transition={lineTransition(0.32)} className="block">COLLECTION</motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={lineTransition(0.42)}
            className="mt-8 max-w-md text-sm leading-7 text-white/75 sm:text-base"
          >
            Modern silhouettes for the pace of the city. Precision-cut essentials, elevated fabrics, and quiet confidence in every layer.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={lineTransition(0.52)} className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link href="/shop" className="group inline-flex min-h-13 items-center justify-center gap-3 rounded-full bg-[#ff6a00] px-7 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-white shadow-[0_0_28px_rgba(255,106,0,0.24)] transition duration-300 hover:scale-[1.03] hover:shadow-[0_0_34px_rgba(255,106,0,0.45)]">
              Shop Collection <FiArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </Link>
            <Link href="/about" className="inline-flex min-h-13 items-center justify-center rounded-full border border-white/30 bg-white/5 px-7 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-white backdrop-blur-sm transition duration-300 hover:scale-[1.03] hover:border-white/60 hover:bg-white/10">
              Explore Lookbook
            </Link>
          </motion.div>

          <motion.ul initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={lineTransition(0.62)} className="mt-10 grid w-full gap-3 sm:grid-cols-3">
            {benefits.map(({ label, icon: Icon }) => (
              <li key={label} className="flex items-center justify-center gap-2 border-t border-white/20 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72 lg:justify-start">
                <Icon className="h-4 w-4 text-[#ff6a00]" /> {label}
              </li>
            ))}
          </motion.ul>
        </div>

        <aside ref={cardsRef} onMouseMove={handleCardMove} onMouseLeave={resetCardParallax} className="relative flex snap-x gap-4 overflow-x-auto pb-3 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-20 md:overflow-visible lg:justify-self-end lg:pb-0">
          <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(circle,rgba(255,106,0,0.3),transparent_68%)] blur-3xl" aria-hidden="true" />
          {floatingProducts.map((product, index) => (
            <motion.div key={product.name} style={{ x: parallaxX, y: parallaxY }} className={index === 1 ? "min-w-72 snap-start md:translate-x-5" : index === 2 ? "min-w-72 snap-start md:col-start-2 md:translate-x-2" : "min-w-72 snap-start md:col-start-1"}>
              <FloatingProductCard {...product} delay={0.35 + index * 0.16} />
            </motion.div>
          ))}
        </aside>
      </div>
    </section>
  );
}
