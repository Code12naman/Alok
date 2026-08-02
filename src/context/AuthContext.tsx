"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase/config";
import { getUserProfile, UserData, UserRole } from "../services/authService";

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  profile: UserData | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileData = async (uid: string) => {
    try {
      const data = await getUserProfile(uid);
      if (data) {
        setProfile(data);
        setRole(data.role);
      } else {
        setProfile(null);
        setRole(null);
      }
    } catch (err) {
      console.error("AuthContext: failed to fetch profile", err);
      setProfile(null);
      setRole(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileData(user.uid);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setLoading(true);
        if (firebaseUser) {
          setUser(firebaseUser);
          await fetchProfileData(firebaseUser.uid);
        } else {
          setUser(null);
          setRole(null);
          setProfile(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("AuthContext: auth error", error);
        setUser(null);
        setRole(null);
        setProfile(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
