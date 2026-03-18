import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
    console.log('[Auth] Logout initiated - current user:', user?.username);
    
    // CRITICAL: Call logout API FIRST, before clearing state
    // Clearing state first causes ProtectedLayout to redirect, unmounting component
    // and potentially canceling the API call
    try {
      console.log('[Auth] Calling logout API...');
      const res = await apiFetch("/api/auth/logout", { method: "POST" });
      console.log('[Auth] Logout API response:', res?.status, res?.ok);
      
      if (!res?.ok) {
        const errorText = await res?.text();
        console.error('[Auth] Logout failed:', res?.status, errorText);
      }
    } catch (err) {
      console.error('[Auth] Logout API error:', err);
    }
    
    // Now clear user state after API call completes
    console.log('[Auth] Clearing user state');
    setUser(null);
    console.log('[Auth] User state cleared to null');
    
    // Use React Router navigate for proper redirect
    console.log('[Auth] Redirecting to /login');
    navigate("/login", { replace: true });
  }, [navigate]);

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
