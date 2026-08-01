"use client";

import Link from "next/link";
import { FiAlertTriangle } from "react-icons/fi";
import { logoutUser } from "@/services/authService";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-10 shadow-2xl text-center max-w-md w-full">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-500 mb-6">
          <FiAlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl tracking-[0.05em] text-white mb-2">Access Denied</h1>
        <p className="text-white/60 mb-8">
          You do not have permission to access the admin portal. This area is restricted to authorized administrators only.
        </p>
        <div className="flex flex-col gap-3">
          <Link 
            href="/"
            className="w-full bg-[#ff6a00] hover:bg-[#ff6a00]/90 text-white font-medium py-3 rounded-xl transition-all"
          >
            Return to Homepage
          </Link>
          <button 
            onClick={() => logoutUser()}
            className="w-full bg-transparent border border-white/10 hover:bg-white/5 text-white font-medium py-3 rounded-xl transition-all"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
