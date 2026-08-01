"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { mockCategories } from "@/lib/mock-data";

export default function CategoriesPage() {
  return (
    <div className="pt-32 pb-24 min-h-screen bg-background">
      <div className="container mx-auto px-4 md:px-6">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter mb-6">Explore Categories</h1>
          <p className="text-muted-foreground text-lg">
            Discover our meticulously curated collections, designed to elevate every aspect of your daily life.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {mockCategories.map((category, i) => (
            <motion.div 
              key={category.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <Link href={`/shop`} className="group relative block h-[500px] md:h-[600px] rounded-3xl overflow-hidden">
                <Image 
                  src={category.image} 
                  alt={category.name} 
                  fill 
                  className="object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-70 group-hover:opacity-80 transition-opacity" />
                
                <div className="absolute inset-0 p-10 md:p-14 flex flex-col justify-end">
                  <div className="translate-y-8 group-hover:translate-y-0 transition-transform duration-500 ease-out">
                    <span className="text-white/70 text-sm font-bold tracking-widest uppercase mb-3 block">
                      Collection
                    </span>
                    <h2 className="text-white text-4xl md:text-5xl font-bold mb-6">
                      {category.name}
                    </h2>
                    
                    <div className="inline-flex items-center gap-3 text-white border border-white/30 rounded-full px-6 py-3 backdrop-blur-md hover:bg-white hover:text-black transition-all duration-300">
                      <span className="font-medium">Shop Now</span>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
