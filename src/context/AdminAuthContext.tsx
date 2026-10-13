"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { adminAuth, adminDb } from "@/firebase/config";
import { UserRole } from "@/services/authService";

interface AdminAuthContextValue {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextValue>({
  user: null,
  role: null,
  loading: true,
});

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(adminAuth, async (adminUser) => {
      setUser(adminUser);
      if (!adminUser) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await getDoc(doc(adminDb, "users", adminUser.uid));
        setRole(profile.exists() ? (profile.data().role as UserRole) : null);
      } catch (error) {
        console.error("AdminAuthContext: failed to fetch admin profile", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  return (
    <AdminAuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
