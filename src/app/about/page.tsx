"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, ShieldCheck, Heart } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F7F7F5] py-12">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 space-y-16">
        
        {/* Hero Section */}
        <section className="bg-white rounded-3xl p-8 md:p-16 border border-[#E6E6E3] shadow-xs relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-4 text-left">
              <span className="inline-block text-[11px] font-bold tracking-wider text-[#F4512C] uppercase bg-[#FFF3F0] px-3 py-1 rounded-full border border-[#F4512C]/20">
                OUR STORY
              </span>
              <h1 className="font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[#111111] leading-tight">
                Redefining Everyday <br />
                <span className="text-[#F4512C]">Essentials & Fashion</span>
              </h1>
              <p className="text-xs md:text-sm text-gray-600 leading-relaxed font-medium">
                Founded in 2026, STREET MODE was born out of a passion to deliver high-spec products that bridge contemporary design with functional elegance. We source high quality materials globally to ensure every product brings value to your lifestyle.
              </p>
              <div className="pt-2">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold px-6 py-3.5 rounded-xl shadow-xs transition-colors"
                >
                  Explore Our Shop <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 relative aspect-[4/3] rounded-2xl overflow-hidden border border-[#E6E6E3] bg-[#F7F7F5]">
              <Image
                src="https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=1200"
                alt="About us"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section className="space-y-6">
          <div className="text-center max-w-md mx-auto">
            <h2 className="font-extrabold text-2xl text-[#111111] tracking-tight">Our Core Principles</h2>
            <p className="text-xs text-gray-500 font-medium mt-1">The values that guide every product we curate.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Sparkles,
                title: "Curated Design",
                desc: "We focus on clean, intuitive designs that enhance daily life without clutter.",
              },
              {
                icon: ShieldCheck,
                title: "Uncompromising Quality",
                desc: "Sourced from top manufacturers using durable, sustainably conscious materials.",
              },
              {
                icon: Heart,
                title: "Customer First",
                desc: "100% satisfaction guarantee with 24/7 dedicated customer care.",
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="bg-white p-6 rounded-2xl border border-[#E6E6E3] shadow-xs text-left">
                  <div className="h-10 w-10 bg-[#FFF3F0] text-[#F4512C] rounded-xl flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-sm text-[#111111] mb-2">{item.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed font-medium">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
