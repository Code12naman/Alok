"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase/config";
import { getUserRole } from "@/services/authService";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff, FiLock, FiMail } from "react-icons/fi";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminLogin() {
  const [email, setEmail] = useState("admin@123.com");
  const [password, setPassword] = useState("12345678");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let userCredential;
      try {
        // Try to sign in first
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (signInErr: any) {
        // If user not found and it's the requested admin credentials, create it automatically
        if (
          (signInErr.code === "auth/user-not-found" || signInErr.code === "auth/invalid-credential") &&
          email === "admin@123.com"
        ) {
          const { createUserWithEmailAndPassword } = await import("firebase/auth");
          const { doc, setDoc } = await import("firebase/firestore");
          const { db } = await import("@/firebase/config");
          
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
          
          // Try to save role to Firestore, but don't block if Firestore is offline
          const setDocPromise = setDoc(doc(db, "users", userCredential.user.uid), {
            uid: userCredential.user.uid,
            name: "Admin User",
            email: email,
            role: "admin"
          });
          const setDocTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), 2000));
          await Promise.race([setDocPromise, setDocTimeout]).catch(e => console.warn("Could not save to Firestore, continuing anyway", e));
        } else {
          throw signInErr;
        }
      }

      const role = await getUserRole(userCredential.user.uid, email);
      
      if (role !== "admin") {
        await auth.signOut();
        setError("You do not have permission to access the admin portal.");
      } else {
        router.push("/admin/dashboard");
      }
    } catch (err: any) {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#ff6a00] text-xs font-bold tracking-[0.18em] text-white mb-4">
              SM
            </div>
            <h1 className="font-display text-3xl tracking-[0.1em] text-white">ADMIN PORTAL</h1>
            <p className="text-white/50 text-sm mt-2">Sign in to access the dashboard</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff6a00]/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff6a00]/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-transparent accent-[#ff6a00]" />
                <span className="text-white/50 group-hover:text-white transition-colors">Remember me</span>
              </label>
              <button type="button" className="text-[#ff6a00] hover:text-[#ff6a00]/80 transition-colors">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ff6a00] hover:bg-[#ff6a00]/90 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
