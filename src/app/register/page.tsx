"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-24">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-card border border-border p-8 rounded-3xl shadow-2xl"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <span className="text-3xl font-bold tracking-tighter">LUXE.</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">Create an Account</h1>
          <p className="text-muted-foreground text-sm">Join us to experience premium shopping</p>
        </div>

        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-2 group">
            <label className="text-sm font-medium">Full Name</label>
            <div className="relative">
              <input 
                type="text" 
                className="w-full bg-muted/50 border border-input rounded-xl px-4 py-3 pl-11 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all" 
                placeholder="John Doe" 
              />
              <User className="w-5 h-5 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
            </div>
          </div>

          <div className="space-y-2 group">
            <label className="text-sm font-medium">Email Address</label>
            <div className="relative">
              <input 
                type="email" 
                className="w-full bg-muted/50 border border-input rounded-xl px-4 py-3 pl-11 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all" 
                placeholder="you@example.com" 
              />
              <Mail className="w-5 h-5 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
            </div>
          </div>
          
          <div className="space-y-2 group">
            <label className="text-sm font-medium">Password</label>
            <div className="relative">
              <input 
                type="password" 
                className="w-full bg-muted/50 border border-input rounded-xl px-4 py-3 pl-11 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all" 
                placeholder="••••••••" 
              />
              <Lock className="w-5 h-5 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
            </div>
          </div>

          <Button size="xl" variant="premium" className="w-full rounded-xl mt-8">
            Create Account <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
