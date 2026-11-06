"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { adminAuth, adminDb } from "@/firebase/config";
import { UserRole } from "@/services/authService";

interface AdminAuthContextValue {
  user: User | null;
  role: UserRole | null;
  profile: AdminProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

export interface AdminProfile {
  name: string;
  email: string;
  phone: string;
  photoURL: string;
  photoPublicId: string;
  createdAt: unknown;
}

const AdminAuthContext = createContext<AdminAuthContextValue>({
  user: null,
  role: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let authRequest = 0;
    const unsubscribe = onAuthStateChanged(adminAuth, async (adminUser) => {
      const requestId = ++authRequest;
      if (active) setLoading(true);
      if (active) setUser(adminUser);
      if (!adminUser) {
        if (active && requestId === authRequest) {
          setRole(null);
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      try {
        const profile = await getDoc(doc(adminDb, "users", adminUser.uid));
        if (!active || requestId !== authRequest) return;
        const data = profile.exists() ? profile.data() : null;
        const nextRole = data?.role === "admin" || data?.role === "customer"
          ? data.role
          : null;
        setRole(nextRole);
        setProfile(nextRole === "admin" && data
          ? {
              name: typeof data.name === "string" ? data.name : adminUser.displayName || "",
              email: typeof data.email === "string" ? data.email : adminUser.email || "",
              phone: typeof data.phone === "string" ? data.phone : adminUser.phoneNumber || "",
              photoURL: typeof data.photoURL === "string" ? data.photoURL : adminUser.photoURL || "",
              photoPublicId: typeof data.photoPublicId === "string" ? data.photoPublicId : "",
              createdAt: data.createdAt,
            }
          : null);
      } catch (error) {
        console.error("AdminAuthContext: failed to fetch admin profile", error);
        if (active && requestId === authRequest) {
          setRole(null);
          setProfile(null);
        }
      } finally {
        if (active && requestId === authRequest) setLoading(false);
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const snapshot = await getDoc(doc(adminDb, "users", user.uid));
    if (!snapshot.exists() || snapshot.data().role !== "admin") {
      setRole(null);
      setProfile(null);
      return;
    }

    const data = snapshot.data();
    setProfile({
      name: typeof data.name === "string" ? data.name : user.displayName || "",
      email: typeof data.email === "string" ? data.email : user.email || "",
      phone: typeof data.phone === "string" ? data.phone : user.phoneNumber || "",
      photoURL: typeof data.photoURL === "string" ? data.photoURL : user.photoURL || "",
      photoPublicId: typeof data.photoPublicId === "string" ? data.photoPublicId : "",
      createdAt: data.createdAt,
    });
  }, [user]);

  return (
    <AdminAuthContext.Provider value={{ user, role, profile, loading, refreshProfile }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
