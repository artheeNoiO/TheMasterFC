import React from "react";
import OnlineApp from "./App.jsx";

const C = { amber: "#e0a458", textDim: "#a9bdb1", steel: "#26433a", panel: "#132a20" };

/** โหมดออนไลน์ — ล็อกอิน + ลีกบนเซิร์ฟเวอร์ (ขยายต่อจาก App.jsx) */
export default function OnlinePortal({ onPracticeAgain }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0b2318", color: "#f2f0e6" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderBottom: `1px solid ${C.steel}`, background: C.panel,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.amber }}>🌐 The Socker Manager — ออนไลน์</div>
        <button
          type="button"
          onClick={onPracticeAgain}
          style={{
            fontSize: 11, padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.steel}`,
            background: "transparent", color: C.textDim, cursor: "pointer",
          }}
        >
          ← กลับโลกจำลอง
        </button>
      </div>
      <OnlineApp />
    </div>
  );
}
