import React from "react";
import { SCOUT_ZONES } from "@roadmapfx";

const C = {
  panel2: "rgba(5,6,8,0.5)", steel: "rgba(255,255,255,0.1)", amber: "#d4af37",
  good: "#3dba6a", crimson: "#d45a3a", textDim: "#9aa3ad", chalk: "#f2f0e6", blue: "#5a9bd5",
};

function btn(active) {
  return {
    padding: "4px 8px", fontSize: 9, borderRadius: 6, cursor: "pointer",
    border: `1px solid ${active ? C.blue : C.steel}`,
    background: "transparent", color: C.chalk,
  };
}

export default function OnlineRoadmapPanel({ roadmap, onAction, busy }) {
  if (!roadmap) return null;

  const ffp = roadmap.ffp || {};
  const board = roadmap.board || {};

  if (roadmap.managerSacked) {
    return (
      <section style={panelStyle(C.crimson)}>
        <h3 style={titleStyle}>🚪 ถูกไล่ออก</h3>
        <p style={{ fontSize: 12, color: C.textDim, margin: "0 0 10px" }}>{roadmap.sackReason || "บอร์ดไล่ออก"}</p>
        <p style={{ fontSize: 11, color: C.textDim }}>สร้างสโมสรใหม่เพื่อเริ่มอาชีพใหม่ (ฟีเจอร์รีเซ็ตเร็วๆ นี้)</p>
      </section>
    );
  }

  return (
    <>
      {roadmap.pendingPress && (
        <section style={panelStyle(C.blue)}>
          <h3 style={titleStyle}>📰 แถลงข่าว</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {roadmap.pendingPress.choices.map((ch) => (
              <button key={ch.id} type="button" disabled={busy}
                onClick={() => onAction("press", { choiceId: ch.id })} style={btn(true)}>
                {ch.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {roadmap.pendingConversation && (
        <section style={panelStyle("#9d6fe0")}>
          <h3 style={titleStyle}>💬 {roadmap.pendingConversation.playerName}</h3>
          <p style={{ fontSize: 11, color: C.textDim, margin: "0 0 8px" }}>{roadmap.pendingConversation.label}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" disabled={busy} onClick={() => onAction("conversation", { accept: true })} style={btn(true)}>ตกลง</button>
            <button type="button" disabled={busy} onClick={() => onAction("conversation", { accept: false })} style={btn(false)}>ปฏิเสธ</button>
          </div>
        </section>
      )}

      <section style={panelStyle(C.amber)}>
        <h3 style={titleStyle}>📋 ระบบสโมสร · Roadmap A/B</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 8 }}>
          <Stat label="FFP โอน" value={`${Math.round((ffp.seasonSpend || 0) / 1000)}K/${Math.round((ffp.cap || 0) / 1000)}K`} color={ffp.blocked ? C.crimson : C.chalk} />
          <Stat label="เสี่ยงไล่ออก" value={`${board.sackRisk ?? 0}%`} color={(board.sackRisk || 0) >= 60 ? C.crimson : C.amber} />
          <Stat label="xG ล่าสุด" value={roadmap.lastMatchXg
            ? `${roadmap.lastMatchXg.xgUs}-${roadmap.lastMatchXg.xgThem}`
            : "—"} />
        </div>

        {(roadmap.xgHistory || []).slice(0, 4).map((x, i) => (
          <div key={i} style={{ fontSize: 10, color: C.textDim }}>ว.{x.day} vs {x.opponent}: xG {x.xgUs}-{x.xgThem}</div>
        ))}

        {(roadmap.rivals || []).length > 0 && (
          <p style={{ fontSize: 10, color: C.textDim, margin: "8px 0 4px" }}>
            ⚔️ {roadmap.rivals.map((r) => r.short || r.name).join(" · ")}
          </p>
        )}

        {roadmap.worldCupEvent?.phase && roadmap.worldCupEvent.phase !== "idle" && (
          <p style={{ fontSize: 10, color: C.amber, margin: "4px 0" }}>
            🏆 World Cup — {roadmap.worldCupEvent.phase === "registration" ? "เปิดรับสมัคร" : roadmap.worldCupEvent.phase}
          </p>
        )}

        <p style={{ fontSize: 10, color: C.textDim, margin: "8px 0 4px" }}>🔭 โซนสเกาต์</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {SCOUT_ZONES.map((z) => {
            const on = (roadmap.scoutNetwork?.assignments || []).some((a) => a.zoneId === z.id && a.active);
            return (
              <button key={z.id} type="button" disabled={busy}
                onClick={() => onAction("scout_zone", { zoneId: z.id })} style={btn(on)}>
                {z.label}{on ? " ✓" : ""}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          {["GK", "DF", "MF", "FW"].map((pos) => (
            <button key={pos} type="button" disabled={busy}
              onClick={() => onAction("shadow_target", { position: pos })} style={btn(false)}>
              + เป้า {pos}
            </button>
          ))}
        </div>

        {(roadmap.shadowSquad?.targets || []).length > 0 && (
          <p style={{ fontSize: 10, color: C.textDim }}>
            แผนเงา: {roadmap.shadowSquad.targets.map((t) => `${t.position}≥${t.minRating}`).join(" · ")}
          </p>
        )}

        <p style={{ fontSize: 10, color: C.textDim, margin: "8px 0 4px" }}>มอบหมายสตาฟ</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["press", "แถลงข่าว"], ["market", "ตลาด"], ["training", "ฝึก"]].map(([key, label]) => (
            <button key={key} type="button" disabled={busy}
              onClick={() => onAction("delegation", { key })} style={btn(roadmap.delegation?.[key] === "auto")}>
              {label}: {roadmap.delegation?.[key] === "auto" ? "ออโต้" : "เอง"}
            </button>
          ))}
        </div>

        {(roadmap.log || []).slice(0, 3).map((line, i) => (
          <div key={i} style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>{line}</div>
        ))}
      </section>
    </>
  );
}

function Stat({ label, value, color = C.chalk }) {
  return (
    <div style={{ background: C.panel2, borderRadius: 6, padding: 8, border: `1px solid ${C.steel}` }}>
      <div style={{ fontSize: 9, color: C.textDim }}>{label}</div>
      <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function panelStyle(accent) {
  return {
    background: "#132a20", border: `1px solid ${C.steel}`, borderLeft: `3px solid ${accent}`,
    borderRadius: 10, padding: 12, marginBottom: 12,
  };
}

const titleStyle = { margin: "0 0 8px", fontSize: 13, color: C.chalk };
