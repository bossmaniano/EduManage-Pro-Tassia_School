import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate session from cookie on mount
  useEffect(() => {
    apiFetch("/api/auth/me")
      .then(async (res) => {
        if (res && res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      body: { username, password },
    });
    if (!res) throw new Error("Network error");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Login failed");
    }
    const data = await res.json();
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    // Clear user state first to prevent any race conditions
    setUser(null);
    // Then call logout API (ignore errors)
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    // Force a full page reload to clear any cached state
    window.location.replace("/login");
  }, []);

  const isAdmin = user?.role === "Admin";
  const isTeacher = user?.role === "Teacher";

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isTeacher }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
