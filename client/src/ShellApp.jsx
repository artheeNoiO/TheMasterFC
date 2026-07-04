import React, { useCallback } from "react";
import LocalGame from "@game";
import { useAccount } from "./AccountContext.jsx";
import { useSiteLocale } from "./SiteLocaleContext.jsx";
import { bootstrapOnlineFromCareer } from "./lib/online-session.js";
import AuthRequiredScreen from "./AuthRequiredScreen.jsx";

/** ระบบหลัก = football-manager.jsx เกมเดียว — ต้องล็อกอินก่อนเสมอ (บังคับที่นี่ ไม่ใช่ตัวเลือกใน
 * TitleScreen) แล้วเซฟ career ของเกมจะซิงก์ขึ้นเซิร์ฟเวอร์ผูกกับบัญชีนี้ */
export default function ShellApp() {
  const { user, loading, logoutToHome, openAuth } = useAccount();
  const { t } = useSiteLocale();

  const handleLogout = useCallback(() => {
    if (!window.confirm(t("shell.logoutConfirm"))) return;
    logoutToHome();
  }, [logoutToHome, t]);

  const syncOnlineServer = useCallback(async (career) => {
    if (!career) return;
    await bootstrapOnlineFromCareer(career);
    localStorage.setItem("siam_play_mode", "online");
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050608", color: "#9aa3ad" }}>
        {t("shell.loading")}
      </div>
    );
  }

  if (!user) {
    return <AuthRequiredScreen />;
  }

  return (
    <LocalGame
      accountUser={user}
      onOpenAuth={openAuth}
      onSyncOnlineServer={syncOnlineServer}
      onLogout={handleLogout}
    />
  );
}
