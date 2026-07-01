import React, { useState, useEffect, useCallback, useRef } from "react";

/* ============================== DESIGN TOKENS ============================== */
const C = {
  pitchDark: "#0b2318", pitch: "#153d29", pitchLine: "#e8f0e6", chalk: "#f2f0e6",
  panel: "#132a20", panel2: "#0f2119", amber: "#e0a458", amberDim: "#a97a3e",
  crimson: "#c1440e", good: "#6fae5a", steel: "#26433a", steelLight: "#345245",
  textDim: "#a9bdb1", gold: "#f4c95d", blue: "#5a9bd5", purple: "#9d6fe0",
};
const DISPLAY_FONT = "'Arial Black', Impact, 'Segoe UI', sans-serif";
const MONO_FONT = "'Courier New', ui-monospace, monospace";

/* ============================== DATA POOLS ============================== */
const FIRST_NAMES = ["กันต์","ชัย","ธนา","วิชัย","สมชาย","อนันต์","ปิติ","ณัฐ","กิตติ","สุรศักดิ์","เอกชัย","ภูมิ","ธีระ","วรุตม์","ชนะ","อดิศักดิ์","ปกรณ์","ศักดิ์ดา","พีระ","จักรพันธ์","ไกรวิทย์","ณรงค์","บุญรอด","ปัณณวิชญ์","วีรภัทร","สิทธิชัย","อภิสิทธิ์","เจษฎา","ทวีศักดิ์","ยศพล"];
const LAST_NAMES = ["แสงทอง","ศรีสุข","บุญมี","วงศ์ษา","ทองดี","พงษ์พันธุ์","รุ่งเรือง","ชัยมงคล","สายชล","เพชรรัตน์","อินทร์แก้ว","ธนากร","จันทร์เพ็ญ","ไพศาล","ศรีวิไล","มั่นคง","เรืองศรี","สุขสวัสดิ์","วัฒนกุล","ทิพย์วงศ์","ก้องเกียรติ","ประเสริฐ","แก้วมณี","ผลบุญ","หาญกล้า"];
const COACH_FIRST = ["โค้ชสมบัติ","โค้ชวิชาญ","โค้ชประยุทธ","โค้ชมานพ","โค้ชสุเทพ","โค้ชอรรถ","โค้ชธวัช","โค้ชนิพนธ์","โค้ชบรรจง","โค้ชสุรชัย"];
const MANAGER_FIRST = ["ผจก.สมเกียรติ","ผจก.วีระ","ผจก.ประพันธ์","ผจก.ชูศักดิ์","ผจก.บัณฑิต","ผจก.อำนวย","ผจก.เฉลิม","ผจก.ไพบูลย์","ผจก.สุริยะ","ผจก.กมล"];

/* 16 AI-controlled clubs forming Master League (top flight) — entirely bot-controlled at career start */
const MASTER_TEAM_DEFS = [
  { name: "สยามพระนคร ยูไนเต็ด", short: "SPU", color: "#c1440e", tier: 8 },
  { name: "ชลบุรี เบย์ ยูไนเต็ด", short: "CBU", color: "#ff6b35", tier: 7 },
  { name: "ขอนแก่น ธันเดอร์", short: "KKT", color: "#8d5524", tier: 6 },
  { name: "เชียงใหม่ ลานนา เอฟซี", short: "CLF", color: "#2a6f97", tier: 5 },
  { name: "หาดใหญ่ ซิตี้ เอฟซี", short: "HDC", color: "#3a5a40", tier: 5 },
  { name: "อยุธยา วอร์ริเออร์ส", short: "AYW", color: "#e0a458", tier: 4 },
  { name: "อุดรธานี รอยัล", short: "UDR", color: "#6a0dad", tier: 4 },
  { name: "ภูเก็ต อันดามัน ดราก้อนส์", short: "PAD", color: "#0d6e6e", tier: 3 },
  { name: "สุโขทัย โกลเด้น เอจ", short: "SKT", color: "#b08968", tier: 3 },
  { name: "อีสาน ไฟท์เตอร์ส", short: "ISF", color: "#7b2d26", tier: 2 },
  { name: "พิษณุโลก นอร์ธสตาร์", short: "PLN", color: "#457b9d", tier: 2 },
  { name: "ระยอง โคสท์ ยูไนเต็ด", short: "RCU", color: "#264653", tier: 1 },
  { name: "นครราชสีมา สโตนวอลล์", short: "NRS", color: "#495057", tier: 1 },
  { name: "สงขลา ใต้ลม เอฟซี", short: "SLF", color: "#5a189a", tier: 0 },
  { name: "ตราด อีสเทิร์น เกทส์", short: "TEG", color: "#2b9348", tier: 0 },
  { name: "นครสวรรค์ ริเวอร์ ซิตี้", short: "NRC", color: "#40361b", tier: 0 },
];
/* 15 AI-controlled clubs forming Challenger League (second tier) — the player's custom club fills the 16th slot */
const CHALLENGER_TEAM_DEFS = [
  { name: "ลำปาง ไอรอนเกท", short: "LPI", color: "#7a5c3e", tier: -3 },
  { name: "แพร่ ซิลค์ ซิตี้", short: "PSC", color: "#9d6fe0", tier: -4 },
  { name: "กาญจนบุรี ริเวอร์แลนด์ส", short: "KRL", color: "#2f6690", tier: -4 },
  { name: "สุพรรณบุรี บูล", short: "SPB", color: "#1b4965", tier: -5 },
  { name: "ตาก บอร์เดอร์ แรงเจอร์ส", short: "TBR", color: "#6b705c", tier: -5 },
  { name: "กระบี่ อันดามัน โคฟ", short: "KAC", color: "#0a9396", tier: -6 },
  { name: "เพชรบุรี ซอลท์ ซิตี้", short: "PSS", color: "#ee9b00", tier: -6 },
  { name: "บุรีรัมย์ เอิร์ธ เอฟซี", short: "BRE", color: "#9b2226", tier: -7 },
  { name: "เลย ไฮแลนด์ เอฟซี", short: "LHF", color: "#606c38", tier: -7 },
  { name: "ชุมพร เกทเวย์", short: "CPG", color: "#283618", tier: -8 },
  { name: "สตูล เซาท์เทิร์น สตาร์", short: "SSS", color: "#5f0f40", tier: -8 },
  { name: "มุกดาหาร เมคอง ยูไนเต็ด", short: "MMU", color: "#0f4c5c", tier: -9 },
  { name: "ปราจีนบุรี พาวเวอร์", short: "PJP", color: "#e36414", tier: -9 },
  { name: "สิงห์บุรี สโตนคัตเตอร์ส", short: "SBS", color: "#3a5a40", tier: -10 },
  { name: "อุตรดิตถ์ ธันเดอร์โบลท์", short: "UTB", color: "#4a4e69", tier: -10 },
];

/* 10 selectable crest icons + color-shade helper, used by ClubBadge for every team in the league */
const LOGO_ICONS = [
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
];
function shadeColor(hex, percent) {
  try {
    const f = parseInt(hex.slice(1), 16), t = percent < 0 ? 0 : 255, p = Math.abs(percent) / 100;
    const R = f >> 16, G = (f >> 8) & 0x00ff, B = f & 0x0000ff;
    const nr = Math.round((t - R) * p) + R, ng = Math.round((t - G) * p) + G, nb = Math.round((t - B) * p) + B;
    return "#" + (0x1000000 + nr * 0x10000 + ng * 0x100 + nb).toString(16).slice(1);
  } catch (e) { return hex; }
}

const FORMATIONS = {
  "4-4-2": { label: "4-4-2", counts: { GK: 1, DF: 4, MF: 4, FW: 2 },
    slots: [
      { pos: "GK", x: 50, y: 92 },
      { pos: "DF", x: 15, y: 72 }, { pos: "DF", x: 38, y: 76 }, { pos: "DF", x: 62, y: 76 }, { pos: "DF", x: 85, y: 72 },
      { pos: "MF", x: 15, y: 48 }, { pos: "MF", x: 38, y: 52 }, { pos: "MF", x: 62, y: 52 }, { pos: "MF", x: 85, y: 48 },
      { pos: "FW", x: 37, y: 22 }, { pos: "FW", x: 63, y: 22 },
    ] },
  "4-3-3": { label: "4-3-3", counts: { GK: 1, DF: 4, MF: 3, FW: 3 },
    slots: [
      { pos: "GK", x: 50, y: 92 },
      { pos: "DF", x: 15, y: 72 }, { pos: "DF", x: 38, y: 76 }, { pos: "DF", x: 62, y: 76 }, { pos: "DF", x: 85, y: 72 },
      { pos: "MF", x: 25, y: 50 }, { pos: "MF", x: 50, y: 54 }, { pos: "MF", x: 75, y: 50 },
      { pos: "FW", x: 18, y: 22 }, { pos: "FW", x: 50, y: 18 }, { pos: "FW", x: 82, y: 22 },
    ] },
  "3-5-2": { label: "3-5-2", counts: { GK: 1, DF: 3, MF: 5, FW: 2 },
    slots: [
      { pos: "GK", x: 50, y: 92 },
      { pos: "DF", x: 25, y: 74 }, { pos: "DF", x: 50, y: 78 }, { pos: "DF", x: 75, y: 74 },
      { pos: "MF", x: 10, y: 50 }, { pos: "MF", x: 32, y: 54 }, { pos: "MF", x: 50, y: 46 }, { pos: "MF", x: 68, y: 54 }, { pos: "MF", x: 90, y: 50 },
      { pos: "FW", x: 37, y: 22 }, { pos: "FW", x: 63, y: 22 },
    ] },
  "5-3-2": { label: "5-3-2", counts: { GK: 1, DF: 5, MF: 3, FW: 2 },
    slots: [
      { pos: "GK", x: 50, y: 92 },
      { pos: "DF", x: 8, y: 68 }, { pos: "DF", x: 29, y: 76 }, { pos: "DF", x: 50, y: 78 }, { pos: "DF", x: 71, y: 76 }, { pos: "DF", x: 92, y: 68 },
      { pos: "MF", x: 25, y: 48 }, { pos: "MF", x: 50, y: 52 }, { pos: "MF", x: 75, y: 48 },
      { pos: "FW", x: 37, y: 22 }, { pos: "FW", x: 63, y: 22 },
    ] },
};
const FORMATION_KEYS = Object.keys(FORMATIONS);
/* rock-paper-scissors style matchup cycle: winner beats loser by a small margin */
const MATCHUP_CYCLE = ["4-3-3", "4-4-2", "5-3-2", "3-5-2"]; // each beats the next
function matchupMultiplier(mine, theirs) {
  if (mine === theirs) return 1.0;
  const i = MATCHUP_CYCLE.indexOf(mine), j = MATCHUP_CYCLE.indexOf(theirs);
  if (i === -1 || j === -1) return 1.0;
  if ((i + 1) % 4 === j) return 1.06; // mine beats theirs
  if ((j + 1) % 4 === i) return 0.94; // theirs beats mine
  return 1.0;
}

const SQUAD_TEMPLATE = ["GK","GK","DF","DF","DF","DF","DF","DF","MF","MF","MF","MF","MF","MF","FW","FW","FW","FW"];
const POS_TH = { GK: "ผู้รักษาประตู", DF: "กองหลัง", MF: "กองกลาง", FW: "กองหน้า" };
const ROLE_TH = { balanced: "สมดุล", attacking: "บุก", defensive: "รับ" };
const ROLE_COLOR = { balanced: C.textDim, attacking: "#c1440e", defensive: "#5a9bd5" };
const POS_COLOR = { GK: "#e0a458", DF: "#5a9bd5", MF: "#6fae5a", FW: "#c1440e" };
const STAFF_TH = { GK: "โค้ช GK", DF: "โค้ชกองหลัง", MF: "โค้ชกองกลาง", FW: "โค้ชกองหน้า", FITNESS: "โค้ชฟิตเนส", PHYSIO: "หมอ/นักกายภาพ" };

/* club facilities: 4 upgradeable centers, level 1-5 each */
const FACILITY_TYPES = ["fitness", "training", "techLab", "medical"];
const FACILITY_TH = { fitness: "ห้องฟิตเนส", training: "สนามฝึก", techLab: "เทคโนโลยีฝึกซ้อม", medical: "ห้องพยาบาล" };
const FACILITY_DESC = {
  fitness: "ฟื้นสตามินานักเตะไวขึ้นต่อวันพัก + ลดความเสี่ยงบาดเจ็บจากความล้าสะสม",
  training: "เพิ่มประสิทธิภาพการฝึกจากโค้ชทุกตำแหน่ง",
  techLab: "เพิ่มคุณภาพดาวรุ่งที่แมวมองค้นพบ",
  medical: "ลดจำนวนวันพักฟื้นเมื่อบาดเจ็บ",
};
function facilityUpgradeCost(level) { return (level + 1) * 1200000; }
const STAFF_SPECS = ["GK", "DF", "MF", "FW", "FITNESS", "PHYSIO"];
const MANAGER_STAT_TH = { development: "ปั้นนักเตะ", tactics: "แทคติก", manManagement: "จิตวิทยา/ห้องแต่งตัว", negotiation: "เจรจาต่อรอง", scouting: "ขุดดาวรุ่ง", reputation: "บารมี" };
const STATUS_TH = { starter: "ตัวหลัก", rotation: "ตัวหมุนเวียน", reserve: "ตัวสำรอง" };
const STATUS_COLOR = { starter: "#6fae5a", rotation: "#e0a458", reserve: "#a9bdb1" };
const POTENTIAL_BAND = [[90, "S"], [80, "A"], [68, "B"], [55, "C"], [0, "D"]];
function bandOf(potential) { for (const [min, label] of POTENTIAL_BAND) if (potential >= min) return label; return "D"; }

/* FM-style attributes, 1-20 scale, grouped into 3 categories (15 total) */
const ATTR_GROUPS = {
  technical: ["finishing", "passing", "tackling", "dribbling", "crossing", "heading"],
  mental: ["vision", "decisions", "composure", "determination", "workRate"],
  physical: ["pace", "acceleration", "strength", "agility"],
};
const ATTR_TH = {
  finishing: "ยิงประตู", passing: "จ่ายบอล", tackling: "ปะทะ/สกัด", dribbling: "เลี้ยงบอล", crossing: "เปิดบอล", heading: "โหม่ง",
  vision: "วิสัยทัศน์", decisions: "การตัดสินใจ", composure: "ความนิ่ง", determination: "ความมุ่งมั่น", workRate: "ความขยัน",
  pace: "ความเร็ว", acceleration: "การออกตัว", strength: "พละกำลัง", agility: "ความคล่องตัว",
};
const GROUP_TH = { technical: "เทคนิค", mental: "จิตใจ", physical: "ร่างกาย" };
const GROUP_COLOR = { technical: "#5a9bd5", mental: "#9d6fe0", physical: "#e0a458" };
const ALL_ATTRS = [...ATTR_GROUPS.technical, ...ATTR_GROUPS.mental, ...ATTR_GROUPS.physical];
const ATK_ATTRS = ["finishing", "dribbling", "crossing", "pace", "composure"];
const DEF_ATTRS = ["tackling", "heading", "strength", "decisions", "determination"];

/* ============================== HELPERS ============================== */
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const uid = (p = "p") => p + "_" + Math.random().toString(36).slice(2, 10);
const genName = () => choice(FIRST_NAMES) + " " + choice(LAST_NAMES);

function computeRating(position, attack, defense) {
  const raw =
    position === "GK" ? defense * 0.85 + attack * 0.15 :
    position === "DF" ? defense * 0.65 + attack * 0.35 :
    position === "MF" ? defense * 0.5 + attack * 0.5 :
    defense * 0.2 + attack * 0.8;
  return Math.round(clamp(raw, 20, 99));
}

/* derive the engine's attack/defense/rating numbers from the 15 real attributes */
function recomputeDerived(p) {
  const avg = (keys) => keys.reduce((s, k) => s + p.attrs[k], 0) / keys.length;
  p.attack = clamp(Math.round(avg(ATK_ATTRS) * 5), 5, 99);
  p.defense = clamp(Math.round(avg(DEF_ATTRS) * 5), 5, 99);
  p.rating = computeRating(p.position, p.attack, p.defense);
}
/* nudge every attribute by `amount` (can be negative), clamp 1-20, then refresh attack/defense/rating */
function bumpAttrs(p, amount) {
  ALL_ATTRS.forEach((k) => { p.attrs[k] = clamp(p.attrs[k] + amount, 1, 20); });
  recomputeDerived(p);
}

function genPlayer(position, tier, teamId, forcedAge, startDay) {
  const age = forcedAge != null ? forcedAge : rand(17, 33);
  const peak = age <= 27 ? 1 : clamp(1 - (age - 27) * 0.025, 0.55, 1);
  const base = 10 + tier * 0.35; // baseline on the 1-20 scale
  const attrs = {};
  ALL_ATTRS.forEach((k) => {
    let biasHigh;
    if (position === "GK") biasHigh = DEF_ATTRS.includes(k) || k === "composure" || k === "decisions";
    else if (position === "DF") biasHigh = DEF_ATTRS.includes(k) || ATTR_GROUPS.physical.includes(k);
    else if (position === "MF") biasHigh = ATTR_GROUPS.mental.includes(k) || k === "passing";
    else biasHigh = ATK_ATTRS.includes(k) || ATTR_GROUPS.physical.includes(k);
    const spread = biasHigh ? rand(1, 5) : rand(-4, 2);
    attrs[k] = clamp(Math.round((base + spread) * peak), 1, 20);
  });
  const p = { id: uid("pl"), name: genName(), position, age, attrs, morale: rand(62, 92), teamId, stamina: 100, injuryDays: 0, appearHistory: [], careerGoals: 0, careerApps: 0, role: "balanced" };
  recomputeDerived(p);
  const ageMult = age <= 23 ? 1.35 : age <= 28 ? 1.05 : age <= 31 ? 0.65 : 0.35;
  p.value = Math.round((p.rating * p.rating * 380 * ageMult) / 1000) * 1000;
  p.wage = Math.round((p.rating * p.rating * 9) / 100) * 100;
  p.potential = age <= 21 ? clamp(p.rating + rand(6, 34), p.rating, 99) : age <= 25 ? clamp(p.rating + rand(0, 10), p.rating, 99) : p.rating;
  p.contractEndsDay = (startDay || 1) + rand(150, 400);
  return p;
}
const genSquad = (teamId, tier) => SQUAD_TEMPLATE.map((pos) => genPlayer(pos, tier, teamId));

function genCoach(fixedSpecialty) {
  const specialty = fixedSpecialty || choice(STAFF_SPECS);
  const grade = rand(1, 5);
  const boost = Math.round((0.15 + grade * 0.12) * 100) / 100;
  return {
    id: uid("co"), name: choice(COACH_FIRST) + " " + choice(LAST_NAMES), specialty, grade, boost,
    signingCost: Math.round((grade * 150000 + rand(0, 50000)) / 1000) * 1000,
    weeklyWage: Math.round((grade * 8000 + rand(0, 3000)) / 500) * 500,
  };
}

function genManager(scaleDown) {
  const lo = scaleDown ? 20 : 30, hi = scaleDown ? 50 : 60;
  const stats = { development: rand(lo, hi), tactics: rand(lo, hi), manManagement: rand(lo, hi), negotiation: rand(lo, hi), scouting: rand(lo, hi), reputation: rand(lo, hi) };
  const keys = Object.keys(stats);
  const strong = [...keys].sort(() => Math.random() - 0.5).slice(0, 2);
  strong.forEach((k) => { stats[k] = rand(scaleDown ? 60 : 75, scaleDown ? 85 : 97); });
  const avgStat = Object.values(stats).reduce((a, b) => a + b, 0) / 6;
  const scale = scaleDown ? 0.35 : 1;
  return {
    id: uid("mg"), name: choice(MANAGER_FIRST) + " " + choice(LAST_NAMES), stats,
    preferredFormation: choice(FORMATION_KEYS),
    signingCost: Math.round((avgStat * 4000 * scale + rand(0, 80000 * scale)) / 1000) * 1000,
    weeklyWage: Math.round((avgStat * 350 * scale + rand(0, 3000 * scale)) / 500) * 500,
    wins: 0, draws: 0, losses: 0, xp: 0, level: 1, skillPoints: 0,
  };
}
function genScout() {
  const grade = rand(1, 5);
  return {
    id: uid("sc"), name: choice(COACH_FIRST) + " " + choice(LAST_NAMES), grade,
    specialtyPos: choice(["GK", "DF", "MF", "FW"]),
    findChance: 0.25 + grade * 0.1, // chance per day to surface a new prospect
    qualityBoost: grade * 3, // nudges prospect tier upward
    signingCost: Math.round((grade * 120000 + rand(0, 40000)) / 1000) * 1000,
    weeklyWage: Math.round((grade * 6000 + rand(0, 2000)) / 500) * 500,
  };
}
function genYouthProspect(scoutQuality, scout, techLabLevel) {
  let pos;
  if (scout && Math.random() < 0.5) pos = scout.specialtyPos; // scouts find their specialty more often
  else pos = choice(["GK", "DF", "MF", "FW"]);
  const specialtyBonus = scout && pos === scout.specialtyPos ? 3 : 0;
  const techBonus = techLabLevel ? (techLabLevel - 1) * 1.5 : 0;
  const p = genPlayer(pos, rand(-2, 4) + scoutQuality + specialtyBonus + techBonus, "prospect", rand(15, 17));
  p.prospectId = uid("yp");
  p.signingCost = Math.round((p.value * 0.35) / 1000) * 1000 || 50000;
  return p;
}

/* 10-slot training calendar. Each real hour (9:00-20:00) advances one game day / one training slot. */
const TRAINING_TYPES = ["REST", "BALANCED", "FITNESS", "SHOOTING", "DEFENDING", "TACKLING"];
const TRAINING_TH = { REST: "พักฟื้น", BALANCED: "ฝึกทั่วไป", FITNESS: "ฟิตเนส", SHOOTING: "ซ้อมยิงประตู", DEFENDING: "ซ้อมเกมรับ", TACKLING: "ซ้อมสกัด/ปะทะ" };
const TRAINING_COLOR = { REST: C.blue, BALANCED: C.textDim, FITNESS: C.amber, SHOOTING: "#c1440e", DEFENDING: "#5a9bd5", TACKLING: "#9d6fe0" };
function applyTrainingToPlayer(p, type) {
  if (type === "REST") { p.stamina = clamp(p.stamina + 10, 0, 100); p.morale = clamp(p.morale + 1, 10, 99); return; }
  if (type === "FITNESS") { bumpAttrsSubset(p, ["pace", "acceleration", "strength", "agility"], 0.35); p.stamina = clamp(p.stamina - 4, 0, 100); return; }
  if (type === "SHOOTING") { bumpAttrsSubset(p, ["finishing", "dribbling", "composure"], 0.35); p.stamina = clamp(p.stamina - 8, 0, 100); return; }
  if (type === "DEFENDING") { bumpAttrsSubset(p, ["decisions", "heading", "vision"], 0.35); p.stamina = clamp(p.stamina - 8, 0, 100); return; }
  if (type === "TACKLING") { bumpAttrsSubset(p, ["tackling", "strength", "determination"], 0.35); p.stamina = clamp(p.stamina - 8, 0, 100); return; }
  bumpAttrs(p, 0.08); p.stamina = clamp(p.stamina - 6, 0, 100); // BALANCED
}
function bumpAttrsSubset(p, keys, amount) { keys.forEach((k) => { if (p.attrs[k] != null) p.attrs[k] = clamp(p.attrs[k] + amount, 1, 20); }); recomputeDerived(p); }

function formatMoney(n) {
  const sign = n < 0 ? "-" : "";
  n = Math.abs(n);
  if (n >= 1000000) return sign + (n / 1000000).toFixed(2) + "M฿";
  if (n >= 1000) return sign + (n / 1000).toFixed(0) + "K฿";
  return sign + n + "฿";
}

/* โลกจำลอง → ปลดล็อกออนไลน์เมื่อมูลค่าสโมสรรวมทุกอย่างถึงเกณฑ์และไม่ติดลบ */
const ONLINE_UNLOCK_TEAM_VALUE = 50_000_000;

function contractAssetValue(person, wageWeeks = 30) {
  if (!person) return 0;
  const base = person.signingCost || person.value || 0;
  return Math.round(base * 0.35 + (person.weeklyWage || 0) * wageWeeks);
}

function facilitiesAssetValue(facilities) {
  const fac = facilities || { fitness: 1, training: 1, techLab: 1, medical: 1 };
  return FACILITY_TYPES.reduce((sum, type) => {
    const level = fac[type] || 1;
    let invested = 0;
    for (let l = 1; l < level; l++) invested += facilityUpgradeCost(l);
    return sum + invested + level * 650000;
  }, 0);
}

function staffAssetValue(staffByTeam) {
  return Object.values(staffByTeam || {}).reduce((s, co) => s + contractAssetValue(co, 26), 0);
}

function computeTeamFinances(career) {
  const uTeam = career.teams.find((t) => t.id === career.userTeamId);
  const squad = career.players.filter((p) => p.teamId === career.userTeamId);
  const academy = career.academyPlayers || [];
  const prospects = career.youthProspects || [];

  const squadValue = squad.reduce((s, p) => s + (p.value || 0), 0);
  const academyValue = academy.reduce((s, p) => s + (p.value || 0), 0);
  const prospectValue = prospects.reduce((s, p) => s + (p.value || p.signingCost || 0), 0);
  const facilitiesValue = facilitiesAssetValue(career.facilities);
  const coachesValue = staffAssetValue(career.staff?.[career.userTeamId]);
  const managerValue = contractAssetValue(uTeam?.manager, 40);
  const scoutValue = contractAssetValue(career.scout, 30);
  const academyMgrValue = contractAssetValue(career.academyManager, 30);
  const budget = career.budget || 0;

  const teamValue = squadValue + academyValue + prospectValue + facilitiesValue
    + coachesValue + managerValue + scoutValue + academyMgrValue + budget;

  return {
    squadValue, academyValue, prospectValue, facilitiesValue,
    coachesValue, managerValue, scoutValue, academyMgrValue,
    budget, teamValue, netWorth: teamValue,
  };
}

function canUnlockOnline(fin) {
  return fin.teamValue >= ONLINE_UNLOCK_TEAM_VALUE && fin.teamValue >= 0;
}

function checkOnlineUnlock(c) {
  const fin = computeTeamFinances(c);
  if (!c.onlineUnlocked && canUnlockOnline(fin)) {
    c.onlineUnlocked = true;
    c.onlineUnlockedAt = Date.now();
    c.log = [
      `🌍 ปลดล็อกโหมดออนไลน์! มูลค่าสโมสรรวม ${formatMoney(fin.teamValue)} (นักเตะ+อคาเดมี+ศูนย์ฝึก+สตาฟ+งบ) — พร้อมเข้าโลกจริง`,
      ...c.log,
    ];
  }
  return c;
}

function migrateCareerSave(c) {
  if (c.playMode == null) c.playMode = c.onlineUnlocked ? "online" : "sandbox";
  if (c.onlineUnlocked == null) c.onlineUnlocked = false;
  return checkOnlineUnlock(c);
}
function poisson(lambda) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

/* round robin (circle method), 16 teams -> always even, no bye */
function roundRobin(teamIds) {
  const arr = teamIds.slice();
  if (arr.length % 2 !== 0) arr.push(null);
  const n = arr.length;
  const numRounds = n - 1;
  const half = n / 2;
  const rounds = [];
  let list = arr.slice();
  for (let r = 0; r < numRounds; r++) {
    const roundMatches = [];
    for (let i = 0; i < half; i++) {
      const home = list[i], away = list[n - 1 - i];
      if (home != null && away != null) roundMatches.push(r % 2 === 0 ? [home, away] : [away, home]);
    }
    rounds.push(roundMatches);
    const fixed = list[0];
    const rest = list.slice(1);
    rest.unshift(rest.pop());
    list = [fixed, ...rest];
  }
  return rounds;
}
function buildSeasonFixtures(teamIds) {
  const rounds = roundRobin(teamIds);
  return rounds.map((round, ri) => ({
    day: ri + 1,
    matches: round.map(([home, away]) => ({ id: uid("mt"), home, away, played: false, homeGoals: null, awayGoals: null })),
  }));
}

function getBestXI(squad, formationKey, { excludeInjured = true } = {}) {
  const counts = FORMATIONS[formationKey].counts;
  const byPos = { GK: [], DF: [], MF: [], FW: [] };
  squad.forEach((p) => { if (byPos[p.position] && (!excludeInjured || p.injuryDays <= 0)) byPos[p.position].push(p); });
  Object.keys(byPos).forEach((k) => byPos[k].sort((a, b) => (b.rating * (b.stamina / 100 * 0.3 + 0.7)) - (a.rating * (a.stamina / 100 * 0.3 + 0.7))));
  const xi = [];
  Object.keys(counts).forEach((pos) => { for (let i = 0; i < counts[pos]; i++) if (byPos[pos][i]) xi.push(byPos[pos][i].id); });
  return xi;
}

function recommendFormation(team, squad) {
  const avail = squad.filter((p) => p.injuryDays <= 0);
  const scored = FORMATION_KEYS.map((f) => {
    const bestXI = getBestXI(avail, f);
    const avg = bestXI.length
      ? bestXI.reduce((s, id) => s + (avail.find((p) => p.id === id)?.rating || 0), 0) / bestXI.length
      : 0;
    const fit = team.manager && team.manager.preferredFormation === f ? avg * 1.06 : avg;
    return { f, score: fit };
  }).sort((a, b) => b.score - a.score);
  return scored[0]?.f || team.formation || "4-4-2";
}

function fillLineupGaps(squad, xi, formation) {
  const avail = squad.filter((p) => p.injuryDays <= 0);
  const counts = FORMATIONS[formation].counts;
  const kept = xi.filter((id) => avail.some((p) => p.id === id));
  const posHave = { GK: 0, DF: 0, MF: 0, FW: 0 };
  kept.forEach((id) => {
    const p = avail.find((x) => x.id === id);
    if (p) posHave[p.position] += 1;
  });
  const pool = avail.filter((p) => !kept.includes(p.id));
  const result = [...kept];
  Object.keys(counts).forEach((pos) => {
    let need = counts[pos] - (posHave[pos] || 0);
    const picks = pool.filter((p) => p.position === pos).sort((a, b) => b.rating - a.rating);
    while (need > 0 && picks.length > 0) {
      const pick = picks.shift();
      result.push(pick.id);
      const idx = pool.findIndex((p) => p.id === pick.id);
      if (idx >= 0) pool.splice(idx, 1);
      need -= 1;
    }
  });
  if (result.length < 11) {
    getBestXI(avail, formation).forEach((id) => {
      if (!result.includes(id) && result.length < 11) result.push(id);
    });
  }
  return result.slice(0, 11);
}

