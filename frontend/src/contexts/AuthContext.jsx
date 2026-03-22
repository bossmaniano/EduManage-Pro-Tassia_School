import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "../utils/api";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

// Session timeout constants (in milliseconds)
const SESSION_WARNING_TIME = 12 * 60 * 1000; // 12 minutes
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const navigate = useNavigate();
  
  // Session timeout tracking
  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef(null);
  const logoutTimerRef = useRef(null);
  
  // Expose lastActivityTime for the analog timer
  const getLastActivityTime = useCallback(() => lastActivityRef.current, []);
  
  // Reset session timers on user activity
  const resetSessionTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowTimeoutWarning(false);
    
    // Clear existing timers
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    
    // Set warning timer (12 minutes)
    warningTimerRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
    }, SESSION_WARNING_TIME);
    
    // Set logout timer (15 minutes)
    logoutTimerRef.current = setTimeout(() => {
      // Auto logout when session expires
      setUser(null);
      setShowTimeoutWarning(false);
      navigate("/login?reason=session_expired", { replace: true });
    }, SESSION_TIMEOUT);
  }, [navigate]);
  
  // Set up activity listeners
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      if (user) {
        resetSessionTimers();
      }
    };
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });
    
    // Initialize timers when user is logged in
    if (user) {
      resetSessionTimers();
    }
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [user, resetSessionTimers]);

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
    
    // Clear session timers
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    setShowTimeoutWarning(false);
    
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
  
  // Extend session (called when user clicks "Stay Logged In")
  const extendSession = useCallback(async () => {
    try {
      // Call backend to validate session is still valid
      const res = await apiFetch("/api/auth/refresh", { method: "POST" });
      if (res && res.ok) {
        // Reset local timers
        resetSessionTimers();
        return true;
      }
    } catch (e) {
      console.error("Session refresh failed:", e);
    }
    return false;
  }, [resetSessionTimers]);

  const isAdmin = user?.role === "Admin";
  const isTeacher = user?.role === "Teacher";

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isTeacher, showTimeoutWarning, extendSession, getLastActivityTime }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
