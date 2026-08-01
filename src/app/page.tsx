"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiArrowUpRight, FiStar } from "react-icons/fi";
import { EditorialHero } from "@/components/streetwear/editorial-hero";
import { Marquee } from "@/components/streetwear/marquee";
import { ProductCard } from "@/components/streetwear/product-card";
import { SectionHeading } from "@/components/streetwear/section-heading";

const newArrivals = [
  {
    title: "Canvas Bomber",
    price: "$168",
    image: "https://images.unsplash.com/photo-1548126032-079a0fb0099d?auto=format&fit=crop&q=80&w=1200",
    tag: "New",
  },
  {
    title: "Oversized Cargo",
    price: "$124",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1200",
    tag: "Drop",
  },
  {
    title: "Concrete Hoodie",
    price: "$136",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1200",
    tag: "Hot",
  },
  {
    title: "Utility Vest",
    price: "$92",
    image: "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&q=80&w=1200",
    tag: "Core",
  },
];

const trendingProducts = [
  {
    title: "Night Runner Set",
    price: "$210",
    image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=1200",
    tag: "Trend",
  },
  {
    title: "Rebel Denim",
    price: "$148",
    image: "https://images.unsplash.com/photo-1503342394123-4808b3f5d0a4?auto=format&fit=crop&q=80&w=1200",
    tag: "Trend",
  },
  {
    title: "Urban Layer",
    price: "$176",
    image: "https://images.unsplash.com/photo-1506634572416-48cdfe530110?auto=format&fit=crop&q=80&w=1200",
    tag: "Trend",
  },
  {
    title: "Monochrome Shell",
    price: "$194",
    image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=1200",
    tag: "Trend",
  },
];

const categories = [
  {
    label: "Outerwear",
    image: "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&q=80&w=1200",
  },
  {
    label: "Graphics",
    image: "https://images.unsplash.com/photo-1503342394123-4808b3f5d0a4?auto=format&fit=crop&q=80&w=1200",
  },
  {
    label: "Cargo",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1200",
  },
  {
    label: "Footwear",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=1200",
  },
];

const testimonials = [
  {
    quote: "The layout feels like a fashion magazine that happens to sell clothes. The brand presence is immediate.",
    name: "Maya R.",
    role: "Creative Director",
  },
  {
    quote: "Bold, confident, and super polished. The product cards and editorial blocks feel premium without being loud.",
    name: "Jordan T.",
    role: "Streetwear Buyer",
  },
  {
    quote: "The motion is smooth, and the composition has real character. It feels like a campaign, not a template.",
    name: "Noah K.",
    role: "Fashion Founder",
  },
];

const instagramImages = [
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1503342394123-4808b3f5d0a4?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=1000",
];