function getManagerMatchAdvice(team, squad, xi, opponentTeam, oppSquad, isHome) {
  const avail = squad.filter((p) => p.injuryDays <= 0);
  const recommendedFormation = recommendFormation(team, avail);
  const tips = [];
  tips.push(`แผน ${recommendedFormation} เหมาะกับสควอดตอนนี้ที่สุด`);
  if (team.manager?.preferredFormation === recommendedFormation) {
    tips.push(`ตรงกับสไตล์ผจก. (${team.manager.preferredFormation})`);
  }
  const injured = squad.filter((p) => p.injuryDays > 0);
  if (injured.length) tips.push(`บาดเจ็บ: ${injured.slice(0, 3).map((p) => p.name).join(", ")}`);
  const inXi = xi.filter((id) => avail.some((p) => p.id === id));
  const tired = inXi.map((id) => avail.find((p) => p.id === id)).filter((p) => p && p.stamina < 50);
  if (tired.length) tips.push(`${tired[0].name} สตามินา ${Math.round(tired[0].stamina)}% — พิจารณาพัก`);
  if (opponentTeam && oppSquad?.length) {
    const oppAvail = oppSquad.filter((p) => p.injuryDays <= 0);
    const oppXI = getBestXI(oppAvail, opponentTeam.formation);
    const { attack: oa } = teamAttackDefense(oppAvail, oppXI);
    const { attack: ua } = teamAttackDefense(avail, inXi.length ? inXi : getBestXI(avail, team.formation));
    tips.push(oa > ua + 8
      ? "คู่แข่งบุกแรง — พิจารณาแผนรับหรือผู้เล่นสกัดดี"
      : oa > ua + 3
        ? "คู่แข่งมีเกมรุกดี — อย่าประมาท"
        : "สู้ได้สูสี — จัดทีมตามจุดแข็งของเรา");
  }
  tips.push(isHome ? "เล่นในบ้าน — ได้เปรียบเล็กน้อย" : "เล่นนอกบ้าน — ระวังเกมรับ");
  return { recommendedFormation, tips };
}

const ROLE_ATK_MULT = { balanced: 1, attacking: 1.15, defensive: 0.85 };
const ROLE_DEF_MULT = { balanced: 1, attacking: 0.85, defensive: 1.15 };
function teamAttackDefense(squad, xiIds) {
  const xi = squad.filter((p) => xiIds.includes(p.id));
  if (xi.length === 0) return { attack: 40, defense: 40, avgStamina: 100, avgMorale: 75 };
  const attackers = xi.filter((p) => p.position === "FW" || p.position === "MF");
  const defenders = xi.filter((p) => p.position === "DF" || p.position === "GK");
  const avg = (arr, key) => (arr.length ? arr.reduce((s, p) => s + p[key], 0) / arr.length : 45);
  const attack = attackers.length
    ? attackers.reduce((s, p) => s + p.attack * (ROLE_ATK_MULT[p.role] || 1), 0) / attackers.length
    : avg(xi, "attack");
  const defense = defenders.length
    ? defenders.reduce((s, p) => s + p.defense * (ROLE_DEF_MULT[p.role] || 1), 0) / defenders.length
    : avg(xi, "defense");
  const avgStamina = avg(xi, "stamina");
  const avgMorale = avg(xi, "morale");
  return { attack, defense, avgStamina, avgMorale };
}

/* full performance multiplier combining tactics / morale / stamina / chemistry / home */
function teamPerformanceMult({ formation, manager, avgStamina, avgMorale, chemistry, isHome, opponentFormation }) {
  const staminaMult = clamp(0.72 + 0.28 * (avgStamina / 100), 0.72, 1.0);
  const psych = manager ? manager.stats.manManagement : 45;
  const moraleMult = clamp(1 + ((avgMorale - 70) / 300) * (psych / 70), 0.85, 1.16);
  const tacticFitMult = manager ? (manager.preferredFormation === formation ? 1.08 : 0.96) : 1.0;
  const matchupMult = matchupMultiplier(formation, opponentFormation);
  const chemistryMult = clamp(0.94 + 0.11 * (chemistry / 100), 0.94, 1.05);
  const homeMult = isHome ? 1.1 : 0.93;
  return staminaMult * moraleMult * tacticFitMult * matchupMult * chemistryMult * homeMult;
}

function expectedGoalsFull(homeCtx, awayCtx) {
  const xgHome = clamp(1.3 * (homeCtx.effAttack / Math.max(30, awayCtx.effDefense)), 0.2, 4.3);
  const xgAway = clamp(1.3 * (awayCtx.effAttack / Math.max(30, homeCtx.effDefense)), 0.15, 4.0);
  return { xgHome, xgAway };
}

function buildMatchContext(team, squad, xiIds, opponentFormation, isHome, chemistry) {
  const { attack, defense, avgStamina, avgMorale } = teamAttackDefense(squad, xiIds);
  const mult = teamPerformanceMult({ formation: team.formation, manager: team.manager, avgStamina, avgMorale, chemistry, isHome, opponentFormation });
  return { effAttack: attack * mult, effDefense: defense * mult, mult, avgStamina, avgMorale };
}

function simulateInstant(homeTeam, homeSquad, homeXI, awayTeam, awaySquad, awayXI, homeChem, awayChem) {
  const hc = buildMatchContext(homeTeam, homeSquad, homeXI, awayTeam.formation, true, homeChem);
  const ac = buildMatchContext(awayTeam, awaySquad, awayXI, homeTeam.formation, false, awayChem);
  const { xgHome, xgAway } = expectedGoalsFull(hc, ac);
  return { homeGoals: poisson(xgHome), awayGoals: poisson(xgAway) };
}

/* market hours: 12:00-14:00 and 18:00-22:00 local device time */
function isMarketOpen(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  return (h >= 12 && h < 14) || (h >= 18 && h < 22);
}
function nextMarketOpenLabel(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h < 12) return "เปิด 12:00 น.";
  if (h < 18) return "เปิด 18:00 น.";
  return "เปิดพรุ่งนี้ 12:00 น.";
}
/* pick who scored, biased toward attacking positions, and log a milestone news line for the player's club (kept
   to the user's own club so the news feed stays about players you actually care about, not all 32 clubs) */
function pickScorer(squad, xiIds) {
  const xi = squad.filter((p) => xiIds.includes(p.id));
  if (!xi.length) return null;
  const weighted = [];
  xi.forEach((p) => {
    const w = p.position === "FW" ? 5 : p.position === "MF" ? 3 : p.position === "DF" ? 1 : 0.3;
    for (let i = 0; i < Math.round(w); i++) weighted.push(p);
  });
  return weighted.length ? choice(weighted) : xi[0];
}
const MILESTONE_GOALS = [10, 25, 50, 100, 150, 200];
const MILESTONE_APPS = [25, 50, 100, 150, 200, 300];
function checkMilestone(c, p, kind) {
  if (!p || p.teamId !== c.userTeamId) return;
  const val = kind === "goals" ? p.careerGoals : p.careerApps;
  const hit = (kind === "goals" ? MILESTONE_GOALS : MILESTONE_APPS).includes(val);
  if (hit) c.log = [`🎉 ไมล์สโตน! ${p.name} ${kind === "goals" ? `ยิงประตูครบ ${val} ลูก` : `ลงเล่นครบ ${val} นัด`}ให้สโมสรแล้ว!`, ...c.log];
}
function attributeGoals(c, squad, xiIds, count) {
  for (let i = 0; i < count; i++) {
    const scorer = pickScorer(squad, xiIds);
    if (!scorer) continue;
    scorer.careerGoals = (scorer.careerGoals || 0) + 1;
    checkMilestone(c, scorer, "goals");
  }
}

function genTransferListing(teams, excludeTeamId) {
  const pool = teams.filter((t) => t.id !== excludeTeamId);
  const t = choice(pool);
  const pos = choice(["GK", "DF", "MF", "FW"]);
  const p = genPlayer(pos, t.tier, "market");
  p.listingId = uid("lst");
  p.sourceTeamName = t.name;
  const startWage = Math.round((p.wage * (0.8 + Math.random() * 0.3)) / 100) * 100;
  const startFee = Math.round((p.value * (0.6 + Math.random() * 0.25)) / 1000) * 1000;
  p.topBid = { wage: startWage, fee: startFee, bidder: "ตลาด (ราคาเปิด)", isUser: false };
  p.bidHistory = [];
  p.endsAt = Date.now() + 120000;
  return p;
}

/* ============================== CAREER BOOTSTRAP ============================== */
const LEAGUE_NAMES = ["Master League", "Challenger League"];
function buildLeague(division, teams) {
  const teamIds = teams.filter((t) => t.division === division).map((t) => t.id);
  const table = {};
  teamIds.forEach((id) => { table[id] = { played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
  return { division, name: LEAGUE_NAMES[division], fixtures: buildSeasonFixtures(teamIds), table };
}
function standingsForDivision(c, division) {
  return c.teams.filter((t) => t.division === division)
    .map((t) => ({ team: t, ...c.leagues[division].table[t.id], gd: c.leagues[division].table[t.id].gf - c.leagues[division].table[t.id].ga }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}

/* ============================== CHAMP MASTER (knockout cup) ==============================
   16-team single-elimination cup held right after the Master League season ends: the top 8
   clubs of that Master League season, plus 8 simulated "champions from other servers" (since
   there's no real multiplayer backend to pull them from yet — see the earlier discussion).
   Simulated instantly using an overall-strength number rather than the full match engine,
   since the 8 visiting sides don't have real squads to run through it. */
const CHAMP_PRIZE_POOL = 20000000;
const FICTIONAL_CLUB_WORDS1 = ["เอลโดราโด", "นอร์เทิร์น", "แบล็คแพนเธอร์", "โกลเด้น", "ไอรอน", "ครอสโรดส์", "ซิลเวอร์", "เรดไทเกอร์", "บลูโอเชียน", "ธันเดอร์แคท", "ไวท์อีเกิ้ล", "อ็อบซิเดียน"];
const FICTIONAL_CLUB_WORDS2 = ["ยูไนเต็ด", "ซิตี้", "เอฟซี", "แอธเลติก", "โรวังโด"];
function genFictionalChampion() {
  return { id: uid("fc"), name: `${choice(FICTIONAL_CLUB_WORDS1)} ${choice(FICTIONAL_CLUB_WORDS2)}`, short: choice(["ELD", "NOR", "BLK", "GLD", "IRN", "CRX", "SLV", "RED", "BLU", "THN", "WHT", "OBS"]), strength: rand(64, 92), isFictional: true };
}
function teamStrength(c, teamId) {
  const squad = c.players.filter((p) => p.teamId === teamId);
  const team = c.teams.find((t) => t.id === teamId);
  const xi = getBestXI(squad, team.formation);
  const xiPlayers = squad.filter((p) => xi.includes(p.id));
  if (!xiPlayers.length) return 60;
  return xiPlayers.reduce((s, p) => s + p.rating, 0) / xiPlayers.length;
}
function simulateChampMatch(strA, strB) {
  const xgA = clamp(1.3 * (strA / strB), 0.3, 4.2), xgB = clamp(1.3 * (strB / strA), 0.3, 4.2);
  let gA = poisson(xgA), gB = poisson(xgB);
  let extraTime = false;
  if (gA === gB) { extraTime = true; if (Math.random() < strA / (strA + strB)) gA += 1; else gB += 1; }
  return { gA, gB, extraTime };
}
function runChampMaster(c, masterStandings) {
  const top8 = masterStandings.slice(0, 8).map((s) => ({
    id: s.team.id, name: s.team.name, short: s.team.short, isUser: s.team.id === c.userTeamId, isFictional: false, strength: teamStrength(c, s.team.id),
  }));
  const others = Array.from({ length: 8 }, () => genFictionalChampion());
  let field = [...top8, ...others].sort(() => Math.random() - 0.5);
  const rounds = [];
  const roundNames = { 16: "รอบ 16 ทีม", 8: "รอบ 8 ทีม", 4: "รอบรองชนะเลิศ", 2: "รอบชิงชนะเลิศ" };
  const payouts = { 16: (CHAMP_PRIZE_POOL * 0.16) / 8, 8: (CHAMP_PRIZE_POOL * 0.20) / 4, 4: (CHAMP_PRIZE_POOL * 0.20) / 2, runnerUp: CHAMP_PRIZE_POOL * 0.17, champion: CHAMP_PRIZE_POOL * 0.27 };
  let userNote = null;
  while (field.length > 1) {
    const size = field.length;
    const roundMatches = [];
    const winners = [];
    for (let i = 0; i < field.length; i += 2) {
      const A = field[i], B = field[i + 1];
      const { gA, gB, extraTime } = simulateChampMatch(A.strength, B.strength);
      const winner = gA >= gB ? A : B;
      const loser = gA >= gB ? B : A;
      winners.push(winner);
      roundMatches.push({ a: A.short, b: B.short, gA, gB, extraTime, winnerShort: winner.short });
      if (size === 2) { // this was the final
        c.log = [`🏆 Champ Master: ${winner.name} คว้าแชมป์! ชนะ ${loser.name} ${gA >= gB ? gA : gB}-${gA >= gB ? gB : gA}${extraTime ? " (ต่อเวลา/จุดโทษ)" : ""}`, ...c.log];
        if (winner.id === c.userTeamId) { c.budget += payouts.champion; userNote = `🏆 ทีมคุณคว้าแชมป์ Champ Master! รับเงินรางวัล ${formatMoney(payouts.champion)}`; }
        if (loser.id === c.userTeamId) { c.budget += payouts.runnerUp; userNote = `🥈 ทีมคุณเป็นรองแชมป์ Champ Master รับเงินรางวัล ${formatMoney(payouts.runnerUp)}`; }
      } else {
        const payout = payouts[size];
        if (loser.id === c.userTeamId) { c.budget += payout; userNote = `Champ Master: ทีมคุณตกรอบที่ ${roundNames[size]} รับเงินรางวัล ${formatMoney(payout)}`; }
      }
    }
    rounds.push({ name: roundNames[size], matches: roundMatches });
    field = winners;
  }
  c.log = [`⚽ Champ Master ${roundNames[16]} เริ่มแล้ว — 8 สโมสรจาก Master League ของคุณ พบกับ 8 แชมป์จำลองจากเซิร์ฟเวอร์อื่น`, ...c.log];
  if (userNote) c.log = [userNote, ...c.log];
  c.lastChampMaster = { season: c.season, rounds };
  return c;
}

/* weekly quests: short-term goals refreshed every 7 days, separate from the season-long goal */
const QUEST_TEMPLATES = [
  { id: "win2", label: "ชนะอย่างน้อย 2 นัดในสัปดาห์นี้", metric: "wins", target: 2, reward: 500000 },
  { id: "win3", label: "ชนะอย่างน้อย 3 นัดในสัปดาห์นี้", metric: "wins", target: 3, reward: 800000 },
  { id: "goals5", label: "ยิงประตูรวมอย่างน้อย 5 ลูกในสัปดาห์นี้", metric: "goals", target: 5, reward: 400000 },
  { id: "goals8", label: "ยิงประตูรวมอย่างน้อย 8 ลูกในสัปดาห์นี้", metric: "goals", target: 8, reward: 650000 },
  { id: "clean1", label: "คลีนชีตอย่างน้อย 1 นัดในสัปดาห์นี้", metric: "cleanSheets", target: 1, reward: 350000 },
  { id: "clean2", label: "คลีนชีตอย่างน้อย 2 นัดในสัปดาห์นี้", metric: "cleanSheets", target: 2, reward: 600000 },
];
function pickWeeklyQuests() { return [...QUEST_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, 3); }

const SEASON_GOAL_TEMPLATES = [
  { id: "top8", label: "จบอันดับท็อป 8 ของลีก", reward: 2000000, check: (c, pos, division) => pos <= 8 },
  { id: "survive", label: "ไม่ตกชั้น (ถ้าอยู่ Challenger League ถือว่าผ่านอัตโนมัติ)", reward: 2500000, check: (c, pos, division) => division !== 0 || pos <= 12 },
  { id: "academySale", label: "ขายดาวรุ่งจากอคาเดมีอย่างน้อย 2 คน", reward: 1500000, check: (c) => (c.seasonAcademySales || 0) >= 2 },
  { id: "win8", label: "ชนะอย่างน้อย 8 นัดในลีกฤดูกาลนี้", reward: 1800000, check: (c, pos, division, row) => row && row.w >= 8 },
  { id: "champion", label: "จบอันดับ 1 ของลีก", reward: 4000000, check: (c, pos) => pos === 1 },
];
function pickSeasonGoalOptions() { return [...SEASON_GOAL_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, 3); }

/* promotion/relegation (4 down from Master, 4 up from Challenger) + aging/retirement/youth — shared by the
   manual "start new season" button and the idle offline catch-up loop so the two paths can never drift apart */
function rolloverSeason(c) {
  const uT = c.teams.find((t) => t.id === c.userTeamId);
  const prevDivision = uT.division;
  const masterStandings = standingsForDivision(c, 0);
  const challengerStandings = standingsForDivision(c, 1);
  const prevStandings = prevDivision === 0 ? masterStandings : challengerStandings;
  const prevPos = prevStandings.findIndex((s) => s.team.id === c.userTeamId) + 1;
  const prevRow = prevStandings.find((s) => s.team.id === c.userTeamId);

  c = runChampMaster(c, masterStandings);

  // evaluate last season's chosen goal before wiping the tables
  if (c.seasonGoal) {
    const def = SEASON_GOAL_TEMPLATES.find((g) => g.id === c.seasonGoal);
    if (def) {
      if (def.check(c, prevPos, prevDivision, prevRow)) { c.budget += def.reward; c.log = [`🎯 สำเร็จเป้าหมายฤดูกาล "${def.label}"! ได้รับโบนัส ${formatMoney(def.reward)}`, ...c.log]; }
      else c.log = [`❌ ไม่สำเร็จเป้าหมายฤดูกาล "${def.label}"`, ...c.log];
    }
  }
  c.seasonAcademySales = 0;
  c.seasonGoalOptions = pickSeasonGoalOptions();
  c.seasonGoal = null;

  c.season += 1; c.day = 1;
  const relegated = masterStandings.slice(-4).map((s) => s.team);
  const promoted = challengerStandings.slice(0, 4).map((s) => s.team);
  relegated.forEach((t) => { t.division = 1; });
  promoted.forEach((t) => { t.division = 0; });
  const moveLines = [];
  relegated.forEach((t) => moveLines.push(`⬇️ ${t.short} ตกชั้นสู่ Challenger League`));
  promoted.forEach((t) => moveLines.push(`⬆️ ${t.short} เลื่อนชั้นสู่ Master League`));
  if (relegated.find((t) => t.id === c.userTeamId)) moveLines.push(`😔 ทีมของคุณตกชั้น! ต้องไต่กลับขึ้นมาใหม่`);
  if (promoted.find((t) => t.id === c.userTeamId)) moveLines.push(`🎉 ทีมของคุณเลื่อนชั้นสู่ Master League!`);
  c.log = [...moveLines, ...c.log];

  c.leagues = [buildLeague(0, c.teams), buildLeague(1, c.teams)];

  // age progression, growth curve, retirement, youth replacement (whole league, keeps bots fair too)
  const retiredNames = [];
  c.players = c.players.filter((p) => {
    p.age += 1;
    if (p.age >= 36) { retiredNames.push(p.name); return false; }
    if (p.age <= 22) { const gap = (p.potential - p.rating) / 5; bumpAttrs(p, clamp(gap * 0.18 + rand(0, 40) / 100, 0, 1.2)); }
    else if (p.age <= 29) bumpAttrs(p, rand(-20, 20) / 100);
    else bumpAttrs(p, -(p.age - 29) * (rand(20, 40) / 100));
    const ageMult = p.age <= 23 ? 1.35 : p.age <= 28 ? 1.05 : p.age <= 31 ? 0.65 : 0.3;
    p.value = Math.round((p.rating * p.rating * 380 * ageMult) / 1000) * 1000;
    p.wage = Math.round((p.rating * p.rating * 9) / 100) * 100;
    return true;
  });
  c.teams.forEach((t) => {
    const squadCount = c.players.filter((p) => p.teamId === t.id).length;
    let toAdd = Math.max(0, 14 - squadCount);
    retiredNames.forEach(() => { if (Math.random() < 0.6 && toAdd < 3) toAdd++; });
    for (let i = 0; i < toAdd; i++) c.players.push(genPlayer(choice(["GK", "DF", "MF", "FW"]), t.tier, t.id, rand(16, 18), c.day));
  });
  c.teams.forEach((t) => { c.lineups[t.id] = getBestXI(c.players.filter((p) => p.teamId === t.id), t.formation); });
  if (retiredNames.length) c.log = [`👋 ฤดูกาลนี้มีนักเตะรีไทร์ ${retiredNames.length} คน มีดาวรุ่งเสิร์ฟเข้าทีมบางส่วนแล้ว`, ...c.log];
  c.log = [`เริ่มฤดูกาลที่ ${c.season} แล้ว!`, ...c.log];
  return c;
}

function createNewCareer(customClub) {
  const masterBots = MASTER_TEAM_DEFS.map((t, idx) => ({
    id: "m" + idx, name: t.name, short: t.short, color: t.color, secondaryColor: C.chalk, logoIndex: idx % 10, tier: t.tier,
    division: 0, isUser: false, formation: "4-4-2", budget: rand(4000000, 9000000),
    manager: genManager(), autoMode: true, chemistry: 50,
  }));
  const challengerBots = CHALLENGER_TEAM_DEFS.map((t, idx) => ({
    id: "c" + idx, name: t.name, short: t.short, color: t.color, secondaryColor: C.chalk, logoIndex: idx % 10, tier: t.tier,
    division: 1, isUser: false, formation: "4-4-2", budget: rand(1500000, 4000000),
    manager: genManager(), autoMode: true, chemistry: 50,
  }));
  const userTeam = {
    id: "t_user", name: customClub.name, short: customClub.short, color: customClub.primaryColor,
    secondaryColor: customClub.secondaryColor, shirtColor: customClub.shirtColor, shortsColor: customClub.shortsColor,
    logoIndex: customClub.logoIndex, tier: -3, division: 1, isUser: true, formation: "4-4-2", budget: 3000000,
    manager: genManager(), autoMode: false, chemistry: 50,
  };
  const teams = [...masterBots, ...challengerBots, userTeam];
  let players = [];
  teams.forEach((t) => { players = players.concat(genSquad(t.id, t.tier)); });
  const leagues = [buildLeague(0, teams), buildLeague(1, teams)];
  const lineups = {};
  teams.forEach((t) => { lineups[t.id] = getBestXI(players.filter((p) => p.teamId === t.id), t.formation); });
  const staff = {};
  teams.forEach((t) => { staff[t.id] = {}; });
  const coachOffers = {};
  STAFF_SPECS.forEach((spec) => { coachOffers[spec] = genCoach(spec); });
  return {
    season: 1, day: 1, userTeamId: userTeam.id,
    teams, players, leagues, lineups, staff,
    budget: 3000000, transferList: [], coachOffers, coachRerollCounts: {}, managerOffer: genManager(),
    managerRerollCount: 0, scoutRerollCount: 0, academyManagerRerollCount: 0,
    facilities: { fitness: 1, training: 1, techLab: 1, medical: 1 },
    weeklyQuests: pickWeeklyQuests(), weeklyProgress: { wins: 0, goals: 0, cleanSheets: 0 }, weeklyRewarded: [],
    liveMatch: null,
    // training program: 10-slot calendar, one slot consumed per game day (≈1 real hour, 9:00-20:00)
    trainingPlan: Array.from({ length: 10 }, (_, i) => (i % 4 === 3 ? "REST" : "BALANCED")),
    autoTraining: true,
    // youth academy
    scout: null, scoutOffer: genScout(),
    academyManager: null, academyManagerOffer: genManager(true),
    academyPlayers: [], youthProspects: [], loans: [], seasonAcademySales: 0,
    // season goal (pick one each season for a budget bonus)
    seasonGoalOptions: pickSeasonGoalOptions(), seasonGoal: null,
    // idle catch-up bookkeeping
    lastSeenAt: Date.now(),
    playMode: "sandbox",
    onlineUnlocked: false,
    onlineUnlockedAt: null,
    log: [`ยินดีต้อนรับสู่ตำแหน่งไดเรคเตอร์ฟุตบอลของ ${userTeam.name}! เริ่มในโลกจำลอง (เล่นคนเดียวกับบอท) — สร้างมูลค่าสโมสรรวมทุกอย่างถึง ${formatMoney(ONLINE_UNLOCK_TEAM_VALUE)} เพื่อปลดล็อกออนไลน์`, `เริ่มต้นที่ Challenger League (ลีกรอง) ไต่อันดับเพื่อเลื่อนชั้นสู่ Master League`],
  };
}

/* ============================== UI PRIMITIVES ============================== */
function Panel({ children, style }) {
  return <div style={{ background: `linear-gradient(165deg, ${C.panel}, ${C.panel2})`, border: `1px solid ${C.steel}`, borderRadius: 14, padding: 15, boxShadow: "0 3px 10px rgba(0,0,0,.22)", ...style }}>{children}</div>;
}
function SectionLabel({ children, style }) { return <div style={{ fontFamily: DISPLAY_FONT, color: C.amber, fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10, ...style }}>{children}</div>; }
function RatingBadge({ value }) {
  const bg = value >= 78 ? C.good : value >= 60 ? C.amber : C.crimson;
  return <div style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: 13, color: "#08150e", background: bg, borderRadius: 7, width: 30, height: 22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,.3)" }}>{value}</div>;
}
function btnStyle(bg, fg) { return { width: "100%", background: bg, color: fg, border: "none", borderRadius: 12, padding: "13px 0", fontFamily: DISPLAY_FONT, fontSize: 14, letterSpacing: 1, cursor: "pointer", textTransform: "uppercase", boxShadow: "0 3px 10px rgba(0,0,0,.25)", transition: "transform .12s ease, filter .12s ease" }; }
/* renders any team's crest: a rounded badge with a gradient fill + one of the 10 selectable icons */
function ClubBadge({ team, size = 40 }) {
  const logo = LOGO_ICONS[(team.logoIndex || 0) % LOGO_ICONS.length];
  const secondary = team.secondaryColor || C.chalk;
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28, flexShrink: 0,
      background: `linear-gradient(155deg, ${team.color}, ${shadeColor(team.color, -22)})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 3px 8px rgba(0,0,0,.35)", border: `2px solid ${secondary}55`,
    }}>
      <svg viewBox="0 0 24 24" width={size * 0.52} height={size * 0.52}>
        {logo.circle ? <circle cx="12" cy="12" r="9" fill={secondary} /> :
          logo.ring ? <circle cx="12" cy="12" r="7.5" fill="none" stroke={secondary} strokeWidth="3" /> :
          <path d={logo.path} fill={secondary} />}
      </svg>
    </div>
  );
}
function KitPreview({ shirt, shorts, trim, size = 70 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <path d="M30 10 L10 25 L20 40 L30 32 L30 78 L70 78 L70 32 L80 40 L90 25 L70 10 L60 18 Q50 25 40 18 Z" fill={shirt} stroke={trim} strokeWidth="3" />
      </svg>
      <div style={{ width: size * 0.72, height: size * 0.3, background: shorts, borderRadius: 5, border: `2.5px solid ${trim}` }} />
    </div>
  );
}
function MiniBar({ value, color, bg = C.steel }) {
  return <div style={{ width: "100%", height: 5, background: bg, borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${clamp(value, 0, 100)}%`, height: "100%", background: color }} /></div>;
}
function RadarStats({ stats }) {
  const keys = Object.keys(stats);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
      {keys.map((k) => (
        <div key={k}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: C.textDim, marginBottom: 2 }}><span>{MANAGER_STAT_TH[k]}</span><span style={{ fontFamily: MONO_FONT, color: stats[k] >= 75 ? C.gold : C.chalk }}>{stats[k]}</span></div>
          <MiniBar value={stats[k]} color={stats[k] >= 75 ? C.gold : C.blue} />
        </div>
      ))}
    </div>
  );
}

