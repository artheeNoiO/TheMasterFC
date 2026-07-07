import React from "react";

export const LOGO_ICONS = [
  { id: "star", path: "M12 2l2.9 6.9L22 9.3l-5.5 4.8L18 22l-6-3.8L6 22l1.5-7.9L2 9.3l7.1-.4z" },
  { id: "shield", path: "M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z" },
  { id: "bolt", path: "M13 2L3 14h7l-1 8 11-13h-7z" },
  { id: "crown", path: "M3 8l4 3 5-6 5 6 4-3-2 11H5z" },
  { id: "ball", circle: true },
  { id: "wing", path: "M2 12c4-6 9-8 10-8s6 2 10 8c-4 3-9 4-10 4s-6-1-10-4z" },
  { id: "mountain", path: "M3 20l6-10 4 6 3-5 5 9z" },
  { id: "flame", path: "M12 2c1 4-3 5-3 9a3 3 0 006 0c0-2-1-3-1-5 2 1 4 4 4 7a6 6 0 01-12 0c0-5 4-7 6-11z" },
  { id: "diamond", path: "M12 2l6 8-6 12-6-12z" },
  { id: "ring", ring: true },
  { id: "cross", path: "M10 2h4v6h6v4h-6v6h-4v-6H2v-4h6z" },
  { id: "hexagon", path: "M12 2l8.66 5v10L12 22l-8.66-5V7z" },
  { id: "pentagon", path: "M12 2l9.5 6.9-3.6 11.1H6.1L2.5 8.9z" },
  { id: "arrowUp", path: "M12 2l7 7h-4v11h-6V9H5z" },
  { id: "chevronDouble", path: "M12 3l9 7.5-2.2 2-6.8-5.7-6.8 5.7-2.2-2z M12 12l9 7.5-2.2 2-6.8-5.7-6.8 5.7-2.2-2z" },
  { id: "triangleUp", path: "M12 3l9 17H3z" },
  { id: "wave", path: "M2 9c2-3 4-3 6 0s4 3 6 0 4-3 6 0v4c-2 3-4 3-6 0s-4-3-6 0-4 3-6 0z" },
  { id: "leaf", path: "M4 20C4 10 12 4 20 4c0 8-6 16-16 16z" },
  { id: "trophyCup", path: "M7 3h10l-1 6a4 4 0 01-8 0z M9 15h6v2H9z M8 19h8v2H8z" },
  { id: "compassStar", path: "M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" },
];

/** รูปทรงกรอบตราสโมสร — เพิ่มความหลากหลายนอกเหนือจากไอคอนด้านใน */
const BADGE_SHAPES = ["square", "circle", "shield", "hex"];
const BADGE_CLIP = {
  shield: "polygon(50% 0%, 100% 20%, 100% 55%, 50% 100%, 0% 55%, 0% 20%)",
  hex: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
};

/** ลายพื้นตรา — ผ่าครึ่ง/แบ่งสี่ ให้ความรู้สึกเหมือนตราสโมสรจริงแทนพื้นไล่สีเรียบๆ (โทนเดียวกันเสมอ กันสีตีกัน) */
const BADGE_PATTERNS = ["solid", "halfV", "halfD", "quarters"];
function badgeBackground(pattern, primary) {
  const dark = shadeColor(primary, -42);
  const light = shadeColor(primary, 16);
  if (pattern === "halfV") return `linear-gradient(90deg, ${light} 50%, ${dark} 50%)`;
  if (pattern === "halfD") return `linear-gradient(135deg, ${light} 50%, ${dark} 50%)`;
  if (pattern === "quarters") return `conic-gradient(${light} 0deg 90deg, ${dark} 90deg 180deg, ${light} 180deg 270deg, ${dark} 270deg 360deg)`;
  return `linear-gradient(155deg, ${light}, ${dark})`;
}

export function shadeColor(hex, percent) {
  try {
    const f = parseInt(hex.slice(1), 16), t = percent < 0 ? 0 : 255, p = Math.abs(percent) / 100;
    const R = f >> 16, G = (f >> 8) & 0x00ff, B = f & 0x0000ff;
    const nr = Math.round((t - R) * p) + R, ng = Math.round((t - G) * p) + G, nb = Math.round((t - B) * p) + B;
    return "#" + (0x1000000 + nr * 0x10000 + ng * 0x100 + nb).toString(16).slice(1);
  } catch (e) { return hex; }
}

function seedHash(str) {
  return [...String(str)].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
}

