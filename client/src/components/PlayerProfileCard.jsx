import React from "react";
import { starsFromRating } from "@stars";

function KitMini({ shirt, shorts, trim, size = 48 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <path d="M30 10 L10 25 L20 40 L30 32 L30 78 L70 78 L70 32 L80 40 L90 25 L70 10 L60 18 Q50 25 40 18 Z" fill={shirt} stroke={trim} strokeWidth="3" />
      </svg>
      <div style={{ width: size * 0.72, height: size * 0.3, background: shorts, borderRadius: 5, border: `2.5px solid ${trim}` }} />
    </div>
  );
}

/**
 * การ์ดโปรไฟล์นักเตะ — รูปหน้าวงกลมสะอาดๆ สไตล์ Football Manager (ไม่มีเสื้อทับหน้า)
 * ขอบวงแหวนสีทีม + Kit เล็กด้านล่างบอกสีชุดแข่งแทน
 */
export default function PlayerProfileCard({
  player,
  team,
  shirtColor,
  shortsColor,
  trimColor,
  posLabel,
  panelBg = "#0b2318",
  steel = "#2a3530",
  chalk = "#f2f0e6",
  textDim = "#a9bdb1",
  amber = "#e0a458",
  monoFont = "ui-monospace, monospace",
}) {
  if (!player) return null;

  const shirt = shirtColor || team?.shirtColor || team?.color || "#888888";
  const shorts = shortsColor || team?.shortsColor || team?.secondaryColor || "#1a1a1a";
  const trim = trimColor || team?.secondaryColor || "#f2f0e6";

  return (
    <div style={{
      borderRadius: 12, overflow: "hidden", marginBottom: 12, padding: "20px 14px 14px",
      background: `linear-gradient(180deg, ${panelBg} 0%, #071510 100%)`,
      border: `1px solid ${steel}`,
      boxShadow: "0 8px 24px rgba(0,0,0,.35)",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{
        width: 128, height: 128, borderRadius: "50%", flexShrink: 0,
        background: "#2a2a2e", border: `3px solid ${shirt}`,
        boxShadow: `0 0 0 3px ${panelBg}, 0 6px 16px rgba(0,0,0,.4)`,
        overflow: "hidden", position: "relative",
      }}>
        {player.portrait ? (
          <img
            src={player.portrait}
            alt=""
            draggable={false}
            style={{
              width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 14%",
              pointerEvents: "none",
            }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            color: textDim, fontSize: 11,
          }}>ไม่มีภาพ</div>
        )}
      </div>

      <div style={{ fontSize: 16, fontWeight: 800, color: chalk, marginTop: 12, textAlign: "center", lineHeight: 1.2 }}>{player.name}</div>
      <div style={{ fontSize: 11, color: textDim, marginTop: 3 }}>
        {posLabel || "?"} · OVR {player.rating} · อายุ {player.age}
        {player.isLegend && (
          <span style={{ marginLeft: 8, color: amber, letterSpacing: 1 }}>
            {"★".repeat(starsFromRating(player.rating))}
          </span>
        )}
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginTop: 14, paddingTop: 12,
        borderTop: `1px solid ${steel}`, width: "100%", justifyContent: "center",
      }}>
        <KitMini shirt={shirt} shorts={shorts} trim={trim} />
        {team && (
          <div style={{ fontSize: 11, color: amber, fontFamily: monoFont, fontWeight: 700 }}>
            {team.short || team.name}
          </div>
        )}
      </div>
    </div>
  );
}
