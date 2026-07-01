import React, { useState } from "react";
import LocalGame from "@game";
import OnlinePortal from "./OnlinePortal.jsx";
import { migrateCareerToServer } from "./lib/online-migrate.js";

/**
 * ขั้นที่ 1: เกมเต็มในโลกจำลอง (ฝึกเล่นกับบอท)
 * ขั้นที่ 2: ครบ 50M → ย้ายไปเซิร์ฟเวอร์แข่งกับผู้เล่นจริง
 */
export default function ShellApp() {
  const [mode, setMode] = useState(() => localStorage.getItem("siam_play_mode") || "sandbox");

  if (mode === "online") {
    return (
      <OnlinePortal
        onPracticeAgain={() => {
          localStorage.setItem("siam_play_mode", "sandbox");
          setMode("sandbox");
        }}
      />
    );
  }

  return (
    <LocalGame
      onMigrateToServer={async (career, email) => {
        await migrateCareerToServer(career, email);
        setMode("online");
      }}
    />
  );
}
