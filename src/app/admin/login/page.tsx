"use client";

import { useState } from "react";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { adminAuth, adminDb } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff, FiLock, FiMail } from "react-icons/fi";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const router = useRouter();

  const handlePasswordReset = async () => {
    if (resetLoading) return;

    setError("");
    setResetMessage("");

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter your registered email address to reset your password.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(adminAuth, normalizedEmail);
      setResetMessage(
        "If an account exists for this email, password reset instructions will be sent."
      );
    } catch (err: unknown) {
      const errorCode = err instanceof FirebaseError ? err.code : "";
      console.error("ADMIN PASSWORD RESET ERROR:", errorCode, err);
      if (errorCode === "auth/user-not-found") {
        setResetMessage(
          "If an account exists for this email, password reset instructions will be sent."
        );
      } else if (errorCode === "auth/invalid-email") {
        setError("Enter a valid email address.");
      } else if (errorCode === "auth/network-request-failed") {
        setError("Unable to reach the server. Check your connection and try again.");
      } else if (errorCode === "auth/too-many-requests") {
        setError("Too many reset attempts. Please wait a while and try again.");
      } else if (errorCode === "auth/operation-not-allowed") {
        setError("Password reset is unavailable. Please contact your administrator.");
      } else {
        setError("Unable to send password reset instructions. Please try again.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(adminAuth, email, password);
      const uid = userCredential.user.uid;
      const userRef = doc(adminDb, "users", uid);

      let snapshot;
      try {
        snapshot = await getDoc(userRef);
      } catch (firestoreErr: unknown) {
        console.error("ROLE READ ERROR:", firestoreErr);
        const firestoreMessage = firestoreErr instanceof Error
          ? firestoreErr.message
          : firestoreErr instanceof FirebaseError
            ? firestoreErr.code
            : "Permission denied";

        // Do NOT show "Unauthorized admin account" for Condition B (Firestore permission/read error)
        setError(`Unable to verify admin role due to a Firestore error: ${firestoreMessage}`);
        return;
      }

      if (!snapshot.exists()) {
        console.error("ROLE READ ERROR: Admin profile document does not exist.");
        await adminAuth.signOut();
        setError(`Admin profile document missing in Firestore (users/${uid}).`);
        return;
      }

      const data = snapshot.data();
      const role = data?.role;

      if (role !== "admin") {
        console.warn("USER ROLE IS NOT ADMIN. ACCESS DENIED.");
        await adminAuth.signOut();
        setError("Unauthorized admin account. You do not have permission to access the admin portal.");
      } else {
        console.log("ADMIN ROLE VERIFIED SUCCESSFULLY. REDIRECTING TO DASHBOARD...");
        router.push("/admin/dashboard");
      }
    } catch (err: unknown) {
      const errorCode = err instanceof FirebaseError ? err.code : "";
      const errorMessage = err instanceof Error ? err.message : "";
      console.error("ADMIN LOGIN ERROR:", errorCode, errorMessage, err);
      if (
        errorCode === "auth/invalid-credential" ||
        errorCode === "auth/user-not-found" ||
        errorCode === "auth/wrong-password" ||
        errorCode === "auth/invalid-email"
      ) {
        setError("Invalid email or password. Please try again.");
      } else if (errorCode === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError(errorMessage || "Failed to sign in. Please try again.");
      }
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
          {resetMessage && (
            <div role="status" className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm text-center">
              {resetMessage}
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
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={resetLoading}
                className="text-[#ff6a00] hover:text-[#ff6a00]/80 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {resetLoading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Forgot password?"
                )}
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