/* ============================== MAIN APP ============================== */
export default function App() {
  const [profile, setProfile] = useState(null);
  const [career, setCareer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gameEntered, setGameEntered] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(Date.now());
  const toastTimer = useRef(null);

  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, []);
  useEffect(() => {
    (async () => {
      try { const pr = await window.storage.get("profile_v1"); if (pr && pr.value) setProfile(JSON.parse(pr.value)); } catch (e) {}
      try {
        const res = await window.storage.get("career_v3");
        if (res && res.value) {
          let c = JSON.parse(res.value);
          const elapsedHours = (Date.now() - (c.lastSeenAt || Date.now())) / 3600000;
          const daysToSim = Math.min(Math.floor(elapsedHours), 60); // 1 real hour ≈ 1 game day, capped so catch-up never freezes the UI
          if (daysToSim >= 1) {
            const startDay = c.day, startSeason = c.season;
            const logBefore = c.log; // full log before catch-up (oldest-first is bottom, newest at index 0)
            for (let i = 0; i < daysToSim; i++) c = simulateOneDayFast(c);
            const addedCount = c.log.length - logBefore.length; // new entries were unshifted to the front
            const newEntries = addedCount > 0 ? c.log.slice(0, addedCount) : [];
            const importantMarks = ["🎉", "⬇️", "⬆️", "😔", "🎯", "❌", "📄", "🏆", "🥈"];
            const highlights = newEntries.filter((l) => importantMarks.some((m) => l.startsWith(m))).slice(0, 8);
            const headline = `⏱ ระหว่างที่คุณไม่อยู่ ผ่านไป ${daysToSim} วันเกม (ฤดูกาล ${startSeason} วัน ${startDay} → ฤดูกาล ${c.season} วัน ${c.day})`;
            c.log = [headline, ...highlights, ...logBefore].slice(0, 60);
          }
          c.lastSeenAt = Date.now();
          c = migrateCareerSave(c);
          setCareer(c);
          window.storage.set("career_v3", JSON.stringify(c)).catch(() => {});
        }
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  function saveProfile(p) { window.storage.set("profile_v1", JSON.stringify(p)).catch(() => {}); setProfile(p); }

  const persist = useCallback((next) => {
    const saved = checkOnlineUnlock(typeof next === "object" && next !== null ? { ...next } : next);
    window.storage.set("career_v3", JSON.stringify({ ...saved, lastSeenAt: Date.now() })).catch(() => {});
  }, []);
  const updateCareer = useCallback((updater) => {
    setCareer((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const checked = checkOnlineUnlock(JSON.parse(JSON.stringify(next)));
      persist(checked);
      return checked;
    });
  }, [persist]);

  function showToast(msg) { setToast(msg); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 2600); }
  function enterOnlineMode() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const fin = computeTeamFinances(c);
      if (!c.onlineUnlocked || !canUnlockOnline(fin)) return c;
      c.playMode = "online";
      c.onlineEnteredAt = Date.now();
      c.log = [`🌐 เข้าสู่โลกออนไลน์แล้ว! จากนี้จะแข่งกับผู้เล่นจริงเมื่อเซิร์ฟเวอร์พร้อม`, ...c.log];
      return c;
    });
    showToast("เข้าสู่โลกออนไลน์แล้ว!");
  }

  function startCareer(clubConfig) { updateCareer(createNewCareer(clubConfig)); setTab("dashboard"); }
  function resetCareer() { window.storage.delete("career_v3").catch(() => {}); setCareer(null); setTab("dashboard"); }

  function squadOf(teamId, c = career) { return c.players.filter((p) => p.teamId === teamId); }
  function userTeam(c = career) { return c.teams.find((t) => t.id === c.userTeamId); }

  /* auto-pick lineup respecting formation + injuries + fatigue, used for bots always, user when autoMode on */
  function autoLineupFor(team, squad) { return getBestXI(squad, team.formation); }

  function applyChemistry(c, teamId, xiIds) {
    const t = c.teams.find((tm) => tm.id === teamId);
    const prevXI = c.lineups[teamId] || [];
    const overlap = xiIds.filter((id) => prevXI.includes(id)).length;
    t.chemistry = clamp((t.chemistry || 50) + (overlap >= 8 ? 3 : -5), 20, 100);
  }

  function applyMatchWearAndInjury(c, squad, xiIds) {
    squad.forEach((p) => {
      if (xiIds.includes(p.id)) {
        p.stamina = clamp(p.stamina - rand(16, 28), 5, 100);
        p.appearHistory = [true, ...(p.appearHistory || [])].slice(0, 5);
        p.careerApps = (p.careerApps || 0) + 1;
        checkMilestone(c, p, "apps");
        const physio = (c.staff[p.teamId] || {}).PHYSIO;
        const medicalLevel = p.teamId === c.userTeamId && c.facilities ? c.facilities.medical : 1;
        const injuryChance = clamp((100 - p.stamina) / 100 * 0.14 + 0.015, 0.01, 0.18) * (physio ? 1 - physio.boost * 0.25 : 1) * (1 - (medicalLevel - 1) * 0.06);
        if (Math.random() < injuryChance) {
          const physioBoost = physio ? physio.boost : 0;
          p.injuryDays = Math.max(1, Math.round(rand(3, 16) * (1 - physioBoost * 0.2) * (1 - (medicalLevel - 1) * 0.08)));
        }
      } else {
        p.appearHistory = [false, ...(p.appearHistory || [])].slice(0, 5);
      }
    });
  }

  function computeStatuses(squad) {
    return squad.map((p) => {
      const starts = (p.appearHistory || []).filter(Boolean).length;
      const status = starts >= 4 ? "starter" : starts >= 1 ? "rotation" : "reserve";
      return { ...p, status };
    });
  }

  /* ---------- weekly / daily rollover extras ---------- */
  function finalizeDayExtras(c) {
    // --- player contract expiry: bots auto-renew silently, your club must renew manually or the player leaves free ---
    const departed = [];
    c.players = c.players.filter((p) => {
      if (p.contractEndsDay == null || c.day < p.contractEndsDay) return true;
      if (p.teamId === c.userTeamId) { departed.push(p.name); return false; }
      p.contractEndsDay = c.day + rand(150, 400); // bots re-sign automatically
      p.wage = Math.round((p.wage * rand(103, 112) / 100) / 100) * 100;
      return true;
    });
    if (departed.length) {
      c.log = [`📄 หมดสัญญา: ${departed.join(", ")} ออกจากทีมแบบไม่มีค่าตัว (ไม่ได้ต่อสัญญาทัน)`, ...c.log];
      const remainingIds = c.players.filter((p) => p.teamId === c.userTeamId).map((p) => p.id);
      c.lineups[c.userTeamId] = (c.lineups[c.userTeamId] || []).filter((id) => remainingIds.includes(id));
    }

    const uSquad = squadOf(c.userTeamId, c);
    const wageBill = uSquad.reduce((s, p) => s + p.wage, 0);
    const staffWages = Object.values(c.staff[c.userTeamId] || {}).reduce((s, co) => s + co.weeklyWage, 0);
    const mgrWage = userTeam(c).manager ? userTeam(c).manager.weeklyWage : 0;
    const scoutWage = c.scout ? c.scout.weeklyWage : 0;
    const acaMgrWage = c.academyManager ? c.academyManager.weeklyWage : 0;
    c.budget -= (wageBill + staffWages + mgrWage + scoutWage + acaMgrWage);
    c.log = [`หักค่าเหนื่อยนักเตะ+สตาฟ+ผจก.+อคาเดมี: -${formatMoney(wageBill + staffWages + mgrWage + scoutWage + acaMgrWage)}`, ...c.log];

    // --- today's training-calendar slot applies to the whole first-team squad ---
    const slotIdx = (c.day - 1) % 10;
    const trainingType = c.trainingPlan[slotIdx] || "BALANCED";
    uSquad.forEach((p) => applyTrainingToPlayer(p, trainingType));
    c.log = [`🏋️ วันฝึกที่ ${slotIdx + 1}/10: ${TRAINING_TH[trainingType]}`, ...c.log];

    // daily stamina recovery for everyone (all clubs, so bots stay fair too)
    const myFacilities = c.facilities || { fitness: 1, training: 1, techLab: 1, medical: 1 };
    c.players.forEach((p) => {
      const teamFitness = (c.staff[p.teamId] || {}).FITNESS;
      const facilityBonus = p.teamId === c.userTeamId ? (myFacilities.fitness - 1) * 2 : 0;
      const recover = 12 + (teamFitness ? teamFitness.boost * 10 : 0) + facilityBonus;
      p.stamina = clamp(p.stamina + recover, 0, 100);
      if (p.injuryDays > 0) p.injuryDays -= 1;
    });
    // training boosts from position coaches (main squad, all clubs)
    Object.keys(c.staff).forEach((teamId) => {
      Object.keys(c.staff[teamId]).forEach((spec) => {
        if (!["GK", "DF", "MF", "FW"].includes(spec)) return;
        const co = c.staff[teamId][spec];
        const trainingMult = teamId === c.userTeamId ? 1 + (myFacilities.training - 1) * 0.15 : 1;
        c.players.forEach((p) => {
          if (p.teamId === teamId && p.position === spec) bumpAttrs(p, co.boost * 0.06 * trainingMult);
        });
      });
    });

    // --- youth academy: passive development, loans, scouting ---
    const devBoost = c.academyManager ? c.academyManager.stats.development / 100 : 0.15;
    c.academyPlayers.forEach((p) => {
      p.stamina = clamp(p.stamina + 15, 0, 100);
      if (p.age <= 21) bumpAttrs(p, 0.05 + devBoost * 0.08);
    });
    // loan spells: simulate a light match performance each day and tick down the countdown
    const stillOnLoan = [];
    c.loans.forEach((loan) => {
      const p = c.academyPlayers.find((pl) => pl.prospectId === loan.prospectId) || c.players.find((pl) => pl.id === loan.prospectId);
      if (p) {
        const rating = clamp(6 + (p.rating - 55) / 20 + (Math.random() * 2 - 1), 3, 10);
        const scored = Math.random() < (p.position === "FW" ? 0.3 : p.position === "MF" ? 0.15 : 0.05);
        loan.log = [{ day: c.day, rating: rating.toFixed(1), goal: scored }, ...(loan.log || [])].slice(0, 15);
        if (scored) bumpAttrs(p, 0.15); // good form nudges development a little extra
      }
      loan.daysLeft -= 1;
      if (loan.daysLeft > 0) stillOnLoan.push(loan);
      else if (p) c.log = [`↩️ ${p.name} ครบกำหนดยืมตัวจาก ${loan.toTeamName} กลับสู่อคาเดมีแล้ว`, ...c.log];
    });
    c.loans = stillOnLoan;
    // scout surfaces new prospects
    if (c.scout && Math.random() < c.scout.findChance && c.youthProspects.length < 6) {
      c.youthProspects = [...c.youthProspects, genYouthProspect(c.scout.qualityBoost, c.scout, c.facilities ? c.facilities.techLab : 1)];
      c.log = [`🔎 แมวมองพบดาวรุ่งใหม่: ${c.youthProspects[c.youthProspects.length - 1].name}`, ...c.log];
    }

    // daily reroll allowance resets for coaches, manager, scout, and academy manager offers
    c.coachRerollCounts = {};
    c.managerRerollCount = 0; c.scoutRerollCount = 0; c.academyManagerRerollCount = 0;
    STAFF_SPECS.forEach((spec) => { if (!c.staff[c.userTeamId][spec] && !c.coachOffers[spec]) c.coachOffers[spec] = genCoach(spec); });

    // weekly quest completion check (can complete any day during the week, not just at the boundary)
    c.weeklyRewarded = c.weeklyRewarded || [];
    (c.weeklyQuests || []).forEach((q) => {
      if (c.weeklyRewarded.includes(q.id)) return;
      const progressVal = (c.weeklyProgress || {})[q.metric] || 0;
      if (progressVal >= q.target) {
        c.budget += q.reward;
        c.weeklyRewarded.push(q.id);
        c.log = [`✅ สำเร็จเควส "${q.label}"! ได้รับ ${formatMoney(q.reward)}`, ...c.log];
      }
    });

    if (c.day % 7 === 0) {
      c.managerOffer = genManager();
      c.scoutOffer = genScout();
      c.academyManagerOffer = genManager(true);
      c.weeklyQuests = pickWeeklyQuests();
      c.weeklyProgress = { wins: 0, goals: 0, cleanSheets: 0 };
      c.weeklyRewarded = [];
      c.log = [`มีผู้สมัครผจก./แมวมองใหม่ประจำสัปดาห์! เควสใหม่มาแล้ว`, ...c.log];
    }
    while (c.transferList.length < 8) c.transferList.push(genTransferListing(c.teams, c.userTeamId));
    c.day += 1;
    return c;
  }

  /* ---------- fast (idle) day resolution: no live match, used for interactive bye-days and offline catch-up ---------- */
  function simulateOneDayFast(c) {
    const userXIFor = (teamId, team, squad) => {
      const avail = squad.filter((p) => p.injuryDays <= 0);
      if (teamId === c.userTeamId) {
        const uT = c.teams.find((t) => t.id === teamId);
        if (uT.autoMode) {
          uT.formation = recommendFormation(uT, avail);
          return getBestXI(avail, uT.formation);
        }
        const picked = (c.lineups[teamId] || []).filter((id) => avail.some((p) => p.id === id));
        return fillLineupGaps(avail, picked, uT.formation);
      }
      return getBestXI(avail, team.formation);
    };
    [0, 1].forEach((div) => {
      const round = c.leagues[div].fixtures.find((r) => r.day === c.day);
      if (!round) return;
      round.matches.forEach((m) => {
        const homeTeam = c.teams.find((t) => t.id === m.home);
        const awayTeam = c.teams.find((t) => t.id === m.away);
        const homeSquad = c.players.filter((p) => p.teamId === m.home);
        const awaySquad = c.players.filter((p) => p.teamId === m.away);
        const homeXI = userXIFor(m.home, homeTeam, homeSquad);
        const awayXI = userXIFor(m.away, awayTeam, awaySquad);
        const { homeGoals, awayGoals } = simulateInstant(homeTeam, homeSquad, homeXI, awayTeam, awaySquad, awayXI, homeTeam.chemistry, awayTeam.chemistry);
        m.played = true; m.homeGoals = homeGoals; m.awayGoals = awayGoals;
        applyResultToTable(c, m, homeGoals, awayGoals);
        applyChemistry(c, m.home, homeXI); applyChemistry(c, m.away, awayXI);
        applyMatchWearAndInjury(c, homeSquad, homeXI); applyMatchWearAndInjury(c, awaySquad, awayXI);
        attributeGoals(c, homeSquad, homeXI, homeGoals); attributeGoals(c, awaySquad, awayXI, awayGoals);
        c.lineups[m.home] = homeXI; c.lineups[m.away] = awayXI;
        if (m.home === c.userTeamId || m.away === c.userTeamId) c.log = [`${homeTeam.short} ${homeGoals} - ${awayGoals} ${awayTeam.short}`, ...c.log];
      });
    });
    if (c.leagues[0].fixtures.find((r) => r.day === c.day) || c.leagues[1].fixtures.find((r) => r.day === c.day)) finalizeDayExtras(c);
    if (c.day > c.leagues[0].fixtures.length) c = rolloverSeason(c);
    return c;
  }

  /* ---------- mid-match rule-based tactic AI ---------- */
  function suggestTacticSwitch(team, homeGoals, awayGoals, isHome, minute) {
    const myGoals = isHome ? homeGoals : awayGoals, oppGoals = isHome ? awayGoals : homeGoals;
    const diff = myGoals - oppGoals;
    const timeLeftFrac = clamp((90 - minute) / 90, 0, 1);
    const tacticsSkill = team.manager ? team.manager.stats.tactics : 40;
    if (Math.random() > tacticsSkill / 100) return null; // skill gates how often they successfully react
    if (diff < 0 && timeLeftFrac < 0.42) {
      const attacking = ["4-3-3", "4-4-2", "3-5-2"].find((f) => f !== team.formation) || "4-3-3";
      return attacking;
    }
    if (diff > 0 && timeLeftFrac < 0.25) {
      const defensive = ["5-3-2", "4-4-2"].find((f) => f !== team.formation) || "5-3-2";
      return defensive;
    }
    return null;
  }

  function simOneFixture(c, m) {
    if (m.played) return null;
    const homeTeam = c.teams.find((t) => t.id === m.home);
    const awayTeam = c.teams.find((t) => t.id === m.away);
    const homeSquad = squadOf(m.home, c);
    const awaySquad = squadOf(m.away, c);
    const homeXI = autoLineupFor(homeTeam, homeSquad);
    const awayXI = autoLineupFor(awayTeam, awaySquad);
    const { homeGoals, awayGoals } = simulateInstant(
      homeTeam, homeSquad, homeXI, awayTeam, awaySquad, awayXI,
      homeTeam.chemistry, awayTeam.chemistry,
    );
    m.played = true;
    m.homeGoals = homeGoals;
    m.awayGoals = awayGoals;
    applyResultToTable(c, m, homeGoals, awayGoals);
    applyChemistry(c, m.home, homeXI);
    applyChemistry(c, m.away, awayXI);
    applyMatchWearAndInjury(c, homeSquad, homeXI);
    applyMatchWearAndInjury(c, awaySquad, awayXI);
    attributeGoals(c, homeSquad, homeXI, homeGoals);
    attributeGoals(c, awaySquad, awayXI, awayGoals);
    c.lineups[m.home] = homeXI;
    c.lineups[m.away] = awayXI;
    return `${homeTeam.short} ${homeGoals} - ${awayGoals} ${awayTeam.short}`;
  }

  function simBotMatchesAroundUser(c) {
    const uT = c.teams.find((t) => t.id === c.userTeamId);
    const otherDiv = uT.division === 0 ? 1 : 0;
    const league = c.leagues[uT.division];
    const round = league.fixtures.find((r) => r.day === c.day);
    if (!round) return [];
    const newLog = [];
    const otherRound = c.leagues[otherDiv].fixtures.find((r) => r.day === c.day);
    if (otherRound) {
      otherRound.matches.forEach((m) => {
        const line = simOneFixture(c, m);
        if (line) newLog.push(line);
      });
    }
    const userMatch = round.matches.find((m) => m.home === c.userTeamId || m.away === c.userTeamId);
    round.matches.filter((m) => m !== userMatch).forEach((m) => {
      const line = simOneFixture(c, m);
      if (line) newLog.push(line);
    });
    return newLog;
  }

  function simAllMatchesOnDay(c) {
    const newLog = [];
    [0, 1].forEach((div) => {
      const round = c.leagues[div].fixtures.find((r) => r.day === c.day);
      if (!round) return;
      round.matches.forEach((m) => {
        const line = simOneFixture(c, m);
        if (line) newLog.push(line);
      });
    });
    return newLog;
  }

  function kickoffUserMatch() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      if (c.liveMatch) return c;
      const uT = c.teams.find((t) => t.id === c.userTeamId);
      const league = c.leagues[uT.division];
      const round = league.fixtures.find((r) => r.day === c.day);
      if (!round) return c;
      const userMatch = round.matches.find((m) => m.home === c.userTeamId || m.away === c.userTeamId);
      if (!userMatch || userMatch.played) return c;

      if (c.dayBotsSimmed !== c.day) {
        const botLog = simBotMatchesAroundUser(c);
        c.log = [...botLog.reverse(), ...c.log].slice(0, 60);
        c.dayBotsSimmed = c.day;
      }

      const isHome = userMatch.home === c.userTeamId;
      const oppId = isHome ? userMatch.away : userMatch.home;
      const oppTeam = c.teams.find((t) => t.id === oppId);
      const uSquad = squadOf(c.userTeamId, c).filter((p) => p.injuryDays <= 0);
      const oppSquad = squadOf(oppId, c);

      if (uT.autoMode) {
        uT.formation = recommendFormation(uT, uSquad);
        c.lineups[c.userTeamId] = getBestXI(uSquad, uT.formation);
      }

      let uXI = uT.autoMode
        ? getBestXI(uSquad, uT.formation)
        : (c.lineups[c.userTeamId] || []).filter((id) => uSquad.find((p) => p.id === id));
      uXI = fillLineupGaps(uSquad, uXI, uT.formation);
      c.lineups[c.userTeamId] = uXI;

      const oppXI = autoLineupFor(oppTeam, oppSquad);
      const hc = buildMatchContext(
        isHome ? uT : oppTeam, isHome ? uSquad : oppSquad, isHome ? uXI : oppXI,
        isHome ? oppTeam.formation : uT.formation, true, isHome ? uT.chemistry : oppTeam.chemistry,
      );
      const ac = buildMatchContext(
        isHome ? oppTeam : uT, isHome ? oppSquad : uSquad, isHome ? oppXI : uXI,
        isHome ? uT.formation : oppTeam.formation, false, isHome ? oppTeam.chemistry : uT.chemistry,
      );
      const { xgHome, xgAway } = expectedGoalsFull(hc, ac);
      c.liveMatch = {
        matchId: userMatch.id, day: c.day, home: userMatch.home, away: userMatch.away,
        xgHome, xgAway, homeGoals: 0, awayGoals: 0,
        homeXI: isHome ? uXI : oppXI, awayXI: isHome ? oppXI : uXI,
        homeFormation: isHome ? uT.formation : oppTeam.formation,
        awayFormation: isHome ? oppTeam.formation : uT.formation,
        subsUsed: 0,
      };
      return c;
    });
  }

  function applyManagerLineupForMatch() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const t = c.teams.find((tm) => tm.id === c.userTeamId);
      const sq = squadOf(c.userTeamId, c).filter((p) => p.injuryDays <= 0);
      t.formation = recommendFormation(t, sq);
      c.lineups[c.userTeamId] = getBestXI(sq, t.formation);
      c.log = [`📋 ผจก.จัดทีมให้นัดนี้: แผน ${t.formation}`, ...c.log];
      return c;
    });
    showToast("ผจก.จัดทีมให้แล้ว");
  }

  /* ---------- advance day ---------- */
  function advanceDay() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const uT = c.teams.find((t) => t.id === c.userTeamId);
      const league = c.leagues[uT.division];
      const round = league.fixtures.find((r) => r.day === c.day);
      if (!round) return c;

      const userMatch = round.matches.find((m) => m.home === c.userTeamId || m.away === c.userTeamId);
      if (userMatch && !userMatch.played) return c;

      const newLog = simAllMatchesOnDay(c);
      c.log = [...newLog.reverse(), ...c.log].slice(0, 60);
      finalizeDayExtras(c);
      return c;
    });
  }

  function awardManagerXP(c, mgr, teamId, xp) {
    if (!mgr) return;
    mgr.xp = (mgr.xp || 0) + xp;
    const needed = (mgr.level || 1) * 80;
    if (mgr.xp >= needed) {
      mgr.xp -= needed;
      mgr.level = (mgr.level || 1) + 1;
      mgr.skillPoints = (mgr.skillPoints || 0) + 1;
      if (teamId === c.userTeamId) c.log = [`⭐ ${mgr.name} เลเวลอัพเป็น Lv.${mgr.level}! ได้แต้มสกิล 1 แต้ม`, ...c.log];
    }
  }
  function applyResultToTable(c, m, homeGoals, awayGoals) {
    const homeT = c.teams.find((t) => t.id === m.home), awayT = c.teams.find((t) => t.id === m.away);
    const league = c.leagues[homeT.division];
    const th = league.table[m.home], ta = league.table[m.away];
    th.played++; ta.played++; th.gf += homeGoals; th.ga += awayGoals; ta.gf += awayGoals; ta.ga += homeGoals;
    if (homeGoals > awayGoals) {
      th.w++; th.pts += 3; ta.l++;
      awardManagerXP(c, homeT.manager, homeT.id, 15); awardManagerXP(c, awayT.manager, awayT.id, 4);
      if (homeT.manager) homeT.manager.wins++; if (awayT.manager) awayT.manager.losses++;
    } else if (homeGoals < awayGoals) {
      ta.w++; ta.pts += 3; th.l++;
      awardManagerXP(c, awayT.manager, awayT.id, 15); awardManagerXP(c, homeT.manager, homeT.id, 4);
      if (awayT.manager) awayT.manager.wins++; if (homeT.manager) homeT.manager.losses++;
    } else {
      th.d++; ta.d++; th.pts++; ta.pts++;
      awardManagerXP(c, homeT.manager, homeT.id, 8); awardManagerXP(c, awayT.manager, awayT.id, 8);
      if (homeT.manager) homeT.manager.draws++; if (awayT.manager) awayT.manager.draws++;
    }
    if (m.home === c.userTeamId) c.budget += Math.round(180000 + Math.random() * 220000);
    // weekly quest progress tracking (user's club only)
    if (m.home === c.userTeamId || m.away === c.userTeamId) {
      const uIsHome = m.home === c.userTeamId;
      const myGoals = uIsHome ? homeGoals : awayGoals, oppGoals = uIsHome ? awayGoals : homeGoals;
      c.weeklyProgress = c.weeklyProgress || { wins: 0, goals: 0, cleanSheets: 0 };
      if (myGoals > oppGoals) c.weeklyProgress.wins += 1;
      c.weeklyProgress.goals += myGoals;
      if (oppGoals === 0) c.weeklyProgress.cleanSheets += 1;
    }
  }

  function finishLiveMatch(homeGoals, awayGoals, finalHomeXI, finalAwayXI) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const lm = c.liveMatch;
      if (!lm) return c;
      const uT = c.teams.find((t) => t.id === c.userTeamId);
      const round = c.leagues[uT.division].fixtures.find((r) => r.day === lm.day);
      const m = round.matches.find((mm) => mm.id === lm.matchId);
      m.played = true; m.homeGoals = homeGoals; m.awayGoals = awayGoals;
      applyResultToTable(c, m, homeGoals, awayGoals);
      applyChemistry(c, m.home, finalHomeXI); applyChemistry(c, m.away, finalAwayXI);
      const homeSquad = squadOf(m.home, c), awaySquad = squadOf(m.away, c);
      applyMatchWearAndInjury(c, homeSquad, finalHomeXI); applyMatchWearAndInjury(c, awaySquad, finalAwayXI);
      attributeGoals(c, homeSquad, finalHomeXI, homeGoals); attributeGoals(c, awaySquad, finalAwayXI, awayGoals);
      c.lineups[m.home] = finalHomeXI; c.lineups[m.away] = finalAwayXI;
      const h = c.teams.find((t) => t.id === m.home), a = c.teams.find((t) => t.id === m.away);
      c.log = [`🔴 จบเกม: ${h.short} ${homeGoals} - ${awayGoals} ${a.short}`, ...c.log];
      // morale swing based on result
      const uIsHome = m.home === c.userTeamId;
      const won = uIsHome ? homeGoals > awayGoals : awayGoals > homeGoals;
      const draw = homeGoals === awayGoals;
      c.players.filter((p) => p.teamId === c.userTeamId).forEach((p) => { p.morale = clamp(p.morale + (won ? rand(2, 6) : draw ? 0 : -rand(2, 6)), 10, 99); });
      c.liveMatch = null;
      finalizeDayExtras(c);
      return c;
    });
  }

  function startNewSeason() {
    updateCareer((prev) => rolloverSeason(JSON.parse(JSON.stringify(prev))));
  }

  /* ---------- transfer auction ---------- */
  function placeBid(listingId, wage, fee) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const l = c.transferList.find((x) => x.listingId === listingId);
      if (!l) return c;
      if (fee > c.budget) return c;
      const valid = wage > l.topBid.wage || (wage === l.topBid.wage && fee > l.topBid.fee);
      if (!valid) return c;
      l.topBid = { wage, fee, bidder: "คุณ", isUser: true };
      l.bidHistory = [{ wage, fee, bidder: "คุณ" }, ...l.bidHistory].slice(0, 8);
      l.endsAt = Math.max(l.endsAt, Date.now() + 12000);
      return c;
    });
  }
  function resolveExpiredListings() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      let changed = false;
      c.transferList = c.transferList.filter((l) => {
        if (Date.now() < l.endsAt) return true;
        changed = true;
        if (l.topBid.isUser) {
          const negDiscount = 1; // negotiation bonus could reduce fee slightly in future
          const newPlayer = { id: l.id, name: l.name, position: l.position, age: l.age, attrs: l.attrs, attack: l.attack, defense: l.defense, rating: l.rating, potential: l.potential, value: l.topBid.fee, wage: l.topBid.wage, morale: 75, teamId: c.userTeamId, stamina: 90, injuryDays: 0, appearHistory: [], contractEndsDay: c.day + rand(150, 400) };
          c.players.push(newPlayer);
          c.budget -= l.topBid.fee;
          const sq = c.players.filter((p) => p.teamId === c.userTeamId);
          c.lineups[c.userTeamId] = getBestXI(sq, c.teams.find((t) => t.id === c.userTeamId).formation);
          c.log = [`✅ ชนะประมูล ${l.name} (${POS_TH[l.position]}) ค่าตัว ${formatMoney(l.topBid.fee)} ค่าเหนื่อย ${formatMoney(l.topBid.wage)}/สัปดาห์`, ...c.log];
        } else {
          c.log = [`ตลาด: ${l.name} ถูกทีมอื่นซื้อไปด้วยราคา ${formatMoney(l.topBid.fee)}`, ...c.log];
        }
        return false;
      });
      if (changed) while (c.transferList.length < 8) c.transferList.push(genTransferListing(c.teams, c.userTeamId));
      return changed ? c : prev;
    });
  }
  useEffect(() => {
    if (!career) return;
    if (!isMarketOpen()) return;
    const iv = setInterval(() => {
      updateCareer((prev) => {
        const c = JSON.parse(JSON.stringify(prev));
        c.transferList.forEach((l) => {
          if (Date.now() >= l.endsAt) return;
          if (Math.random() > 0.35) return;
          const wageStep = Math.round((l.wage * 0.04) / 100) * 100 || 100;
          const feeStep = Math.round((l.value * 0.05) / 1000) * 1000 || 1000;
          l.topBid = { wage: l.topBid.wage + wageStep, fee: l.topBid.fee + feeStep, bidder: choice(c.teams.filter((t) => !t.isUser)).short, isUser: false };
        });
        return c;
      });
    }, 4000);
    return () => clearInterval(iv);
  }, [career?.userTeamId, now]);
  useEffect(() => { if (career) resolveExpiredListings(); }, [now]);

  function sellPlayer(playerId) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const p = c.players.find((pl) => pl.id === playerId);
      const squad = c.players.filter((pl) => pl.teamId === c.userTeamId);
      if (!p || squad.length <= 11) return c;
      const price = Math.round((p.value * (0.75 + Math.random() * 0.25)) / 1000) * 1000;
      c.budget += price;
      c.players = c.players.filter((pl) => pl.id !== playerId);
      c.lineups[c.userTeamId] = (c.lineups[c.userTeamId] || []).filter((id) => id !== playerId);
      c.log = [`💰 ขาย ${p.name} ได้ ${formatMoney(price)}`, ...c.log];
      return c;
    });
    showToast("ขายนักเตะสำเร็จ!");
  }
  function renewPlayerContract(playerId) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const p = c.players.find((pl) => pl.id === playerId && pl.teamId === c.userTeamId);
      if (!p) return c;
      const fee = Math.round((p.value * 0.06) / 1000) * 1000;
      if (c.budget < fee) return c;
      c.budget -= fee;
      p.wage = Math.round((p.wage * rand(105, 118)) / 100 / 100) * 100;
      p.contractEndsDay = c.day + rand(150, 400);
      p.morale = clamp(p.morale + 5, 10, 99);
      c.log = [`✍️ ต่อสัญญา ${p.name} แล้ว (ค่าใช้จ่าย ${formatMoney(fee)})`, ...c.log];
      return c;
    });
    showToast("ต่อสัญญาสำเร็จ!");
  }
  function upgradeFacility(type) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const level = (c.facilities || {})[type] || 1;
      if (level >= 5) return c;
      const cost = facilityUpgradeCost(level);
      if (c.budget < cost) return c;
      c.budget -= cost;
      c.facilities = { ...c.facilities, [type]: level + 1 };
      c.log = [`🏗️ อัปเกรด${FACILITY_TH[type]}เป็นระดับ ${level + 1} แล้ว (${formatMoney(cost)})`, ...c.log];
      return c;
    });
    showToast("อัปเกรดสำเร็จ!");
  }
  function allocateSkillPoint(statKey) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const t = c.teams.find((tm) => tm.id === c.userTeamId);
      if (!t.manager || !t.manager.skillPoints) return c;
      t.manager.skillPoints -= 1;
      t.manager.stats[statKey] = clamp(t.manager.stats[statKey] + 3, 1, 99);
      c.log = [`📈 เพิ่มสเตต${MANAGER_STAT_TH[statKey]}ของ ${t.manager.name} แล้ว`, ...c.log];
      return c;
    });
  }

  /* ---------- tactics (manual override) ---------- */
  function setFormation(f) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const t = c.teams.find((tm) => tm.id === c.userTeamId);
      t.formation = f;
      c.lineups[c.userTeamId] = getBestXI(c.players.filter((p) => p.teamId === c.userTeamId), f);
      return c;
    });
  }
  function toggleLineupSlot(playerId) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const t = c.teams.find((tm) => tm.id === c.userTeamId);
      const form = FORMATIONS[t.formation];
      const squad = c.players.filter((p) => p.teamId === c.userTeamId);
      let xi = c.lineups[c.userTeamId] || [];
      if (xi.includes(playerId)) xi = xi.filter((id) => id !== playerId);
      else {
        const player = squad.find((p) => p.id === playerId);
        if (player.injuryDays > 0) return c;
        const currentOfPos = xi.filter((id) => squad.find((p) => p.id === id)?.position === player.position).length;
        if (currentOfPos >= (form.counts[player.position] || 0) || xi.length >= 11) return c;
        xi = [...xi, playerId];
      }
      c.lineups[c.userTeamId] = xi;
      return c;
    });
  }
  function setPlayerRole(playerId, role) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const p = c.players.find((pl) => pl.id === playerId);
      if (p) p.role = role;
      return c;
    });
  }
  function toggleAutoMode() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const t = c.teams.find((tm) => tm.id === c.userTeamId);
      t.autoMode = !t.autoMode;
      if (t.autoMode) c.lineups[c.userTeamId] = getBestXI(c.players.filter((p) => p.teamId === c.userTeamId), t.formation);
      return c;
    });
  }

  /* ---------- staff & manager hiring ---------- */
  function hireCoach(specialty) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const offer = c.coachOffers[specialty];
      if (!offer) return c;
      const existing = c.staff[c.userTeamId][specialty];
      const terminationFee = existing ? Math.round((existing.weeklyWage * 8) / 1000) * 1000 : 0;
      const totalCost = offer.signingCost + terminationFee;
      if (c.budget < totalCost) return c;
      c.budget -= totalCost;
      if (existing) c.log = [`✂️ เลิกจ้าง ${existing.name} จ่ายค่าปรับ ${formatMoney(terminationFee)}`, ...c.log];
      c.staff[c.userTeamId] = { ...c.staff[c.userTeamId], [specialty]: offer };
      c.log = [`🧢 จ้าง ${offer.name} เป็น${STAFF_TH[specialty]}แล้ว`, ...c.log];
      c.coachOffers[specialty] = null;
      return c;
    });
    showToast("จ้างสตาฟสำเร็จ!");
  }
  function rerollCoach(specialty) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const used = c.coachRerollCounts[specialty] || 0;
      if (used >= 5) return c;
      c.coachRerollCounts[specialty] = used + 1;
      c.coachOffers[specialty] = genCoach(specialty);
      return c;
    });
  }
  function hireManager() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const offer = c.managerOffer;
      if (!offer) return c;
      const t = c.teams.find((tm) => tm.id === c.userTeamId);
      const underContract = t.manager && t.manager.contractEndsDay != null && c.day < t.manager.contractEndsDay;
      const daysLeft = underContract ? t.manager.contractEndsDay - c.day : 0;
      const terminationFee = underContract ? Math.round((daysLeft * t.manager.weeklyWage * 1.4) / 1000) * 1000 : 0;
      const totalCost = offer.signingCost + terminationFee;
      if (c.budget < totalCost) return c;
      c.budget -= totalCost;
      if (underContract) c.log = [`✂️ เลิกสัญญา ${t.manager.name} ก่อนครบกำหนด (เหลือ ${daysLeft} วัน) จ่ายค่าปรับ ${formatMoney(terminationFee)}`, ...c.log];
      const contractDays = rand(70, 160);
      offer.contractEndsDay = c.day + contractDays;
      offer.contractDays = contractDays;
      c.log = [`📋 แต่งตั้ง ${offer.name} เป็นผจก.คนใหม่ สัญญา ${contractDays} วัน`, ...c.log];
      t.manager = offer;
      c.managerOffer = null;
      return c;
    });
    showToast("แต่งตั้งผจก.สำเร็จ!");
  }
  function terminateManager() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const t = c.teams.find((tm) => tm.id === c.userTeamId);
      if (!t.manager) return c;
      const underContract = t.manager.contractEndsDay != null && c.day < t.manager.contractEndsDay;
      const daysLeft = underContract ? t.manager.contractEndsDay - c.day : 0;
      const fee = underContract ? Math.round((daysLeft * t.manager.weeklyWage * 1.4) / 1000) * 1000 : 0;
      if (c.budget < fee) return c;
      c.budget -= fee;
      c.log = [`✂️ เลิกจ้าง ${t.manager.name} ${fee > 0 ? `จ่ายค่าปรับ ${formatMoney(fee)}` : "(หมดสัญญาแล้ว ไม่มีค่าปรับ)"}`, ...c.log];
      t.manager = null;
      return c;
    });
  }
  function rerollManager() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const used = c.managerRerollCount || 0;
      if (used >= 5) return c;
      c.managerRerollCount = used + 1;
      c.managerOffer = genManager();
      return c;
    });
  }

  /* ---------- training calendar ---------- */
  function setTrainingDay(idx, type) {
    updateCareer((prev) => { const c = JSON.parse(JSON.stringify(prev)); c.trainingPlan[idx] = type; return c; });
  }
  function toggleAutoTraining() { updateCareer((prev) => ({ ...prev, autoTraining: !prev.autoTraining })); }
  function autoAssignTraining() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const focus = ["SHOOTING", "DEFENDING", "TACKLING", "FITNESS"];
      c.trainingPlan = Array.from({ length: 10 }, (_, i) => (i % 3 === 2 ? "REST" : choice(focus)));
      c.log = [`📅 ผจก./โค้ชจัดโปรแกรมฝึก 10 วันให้อัตโนมัติแล้ว`, ...c.log];
      return c;
    });
    showToast("ผจก.จัดโปรแกรมฝึกให้แล้ว!");
  }

  /* ---------- youth academy ---------- */
  function hireScout() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      if (!c.scoutOffer || c.budget < c.scoutOffer.signingCost) return c;
      c.budget -= c.scoutOffer.signingCost;
      c.scout = c.scoutOffer; c.scoutOffer = null;
      c.log = [`🔭 จ้าง ${c.scout.name} เป็นแมวมองแล้ว`, ...c.log];
      return c;
    });
    showToast("จ้างแมวมองสำเร็จ!");
  }
  function rerollScout() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const used = c.scoutRerollCount || 0;
      if (used >= 5) return c;
      c.scoutRerollCount = used + 1;
      c.scoutOffer = genScout();
      return c;
    });
  }
  function hireAcademyManager() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      if (!c.academyManagerOffer || c.budget < c.academyManagerOffer.signingCost) return c;
      c.budget -= c.academyManagerOffer.signingCost;
      c.academyManager = c.academyManagerOffer; c.academyManagerOffer = null;
      c.log = [`🎓 แต่งตั้ง ${c.academyManager.name} เป็นผจก.อคาเดมีแล้ว`, ...c.log];
      return c;
    });
    showToast("แต่งตั้งผจก.อคาเดมีสำเร็จ!");
  }
  function rerollAcademyManager() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const used = c.academyManagerRerollCount || 0;
      if (used >= 5) return c;
      c.academyManagerRerollCount = used + 1;
      c.academyManagerOffer = genManager(true);
      return c;
    });
  }
  function signProspect(prospectId) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const p = c.youthProspects.find((x) => x.prospectId === prospectId);
      if (!p || c.budget < p.signingCost) return c;
      c.budget -= p.signingCost;
      c.academyPlayers.push({ ...p, teamId: c.userTeamId, contractEndsDay: c.day + rand(150, 400) });
      c.youthProspects = c.youthProspects.filter((x) => x.prospectId !== prospectId);
      c.log = [`✅ เซ็นดาวรุ่ง ${p.name} (${POS_TH[p.position]}) เข้าอคาเดมีแล้ว`, ...c.log];
      return c;
    });
    showToast("เซ็นดาวรุ่งสำเร็จ!");
  }
  function loanOutPlayer(playerId) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const p = c.academyPlayers.find((x) => x.id === playerId);
      if (!p || c.loans.find((l) => l.prospectId === playerId)) return c;
      const toTeam = choice(c.teams.filter((t) => !t.isUser));
      c.loans.push({ prospectId: playerId, toTeamName: toTeam.name, daysLeft: 10, totalDays: 10, log: [] });
      c.log = [`📤 ปล่อยยืมตัว ${p.name} ไป ${toTeam.name} เป็นเวลา 10 วัน`, ...c.log];
      return c;
    });
  }
  function sellAcademyPlayer(playerId) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const p = c.academyPlayers.find((x) => x.id === playerId);
      if (!p) return c;
      const price = Math.round((p.value * (0.7 + Math.random() * 0.3)) / 1000) * 1000;
      c.budget += price;
      c.academyPlayers = c.academyPlayers.filter((x) => x.id !== playerId);
      c.loans = c.loans.filter((l) => l.prospectId !== playerId);
      c.seasonAcademySales = (c.seasonAcademySales || 0) + 1;
      c.log = [`💰 ขายดาวรุ่ง ${p.name} ได้ ${formatMoney(price)}`, ...c.log];
      return c;
    });
    showToast("ขายดาวรุ่งสำเร็จ!");
  }
  function promotePlayer(playerId) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const p = c.academyPlayers.find((x) => x.id === playerId);
      if (!p) return c;
      c.players.push({ ...p, teamId: c.userTeamId });
      c.academyPlayers = c.academyPlayers.filter((x) => x.id !== playerId);
      c.log = [`⬆️ เลื่อน ${p.name} ขึ้นทีมชุดใหญ่แล้ว`, ...c.log];
      return c;
    });
    showToast("เลื่อนขึ้นทีมชุดใหญ่แล้ว!");
  }
  function chooseSeasonGoal(goalId) {
    updateCareer((prev) => ({ ...prev, seasonGoal: goalId }));
    showToast("ตั้งเป้าหมายฤดูกาลแล้ว!");
  }

  /* ============================== RENDER ============================== */
  if (loading) return <div style={{ minHeight: "100vh", background: C.pitchDark, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: C.chalk, fontFamily: DISPLAY_FONT }}>กำลังโหลด...</div></div>;
  if (!gameEntered) return <TitleScreen onEnter={() => setGameEntered(true)} hasProfile={!!profile} hasCareer={!!career} profile={profile} career={career} />;
  if (!profile) return <ProfileSetup onSave={saveProfile} />;
  if (!career) return <ClubCreator profile={profile} onCreate={startCareer} />;

  const uTeam = userTeam();
  const uSquadRaw = squadOf(uTeam.id);
  const uSquad = computeStatuses(uSquadRaw);
  const userLeague = career.leagues[uTeam.division];
  const round = userLeague.fixtures.find((r) => r.day === career.day);
  const seasonOver = !round;
  const userMatch = round ? round.matches.find((m) => m.home === uTeam.id || m.away === uTeam.id) : null;
  const opponentId = userMatch ? (userMatch.home === uTeam.id ? userMatch.away : userMatch.home) : null;
  const opponent = opponentId ? career.teams.find((t) => t.id === opponentId) : null;
  const isHome = userMatch ? userMatch.home === uTeam.id : true;
  const standings = standingsForDivision(career, uTeam.division);
  const xi = career.lineups[uTeam.id] || [];
  const oppSquadRaw = opponent ? squadOf(opponent.id) : [];
  const matchAdvice = opponent
    ? getManagerMatchAdvice(uTeam, uSquad, xi, opponent, oppSquadRaw, isHome)
    : null;
  const xiPicked = xi.filter((id) => uSquad.find((p) => p.id === id && p.injuryDays <= 0)).length;
  const xiAfterFill = fillLineupGaps(uSquad, xi, uTeam.formation).length;
  const staffWages = Object.values(career.staff[uTeam.id] || {}).reduce((s, co) => s + co.weeklyWage, 0);
  const wageBill = uSquad.reduce((s, p) => s + p.wage, 0) + staffWages + (uTeam.manager ? uTeam.manager.weeklyWage : 0);
  const marketOpen = isMarketOpen(new Date(now));

  return (
    <div style={{ minHeight: "100vh", background: C.pitchDark, color: C.chalk, paddingBottom: 78, fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>
      <div style={{ background: `linear-gradient(180deg, #14301fee, ${C.panel2}ee)`, backdropFilter: "blur(6px)", borderBottom: `1px solid ${C.steel}`, padding: "12px 16px", position: "sticky", top: 0, zIndex: 20, boxShadow: "0 2px 10px rgba(0,0,0,.3)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ClubBadge team={uTeam} size={36} />
            <div>
              <div style={{ fontFamily: DISPLAY_FONT, fontSize: 14 }}>{uTeam.name}</div>
              <div style={{ fontSize: 11, color: C.textDim }}>
                {career.playMode === "online" ? "🌐 โลกออนไลน์" : "🔒 โลกจำลอง"} · {userLeague.name} · ฤดูกาล {career.season} · วันที่ {Math.min(career.day, userLeague.fixtures.length)}/{userLeague.fixtures.length}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: MONO_FONT, color: C.amber, fontSize: 15, fontWeight: 700 }}>{formatMoney(career.budget)}</div>
            <div style={{ fontSize: 10, color: C.textDim }}>งบ · ค่าเหนื่อยรวม {formatMoney(wageBill)}/วัน</div>
          </div>
        </div>
      </div>

      {toast && <div style={{ position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)", background: C.amber, color: "#0b2318", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, zIndex: 50 }}>{toast}</div>}

      {career.liveMatch && <LiveMatchModal career={career} liveMatch={career.liveMatch} userAutoMode={uTeam.autoMode} onFinish={finishLiveMatch} suggestTacticSwitch={suggestTacticSwitch} />}

      <div style={{ maxWidth: 640, margin: "0 auto", padding: 14 }}>
        <SandboxModePanel career={career} onEnterOnline={enterOnlineMode} />
        {tab === "dashboard" && (
          <Dashboard career={career} uTeam={uTeam} standings={standings} userMatch={userMatch} opponent={opponent}
            isHome={isHome} seasonOver={seasonOver} onAdvance={advanceDay} onKickoff={kickoffUserMatch}
            onApplyManagerLineup={applyManagerLineupForMatch} onGoTactics={() => setTab("tactics")}
            matchAdvice={matchAdvice} xiPicked={xiPicked} xiAfterFill={xiAfterFill}
            onNewSeason={startNewSeason}
            wageBill={wageBill} managerOffer={career.managerOffer} onHireManager={hireManager} onRerollManager={rerollManager} onTerminateManager={terminateManager}
            onChooseSeasonGoal={chooseSeasonGoal} onAllocateSkillPoint={allocateSkillPoint} />
        )}
        {tab === "squad" && <SquadView squad={uSquad} xi={xi} onSell={sellPlayer} staff={career.staff[uTeam.id] || {}} coachOffers={career.coachOffers} coachRerollCounts={career.coachRerollCounts} budget={career.budget} onHireCoach={hireCoach} onRerollCoach={rerollCoach} currentDay={career.day} onRenewContract={renewPlayerContract} />}
        {tab === "tactics" && <TacticsView squad={uSquad} team={uTeam} xi={xi} onSetFormation={setFormation} onToggle={toggleLineupSlot} onToggleAuto={toggleAutoMode} onSetPlayerRole={setPlayerRole} />}
        {tab === "table" && <TableView career={career} userTeamId={uTeam.id} userDivision={uTeam.division} round={round} teams={career.teams} />}
        {tab === "market" && <MarketView list={career.transferList} budget={career.budget} onBid={placeBid} marketOpen={marketOpen} now={now} />}
        {tab === "training" && (
          <TrainingView trainingPlan={career.trainingPlan} autoTraining={career.autoTraining} currentSlot={(career.day - 1) % 10}
            onSetDay={setTrainingDay} onToggleAuto={toggleAutoTraining} onAutoAssign={autoAssignTraining}
            facilities={career.facilities} budget={career.budget} onUpgradeFacility={upgradeFacility} />
        )}
        {tab === "academy" && (
          <AcademyView career={career} budget={career.budget}
            onHireScout={hireScout} onRerollScout={rerollScout}
            onHireAcademyManager={hireAcademyManager} onRerollAcademyManager={rerollAcademyManager}
            onSignProspect={signProspect} onLoanOut={loanOutPlayer} onSellAcademy={sellAcademyPlayer} onPromote={promotePlayer} />
        )}
        {tab === "settings" && <SettingsView career={career} onReset={resetCareer} onEnterOnline={enterOnlineMode} />}
      </div>

      <BottomNav tab={tab} setTab={setTab} marketOpen={marketOpen} />
    </div>
  );
}

/* ============================== TITLE SCREEN ============================== */
function TitleScreen({ onEnter, hasProfile, hasCareer, profile, career }) {
  const teamName = hasCareer ? career?.teams?.find((t) => t.id === career.userTeamId)?.name : null;
  const [shareMsg, setShareMsg] = useState(null);
  const isWeb = typeof window !== "undefined" && window.location.protocol.startsWith("http");
  const playUrl = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";

  async function shareLink() {
    const text = "ลองเล่น The Socker Manager — เกมจัดการสโมสรฟุตบอล";
    try {
      if (navigator.share) {
        await navigator.share({ title: "The Socker Manager", text, url: playUrl });
        return;
      }
      await navigator.clipboard.writeText(playUrl);
      setShareMsg("คัดลอกลิงก์แล้ว — ส่งให้เพื่อนได้เลย!");
    } catch {
      setShareMsg("ไม่สามารถแชร์ได้ — คัดลอก URL จากแถบที่อยู่ด้านบน");
    }
    setTimeout(() => setShareMsg(null), 2800);
  }

  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(ellipse at 50% 20%, #1a4d32 0%, ${C.pitchDark} 55%)`, color: C.chalk, fontFamily: "'Segoe UI', Tahoma, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, boxSizing: "border-box" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.purple, background: "rgba(157,111,224,.15)", border: `1px solid ${C.purple}`, borderRadius: 20, padding: "5px 14px", marginBottom: 16 }}>
        🧪 เวอร์ชันทดลอง — เล่นฟรี ไม่ต้องสมัคร
      </div>
      <div style={{ fontSize: 56, marginBottom: 8, filter: "drop-shadow(0 4px 12px rgba(0,0,0,.4))" }}>⚽</div>
      <div style={{ fontFamily: DISPLAY_FONT, fontSize: 34, letterSpacing: 3, color: C.amber, textAlign: "center", textShadow: "0 2px 8px rgba(0,0,0,.5)" }}>THE SOCKER MANAGER</div>
      <div style={{ fontSize: 13, color: C.textDim, marginTop: 8, marginBottom: 8, textAlign: "center" }}>จัดการสโมสร · แข่งลีก · ลงสนามสด</div>
      <div style={{ fontSize: 11.5, color: C.textDim, marginBottom: 28, textAlign: "center", maxWidth: 360, lineHeight: 1.55 }}>
        สร้างสโมสร → วันมีนัดกด <b style={{ color: C.chalk }}>▶ ลงสนาม</b> · เซฟอัตโนมัติในเบราว์เซอร์นี้
      </div>

      {hasCareer && teamName && (
        <div style={{ fontSize: 12, color: C.chalk, marginBottom: 16, padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,.06)", border: `1px solid ${C.steel}` }}>
          {profile?.avatar} {profile?.name} · {teamName} · ฤดูกาล {career.season} วันที่ {career.day}
        </div>
      )}

      <button
        onClick={onEnter}
        style={{ ...btnStyle(C.amber, "#0b2318"), width: "min(320px, 90vw)", fontSize: 18, padding: "18px 0", letterSpacing: 2 }}
      >
        ▶ {hasCareer ? "เข้าเล่น" : "ลองเล่นเลย"}
      </button>

      {isWeb && (
        <button
          onClick={shareLink}
          style={{ ...btnStyle(C.steel, C.chalk), width: "min(320px, 90vw)", fontSize: 13, padding: "12px 0", marginTop: 10, letterSpacing: 0.5 }}
        >
          🔗 แชร์ลิงก์ให้เพื่อนลองเล่น
        </button>
      )}
      {shareMsg && <div style={{ fontSize: 11, color: C.good, marginTop: 8, textAlign: "center" }}>{shareMsg}</div>}

      <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 20, textAlign: "center", maxWidth: 340, lineHeight: 1.55 }}>
        โหมดออนไลน์แข่งกับผู้เล่นจริงกำลังพัฒนา — ตอนนี้เล่นโลกจำลองกับบอทได้เต็มรูปแบบ
      </div>
    </div>
  );
}

/* ============================== TEAM PICKER ============================== */
const AVATAR_CHOICES = ["⚽", "🎯", "🏆", "👔", "🧢", "📋", "🔥", "⭐", "🦁", "🛡️"];
function ProfileSetup({ onSave }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_CHOICES[0]);
  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(circle at 50% 0%, #163a28, ${C.pitchDark} 60%)`, color: C.chalk, padding: 20, fontFamily: "'Segoe UI', Tahoma, sans-serif", display: "flex", alignItems: "center" }}>
      <div style={{ maxWidth: 420, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 30, letterSpacing: 2, color: C.amber }}>THE SOCKER MANAGER</div>
          <div style={{ fontSize: 12.5, color: C.textDim, marginTop: 6 }}>สร้างโปรไฟล์ผู้จัดการก่อนเริ่มเกม (บันทึกไว้ในเครื่องนี้)</div>
        </div>
        <Panel>
          <SectionLabel>ชื่อผู้จัดการ</SectionLabel>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ผจก. อธิป" maxLength={24} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${C.steel}`, background: C.panel2, color: C.chalk, fontSize: 14, marginBottom: 16, boxSizing: "border-box" }} />
          <SectionLabel>เลือกไอคอนโปรไฟล์</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 18 }}>
            {AVATAR_CHOICES.map((a) => (
              <button key={a} onClick={() => setAvatar(a)} style={{ fontSize: 22, padding: "10px 0", borderRadius: 10, border: `2px solid ${avatar === a ? C.amber : C.steel}`, background: avatar === a ? "rgba(224,164,88,.15)" : C.panel2, cursor: "pointer" }}>{a}</button>
            ))}
          </div>
          <button disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), avatar })} style={btnStyle(name.trim() ? C.amber : "#2b332f", name.trim() ? "#0b2318" : C.textDim)}>เข้าสู่ระบบ</button>
        </Panel>
      </div>
    </div>
  );
}

