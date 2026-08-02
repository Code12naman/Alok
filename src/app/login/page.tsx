"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase/config";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5] px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white border border-[#E6E6E3] p-8 rounded-3xl shadow-sm"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <span className="h-8 w-8 rounded-full bg-[#F4512C] text-white flex items-center justify-center font-bold text-sm">
              N
            </span>
            <span className="font-bold text-xl tracking-tight text-[#111111]">
              STREET<span className="text-[#F4512C]">MODE</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-[#111111] mb-1">Welcome Back</h1>
          <p className="text-xs text-gray-500 font-medium">Sign in to access your account & wishlist</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs font-bold text-[#111111] block mb-1.5">Email Address</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-[#E6E6E3] rounded-xl px-4 py-3 pl-10 text-xs text-[#111111] placeholder-gray-400 focus:outline-none focus:border-[#F4512C]"
                placeholder="you@example.com"
                required
              />
              <Mail className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-[#111111]">Password</label>
              <Link href="#" className="text-[11px] text-[#F4512C] font-semibold hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-[#E6E6E3] rounded-xl px-4 py-3 pl-10 text-xs text-[#111111] placeholder-gray-400 focus:outline-none focus:border-[#F4512C]"
                placeholder="••••••••"
                required
              />
              <Lock className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold py-3.5 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 mt-4"
          >
            {loading ? "Signing in..." : "Sign In"} <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500 font-medium">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[#F4512C] font-bold hover:underline">
            Create account
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
