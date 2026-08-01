"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiArrowUpRight } from "react-icons/fi";

type FloatingProductCardProps = {
  name: string;
  category: string;
  price: string;
  image: string;
  badge: string;
  delay?: number;
};

export function FloatingProductCard({ name, category, price, image, badge, delay = 0 }: FloatingProductCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: [0, -7, 0] }}
      transition={{ opacity: { duration: 0.55, delay }, y: { duration: 5.5 + delay, delay, repeat: Infinity, ease: "easeInOut" } }}
      whileHover={{ y: -12, scale: 1.04, transition: { duration: 0.25 } }}
      className="group overflow-hidden rounded-3xl border border-white/8 bg-[rgba(20,20,20,0.22)] p-3 text-white shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-[28px] transition-[border-color,box-shadow,backdrop-filter] duration-300 hover:border-[#ff6a00]/70 hover:shadow-[0_28px_90px_rgba(0,0,0,0.62),0_0_36px_rgba(255,106,0,0.24)] hover:backdrop-blur-3xl"
    >
      <div className="relative aspect-5/3 overflow-hidden rounded-2xl shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
        <Image src={image} alt={name} fill sizes="(max-width: 767px) 280px, (max-width: 1024px) 42vw, 25vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
        <span className="absolute left-3 top-3 border border-white/15 bg-black/35 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">{badge}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3 px-1 pb-1 pt-4">
        <div>
          <h3 className="text-xl leading-none">{name}</h3>
          <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-white/58">{category}</p>
          <p className="mt-3 text-sm font-semibold tracking-[0.12em] text-[#ff6a00]">{price}</p>
        </div>
        <Link href="/shop" aria-label={`Shop ${name}`} className="flex h-10 w-10 self-end items-center justify-center rounded-full border border-[#ff6a00]/50 text-[#ff6a00] transition duration-300 group-hover:bg-[#ff6a00] group-hover:text-white">
          <FiArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.article>
  );
}
