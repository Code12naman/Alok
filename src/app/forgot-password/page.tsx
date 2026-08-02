"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { sendPasswordResetLink } from "@/services/authService";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    try {
      await sendPasswordResetLink(email.trim());
      setSuccess(true);
    } catch (err: any) {
      if (err?.code === "auth/user-not-found") {
        setError("No account found with this email address.");
      } else {
        setError(err?.message || "Failed to send reset link. Please try again.");
      }
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
          <h1 className="text-2xl font-bold text-[#111111] mb-1">Reset Password</h1>
          <p className="text-xs text-gray-500 font-medium">
            Enter your email to receive password reset instructions
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center py-4 space-y-4">
            <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-base text-[#111111]">Password Reset Email Sent</h3>
            <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
              We&apos;ve sent a password reset link to <strong className="text-black">{email}</strong>. Please check your inbox and follow instructions.
            </p>
            <Link
              href="/login"
              className="inline-block mt-2 text-xs font-bold text-[#F4512C] hover:underline"
            >
              ← Back to Sign In
            </Link>
          </div>
        ) : (
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold py-3.5 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {loading ? "Sending link..." : "Send Reset Link"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-gray-500 font-medium">
          Remembered your password?{" "}
          <Link href="/login" className="text-[#F4512C] font-bold hover:underline">
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
