import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { syncUser } from "@/lib/api";
import { User as LocalUser } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  localUser: LocalUser | null;
  loading: boolean;
  getToken: () => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [localUser, setLocalUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        const token = await user.getIdToken();
        localStorage.setItem("token", token);
        try {
          const synced = await syncUser();
          setLocalUser(synced);
        } catch (err) {
          console.error("Failed to sync user with backend", err);
        }
      } else {
        localStorage.removeItem("token");
        setLocalUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await auth.signOut();
  };

  const getToken = async () => {
    if (!auth.currentUser) return null;
    return await getIdToken(auth.currentUser, true);
  };

  return (
    <AuthContext.Provider value={{ user, localUser, loading, getToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
