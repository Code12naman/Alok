"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        if (pathname !== "/admin/login") {
          router.push("/admin/login");
        }
      } else {
        if (role === "admin") {
          if (pathname === "/admin/login" || pathname === "/admin") {
            router.push("/admin/dashboard");
          }
        } else {
          if (pathname !== "/admin/forbidden") {
            router.push("/admin/forbidden");
          }
        }
      }
    }
  }, [user, role, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!user && pathname !== "/admin/login") {
    return null; // Will redirect
  }

  if (user && role !== "admin" && pathname !== "/admin/forbidden") {
    return null; // Will redirect
  }

  return <>{children}</>;
}