function ClubCreator({ profile, onCreate }) {
  const [name, setName] = useState("");
  const [logoIndex, setLogoIndex] = useState(0);
  const [primaryColor, setPrimaryColor] = useState("#c1440e");
  const [secondaryColor, setSecondaryColor] = useState("#f2f0e6");
  const [shirtColor, setShirtColor] = useState("#c1440e");
  const [shortsColor, setShortsColor] = useState("#0b2318");
  const short = name.trim().slice(0, 3).toUpperCase() || "CLB";
  const previewTeam = { color: primaryColor, secondaryColor, logoIndex };
  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(circle at 50% 0%, #163a28, ${C.pitchDark} 60%)`, color: C.chalk, padding: 20, paddingBottom: 40, fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ textAlign: "center", margin: "10px 0 20px" }}>
          <div style={{ fontSize: 13, color: C.textDim }}>{profile.avatar} สวัสดี, {profile.name}</div>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 24, letterSpacing: 1.5, color: C.amber, marginTop: 4 }}>สร้างสโมสรของคุณ</div>
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>เริ่มในโลกจำลอง — ปั้นมูลค่าสโมสรรวมทุกอย่างให้ถึง 50M+ เพื่อปลดล็อกออนไลน์</div>
        </div>

        <Panel style={{ marginBottom: 12 }}>
          <SectionLabel>ชื่อสโมสร</SectionLabel>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น กรุงเทพ ยูไนเต็ด" maxLength={30} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${C.steel}`, background: C.panel2, color: C.chalk, fontSize: 14, boxSizing: "border-box" }} />
        </Panel>

        <Panel style={{ marginBottom: 12 }}>
          <SectionLabel>ตราสโมสร (เลือก 1 จาก 10)</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {LOGO_ICONS.map((logo, i) => (
              <button key={logo.id} onClick={() => setLogoIndex(i)} style={{ padding: 6, borderRadius: 10, border: `2px solid ${logoIndex === i ? C.amber : "transparent"}`, background: "transparent", cursor: "pointer" }}>
                <ClubBadge team={{ color: primaryColor, secondaryColor, logoIndex: i }} size={40} />
              </button>
            ))}
          </div>
        </Panel>

        <Panel style={{ marginBottom: 12 }}>
          <SectionLabel>สีตราสโมสร</SectionLabel>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 14 }}>
            <ColorField label="สีพื้น" value={primaryColor} onChange={setPrimaryColor} />
            <ColorField label="สีตราสัญลักษณ์" value={secondaryColor} onChange={setSecondaryColor} />
            <div style={{ marginLeft: "auto" }}><ClubBadge team={previewTeam} size={54} /></div>
          </div>
          <SectionLabel>ชุดแข่ง</SectionLabel>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <ColorField label="สีเสื้อ" value={shirtColor} onChange={setShirtColor} />
            <ColorField label="สีกางเกง" value={shortsColor} onChange={setShortsColor} />
            <div style={{ marginLeft: "auto" }}><KitPreview shirt={shirtColor} shorts={shortsColor} trim={secondaryColor} size={64} /></div>
          </div>
        </Panel>

        <button
          disabled={!name.trim()}
          onClick={() => onCreate({ name: name.trim(), short, logoIndex, primaryColor, secondaryColor, shirtColor, shortsColor })}
          style={btnStyle(name.trim() ? C.amber : "#2b332f", name.trim() ? "#0b2318" : C.textDim)}
        >เริ่มอาชีพผู้จัดการ</button>
      </div>
    </div>
  );
}
function ColorField({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ fontSize: 9.5, color: C.textDim }}>{label}</div>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 42, height: 34, border: `1px solid ${C.steel}`, borderRadius: 8, background: "none", cursor: "pointer", padding: 0 }} />
    </div>
  );
}

/* ============================== SANDBOX / ONLINE UNLOCK ============================== */
function SandboxModePanel({ career, onEnterOnline }) {
  const fin = computeTeamFinances(career);
  const pct = clamp((fin.teamValue / ONLINE_UNLOCK_TEAM_VALUE) * 100, 0, 100);
  const unlocked = career.onlineUnlocked;
  const inOnline = career.playMode === "online";
  const valueOk = fin.teamValue >= 0;

  const breakdown = [
    ["นักเตะทีมชุดใหญ่", fin.squadValue],
    ["อคาเดมี", fin.academyValue],
    ["ดาวรุ่งที่แมวมองพบ", fin.prospectValue],
    ["ศูนย์ฝึก (4 อาคาร)", fin.facilitiesValue],
    ["โค้ชทีม", fin.coachesValue],
    ["ผจก.ทีม", fin.managerValue],
    ["แมวมอง", fin.scoutValue],
    ["ผจก.อคาเดมี", fin.academyMgrValue],
    ["งบสำรอง (เงินสด)", fin.budget],
  ];

  if (inOnline) {
    return (
      <Panel style={{ marginBottom: 12, border: `1px solid ${C.good}` }}>
        <SectionLabel style={{ color: C.good }}>🌐 โหมดออนไลน์</SectionLabel>
        <div style={{ fontSize: 12.5, color: C.textDim, lineHeight: 1.7 }}>
          คุณผ่านโลกจำลองแล้ว — พร้อมแข่งกับผู้เล่นจริงเมื่อเซิร์ฟเวอร์เปิด
          <br />มูลค่าสโมสรรวม: <span style={{ color: C.amber, fontFamily: MONO_FONT }}>{formatMoney(fin.teamValue)}</span>
        </div>
      </Panel>
    );
  }

  return (
    <Panel style={{ marginBottom: 12, border: `1px solid ${unlocked ? C.good : C.purple}` }}>
      <SectionLabel style={{ color: unlocked ? C.good : C.purple }}>🔒 โลกจำลอง — เล่นคนเดียว</SectionLabel>
      <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.65, marginBottom: 10 }}>
        ปั้นสโมสรในโลกจำลอง — มูลค่ารวมทุกสินทรัพย์ต้องถึง 50M และไม่ติดลบ
      </div>
      <div style={{ fontSize: 11.5, marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
        <span>มูลค่าสโมสรรวมทุกอย่าง</span>
        <span style={{ fontFamily: MONO_FONT, color: fin.teamValue >= ONLINE_UNLOCK_TEAM_VALUE ? C.good : C.amber }}>
          {formatMoney(fin.teamValue)} / {formatMoney(ONLINE_UNLOCK_TEAM_VALUE)}
        </span>
      </div>
      <MiniBar value={pct} color={fin.teamValue >= ONLINE_UNLOCK_TEAM_VALUE ? C.good : C.purple} />
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 3 }}>
        {breakdown.map(([label, val]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, fontFamily: MONO_FONT }}>
            <span style={{ color: C.textDim }}>{label}</span>
            <span style={{ color: val < 0 ? C.crimson : C.chalk }}>{formatMoney(val)}</span>
          </div>
        ))}
      </div>
      {!valueOk && (
        <div style={{ fontSize: 11, color: C.crimson, marginTop: 8 }}>
          ⚠️ มูลค่ารวมติดลบ — ขายนักเตะ / ลดค่าใช้จ่าย / รอรายได้แมตช์
        </div>
      )}
      <div style={{ fontSize: 11, color: C.textDim, marginTop: 6 }}>
        เงื่อนไขปลดล็อก: มูลค่ารวม ≥ 50M฿ และ ≥ 0
      </div>
      {unlocked && valueOk && (
        <button onClick={onEnterOnline} style={{ ...btnStyle(C.good, "#08150e"), marginTop: 12 }}>
          🌐 เข้าสู่โลกออนไลน์
        </button>
      )}
      {unlocked && !valueOk && (
        <div style={{ fontSize: 11, color: C.amber, marginTop: 10 }}>ปลดล็อกแล้ว แต่มูลค่ารวมต้องไม่ติดลบก่อนเข้าออนไลน์</div>
      )}
    </Panel>
  );
}