/** แปลงข้อมูลทีมจากเซฟ/ออนไลน์ให้ตรงกับ ClubBadge ทุกที่ */
export function teamForBadge(team) {
  if (!team) return { color: "#2d4a3a", secondaryColor: "#e8ece9", logoIndex: 0, shape: "square" };
  const color = team.color || team.primaryColor || "#2d4a3a";
  const seed = team.legendTeamKey || team.id || team.short || "team";
  let logoIndex = team.logoIndex;
  if (logoIndex == null || logoIndex === "") {
    logoIndex = seedHash(seed) % LOGO_ICONS.length;
  }
  let shape = team.badgeShape;
  if (!shape) {
    shape = BADGE_SHAPES[Math.abs(seedHash(seed + "_shape")) % BADGE_SHAPES.length];
  }
  let pattern = team.badgePattern;
  if (!pattern) {
    pattern = BADGE_PATTERNS[Math.abs(seedHash(seed + "_pattern")) % BADGE_PATTERNS.length];
  }
  return {
    color,
    secondaryColor: team.secondaryColor || "#e8ece9",
    logoIndex: ((Number(logoIndex) % LOGO_ICONS.length) + LOGO_ICONS.length) % LOGO_ICONS.length,
    shape,
    pattern,
  };
}

/** ตราโลโก้ทีม — ลายพื้นผ่าครึ่ง/สี่ + จานตรากลาง + เงามันแบบเข็มกลัดอีนาเมล + ไอคอน + รูปทรงกรอบหลากหลาย */
export function ClubBadge({ team, size = 40, fill = false, secondaryFallback = "#e8ece9", iconScale = 0.52 }) {
  const crest = teamForBadge(team);
  const logo = LOGO_ICONS[crest.logoIndex];
  const primary = crest.color;
  const secondary = crest.secondaryColor || secondaryFallback;
  const px = typeof size === "number" ? size : 40;
  // เมื่อฝังอยู่ในกรอบอื่น (เช่น HexTeamBadge) ใช้สี่เหลี่ยมมนเสมอ กันรูปทรงซ้อนกันดูรก
  const shape = fill ? "square" : crest.shape;
  const clipPath = BADGE_CLIP[shape];
  const borderRadius = shape === "circle" ? "50%" : shape === "square" ? (fill ? "28%" : px * 0.28) : 0;

  return (
    <div style={{
      width: fill ? "100%" : px,
      height: fill ? "100%" : px,
      aspectRatio: "1",
      borderRadius,
      clipPath,
      flexShrink: 0,
      position: "relative",
      overflow: "hidden",
      background: badgeBackground(crest.pattern, primary),
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: clipPath
        ? "0 3px 8px rgba(0,0,0,.4)"
        : "0 3px 8px rgba(0,0,0,.4), inset 0 1.5px 0 rgba(255,255,255,.35), inset 0 -2px 3px rgba(0,0,0,.28)",
      border: clipPath ? `1px solid rgba(0,0,0,.35)` : `2px solid ${secondary}66`,
    }}>
      {/* เงามันมุมบน — ให้ความรู้สึกเข็มกลัดอีนาเมลแทนพื้นสีแบน */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(120% 90% at 28% 18%, rgba(255,255,255,.32), rgba(255,255,255,0) 55%)",
      }} />
      {/* จานตรากลาง — วงกลมคอนทราสต์รองไอคอน ให้มีมิติแบบตราจริงแทนไอคอนลอยเดี่ยวๆ */}
      <div style={{
        position: "relative",
        width: fill ? "72%" : px * 0.72, height: fill ? "72%" : px * 0.72,
        borderRadius: "50%",
        background: `radial-gradient(circle at 35% 30%, ${shadeColor(primary, 30)}22, rgba(0,0,0,.22) 78%)`,
        border: `1px solid rgba(255,255,255,.22)`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg viewBox="0 0 24 24" width={fill ? `${iconScale * 100}%` : px * iconScale} height={fill ? `${iconScale * 100}%` : px * iconScale} style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,.35))" }}>
          {logo.circle ? <circle cx="12" cy="12" r="9" fill={secondary} /> :
            logo.ring ? <circle cx="12" cy="12" r="7.5" fill="none" stroke={secondary} strokeWidth="3" /> :
            <path d={logo.path} fill={secondary} />}
        </svg>
      </div>
    </div>
  );
}

/** ตราโลโก้ทีมในกรอบหกเหลี่ยม — ใช้บนสกอร์บอร์ด live */
export function HexTeamBadge({ team, hexFill = "#15261e", hexStroke = "#2d4a3a", size = "scoreboard" }) {
  const crest = teamForBadge(team);
  const hexWidth = size === "scoreboard"
    ? "clamp(44px, 8.4vw, 66px)"
    : "clamp(28px, 5.5vw, 48px)";
  const innerPad = size === "scoreboard" ? "8% 10% 10%" : "20% 22% 22%";
  return (
    <div style={{
      flex: "0 0 auto",
      width: hexWidth,
      position: "relative",
      aspectRatio: "44 / 48",
      filter: "drop-shadow(0 4px 8px rgba(0,0,0,.45))",
    }}>
      <svg viewBox="0 0 44 48" width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
        <polygon
          points="22,2 40,12 40,32 22,42 4,32 4,12"
          fill={hexFill} stroke={hexStroke} strokeWidth="1.5"
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: innerPad,
      }}>
        <ClubBadge team={crest} fill iconScale={size === "scoreboard" ? 0.62 : 0.52} />
      </div>
    </div>
  );
}
