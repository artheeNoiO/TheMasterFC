import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "./lib/api.js";
import { isSupabaseMode, supabase } from "./lib/supabase.js";
import { rememberLastUsername } from "./lib/save-keys.js";
import AccountAuthModal from "./AccountAuthModal.jsx";

const AccountContext = createContext(null);

export function AccountProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const postAuthRef = React.useRef(null);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return null;
    }
    try {
      const me = await api("/api/auth/me");
      setUser(me.user);
      return me.user;
    } catch {
      setToken(null);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const openAuth = useCallback((signup = false, afterSuccess = null) => {
    setAuthMode(signup ? "signup" : "login");
    postAuthRef.current = typeof afterSuccess === "function" ? afterSuccess : null;
    setAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setAuthOpen(false);
    postAuthRef.current = null;
  }, []);

  const completeAuth = useCallback(() => {
    setAuthOpen(false);
    const fn = postAuthRef.current;
    postAuthRef.current = null;
    fn?.();
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setAuthOpen(false);
    postAuthRef.current = null;
    if (supabase) supabase.auth.signOut().catch(() => {});
    localStorage.setItem("siam_play_mode", "sandbox");
  }, []);

  /** ออกจากระบบแล้วกลับหน้าแรก */
  const logoutToHome = useCallback(() => {
    logout();
    window.location.href = "/";
  }, [logout]);

  const applyAuthResponse = useCallback((data) => {
    setToken(data.token);
    setUser(data.user);
    if (data.user?.username) rememberLastUsername(data.user.username);
    localStorage.setItem("siam_play_mode", "sandbox");
    return data.user;
  }, []);

  const registerGameId = useCallback(async ({ username, password, displayName }) => {
    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password, displayName }),
    });
    return applyAuthResponse(data);
  }, [applyAuthResponse]);

  const loginGameId = useCallback(async ({ username, password }) => {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    return applyAuthResponse(data);
  }, [applyAuthResponse]);

  const loginDev = useCallback(async ({ email, displayName }) => {
    const data = await api("/api/auth/dev-register", {
      method: "POST",
      body: JSON.stringify({ email, displayName: displayName || email.split("@")[0] }),
    });
    return applyAuthResponse(data);
  }, [applyAuthResponse]);

  const loginSupabase = useCallback(async ({ email, password, displayName, signUp }) => {
    const fn = signUp
      ? () => supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } })
      : () => supabase.auth.signInWithPassword({ email, password });
    const { data, error: err } = await fn();
    if (err) throw err;
    const session = data.session ?? (await supabase.auth.getSession()).data.session;
    if (!session) throw new Error("เช็คอีเมลยืนยันบัญชีก่อน");
    setToken(session.access_token);
    const me = await api("/api/auth/me");
    setUser(me.user);
    return me.user;
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isLoggedIn: Boolean(user),
    isSupabaseMode,
    refresh,
    logout,
    logoutToHome,
    openAuth,
    closeAuth,
    registerGameId,
    loginGameId,
    loginDev,
    loginSupabase,
  }), [user, loading, refresh, logout, logoutToHome, openAuth, closeAuth, registerGameId, loginGameId, loginDev, loginSupabase]);

  return (
    <AccountContext.Provider value={value}>
      {children}
      <AccountAuthModal
        open={authOpen}
        onClose={closeAuth}
        initialMode={authMode}
        onSuccess={completeAuth}
      />
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within AccountProvider");
  return ctx;
}

/** ชื่อที่แสดงใน UI — ลำดับ username → displayName → email */
export function accountDisplayLabel(user) {
  if (!user) return "";
  return user.username || user.displayName || user.email || "ผู้เล่น";
}
