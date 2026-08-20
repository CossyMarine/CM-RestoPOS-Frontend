// src/hooks/useAuth.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import API from "../api/axios";
import 
const AuthContext = createContext(null);

// Single shared source of truth for "who's logged in", read from the httpOnly
// cookie via GET /auth/me. Wrap the app once in <AuthProvider> so every
// component (App's route guards, ProfilePage, LoginPage, etc.) reads the
// SAME user state instead of each spinning up its own copy — that mismatch
// was why logging out on /profile didn't update App's routing state, so
// hitting /login right after showed a stale "logged in" user and redirected
// to /home instead of the login form.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await API.get("/auth/me");
      setUser(res.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const logout = async () => {
    try {
      await API.post("/auth/logout");
    } finally {
      setUser(null);
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* storage may be unavailable in some contexts — ignore */
      }
      if (typeof caches !== "undefined") {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        } catch {
          /* Cache Storage unsupported — ignore */
        }
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

// Same call signature as before: const { user, loading, logout } = useAuth();
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
