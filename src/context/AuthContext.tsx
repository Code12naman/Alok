"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase/config";
import { getUserRole, UserRole } from "../services/authService";

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Add a 5 second timeout to prevent endless loading if Firestore is offline
          const rolePromise = getUserRole(firebaseUser.uid, firebaseUser.email);
          const timeoutPromise = new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error("Timeout fetching role")), 5000)
          );
          
          const userRole = await Promise.race([rolePromise, timeoutPromise]);
          setRole(userRole as UserRole | null);
        } catch (err) {
          console.error("AuthContext: failed to fetch role (timeout or error)", err);
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("AuthContext: auth error", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
