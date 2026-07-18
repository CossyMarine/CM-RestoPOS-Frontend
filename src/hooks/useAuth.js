// src/hooks/useAuth.js
import { useState, useEffect, useCallback } from "react";
import API from "../api/axios";

// Single source of truth for "who's logged in", read from the httpOnly
// cookie via GET /auth/me — there is no token/user in localStorage anymore.
export function useAuth() {
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
    }
  };

  return { user, loading, setUser, logout, refetch };
}
