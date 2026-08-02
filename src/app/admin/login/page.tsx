"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { app, auth, db } from "@/firebase/config";
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
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    console.log("LOGIN START");
    console.log("Firebase projectId:", app.options.projectId);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("LOGIN SUCCESS");
      console.log("AUTH UID:", userCredential.user.uid);
      console.log("AUTH EMAIL:", userCredential.user.email);
      console.log("auth.currentUser:", auth.currentUser?.uid);

      const uid = userCredential.user.uid;
      const userRef = doc(db, "users", uid);
      console.log("READING ADMIN ROLE FOR UID:", uid, "AT PATH:", userRef.path);

      let snapshot;
      try {
        snapshot = await getDoc(userRef);
        console.log("USER DOC EXISTS:", snapshot.exists());
        console.log("USER DATA:", snapshot.data());
      } catch (firestoreErr: any) {
        console.error("ROLE READ ERROR:", firestoreErr);
        console.error("Firebase error code:", firestoreErr?.code);
        console.error("Firebase error message:", firestoreErr?.message);

        // Do NOT show "Unauthorized admin account" for Condition B (Firestore permission/read error)
        setError(`Unable to verify admin role due to a Firestore error: ${firestoreErr?.message || firestoreErr?.code || "Permission denied"}`);
        return;
      }

      if (!snapshot.exists()) {
        console.error("ROLE READ ERROR: User document does not exist in Firestore for UID:", uid);
        await auth.signOut();
        setError(`Admin profile document missing in Firestore (users/${uid}).`);
        return;
      }

      const data = snapshot.data();
      const role = data?.role;

      if (role !== "admin") {
        console.warn(`USER ROLE IS '${role}', NOT 'admin'. ACCESS DENIED.`);
        await auth.signOut();
        setError("Unauthorized admin account. You do not have permission to access the admin portal.");
      } else {
        console.log("ADMIN ROLE VERIFIED SUCCESSFULLY. REDIRECTING TO DASHBOARD...");
        router.push("/admin/dashboard");
      }
    } catch (err: any) {
      console.error("ADMIN LOGIN ERROR:", err?.code, err?.message, err);
      if (
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/user-not-found" ||
        err?.code === "auth/wrong-password" ||
        err?.code === "auth/invalid-email"
      ) {
        setError("Invalid email or password. Please try again.");
      } else if (err?.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError(err?.message || "Failed to sign in. Please try again.");
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
