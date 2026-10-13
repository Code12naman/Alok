"use client";

import { useAdminAuth } from "@/context/AdminAuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { signOut } from "firebase/auth";
import { adminAuth } from "@/firebase/config";

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === "/admin" || pathname === "/admin/login";

  useEffect(() => {
    if (loading) return; // Wait until auth state and role check finish

    if (!user) {
      if (!isLoginPage) {
        router.push("/admin");
      }
    } else if (role === "admin") {
      if (isLoginPage) {
        router.push("/admin/dashboard");
      }
    } else if (role !== null) {
      // User is authenticated, role is loaded, but role is not admin (e.g. customer)
      if (!isLoginPage) {
        signOut(adminAuth).then(() => {
          router.push("/admin");
        });
      }
    }
  }, [user, role, loading, pathname, router, isLoginPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#ff6500] animate-spin" />
      </div>
    );
  }

  if (!user && !isLoginPage) {
    return null;
  }

  if (user && role !== "admin" && !isLoginPage) {
    return null;
  }

  if (user && role === "admin" && isLoginPage) {
    return null;
  }

  return <>{children}</>;
}