/* ============================== DASHBOARD ============================== */
function Dashboard({ career, uTeam, standings, userMatch, opponent, isHome, seasonOver, onAdvance, onKickoff, onApplyManagerLineup, onGoTactics, matchAdvice, xiPicked, xiAfterFill, onNewSeason, wageBill, managerOffer, onHireManager, onRerollManager, onTerminateManager, onChooseSeasonGoal, onAllocateSkillPoint }) {
  const posInTable = standings.findIndex((s) => s.team.id === uTeam.id) + 1;
  const myRow = standings.find((s) => s.team.id === uTeam.id);
  const mgr = uTeam.manager;
  const daysLeftOnContract = mgr && mgr.contractEndsDay != null ? mgr.contractEndsDay - career.day : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel>
        <SectionLabel>โปรแกรมวันนี้</SectionLabel>
        {seasonOver ? (
          <div>
            <div style={{ fontFamily: DISPLAY_FONT, fontSize: 16, color: C.amber, marginBottom: 8 }}>จบฤดูกาล {career.season} แล้ว</div>
            <div style={{ fontSize: 13, color: C.textDim, marginBottom: 12 }}>อันดับสุดท้ายของทีมคุณ: {posInTable} จาก {standings.length}</div>
            <button onClick={onNewSeason} style={btnStyle(C.amber, "#0b2318")}>เริ่มฤดูกาลใหม่ (นักเตะอายุ+1 / รีไทร์ที่ 36)</button>
          </div>
        ) : opponent ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: "10px 0" }}>
              <TeamChip team={uTeam} /><div style={{ fontFamily: DISPLAY_FONT, color: C.textDim, fontSize: 13 }}>{isHome ? "เหย้า" : "เยือน"} vs</div><TeamChip team={opponent} />
            </div>

            {uTeam.autoMode ? (
              <div style={{ fontSize: 11.5, color: C.purple, textAlign: "center", marginBottom: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(128,90,213,.12)", border: `1px solid ${C.purple}` }}>
                โหมดออโต้เปิด — ผจก.จัดแผน+ตัวจริงให้ทุกนัด (ปรับกลางเกมได้)
              </div>
            ) : (
              <Panel style={{ marginBottom: 10, padding: 12, border: `1px solid ${C.steel}` }}>
                <SectionLabel style={{ marginBottom: 6 }}>💡 คำแนะนำผจก.</SectionLabel>
                {matchAdvice?.tips.map((tip, i) => (
                  <div key={i} style={{ fontSize: 11.5, color: i === 0 ? C.chalk : C.textDim, marginBottom: 4, fontFamily: MONO_FONT }}>• {tip}</div>
                ))}
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 8, fontFamily: MONO_FONT }}>
                  ตัวจริงที่เลือก: {xiPicked}/11 · หลังเติมอัตโนมัติ: {xiAfterFill}/11 · แผน {uTeam.formation}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <button onClick={onGoTactics} style={{ ...btnStyle(C.steel, C.chalk), flex: 1, minWidth: 120, padding: "10px 0", fontSize: 12 }}>จัดทีมเอง</button>
                  <button onClick={onApplyManagerLineup} style={{ ...btnStyle(C.purple, "#fff"), flex: 1, minWidth: 120, padding: "10px 0", fontSize: 12 }}>ผจก.จัดให้ (นัดนี้)</button>
                </div>
              </Panel>
            )}

            <button onClick={onKickoff} style={btnStyle(C.amber, "#0b2318")}>
              ▶ ลงสนาม (แข่งสด)
            </button>
            <div style={{ fontSize: 10, color: C.textDim, textAlign: "center", marginTop: 6 }}>
              {xiAfterFill < 11 ? "ทีมไม่พอ 11 คน — ตรวจสอบบาดเจ็บ/ตัวสำรอง" : "ช่องว่างใน XI จะเติมอัตโนมัติก่อนเริ่มเกม"}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: C.textDim, marginBottom: 10 }}>วันนี้ทีมคุณว่าง — แมตช์อื่นในลีกแข่งกันตามปกติ</div>
            <button onClick={onAdvance} style={btnStyle(C.steel, C.chalk)}>▶ ข้ามไปวันถัดไป</button>
          </div>
        )}
      </Panel>

      <Panel style={{ border: `1px solid ${C.gold}` }}>
        <SectionLabel style={{ color: C.gold }}>เป้าหมายฤดูกาลนี้</SectionLabel>
        {career.seasonGoal ? (
          <div style={{ fontSize: 12.5 }}>🎯 {SEASON_GOAL_TEMPLATES.find((g) => g.id === career.seasonGoal)?.label} <span style={{ color: C.textDim }}>— สำเร็จแล้วรับ {formatMoney(SEASON_GOAL_TEMPLATES.find((g) => g.id === career.seasonGoal)?.reward || 0)} ตอนจบฤดูกาล</span></div>
        ) : career.seasonGoalOptions && career.seasonGoalOptions.length ? (
          <div>
            <div style={{ fontSize: 11.5, color: C.textDim, marginBottom: 8 }}>เลือกเป้าหมายฤดูกาลนี้ 1 ข้อ สำเร็จแล้วรับโบนัสงบประมาณ</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {career.seasonGoalOptions.map((g) => (
                <button key={g.id} onClick={() => onChooseSeasonGoal(g.id)} style={{ textAlign: "left", padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.steel}`, background: C.panel2, color: C.chalk, cursor: "pointer" }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{g.label}</div>
                  <div style={{ fontSize: 10.5, color: C.amber, fontFamily: MONO_FONT }}>รางวัล {formatMoney(g.reward)}</div>
                </button>
              ))}
            </div>
          </div>
        ) : <div style={{ fontSize: 12, color: C.textDim }}>ไม่มีเป้าหมายให้เลือกตอนนี้</div>}
      </Panel>

      <Panel>
        <SectionLabel>เควสประจำสัปดาห์</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(career.weeklyQuests || []).map((q) => {
            const progress = (career.weeklyProgress || {})[q.metric] || 0;
            const done = (career.weeklyRewarded || []).includes(q.id);
            return (
              <div key={q.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
                  <span style={{ color: done ? C.good : C.chalk }}>{done ? "✅ " : ""}{q.label}</span>
                  <span style={{ fontFamily: MONO_FONT, color: C.amber }}>{formatMoney(q.reward)}</span>
                </div>
                <MiniBar value={Math.min(100, (progress / q.target) * 100)} color={done ? C.good : C.amber} />
              </div>
            );
          })}
          {(!career.weeklyQuests || career.weeklyQuests.length === 0) && <div style={{ fontSize: 12, color: C.textDim }}>ไม่มีเควสตอนนี้</div>}
        </div>
      </Panel>

      {mgr && (
        <Panel>
          <SectionLabel>ผจก.ปัจจุบัน</SectionLabel>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{mgr.name} <span style={{ color: C.gold, fontFamily: MONO_FONT, fontSize: 11 }}>Lv.{mgr.level || 1}</span></div>
          <div style={{ fontSize: 11, color: C.textDim, fontFamily: MONO_FONT, marginBottom: 4 }}>
            ถนัด {mgr.preferredFormation} · ผลงาน {mgr.wins}ช-{mgr.draws}ส-{mgr.losses}พ
            {daysLeftOnContract != null && (daysLeftOnContract > 0 ? ` · สัญญาเหลือ ${daysLeftOnContract} วัน` : " · หมดสัญญาแล้ว")}
          </div>
          <MiniBar value={((mgr.xp || 0) / ((mgr.level || 1) * 80)) * 100} color={C.gold} />
          <div style={{ marginTop: 8 }}><RadarStats stats={mgr.stats} /></div>
          {(mgr.skillPoints || 0) > 0 && (
            <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(244,201,93,.1)", border: `1px solid ${C.gold}` }}>
              <div style={{ fontSize: 11, color: C.gold, marginBottom: 6 }}>🌟 มีแต้มสกิล {mgr.skillPoints} แต้ม — เลือกเพิ่มสเตต</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.keys(MANAGER_STAT_TH).map((k) => (
                  <button key={k} onClick={() => onAllocateSkillPoint(k)} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.gold}`, background: "transparent", color: C.gold, cursor: "pointer" }}>+{MANAGER_STAT_TH[k]}</button>
                ))}
              </div>
            </div>
          )}
          <button onClick={onTerminateManager} style={{ ...btnStyle("transparent", C.crimson), border: `1px solid ${C.crimson}`, marginTop: 10 }}>
            {daysLeftOnContract > 0 ? "เลิกจ้าง (มีค่าปรับ)" : "เลิกจ้าง"}
          </button>
        </Panel>
      )}

      {managerOffer && (
        <Panel style={{ border: `1px solid ${C.purple}` }}>
          <SectionLabel style={{ color: C.purple }}>ผจก.ผู้สมัครใหม่</SectionLabel>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{managerOffer.name} — ถนัด {managerOffer.preferredFormation}</div>
          <div style={{ fontSize: 11, color: C.textDim, fontFamily: MONO_FONT, margin: "4px 0 8px" }}>ค่าแต่งตั้ง {formatMoney(managerOffer.signingCost)} · ค่าเหนื่อย {formatMoney(managerOffer.weeklyWage)}/วัน · สัญญา ~70-160 วัน</div>
          {mgr && daysLeftOnContract > 0 && <div style={{ fontSize: 10.5, color: C.crimson, marginBottom: 8 }}>⚠️ {mgr.name} ยังติดสัญญาอีก {daysLeftOnContract} วัน — แต่งตั้งคนใหม่ตอนนี้จะถูกหักค่าปรับเลิกสัญญาด้วย</div>}
          <div style={{ marginBottom: 10 }}><RadarStats stats={managerOffer.stats} /></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onHireManager} style={{ ...btnStyle(C.purple, "#fff"), flex: 1 }}>แต่งตั้ง</button>
            <button disabled={(career.managerRerollCount || 0) >= 5} onClick={onRerollManager} style={{ ...btnStyle((career.managerRerollCount || 0) >= 5 ? "#2b332f" : C.steel, (career.managerRerollCount || 0) >= 5 ? C.textDim : C.chalk), flex: 1 }}>สุ่มใหม่ ({5 - (career.managerRerollCount || 0)} เหลือวันนี้)</button>
          </div>
        </Panel>
      )}

      <Panel>
        <SectionLabel>อันดับทีมคุณ</SectionLabel>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 30, color: C.amber }}>#{posInTable}</div>
          <div style={{ fontSize: 12, color: C.textDim, fontFamily: MONO_FONT }}>{myRow ? `${myRow.played} นัด · ${myRow.w}ชนะ ${myRow.d}เสมอ ${myRow.l}แพ้ · ${myRow.pts} แต้ม` : ""}</div>
        </div>
      </Panel>

      {career.lastChampMaster && (
        <Panel style={{ border: `1px solid ${C.gold}` }}>
          <SectionLabel style={{ color: C.gold }}>🏆 Champ Master (ฤดูกาลที่ {career.lastChampMaster.season - 1})</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {career.lastChampMaster.rounds.map((r, ri) => (
              <div key={ri}>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: ri > 0 ? 6 : 0 }}>{r.name}</div>
                {r.matches.map((m, mi) => (
                  <div key={mi} style={{ fontSize: 11.5, fontFamily: MONO_FONT }}>
                    <span style={{ color: m.winnerShort === m.a ? C.gold : C.textDim }}>{m.a}</span> {m.gA}-{m.gB} <span style={{ color: m.winnerShort === m.b ? C.gold : C.textDim }}>{m.b}</span>{m.extraTime ? " (ต่อเวลา)" : ""}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel>
        <SectionLabel>ผลข่าวล่าสุด</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
          {career.log.slice(0, 14).map((l, i) => <div key={i} style={{ fontSize: 12.5, color: i === 0 ? C.chalk : C.textDim, fontFamily: MONO_FONT, lineHeight: 1.5 }}>{l}</div>)}
        </div>
      </Panel>
    </div>
  );
}
function TeamChip({ team }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <ClubBadge team={team} size={46} />
      <div style={{ fontSize: 11, color: C.textDim, maxWidth: 90, textAlign: "center" }}>{team.name}</div>
    </div>
  );
}

/* ============================== SQUAD ============================== */
function SquadView({ squad, xi, onSell, staff, coachOffers, coachRerollCounts, budget, onHireCoach, onRerollCoach, currentDay, onRenewContract }) {
  const groups = ["GK", "DF", "MF", "FW"];
  const sorted = [...squad].sort((a, b) => b.rating - a.rating);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel>
        <SectionLabel>สตาฟทีม</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {STAFF_SPECS.map((spec) => {
            const co = staff[spec];
            const offer = coachOffers ? coachOffers[spec] : null;
            const rerolls = (coachRerollCounts && coachRerollCounts[spec]) || 0;
            const terminationFee = co ? Math.round((co.weeklyWage * 8) / 1000) * 1000 : 0;
            return (
              <div key={spec} style={{ padding: "8px 10px", borderRadius: 8, background: co ? "rgba(111,174,90,.1)" : C.panel2, border: `1px solid ${co ? C.good : C.steel}` }}>
                <div style={{ fontSize: 11, fontFamily: MONO_FONT, color: C.textDim, marginBottom: 4 }}>{STAFF_TH[spec]}</div>
                {co && <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>{co.name} (เกรด {co.grade}/5, +{co.boost})</div>}
                {offer ? (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{offer.name} (เกรด {offer.grade}/5)</div>
                    <div style={{ fontSize: 10.5, color: C.textDim, fontFamily: MONO_FONT, margin: "3px 0 6px" }}>
                      ค่าแรกเข้า {formatMoney(offer.signingCost)} · ค่าเหนื่อย {formatMoney(offer.weeklyWage)}/วัน{co ? ` · +ค่าปรับเลิกจ้างคนเดิม ${formatMoney(terminationFee)}` : ""} · รีแล้ว {rerolls}/5 วันนี้
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button disabled={budget < offer.signingCost + terminationFee} onClick={() => onHireCoach(spec)} style={{ fontSize: 10.5, padding: "5px 10px", borderRadius: 6, border: "none", background: budget >= offer.signingCost + terminationFee ? C.good : "#2b332f", color: budget >= offer.signingCost + terminationFee ? "#08150e" : C.textDim, cursor: "pointer", fontWeight: 700 }}>{co ? "จ้างแทนคนเดิม" : "จ้าง"}</button>
                      <button disabled={rerolls >= 5} onClick={() => onRerollCoach(spec)} style={{ fontSize: 10.5, padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.steel}`, background: "transparent", color: rerolls >= 5 ? C.textDim : C.chalk, cursor: rerolls >= 5 ? "not-allowed" : "pointer" }}>สุ่มใหม่ ({5 - rerolls} เหลือ)</button>
                    </div>
                  </div>
                ) : <div style={{ fontSize: 10.5, color: C.textDim }}>ไม่มีผู้สมัครตอนนี้ รอรอบถัดไป</div>}
              </div>
            );
          })}
        </div>
      </Panel>
      {groups.map((g) => (
        <Panel key={g}>
          <SectionLabel>{POS_TH[g]} ({sorted.filter((p) => p.position === g).length})</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sorted.filter((p) => p.position === g).map((p) => (
              <PlayerRow key={p.id} p={p} isXI={xi.includes(p.id)} onSell={onSell} currentDay={currentDay} budget={budget} onRenewContract={onRenewContract} />
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}
function attrGroupAvg(p, group) { return ATTR_GROUPS[group].reduce((s, k) => s + p.attrs[k], 0) / ATTR_GROUPS[group].length; }
function PlayerRow({ p, isXI, onSell, currentDay, budget, onRenewContract }) {
  const [open, setOpen] = useState(false);
  const daysLeft = p.contractEndsDay != null && currentDay != null ? p.contractEndsDay - currentDay : null;
  const contractColor = daysLeft == null ? C.textDim : daysLeft > 60 ? C.good : daysLeft > 20 ? C.amber : C.crimson;
  const renewFee = Math.round((p.value * 0.06) / 1000) * 1000;
  return (
    <div style={{ borderBottom: `1px solid ${C.steel}`, padding: "6px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <RatingBadge value={p.rating} />
        <div style={{ flex: 1, minWidth: 0 }} onClick={() => setOpen((o) => !o)} role="button">
          <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {p.name}
            {isXI && <span style={{ fontSize: 9, background: C.good, color: "#08150e", borderRadius: 4, padding: "1px 5px" }}>ตัวจริง</span>}
            {p.injuryDays > 0 && <span style={{ fontSize: 9, background: C.crimson, color: "#fff", borderRadius: 4, padding: "1px 5px" }}>เจ็บ {p.injuryDays}วัน</span>}
            <span style={{ fontSize: 9, background: STATUS_COLOR[p.status], color: "#08150e", borderRadius: 4, padding: "1px 5px" }}>{STATUS_TH[p.status]}</span>
            {daysLeft != null && <span style={{ fontSize: 9, background: contractColor, color: "#08150e", borderRadius: 4, padding: "1px 5px" }}>สัญญา {daysLeft > 0 ? `${daysLeft}วัน` : "หมดอายุ"}</span>}
          </div>
          <div style={{ fontSize: 11, color: C.textDim, fontFamily: MONO_FONT }}>
            อายุ {p.age} · <span style={{ color: GROUP_COLOR.technical }}>TEC {Math.round(attrGroupAvg(p, "technical"))}</span> · <span style={{ color: GROUP_COLOR.mental }}>MEN {Math.round(attrGroupAvg(p, "mental"))}</span> · <span style={{ color: GROUP_COLOR.physical }}>PHY {Math.round(attrGroupAvg(p, "physical"))}</span> · ศักยภาพ {bandOf(p.potential)}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <div style={{ flex: 1 }}><MiniBar value={p.stamina} color={p.stamina > 60 ? C.good : p.stamina > 30 ? C.amber : C.crimson} /></div>
            <div style={{ flex: 1 }}><MiniBar value={p.morale} color={C.blue} /></div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: C.amber, fontFamily: MONO_FONT }}>{formatMoney(p.value)}</div>
          <button onClick={() => onSell(p.id)} style={{ marginTop: 4, background: "transparent", border: `1px solid ${C.crimson}`, color: C.crimson, borderRadius: 6, fontSize: 10, padding: "2px 8px", cursor: "pointer" }}>ขาย</button>
        </div>
      </div>
      {daysLeft != null && daysLeft <= 60 && onRenewContract && (
        <div style={{ marginTop: 6, marginLeft: 40, display: "flex", alignItems: "center", gap: 8 }}>
          <button disabled={budget < renewFee} onClick={() => onRenewContract(p.id)} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.good}`, background: budget >= renewFee ? "rgba(111,174,90,.15)" : "transparent", color: budget >= renewFee ? C.good : C.textDim, cursor: budget >= renewFee ? "pointer" : "not-allowed" }}>ต่อสัญญา ({formatMoney(renewFee)})</button>
          {daysLeft <= 20 && <span style={{ fontSize: 10, color: C.crimson }}>⚠️ ใกล้หมดสัญญา ถ้าไม่ต่อจะออกฟรี</span>}
        </div>
      )}
      {open && (
        <div style={{ marginTop: 8, paddingLeft: 40, display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.keys(ATTR_GROUPS).map((grp) => (
            <div key={grp}>
              <div style={{ fontSize: 9.5, color: GROUP_COLOR[grp], marginBottom: 3, fontWeight: 700 }}>{GROUP_TH[grp]}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {ATTR_GROUPS[grp].map((k) => (
                  <div key={k}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.textDim }}><span>{ATTR_TH[k]}</span><span style={{ fontFamily: MONO_FONT, color: C.chalk }}>{p.attrs[k]}</span></div>
                    <MiniBar value={(p.attrs[k] / 20) * 100} color={GROUP_COLOR[grp]} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ textAlign: "center", marginTop: 4 }}>
        <button onClick={() => setOpen((o) => !o)} style={{ background: "transparent", border: "none", color: C.textDim, fontSize: 10, cursor: "pointer" }}>{open ? "▲ ซ่อนแอตทริบิวต์" : "▼ ดูแอตทริบิวต์เต็ม (15 ค่า)"}</button>
      </div>
    </div>
  );
}

/* ============================== TACTICS ============================== */
function TacticsView({ squad, team, xi, onSetFormation, onToggle, onToggleAuto, onSetPlayerRole }) {
  const formation = team.formation;
  const slots = FORMATIONS[formation].slots;
  const xiPlayers = squad.filter((p) => xi.includes(p.id));
  const assign = { GK: [], DF: [], MF: [], FW: [] };
  xiPlayers.forEach((p) => assign[p.position].push(p));
  const posCounters = { GK: 0, DF: 0, MF: 0, FW: 0 };
  // manager recommendation: best average XI rating per formation
  const recommend = FORMATION_KEYS.map((f) => {
    const bestXI = getBestXI(squad, f);
    const avg = bestXI.length ? bestXI.reduce((s, id) => s + squad.find((p) => p.id === id).rating, 0) / bestXI.length : 0;
    const fit = team.manager && team.manager.preferredFormation === f ? avg * 1.06 : avg;
    return { f, score: fit };
  }).sort((a, b) => b.score - a.score);
  const best = recommend[0];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel style={{ border: `1px solid ${C.purple}` }}>
        <SectionLabel style={{ color: C.purple }}>โหมดควบคุม</SectionLabel>
        <div style={{ fontSize: 12, color: C.textDim, marginBottom: 8 }}>
          {team.autoMode
            ? "สายรันยาว: ผจก.จัดแผน+ตัวจริงทุกนัด และปรับกลางเกมให้"
            : "คุณจัดทีมเอง — วันแข่งเลือกได้ว่าจัดเองหรือให้ผจก.ช่วยนัดนั้น"}
        </div>
        <button onClick={onToggleAuto} style={btnStyle(team.autoMode ? C.purple : C.steel, team.autoMode ? "#fff" : C.chalk)}>{team.autoMode ? "ปิดโหมดออโต้ (คุมเอง)" : "เปิดโหมดออโต้ (รันยาว)"}</button>
        {team.manager && !team.autoMode && <div style={{ fontSize: 11, color: C.textDim, marginTop: 8 }}>💡 ผจก.แนะนำ: แผน <b style={{ color: C.amber }}>{best.f}</b> เหมาะกับสควอดตอนนี้ที่สุด</div>}
      </Panel>
      <Panel>
        <SectionLabel>รูปแบบการเล่น</SectionLabel>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {FORMATION_KEYS.map((f) => (
            <button key={f} onClick={() => onSetFormation(f)} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${f === formation ? C.amber : C.steel}`, background: f === formation ? C.amber : "transparent", color: f === formation ? "#0b2318" : C.chalk, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{f}{team.manager && team.manager.preferredFormation === f ? " ★" : ""}</button>
          ))}
        </div>
      </Panel>
      <Panel style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ position: "relative", width: "100%", paddingTop: "130%", background: `repeating-linear-gradient(0deg, ${C.pitch}, ${C.pitch} 11%, #123322 11%, #123322 22%)` }}>
          <div style={{ position: "absolute", inset: 8, border: `2px solid ${C.pitchLine}`, opacity: 0.5, borderRadius: 4 }} />
          <div style={{ position: "absolute", left: "50%", top: 8, bottom: 8, width: 2, background: C.pitchLine, opacity: 0.5, transform: "translateX(-1px)" }} />
          <div style={{ position: "absolute", left: "50%", top: "50%", width: 70, height: 70, border: `2px solid ${C.pitchLine}`, opacity: 0.5, borderRadius: "50%", transform: "translate(-50%,-50%)" }} />
          {slots.map((slot, i) => {
            const idx = posCounters[slot.pos]++;
            const player = assign[slot.pos][idx];
            return (
              <div key={i} style={{ position: "absolute", left: `${slot.x}%`, top: `${slot.y}%`, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", width: 62 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: player ? POS_COLOR[slot.pos] : "#3a4a42", border: `2px solid ${C.chalk}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO_FONT, fontSize: 10, fontWeight: 700, color: "#08150e" }}>{player ? player.rating : "?"}</div>
                <div style={{ fontSize: 9, color: C.chalk, textAlign: "center", marginTop: 2, background: "rgba(0,0,0,.45)", borderRadius: 3, padding: "0 3px", maxWidth: 62, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player ? player.name.split(" ")[1] || player.name : "ว่าง"}</div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel>
        <SectionLabel>หน้าที่ผู้เล่น (Player Roles)</SectionLabel>
        <div style={{ fontSize: 11, color: C.textDim, marginBottom: 8 }}>ปรับเฉพาะตัวจริง: "บุก" เพิ่มพลังรุกของคนนั้น -พลังรับ, "รับ" กลับกัน, "สมดุล" ค่าปกติ</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {xiPlayers.sort((a, b) => (a.position > b.position ? 1 : -1)).map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11.5, flex: 1, color: POS_COLOR[p.position] }}>{p.name}</span>
              {["defensive", "balanced", "attacking"].map((r) => (
                <button key={r} onClick={() => onSetPlayerRole(p.id, r)} style={{
                  fontSize: 9.5, padding: "4px 8px", borderRadius: 6, cursor: "pointer",
                  border: `1px solid ${(p.role || "balanced") === r ? ROLE_COLOR[r] : C.steel}`,
                  background: (p.role || "balanced") === r ? `${ROLE_COLOR[r]}22` : "transparent",
                  color: (p.role || "balanced") === r ? ROLE_COLOR[r] : C.textDim,
                }}>{ROLE_TH[r]}</button>
              ))}
            </div>
          ))}
          {xiPlayers.length === 0 && <div style={{ fontSize: 11, color: C.textDim }}>ยังไม่มีตัวจริง</div>}
        </div>
      </Panel>

      {!team.autoMode && (
        <Panel>
          <SectionLabel>เลือกผู้เล่นตัวจริง ({xi.length}/11)</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {["GK", "DF", "MF", "FW"].map((pos) => (
              <div key={pos}>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 6, textTransform: "uppercase", letterSpacing: 1 }}>{POS_TH[pos]}</div>
                {squad.filter((p) => p.position === pos).sort((a, b) => b.rating - a.rating).map((p) => {
                  const active = xi.includes(p.id);
                  const hurt = p.injuryDays > 0;
                  return (
                    <button key={p.id} disabled={hurt} onClick={() => onToggle(p.id)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", background: active ? C.steelLight : "transparent", border: "none", borderRadius: 6, padding: "6px 8px", cursor: hurt ? "not-allowed" : "pointer", color: hurt ? C.textDim : C.chalk, marginTop: 2, opacity: hurt ? 0.5 : 1 }}>
                      <RatingBadge value={p.rating} /><span style={{ fontSize: 12.5, flex: 1 }}>{p.name}{hurt ? ` (เจ็บ ${p.injuryDays}วัน)` : ""}</span>{active && <span style={{ color: C.good, fontSize: 11 }}>✓ ตัวจริง</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ============================== TABLE ============================== */
function TableView({ career, userTeamId, userDivision, round, teams }) {
  const [viewDiv, setViewDiv] = useState(userDivision);
  const standings = standingsForDivision(career, viewDiv);
  const league = career.leagues[viewDiv];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {[0, 1].map((d) => (
          <button key={d} onClick={() => setViewDiv(d)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `2px solid ${viewDiv === d ? C.amber : C.steel}`, background: viewDiv === d ? "rgba(224,164,88,.12)" : "transparent", color: viewDiv === d ? C.amber : C.chalk, fontFamily: DISPLAY_FONT, fontSize: 12, cursor: "pointer" }}>
            {LEAGUE_NAMES[d]}{d === userDivision ? " (ทีมคุณ)" : ""}
          </button>
        ))}
      </div>
      <Panel style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 14, paddingBottom: 0 }}><SectionLabel>{league.name} (16 ทีม)</SectionLabel></div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead><tr style={{ color: C.textDim, textAlign: "left" }}>
            <th style={{ padding: "6px 6px" }}>#</th><th style={{ padding: "6px 6px" }}>ทีม</th>
            <th style={{ padding: "6px 4px", textAlign: "center" }}>P</th><th style={{ padding: "6px 4px", textAlign: "center" }}>W</th>
            <th style={{ padding: "6px 4px", textAlign: "center" }}>D</th><th style={{ padding: "6px 4px", textAlign: "center" }}>L</th>
            <th style={{ padding: "6px 4px", textAlign: "center" }}>GD</th><th style={{ padding: "6px 6px", textAlign: "center" }}>Pts</th>
          </tr></thead>
          <tbody style={{ fontFamily: MONO_FONT }}>
            {standings.map((s, i) => {
              const zone = viewDiv === 0 ? (i >= standings.length - 4 ? "down" : null) : (i < 4 ? "up" : null);
              return (
                <tr key={s.team.id} style={{ background: s.team.id === userTeamId ? "rgba(224,164,88,.15)" : zone === "up" ? "rgba(111,174,90,.06)" : zone === "down" ? "rgba(193,68,14,.06)" : "transparent", borderTop: `1px solid ${C.steel}` }}>
                  <td style={{ padding: "5px 6px" }}>{i + 1}</td>
                  <td style={{ padding: "5px 6px", fontFamily: "'Segoe UI', sans-serif", fontWeight: s.team.id === userTeamId ? 700 : 400 }}>{s.team.short}</td>
                  <td style={{ textAlign: "center" }}>{s.played}</td><td style={{ textAlign: "center" }}>{s.w}</td>
                  <td style={{ textAlign: "center" }}>{s.d}</td><td style={{ textAlign: "center" }}>{s.l}</td>
                  <td style={{ textAlign: "center" }}>{s.gd > 0 ? "+" + s.gd : s.gd}</td>
                  <td style={{ textAlign: "center", color: C.amber, fontWeight: 700 }}>{s.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: "8px 14px", fontSize: 10, color: C.textDim }}>{viewDiv === 0 ? "แดง = โซนตกชั้น (4 ทีมล่างสุด)" : "เขียว = โซนเลื่อนชั้น (4 ทีมบนสุด)"}</div>
      </Panel>
      {viewDiv === userDivision && round && (
        <Panel>
          <SectionLabel>โปรแกรมวันที่ {round.day}</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {round.matches.map((m) => {
              const h = teams.find((t) => t.id === m.home), a = teams.find((t) => t.id === m.away);
              const highlight = m.home === userTeamId || m.away === userTeamId;
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontFamily: MONO_FONT, padding: "5px 8px", borderRadius: 6, background: highlight ? "rgba(224,164,88,.12)" : "transparent" }}>
                  <span>{h.short}</span><span style={{ color: C.textDim }}>{m.played ? `${m.homeGoals} - ${m.awayGoals}` : "vs"}</span><span>{a.short}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ============================== MARKET (AUCTION) ============================== */
function MarketView({ list, budget, onBid, marketOpen, now }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel style={{ border: `1px solid ${marketOpen ? C.good : C.steel}` }}>
        <SectionLabel>สถานะตลาดซื้อขาย</SectionLabel>
        {marketOpen ? <div style={{ fontSize: 13, color: C.good, fontWeight: 700 }}>🟢 เปิดอยู่ตอนนี้ — ประมูลได้ (12:00-14:00, 18:00-22:00)</div> : <div style={{ fontSize: 13, color: C.textDim }}>🔴 ปิดอยู่ · {nextMarketOpenLabel(new Date(now))}</div>}
        <div style={{ fontSize: 11.5, color: C.textDim, marginTop: 6 }}>งบคงเหลือ: <span style={{ color: C.amber, fontFamily: MONO_FONT }}>{formatMoney(budget)}</span> — เสนอ "ค่าเหนื่อย" สูงกว่าชนะก่อน ถ้าเท่ากันตัดสินด้วย "ค่าตัว"</div>
      </Panel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((l) => <ListingCard key={l.listingId} l={l} budget={budget} onBid={onBid} marketOpen={marketOpen} now={now} />)}
      </div>
    </div>
  );
}
function ListingCard({ l, budget, onBid, marketOpen, now }) {
  const secsLeft = Math.max(0, Math.round((l.endsAt - now) / 1000));
  const wageStep = Math.max(100, Math.round((l.topBid.wage * 0.05) / 100) * 100);
  const feeStep = Math.max(1000, Math.round((l.topBid.fee * 0.05) / 1000) * 1000);
  const [wageAdd, setWageAdd] = useState(0);
  const [feeAdd, setFeeAdd] = useState(0);
  const myWage = l.topBid.wage + wageAdd;
  const myFee = l.topBid.fee + feeAdd;
  const valid = (wageAdd > 0 || feeAdd > 0) && (myWage > l.topBid.wage || (myWage === l.topBid.wage && myFee > l.topBid.fee)) && myFee <= budget;
  return (
    <Panel>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <RatingBadge value={l.rating} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{l.name} <span style={{ fontSize: 10, color: POS_COLOR[l.position] }}>{POS_TH[l.position]}</span></div>
          <div style={{ fontSize: 11, color: C.textDim, fontFamily: MONO_FONT }}>อายุ {l.age} · ศักยภาพ {bandOf(l.potential)} · <span style={{ color: GROUP_COLOR.technical }}>TEC {Math.round(attrGroupAvg(l, "technical"))}</span> · <span style={{ color: GROUP_COLOR.mental }}>MEN {Math.round(attrGroupAvg(l, "mental"))}</span> · <span style={{ color: GROUP_COLOR.physical }}>PHY {Math.round(attrGroupAvg(l, "physical"))}</span> · จาก {l.sourceTeamName}</div>
        </div>
        <div style={{ textAlign: "right", fontFamily: MONO_FONT, fontSize: 11 }}><div style={{ color: secsLeft <= 20 ? C.crimson : C.textDim }}>⏱ {secsLeft}s</div></div>
      </div>
      <div style={{ marginTop: 8, padding: "8px 10px", background: C.panel2, borderRadius: 8, fontSize: 11.5, fontFamily: MONO_FONT }}>ผู้เสนอสูงสุด: <b style={{ color: l.topBid.isUser ? C.good : C.amber }}>{l.topBid.bidder}</b> — ค่าเหนื่อย {formatMoney(l.topBid.wage)}/วัน · ค่าตัว {formatMoney(l.topBid.fee)}</div>
      {marketOpen ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <StepperField label="เพิ่มค่าเหนื่อย" value={wageAdd} step={wageStep} onChange={setWageAdd} />
            <StepperField label="เพิ่มค่าตัว" value={feeAdd} step={feeStep} onChange={setFeeAdd} />
          </div>
          <div style={{ fontSize: 11, color: C.textDim, marginBottom: 6, fontFamily: MONO_FONT }}>ข้อเสนอของคุณ: ค่าเหนื่อย {formatMoney(myWage)} · ค่าตัว {formatMoney(myFee)}</div>
          <button disabled={!valid} onClick={() => { onBid(l.listingId, myWage, myFee); setWageAdd(0); setFeeAdd(0); }} style={{ ...btnStyle(valid ? C.good : "#2b332f", valid ? "#08150e" : C.textDim), cursor: valid ? "pointer" : "not-allowed" }}>ยื่นประมูลแข่ง</button>
        </div>
      ) : <div style={{ marginTop: 8, fontSize: 11.5, color: C.textDim }}>ตลาดปิดอยู่ รอช่วงเวลาเปิดตลาดเพื่อประมูล</div>}
    </Panel>
  );
}
function StepperField({ label, value, step, onChange }) {
  return (
    <div style={{ flex: 1, background: C.panel2, borderRadius: 8, padding: "6px 8px" }}>
      <div style={{ fontSize: 9.5, color: C.textDim, marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => onChange(Math.max(0, value - step))} style={{ background: C.steel, color: C.chalk, border: "none", borderRadius: 4, width: 22, height: 22, cursor: "pointer" }}>−</button>
        <span style={{ fontSize: 10.5, fontFamily: MONO_FONT, color: C.amber }}>+{formatMoney(value)}</span>
        <button onClick={() => onChange(value + step)} style={{ background: C.steel, color: C.chalk, border: "none", borderRadius: 4, width: 22, height: 22, cursor: "pointer" }}>+</button>
      </div>
    </div>
  );
}

/* ============================== LIVE MATCH MODAL ============================== */
const HALF_SECONDS = 180;

const FM_LIVE = {
  bg: "#0c0a18", panel: "#13112a", panel2: "#1a1838", bar: "#252245",
  accent: "#6b4fd4", text: "#eceaf5", dim: "#8d88ad", green: "#3dba6a", red: "#e05a4a",
};
const MENTALITIES = [
  { id: "very_defensive", label: "รับมาก", atk: 0.82, def: 1.12 },
  { id: "defensive", label: "รับ", atk: 0.9, def: 1.06 },
  { id: "balanced", label: "สมดุล", atk: 1, def: 1 },
  { id: "attacking", label: "บุก", atk: 1.08, def: 0.94 },
  { id: "very_attacking", label: "บุกมาก", atk: 1.16, def: 0.86 },
];
const INSTRUCTIONS = [
  { id: "wider", label: "กางเกม", desc: "เปิดช่องข้าง" },
  { id: "narrower", label: "บีบกลาง", desc: "แน่นกลางสนาม" },
  { id: "higher_line", label: "แนวรับสูง", desc: "ดันขึ้นกดดัน" },
  { id: "deeper", label: "แนวรับลึก", desc: "ถอยรอสวน" },
  { id: "more_direct", label: "บอลยาว", desc: "ส่งตรงเร็ว" },
  { id: "shorter", label: "บอลสั้น", desc: "ผ่านบอลต่อเนื่อง" },
];

function initMatchRatings(xi, squad) {
  const r = {};
  xi.forEach((id) => {
    const p = squad.find((pl) => pl.id === id);
    r[id] = clamp(6.1 + (p ? p.rating / 85 : 0), 5.8, 7.4);
  });
  return r;
}

function ratingColor(rt) {
  if (rt >= 7.2) return FM_LIVE.green;
  if (rt >= 6.5) return C.amber;
  return FM_LIVE.red;
}

function MiniShirt({ color, size = 26 }) {
  const trim = shadeColor(color, 40);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      <path d="M8 2.5 4 6l2 4 2-1.5V18h8V8.5L18 10l2-4-4-3.5Q12 5.5 8 2.5Z" fill={color} stroke={trim} strokeWidth="0.7" />
    </svg>
  );
}

function FMTopBtn({ children, active, onClick, accent }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer",
      background: active ? (accent || FM_LIVE.accent) : FM_LIVE.bar,
      color: active ? "#fff" : FM_LIVE.text, fontSize: 11.5, fontWeight: 700,
      fontFamily: DISPLAY_FONT, letterSpacing: 0.3,
    }}>{children}</button>
  );
}

function FMFormationPanel({ team, formation, squad, xi, ratings, side }) {
  const slots = FORMATIONS[formation].slots;
  const assign = { GK: [], DF: [], MF: [], FW: [] };
  squad.filter((p) => xi.includes(p.id)).forEach((p) => assign[p.position].push(p));
  const counters = { GK: 0, DF: 0, MF: 0, FW: 0 };
  return (
    <div style={{ background: FM_LIVE.panel, borderRadius: 10, padding: 10, border: `1px solid ${FM_LIVE.bar}`, height: "100%", minHeight: 280 }}>
      <div style={{ fontSize: 10, color: FM_LIVE.dim, marginBottom: 4, textAlign: side === "home" ? "left" : "right" }}>{team.short}</div>
      <div style={{ fontFamily: DISPLAY_FONT, fontSize: 13, color: FM_LIVE.text, marginBottom: 8, textAlign: side === "home" ? "left" : "right" }}>{formation}</div>
      <div style={{ position: "relative", width: "100%", paddingTop: "115%", background: "#1a5c32", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 4, border: "1px solid rgba(255,255,255,.25)", borderRadius: 4 }} />
        {slots.map((slot, i) => {
          const idx = counters[slot.pos]++;
          const player = assign[slot.pos][idx];
          const rt = player ? (ratings[player.id] || 6.5).toFixed(1) : null;
          const x = side === "away" ? 100 - slot.x : slot.x;
          const y = slot.y;
          return (
            <div key={i} style={{
              position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)",
              display: "flex", flexDirection: "column", alignItems: "center", width: 52,
            }}>
              {rt && (
                <div style={{
                  fontSize: 8, fontWeight: 800, fontFamily: MONO_FONT, marginBottom: 1,
                  background: ratingColor(parseFloat(rt)), color: "#0a0a12",
                  borderRadius: 8, padding: "1px 4px", minWidth: 22, textAlign: "center",
                }}>{rt}</div>
              )}
              <MiniShirt color={teamShirtColor(team)} size={22} />
              <div style={{
                fontSize: 7.5, color: "#fff", textAlign: "center", marginTop: 1,
                background: "rgba(0,0,0,.5)", borderRadius: 3, padding: "0 3px",
                maxWidth: 52, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{player ? (player.name.split(" ")[1] || player.name) : "?"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FMCompareStat({ label, home, away, homeColor, awayColor, pct }) {
  const total = home + away || 1;
  const hPct = pct ? home : (home / total) * 100;
  const aPct = pct ? away : (100 - hPct);
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: MONO_FONT, color: FM_LIVE.dim, marginBottom: 3 }}>
        <span style={{ color: FM_LIVE.text }}>{pct ? `${home}%` : home}</span>
        <span>{label}</span>
        <span style={{ color: FM_LIVE.text }}>{pct ? `${away}%` : away}</span>
      </div>
      <div style={{ display: "flex", height: 5, borderRadius: 3, overflow: "hidden", background: FM_LIVE.bar }}>
        <div style={{ width: `${hPct}%`, background: homeColor }} />
        <div style={{ width: `${aPct}%`, background: awayColor }} />
      </div>
    </div>
  );
}

function FMSquadBar({ squad, xi, ratings, subsUsed, team }) {
  const players = xi.map((id) => squad.find((p) => p.id === id)).filter(Boolean);
  const posLabels = { GK: "GK", DF: "D", MF: "M", FW: "F" };
  return (
    <div style={{ background: FM_LIVE.panel, borderRadius: 10, padding: "8px 10px", border: `1px solid ${FM_LIVE.bar}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: FM_LIVE.dim, fontFamily: MONO_FONT }}>{subsUsed}/5 เปลี่ยนตัว</span>
        <span style={{ fontSize: 10, color: FM_LIVE.dim }}>·</span>
        <span style={{ fontSize: 10, color: team.color || FM_LIVE.accent, fontWeight: 700 }}>{team.short}</span>
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {players.map((p) => {
          const rt = (ratings[p.id] || 6.5).toFixed(1);
          return (
            <div key={p.id} style={{
              flex: "0 0 auto", width: 72, background: FM_LIVE.panel2, borderRadius: 8,
              padding: "6px 4px", textAlign: "center", border: `1px solid ${FM_LIVE.bar}`,
            }}>
              <div style={{ fontSize: 8, color: FM_LIVE.dim, marginBottom: 2 }}>{posLabels[p.position] || p.position}</div>
              <MiniShirt color={teamShirtColor(team)} size={24} />
              <div style={{
                fontSize: 9, fontWeight: 800, fontFamily: MONO_FONT, margin: "3px auto",
                width: 28, height: 28, lineHeight: "28px", borderRadius: "50%",
                background: ratingColor(parseFloat(rt)), color: "#0a0a12",
              }}>{rt}</div>
              <div style={{ fontSize: 8, color: FM_LIVE.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {(p.name.split(" ")[1] || p.name).slice(0, 8)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FMTacticsPanel({ formation, mentality, instructions, onFormation, onMentality, onToggleInstruction, onClose }) {
  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(8,6,20,.92)", zIndex: 20,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{ background: FM_LIVE.panel, borderRadius: 14, padding: 18, maxWidth: 420, width: "100%", border: `1px solid ${FM_LIVE.accent}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 15, color: FM_LIVE.text }}>แทคติก & เปลี่ยนตัว</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: FM_LIVE.dim, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ fontSize: 11, color: FM_LIVE.dim, marginBottom: 6 }}>รูปแบบการเล่น</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {FORMATION_KEYS.map((f) => (
            <button key={f} onClick={() => onFormation(f)} style={{
              padding: "7px 12px", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: 12,
              border: `1px solid ${f === formation ? FM_LIVE.accent : FM_LIVE.bar}`,
              background: f === formation ? FM_LIVE.accent : "transparent", color: FM_LIVE.text,
            }}>{f}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: FM_LIVE.dim, marginBottom: 6 }}>แนวทางเกม (Mentality)</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
          {MENTALITIES.map((m) => (
            <button key={m.id} onClick={() => onMentality(m.id)} style={{
              padding: "6px 10px", borderRadius: 7, cursor: "pointer", fontSize: 11,
              border: `1px solid ${mentality === m.id ? C.amber : FM_LIVE.bar}`,
              background: mentality === m.id ? "rgba(224,164,88,.2)" : "transparent", color: FM_LIVE.text,
            }}>{m.label}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: FM_LIVE.dim, marginBottom: 6 }}>คำสั่ง (Instructions)</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {INSTRUCTIONS.map((ins) => {
            const on = instructions.includes(ins.id);
            return (
              <button key={ins.id} onClick={() => onToggleInstruction(ins.id)} title={ins.desc} style={{
                padding: "5px 9px", borderRadius: 6, cursor: "pointer", fontSize: 10,
                border: `1px solid ${on ? FM_LIVE.green : FM_LIVE.bar}`,
                background: on ? "rgba(61,186,106,.15)" : "transparent", color: FM_LIVE.text,
              }}>{ins.label}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LiveMatchModal({ career, liveMatch, userAutoMode, onFinish, suggestTacticSwitch }) {
  const homeTeam = career.teams.find((t) => t.id === liveMatch.home);
  const awayTeam = career.teams.find((t) => t.id === liveMatch.away);
  const homeSquad = career.players.filter((p) => p.teamId === liveMatch.home);
  const awaySquad = career.players.filter((p) => p.teamId === liveMatch.away);
  const isUserHome = liveMatch.home === career.userTeamId;

  const [half, setHalf] = useState(1);
  const [clock, setClock] = useState(0);
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [events, setEvents] = useState([]);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [homeFormation, setHomeFormation] = useState(liveMatch.homeFormation);
  const [awayFormation, setAwayFormation] = useState(liveMatch.awayFormation);
  const [homeXI, setHomeXI] = useState(liveMatch.homeXI);
  const [awayXI, setAwayXI] = useState(liveMatch.awayXI);
  const [subsUsed, setSubsUsed] = useState(0);
  const [showSubs, setShowSubs] = useState(false);
  const [showTactics, setShowTactics] = useState(false);
  const [myMentality, setMyMentality] = useState("balanced");
  const [myInstructions, setMyInstructions] = useState([]);
  const [playerRatings, setPlayerRatings] = useState(() => ({
  ...initMatchRatings(liveMatch.homeXI, homeSquad),
  ...initMatchRatings(liveMatch.awayXI, awaySquad),
  }));
  const [dugoutTip, setDugoutTip] = useState(null);
  const [goalLog, setGoalLog] = useState([]);
  const [stats, setStats] = useState({ shotsH: 0, shotsA: 0, sotH: 0, sotA: 0, cornersH: 0, cornersA: 0, foulsH: 0, foulsA: 0 });
  const [possession, setPossession] = useState({ homeTicks: 1, awayTicks: 1 });
  const [momentum, setMomentum] = useState([]);
  const [highlight, setHighlight] = useState(null); // { team, kind, minute }
  const [highlightSeq, setHighlightSeq] = useState(null);
  const [goalFlash, setGoalFlash] = useState(null);
  const [ended, setEnded] = useState(false);
  const [pressure, setPressure] = useState(0);
  const [livePossSide, setLivePossSide] = useState("home");
  const [possBallX, setPossBallX] = useState(0.5);
  const [matchStatus, setMatchStatus] = useState("กำลังเริ่มเกม...");
  const [commentaryFeed, setCommentaryFeed] = useState([{
    id: 1, minute: 0, text: "⚽ เริ่มเกม — แมตช์จำลองอัตโนมัติจาก engine",
  }]);
  const [animTick, setAnimTick] = useState(0);
  const [ballSim, setBallSim] = useState(() => ({
    px: 42, py: 50, fromPx: 42, fromPy: 50, toPx: 48, toPy: 50,
    t: 1, side: "home", carrier: 6, phase: "dribble",
  }));

  const tickRef = useRef(0);
  const gameStateRef = useRef({ possSide: "home", pressure: 0 });
  const homeFormationRef = useRef(homeFormation);
  const awayFormationRef = useRef(awayFormation);
  homeFormationRef.current = homeFormation;
  awayFormationRef.current = awayFormation;
  const finishedRef = useRef(false);
  const lastAiCheckRef = useRef(0);
  const bucketRef = useRef({ home: 0, away: 0 });
  const highlightSeqRef = useRef(null);
  const slowMoRef = useRef(1);
  const goalFlashShownRef = useRef(false);
  const applyHighlightResultRef = useRef(null);
  const ballSimRef = useRef(ballSim);
  ballSimRef.current = ballSim;
  const possBallXRef = useRef(0.5);
  const lastHighlightTickRef = useRef(-999);
  const virtualBallPxRef = useRef(50);
  const commentaryIdRef = useRef(1);
  const gameMinRef = useRef(0);
  const xgRef = useRef({ xgHome: 1, xgAway: 1 });
  const lastAttackingHomeRef = useRef(true);

  function pushCommentary(text, minute) {
    commentaryIdRef.current += 1;
    setCommentaryFeed((f) => [{ id: commentaryIdRef.current, text, minute }, ...f].slice(0, 5));
    setMatchStatus(text);
  }

  const myXI = isUserHome ? homeXI : awayXI;
  const mySquad = isUserHome ? homeSquad : awaySquad;
  const bench = mySquad.filter((p) => !myXI.includes(p.id) && p.injuryDays <= 0);

  const myTeam = isUserHome ? homeTeam : awayTeam;
  const myFormation = isUserHome ? homeFormation : awayFormation;
  const oppFormation = isUserHome ? awayFormation : homeFormation;

  function setMyFormation(f) {
    const newXI = getBestXI(mySquad, f);
    if (isUserHome) { setHomeFormation(f); setHomeXI(newXI); }
    else { setAwayFormation(f); setAwayXI(newXI); }
    setEvents((e) => [`🔄 ปรับแผนเป็น ${f}`, ...e]);
  }

  function toggleInstruction(id) {
    setMyInstructions((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function bumpRating(playerId, delta) {
    if (!playerId) return;
    setPlayerRatings((r) => ({ ...r, [playerId]: clamp((r[playerId] || 6.5) + delta, 5.5, 9.5) }));
  }

  function applyTacticMods(ctx, isUserCtx) {
    if (!isUserCtx) return ctx;
    const ment = MENTALITIES.find((m) => m.id === myMentality) || MENTALITIES[2];
    let atk = ctx.effAttack * ment.atk;
    let def = ctx.effDefense * ment.def;
    if (myInstructions.includes("more_direct")) atk *= 1.04;
    if (myInstructions.includes("shorter")) atk *= 1.02;
    if (myInstructions.includes("higher_line")) { atk *= 1.03; def *= 0.97; }
    if (myInstructions.includes("deeper")) { atk *= 0.97; def *= 1.04; }
    return { ...ctx, effAttack: atk, effDefense: def };
  }

  function doSub(outId, inId) {
    if (subsUsed >= 5) return;
    if (isUserHome) setHomeXI((xi) => xi.map((id) => (id === outId ? inId : id)));
    else setAwayXI((xi) => xi.map((id) => (id === outId ? inId : id)));
    setSubsUsed((s) => s + 1);
    setPlayerRatings((r) => {
      const nr = { ...r };
      const p = mySquad.find((pl) => pl.id === inId);
      nr[inId] = clamp(6.2 + (p ? p.rating / 85 : 0), 5.8, 7.2);
      return nr;
    });
    setEvents((e) => [`🔁 เปลี่ยนตัว: นำ ${mySquad.find((p) => p.id === inId)?.name} ลงแทน ${mySquad.find((p) => p.id === outId)?.name}`, ...e]);
    setShowSubs(false);
    setShowTactics(false);
  }

  function applyHighlightResult(seq) {
    const { shotResult, shotSide, gameMin, teamShort } = seq;
    if (shotResult === "goal") {
      setHighlight({ team: shotSide, kind: "goal", minute: gameMin });
    } else if (shotResult === "save") {
      setEvents((e) => [`🧤 ${gameMin}' ${teamShort} ยิงตรงกรอบ แต่โดนเซฟ!`, ...e]);
      setHighlight({ team: shotSide, kind: "save", minute: gameMin });
    } else {
      setEvents((e) => [`📐 ${gameMin}' ${teamShort} ยิง... หลุดกรอบ`, ...e]);
      setHighlight({ team: shotSide, kind: "miss", minute: gameMin });
    }
    if (shotResult !== "goal") setTimeout(() => setHighlight(null), 2200);
    const gkSide = shotSide === "home" ? "away" : "home";
    const gkPx = gkSide === "home" ? 14 : 86;
    if (shotResult === "goal") {
      setBallSim({
        px: 50, py: 50, fromPx: 50, fromPy: 50, toPx: 50, toPy: 50,
        t: 1, side: gkSide, carrier: 4, phase: "dribble", shotResult: null,
        fromCarrier: null, toCarrier: null,
      });
      setTimeout(() => setHighlight(null), 800);
    } else {
      setBallSim({
        px: gkPx, py: 48, fromPx: gkPx, fromPy: 48, toPx: gkPx, toPy: 48,
        t: 1, side: gkSide, carrier: 0, phase: "dribble", shotResult: null,
        fromCarrier: null, toCarrier: null,
      });
    }
    gameStateRef.current = { possSide: gkSide, pressure: 0 };
  }
  applyHighlightResultRef.current = applyHighlightResult;

  function finalize(finalHomeGoals, finalAwayGoals) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish(finalHomeGoals, finalAwayGoals, homeXI, awayXI);
  }

  /* beta-only: instantly resolve remaining time using expected-goals proportional to time left */
  function skipToFullTime() {
    const elapsedMin = Math.round((half === 1 ? 0 : 45) + (clock / HALF_SECONDS) * 45);
    const remainingFrac = clamp((90 - elapsedMin) / 90, 0, 1);
    const hc = buildMatchContext(homeTeam, homeSquad, homeXI, awayFormation, true, homeTeam.chemistry);
    const ac = buildMatchContext(awayTeam, awaySquad, awayXI, homeFormation, false, awayTeam.chemistry);
    const { xgHome, xgAway } = expectedGoalsFull(hc, ac);
    const extraHome = poisson(xgHome * remainingFrac);
    const extraAway = poisson(xgAway * remainingFrac);
    const finalHome = homeGoals + extraHome, finalAway = awayGoals + extraAway;
    setHomeGoals(finalHome); setAwayGoals(finalAway);
    setEnded(true);
    setEvents((e) => [`⏭ ข้ามไปจบเกม (เฉพาะเบต้า): ${homeTeam.short} ${finalHome} - ${finalAway} ${awayTeam.short}`, ...e]);
    setTimeout(() => finalize(finalHome, finalAway), 500);
  }

  useEffect(() => {
    if (paused || ended) return;
    let last = performance.now();
    let id;
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const sm = highlightSeqRef.current ? HIGHLIGHT_SLOW_MO : 1;
      slowMoRef.current = sm;
      const dtSm = dt * sm;
      setAnimTick((t) => t + dtSm * 60);

      if (highlightSeqRef.current) {
        const { seq, done, showGoalText } = advanceGoalHighlight(highlightSeqRef.current, dt);
        highlightSeqRef.current = seq;
        setBallSim(seq.ball);
        setHighlightSeq({ type: seq.type, stage: seq.stage, shotResult: seq.shotResult });
        if (showGoalText && seq.stage === "celebrate" && !goalFlashShownRef.current) {
          goalFlashShownRef.current = true;
          if (!seq.scoredApplied && seq.shotResult === "goal") {
            seq.scoredApplied = true;
            highlightSeqRef.current = seq;
            if (seq.attackingHome) setHomeGoals((g) => g + 1); else setAwayGoals((g) => g + 1);
            setGoalLog((g) => [{ minute: seq.gameMin, team: seq.shotSide, player: seq.scorer?.name || seq.teamShort }, ...g].slice(0, 8));
            setEvents((e) => [`⚽ ${seq.gameMin}' ประตู! ${seq.scorer?.name || seq.teamShort} (${seq.teamShort})`, ...e]);
          }
          setGoalFlash({ player: seq.scorer?.name, team: seq.shotSide });
        }
        if (done) {
          applyHighlightResultRef.current?.(seq);
          highlightSeqRef.current = null;
          slowMoRef.current = 1;
          goalFlashShownRef.current = false;
          setHighlightSeq(null);
          setGoalFlash(null);
        }
      } else {
        const gs = gameStateRef.current;
        const nextBall = advanceBallVisual(ballSimRef.current, dtSm * LIVE_BALL_DT, {
          possSide: gs.possSide,
          pressure: gs.pressure,
          homeFormation: homeFormationRef.current,
          awayFormation: awayFormationRef.current,
          tick: tickRef.current,
        });
        ballSimRef.current = nextBall;
        setBallSim(nextBall);
      }
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [paused, ended]);

  useEffect(() => {
    if (paused || ended) return;
    const iv = setInterval(() => {
      if (highlightSeqRef.current) return;

      tickRef.current += 1;
      setClock((c) => {
        const next = c + 1 * speed;
        if (next >= HALF_SECONDS) {
          if (half === 1) { setHalf(2); setEvents((e) => [`ครึ่งแรกจบ ${homeGoals}-${awayGoals}`, ...e]); return 0; }
          else { clearInterval(iv); setTimeout(() => finalize(homeGoals, awayGoals), 600); return HALF_SECONDS; }
        }
        return next;
      });

      const gameMin = Math.round((half === 1 ? 0 : 45) + (clock / HALF_SECONDS) * 45);
      let hc = buildMatchContext(homeTeam, homeSquad, homeXI, awayFormation, true, homeTeam.chemistry);
      let ac = buildMatchContext(awayTeam, awaySquad, awayXI, homeFormation, false, awayTeam.chemistry);
      hc = applyTacticMods(hc, isUserHome);
      ac = applyTacticMods(ac, !isUserHome);
      const { xgHome, xgAway } = expectedGoalsFull(hc, ac);
      const homePressure = hc.effAttack / (hc.effAttack + ac.effAttack || 1);
      gameMinRef.current = gameMin;
      xgRef.current = { xgHome, xgAway };

      // possession sample every tick
      const attackingHome = Math.random() < homePressure;
      lastAttackingHomeRef.current = attackingHome;
      setPossession((p) => (attackingHome ? { ...p, homeTicks: p.homeTicks + 1 } : { ...p, awayTicks: p.awayTicks + 1 }));
      bucketRef.current[attackingHome ? "home" : "away"] += 1;
      const pr = clamp(pressure + (attackingHome ? 0.12 : -0.12), -1, 1);
      setPressure(pr);
      gameStateRef.current = { possSide: attackingHome ? "home" : "away", pressure: pr };
      setLivePossSide(attackingHome ? "home" : "away");

      if (tickRef.current % 5 === 0) {
        const sideTeam = attackingHome ? homeTeam : awayTeam;
        const sideSquad = attackingHome ? homeSquad : awaySquad;
        const sideXI = attackingHome ? homeXI : awayXI;
        pushCommentary(buildLiveCommentary({
          team: sideTeam, squad: sideSquad, xi: sideXI,
          bs: ballSimRef.current, pushing: Math.abs(pr) > 0.25,
        }), gameMin);
      }

      // momentum bucket flush every ~8 ticks
      if (tickRef.current % 8 === 0) {
        const { home, away } = bucketRef.current;
        const total = home + away || 1;
        const val = Math.round(((home - away) / total) * 100);
        setMomentum((m) => [...m, val].slice(-24));
        bucketRef.current = { home: 0, away: 0 };
      }

      // corners / fouls flavor stats
      if (tickRef.current % 5 === 0 && Math.random() < 0.5) {
        if (Math.random() < homePressure) setStats((s) => ({ ...s, cornersH: s.cornersH + 1 }));
        else setStats((s) => ({ ...s, cornersA: s.cornersA + 1 }));
      }
      if (tickRef.current % 6 === 0 && Math.random() < 0.4) {
        if (Math.random() < homePressure) setStats((s) => ({ ...s, foulsA: s.foulsA + 1 }));
        else setStats((s) => ({ ...s, foulsH: s.foulsH + 1 }));
      }

      // ช็อต / ไฮไลต์ — engine อัตโนมัติ (แบบ FM: ดราม่ามากขึ้นเมื่อเกมสูสี)
      const bs = ballSimRef.current;
      const inAttThird = bs.px > 62 || bs.px < 38;
      const inBox = bs.px > 74 || bs.px < 26;
      const cooledDown = tickRef.current - lastHighlightTickRef.current >= HIGHLIGHT_COOLDOWN_TICKS;
      const highlightBias = getLiveHighlightBias(homeGoals, awayGoals, gameMin);
      const shotBase = (inBox ? 0.1 : inAttThird ? 0.065 : 0.022) * highlightBias;
      const shotChance = shotBase + Math.abs(pr) * 0.035;
      if (tickRef.current % 3 === 0 && Math.random() < shotChance) {
        const scoreProb = attackingHome ? xgHome / 40 : xgAway / 40;
        const zone = { inBox, inAttThird };
        const shotResult = resolveShotResult(scoreProb, zone);
        const onTarget = shotResult === "goal" || shotResult === "save";
        const isGoal = shotResult === "goal";
        const teamShort = attackingHome ? homeTeam.short : awayTeam.short;
        const shotSide = attackingHome ? "home" : "away";
        const xi = attackingHome ? homeXI : awayXI;
        const sq = attackingHome ? homeSquad : awaySquad;
        const scorer = pickScorer(sq, xi);
        const formation = attackingHome ? homeFormation : awayFormation;
        setStats((s) => attackingHome
          ? { ...s, shotsH: s.shotsH + 1, sotH: s.sotH + (onTarget ? 1 : 0) }
          : { ...s, shotsA: s.shotsA + 1, sotA: s.sotA + (onTarget ? 1 : 0) });
        if (scorer) bumpRating(scorer.id, isGoal ? 0.45 : onTarget ? 0.12 : -0.08);

        const statusMsg = isGoal
          ? `⚽ ${teamShort} ยิงเข้า! (นาที ${gameMin}')`
          : onTarget
            ? `🧤 ${teamShort} ยิงตรงกรอบ แต่เซฟได้ (นาที ${gameMin}')`
            : `📐 ${teamShort} ยิงหลุดกรอบ (นาที ${gameMin}')`;
        pushCommentary(statusMsg, gameMin);
        if (!isGoal) setEvents((e) => [`${statusMsg.replace(/ \(นาที.*\)/, "")} — นาที ${gameMin}'`, ...e]);

        const playHighlight = !highlightSeqRef.current && (isGoal || (cooledDown && shouldPlayHighlight(shotResult, zone)));
        if (playHighlight) {
          const hl = initGoalHighlight(shotSide, shotResult, formation, zone);
          lastHighlightTickRef.current = tickRef.current;
          highlightSeqRef.current = {
            ...hl, gameMin, scorer, teamShort, attackingHome,
          };
          slowMoRef.current = HIGHLIGHT_SLOW_MO;
          goalFlashShownRef.current = false;
          setHighlightSeq({ type: hl.type, stage: "buildup", shotResult });
          setBallSim(hl.ball);
          gameStateRef.current = { possSide: shotSide, pressure: 0.5 };
        } else if (!isGoal && onTarget) {
          ballSimRef.current = startShotAnimation(ballSimRef.current, shotSide, shotResult);
          setBallSim(ballSimRef.current);
        }
      }

      // dugout advice every ~20 ticks for user team
      if (tickRef.current % 20 === 0) {
        const myG = isUserHome ? homeGoals : awayGoals;
        const oppG = isUserHome ? awayGoals : homeGoals;
        const diff = myG - oppG;
        const tired = mySquad.filter((p) => myXI.includes(p.id) && p.stamina < 55);
        if (diff < 0 && gameMin > 55) {
          setDugoutTip(userAutoMode
            ? { text: "เราตามอยู่ — ลองเปลี่ยนเป็นแผนบุก (4-3-3) และ Mentality บุกมาก", action: () => { setMyFormation("4-3-3"); setMyMentality("very_attacking"); } }
            : { text: "เราตามอยู่ — ลองเปลี่ยนเป็น 4-3-3 และ Mentality บุกมาก" });
        } else if (diff > 0 && gameMin > 70) {
          setDugoutTip(userAutoMode
            ? { text: "นำอยู่ — พิจารณาเก็บผลด้วยแผนรับ (5-3-2)", action: () => { setMyFormation("5-3-2"); setMyMentality("defensive"); } }
            : { text: "นำอยู่ — พิจารณาเก็บผลด้วยแผนรับ (5-3-2)" });
        } else if (tired.length >= 2 && subsUsed < 5) {
          const p = tired[0];
          setDugoutTip(userAutoMode
            ? { text: `${p.name} เริ่มล้า (${Math.round(p.stamina)}%) — ควรเปลี่ยนตัว`, action: () => { setShowTactics(true); setShowSubs(true); } }
            : { text: `${p.name} เริ่มล้า (${Math.round(p.stamina)}%) — ควรเปลี่ยนตัว` });
        } else if (tickRef.current % 40 === 0) {
          setDugoutTip(null);
        }
      }

      // rule-based mid-match tactic AI, checked roughly every 15 real seconds
      if (tickRef.current - lastAiCheckRef.current >= 15) {
        lastAiCheckRef.current = tickRef.current;
        [
          { team: homeTeam, isHome: true, setF: setHomeFormation, curF: homeFormation },
          { team: awayTeam, isHome: false, setF: setAwayFormation, curF: awayFormation },
        ].forEach(({ team, isHome, setF, curF }) => {
          const isUserTeam = isHome ? isUserHome : !isUserHome;
          if (isUserTeam && team.autoMode === false) return;
          const sug = suggestTacticSwitch({ ...team, formation: curF }, homeGoals, awayGoals, isHome, gameMin);
          if (sug && sug !== curF) { setF(sug); setEvents((e) => [`🔄 ${gameMin}' ${team.short} ปรับเป็น ${sug}!`, ...e]); }
        });
      }
    }, Math.max(180, 420 / speed));
    return () => clearInterval(iv);
  }, [half, paused, ended, speed, homeGoals, awayGoals, homeXI, awayXI, homeFormation, awayFormation]);

  const gameMinuteDisplay = Math.round((half === 1 ? 0 : 45) + (clock / HALF_SECONDS) * 45);
  const possTotal = possession.homeTicks + possession.awayTicks;
  const possHomePct = Math.round((possession.homeTicks / possTotal) * 100);
  const possAwayPct = 100 - possHomePct;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(4,10,7,.96)", zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", overflowY: "auto", padding: 12 }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontFamily: MONO_FONT, color: C.amber, fontSize: 13 }}>🔴 สด · {half === 1 ? "ครึ่งแรก" : "ครึ่งหลัง"} · นาที {gameMinuteDisplay}'</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginBottom: 12 }}>
          <TeamChip team={homeTeam} />
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 34, color: highlight?.kind === "goal" ? (highlight.team === "home" ? C.good : C.crimson) : C.chalk }}>{homeGoals} - {awayGoals}</div>
          <TeamChip team={awayTeam} />
        </div>

        {/* สนาม 2D ตลอดแมตช์ — ไฮไลต์จาก engine อัตโนมัติ */}
        <div style={{ marginBottom: 8, position: "relative" }}>
          <div style={{
            filter: highlightSeq ? "brightness(1.08) contrast(1.05)" : "brightness(0.97)",
            transform: highlightSeq ? "scale(1.01)" : "scale(1)",
            transformOrigin: "center center",
            transition: "filter .25s ease, transform .25s ease",
          }}>
            <BroadcastPitch homeTeam={homeTeam} awayTeam={awayTeam} homeFormation={homeFormation} awayFormation={awayFormation} ballSim={ballSim} pressure={pressure} animTick={animTick} />
          </div>
          <LiveCommentaryStrip lines={commentaryFeed} minute={gameMinuteDisplay} />
          <HighlightMomentBanner seq={highlightSeq} />
          <GoalCelebrationOverlay flash={goalFlash} animTick={animTick} />
          {highlight && !goalFlash && !highlightSeq && (
            <div style={{ minHeight: 30, marginTop: 6, textAlign: "center" }}>
              <div style={{
                display: "inline-block", padding: "5px 12px", borderRadius: 8,
                background: highlight.kind === "goal" ? "rgba(111,174,90,.18)" : "rgba(224,164,88,.1)",
                border: `1px solid ${highlight.kind === "goal" ? C.good : C.amber}`,
              }}>
                <span style={{ fontFamily: DISPLAY_FONT, fontSize: 12.5, color: highlight.kind === "goal" ? C.good : C.chalk }}>
                  {highlight.kind === "goal" ? "⚽ ประตู!" : highlight.kind === "save" ? "🧤 เซฟได้!" : "📐 หลุดกรอบ"} — {(highlight.team === "home" ? homeTeam : awayTeam).short} นาที {highlight.minute}'
                </span>
              </div>
            </div>
          )}
        </div>

        {/* possession bar */}
        <Panel style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: MONO_FONT, marginBottom: 4 }}>
            <span style={{ color: C.chalk }}>ครองบอล {possHomePct}%</span><span style={{ color: C.textDim }}>ครองบอล {possAwayPct}%</span>
          </div>
          <div style={{ display: "flex", width: "100%", height: 8, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${possHomePct}%`, background: homeTeam.color || C.good }} />
            <div style={{ width: `${possAwayPct}%`, background: awayTeam.color || C.crimson }} />
          </div>

          <div style={{ fontSize: 10, color: C.textDim, margin: "12px 0 4px" }}>โมเมนตัมเกม</div>
          <div style={{ display: "flex", alignItems: "center", height: 34, gap: 2 }}>
            {momentum.length === 0 && <div style={{ fontSize: 10, color: C.textDim }}>รอข้อมูล...</div>}
            {momentum.map((v, i) => (
              <div key={i} style={{ flex: 1, height: "100%", position: "relative" }}>
                <div style={{
                  position: "absolute", left: 0, right: 0, height: `${Math.abs(v) / 2}%`,
                  background: v >= 0 ? C.good : C.crimson,
                  top: v >= 0 ? `${50 - Math.abs(v) / 2}%` : "50%",
                  borderRadius: 1,
                }} />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            <StatRow label="ยิงประตู" home={stats.shotsH} away={stats.shotsA} />
            <StatRow label="ยิงตรงกรอบ" home={stats.sotH} away={stats.sotA} />
            <StatRow label="เตะมุม" home={stats.cornersH} away={stats.cornersA} />
            <StatRow label="ฟาวล์" home={stats.foulsH} away={stats.foulsA} />
          </div>
        </Panel>

        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <button onClick={() => setPaused((p) => !p)} style={{ ...btnStyle(C.steel, C.chalk), flex: 1, minWidth: 90 }}>{paused ? "▶ เล่นต่อ" : "⏸ หยุด"}</button>
          <button onClick={() => setSpeed((s) => (s === 1 ? 3 : s === 3 ? 6 : 1))} style={{ ...btnStyle(C.amber, "#0b2318"), flex: 1, minWidth: 90 }}>ความเร็ว x{speed}</button>
          <button onClick={() => setShowSubs((s) => !s)} style={{ ...btnStyle(subsUsed >= 5 ? "#2b332f" : C.purple, subsUsed >= 5 ? C.textDim : "#fff"), flex: 1, minWidth: 90 }}>เปลี่ยนตัว ({subsUsed}/5)</button>
          <button onClick={skipToFullTime} style={{ ...btnStyle("transparent", C.textDim), flex: 1, minWidth: 90, border: `1px dashed ${C.steel}` }}>⏭ จบเกม (เบต้า)</button>
        </div>
        <div style={{ fontSize: 9.5, color: C.textDim, textAlign: "center", marginTop: -6, marginBottom: 10 }}>* ปุ่ม "จบเกม" มีให้เฉพาะเวอร์ชันเบต้า — เวอร์ชันออนไลน์จริงต้องรอชมจนจบ 6 นาทีเสมอ</div>

        {showSubs && (
          <Panel style={{ marginBottom: 10 }}>
            <SectionLabel>เปลี่ยนตัว — เลือกตัวจริงที่จะเปลี่ยนออก แล้วเลือกตัวสำรองที่จะลง (ตำแหน่งเดียวกัน)</SectionLabel>
            <SubPicker myXI={myXI} mySquad={mySquad} bench={bench} onSub={doSub} disabled={subsUsed >= 5} />
          </Panel>
        )}

        <Panel>
          <SectionLabel>ไทม์ไลน์เหตุการณ์</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 180, overflowY: "auto" }}>
            {events.slice(0, 24).map((e, i) => <div key={i} style={{ fontSize: 12, fontFamily: MONO_FONT, color: i === 0 ? C.chalk : C.textDim }}>{e}</div>)}
            {events.length === 0 && <div style={{ fontSize: 12, color: C.textDim }}>เกมเริ่มแล้ว รอลุ้นจังหวะแรก...</div>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
/* FM top-down pitch — มองจากบน ประตูซ้าย/ขวา บอลเล่นไปข้างหน้าเข้าประตู */
const PITCH = { left: 5, top: 7, width: 90, height: 48 };
const PLAY_MIN_PX = 8;
const PLAY_MAX_PX = 92;

function teamShirtColor(team) {
  return team?.shirtColor || team?.color || "#888";
}

function gkKitColor(team, side) {
  const base = teamShirtColor(team);
  const tint = side === "home" ? "#f0e050" : "#5ec8e8";
  return blendHex(base, tint, 0.45);
}

function blendHex(a, b, t) {
  const pa = parseInt(a.replace("#", ""), 16);
  const pb = parseInt(b.replace("#", ""), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

function dotTextColor(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 145 ? "#1a1a1a" : "#fff";
}

function startShotAnimation(prev, shotSide, shotResult) {
  const goalPx = shotSide === "home" ? 95 : 5;
  const goalPy = clamp(prev.py + (Math.random() - 0.5) * 18, 32, 68);
  const missPy = shotResult === "miss" ? clamp(goalPy + (Math.random() > 0.5 ? 14 : -14), 8, 92) : goalPy;
  return {
    ...prev,
    side: shotSide,
    phase: "shot",
    shotResult,
    fromPx: prev.px,
    fromPy: prev.py,
    toPx: goalPx,
    toPy: missPy,
    t: 0,
  };
}

/* ---------- goal highlight / slow-motion sequence ---------- */
const GOAL_HIGHLIGHT_META = {
  breakaway: { label: "หลุดเดี่ยวเข้า!", buildup: 2.4, shot: 1.85, celebrate: 2.8, hold: 0.65 },
  dribble: { label: "เลี้ยงเข้าไปยิง!", buildup: 2.6, shot: 1.75, celebrate: 2.8, hold: 0.65 },
  corner: { label: "โหล่งจากลูกเตะมุม!", buildup: 2.9, shot: 1.9, celebrate: 2.8, hold: 0.65 },
};
const HIGHLIGHT_SLOW_MO = 0.62;
const HIGHLIGHT_COOLDOWN_TICKS = 28;
const LIVE_BALL_DT = 0.72;

/** FM-style: นำ 3 ลูก → ไฮไลต์น้อยลง, เกมสูสีช่วงท้าย → มากขึ้น */
function getLiveHighlightBias(homeGoals, awayGoals, gameMin) {
  const diff = Math.abs(homeGoals - awayGoals);
  let bias = 1;
  if (diff >= 3) bias = 0.4;
  else if (diff === 2) bias = 0.65;
  if (gameMin >= 70 && diff <= 1) bias *= 1.2;
  return bias;
}

function pickLivePlayer(squad, xi) {
  const pool = squad.filter((p) => xi.includes(p.id));
  return pool[Math.floor(Math.random() * pool.length)] || null;
}

function buildLiveCommentary({ team, squad, xi, bs, pushing }) {
  const inBox = bs.px > 74 || bs.px < 26;
  const inAttThird = bs.px > 62 || bs.px < 38;
  const passer = pickLivePlayer(squad, xi);
  const recv = pickLivePlayer(squad, xi.filter((id) => id !== passer?.id));
  const p1 = passer?.name || team.short;
  const p2 = recv?.name || team.short;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  if (inBox && pushing) {
    return pick([
      `${p1} บุกเข้าเขตโทษ!`,
      `${p1} ส่งให้ ${p2} ในกรอบประตู`,
      `อันตราย! ${team.short} ขึ้นยิงในเขต`,
      `${p2} หันมายิงจากในกรอบ!`,
    ]);
  }
  if (inAttThird) {
    return pick([
      `${p1} เปิดบอลจากแดนบุก`,
      `${team.short} สร้างจังหวะจากฝั่งรุก`,
      `${p1} ผ่านให้ ${p2} แถวเขตโทษ`,
      `${p2} คุมบอลแถวแดนสุดท้าย`,
    ]);
  }
  if (pushing) {
    return pick([
      `${p1} ส่งบอลขึ้นหน้า`,
      `${team.short} ค่อยๆ ดันขึ้นมา`,
      `${p1} ผ่านให้ ${p2}`,
      `บอลอยู่ฝั่ง ${team.short}`,
    ]);
  }
  return pick([
    `${team.short} ครองบอล`,
    `${p1} ส่งคืนหลัง`,
    `${p1} ผ่านให้ ${p2} กลางแดน`,
    `เกมวนอยู่ช่วงกลางสนาม`,
  ]);
}

function shouldPlayHighlight(shotResult, zone) {
  if (shotResult === "goal") return true;
  if (shotResult === "save") return Math.random() < 0.48;
  if (shotResult === "miss" && zone.inBox) return Math.random() < 0.28;
  if (shotResult === "miss" && zone.inAttThird) return Math.random() < 0.14;
  return false;
}

function pickGoalHighlightType({ inBox, inAttThird }) {
  const r = Math.random();
  if (inAttThird && r < 0.07) return "breakaway";
  if (inBox && r < 0.55) return "dribble";
  if (r < 0.72) return "dribble";
  return "corner";
}

function resolveShotResult(scoreProb, { inBox, inAttThird }) {
  const goalBoost = inBox ? 1.2 : inAttThird ? 1.05 : 1;
  if (Math.random() < scoreProb * goalBoost) return "goal";
  const onTargetChance = inBox ? 0.36 : inAttThird ? 0.46 : 0.52;
  return Math.random() < onTargetChance ? "save" : "miss";
}

function initGoalHighlight(shotSide, shotResult, formationKey, zone = {}) {
  const { inBox = false, inAttThird = false } = zone;
  const type = pickGoalHighlightType({ inBox, inAttThird });
  const slots = FORMATIONS[formationKey].slots;
  const fwIdx = slots.reduce((best, s, i) => (s.pos === "FW" ? i : best), 9);
  const fwd = shotSide === "home" ? 1 : -1;
  const goalPy = clamp(38 + Math.random() * 24, 32, 68);
  const meta = GOAL_HIGHLIGHT_META[type];
  let ball;

  if (type === "breakaway") {
    const startPx = 50 + fwd * 20;
  const endPx = 50 + fwd * 34;
    ball = {
      px: startPx, py: goalPy, side: shotSide, carrier: fwIdx,
      phase: "highlight", highlightType: type, shotResult,
      fromPx: startPx, fromPy: goalPy, toPx: endPx, toPy: goalPy, t: 0,
    };
  } else if (type === "dribble") {
    const pts = [
      { px: 50 + fwd * 12, py: goalPy },
      { px: 50 + fwd * 20, py: goalPy + (Math.random() > 0.5 ? 7 : -7) },
      { px: 50 + fwd * 28, py: goalPy + (Math.random() > 0.5 ? 5 : -5) },
      { px: 50 + fwd * 36, py: goalPy },
    ];
    ball = {
      px: pts[0].px, py: pts[0].py, side: shotSide, carrier: fwIdx,
      phase: "highlight", highlightType: type, shotResult, dribblePts: pts, t: 0,
    };
  } else {
    const cornerPy = Math.random() > 0.5 ? 13 : 87;
    const crossTo = { px: 50 + fwd * 40, py: 46 + (Math.random() - 0.5) * 12 };
    ball = {
      px: shotSide === "home" ? 90 : 10, py: cornerPy, side: shotSide, carrier: fwIdx,
      phase: "highlight", highlightType: type, shotResult, crossTo,
      fromPx: shotSide === "home" ? 90 : 10, fromPy: cornerPy, t: 0,
    };
  }

  return {
    type, stage: "buildup", stageT: 0, celebrateT: 0,
    shotSide, shotResult, ball, meta,
    buildupDur: meta.buildup * (shotResult === "goal" ? 1 : shotResult === "save" ? 0.92 : 0.88),
    shotDur: meta.shot,
    celebrateDur: shotResult === "goal" ? meta.celebrate : 0,
    holdDur: shotResult !== "goal" ? (meta.hold ?? 0.65) : 0,
  };
}

function advanceHighlightBuildup(ball, type, progress) {
  const e = easeOut(clamp(progress, 0, 1));
  const next = { ...ball };
  if (type === "breakaway") {
    next.px = lerp(ball.fromPx, ball.toPx, e);
    next.py = ball.toPy;
    next.phase = "dribble";
  } else if (type === "dribble") {
    const pts = ball.dribblePts;
    const seg = (pts.length - 1) * e;
    const i = Math.min(Math.floor(seg), pts.length - 2);
    const t = seg - i;
    next.px = lerp(pts[i].px, pts[i + 1].px, t);
    next.py = lerp(pts[i].py, pts[i + 1].py, t);
    next.phase = "dribble";
  } else {
    const mid = ball.crossTo;
    if (e < 0.58) {
      const t = e / 0.58;
      const arcLift = ball.side === "home" ? -6 : 6;
      next.px = (1 - t) * (1 - t) * ball.fromPx + 2 * (1 - t) * t * (mid.px + arcLift) + t * t * mid.px;
      next.py = (1 - t) * (1 - t) * ball.fromPy + 2 * (1 - t) * t * (mid.py - 10) + t * t * mid.py;
      next.phase = "pass";
    } else {
      const t = (e - 0.58) / 0.42;
      const fwd = ball.side === "home" ? 1 : -1;
      next.px = lerp(mid.px, mid.px + fwd * 10, t);
      next.py = lerp(mid.py, mid.py - 3, t);
      next.phase = "dribble";
    }
  }
  return next;
}

function advanceGoalHighlight(seq, dt) {
  let { stage, stageT, celebrateT, holdT, ball, shotSide, shotResult, type, meta } = seq;
  const buildupDur = seq.buildupDur ?? meta.buildup;
  const shotDur = seq.shotDur ?? meta.shot;
  const celebrateDur = seq.celebrateDur ?? meta.celebrate ?? 2.8;
  const holdDur = seq.holdDur ?? meta.hold ?? 0.65;
  stageT += dt;
  let done = false;
  let showGoalText = false;

  if (stage === "buildup") {
    ball = advanceHighlightBuildup(ball, type, stageT / buildupDur);
    if (stageT >= buildupDur) {
      stage = "shot";
      stageT = 0;
      const goalPx = shotSide === "home" ? 95 : 5;
      const goalPy = clamp(ball.py, 32, 68);
      const missPy = shotResult === "miss" ? clamp(goalPy + (Math.random() > 0.5 ? 14 : -14), 8, 92) : goalPy;
      ball = {
        ...ball, phase: "shot", shotResult,
        fromPx: ball.px, fromPy: ball.py, toPx: goalPx, toPy: missPy, t: 0,
      };
    }
  } else if (stage === "shot") {
    ball = { ...ball, t: Math.min(1, ball.t + dt * 1.15) };
    const e = easeOut(ball.t);
    ball.px = lerp(ball.fromPx, ball.toPx, e);
    ball.py = lerp(ball.fromPy, ball.toPy, e);
    if (stageT >= shotDur) {
      ball.px = ball.toPx;
      ball.py = ball.toPy;
      if (shotResult === "goal") {
        stage = "celebrate";
        stageT = 0;
        celebrateT = 0;
        showGoalText = true;
      } else {
        stage = "hold";
        stageT = 0;
        holdT = 0;
      }
    }
  } else if (stage === "hold") {
    holdT = (holdT || 0) + dt;
    if (holdT >= holdDur) done = true;
  } else if (stage === "celebrate") {
    celebrateT += dt;
    showGoalText = true;
    if (celebrateT >= celebrateDur) done = true;
  }

  return {
    seq: { ...seq, stage, stageT, celebrateT, holdT, ball },
    done,
    showGoalText,
    goalScored: done && shotResult === "goal",
  };
}

function GoalCelebrationOverlay({ flash, animTick }) {
  if (!flash) return null;
  const pulse = 1 + Math.sin(animTick * 0.12) * 0.08;
  const glow = 0.7 + Math.sin(animTick * 0.18) * 0.3;
  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      pointerEvents: "none", zIndex: 12,
      background: `radial-gradient(ellipse at center, rgba(111,174,90,${0.35 * glow}) 0%, rgba(0,0,0,${0.45 * glow}) 55%, transparent 80%)`,
    }}>
      <div style={{ transform: `scale(${pulse})`, textAlign: "center" }}>
        <div style={{
          fontFamily: DISPLAY_FONT, fontSize: "clamp(36px, 9vw, 58px)", fontWeight: 900,
          color: "#fff", letterSpacing: 3, lineHeight: 1.05,
          textShadow: "0 4px 0 #1a5c32, 0 8px 28px rgba(0,0,0,.85), 0 0 48px rgba(111,174,90,.95)",
          WebkitTextStroke: "1px rgba(0,0,0,.35)",
        }}>GOALLLLLL</div>
        {flash.player && (
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 15, color: C.gold, marginTop: 10, textShadow: "0 2px 8px rgba(0,0,0,.8)" }}>
            ⚽ {flash.player}
          </div>
        )}
      </div>
    </div>
  );
}

function LiveCommentaryStrip({ lines, minute }) {
  return (
    <div style={{
      background: FM_LIVE.panel, borderRadius: 8, padding: "8px 12px",
      border: `1px solid ${FM_LIVE.bar}`, marginTop: 6, minHeight: 48,
    }}>
      <div style={{ fontSize: 9, color: FM_LIVE.dim, fontFamily: MONO_FONT, marginBottom: 4 }}>
        คอมเมนตารี · นาที {minute}'
      </div>
      {lines.length === 0 ? (
        <div style={{ fontSize: 11, color: C.textDim }}>รอจังหวะแรก...</div>
      ) : lines.slice(0, 4).map((line, i) => (
        <div key={line.id} style={{
          fontSize: i === 0 ? 12 : 11, fontFamily: MONO_FONT,
          color: i === 0 ? C.chalk : C.textDim,
          marginBottom: i < Math.min(lines.length, 4) - 1 ? 3 : 0,
          opacity: 1 - i * 0.12,
        }}>
          {line.text}
        </div>
      ))}
    </div>
  );
}

function PossessionSwingView({ homeTeam, awayTeam, possSide, ballX, status, animTick }) {
  const bx = clamp(ballX, 0.12, 0.88) * 100;
  const homeCol = homeTeam.color || C.good;
  const awayCol = awayTeam.color || C.crimson;
  const activeCol = possSide === "home" ? homeCol : awayCol;
  const swingAmp = 6 + Math.sin(animTick * 0.09) * 3;
  const lineY1 = 12 - swingAmp * 0.3;
  const lineY2 = 12 + swingAmp * 0.3;
  const cx = 50;
  const pathD = possSide === "home"
    ? `M ${bx} ${lineY1} Q ${bx + 8} 6, ${cx} 12 Q ${bx + 4} 18, ${bx} ${lineY2}`
    : `M ${bx} ${lineY1} Q ${bx - 8} 6, ${cx} 12 Q ${bx - 4} 18, ${bx} ${lineY2}`;

  return (
    <div style={{
      background: FM_LIVE.panel, borderRadius: 12, padding: "14px 16px",
      border: `1px solid ${FM_LIVE.bar}`, minHeight: 100,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: DISPLAY_FONT, fontSize: 12, color: homeCol, fontWeight: 700 }}>{homeTeam.short}</span>
        <span style={{ fontFamily: MONO_FONT, fontSize: 9.5, color: FM_LIVE.dim }}>สถานะเกม</span>
        <span style={{ fontFamily: DISPLAY_FONT, fontSize: 12, color: awayCol, fontWeight: 700 }}>{awayTeam.short}</span>
      </div>
      <svg viewBox="0 0 100 24" width="100%" style={{ display: "block", height: 56 }}>
        <rect x="3" y="9" width="94" height="6" rx="3" fill="#1a5c32" opacity="0.55" />
        <rect x="3" y="9" width="94" height="6" rx="3" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.3" />
        <line x1="50" y1="7" x2="50" y2="17" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
        <path d={pathD} fill="none" stroke={activeCol} strokeWidth="0.7" opacity="0.75" strokeLinecap="round" />
        <circle cx={bx} cy="12" r="3.2" fill={activeCol} stroke="#fff" strokeWidth="0.5" opacity="0.95" />
        <circle cx={bx} cy="12" r="1.2" fill="#fff" opacity="0.5" />
      </svg>
      <div style={{ textAlign: "center", marginTop: 8, fontSize: 11.5, color: C.chalk, fontFamily: MONO_FONT, minHeight: 18 }}>
        {status}
      </div>
    </div>
  );
}

function HighlightMomentBanner({ seq }) {
  if (!seq) return null;
  if (seq.stage === "celebrate") return null;
  const label = GOAL_HIGHLIGHT_META[seq.type]?.label || "จังหวะยิง!";
  return (
    <div style={{
      position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", zIndex: 11,
      padding: "5px 14px", borderRadius: 8,
      background: "rgba(0,0,0,.72)", border: "1px solid rgba(224,164,88,.65)",
      boxShadow: "0 4px 16px rgba(0,0,0,.5)",
    }}>
      <span style={{ fontFamily: MONO_FONT, fontSize: 10, color: C.amber, marginRight: 8 }}>⏱ SLOW MOTION</span>
      <span style={{ fontFamily: DISPLAY_FONT, fontSize: 12.5, color: "#fff" }}>{label}</span>
    </div>
  );
}

function slotToPitch(slot, side) {
  const py = slot.x;
  const advance = (100 - slot.y) / 88;
  const px = side === "home" ? 8 + advance * 78 : 92 - advance * 78;
  return { px, py };
}

function pitchToScreen(px, py) {
  const x = PITCH.left + (clamp(px, 0, 100) / 100) * PITCH.width;
  const y = PITCH.top + (clamp(py, 0, 100) / 100) * PITCH.height;
  return { x, y, scale: 1, z: Math.round(y * 10) };
}

function forwardDelta(side, fromPx, toPx) {
  return side === "home" ? toPx - fromPx : fromPx - toPx;
}

function lerp(a, b, t) { return a + (b - a) * t; }
function easeOut(t) { return 1 - (1 - t) ** 2; }

function pickPassTarget(slots, side, carrierIdx, phase) {
  const carrier = slots[carrierIdx];
  const cPos = slotToPitch(carrier, side);
  const candidates = slots.map((s, i) => ({ i, ...slotToPitch(s, side) }))
    .filter((p) => p.i !== carrierIdx);

  const scored = candidates.map((p) => {
    const dx = forwardDelta(side, cPos.px, p.px);
    const dist = Math.hypot(p.px - cPos.px, p.py - cPos.py);
    const lateral = Math.abs(p.py - cPos.py);
    let score = dx * 3.5 - lateral * 0.15 + Math.random() * 3;
    const inBox = side === "home" ? p.px > 72 : p.px < 28;
    if (inBox) score += 12;
    if (dx < -1) score -= 10;
    if (phase === "through" && dx > 8) score += 10;
    if (phase === "safe" && dx < 0) score += 6;
    if (phase === "pass") {
      score += (dist > 5 && dist < 30 ? 10 : 2) - lateral * 0.08 + (dx > 0 ? dx * 0.6 : 0);
    }
    return { ...p, score, dx };
  });
  scored.sort((a, b) => b.score - a.score);

  if (phase === "through") {
    const ahead = scored.filter((p) => p.dx > 5);
    if (ahead.length) return ahead[0];
  }
  return scored[0];
}

function advanceBallVisual(prev, dt, { possSide, pressure, homeFormation, awayFormation, tick }) {
  const formation = possSide === "home" ? homeFormation : awayFormation;
  const slots = FORMATIONS[formation].slots;
  let next = { ...prev };
  const fwdSign = possSide === "home" ? 1 : -1;
  const isPassPhase = ["pass", "through", "safe", "contest"].includes(next.phase);
  const speed = next.phase === "shot" ? 2.6
    : next.phase === "dribble" ? 1.05
    : isPassPhase ? 2.15
    : 1.5;

  if (next.phase === "shot") {
    next.t = Math.min(1, next.t + speed * dt);
    const e = easeOut(next.t);
    next.px = lerp(next.fromPx, next.toPx, e);
    next.py = lerp(next.fromPy, next.toPy, e);
    if (next.t >= 1) {
      const gkSide = next.side === "home" ? "away" : "home";
      const gkPx = gkSide === "home" ? 14 : 86;
      if (next.shotResult === "goal") {
        next = {
          ...next, px: 50, py: 50, fromPx: 50, fromPy: 50, toPx: 50, toPy: 50,
          t: 1, phase: "dribble", shotResult: null, side: gkSide, carrier: 4,
          fromCarrier: null, toCarrier: null,
        };
      } else {
        next = {
          ...next, px: gkPx, py: clamp(next.py, 38, 62),
          fromPx: gkPx, fromPy: clamp(next.py, 38, 62), toPx: gkPx, toPy: clamp(next.py, 38, 62),
          t: 1, phase: "dribble", shotResult: null, side: gkSide, carrier: 0,
          fromCarrier: null, toCarrier: null,
        };
      }
    }
    return next;
  }

  if (prev.side !== possSide && prev.t >= 0.88 && !isPassPhase) {
    const stealIdx = Math.floor(Math.random() * slots.length);
    const stealPos = slotToPitch(slots[stealIdx], possSide);
    next = {
      ...next, side: possSide, carrier: stealIdx, fromCarrier: prev.carrier, toCarrier: stealIdx,
      phase: "contest", fromPx: prev.px, fromPy: prev.py, toPx: stealPos.px, toPy: stealPos.py, t: 0,
    };
  }

  next.t = Math.min(1, next.t + speed * dt);

  if (isPassPhase && next.t < 1) {
    const arcLift = next.phase === "through" ? 4 : next.phase === "pass" ? 2.2 : 1.2;
    const e = easeOut(next.t);
    const midPx = (next.fromPx + next.toPx) / 2 + fwdSign * (next.phase === "through" ? 2.5 : 0);
    const midPy = (next.fromPy + next.toPy) / 2 - arcLift * Math.sin(Math.PI * e);
    next.px = (1 - e) * (1 - e) * next.fromPx + 2 * (1 - e) * e * midPx + e * e * next.toPx;
    next.py = (1 - e) * (1 - e) * next.fromPy + 2 * (1 - e) * e * midPy + e * e * next.toPy;
    return next;
  }

  if (next.t >= 1) {
    next.px = next.toPx;
    next.py = next.toPy;

    if (isPassPhase) {
      next.carrier = next.toCarrier ?? next.carrier;
      next.fromCarrier = null;
      next.toCarrier = null;
      next.phase = "dribble";
      next.t = 0;
      next.fromPx = next.px;
      next.fromPy = next.py;
      const hold = fwdSign * 1.8;
      next.toPx = clamp(next.px + hold, PLAY_MIN_PX, PLAY_MAX_PX);
      next.toPy = next.py;
      return next;
    }

    const roll = tick % 10;
    if (roll <= 7) next.phase = "pass";
    else if (roll === 8) next.phase = "through";
    else if (roll === 9) next.phase = "dribble";
    else next.phase = "safe";

    if (next.phase === "dribble") {
      const fwd = fwdSign * (3.5 + pressure * 2);
      next.fromPx = next.px; next.fromPy = next.py;
      next.toPx = clamp(next.px + fwd, PLAY_MIN_PX, PLAY_MAX_PX);
      next.toPy = clamp(next.py + (Math.sin(tick * 0.3) * 1.2), 12, 88);
      next.fromCarrier = null;
      next.toCarrier = null;
      next.t = 0;
    } else {
      const fromIdx = next.carrier;
      const target = pickPassTarget(slots, possSide, fromIdx, next.phase);
      const passerPos = slotToPitch(slots[fromIdx], possSide);
      const recvPos = slotToPitch(slots[target.i], possSide);
      next.fromCarrier = fromIdx;
      next.toCarrier = target.i;
      next.fromPx = passerPos.px + fwdSign * 2.2;
      next.fromPy = passerPos.py;
      next.toPx = recvPos.px - fwdSign * 1.8;
      next.toPy = recvPos.py + (Math.random() - 0.5) * 2;
      next.t = 0;
    }
    next.side = possSide;
  }

  const e = easeOut(next.t);
  next.px = lerp(next.fromPx, next.toPx, e);
  next.py = lerp(next.fromPy, next.toPy, e);
  return next;
}

function computeLivePlayers(formationKey, side, ball, possSide, animTick) {
  const slots = FORMATIONS[formationKey].slots;
  const hasBall = side === possSide;
  const push = hasBall ? 0.32 : 0.16;
  const blockX = (ball.px - 50) * push;
  const blockY = (ball.py - 50) * push * 0.15;

  return slots.map((slot, i) => {
    const base = slotToPitch(slot, side);
    let { px, py } = base;
    px += blockX;
    py += blockY;

    const dist = Math.hypot(px - ball.px, py - ball.py);
    const isCarrier = hasBall && i === ball.carrier;
    const isGK = slot.pos === "GK";

    if (isGK) {
      px = side === "home" ? 10 : 90;
      py = clamp(ball.py * 0.6 + py * 0.4, 30, 70);
      if ((side === "home" && ball.px < 25) || (side === "away" && ball.px > 75)) {
        py += Math.sin(animTick * 0.1 + i) * 1.5;
      }
    } else if (isCarrier) {
      if (ball.phase === "shot" && ball.highlightType) {
        px = ball.fromPx + (side === "home" ? -2.5 : 2.5);
        py = ball.fromPy;
      } else {
        px = ball.px + (side === "home" ? -2.8 : 2.8);
        py = ball.py;
      }
    } else if (hasBall) {
      const towardBall = 0.25;
      px += (ball.px - px) * towardBall;
      py += (ball.py - py) * towardBall;
      const ahead = side === "home" ? 1.5 : -1.5;
      px += ahead;
    } else {
      px += (ball.px - px) * 0.14;
      py += (ball.py - py) * 0.1;
    }

    const screen = pitchToScreen(clamp(px, PLAY_MIN_PX, PLAY_MAX_PX), clamp(py, 8, 92));
    const running = !isGK && (isCarrier || dist < 20);
    const diving = isGK && ((side === "home" && ball.px < 22) || (side === "away" && ball.px > 78));
    return {
      ...screen, pos: slot.pos, facing: side === "home" ? 1 : -1,
      running, isCarrier, isGK, diving, idx: i, shirtNum: i + 1,
    };
  });
}

function FMGoal({ side }) {
  const x = side === "home" ? PITCH.left : PITCH.left + PITCH.width;
  const yT = PITCH.top + PITCH.height * 0.3;
  const yB = PITCH.top + PITCH.height * 0.7;
  const gW = 3.2;
  return (
    <g>
      <rect x={side === "home" ? x - gW : x} y={yT - 1} width={gW} height={yB - yT + 2}
        fill="none" stroke="#fff" strokeWidth="0.4" opacity="0.9" />
      {[0, 1, 2, 3].map((n) => (
        <line key={n} x1={side === "home" ? x - gW * (n / 3) : x + gW * (n / 3)} y1={yT}
          x2={side === "home" ? x - gW * (n / 3) : x + gW * (n / 3)} y2={yB}
          stroke="rgba(255,255,255,0.25)" strokeWidth="0.15" />
      ))}
    </g>
  );
}

function FMPlayerDot({ x, y, shirtColor, gkColor, num, isGK, isCarrier, isPasser, isReceiver, side }) {
  const fill = isGK ? gkColor : shirtColor;
  const textCol = dotTextColor(fill);
  const r = isGK ? 2.7 : 2.2;
  const strokeCol = isCarrier ? "#fff" : isPasser ? "#ffe566" : isReceiver ? "#a8e6ff" : "rgba(255,255,255,0.9)";
  const strokeW = isCarrier || isPasser || isReceiver ? 0.55 : 0.35;
  return (
    <g>
      <circle cx={x} cy={y} r={r + 0.55} fill="rgba(0,0,0,0.45)" />
      <circle cx={x} cy={y} r={r} fill={fill} stroke={strokeCol} strokeWidth={strokeW} />
      {isPasser && (
        <line x1={x} y1={y} x2={x + (side === "home" ? 2.8 : -2.8)} y2={y - 0.4}
          stroke="#ffe566" strokeWidth="0.35" strokeLinecap="round" opacity="0.85" />
      )}
      <text x={x} y={y + 0.8} textAnchor="middle" fontSize="2.05" fontWeight="800"
        fill={textCol} stroke={textCol === "#fff" ? "rgba(0,0,0,0.35)" : "none"} strokeWidth="0.15"
        fontFamily="Arial,sans-serif">{num}</text>
    </g>
  );
}

function SoccerBall({ x, y, phase, spin = 0 }) {
  const rot = spin + (phase === "shot" ? 220 : phase === "pass" || phase === "through" ? 140 : 60);
  return (
    <g transform={`translate(${x},${y}) rotate(${rot})`}>
      <circle r="1.65" fill="#f8f8f2" stroke="#1c1c1c" strokeWidth="0.22" />
      <polygon points="0,-0.75 0.71,-0.23 -0.44,0.61 0.44,0.61 -0.71,-0.23" fill="#111" />
      <polygon points="0,0.42 -0.38,0.72 0.38,0.72" fill="#111" opacity="0.9" />
      <polygon points="0,-0.42 0.55,0.05 -0.55,0.05" fill="#111" opacity="0.75" />
      <polygon points="0.85,-0.55 1.15,-0.1 0.75,0.25" fill="#111" opacity="0.55" />
      <polygon points="-0.85,-0.55 -1.15,-0.1 -0.75,0.25" fill="#111" opacity="0.55" />
      <circle r="0.42" cx="0.75" cy="-0.65" fill="#fff" opacity="0.55" />
      <circle r="0.18" cx="-0.55" cy="0.75" fill="#ddd" opacity="0.4" />
    </g>
  );
}

function BroadcastPitch({ homeTeam, awayTeam, homeFormation, awayFormation, ballSim, pressure, animTick }) {
  const possSide = ballSim.side;
  const homeDots = computeLivePlayers(homeFormation, "home", ballSim, possSide, animTick);
  const awayDots = computeLivePlayers(awayFormation, "away", ballSim, possSide, animTick);
  const ballScreen = pitchToScreen(ballSim.px, ballSim.py);
  const allPlayers = [
    ...homeDots.map((d, i) => ({ ...d, team: homeTeam, side: "home", key: "h" + i })),
    ...awayDots.map((d, i) => ({ ...d, team: awayTeam, side: "away", key: "a" + i })),
  ].sort((a, b) => a.z - b.z);
  const pl = PITCH.left;
  const pt = PITCH.top;
  const pw = PITCH.width;
  const ph = PITCH.height;
  const cx = pl + pw / 2;
  const cy = pt + ph / 2;

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `2px solid ${C.steel}`, boxShadow: "0 8px 28px rgba(0,0,0,.45)" }}>
      <svg viewBox="0 0 100 62" width="100%" style={{ display: "block", background: "#1a2840" }}>
        <defs>
          <pattern id="fmStripes" width="5" height="62" patternUnits="userSpaceOnUse">
            <rect width="2.5" height="62" fill="#1a5c32" opacity="0.45" />
          </pattern>
        </defs>

        {/* pitch grass */}
        <rect x={pl} y={pt} width={pw} height={ph} fill="#2a7d42" />
        <rect x={pl} y={pt} width={pw} height={ph} fill="url(#fmStripes)" />

        {/* markings */}
        <rect x={pl} y={pt} width={pw} height={ph} fill="none" stroke={C.pitchLine} strokeWidth="0.4" opacity="0.85" />
        <line x1={cx} y1={pt} x2={cx} y2={pt + ph} stroke={C.pitchLine} strokeWidth="0.35" opacity="0.75" />
        <circle cx={cx} cy={cy} r={6.5} fill="none" stroke={C.pitchLine} strokeWidth="0.3" opacity="0.7" />
        <circle cx={cx} cy={cy} r="0.55" fill={C.pitchLine} opacity="0.8" />
        {/* penalty areas */}
        <rect x={pl} y={cy - 10} width={13} height={20} fill="none" stroke={C.pitchLine} strokeWidth="0.25" opacity="0.55" />
        <rect x={pl + pw - 13} y={cy - 10} width={13} height={20} fill="none" stroke={C.pitchLine} strokeWidth="0.25" opacity="0.55" />
        {/* goals on end lines */}
        <FMGoal side="home" />
        <FMGoal side="away" />

        {/* players */}
        {allPlayers.map((p) => (
          <FMPlayerDot key={p.key} x={p.x} y={p.y}
            shirtColor={teamShirtColor(p.team)}
            gkColor={gkKitColor(p.team, p.side)}
            num={p.shirtNum}
            isGK={p.isGK} isCarrier={p.isCarrier} side={p.side} />
        ))}

        {/* ball — ลูกบอลจริง อยู่หน้าตัวผู้เล่นที่ครองบอล / พุ่งเข้าประตูตอนยิง */}
        <SoccerBall x={ballScreen.x} y={ballScreen.y} phase={ballSim.phase} />
      </svg>
    </div>
  );
}
function StatRow({ label, home, away }) {
  const total = home + away || 1;
  const homePct = (home / total) * 100;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, fontFamily: MONO_FONT, color: C.textDim, marginBottom: 2 }}>
        <span style={{ color: C.chalk }}>{home}</span><span>{label}</span><span style={{ color: C.chalk }}>{away}</span>
      </div>
      <div style={{ display: "flex", width: "100%", height: 5, borderRadius: 3, overflow: "hidden", background: C.steel }}>
        <div style={{ width: `${homePct}%`, background: C.good }} />
        <div style={{ width: `${100 - homePct}%`, background: C.crimson }} />
      </div>
    </div>
  );
}
function SubPicker({ myXI, mySquad, bench, onSub, disabled }) {
  const [outId, setOutId] = useState(null);
  const xiPlayers = mySquad.filter((p) => myXI.includes(p.id));
  return (
    <div>
      <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4 }}>ตัวจริง (แตะเพื่อเลือกออก)</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {xiPlayers.map((p) => (
          <button key={p.id} onClick={() => setOutId(p.id)} style={{ fontSize: 11, padding: "5px 8px", borderRadius: 6, border: `1px solid ${outId === p.id ? C.crimson : C.steel}`, background: outId === p.id ? "rgba(193,68,14,.2)" : "transparent", color: C.chalk, cursor: "pointer" }}>{p.name} ({p.position})</button>
        ))}
      </div>
      {outId && (
        <>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4 }}>ตัวสำรอง ({POS_TH[mySquad.find((p) => p.id === outId)?.position]}) — แตะเพื่อส่งลง</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {bench.filter((p) => p.position === mySquad.find((pp) => pp.id === outId)?.position).map((p) => (
              <button key={p.id} disabled={disabled} onClick={() => onSub(outId, p.id)} style={{ fontSize: 11, padding: "5px 8px", borderRadius: 6, border: `1px solid ${C.good}`, background: "rgba(111,174,90,.15)", color: C.chalk, cursor: disabled ? "not-allowed" : "pointer" }}>{p.name} (เรต {p.rating})</button>
            ))}
            {bench.filter((p) => p.position === mySquad.find((pp) => pp.id === outId)?.position).length === 0 && <div style={{ fontSize: 11, color: C.textDim }}>ไม่มีตัวสำรองตำแหน่งนี้</div>}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================== TRAINING ============================== */
function TrainingView({ trainingPlan, autoTraining, currentSlot, onSetDay, onToggleAuto, onAutoAssign, facilities, budget, onUpgradeFacility }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel>
        <SectionLabel>ศูนย์ฝึกสโมสร</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FACILITY_TYPES.map((type) => {
            const level = (facilities || {})[type] || 1;
            const cost = facilityUpgradeCost(level);
            const maxed = level >= 5;
            return (
              <div key={type} style={{ padding: "8px 10px", borderRadius: 8, background: C.panel2, border: `1px solid ${C.steel}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{FACILITY_TH[type]} <span style={{ color: C.amber, fontFamily: MONO_FONT }}>Lv.{level}</span></div>
                  {!maxed && (
                    <button disabled={budget < cost} onClick={() => onUpgradeFacility(type)} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, border: "none", background: budget >= cost ? C.good : "#2b332f", color: budget >= cost ? "#08150e" : C.textDim, cursor: budget >= cost ? "pointer" : "not-allowed", fontWeight: 700 }}>อัปเกรด {formatMoney(cost)}</button>
                  )}
                  {maxed && <span style={{ fontSize: 10, color: C.gold }}>สูงสุดแล้ว</span>}
                </div>
                <div style={{ fontSize: 10.5, color: C.textDim, marginBottom: 4 }}>{FACILITY_DESC[type]}</div>
                <MiniBar value={(level / 5) * 100} color={C.amber} />
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel style={{ border: `1px solid ${C.purple}` }}>
        <SectionLabel style={{ color: C.purple }}>โปรแกรมฝึก 10 วัน</SectionLabel>
        <div style={{ fontSize: 12, color: C.textDim, marginBottom: 10 }}>1 วันแข่ง ≈ 1 ช่องฝึกในรอบนี้ ถึงวันที่ 10 แล้ววนกลับมาวันที่ 1 ใหม่ วางแผนล่วงหน้าได้ว่าวันไหนพัก วันไหนซ้อมหนัก</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onToggleAuto} style={{ ...btnStyle(autoTraining ? C.purple : C.steel, autoTraining ? "#fff" : C.chalk), flex: 1 }}>{autoTraining ? "ปิดออโต้ (จัดเอง)" : "เปิดให้โค้ชจัดอัตโนมัติ"}</button>
          <button onClick={onAutoAssign} style={{ ...btnStyle(C.steel, C.chalk), flex: 1 }}>สุ่มโปรแกรมใหม่</button>
        </div>
      </Panel>
      <Panel>
        <SectionLabel>ปฏิทินฝึกซ้อม</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {trainingPlan.map((type, idx) => (
            <button key={idx} onClick={() => { if (!autoTraining) onSetDay(idx, TRAINING_TYPES[(TRAINING_TYPES.indexOf(type) + 1) % TRAINING_TYPES.length]); }} style={{
              textAlign: "left", padding: "10px 12px", borderRadius: 10, cursor: autoTraining ? "default" : "pointer",
              border: `2px solid ${idx === currentSlot ? C.amber : C.steel}`, background: idx === currentSlot ? "rgba(224,164,88,.12)" : C.panel2,
            }}>
              <div style={{ fontSize: 10, color: C.textDim }}>วันที่ {idx + 1} {idx === currentSlot && "· วันนี้"}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: TRAINING_COLOR[type], marginTop: 2 }}>{TRAINING_TH[type]}</div>
            </button>
          ))}
        </div>
        {!autoTraining && <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 10 }}>แตะการ์ดเพื่อวนเปลี่ยนประเภทการฝึกของวันนั้น</div>}
      </Panel>
      <Panel>
        <SectionLabel>ผลของแต่ละประเภท</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5, color: C.textDim }}>
          <div><b style={{ color: TRAINING_COLOR.REST }}>พักฟื้น</b> — ฟื้นสตามินาเพิ่ม ไม่เสียพลังงาน มูดดีขึ้นเล็กน้อย</div>
          <div><b style={{ color: TRAINING_COLOR.FITNESS }}>ฟิตเนส</b> — เพิ่มความเร็ว/พละกำลัง/ความคล่องตัว</div>
          <div><b style={{ color: TRAINING_COLOR.SHOOTING }}>ซ้อมยิงประตู</b> — เพิ่มยิงประตู/เลี้ยงบอล/ความนิ่ง</div>
          <div><b style={{ color: TRAINING_COLOR.DEFENDING }}>ซ้อมเกมรับ</b> — เพิ่มการตัดสินใจ/โหม่ง/วิสัยทัศน์</div>
          <div><b style={{ color: TRAINING_COLOR.TACKLING }}>ซ้อมสกัด/ปะทะ</b> — เพิ่มปะทะ-สกัด/พละกำลัง/ความมุ่งมั่น</div>
          <div>ทุกประเภท (ยกเว้นพักฟื้น) ใช้สตามินาเพิ่มเล็กน้อย</div>
        </div>
      </Panel>
    </div>
  );
}

/* ============================== YOUTH ACADEMY ============================== */
function AcademyView({ career, budget, onHireScout, onRerollScout, onHireAcademyManager, onRerollAcademyManager, onSignProspect, onLoanOut, onSellAcademy, onPromote }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel>
        <SectionLabel>แมวมอง</SectionLabel>
        {career.scout ? (
          <div style={{ fontSize: 12.5, fontFamily: MONO_FONT, color: C.textDim }}>{career.scout.name} · เกรด {career.scout.grade}/5 · ค่าเหนื่อย {formatMoney(career.scout.weeklyWage)}/วัน</div>
        ) : career.scoutOffer ? (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{career.scoutOffer.name} (เกรด {career.scoutOffer.grade}/5)</div>
            <div style={{ fontSize: 11, color: C.textDim, fontFamily: MONO_FONT, margin: "4px 0 10px" }}>ค่าแรกเข้า {formatMoney(career.scoutOffer.signingCost)} · ค่าเหนื่อย {formatMoney(career.scoutOffer.weeklyWage)}/วัน</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onHireScout} style={{ ...btnStyle(C.good, "#08150e"), flex: 1 }}>จ้าง</button>
              <button disabled={(career.scoutRerollCount || 0) >= 5} onClick={onRerollScout} style={{ ...btnStyle((career.scoutRerollCount || 0) >= 5 ? "#2b332f" : C.steel, (career.scoutRerollCount || 0) >= 5 ? C.textDim : C.chalk), flex: 1 }}>สุ่มใหม่ ({5 - (career.scoutRerollCount || 0)} เหลือวันนี้)</button>
            </div>
          </div>
        ) : <div style={{ fontSize: 12, color: C.textDim }}>รอผู้สมัครใหม่สัปดาห์หน้า</div>}
      </Panel>

      <Panel>
        <SectionLabel>ผจก.อคาเดมี</SectionLabel>
        {career.academyManager ? (
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>{career.academyManager.name}</div>
            <div style={{ marginTop: 8 }}><RadarStats stats={career.academyManager.stats} /></div>
          </div>
        ) : career.academyManagerOffer ? (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{career.academyManagerOffer.name}</div>
            <div style={{ fontSize: 11, color: C.textDim, fontFamily: MONO_FONT, margin: "4px 0 8px" }}>ค่าแต่งตั้ง {formatMoney(career.academyManagerOffer.signingCost)} · ค่าเหนื่อย {formatMoney(career.academyManagerOffer.weeklyWage)}/วัน</div>
            <div style={{ marginBottom: 10 }}><RadarStats stats={career.academyManagerOffer.stats} /></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onHireAcademyManager} style={{ ...btnStyle(C.purple, "#fff"), flex: 1 }}>แต่งตั้ง</button>
              <button disabled={(career.academyManagerRerollCount || 0) >= 5} onClick={onRerollAcademyManager} style={{ ...btnStyle((career.academyManagerRerollCount || 0) >= 5 ? "#2b332f" : C.steel, (career.academyManagerRerollCount || 0) >= 5 ? C.textDim : C.chalk), flex: 1 }}>สุ่มใหม่ ({5 - (career.academyManagerRerollCount || 0)} เหลือวันนี้)</button>
            </div>
          </div>
        ) : <div style={{ fontSize: 12, color: C.textDim }}>รอผู้สมัครใหม่สัปดาห์หน้า</div>}
      </Panel>

      <Panel>
        <SectionLabel>ดาวรุ่งที่แมวมองพบ ({career.youthProspects.length})</SectionLabel>
        {career.youthProspects.length === 0 && <div style={{ fontSize: 12, color: C.textDim }}>ยังไม่มี — จ้างแมวมองเพื่อเริ่มค้นหา</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {career.youthProspects.map((p) => (
            <div key={p.prospectId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.steel}` }}>
              <RatingBadge value={p.rating} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name} <span style={{ fontSize: 10, color: POS_COLOR[p.position] }}>{POS_TH[p.position]}</span></div>
                <div style={{ fontSize: 11, color: C.textDim, fontFamily: MONO_FONT }}>อายุ {p.age} · ศักยภาพ {bandOf(p.potential)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: C.amber, fontFamily: MONO_FONT }}>{formatMoney(p.signingCost)}</div>
                <button disabled={budget < p.signingCost} onClick={() => onSignProspect(p.prospectId)} style={{ marginTop: 4, background: budget >= p.signingCost ? C.good : "#2b332f", color: budget >= p.signingCost ? "#08150e" : C.textDim, border: "none", borderRadius: 6, fontSize: 10, padding: "3px 10px", cursor: budget >= p.signingCost ? "pointer" : "not-allowed", fontWeight: 700 }}>เซ็นสัญญา</button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionLabel>ทีมอคาเดมี ({career.academyPlayers.length})</SectionLabel>
        {career.academyPlayers.length === 0 && <div style={{ fontSize: 12, color: C.textDim }}>ยังไม่มีดาวรุ่งในอคาเดมี</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {career.academyPlayers.map((p) => {
            const onLoan = career.loans.find((l) => l.prospectId === p.id);
            return (
              <div key={p.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.steel}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <RatingBadge value={p.rating} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name} <span style={{ fontSize: 10, color: POS_COLOR[p.position] }}>{POS_TH[p.position]}</span></div>
                    <div style={{ fontSize: 11, color: C.textDim, fontFamily: MONO_FONT }}>อายุ {p.age} · ศักยภาพ {bandOf(p.potential)} · {formatMoney(p.value)}</div>
                    {onLoan && <div style={{ fontSize: 10.5, color: C.amber, marginTop: 2 }}>📤 ยืมตัวอยู่ที่ {onLoan.toTeamName} (เหลือ {onLoan.daysLeft} วัน)</div>}
                  </div>
                </div>
                {onLoan ? (
                  onLoan.log && onLoan.log.length > 0 && (
                    <div style={{ marginTop: 6, marginLeft: 40, fontSize: 10.5, color: C.textDim, fontFamily: MONO_FONT }}>
                      ฟอร์มล่าสุด: {onLoan.log.slice(0, 3).map((l, i) => <span key={i}>{l.rating}{l.goal ? "⚽" : ""}{i < 2 ? " · " : ""}</span>)}
                    </div>
                  )
                ) : (
                  <div style={{ display: "flex", gap: 6, marginTop: 6, marginLeft: 40 }}>
                    <button onClick={() => onLoanOut(p.id)} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.amber}`, background: "transparent", color: C.amber, cursor: "pointer" }}>ปล่อยยืมตัว</button>
                    <button onClick={() => onPromote(p.id)} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.good}`, background: "transparent", color: C.good, cursor: "pointer" }}>เลื่อนขึ้นทีมชุดใหญ่</button>
                    <button onClick={() => onSellAcademy(p.id)} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.crimson}`, background: "transparent", color: C.crimson, cursor: "pointer" }}>ขาย</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/* ============================== SETTINGS ============================== */
function SettingsView({ career, onReset, onEnterOnline }) {
  const [confirming, setConfirming] = useState(false);
  const fin = computeTeamFinances(career);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SandboxModePanel career={career} onEnterOnline={onEnterOnline} />
      <Panel>
        <SectionLabel>ข้อมูลอาชีพ</SectionLabel>
        <div style={{ fontSize: 12.5, color: C.textDim, lineHeight: 1.8, fontFamily: MONO_FONT }}>
          ทีม: {career.teams.find((t) => t.id === career.userTeamId).name}<br />
          โหมด: {career.playMode === "online" ? "ออนไลน์" : "โลกจำลอง (ซิงเกิล)"}<br />
          มูลค่าสโมสรรวม: {formatMoney(fin.teamValue)}<br />
          (นักเตะ {formatMoney(fin.squadValue)} · อคาเดมี {formatMoney(fin.academyValue)} · ศูนย์ฝึก {formatMoney(fin.facilitiesValue)} · งบ {formatMoney(fin.budget)})<br />
          ฤดูกาล: {career.season} · วันที่: {career.day}<br />
          ตลาดเปิด: 12:00-14:00 และ 18:00-22:00 (ตามเวลาเครื่องนี้)<br />
          ข้อมูลถูกบันทึกอัตโนมัติในเบราว์เซอร์นี้
        </div>
      </Panel>
      <Panel>
        <SectionLabel style={{ color: C.textDim }}>โลกจำลอง vs ออนไลน์</SectionLabel>
        <div style={{ fontSize: 11.5, color: C.textDim, lineHeight: 1.7 }}>
          โลกจำลอง = เล่นคนเดียวกับบอท ฝึกบริหารทีมโดยไม่กระทบผู้เล่นจริง
          <br />ปลดล็อกออนไลน์เมื่อมูลค่าสโมสรรวมทุกอย่าง ≥ 50M฿ และไม่ติดลบ
        </div>
      </Panel>
      <Panel>
        <SectionLabel>เริ่มอาชีพใหม่</SectionLabel>
        <div style={{ fontSize: 12, color: C.textDim, marginBottom: 10 }}>การเริ่มใหม่จะลบข้อมูลอาชีพปัจจุบันทั้งหมด</div>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} style={{ ...btnStyle("transparent", C.crimson), border: `1px solid ${C.crimson}` }}>ล้างข้อมูล / เริ่มอาชีพใหม่</button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onReset} style={{ ...btnStyle(C.crimson, "#fff"), flex: 1 }}>ยืนยันลบ</button>
            <button onClick={() => setConfirming(false)} style={{ ...btnStyle(C.steel, C.chalk), flex: 1 }}>ยกเลิก</button>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ============================== BOTTOM NAV ============================== */
function BottomNav({ tab, setTab, marketOpen }) {
  const items = [
    { id: "dashboard", label: "หน้าหลัก", icon: "🏟" },
    { id: "squad", label: "นักเตะ", icon: "👕" },
    { id: "tactics", label: "แทคติก", icon: "📋" },
    { id: "training", label: "ฝึกซ้อม", icon: "🏋️" },
    { id: "academy", label: "อคาเดมี", icon: "🌱" },
    { id: "table", label: "ตาราง", icon: "📊" },
    { id: "market", label: "ตลาด", icon: marketOpen ? "🟢" : "💱" },
    { id: "settings", label: "ตั้งค่า", icon: "⚙" },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: `linear-gradient(0deg, ${C.panel2}, ${C.panel2}ee)`, backdropFilter: "blur(6px)", borderTop: `1px solid ${C.steel}`, display: "flex", overflowX: "auto", zIndex: 20, boxShadow: "0 -2px 10px rgba(0,0,0,.3)" }}>
      {items.map((it) => (
        <button key={it.id} onClick={() => setTab(it.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "transparent", border: "none", color: tab === it.id ? C.amber : C.textDim, cursor: "pointer", padding: "7px 10px", minWidth: 62, flexShrink: 0 }}>
          <span style={{ fontSize: 17 }}>{it.icon}</span>
          <span style={{ fontSize: 9, whiteSpace: "nowrap" }}>{it.label}</span>
        </button>
      ))}
    </div>
  );
}