export default function Home() {
  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="bg-[#f6f4ef] px-3 pb-3 pt-16 sm:px-4 sm:pb-4 sm:pt-20 lg:px-6 lg:pt-24">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-5 lg:gap-8">
        <EditorialHero />

        <Marquee text="Born from the streets / Inspired by the culture / Cut for the city / Built for movement" />

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
          <div className="grid gap-6 rounded-2xl border border-black/10 bg-white p-5 shadow-[0_20px_60px_rgba(17,17,17,0.08)] sm:rounded-3xl sm:p-7 lg:gap-8 lg:rounded-4xl lg:p-10">
            <SectionHeading
              label="Featured Collection"
              title="A modular wardrobe with attitude and precision."
              description="Sharp layers, heavier textures, and a graphic silhouette system designed to feel elevated and instinctively wearable."
            />

            {/* Mobile: horizontal snap carousel — shows 85% of first card + peek of next */}
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 lg:pb-0 lg:grid lg:gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  number: "01",
                  title: "Streetscape",
                  text: "Oversized layers, structured outerwear, and monochrome accents.",
                  image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1000",
                },
                {
                  number: "02",
                  title: "Night Shift",
                  text: "Black-on-black pieces with orange edge details and reflective trims.",
                  image: "https://images.unsplash.com/photo-1503342394123-4808b3f5d0a4?auto=format&fit=crop&q=80&w=1000",
                },
                {
                  number: "03",
                  title: "Utility Core",
                  text: "Hardwearing fits, pockets, straps, and a utility-first mindset.",
                  image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=1000",
                },
              ].map((item, index) => (
                <motion.article
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className="min-w-[82%] shrink-0 snap-start group overflow-hidden border border-black/10 bg-[#f6f4ef] sm:min-w-[55%] lg:min-w-0"
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <Image src={item.image} alt={item.title} fill loading="lazy" decoding="async" className="object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-linear-to-t from-black/55 via-transparent to-transparent" />
                    <div className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center border border-white/20 bg-black text-sm font-semibold text-white">{item.number}</div>
                  </div>
                  <div className="space-y-2 p-4">
                    <h3 className="text-[clamp(1.5rem,5vw,1.875rem)] leading-none text-black">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-black/65">{item.text}</p>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>

          <aside className="grid gap-5 rounded-2xl border border-black/10 bg-[#111111] p-5 text-white shadow-[0_20px_60px_rgba(17,17,17,0.12)] sm:rounded-3xl sm:p-7 lg:gap-6 lg:rounded-4xl lg:p-10">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.36em] text-white/55">Studio Notes</p>
              <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#f97316]">Live</span>
            </div>

            <div className="space-y-5">
              <h2 className="max-w-xs text-[clamp(1.75rem,6vw,2.25rem)] leading-[0.9]">Born for the block, built for the frame.</h2>
              <p className="max-w-md text-sm leading-7 text-white/68">
                A magazine-style canvas that mixes brutal geometry with luxury restraint, turning every collection into a visual story.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="relative aspect-16/10 overflow-hidden border border-white/10">
                <Image src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1200" alt="Campaign visual" fill className="object-cover" />
              </div>
              <div className="flex items-center justify-between border border-white/10 bg-white/5 px-4 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">Limited Edition</p>
                  <p className="mt-1 text-lg">Canvas Flight Cap</p>
                </div>
                <p className="text-sm text-[#15803d]">$58</p>
              </div>
            </div>

            <Link href="/shop" className="group inline-flex w-fit items-center gap-3 rounded-full bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-black transition hover:-translate-y-0.5">
              Shop Limited Drop
              <FiArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </Link>
          </aside>
        </section>

        <section className="grid gap-5 rounded-2xl border border-black/10 bg-white p-5 shadow-[0_20px_60px_rgba(17,17,17,0.08)] sm:rounded-3xl sm:p-7 lg:gap-6 lg:rounded-4xl lg:p-10">
          <SectionHeading
            label="New Arrival"
            title="Sharp, seasonal, and ready to wear on repeat."
            description="Each drop is styled as a self-contained look so the collection reads like a campaign instead of a product dump."
          />

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
            {newArrivals.map((product, index) => (
              <ProductCard key={product.title} index={index} title={product.title} price={product.price} image={product.image} tag={product.tag} />
            ))}
          </div>
        </section>

        <section className="grid gap-5 rounded-2xl border border-black/10 bg-[#111111] p-5 text-white shadow-[0_20px_60px_rgba(17,17,17,0.14)] sm:rounded-3xl sm:p-7 lg:grid-cols-[0.85fr_1.15fr] lg:rounded-4xl lg:p-10">
          <div className="flex flex-col justify-between gap-8">
            <SectionHeading
              label="Trending Products"
              title="The city uniform, re-edited."
              description="Heavy tees, oversized shells, and utility details that lean into street culture without losing refinement."
              align="left"
            />
            <div className="grid grid-cols-2 gap-3 text-xs uppercase tracking-[0.24em] text-white/55">
              <div className="border border-white/10 p-4">Drop frequency</div>
              <div className="border border-white/10 p-4">Weekly edits</div>
              <div className="border border-white/10 p-4">Limited stock</div>
              <div className="border border-white/10 p-4">Fast delivery</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2">
            {trendingProducts.map((product, index) => (
              <ProductCard key={product.title} index={index} title={product.title} price={product.price} image={product.image} tag={product.tag} />
            ))}
          </div>
        </section>

        <section className="grid gap-5 rounded-2xl border border-black/10 bg-white p-5 shadow-[0_20px_60px_rgba(17,17,17,0.08)] sm:rounded-3xl sm:p-7 lg:grid-cols-[1fr_1fr] lg:rounded-4xl lg:p-10">
          <div className="relative min-h-[200px] overflow-hidden border border-black/10 bg-[#ece8df] sm:min-h-[280px] lg:min-h-[540px]">
            <Image src="https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&q=80&w=1400" alt="Editorial campaign" fill className="object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.36em] text-white/70">Editorial Campaign</p>
              <h2 className="mt-3 max-w-lg text-[clamp(1.75rem,7vw,3.75rem)] leading-[0.9] text-white lg:text-5xl xl:text-6xl">Style with function. Wear with intent.</h2>
            </div>
          </div>

          <div className="grid gap-5">
            <SectionHeading
              label="Brand Story"
              title="Built around movement, utility, and visual rhythm."
              description="STREET MODE pairs bold typography with a disciplined palette and uncompromising silhouettes to create a distinct urban identity."
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-1 xl:grid-cols-3">
              {[
                { title: "Utility", text: "Pockets, layers, and straps designed around function." },
                { title: "Culture", text: "Editorial styling shaped by city life and music energy." },
                { title: "Precision", text: "Clean grids and exact spacing keep the message sharp." },
              ].map((item) => (
                <div key={item.title} className="border border-black/10 bg-[#f6f4ef] p-5">
                  <p className="text-xs uppercase tracking-[0.32em] text-[#15803d]">{item.title}</p>
                  <p className="mt-3 text-sm leading-7 text-black/68">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="border border-black/10 bg-black p-4 text-white sm:p-5">
                <p className="text-xs uppercase tracking-[0.36em] text-white/55">Limited Edition</p>
                <h3 className="mt-2 text-[clamp(1.25rem,5vw,1.875rem)] leading-[0.9]">Every release feels collectible.</h3>
              </div>
              <div className="border border-black/10 bg-[#15803d] p-4 text-white sm:p-5">
                <p className="text-xs uppercase tracking-[0.36em] text-white/55">Campaign Code</p>
                <h3 className="mt-2 text-[clamp(1.25rem,5vw,1.875rem)] leading-[0.9]">Designed like a spread.</h3>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 rounded-2xl border border-black/10 bg-white p-5 shadow-[0_20px_60px_rgba(17,17,17,0.08)] sm:rounded-3xl sm:p-7 lg:rounded-4xl lg:p-10">
          <SectionHeading
            label="Shop by Category"
            title="The grid makes the range feel curated, not crowded."
            description="Four core lanes, each styled like a billboard tile with strong contrast and oversized imagery."
          />

          {/* Mobile: horizontal snap carousel. Tablet+: 2-col grid. Desktop: 4-col grid */}
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 md:pb-0 md:grid md:grid-cols-2 md:gap-5 xl:grid-cols-4">
            {categories.map((category, index) => (
              <motion.div
                key={category.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                className="min-w-[72%] shrink-0 snap-start group relative overflow-hidden border border-black/10 bg-[#f6f4ef] sm:min-w-[55%] md:min-w-0"
              >
                <div className="relative aspect-[4/5]">
                  <Image src={category.image} alt={category.label} fill loading="lazy" decoding="async" className="object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-linear-to-t from-black/55 via-transparent to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <p className="text-xs uppercase tracking-[0.32em] text-white/60">0{index + 1}</p>
                  <h3 className="mt-1 text-[clamp(1.75rem,6vw,2.5rem)] leading-none">{category.label}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 rounded-2xl border border-black/10 bg-[#f97316] p-5 text-black shadow-[0_20px_60px_rgba(17,17,17,0.08)] sm:rounded-3xl sm:p-7 lg:grid-cols-[1.15fr_0.85fr] lg:rounded-4xl lg:p-10">
          <div>
            <p className="text-xs uppercase tracking-[0.36em] text-black/55">Testimonials</p>
            <h2 className="mt-3 max-w-xl text-[clamp(1.75rem,7.5vw,3rem)] leading-[0.9] lg:text-5xl">Loved by people who want the clothes to say something.</h2>
          </div>
          <div className="grid gap-4">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                className="border border-black/10 bg-[#f6f4ef] p-5"
              >
                <FiStar className="h-5 w-5 text-[#15803d]" />
                <p className="mt-4 text-sm leading-7 text-black/75">{testimonial.quote}</p>
                <div className="mt-4">
                  <p className="font-semibold uppercase tracking-[0.2em]">{testimonial.name}</p>
                  <p className="text-xs uppercase tracking-[0.26em] text-black/55">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 rounded-2xl border border-black/10 bg-black p-5 text-white shadow-[0_20px_60px_rgba(17,17,17,0.14)] sm:rounded-3xl sm:p-7 lg:grid-cols-[1fr_1fr] lg:rounded-4xl lg:p-10">
          <div>
            <p className="text-xs uppercase tracking-[0.36em] text-white/55">Newsletter</p>
            <h2 className="mt-3 max-w-md text-[clamp(1.75rem,7.5vw,3rem)] leading-[0.9] lg:text-5xl">Get the drop before the feed does.</h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/68">Monthly edits, release alerts, and a short list of pieces worth paying attention to.</p>
          </div>
          <div className="flex flex-col justify-between gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Early access",
                "Private restocks",
                "Editorial features",
                "Style notes",
              ].map((item) => (
                <div key={item} className="border border-white/10 bg-white/5 p-4 text-sm uppercase tracking-[0.24em] text-white/70">{item}</div>
              ))}
            </div>
            <form className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder="Email address"
                className="w-full rounded-full border border-white/10 bg-white px-5 py-3.5 text-sm text-black outline-none transition placeholder:text-black/45 focus:border-[#f97316] sm:py-4"
              />
              <button className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f97316] px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.28em] text-black transition hover:-translate-y-0.5 active:scale-95 sm:py-4">
                Join list <FiArrowUpRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>

        <section className="grid gap-5 rounded-2xl border border-black/10 bg-white p-5 shadow-[0_20px_60px_rgba(17,17,17,0.08)] sm:rounded-3xl sm:p-7 lg:rounded-4xl lg:p-10">
          <SectionHeading
            label="Instagram Gallery"
            title="A visual feed that feels more like a campaign wall than a social grid."
            description="Pulled from the same visual language as the hero: oversized imagery, strong contrast, and tightly edited framing."
          />

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {instagramImages.map((image, index) => (
              <motion.div
                key={image}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45, delay: index * 0.04 }}
                className="group relative aspect-square overflow-hidden border border-black/10 bg-[#ece8df]"
              >
                <Image src={image} alt="Instagram gallery image" fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </motion.main>
  );
}
