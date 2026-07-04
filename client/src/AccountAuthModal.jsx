import React, { useEffect, useState } from "react";
import { useAccount } from "./AccountContext.jsx";
import { getLastUsername } from "./lib/save-keys.js";
import { GAME_NAME } from "@version";
import { useSiteLocale } from "./SiteLocaleContext.jsx";

const C = {
  amber: "#d4af37",
  good: "#3dba6a",
  steel: "rgba(255,255,255,0.12)",
  textDim: "#9aa3ad",
  chalk: "#ffffff",
  crimson: "#d45a3a",
};

const BRAND_LOGO = "/branding/master-logo.png";
const LOGIN_BG = "/branding/login-bg.png";

export default function AccountAuthModal({ open, onClose, onSuccess, initialMode = "login" }) {
  const { registerGameId, loginGameId } = useAccount();
  const { t } = useSiteLocale();
  const [mode, setMode] = useState(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const usernameHint = t("auth.modal.usernameHint");

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError("");
      if (initialMode === "login") {
        const last = getLastUsername();
        if (last) setUsername(last);
      }
    }
  }, [open, initialMode]);

  if (!open) return null;

  async function submit(e) {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      let user;
      if (mode === "signup") {
        user = await registerGameId({
          username: username.trim(),
          password,
          displayName: displayName.trim(),
        });
      } else {
        user = await loginGameId({ username: username.trim(), password });
      }
      onSuccess?.(user);
      onClose?.();
    } catch (err) {
      setError(err.message || t("auth.modal.fail"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("auth.modal.aria")}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(5,6,8,.88)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, overflowY: "auto",
      }}
      onClick={(ev) => { if (ev.target === ev.currentTarget) onClose?.(); }}
    >
      <div style={{
        width: "min(420px, 100%)",
        background: `linear-gradient(180deg, rgba(5,6,8,.95), rgba(5,6,8,.98)), url(${LOGIN_BG}) center/cover`,
        border: `1px solid ${C.steel}`, borderRadius: 14, padding: "20px 18px",
        boxShadow: "0 16px 48px rgba(0,0,0,.55)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.amber }}>
            {mode === "signup" ? t("auth.modal.signupTitle") : t("auth.modal.loginTitle")}
          </div>
          <button type="button" onClick={onClose} style={iconBtnStyle} aria-label={t("auth.modal.close")}>✕</button>
        </div>

        <img src={BRAND_LOGO} alt={GAME_NAME} style={{ width: "min(180px, 60vw)", display: "block", margin: "0 auto 12px" }} />

        <p style={{ fontSize: 11.5, color: C.textDim, lineHeight: 1.55, margin: "0 0 14px", textAlign: "center" }}>
          {mode === "signup" ? t("auth.modal.signupHint") : t("auth.modal.loginHint")}
        </p>

        <form onSubmit={submit}>
          {mode === "signup" && (
            <input
              placeholder={t("auth.modal.displayName")}
              value={displayName}
              onChange={(ev) => setDisplayName(ev.target.value)}
              style={inputStyle}
              maxLength={32}
              autoComplete="nickname"
            />
          )}
          <input
            required
            placeholder={t("auth.modal.username", { hint: usernameHint })}
            value={username}
            onChange={(ev) => setUsername(ev.target.value)}
            style={inputStyle}
            autoComplete="username"
            minLength={3}
            maxLength={16}
            pattern="[a-zA-Z0-9_]{3,16}"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder={t("auth.modal.password")}
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            style={inputStyle}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          {error && <p style={{ color: C.crimson, fontSize: 12, margin: "0 0 10px" }}>{error}</p>}
          <button type="submit" disabled={loading} style={btnPrimary}>
            {loading ? t("auth.modal.loading") : mode === "signup" ? t("auth.modal.submitSignup") : t("auth.modal.submitLogin")}
          </button>
        </form>

        <div style={{ marginTop: 12, textAlign: "center", fontSize: 11.5, color: C.textDim }}>
          {mode === "signup" ? (
            <>{t("auth.modal.hasAccount")} <button type="button" style={linkBtn} onClick={() => { setMode("login"); setError(""); }}>{t("auth.modal.switchLogin")}</button></>
          ) : (
            <>{t("auth.modal.noAccount")} <button type="button" style={linkBtn} onClick={() => { setMode("signup"); setError(""); }}>{t("auth.modal.switchSignup")}</button></>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "11px 12px", marginBottom: 10,
  borderRadius: 8, border: `1px solid ${C.steel}`, background: "rgba(5,6,8,.6)",
  color: C.chalk, fontSize: 13, fontFamily: "inherit",
};

const btnPrimary = {
  width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
  background: C.good, color: "#050608", fontWeight: 700, fontSize: 13, cursor: "pointer",
};

const linkBtn = {
  background: "none", border: "none", color: C.amber, cursor: "pointer",
  fontWeight: 700, fontSize: "inherit", padding: 0, textDecoration: "underline",
};

const iconBtnStyle = {
  background: "transparent", border: "none", color: C.textDim, cursor: "pointer", fontSize: 16,
};
