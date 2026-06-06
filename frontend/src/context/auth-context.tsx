import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onIdTokenChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { syncUser, clearApiCache, abortAllRequests, setAuthTransitioning, setSyncingUser, getAccessToken, setAuthHydrated } from "@/lib/api";
import { User as LocalUser } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  localUser: LocalUser | null;
  loading: boolean;
  error: Error | null;
  getToken: () => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [localUser, setLocalUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let controller: AbortController | null = null;
    let lastUid: string | null = null;

    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      const uidChanged = currentUser?.uid !== lastUid;
      lastUid = currentUser ? currentUser.uid : null;

      if (uidChanged) {
        console.debug("[Auth] User UID changed. Aborting requests and resetting API cache/gate...");
        setAuthHydrated(false); // Reset gating so requests are queued until sync completes
        abortAllRequests();
        clearApiCache();
      }

      setUser(currentUser);
      setError(null);
      
      if (controller) controller.abort();
      
      if (currentUser) {
        if (uidChanged) {
          controller = new AbortController();
          setSyncingUser(true);
          try {
            console.debug("[Auth] Syncing user profile with Django backend...");
            const synced = await syncUser(undefined, { signal: controller.signal });
            setLocalUser(synced);
          } catch (err: any) {
            if (err.name !== "AbortError") {
              console.error("Failed to sync user with backend", err);
              setError(err instanceof Error ? err : new Error("Failed to sync user"));
            }
          } finally {
            setSyncingUser(false);
            setAuthHydrated(true); // Release gating after profile sync finishes
          }
        } else {
          setAuthHydrated(true); // Release gating if UID did not change (token-only change)
        }
      } else {
        setLocalUser(null);
        setAuthHydrated(true); // Release gating if no user is authenticated
      }
      
      setLoading(false);
    });

    return () => {
      if (controller) controller.abort();
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    setAuthTransitioning(true);
    try {
      console.debug("[Auth] Initiating logout sequence...");
      abortAllRequests();
      clearApiCache();
      await auth.signOut();
    } catch (e) {
      console.error("[Auth] Sign out error:", e);
    } finally {
      setAuthTransitioning(false);
    }
  };

  const getToken = async () => {
    return await getAccessToken();
  };

  return (
    <AuthContext.Provider value={{ user, localUser, loading, error, getToken, logout }}>
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
