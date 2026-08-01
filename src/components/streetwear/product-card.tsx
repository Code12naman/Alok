"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiHeart, FiEye, FiShoppingBag } from "react-icons/fi";

type ProductCardProps = {
  title: string;
  price: string;
  image: string;
  tag: string;
  index?: number;
};

export function ProductCard({ title, price, image, tag, index = 0 }: ProductCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay: index * 0.08 }}
      whileHover={{ y: -8 }}
      className="group overflow-hidden border border-black/10 bg-white shadow-[0_16px_45px_rgba(17,17,17,0.08)] transition-shadow duration-300 hover:shadow-[0_24px_65px_rgba(17,17,17,0.14)]"
    >
      <Link href="/shop" className="relative block aspect-[4/5] overflow-hidden bg-[#ece8df]">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-90" />
        <span className="absolute left-4 top-4 rounded-full bg-[#f97316] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white">
          {tag}
        </span>
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div className="max-w-[70%]">
            <h3 className="text-2xl leading-none text-white">{title}</h3>
            <p className="mt-2 text-xs uppercase tracking-[0.26em] text-white/75">Street Drop</p>
          </div>
          <span className="text-sm font-semibold text-white">{price}</span>
        </div>
      </Link>

      <div className="flex items-center justify-between border-t border-black/10 px-4 py-4">
        <div className="flex gap-2 text-black/60">
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 transition hover:border-black hover:text-black">
            <FiHeart className="h-4 w-4" />
          </button>
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 transition hover:border-black hover:text-black">
            <FiEye className="h-4 w-4" />
          </button>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-[#f97316]">
          <FiShoppingBag className="h-3.5 w-3.5" /> Add to Cart
        </button>
      </div>
    </motion.article>
  );
}