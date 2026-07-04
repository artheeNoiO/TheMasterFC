import React, { useCallback, useEffect, useState } from "react";

import OnlineMvpApp from "./OnlineMvpApp.jsx";
import { GAME_NAME, MINUTES_PER_GAME_DAY, MATCH_DAYS_PER_SEASON, DAILY_STAFF_CARD_DRAWS } from "@version";
import { bootstrapOnlineDirect } from "./lib/online-session.js";
import { isGameApiConfigured } from "./lib/online-api.js";

const C = { amber: "#e0a458", textDim: "#a9bdb1", steel: "#26433a", panel: "#132a20" };

/** Full Online — ลีกชาร์ดบนเซิร์ฟเวอร์ (ไม่มีโลกจำลอง) */
export default function OnlinePortal({ onLogout }) {
  const [bootError, setBootError] = useState("");
  const [booting, setBooting] = useState(true);
  const [bootReady, setBootReady] = useState(false);

  const runBoot = useCallback(async () => {
    setBooting(true);
    setBootError("");
    try {
      await bootstrapOnlineDirect();
      setBootReady(true);
    } catch (e) {
      setBootError(e.message || "เข้าโลกออนไลน์ไม่สำเร็จ");
      setBootReady(true);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => { runBoot(); }, [runBoot]);

  return (
    <div style={{ minHeight: "100vh", color: "#f2f0e6" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderBottom: `1px solid ${C.steel}`, background: C.panel,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.amber }}>
          🌐 {GAME_NAME} — Full Online
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 10, color: C.textDim }}>
          {MATCH_DAYS_PER_SEASON} นัด/ฤดูกาล · ~{MINUTES_PER_GAME_DAY} นาที/นัด · การ์ด {DAILY_STAFF_CARD_DRAWS}/วัน
        </div>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              style={{
                fontSize: 10.5, padding: "5px 10px", borderRadius: 8, border: `1px solid ${C.steel}`,
                background: "transparent", color: C.textDim, cursor: "pointer",
              }}
            >
              ออกจากระบบ
            </button>
          )}
        </div>
      </div>

      {!isGameApiConfigured() && (
        <div style={{ padding: 12, background: "rgba(193,68,14,.15)", fontSize: 12, color: C.amber, textAlign: "center" }}>
          ตั้ง VITE_API_URL=http://localhost:3001 แล้วรัน npm run dev (ต้องมี server :3001)
        </div>
      )}

      {booting ? (
        <p style={{ textAlign: "center", padding: 40, color: C.textDim }}>กำลังเข้าสู่ลีกออนไลน์...</p>
      ) : bootReady ? (
        <OnlineMvpApp bootError={bootError} onRetryBoot={runBoot} />
      ) : null}
    </div>
  );
}
