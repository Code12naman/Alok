"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=2000"
          alt="About Us Hero"
          fill
          className="object-cover opacity-60 mix-blend-overlay"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="container relative z-10 mx-auto px-4 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-7xl font-bold tracking-tighter mb-4"
          >
            Our Story
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto"
          >
            Redefining premium essentials for the modern world.
          </motion.p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-24 container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-6 leading-tight">
              Craftsmanship <br />Meets Innovation.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              Founded in 2026, LUXE was born out of a desire to create everyday products that don't compromise on quality or design. We believe that the objects you interact with daily should bring joy and elevate your lifestyle.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Our team of designers and engineers work tirelessly to source the finest materials globally, ensuring that every product we offer is built to last a lifetime. Sustainable practices and ethical manufacturing are at the core of everything we do.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative aspect-square md:aspect-[4/5] rounded-3xl overflow-hidden"
          >
            <Image
              src="https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&q=80&w=1000"
              alt="Craftsmanship"
              fill
              className="object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">Our Values</h2>
            <p className="text-lg text-muted-foreground">The principles that guide our design and business.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Simplicity", desc: "We strip away the unnecessary, focusing only on what truly matters to deliver pure, intuitive experiences." },
              { title: "Durability", desc: "Creating products that withstand the test of time, reducing waste and encouraging a 'buy less, buy better' philosophy." },
              { title: "Transparency", desc: "From pricing to production methods, we are completely open about how our products are made." }
            ].map((value, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-card border border-border p-8 rounded-2xl"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <span className="text-primary font-bold text-xl">{i + 1}</span>
                </div>
                <h3 className="text-2xl font-bold mb-4">{value.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
