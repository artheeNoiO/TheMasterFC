import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  LEGEND_LEAGUES, LEGEND_TEAMS, LEGEND_PLAYERS, LEGEND_INACTIVE_DAYS,
  LEGEND_ACQUIRE_MIN_TEAM_VALUE, canBidForLegend,
  getLegendsForTeam, getLegendById, legendNationality,
  getRosterForTeam, hasFullRosterLeague, ROSTER_STATS, getRosterForLeague,
} from "@legend";
import { starsFromRating, getPlayerStarProfile, STAR_LABEL_TH, STAR_MAX, starWageMultiplier } from "@stars";
import { GAME_NAME, GAME_TAGLINE, GAME_VERSION, SAVE_VERSION, FEATURES, STARTING_BUDGET, STARTER_MASTER_COINS, BETA_TEST, BETA_STARTING_BUDGET, BETA_STARTER_MASTER_COINS, GAME_DISCORD_URL, GAME_DISCORD_LABEL, GAME_DISCORD_HINT, DAILY_STAFF_CARD_DRAWS, MINUTES_PER_GAME_DAY, MATCH_DAYS_PER_SEASON, GAME_MINUTE_REAL_SECONDS, DIVISION_NAMES } from "@version";
import {
  genPlayerName, pickNationalityForTeam, pickNationality, getNationality,
  formatNationality, ensurePlayerNationality, resolvePlayerNationality,
} from "@nat";
import { BetaStrip } from "@beta";
import { getDefaultGameUiLang } from "@locale";
import { t, resolveUiLang, UI_LANGS } from "@i18n";
import {
  STADIUM_LEVELS, EXTRA_STAFF_EFFECTS, getStadiumLevel, getStadiumDef, stadiumName,
  stadiumUpgradeCost, stadiumAssetValue, stadiumFanCapBonus,
  initBoard, boardTargetLabel, staffSupportBonuses, mergeManagerPlanWithStaff,
  refreshBoardAfterUserMatch, processBoardSeasonEnd,
  headMedicalTeamBuff, dailyMedicalRecoveryDays, headMedicalRehabStaminaBonus, headMedicalLongInjuryClear,
  getClubTier, clubTierProgress, getMaxRoomLevel, CLUB_TIER_NAMES,
  GLOBAL_FANBASE_AWARDS, OWNER_XP_AWARDS, getOwnerLevelProgress,
} from "@club";
import {
  ensureRoadmapFields, initRoadmapOnCareer, runDailyRoadmapTick, runSeasonEndRoadmap,
  recordMatchXg, recordTransferSpend, canAffordTransferFfp, enrichPlayerContract,
  applyInjuryToPlayer, blocksHeavyTraining, applyPressChoice, resolvePlayerConversation,
  isDerbyMatch, derbyMoraleBonus, runPreSeasonFriendlies,
  canRunYouthIntakeCeremony, markYouthIntakeCeremony, addShadowTarget, checkShadowMarketAlerts,
  assignScoutZone, SCOUT_ZONES, INJURY_SEVERITY,
  INJURY_TYPES, REINJURY_RISK_MULT, markRecoveredFragile, isPlayerFragile,
} from "@roadmapfx";
import {
  staffGuideCategories, staffGuideRolesByCategory,
  isStaffGuideRoleHired, isStaffGuideSpecialHired,
} from "@staffguide";
import {
  buildCoachProfile, ensureCoachProfile, coachDailyAttrBump, coachSynergyExtraBump,
  coachDrillMult, coachFitnessStaminaPerDay, coachTrainingMoraleTick, applyCoachSeasonXp,
  coachImpactSummary, coachCardStatRows, COACH_SPECIALTY_DEF, COACHING_STYLES, COACH_TRAITS,
} from "@coach";
import {
  snapshotPlayerAttrs, computePlayerAttrDeltas, appendTrainingReport, buildTrainingDayReport,
  buildSquadTrainingRecommendations, suggestDrillPlanForGroup, formatDeltaSummary,
} from "@training";
import { useStadiumCrowd, isCrowdMuted, setCrowdMuted } from "@crowd";
import { playUiSound, inferToastSound, isSfxMuted, setSfxMuted, getSfxVolume, setSfxVolume } from "@uisound";
import { TrackerMatchView, pitchToWide, V0PitchSVG, TrackerPlayerDots } from "@tracker";
import { ClubBadge, LOGO_ICONS, shadeColor } from "./club-badge.jsx";
import IntroCutscene, { INTRO_SEEN_KEY } from "./intro-cutscene.jsx";
import { buildNewClubWorldNews, WorldNewsFlash, HomeNewsPanel } from "./world-news.jsx";
import {
  careerSaveKey, profileSaveKey, introSeenKey,
  rememberLastUsername,
} from "@save";
import {
  fetchMyShardClub, fetchShardRoster, fetchMyOffers,
  sendPlayerOffer as sendOnlinePlayerOffer, acceptOffer as acceptOnlineOffer,
  rejectOffer as rejectOnlineOffer, counterOffer as counterOnlineOffer,
  cancelMyOffer as cancelOnlineOffer,
} from "@onlineneg";
import {
  fetchShardMatchesToday, fetchLiveMatch, substitutePlayer, setMatchMentality as setOnlineMatchMentality,
} from "@onlinematch";
import { createOnlineClubDirect } from "@onlinesession";
import { fetchBattlePassStatus, claimBattlePassTier as claimOnlineBattlePassTier } from "@battlepass";
import { pullOnlineStaffMachine } from "./client/src/lib/staff-machine.js";
import {
  createAmbientPitchState, advanceAmbientPitch, ambientAsBallSim,
  computeAmbientLivePlayers, beginAmbientShot, startCornerScene, startFreekickScene, startPenaltyScene,
  slotToPitchAmbient,
} from "./live-pitch-ambient.js";
import "./fc-ui-theme.css";
import FeedbackBoard from "@feedback";
import { stadiumProgressSteps } from "@stadium";

/* ============================== DESIGN TOKENS (match landing / themasterfc.com) ============================== */
const C = {
  pitchDark: "#050608", pitch: "rgba(5,6,8,.72)", pitchLine: "#e8ece9", chalk: "#ffffff",
  panel: "rgba(255,255,255,0.04)", panel2: "rgba(5,6,8,0.5)", amber: "#d4af37", amberDim: "#a8892a",
  crimson: "#d45a3a", good: "#3dba6a", steel: "rgba(255,255,255,0.1)", steelLight: "rgba(255,255,255,0.18)",
  textDim: "#9aa3ad", gold: "#d4af37", blue: "#5a9bd5", purple: "#9d6fe0",
  fmAccent: "#3dba6a", fmBorder: "rgba(255,255,255,0.08)", fmRowHi: "rgba(61,186,106,.12)",
};
const DISPLAY_FONT = '"Barlow Condensed", "Segoe UI", sans-serif';
const MONO_FONT = 'ui-monospace, "SF Mono", "Courier New", monospace';
const FM_FONT = '"Inter", "Segoe UI", system-ui, sans-serif';

const BRAND_SPLASH_LOGO = "/branding/master-logo.png";
const BRAND_LOGIN_BG = "/branding/login-bg.png";

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

/* selectable crest icons + shape variants + color-shade helper, used by ClubBadge for every team in the league */
/* ============================== ตำแหน่งละเอียดแบบ FM (14 ตำแหน่ง) ============================== */
/* p.position = กลุ่มหยาบ (GK/DF/MF/FW) ใช้กับโค้ช/ซ้อม/engine เหมือนเดิม
   p.pos      = ตำแหน่งละเอียดแบบ FM · p.altPos = ตำแหน่งรอง (เล่นได้ โดนโทษน้อย) */
const DETAIL_POSITIONS = ["GK", "DL", "DC", "DR", "WBL", "WBR", "DM", "ML", "MC", "MR", "AML", "AMC", "AMR", "ST"];
const POS_GROUP = {
  GK: "GK", DL: "DF", DC: "DF", DR: "DF", WBL: "DF", WBR: "DF",
  DM: "MF", ML: "MF", MC: "MF", MR: "MF", AML: "MF", AMC: "MF", AMR: "MF", ST: "FW",
  DF: "DF", MF: "MF", FW: "FW", // เผื่อรับค่ากลุ่มหยาบตรงๆ
};
const DPOS_TH = {
  GK: "ผู้รักษาประตู", DL: "แบ็คซ้าย", DC: "เซ็นเตอร์แบ็ค", DR: "แบ็คขวา",
  WBL: "วิงแบ็คซ้าย", WBR: "วิงแบ็คขวา", DM: "มิดฟิลด์ตัวรับ",
  ML: "มิดฟิลด์ซ้าย", MC: "มิดฟิลด์ตัวกลาง", MR: "มิดฟิลด์ขวา",
  AML: "ปีกซ้าย", AMC: "ตัวรุกหมายเลข 10", AMR: "ปีกขวา", ST: "กองหน้าตัวเป้า",
};
/* พิกัดเชิงแถว/ฝั่ง ใช้คำนวณความคุ้นเคยข้ามตำแหน่ง (row มาก = สูงขึ้นสนาม) */
const DPOS_META = {
  GK: { row: 0, side: "C" },
  DL: { row: 1, side: "L" }, DC: { row: 1, side: "C" }, DR: { row: 1, side: "R" },
  WBL: { row: 1.7, side: "L" }, WBR: { row: 1.7, side: "R" },
  DM: { row: 2.3, side: "C" },
  ML: { row: 3, side: "L" }, MC: { row: 3, side: "C" }, MR: { row: 3, side: "R" },
  AML: { row: 3.8, side: "L" }, AMC: { row: 3.8, side: "C" }, AMR: { row: 3.8, side: "R" },
  ST: { row: 4.6, side: "C" },
};
/* ความคุ้นเคยของตำแหน่งธรรมชาติ nat เมื่อไปยืนช่อง slot (1 = ตรงตำแหน่ง) */
function dposFamiliarity(nat, slot) {
  if (!slot || nat === slot) return 1;
  if (nat === "GK" || slot === "GK") return 0.45;
  const a = DPOS_META[nat], b = DPOS_META[slot];
  if (!a || !b) return 0.8;
  let pen = Math.abs(a.row - b.row) * 0.085;
  if (a.side !== b.side) pen += a.side !== "C" && b.side !== "C" ? 0.06 : 0.10;
  return clamp(1 - pen, 0.4, 0.97);
}
/* ความคุ้นเคยที่ดีที่สุดของนักเตะต่อช่องหนึ่ง — คิดตำแหน่งรองให้ด้วย (รองเพดาน 0.95 แบบ FM) */
function playerSlotFamiliarity(p, slotDpos) {
  if (!slotDpos) return 1;
  const nat = p.pos || p.position;
  let best = dposFamiliarity(nat, slotDpos);
  (p.altPos || []).forEach((ap) => {
    const f = ap === slotDpos ? 0.95 : dposFamiliarity(ap, slotDpos) * 0.9;
    if (f > best) best = f;
  });
  return best;
}
/* ตัวคูณโทษยืนผิดตำแหน่ง — รองรับทั้งช่องละเอียด (DL/AMR/...) และค่ากลุ่มหยาบเก่า */
function playerOopMult(p, slotPos) {
  if (!slotPos) return 1;
  if (DPOS_META[slotPos]) {
    if (!p.pos) return outOfPositionMult(p.position, POS_GROUP[slotPos]);
    return playerSlotFamiliarity(p, slotPos);
  }
  return outOfPositionMult(p.position, slotPos);
}

const FORMATIONS = {
  "4-4-2": { label: "4-4-2",
    slots: [
      { dpos: "GK", x: 50, y: 92 },
      { dpos: "DL", x: 15, y: 72 }, { dpos: "DC", x: 38, y: 76 }, { dpos: "DC", x: 62, y: 76 }, { dpos: "DR", x: 85, y: 72 },
      { dpos: "ML", x: 15, y: 48 }, { dpos: "MC", x: 38, y: 52 }, { dpos: "MC", x: 62, y: 52 }, { dpos: "MR", x: 85, y: 48 },
      { dpos: "ST", x: 37, y: 22 }, { dpos: "ST", x: 63, y: 22 },
    ] },
  "4-3-3": { label: "4-3-3",
    slots: [
      { dpos: "GK", x: 50, y: 92 },
      { dpos: "DL", x: 15, y: 72 }, { dpos: "DC", x: 38, y: 76 }, { dpos: "DC", x: 62, y: 76 }, { dpos: "DR", x: 85, y: 72 },
      { dpos: "MC", x: 25, y: 50 }, { dpos: "DM", x: 50, y: 54 }, { dpos: "MC", x: 75, y: 50 },
      { dpos: "AML", x: 18, y: 22 }, { dpos: "ST", x: 50, y: 18 }, { dpos: "AMR", x: 82, y: 22 },
    ] },
  "3-5-2": { label: "3-5-2",
    slots: [
      { dpos: "GK", x: 50, y: 92 },
      { dpos: "DC", x: 25, y: 74 }, { dpos: "DC", x: 50, y: 78 }, { dpos: "DC", x: 75, y: 74 },
      { dpos: "WBL", x: 10, y: 50 }, { dpos: "MC", x: 32, y: 54 }, { dpos: "MC", x: 50, y: 46 }, { dpos: "MC", x: 68, y: 54 }, { dpos: "WBR", x: 90, y: 50 },
      { dpos: "ST", x: 37, y: 22 }, { dpos: "ST", x: 63, y: 22 },
    ] },
  "5-3-2": { label: "5-3-2",
    slots: [
      { dpos: "GK", x: 50, y: 92 },
      { dpos: "WBL", x: 8, y: 68 }, { dpos: "DC", x: 29, y: 76 }, { dpos: "DC", x: 50, y: 78 }, { dpos: "DC", x: 71, y: 76 }, { dpos: "WBR", x: 92, y: 68 },
      { dpos: "MC", x: 25, y: 48 }, { dpos: "DM", x: 50, y: 52 }, { dpos: "MC", x: 75, y: 48 },
      { dpos: "ST", x: 37, y: 22 }, { dpos: "ST", x: 63, y: 22 },
    ] },
  "4-2-3-1": { label: "4-2-3-1",
    slots: [
      { dpos: "GK", x: 50, y: 92 },
      { dpos: "DL", x: 15, y: 72 }, { dpos: "DC", x: 38, y: 76 }, { dpos: "DC", x: 62, y: 76 }, { dpos: "DR", x: 85, y: 72 },
      { dpos: "DM", x: 32, y: 58 }, { dpos: "DM", x: 68, y: 58 }, { dpos: "AML", x: 18, y: 38 }, { dpos: "AMC", x: 50, y: 34 }, { dpos: "AMR", x: 82, y: 38 },
      { dpos: "ST", x: 50, y: 16 },
    ] },
  "4-1-4-1": { label: "4-1-4-1",
    slots: [
      { dpos: "GK", x: 50, y: 92 },
      { dpos: "DL", x: 15, y: 72 }, { dpos: "DC", x: 38, y: 76 }, { dpos: "DC", x: 62, y: 76 }, { dpos: "DR", x: 85, y: 72 },
      { dpos: "DM", x: 50, y: 62 }, { dpos: "ML", x: 15, y: 46 }, { dpos: "MC", x: 38, y: 50 }, { dpos: "MC", x: 62, y: 50 }, { dpos: "MR", x: 85, y: 46 },
      { dpos: "ST", x: 50, y: 16 },
    ] },
  "3-4-3": { label: "3-4-3",
    slots: [
      { dpos: "GK", x: 50, y: 92 },
      { dpos: "DC", x: 25, y: 74 }, { dpos: "DC", x: 50, y: 78 }, { dpos: "DC", x: 75, y: 74 },
      { dpos: "ML", x: 15, y: 50 }, { dpos: "MC", x: 38, y: 54 }, { dpos: "MC", x: 62, y: 54 }, { dpos: "MR", x: 85, y: 50 },
      { dpos: "AML", x: 18, y: 22 }, { dpos: "ST", x: 50, y: 18 }, { dpos: "AMR", x: 82, y: 22 },
    ] },
  "3-4-2-1": { label: "3-4-2-1",
    slots: [
      { dpos: "GK", x: 50, y: 92 },
      { dpos: "DC", x: 25, y: 74 }, { dpos: "DC", x: 50, y: 78 }, { dpos: "DC", x: 75, y: 74 },
      { dpos: "ML", x: 15, y: 52 }, { dpos: "MC", x: 38, y: 56 }, { dpos: "MC", x: 62, y: 56 }, { dpos: "MR", x: 85, y: 52 },
      { dpos: "AMC", x: 32, y: 28 }, { dpos: "AMC", x: 68, y: 28 }, { dpos: "ST", x: 50, y: 14 },
    ] },
};
/* เติม pos (กลุ่มหยาบ) ต่อช่อง + counts ต่อแผน จาก dpos โดยอัตโนมัติ */
Object.values(FORMATIONS).forEach((f) => {
  f.slots.forEach((s) => { s.pos = POS_GROUP[s.dpos]; });
  f.counts = { GK: 0, DF: 0, MF: 0, FW: 0 };
  f.slots.forEach((s) => { f.counts[s.pos] += 1; });
});
const FORMATION_KEYS = Object.keys(FORMATIONS);
const DEFAULT_FORMATION = "4-4-2";
function resolveFormation(key) {
  return FORMATIONS[key] ? key : DEFAULT_FORMATION;
}
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

/* เทมเพลตสควอดใช้ตำแหน่งละเอียด (กลุ่มหยาบยังครบ: GK2 / DF6 / MF6 / FW4) */
const SQUAD_TEMPLATE = ["GK","GK","DL","DC","DC","DR","DC","WBR","DM","MC","MC","ML","MR","AMC","ST","ST","ST","ST"];
const SQUAD_POSITION_TARGET = { GK: 2, DF: 6, MF: 6, FW: 4 };
const SQUAD_TARGET_SIZE = SQUAD_TEMPLATE.length;
const MIN_XI_SIZE = 11;
const MIN_SELL_SQUAD = 14;
/* กฎจริง (ลีกใหญ่ 2024/25): ตัวจริง 11 · ม้านั่งสำรอง 9 · เปลี่ยนตัวได้ 5 คน/นัด · สควอดทั้งหมดไม่จำกัด */
const MATCH_BENCH_SIZE = 9;
const MAX_MATCH_SUBS = 5;
const POS_TH = { GK: "ผู้รักษาประตู", DF: "กองหลัง", MF: "กองกลาง", FW: "กองหน้า" };
const POS_COLOR = { GK: "#e0a458", DF: "#5a9bd5", MF: "#6fae5a", FW: "#c1440e" };
/* ป้ายตำแหน่งของนักเตะ — ใช้ตำแหน่งละเอียดถ้ามี ไม่งั้นถอยไปกลุ่มหยาบ (เซฟเก่า/ออบเจ็กต์พิเศษ) */
function playerPosTH(p) { return (p?.pos && DPOS_TH[p.pos]) || POS_TH[p?.position] || "?"; }
function playerPosCode(p) { return p?.pos || p?.position || "?"; }
function playerPosColor(p) { return POS_COLOR[POS_GROUP[p?.pos] || p?.position] || "#a9bdb1"; }
const STAFF_TH = {
  GK: "โค้ช GK", DF: "โค้ชกองหลัง", MF: "โค้ชกองกลาง", FW: "โค้ชกองหน้า", FITNESS: "โค้ชฟิตเนส", PHYSIO: "หมอ", PHYSIOTHERAPIST: "นักกายภาพ",
  ASSISTANT: "ผู้ช่วยผจก.", ANALYST: "Data Analyst", DIRECTOR: "Sporting Director", HEAD_MEDICAL: "หัวหน้าแพทย์",
};

/* club facilities: 4 upgradeable centers, level 1-5 each */
const FACILITY_TYPES = ["fitness", "training", "techLab", "medical"];
const FACILITY_TH = { fitness: "ห้องฟิตเนส", training: "สนามฝึก", techLab: "เทคโนโลยีฝึกซ้อม", medical: "ห้องพยาบาล" };
const FACILITY_DESC = {
  fitness: "ฟื้นสตามินานักเตะไวขึ้นต่อวันพัก + ลดความเสี่ยงบาดเจ็บจากความล้าสะสม",
  training: "เพิ่มประสิทธิภาพการฝึกจากโค้ชทุกตำแหน่ง",
  techLab: "เพิ่มคุณภาพดาวรุ่งที่แมวมองค้นพบ",
  medical: "ลดจำนวนวันพักฟื้นเมื่อบาดเจ็บ",
};
function facilityUpgradeCost(level) { return Math.round(1200000 * Math.pow(level + 1, 1.8)); }
/** คิวก่อสร้าง — ใช้เวลาจริง (นาฬิกาเครื่อง) ไม่ใช่วันในเกม ยิ่งระดับเป้าหมายสูงยิ่งใช้เวลานาน */
const FACILITY_BUILD_MIN_PER_LEVEL = 25;
const STADIUM_BUILD_MIN_PER_LEVEL = 40;
function facilityBuildMs(toLevel) { return toLevel * FACILITY_BUILD_MIN_PER_LEVEL * 60000; }
function stadiumBuildMs(toLevel) { return toLevel * STADIUM_BUILD_MIN_PER_LEVEL * 60000; }
/** ปิดคิวก่อสร้างที่ครบเวลาแล้ว (เรียกตอนโหลดเซฟ + ทุกรอบ tick) — ใช้ Date.now() จริง ทำงานได้แม้ปิดแอปไปแล้วเปิดใหม่ */
function processConstructionQueue(c) {
  const queue = c.constructionQueue || [];
  if (!queue.length) return c;
  const now = Date.now();
  const stillPending = [];
  queue.forEach((q) => {
    if (now < q.finishAt) { stillPending.push(q); return; }
    if (q.kind === "stadium") {
      c.stadiumLevel = q.toLevel;
      c.log = [`✅ ก่อสร้างสนามเสร็จแล้ว! ระดับ ${q.toLevel}`, ...c.log];
    } else {
      c.facilities = { ...c.facilities, [q.facilityType]: q.toLevel };
      c.log = [`✅ ก่อสร้าง${FACILITY_TH[q.facilityType]}เสร็จแล้ว! ระดับ ${q.toLevel}`, ...c.log];
    }
  });
  c.constructionQueue = stillPending;
  return c;
}
const TRAINING_CAMP_COOLDOWN_DAYS = 21;
function trainingCampCost(facilities) { return 3000000 + (((facilities || {}).training || 1) - 1) * 500000; }
const STAFF_SPECS = ["GK", "DF", "MF", "FW", "FITNESS", "PHYSIO", "PHYSIOTHERAPIST"];
/** ทั้งสองตำแหน่งมาจากการ์ดประเภท DOCTOR — หมอลดโอกาส/ความรุนแรงบาดเจ็บ, นักกายภาพเร่งพักฟื้น */
const MEDICAL_CARD_SPECIALTIES = ["PHYSIO", "PHYSIOTHERAPIST"];
const MANAGER_STAT_TH = { development: "ปั้นนักเตะ", tactics: "แทคติก", manManagement: "จิตวิทยา/ห้องแต่งตัว", negotiation: "เจรจาต่อรอง", scouting: "ขุดดาวรุ่ง", reputation: "บารมี" };
/** สัญชาตญาณผจก. — ผูกกับสเตตที่แข็งแรงที่สุดของผจก.คนนั้น (ตอนสร้างจะมีสเตต "แข็ง" 2 ตัวอยู่แล้ว) ให้ทุกคนมีจุดเด่นจริงไม่ใช่แค่ตัวเลข */
const MANAGER_TRAITS = {
  development: { th: "นักปั้นเยาวชน", en: "Youth Developer", descTh: "ปั้นนักเตะได้เร็วขึ้นอีก", effectKey: "devMult", effectVal: 0.05 },
  tactics: { th: "จอมยุทธวิธี", en: "Tactical Genius", descTh: "ทีมคุ้นเคยแผนใหม่เร็วขึ้น + วางแผนก่อนแมทดีขึ้น", effectKey: "famBonus", effectVal: 0.4 },
  manManagement: { th: "นักจิตวิทยาห้องแต่งตัว", en: "Man Manager", descTh: "มูดนักเตะดีขึ้นง่ายกว่าปกติ", effectKey: "moraleBonus", effectVal: 1 },
  negotiation: { th: "นักเจรจาตัวยง", en: "Master Negotiator", descTh: "ต่อรองค่าตัว/ค่าเหนื่อยได้ถูกลงอีก", effectKey: "negotiationPct", effectVal: 0.04 },
  scouting: { th: "สายตาแมวมอง", en: "Scouting Eye", descTh: "รายงานสอดแนมก่อนแมทแม่นยำขึ้น", effectKey: "insight", effectVal: 0.04 },
  reputation: { th: "บารมีสูงส่ง", en: "High Reputation", descTh: "สะสม XP ผจก. ได้เร็วขึ้น", effectKey: "xpMult", effectVal: 0.1 },
};

/** บุคลิกนักเตะ (personality) — สุ่มติดตัวตอนเกิด มีผลจริงต่อความอดทนนั่งสำรอง + การขอขึ้นค่าเหนื่อยตอนต่อสัญญา */
const PLAYER_PERSONALITIES = {
  leader: { th: "หัวหน้าทีม", en: "Team Leader", descTh: "ใจเย็นกว่าปกติ ทนนั่งสำรองได้นานกว่า", benchMult: 0.7, wageDemandMult: 1, renewMoraleBonus: 3 },
  ambitious: { th: "ทะเยอทะยาน", en: "Ambitious", descTh: "หิวความสำเร็จ ไม่พอใจง่ายถ้านั่งสำรอง + ขอค่าเหนื่อยขึ้นเยอะตอนต่อสัญญา", benchMult: 1.3, wageDemandMult: 1.35, renewMoraleBonus: 0 },
  loyal: { th: "ซื่อสัตย์ต่อทีม", en: "Loyal", descTh: "รักสโมสร ต่อสัญญาง่าย ขอขึ้นค่าเหนื่อยน้อยกว่าปกติ", benchMult: 0.6, wageDemandMult: 0.7, renewMoraleBonus: 4 },
  temperamental: { th: "อารมณ์ร้อน", en: "Temperamental", descTh: "อารมณ์แปรปรวน ไม่พอใจง่ายถ้านั่งสำรองบ่อย", benchMult: 1.5, wageDemandMult: 1.1, renewMoraleBonus: 0 },
  professional: { th: "มืออาชีพ", en: "Professional", descTh: "มูดนิ่ง ไม่ค่อยหวั่นไหวไม่ว่าจะเจออะไร", benchMult: 0.8, wageDemandMult: 0.95, renewMoraleBonus: 1 },
};
function rollPlayerPersonality() {
  const keys = Object.keys(PLAYER_PERSONALITIES);
  return keys[Math.floor(Math.random() * keys.length)];
}
/** สิทธิประโยชน์ตามดาวการ์ดผจก. — ยิ่งดาวสูงยิ่งมีผลในเกมจริง */
const MANAGER_TIER_DEFS = {
  1: { title: "มือใหม่", prepBonus: -0.06, performanceBonus: 0, devMult: 1.0, famBonus: 0, moraleBonus: 0, negotiationPct: 0, xpMult: 1, autoPlan: false, perks: ["วางแผนพื้นฐาน — คำแนะนำจำกัด"] },
  2: { title: "ปานกลาง", prepBonus: -0.03, performanceBonus: 0.01, devMult: 1.03, famBonus: 0, moraleBonus: 1, negotiationPct: 0.02, xpMult: 1, autoPlan: false, perks: ["คำแนะนำ XI เบื้องต้น", "เจรจาซื้อนักเตะ -2%"] },
  3: { title: "ดี", prepBonus: 0, performanceBonus: 0.025, devMult: 1.06, famBonus: 1, moraleBonus: 1, negotiationPct: 0.04, xpMult: 1.05, autoPlan: true, perks: ["แผนถนัด +8%", "ปั้นนักเตะ +6%", "วางแผนอัตโนมัติ (โหมดออโต้)"] },
  4: { title: "มืออาชีพ", prepBonus: 0.03, performanceBonus: 0.04, devMult: 1.09, famBonus: 1, moraleBonus: 2, negotiationPct: 0.06, xpMult: 1.1, autoPlan: true, perks: ["ส่งแผนลงสนาม +5%", "ประกบตัวอันตรายชำนาญ", "ปุ่มจัด XI+แผนก่อนนัด"] },
  5: { title: "ระดับโลก", prepBonus: 0.05, performanceBonus: 0.055, devMult: 1.12, famBonus: 2, moraleBonus: 2, negotiationPct: 0.08, xpMult: 1.15, autoPlan: true, perks: ["ส่งแผน +8%", "คุ้นแผนเร็วขึ้น", "ขวัญกำลังใจหลังเกมดีขึ้น"] },
  6: { title: "ตำนาน", prepBonus: 0.07, performanceBonus: 0.07, devMult: 1.15, famBonus: 2, moraleBonus: 3, negotiationPct: 0.10, xpMult: 1.25, autoPlan: true, perks: ["ส่งแผน +10%", "แนะนำครบทุกช่องโหว่", "EXP ผจก. +25%"] },
  7: { title: "GOAT", prepBonus: 0.09, performanceBonus: 0.085, devMult: 1.18, famBonus: 3, moraleBonus: 4, negotiationPct: 0.12, xpMult: 1.3, autoPlan: true, perks: ["ส่งแผน +12%", "ทีมเล่นตามแผนเกือบเต็มที่", "โบนัสพลังทีมสูงสุด"] },
};
function managerTierDef(stars) {
  return MANAGER_TIER_DEFS[clamp(stars || 1, 1, 7)] || MANAGER_TIER_DEFS[1];
}
const STATUS_TH = { starter: "ตัวหลัก", rotation: "ตัวหมุนเวียน", reserve: "ตัวสำรอง" };
const STATUS_COLOR = { starter: "#6fae5a", rotation: "#e0a458", reserve: "#a9bdb1" };
const POTENTIAL_BAND = [[90, "S"], [80, "A"], [68, "B"], [55, "C"], [0, "D"]];
function bandOf(potential) { for (const [min, label] of POTENTIAL_BAND) if (potential >= min) return label; return "D"; }

function starColor(n) {
  if (n >= 7) return C.gold;
  if (n >= 5) return C.amber;
  if (n >= 4) return C.good;
  if (n >= 3) return C.blue;
  return C.textDim;
}

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

function natCtx(c, legendDef) {
  return {
    teams: c?.teams,
    leagueId: c?.legendLeagueId || "thailand",
    legendDef,
    getLegendName: (id) => getLegendById(id)?.name,
  };
}

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
  ALL_ATTRS.forEach((k) => { p.attrs[k] = Math.round(clamp(p.attrs[k] + amount, 1, 20) * 10) / 10; });
  recomputeDerived(p);
}

/* สุ่มตำแหน่งละเอียดจากกลุ่มหยาบ (ถ่วงน้ำหนักให้สมจริง) */
const DPOS_WEIGHTS_BY_GROUP = {
  GK: [["GK", 1]],
  DF: [["DC", 45], ["DL", 19], ["DR", 19], ["WBL", 8.5], ["WBR", 8.5]],
  MF: [["MC", 28], ["DM", 16], ["ML", 11], ["MR", 11], ["AMC", 14], ["AML", 10], ["AMR", 10]],
  FW: [["ST", 1]],
};
function rollDetailedPos(group) {
  const weights = DPOS_WEIGHTS_BY_GROUP[group] || DPOS_WEIGHTS_BY_GROUP.MF;
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [dpos, w] of weights) { r -= w; if (r <= 0) return dpos; }
  return weights[0][0];
}
/* สเตตเด่นประจำตำแหน่งละเอียด — ใช้ bias ตอนเกิด + ใช้ derive ตำแหน่งให้นักเตะเซฟเก่า */
const DPOS_KEY_ATTRS = {
  GK: ["decisions", "composure", "agility"],
  DL: ["pace", "crossing", "tackling"], DR: ["pace", "crossing", "tackling"],
  DC: ["heading", "strength", "tackling"],
  WBL: ["pace", "crossing", "workRate"], WBR: ["pace", "crossing", "workRate"],
  DM: ["tackling", "decisions", "passing"],
  MC: ["passing", "vision", "workRate"],
  ML: ["crossing", "dribbling", "pace"], MR: ["crossing", "dribbling", "pace"],
  AML: ["dribbling", "pace", "finishing"], AMR: ["dribbling", "pace", "finishing"],
  AMC: ["passing", "vision", "finishing"],
  ST: ["finishing", "composure", "heading"],
};
/* ตำแหน่งรอง: สุ่มจากตำแหน่งข้างเคียงที่ความคุ้นเคยสูง (ไม่รวม GK) */
/* แจกตำแหน่งละเอียดให้นักเตะเซฟเก่า — เลือกตำแหน่งในกลุ่มที่สเตตเด่นเข้าท่าที่สุด (สุ่มเกลี่ยซ้าย/ขวา) */
function deriveDetailedPos(p) {
  const group = POS_GROUP[p.position] || "MF";
  if (group === "GK") return "GK";
  if (group === "FW") return "ST";
  const cands = DETAIL_POSITIONS.filter((d) => d !== "GK" && POS_GROUP[d] === group);
  let best = cands[0], bestScore = -1;
  cands.forEach((d) => {
    const ks = DPOS_KEY_ATTRS[d] || [];
    const score = ks.reduce((s, k) => s + (p.attrs?.[k] || 10), 0) / (ks.length || 1) + Math.random() * 1.4;
    if (score > bestScore) { bestScore = score; best = d; }
  });
  return best;
}
function ensureDetailedPos(p) {
  if (!p || !p.position) return;
  if (!p.pos || !DPOS_META[p.pos]) p.pos = deriveDetailedPos(p);
  if (!Array.isArray(p.altPos)) p.altPos = rollAltPositions(p.pos);
}

function rollAltPositions(natPos) {
  if (natPos === "GK") return [];
  const candidates = DETAIL_POSITIONS.filter((d) => d !== "GK" && d !== natPos && dposFamiliarity(natPos, d) >= 0.82);
  const alts = [];
  const roll = Math.random();
  const count = roll < 0.35 ? 0 : roll < 0.85 ? 1 : 2;
  while (alts.length < count && candidates.length) {
    const idx = Math.floor(Math.random() * candidates.length);
    alts.push(candidates.splice(idx, 1)[0]);
  }
  return alts;
}

function genPlayer(position, tier, teamId, forcedAge, startDay, opts = {}) {
  /* รับได้ทั้งกลุ่มหยาบ (GK/DF/MF/FW → สุ่มตำแหน่งละเอียด) และตำแหน่งละเอียดตรงๆ (DL/AMR/...) */
  const dpos = DPOS_META[position] && position !== "GK" ? position : position === "GK" ? "GK" : rollDetailedPos(position);
  const group = POS_GROUP[dpos];
  const leagueId = opts.leagueId || "thailand";
  const nationality = opts.nationality || pickNationalityForTeam(teamId, opts.teams, leagueId);
  const age = forcedAge != null ? forcedAge : rand(17, 33);
  const peak = age <= 27 ? 1 : clamp(1 - (age - 27) * 0.025, 0.55, 1);
  const base = 10 + tier * 0.35; // baseline on the 1-20 scale
  const attrs = {};
  const keyAttrs = DPOS_KEY_ATTRS[dpos] || [];
  ALL_ATTRS.forEach((k) => {
    let biasHigh;
    if (group === "GK") biasHigh = DEF_ATTRS.includes(k) || k === "composure" || k === "decisions";
    else if (group === "DF") biasHigh = DEF_ATTRS.includes(k) || ATTR_GROUPS.physical.includes(k);
    else if (group === "MF") biasHigh = ATTR_GROUPS.mental.includes(k) || k === "passing";
    else biasHigh = ATK_ATTRS.includes(k) || ATTR_GROUPS.physical.includes(k);
    const spread = biasHigh ? rand(1, 5) : rand(-4, 2);
    const keyBoost = keyAttrs.includes(k) ? rand(1, 3) : 0;
    attrs[k] = clamp(Math.round((base + spread + keyBoost) * peak), 1, 20);
  });
  const p = {
    id: uid("pl"), name: genPlayerName(nationality), nationality, position: group, pos: dpos, altPos: rollAltPositions(dpos),
    age, attrs, morale: rand(62, 92), teamId, stamina: 100, injuryDays: 0, appearHistory: [], careerGoals: 0, seasonGoals: 0, careerApps: 0, role: "balanced",
    seasonYellows: 0, suspendedMatches: 0, personality: rollPlayerPersonality(),
  };
  recomputeDerived(p);
  const ageMult = age <= 23 ? 1.35 : age <= 28 ? 1.05 : age <= 31 ? 0.65 : 0.35;
  p.value = Math.round((p.rating * p.rating * 380 * ageMult) / 1000) * 1000;
  p.wage = computePlayerWage(p.rating);
  p.potential = age <= 21 ? clamp(p.rating + rand(6, 34), p.rating, 99) : age <= 25 ? clamp(p.rating + rand(0, 10), p.rating, 99) : p.rating;
  p.contractEndsDay = (startDay || 1) + rand(150, 400);
  return enrichPlayerContract(p);
}
const genSquad = (teamId, tier, startDay, opts = {}) => SQUAD_TEMPLATE.map((pos) => genPlayer(pos, tier, teamId, undefined, startDay || 1, opts));

/* ============================== LEGEND UNIVERSE ============================== */
function forcePlayerRating(p, targetRating) {
  const diff = targetRating - p.rating;
  bumpAttrs(p, diff * 0.12);
  if (Math.abs(p.rating - targetRating) > 2) {
    const scale = targetRating / Math.max(p.rating, 1);
    p.attack = clamp(Math.round(p.attack * scale), 5, 99);
    p.defense = clamp(Math.round(p.defense * scale), 5, 99);
    p.rating = targetRating;
  }
}

function buildRosterPlayer(def, teamId, homeTeamId, startDay) {
  const tier = clamp(Math.floor((def.rating - 50) / 3), 0, 12);
  const nat = legendNationality(def);
  const p = genPlayer(def.position, tier, teamId, def.age, startDay, { nationality: nat, leagueId: def.leagueId });
  const rid = def.rosterId || def.legendId;
  p.id = def.isLegend ? `leg_${rid}` : `ros_${rid}`;
  p.rosterId = rid;
  if (def.isLegend) {
    p.legendId = rid;
    p.isLegend = true;
    p.value = def.acquireCost;
  } else {
    p.isLegend = false;
    const ageMult = def.age <= 23 ? 1.35 : def.age <= 28 ? 1.05 : def.age <= 31 ? 0.65 : 0.35;
    p.value = Math.round((def.rating * def.rating * 380 * ageMult) / 1000) * 1000;
  }
  p.homeTeamId = homeTeamId;
  p.name = def.name;
  p.nationality = nat;
  forcePlayerRating(p, def.rating);
  p.potential = def.potential;
  p.wage = computePlayerWage(p.rating);
  p.legendLeagueId = def.leagueId;
  p.lastOwnerActivityDay = startDay || 1;
  return p;
}

function buildLegendPlayer(def, teamId, homeTeamId, startDay) {
  return buildRosterPlayer({ ...def, isLegend: true, rosterId: def.legendId || def.rosterId }, teamId, homeTeamId, startDay);
}

function buildLegendSquadForTeam(teamId, leagueId, teamKey, tier, startDay, legendOwnership = null) {
  if (hasFullRosterLeague(leagueId)) {
    const roster = getRosterForTeam(leagueId, teamKey);
    if (roster.length) {
      return roster
        .filter((def) => {
          if (!def.isLegend || !legendOwnership) return true;
          const rid = def.rosterId || def.legendId;
          const owner = legendOwnership[rid];
          return !owner || owner === teamId;
        })
        .map((def) => buildRosterPlayer(def, teamId, teamId, startDay));
    }
  }
  const squad = genSquad(teamId, tier, startDay, { leagueId, teams: [{ id: teamId, legendTeamKey: teamKey }] });
  getLegendsForTeam(leagueId, teamKey).forEach((leg) => {
    const legP = buildLegendPlayer(leg, teamId, teamId, startDay);
    const idx = squad.findIndex((pl) => pl.position === leg.position && !pl.isLegend);
    if (idx >= 0) squad[idx] = legP;
    else squad.push(legP);
  });
  return squad;
}

function refreshFullRosterMasterLeagues(c) {
  const leagueId = c.legendLeagueId;
  if (!hasFullRosterLeague(leagueId)) return c;
  const masterTeams = (c.teams || []).filter((t) => t.division === 0 && t.legendTeamKey);
  if (!masterTeams.length) return c;
  const masterIds = new Set(masterTeams.map((t) => t.id));
  const awayLegends = {};
  (c.players || []).forEach((p) => {
    if (!p.isLegend || !p.legendId) return;
    const def = getLegendById(p.legendId);
    if (!def || def.leagueId !== leagueId) return;
    const home = masterTeams.find((t) => t.legendTeamKey === def.teamKey);
    if (home && p.teamId !== home.id) awayLegends[p.legendId] = p;
  });
  c.players = (c.players || []).filter((p) => !masterIds.has(p.teamId));
  const ownership = { ...(c.legendOwnership || {}) };
  masterTeams.forEach((t) => {
    c.players.push(...buildLegendSquadForTeam(t.id, leagueId, t.legendTeamKey, t.tier, c.day || 1, ownership));
  });
  Object.values(awayLegends).forEach((p) => {
    if (!c.players.some((x) => x.id === p.id)) c.players.push(p);
  });
  c.legendOwnership = initLegendOwnership(leagueId, c.teams, c.players);
  Object.entries(awayLegends).forEach(([legendId, p]) => { c.legendOwnership[legendId] = p.teamId; });
  (c.teams || []).forEach((t) => {
    c.lineups[t.id] = getBestXI(c.players.filter((p) => p.teamId === t.id), t.formation);
  });
  c.fullRosterDB = true;
  c.log = [`📋 อัปเดต roster Master · ${legendLeagueLabel(leagueId)} (~23 คน/ทีม · ${ROSTER_STATS?.total?.toLocaleString() || "2,944"} นักเตะ)`, ...(c.log || [])];
  return c;
}

/** ทีมบอทมีสีเดียว (color) — กางเกงเลือกขาว/เข้มให้ตัดกับสีเสื้อ (ธรรมเนียมชุดแข่งจริง) กันทุกทีมกางเกงสีเดียวกันหมด */
function botSecondaryColor(primary) {
  const hex = (primary || "#888888").replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16) / 255, g = parseInt(hex.substr(2, 2), 16) / 255, b = parseInt(hex.substr(4, 2), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? "#1a1a1a" : C.chalk;
}

function createLegendMasterTeams(leagueId, startDay) {
  return (LEGEND_TEAMS[leagueId] || []).map((t, idx) => ({
    id: `leg_${leagueId}_${t.key}`,
    name: t.name,
    short: t.short,
    color: t.color,
    secondaryColor: botSecondaryColor(t.color),
    logoIndex: idx % LOGO_ICONS.length,
    tier: t.tier,
    division: 0,
    isUser: false,
    formation: t.formation || "4-4-2",
    budget: rand(5000000, 15000000),
    manager: genManager(),
    autoMode: true,
    chemistry: 50,
    legendTeamKey: t.key,
    legendLeagueId: leagueId,
  }));
}

function initLegendOwnership(leagueId, teams, players) {
  const ownership = {};
  LEGEND_PLAYERS.filter((l) => l.leagueId === leagueId).forEach((l) => {
    const homeTeam = teams.find((t) => t.legendTeamKey === l.teamKey);
    const pl = players.find((p) => p.legendId === l.legendId);
    ownership[l.legendId] = pl?.teamId || homeTeam?.id || null;
  });
  return ownership;
}

function installLegendMasterLeague(c, leagueId) {
  const userTeam = c.teams?.find((t) => t.isUser);
  if (!userTeam || !Array.isArray(c.teams)) return c;
  const challengerTeams = c.teams.filter((t) => t.division === 1 && t.id !== userTeam.id);
  const keepIds = new Set([...challengerTeams.map((t) => t.id), userTeam.id]);
  c.players = c.players.filter((p) => keepIds.has(p.teamId) && !p.isLegend);
  const masterTeams = createLegendMasterTeams(leagueId, c.day || 1);
  masterTeams.forEach((t) => {
    c.players.push(...buildLegendSquadForTeam(t.id, leagueId, t.legendTeamKey, t.tier, c.day || 1, c.legendOwnership));
  });
  c.teams = [...masterTeams, ...challengerTeams, userTeam];
  c.legendLeagueId = leagueId;
  c.legendOwnership = initLegendOwnership(leagueId, c.teams, c.players);
  c.leagues = [buildLeague(0, c.teams, c.legendLeagueId), buildLeague(1, c.teams, c.legendLeagueId)];
  c.teams.forEach((t) => {
    c.lineups[t.id] = getBestXI(c.players.filter((p) => p.teamId === t.id), t.formation);
  });
  return c;
}

function reconcileInactiveLegends(c) {
  if (!c.legendOwnership || !c.legendLeagueId) return c;
  const logs = [];
  LEGEND_PLAYERS.filter((l) => l.leagueId === c.legendLeagueId).forEach((def) => {
    const ownerId = c.legendOwnership[def.legendId];
    if (!ownerId) return;
    const homeTeam = c.teams.find((t) => t.legendTeamKey === def.teamKey && t.division === 0);
    if (!homeTeam || ownerId === homeTeam.id) return;
    const player = c.players.find((p) => p.legendId === def.legendId);
    if (!player) return;
    const ownerTeam = c.teams.find((t) => t.id === ownerId);
    const isUserOwner = ownerId === c.userTeamId;
    const lastActive = player.lastOwnerActivityDay || c.day;
    if (isUserOwner) {
      player.lastOwnerActivityDay = c.day;
      return;
    }
    if (c.day - lastActive < LEGEND_INACTIVE_DAYS) return;
    player.teamId = homeTeam.id;
    player.lastOwnerActivityDay = c.day;
    c.legendOwnership[def.legendId] = homeTeam.id;
    Object.keys(c.lineups).forEach((tid) => {
      c.lineups[tid] = (c.lineups[tid] || []).filter((id) => id !== player.id);
    });
    c.lineups[homeTeam.id] = getBestXI(c.players.filter((p) => p.teamId === homeTeam.id), homeTeam.formation);
    logs.push(`⭐ ${def.name} กลับ ${homeTeam.short} (เจ้าของ ${ownerTeam?.short || "?"} ไม่ active ${LEGEND_INACTIVE_DAYS} วัน)`);
  });
  if (logs.length) c.log = [...logs, ...c.log];
  return c;
}

function tryAcquireLegendOnCareer(c, legendId) {
  const def = getLegendById(legendId);
  if (!def || def.leagueId !== c.legendLeagueId) return { ok: false, msg: "ไม่พบซูเปอร์สตาร์ในลีกนี้" };
  const uT = c.teams.find((t) => t.id === c.userTeamId);
  if (!canBidForLegend(uT.division)) return { ok: false, msg: "ต้องอยู่ Master League" };
  const fin = computeTeamFinances(c);
  if (fin.teamValue < LEGEND_ACQUIRE_MIN_TEAM_VALUE) return { ok: false, msg: `มูลค่าสโมสรต้อง ≥ ${formatMoney(LEGEND_ACQUIRE_MIN_TEAM_VALUE)}` };
  const player = c.players.find((p) => p.legendId === legendId);
  if (!player) return { ok: false, msg: "ไม่พบนักเตะ" };
  if (player.teamId === c.userTeamId) return { ok: false, msg: "มีอยู่ในทีมแล้ว" };
  if (c.budget < def.acquireCost) return { ok: false, msg: "งบไม่พอ" };
  const prevOwner = player.teamId;
  c.budget -= def.acquireCost;
  player.teamId = c.userTeamId;
  player.lastOwnerActivityDay = c.day;
  c.legendOwnership[legendId] = c.userTeamId;
  c.lineups[c.userTeamId] = (c.lineups[c.userTeamId] || []).filter((id) => id !== player.id);
  const prevTeam = c.teams.find((t) => t.id === prevOwner);
  c.globalFanbase = (c.globalFanbase || 0) + GLOBAL_FANBASE_AWARDS.legendSigned;
  c.ownerXp = (c.ownerXp || 0) + OWNER_XP_AWARDS.legendSigned;
  c.log = [`⭐ คว้า ${def.name} จาก ${prevTeam?.short || "?"} ค่าตัว ${formatMoney(def.acquireCost)} · แฟนบอลทั่วโลก +${GLOBAL_FANBASE_AWARDS.legendSigned.toLocaleString()}`, ...c.log];
  return { ok: true, msg: `คว้า ${def.name} สำเร็จ!` };
}

function legendLeagueLabel(leagueId) {
  return LEGEND_LEAGUES.find((l) => l.id === leagueId)?.name || "Master League";
}

function genCoach(fixedSpecialty) {
  const specialty = fixedSpecialty || choice(STAFF_SPECS);
  const grade = rand(1, 5);
  const boost = Math.round((0.15 + grade * 0.12) * 100) / 100;
  return ensureCoachProfile({
    id: uid("co"), name: choice(COACH_FIRST) + " " + choice(LAST_NAMES),
    signingCost: Math.round((grade * 150000 + rand(0, 50000)) / 1000) * 1000,
    weeklyWage: scaleStaffDailyWage(grade * 8000 + rand(0, 3000)),
    ...buildCoachProfile(specialty, grade, grade, boost),
  }, specialty);
}

function genManager(scaleDown) {
  const lo = scaleDown ? 20 : 30, hi = scaleDown ? 50 : 60;
  const stats = { development: rand(lo, hi), tactics: rand(lo, hi), manManagement: rand(lo, hi), negotiation: rand(lo, hi), scouting: rand(lo, hi), reputation: rand(lo, hi) };
  const keys = Object.keys(stats);
  const strong = [...keys].sort(() => Math.random() - 0.5).slice(0, 2);
  strong.forEach((k) => { stats[k] = rand(scaleDown ? 60 : 75, scaleDown ? 85 : 97); });
  const trait = strong.reduce((best, k) => (stats[k] > (stats[best] || 0) ? k : best), strong[0]);
  const avgStat = Object.values(stats).reduce((a, b) => a + b, 0) / 6;
  const scale = scaleDown ? 0.35 : 1;
  return {
    id: uid("mg"), name: choice(MANAGER_FIRST) + " " + choice(LAST_NAMES), stats, trait,
    preferredFormation: choice(FORMATION_KEYS),
    signingCost: Math.round((avgStat * 4000 * scale + rand(0, 80000 * scale)) / 1000) * 1000,
    weeklyWage: scaleStaffDailyWage(avgStat * 350 * scale + rand(0, 3000 * scale)),
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
    weeklyWage: scaleStaffDailyWage(grade * 6000 + rand(0, 2000)),
  };
}

/* ============================== STAFF CARD GACHA ============================== */
/* ตำแหน่งสตาฟช่องเดี่ยว — จ้างได้ทีมละ 1 คน เก็บใน career.staff[teamId][type] */
const EXTRA_STAFF_TYPES = ["ASSISTANT", "ANALYST", "DIRECTOR", "HEAD_MEDICAL"];
const STAFF_CARD_TYPES = ["MANAGER", "COACH", "SCOUT", "DOCTOR", ...EXTRA_STAFF_TYPES];
const STAFF_CARD_TYPE_TH = {
  MANAGER: "ผจก.", COACH: "โค้ช", SCOUT: "สเกาต์", DOCTOR: "หมอ",
  ASSISTANT: "ผู้ช่วยผจก.", ANALYST: "Data Analyst", DIRECTOR: "Sporting Director", HEAD_MEDICAL: "หัวหน้าแพทย์",
};
/* กล่องลิสต์การ์ดสตาฟในห้องต่างๆ — โชว์ราว 3 แถวแล้วเลื่อนขึ้นลงดูที่เหลือ */
const CARD_LIST_SCROLL = { display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, paddingRight: 2 };
const DRAG_SCROLL_SKIP = "button, a, input, textarea, select, [data-no-drag-scroll], .staff-pack-card";
const STAFF_CARD_TYPE_ICON = {
  MANAGER: "◆", COACH: "🧢", SCOUT: "🔭", DOCTOR: "🩺",
  ASSISTANT: "📋", ANALYST: "📊", DIRECTOR: "🤝", HEAD_MEDICAL: "⚕️",
};
const COACH_CARD_SPECIALTIES = ["GK", "DF", "MF", "FW", "FITNESS"];

/* ภาพเหมือนสตาฟที่เจนไว้ล่วงหน้า (client/public/staff-portraits/) — สุ่มหยิบ 1 ใบต่อการ์ดตอน gen
 * (เหมือนสุ่มชื่อ) เก็บ path ไว้ใน card.portrait ตอนสร้างครั้งเดียว ไม่สุ่มใหม่ทุก render.
 * ดาว 7★ ของ MANAGER/ANALYST มีพูลภาพพิเศษแยกต่างหาก (คุณภาพ/ท่าทางพรีเมียมกว่า) */
const STAFF_PORTRAIT_POOLS = {
  MANAGER: ["manager01.jpg", "Manager02.jpg", "manager03.jpg", "manager04.jpg"],
  MANAGER_7STAR: ["Manager7star01.jpg", "Manager7star02.jpg", "Manager7star03.jpg", "Manager7star04.jpg", "Manager7star05.jpg", "Manager7star06.jpg", "Manager7star07.jpg"],
  COACH: ["StaffCaoch01.jpg", "StaffCaoch02.jpg", "StaffCaoch03.jpg", "StaffCaoch04.jpg", "StaffCaoch05.jpg"],
  COACH_7STAR: ["Coach7star01.jpg", "Coach7star02.jpg", "Coach7star03.jpg", "Coach7star04.jpg", "Coach7star05.jpg", "Coach7star06.jpg", "Coach7star07.jpg", "Coach7star08.jpg", "Coach7star09.jpg"],
  FITNESS: ["Stafffitness01.jpg", "Stafffitnest02.jpg", "Stafffitnest03.jpg", "Stafffitnest04.jpg"],
  DOCTOR: ["StaffDoctor01.jpg", "StaffDocter02.jpg", "StaffDoctor03.jpg", "StaffDocter004.jpg"],
  SCOUT: ["Scouter01.jpg", "ScouterYout01.jpg"],
  ASSISTANT: ["AssitManager01.jpg"],
  ANALYST: ["DataAnalyst01.jpg"],
  ANALYST_7STAR: ["DataAnalyst7Star01.jpg"],
  DIRECTOR: ["SportingDirector01.jpg"],
  HEAD_MEDICAL: ["HeadDocter01.jpg"],
};
function pickStaffPortrait(type, specialty, stars) {
  let folder = type;
  if (type === "MANAGER" && stars >= 7) folder = "MANAGER_7STAR";
  else if (type === "ANALYST" && stars >= 7) folder = "ANALYST_7STAR";
  else if (type === "COACH" && specialty === "FITNESS") folder = "FITNESS";
  else if (type === "COACH" && stars >= 7) folder = "COACH_7STAR";
  const pool = STAFF_PORTRAIT_POOLS[folder];
  if (!pool || !pool.length) return null;
  const file = choice(pool);
  return `/staff-portraits/${folder}/${encodeURIComponent(file)}`;
}
/** ตู้หยอดซองการ์ดสตาฟ — สะสม "เหรียญตู้" ได้วันละ N + จบฤดูกาลอีก M เอามาหยอด สุ่มได้ซอง Bronze/Silver/Gold (Bronze ออกบ่อยสุด) */
const DAILY_FREE_MACHINE_PULLS = 3; // legacy, เก็บไว้ migrate เซฟเก่า
const DAILY_MACHINE_COIN_GRANT = 10;
const SEASON_END_MACHINE_COINS = 20;
const MACHINE_PULL_COST = 1;
const CARDS_PER_STAFF_PULL = 5;
/** สตาฟเริ่มต้น — ทุกตำแหน่ง 3★ สเตตเท่ากัน (ไม่สุ่มการ์ด gacha) */
const STARTER_STAFF_STARS = 3;
const STARTER_MANAGER_FORMATION = "4-4-2";
const STARTER_COACHING_STYLE = "balanced";
const MERGE_CARD_COUNT = 10;
/** ซอง Platinum ได้จากการจบลีกอันดับ 1-3 เท่านั้น (ไม่ขายในตู้) — index 0 = อันดับ 1 */
const SEASON_PLATINUM_PACKS = [3, 2, 1];
const STAR_PULL_WEIGHTS = [30, 25, 20, 12, 8, 4, 1];

/** ซองเปิดการ์ด (แบบ FIFA Ultimate Team) — น้ำหนักดาว 1-7★ ต่างกันตามซอง
 * machineWeight = โอกาสสุ่มออกจากตู้หยอด (Bronze ออกบ่อยสุด) — Platinum ไม่อยู่ในตู้ ได้จากรางวัลจบลีกท็อป 3 เท่านั้น
 * Gold ตอนนี้จำกัดแค่ 5★ สูงสุด — 6-7★ ได้เฉพาะจากซอง Platinum */
const STAFF_PACK_TIERS = {
  bronze: { key: "bronze", label: "Bronze", color: "#c9895a", machineWeight: 60, weights: [45, 30, 15, 7, 3, 0, 0] },
  silver: { key: "silver", label: "Silver", color: "#c7d1d6", machineWeight: 30, weights: [15, 25, 25, 20, 10, 4, 1] },
  gold: { key: "gold", label: "Gold", color: C.gold, machineWeight: 10, weights: [0, 10, 20, 35, 35, 0, 0] },
  platinum: { key: "platinum", label: "Platinum", color: "#b9e6ff", machineWeight: 0, weights: [0, 0, 0, 0, 40, 35, 25] },
};
const STAFF_PACK_TIER_LIST = [STAFF_PACK_TIERS.bronze, STAFF_PACK_TIERS.silver, STAFF_PACK_TIERS.gold];

/** สุ่มเลือกซองจากตู้หยอดตามน้ำหนัก machineWeight (Bronze/Silver/Gold เท่านั้น) */
function rollMachineTier() {
  const total = STAFF_PACK_TIER_LIST.reduce((s, t) => s + t.machineWeight, 0);
  let r = rand(1, total);
  for (const tier of STAFF_PACK_TIER_LIST) {
    r -= tier.machineWeight;
    if (r <= 0) return tier;
  }
  return STAFF_PACK_TIERS.bronze;
}

function rollStaffCardStars(weights = STAR_PULL_WEIGHTS) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand(1, total);
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i + 1;
  }
  return 1;
}

/** โอกาสรวมการ์ดสำเร็จตามดาวเดิม — ยิ่งดาวสูงยิ่งยากมาก (โดยเฉพาะ 4★ ขึ้นไป) */
const MERGE_SUCCESS_CHANCE = { 1: 0.70, 2: 0.55, 3: 0.40, 4: 0.10, 5: 0.05, 6: 0.02 };
function mergeSuccessChance(stars) {
  if (stars >= 7) return 0;
  return MERGE_SUCCESS_CHANCE[stars] ?? 0.30;
}

function starsToStaffGrade(stars) {
  return clamp(stars, 1, 7);
}

function starsToManagerStatRange(stars) {
  const lo = 12 + stars * 8;
  const hi = lo + 8 + stars * 2;
  return { lo, hi };
}

/** สเตตผจก.กลางๆ ของดาวที่กำหนด — ใช้ค่าเดียวทุกสเตต */
function uniformManagerStat(stars) {
  const { lo, hi } = starsToManagerStatRange(stars);
  return Math.round((lo + hi) / 2);
}

/** Payload การ์ดสตาฟเริ่มต้น — 3★ ค่าเท่ากันทุกคน ไม่สุ่ม strong stat / specialty */
function buildUniformStaffCardPayload(type, stars, opts = {}) {
  const grade = starsToStaffGrade(stars);
  const boost = Math.round((0.1 + grade * 0.14) * 100) / 100;

  if (type === "MANAGER") {
    const stat = uniformManagerStat(stars);
    const stats = {};
    Object.keys(MANAGER_STAT_TH).forEach((k) => { stats[k] = stat; });
    return {
      stats,
      preferredFormation: STARTER_MANAGER_FORMATION,
      signingCost: 0,
      weeklyWage: scaleStaffDailyWage(stat * 300 + stars * 2000),
    };
  }
  if (type === "COACH") {
    const specialty = opts.specialty || "MF";
    const profile = buildCoachProfile(specialty, stars, grade, boost);
    return {
      ...profile,
      specialty,
      coachingStyle: STARTER_COACHING_STYLE,
      signingCost: 0,
      weeklyWage: scaleStaffDailyWage(grade * 7000 + stars * 1500),
    };
  }
  if (type === "SCOUT") {
    return {
      grade,
      specialtyPos: "MF",
      findChance: 0.18 + grade * 0.09,
      qualityBoost: grade * 3,
      signingCost: 0,
      weeklyWage: scaleStaffDailyWage(grade * 5500 + stars * 1200),
    };
  }
  if (EXTRA_STAFF_TYPES.includes(type)) {
    return {
      specialty: type,
      grade,
      boost,
      signingCost: 0,
      weeklyWage: scaleStaffDailyWage(grade * 6000 + stars * 1300),
    };
  }
  const specialty = opts.specialty || "PHYSIO";
  return {
    specialty,
    grade,
    boost: Math.round((0.12 + grade * 0.11) * 100) / 100,
    signingCost: 0,
    weeklyWage: scaleStaffDailyWage(grade * 6500 + stars * 1300),
  };
}

function genUniformStarterStaffCard(type, opts = {}) {
  const stars = STARTER_STAFF_STARS;
  const namePool = type === "MANAGER" ? MANAGER_FIRST : EXTRA_STAFF_TYPES.includes(type) ? FIRST_NAMES : COACH_FIRST;
  const name = choice(namePool) + " " + choice(LAST_NAMES);
  const payload = buildUniformStaffCardPayload(type, stars, opts);
  const portrait = pickStaffPortrait(type, payload.specialty, stars);
  return { cardId: uid("card"), type, stars, name, portrait, ...payload };
}

function genUniformCoachOffer(specialty) {
  return staffCardToCoach(genUniformStarterStaffCard("COACH", { specialty }));
}

function genUniformScoutOffer() {
  return staffCardToScout(genUniformStarterStaffCard("SCOUT"));
}

function genUniformManagerOffer() {
  return staffCardToManager(genUniformStarterStaffCard("MANAGER"));
}

function buildStaffCardPayload(type, stars) {
  if (type === "MANAGER") {
    const { lo, hi } = starsToManagerStatRange(stars);
    const stats = {};
    Object.keys(MANAGER_STAT_TH).forEach((k) => { stats[k] = rand(lo, hi); });
    const keys = Object.keys(stats);
    const strong = [...keys].sort(() => Math.random() - 0.5).slice(0, Math.min(2, Math.ceil(stars / 3)));
    strong.forEach((k) => { stats[k] = rand(hi, Math.min(99, hi + 8)); });
    const avgStat = Object.values(stats).reduce((a, b) => a + b, 0) / 6;
    return {
      stats,
      preferredFormation: choice(FORMATION_KEYS),
      signingCost: Math.round((avgStat * 3500 + stars * 50000) / 1000) * 1000,
      weeklyWage: scaleStaffDailyWage(avgStat * 300 + stars * 2000),
    };
  }
  if (type === "COACH") {
    const specialty = choice(COACH_CARD_SPECIALTIES);
    const grade = starsToStaffGrade(stars);
    const boost = Math.round((0.1 + grade * 0.14) * 100) / 100;
    return {
      ...buildCoachProfile(specialty, stars, grade, boost),
      signingCost: Math.round((grade * 120000 + stars * 25000) / 1000) * 1000,
      weeklyWage: scaleStaffDailyWage(grade * 7000 + stars * 1500),
    };
  }
  if (type === "SCOUT") {
    const grade = starsToStaffGrade(stars);
    return {
      grade,
      specialtyPos: choice(["GK", "DF", "MF", "FW"]),
      findChance: 0.18 + grade * 0.09,
      qualityBoost: grade * 3,
      signingCost: Math.round((grade * 100000 + stars * 20000) / 1000) * 1000,
      weeklyWage: scaleStaffDailyWage(grade * 5500 + stars * 1200),
    };
  }
  if (EXTRA_STAFF_TYPES.includes(type)) {
    const grade = starsToStaffGrade(stars);
    const boost = Math.round((0.1 + grade * 0.14) * 100) / 100;
    return {
      specialty: type, // ตำแหน่งช่องเดี่ยว — ไม่มี specialty ย่อย ใช้ type ตัวเองเป็น key เข้า career.staff
      grade,
      boost,
      signingCost: Math.round((grade * 110000 + stars * 22000) / 1000) * 1000,
      weeklyWage: scaleStaffDailyWage(grade * 6000 + stars * 1300),
    };
  }
  const grade = starsToStaffGrade(stars);
  const boost = Math.round((0.12 + grade * 0.11) * 100) / 100;
  return {
    specialty: choice(MEDICAL_CARD_SPECIALTIES),
    grade,
    boost,
    signingCost: Math.round((grade * 100000 + stars * 20000) / 1000) * 1000,
    weeklyWage: scaleStaffDailyWage(grade * 6500 + stars * 1300),
  };
}

function genStaffCard(fixedType, fixedStars, weights) {
  const type = fixedType || choice(STAFF_CARD_TYPES);
  const stars = fixedStars != null ? fixedStars : rollStaffCardStars(weights);
  // ตำแหน่งช่องเดี่ยว (ผู้ช่วยผจก./Analyst/Director/หัวหน้าแพทย์) ใช้ชื่อธรรมดาไม่มีคำนำหน้า "โค้ช..."
  const namePool = type === "MANAGER" ? MANAGER_FIRST : EXTRA_STAFF_TYPES.includes(type) ? FIRST_NAMES : COACH_FIRST;
  const name = choice(namePool) + " " + choice(LAST_NAMES);
  const payload = buildStaffCardPayload(type, stars);
  const portrait = pickStaffPortrait(type, payload.specialty, stars);
  return { cardId: uid("card"), type, stars, name, portrait, ...payload };
}

function defaultStaffCardState(day = 1) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    machineCoins: DAILY_MACHINE_COIN_GRANT,
    staffFreeDrawResetDay: day,
    staffFreeDrawResetDate: today,
    staffPlatinumPacks: 0,
    staffCardBag: [],
    lastStaffPull: null,
    autoMergeTiers: { 1: false, 2: false, 3: false, 4: false },
  };
}

function ensureStaffCardIds(bag) {
  (bag || []).forEach((card) => {
    if (!card?.cardId) card.cardId = uid("card");
    // เซฟเก่าก่อนมีระบบภาพเหมือน — เติม portrait ย้อนหลังให้การ์ดที่ยังไม่มี (สุ่มตามหมวดของการ์ดนั้น)
    if (card && !card.portrait) card.portrait = pickStaffPortrait(card.type, card.specialty, card.stars);
    // การ์ดที่ล็อกไว้ (คนเล่นกดเอง) จะไม่ถูกดึงไปรวม ทั้งอัตโนมัติและตอนกด "รวม" แบบหยิบให้อัตโนมัติ
    if (card && card.locked == null) card.locked = false;
  });
  return bag;
}

function ensureStaffCardFields(c) {
  // เซฟเก่าก่อนเปลี่ยนจาก "สิทธิ์หยอดฟรี/วัน" มาเป็น "เหรียญตู้สะสมได้" — แปลงสิทธิ์เก่าที่เหลือให้เป็นเหรียญเทียบเท่า
  if (c.machineCoins == null) c.machineCoins = (c.machinePullsLeft ?? DAILY_FREE_MACHINE_PULLS) * MACHINE_PULL_COST;
  delete c.machinePullsLeft;
  if (c.staffPlatinumPacks == null) c.staffPlatinumPacks = 0;
  if (c.staffFreeDrawResetDay == null) c.staffFreeDrawResetDay = c.day || 1;
  if (c.staffFreeDrawResetDate == null) c.staffFreeDrawResetDate = new Date().toISOString().slice(0, 10);
  if (!c.staffCardBag) c.staffCardBag = [];
  ensureStaffCardIds(c.staffCardBag);
  if (Array.isArray(c.lastStaffPull)) ensureStaffCardIds(c.lastStaffPull);
  if (c.lastStaffPull == null) c.lastStaffPull = null;
  if (!c.autoMergeTiers) c.autoMergeTiers = { 1: false, 2: false, 3: false, 4: false };
  // เซฟเก่าก่อนที่ระบบ portrait จะพ่วงติดไปกับ manager/coach ที่จ้างแล้ว (staffCardToManager/staffCardToCoach) — เติมย้อนหลังให้
  (c.teams || []).forEach((team) => {
    if (team.manager && !team.manager.portrait) team.manager.portrait = pickStaffPortrait("MANAGER", null, team.manager.cardStars || 3);
    if (team.staff) {
      Object.keys(team.staff).forEach((spec) => {
        const co = team.staff[spec];
        if (co && !co.portrait) co.portrait = pickStaffPortrait("COACH", co.specialty, co.cardStars || 3);
      });
    }
  });
  return resetDailyStaffDraws(c);
}

function purgeCardsFromBag(c, removeSet) {
  c.staffCardBag = (c.staffCardBag || []).filter((card) => !removeSet.has(card.cardId));
  if (Array.isArray(c.lastStaffPull)) {
    c.lastStaffPull = c.lastStaffPull.filter((card) => !removeSet.has(card.cardId));
  }
}

/** รวมอัตโนมัติได้เฉพาะการ์ด 1★-4★ — 5★ ขึ้นไปต้องกดรวมเองเท่านั้น */
const AUTO_MERGE_MAX_STARS = 4;

/**
 * จำลองการรวมอัตโนมัติบน bag ที่ให้มา (ไม่แก้ของเดิม) — วนรวมทุกชุดที่ครบ 10 ใบใน tier ที่เปิดไว้
 * การ์ดใหม่ที่ได้จากการรวมจะถูกนับต่อ ถ้าสะสมครบ 10 ใบใน tier ที่เปิดไว้ก็รวมต่อให้เลย
 * คืน { removeIds, newCards, attempts } เพื่อเอาไป apply กับ state แบบตายตัว (deterministic)
 */
function computeAutoMergeAttempts(bag, enabledTiers) {
  const working = [...(bag || [])];
  const removeIds = [];
  const newCards = [];
  const attempts = [];
  let guard = 0;
  while (guard++ < 300) {
    // การ์ดที่ล็อกไว้ไม่นับเป็นวัตถุดิบรวมอัตโนมัติ — ต้องกดปลดล็อกเองก่อนถึงจะถูกดึงไปรวม
    const groups = groupStaffCards(working.filter((card) => !card.locked));
    const target = groups.find((g) => g.stars <= AUTO_MERGE_MAX_STARS && enabledTiers?.[g.stars] && g.count >= MERGE_CARD_COUNT);
    if (!target) break;
    const consumed = target.cards.slice(0, MERGE_CARD_COUNT).map((card) => card.cardId);
    const consumedSet = new Set(consumed);
    for (let i = working.length - 1; i >= 0; i--) if (consumedSet.has(working[i].cardId)) working.splice(i, 1);
    removeIds.push(...consumed);
    const chance = mergeSuccessChance(target.stars);
    const success = Math.random() < chance;
    const card = success ? genStaffCard(target.type, target.stars + 1) : null;
    if (card) { working.push(card); newCards.push(card); }
    attempts.push({ type: target.type, stars: target.stars, success, card, chance });
  }
  return { removeIds, newCards, attempts };
}

function resetDailyStaffDraws(c) {
  // ห้ามเรียก ensureStaffCardFields(c) ในนี้ — ensureStaffCardFields เรียกฟังก์ชันนี้อยู่แล้วเป็นขั้นตอนสุดท้าย
  // เรียกกลับไปกลับมาแบบนี้จะวนไม่รู้จบจน stack overflow (บั๊กที่เจอจริง: สร้างเกมใหม่ไม่ได้เลย)
  const today = new Date().toISOString().slice(0, 10);
  if (c.staffFreeDrawResetDate !== today) {
    c.machineCoins = (c.machineCoins || 0) + DAILY_MACHINE_COIN_GRANT;
    c.staffFreeDrawResetDate = today;
    c.staffFreeDrawResetDay = c.day;
  }
  return c;
}

function awardSeasonPlatinumPacks(c, rank) {
  ensureStaffCardFields(c);
  if (rank >= 1 && rank <= 3) {
    const packs = SEASON_PLATINUM_PACKS[rank - 1];
    c.staffPlatinumPacks += packs;
    c.log = [`✨ จบอันดับที่ ${rank} ได้ซอง Platinum ${packs} ใบ (การ์ด 5-7★)`, ...c.log];
  }
}

function groupStaffCards(bag) {
  const map = {};
  (bag || []).forEach((card) => {
    const key = `${card.type}_${card.stars}`;
    if (!map[key]) map[key] = { type: card.type, stars: card.stars, cards: [], count: 0 };
    map[key].cards.push(card);
    map[key].count += 1;
  });
  return Object.values(map).sort((a, b) => b.stars - a.stars || a.type.localeCompare(b.type));
}

function highestManagerStat(stats) {
  return Object.keys(MANAGER_STAT_TH).reduce((best, k) => ((stats?.[k] || 0) > (stats?.[best] || 0) ? k : best), "tactics");
}
function staffCardToManager(card) {
  return {
    id: uid("mg"), name: card.name, stats: { ...card.stats }, trait: highestManagerStat(card.stats),
    preferredFormation: card.preferredFormation,
    signingCost: 0, weeklyWage: card.weeklyWage,
    wins: 0, draws: 0, losses: 0, xp: 0, level: 1, skillPoints: 0,
    cardStars: card.stars, portrait: card.portrait,
  };
}

function staffCardToCoach(card) {
  const base = ensureCoachProfile({
    id: uid("co"), name: card.name, specialty: card.specialty,
    grade: card.grade, boost: card.boost,
    technique: card.technique, motivation: card.motivation, drillSkill: card.drillSkill,
    coachingStyle: card.coachingStyle, focusAttrs: card.focusAttrs,
    signingCost: 0, weeklyWage: card.weeklyWage,
    cardStars: card.stars, portrait: card.portrait,
  }, card.specialty);
  return base;
}

function staffCardStatLine(card, lang = "th") {
  if (card.type === "MANAGER") {
    const vals = Object.values(card.stats || {});
    if (!vals.length) return null;
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    return `เฉลี่ยสเตต ${avg} · ถนัด ${card.preferredFormation}`;
  }
  if (EXTRA_STAFF_TYPES.includes(card.type)) {
    const fx = EXTRA_STAFF_EFFECTS[card.type];
    return fx ? (lang === "en" ? fx.en : fx.th) : `เกรด ${card.grade}/7 · โบนัส +${card.boost}`;
  }
  if (card.type === "COACH" || card.type === "DOCTOR") {
    if (card.type === "COACH") {
      const c = ensureCoachProfile({ ...card }, card.specialty);
      const style = COACHING_STYLES[c.coachingStyle];
      return `${style?.th || "โค้ช"} · เทคนิค ${c.technique} · ฝึก ~${Math.round(coachDailyAttrBump(c) * 1000) / 10}%/วัน`;
    }
    return `เกรด ${card.grade}/7 · โบนัส +${card.boost}`;
  }
  if (card.type === "SCOUT") {
    return `เกรด ${card.grade}/7 · โอกาสพบนักเตะ ${Math.round((card.findChance || 0) * 100)}%`;
  }
  return null;
}

/** Coaches/doctors/scouts hired can only be replaced after the season rolls over. Managers are exempt. */
function isStaffRoleLocked(existing, season) {
  return Boolean(existing && existing.hiredSeason === season);
}

/** Returns { locked, fee, afford } describing whether/how much it costs to install this card right now. */
function staffCardLockInfo(career, card) {
  if (!career) return { locked: false, fee: 0, afford: true };
  const season = career.season;
  const budget = career.budget || 0;
  if (card.type === "COACH" || card.type === "DOCTOR" || EXTRA_STAFF_TYPES.includes(card.type)) {
    const existing = career.staff?.[career.userTeamId]?.[card.specialty];
    const locked = isStaffRoleLocked(existing, season);
    const fee = existing ? Math.round((existing.weeklyWage * 8) / 1000) * 1000 : 0;
    return { locked, fee, afford: fee === 0 || budget >= fee };
  }
  if (card.type === "SCOUT") {
    if (!career.marketScout) return { locked: false, fee: 0, afford: true };
    if (!career.youthScout) return { locked: false, fee: 0, afford: true };
    if (!isStaffRoleLocked(career.marketScout, season)) {
      const fee = Math.round((career.marketScout.weeklyWage * 8) / 1000) * 1000;
      return { locked: false, fee, afford: fee === 0 || budget >= fee };
    }
    if (!isStaffRoleLocked(career.youthScout, season)) {
      const fee = Math.round((career.youthScout.weeklyWage * 8) / 1000) * 1000;
      return { locked: false, fee, afford: fee === 0 || budget >= fee };
    }
    return { locked: true, fee: 0, afford: true };
  }
  if (card.type === "MANAGER") {
    const t = career.teams?.find((tm) => tm.id === career.userTeamId);
    const underContract = t?.manager && t.manager.contractEndsDay != null && career.day < t.manager.contractEndsDay;
    const daysLeft = underContract ? t.manager.contractEndsDay - career.day : 0;
    const fee = underContract ? Math.round((daysLeft * t.manager.weeklyWage * 1.4) / 1000) * 1000 : 0;
    return { locked: false, fee, afford: fee === 0 || budget >= fee };
  }
  return { locked: false, fee: 0, afford: true };
}

function staffCardToScout(card) {
  return {
    id: uid("sc"), name: card.name, grade: card.grade,
    specialtyPos: card.specialtyPos, findChance: card.findChance, qualityBoost: card.qualityBoost,
    signingCost: 0, weeklyWage: card.weeklyWage,
    cardStars: card.stars,
  };
}

function managerStarsFromStats(stats) {
  if (!stats) return 1;
  const avg = Object.values(stats).reduce((a, b) => a + b, 0) / Object.keys(stats).length;
  return clamp(Math.round(avg / 14), 1, 7);
}

function staffEntityStars(entity) {
  if (!entity) return null;
  if (entity.cardStars) return entity.cardStars;
  if (entity.stats) return managerStarsFromStats(entity.stats);
  if (entity.grade) return clamp(entity.grade, 1, 7);
  return null;
}

/** คุณภาพการวางแผนก่อนเกม — อิงสเตตแทคติก/สเกาต์ + ดาวการ์ดผจก. */
function managerPlanProfile(team) {
  const mgr = team?.manager;
  if (!mgr) {
    const tier = managerTierDef(0);
    return {
      name: "ไม่มีผจก.", stars: 0, tactics: 40, scouting: 40, manManagement: 45,
      insight: 0.38, prepMult: 0.90, markMult: 0.75, label: "ไม่มีผู้จัดการ",
      tierTitle: tier.title, perks: tier.perks, autoPlan: false, performanceBonus: 0,
      devMult: 1, famBonus: 0, moraleBonus: 0, negotiationPct: 0, xpMult: 1,
    };
  }
  const tactics = mgr.stats?.tactics ?? 40;
  const scouting = mgr.stats?.scouting ?? 40;
  const manManagement = mgr.stats?.manManagement ?? 45;
  const stars = staffEntityStars(mgr) || 1;
  const tier = managerTierDef(stars);
  const insight = clamp(0.32 + tactics * 0.0045 + scouting * 0.003 + stars * 0.045, 0.32, 1);
  const prepMult = clamp(0.86 + tactics / 220 + stars * 0.018 + tier.prepBonus, 0.82, 1.18);
  const markMult = clamp(0.55 + tactics / 130 + stars * 0.025, 0.55, 1.2);
  const label = tier.title;
  const plan = {
    name: mgr.name, stars, tactics, scouting, manManagement, insight, prepMult, markMult, label,
    tierTitle: tier.title, perks: tier.perks, autoPlan: tier.autoPlan,
    performanceBonus: tier.performanceBonus, devMult: tier.devMult, famBonus: tier.famBonus,
    moraleBonus: tier.moraleBonus, negotiationPct: tier.negotiationPct, xpMult: tier.xpMult,
  };
  // สัญชาตญาณผจก. — บวกเพิ่มเล็กน้อยบนตัวคูณที่มีอยู่แล้ว (ไม่แทนที่สูตรเดิม)
  const traitKey = mgr.trait || highestManagerStat(mgr.stats);
  const trait = MANAGER_TRAITS[traitKey];
  if (trait) {
    plan.trait = traitKey;
    plan[trait.effectKey] += trait.effectVal;
    if (traitKey === "tactics") plan.prepMult += 0.03; // จอมยุทธวิธี: บวกทั้งความคุ้นเคยแผน (famBonus) และคุณภาพวางแผนก่อนเกม
  }
  return plan;
}

/** ผจก. + โบนัสจากผู้ช่วย/Data Analyst (ไม่แตะ engine แมตช์สด) */
function enrichedManagerPlan(c, team) {
  const base = managerPlanProfile(team);
  if (!c || team?.id !== c.userTeamId) return base;
  return mergeManagerPlanWithStaff(base, staffSupportBonuses(c, team.id));
}

function bootstrapStarterStaff(c) {
  ensureStaffCardFields(c);
  const t = c.teams.find((tm) => tm.id === c.userTeamId);
  const stars = STARTER_STAFF_STARS;
  const hired = [];

  const mgrCard = genUniformStarterStaffCard("MANAGER");
  const mgr = staffCardToManager(mgrCard);
  mgr.contractEndsDay = c.day + 120;
  mgr.contractDays = 120;
  t.manager = mgr;
  hired.push(`ผจก. ${mgr.name} (${stars}★)`);

  const docCard = genUniformStarterStaffCard("DOCTOR", { specialty: "PHYSIO" });
  c.staff[c.userTeamId][docCard.specialty] = { ...staffCardToCoach(docCard), hiredSeason: c.season };
  hired.push(`หมอ ${docCard.name} (${stars}★)`);

  const scoutCard = genUniformStarterStaffCard("SCOUT");
  c.marketScout = { ...staffCardToScout(scoutCard), hiredSeason: c.season };
  hired.push(`สเกาต์ ${scoutCard.name} (${stars}★)`);

  COACH_CARD_SPECIALTIES.forEach((spec) => {
    const coachCard = genUniformStarterStaffCard("COACH", { specialty: spec });
    c.staff[c.userTeamId][spec] = { ...staffCardToCoach(coachCard), hiredSeason: c.season };
    hired.push(`โค้ช${spec} ${coachCard.name} (${stars}★)`);
  });

  EXTRA_STAFF_TYPES.forEach((type) => {
    const card = genUniformStarterStaffCard(type);
    c.staff[c.userTeamId][type] = { ...staffCardToCoach(card), hiredSeason: c.season };
    hired.push(`${STAFF_CARD_TYPE_TH[type] || type} ${card.name} (${stars}★)`);
  });

  c.staffCardBag = [];
  c.lastStaffPull = null;
  c.starterStaffBootstrapped = true;
  c.log = [
    `👥 สตาฟเริ่มต้น ${stars}★ ทุกตำแหน่ง · สเตตเท่ากัน: ${hired.join(" · ")}`,
    ...c.log,
  ];
  initBoard(c, t);
  initRoadmapOnCareer(c);
  runPreSeasonFriendlies(c);
  return c;
}

const SCOUT_FIND_SOURCES = ["ลีกรองภูมิภาค", "ดิวิชันต่ำ", "ทีมเยาวชน", "ฟรีเอเจนต์ต่างประเทศ", "ฐานข้อมูลสโมสร"];

/* ============================== SHOP / SOCKER COIN (Master Coin) ============================== */
const SHOP_DAILY_BUY_LIMIT = 5;
const SHOP_ITEMS = [
  {
    id: "injury_pack",
    name: "ชุดปฐมพยาบาล",
    desc: "สุ่มลดอาการบาดเจ็บ 1–4 วัน (เก็บในกระเป๋า ใช้ที่แท็บทีม)",
    icon: "🩹",
    coinCost: 10,
  },
  {
    id: "morale_boost",
    name: "บูสต์ขวัญกำลังใจ",
    desc: "เพิ่มขวัญกำลังใจนักเตะ 1 คน +15 (เก็บในกระเป๋า ใช้ที่แท็บทีม)",
    icon: "😊",
    coinCost: 8,
    instant: false,
  },
  {
    id: "staff_ticket",
    name: "หยอดตู้พิเศษ",
    desc: "ได้สิทธิ์หยอดตู้การ์ดสตาฟเพิ่มทันที 1 ครั้ง (นอกเหนือโควตาฟรีวันนี้)",
    icon: "🎰",
    coinCost: 15,
    instant: true,
  },
  {
    id: "camp_skip",
    name: "บัตรข้ามคูลดาวน์แคมป์ซ้อม",
    desc: "รีเซ็ตคูลดาวน์แคมป์ซ้อมทันที จัดแคมป์ได้เลย",
    icon: "⏩",
    coinCost: 20,
    instant: true,
  },
  {
    id: "termination_waiver",
    name: "บัตรยกเว้นค่าปรับเลิกจ้างสตาฟ",
    desc: "ยกเว้นค่าปรับเลิกจ้างสตาฟตอนจ้างจากการ์ดครั้งถัดไป (ใช้ได้ 1 ครั้ง)",
    icon: "📜",
    coinCost: 25,
    instant: true,
  },
];
function shopBuyCountToday(profile) {
  const today = new Date().toDateString();
  if (profile?.shopBuyDay !== today) return 0;
  return profile?.shopBuyCount || 0;
}
function inventoryCount(profile, itemId) {
  return profile?.inventory?.[itemId] || 0;
}
const COIN_PACKAGES = [
  { id: "pack_50", coins: 50, priceLabel: "฿29", tag: null },
  { id: "pack_120", coins: 120, priceLabel: "฿59", tag: "คุ้ม" },
  { id: "pack_300", coins: 300, priceLabel: "฿129", tag: "ยอดนิยม" },
  { id: "pack_650", coins: 650, priceLabel: "฿249", tag: "สุดคุ้ม" },
];
function genScoutFind(scout, userTier, day, leagueId = "thailand", ratingBonus = 0) {
  const pos = Math.random() < 0.55 ? scout.specialtyPos : choice(["GK", "DF", "MF", "FW"]);
  const tier = clamp(userTier + rand(-5, -2), -10, -2);
  const p = genPlayer(pos, tier, "scout_find", rand(18, 28), day, { leagueId });
  const targetRating = clamp(rand(44 + scout.grade * 2, 50 + scout.grade * 4) + ratingBonus, 42, 72);
  forcePlayerRating(p, targetRating);
  p.potential = clamp(p.rating + rand(3, 12 + scout.grade * 2), p.rating, 78);
  const buyFee = Math.round((40000 + p.rating * p.rating * 550) / 5000) * 5000;
  const buyWage = Math.max(100, Math.round(computePlayerWage(p.rating) * 0.72 / 100) * 100);
  return {
    findId: uid("sf"),
    playerId: uid("pl"),
    name: p.name,
    nationality: p.nationality,
    position: p.position,
    pos: p.pos,
    altPos: p.altPos,
    age: p.age,
    attrs: { ...p.attrs },
    attack: p.attack,
    defense: p.defense,
    rating: p.rating,
    potential: p.potential,
    buyFee,
    buyWage,
    scoutName: scout.name,
    scoutGrade: scout.grade,
    foundDay: day,
    expiresDay: day + 8,
    sourceNote: choice(SCOUT_FIND_SOURCES),
  };
}
function genYouthProspect(scoutQuality, scout, techLabLevel, leagueId = "thailand") {
  let pos;
  if (scout && Math.random() < 0.5) pos = scout.specialtyPos; // scouts find their specialty more often
  else pos = choice(["GK", "DF", "MF", "FW"]);
  const specialtyBonus = scout && pos === scout.specialtyPos ? 3 : 0;
  const techBonus = techLabLevel ? (techLabLevel - 1) * 1.5 : 0;
  const p = genPlayer(pos, rand(-2, 4) + scoutQuality + specialtyBonus + techBonus, "prospect", rand(15, 17), 1, { leagueId });
  p.prospectId = uid("yp");
  p.signingCost = Math.round((p.value * 0.35) / 1000) * 1000 || 50000;
  return p;
}
function genYouthIntakeProspect(c, basic = false) {
  const scout = c.youthScout;
  const acaBoost = c.academyManager ? Math.floor(c.academyManager.stats.scouting / 25) : 0;
  const quality = basic ? 0 : (scout?.qualityBoost || 0) + acaBoost;
  const p = genYouthProspect(quality, scout, c.facilities?.techLab || 1, c.legendLeagueId || "thailand");
  const hypeRoll = basic ? rand(1, 50) : rand(1, 100) + (scout ? scout.grade * 4 : 0) + acaBoost * 3;
  p.hype = hypeRoll >= 92 ? "สูงมาก" : hypeRoll >= 72 ? "สูง" : hypeRoll >= 48 ? "ปานกลาง" : "ต่ำ";
  const { isWonderkid } = getPlayerStarProfile(p);
  if (isWonderkid || p.potential >= 82) p.wonderkid = true;
  return p;
}
function runYouthIntake(c) {
  const hasStaff = c.youthScout || c.academyManager;
  const count = hasStaff ? rand(4, 6) : 2;
  const added = [];
  for (let i = 0; i < count; i++) {
    if (c.youthProspects.length >= 8) break;
    added.push(genYouthIntakeProspect(c, !hasStaff));
  }
  if (!added.length) return c;
  c.youthProspects = [...c.youthProspects, ...added];
  const wonderNames = added.filter((p) => p.wonderkid).map((p) => p.name);
  const hypeNames = added.filter((p) => p.hype === "สูงมาก" || p.hype === "สูง").map((p) => p.name);
  let line = `🎓 Youth Intake Day! รับดาวรุ่ง ${added.length} คนเข้าสู่ระบบ`;
  if (wonderNames.length) line += ` · 🌟 Wonderkid: ${wonderNames.join(", ")}`;
  else if (hypeNames.length) line += ` · ฮายป์สูง: ${hypeNames.slice(0, 2).join(", ")}`;
  if (!hasStaff) line += " (ไม่มีแมวมอง/ผจก.อคาเดมี — ได้แค่พื้นฐาน)";
  c.log = [line, ...c.log];
  return c;
}

/* 10-slot training calendar. Each real hour (9:00-20:00) advances one game day / one training slot. */
const TRAINING_TYPES = ["REST", "BALANCED", "FITNESS", "SHOOTING", "DEFENDING", "TACKLING"];
const TRAINING_TH = { REST: "พักฟื้น", BALANCED: "ฝึกทั่วไป", FITNESS: "ฟิตเนส", SHOOTING: "ซ้อมยิงประตู", DEFENDING: "ซ้อมเกมรับ", TACKLING: "ซ้อมสกัด/ปะทะ" };
const TRAINING_COLOR = { REST: C.blue, BALANCED: C.textDim, FITNESS: C.amber, SHOOTING: "#c1440e", DEFENDING: "#5a9bd5", TACKLING: "#9d6fe0" };
/* โฟกัสฝึกรายบุคคล — เลือกได้เฉพาะหมวดที่มีผลชัดเจน (ไม่รวมพัก/ทั่วไป) */
const INDIVIDUAL_FOCUS_TYPES = ["FITNESS", "SHOOTING", "DEFENDING", "TACKLING"];
/* โบนัสจากโค้ชตามตำแหน่ง ยิ่งวันฝึกตรงสายที่โค้ชถนัด ยิ่งได้ผลมากขึ้น */
const COACH_TRAINING_SYNERGY = {
  FITNESS: { FITNESS: 1 },
  SHOOTING: { FW: 3, MF: 1.5 },
  DEFENDING: { DF: 3, GK: 1.5 },
  TACKLING: { DF: 2.5, MF: 2 },
  BALANCED: {}, REST: {},
};
function coachTrainingSynergyMult(spec, trainingType) {
  return (COACH_TRAINING_SYNERGY[trainingType] || {})[spec] ?? 1;
}
const TRAINING_FOCUS_ATTRS = {
  FITNESS: ["pace", "acceleration", "strength", "agility"],
  SHOOTING: ["finishing", "dribbling", "composure"],
  DEFENDING: ["decisions", "heading", "vision"],
  TACKLING: ["tackling", "strength", "determination"],
};
function applyTrainingToPlayer(p, type) {
  if (type === "REST") { p.stamina = clamp(p.stamina + 22, 0, 100); p.morale = clamp(p.morale + 2, 10, 99); return; }
  if (type === "FITNESS") { bumpAttrsSubset(p, ["pace", "acceleration", "strength", "agility"], 0.35); p.stamina = clamp(p.stamina - 4, 0, 100); return; }
  if (type === "SHOOTING") { bumpAttrsSubset(p, ["finishing", "dribbling", "composure"], 0.35); p.stamina = clamp(p.stamina - 8, 0, 100); return; }
  if (type === "DEFENDING") { bumpAttrsSubset(p, ["decisions", "heading", "vision"], 0.35); p.stamina = clamp(p.stamina - 8, 0, 100); return; }
  if (type === "TACKLING") { bumpAttrsSubset(p, ["tackling", "strength", "determination"], 0.35); p.stamina = clamp(p.stamina - 8, 0, 100); return; }
  bumpAttrs(p, 0.08); p.stamina = clamp(p.stamina - 6, 0, 100); // BALANCED
}
function bumpAttrsSubset(p, keys, amount) { keys.forEach((k) => { if (p.attrs[k] != null) p.attrs[k] = Math.round(clamp(p.attrs[k] + amount, 1, 20) * 10) / 10; }); recomputeDerived(p); }

/* ---------- บอร์ดซ้อมรายตำแหน่ง (สไตล์ Top Eleven) ---------- */
/* แต่ละกลุ่มตำแหน่ง (GK/DF/MF/FW) จัดคิวท่าซ้อมได้สูงสุด 6 ท่า รันวันละ 1 เซสชัน
   (อัตโนมัติตอนจบวัน หรือกด "ซ้อมเลย!" รันเองก็ได้) — แยกจากปฏิทินฝึกทีม 10 วัน */
const DRILL_GROUPS = ["GK", "DF", "MF", "FW"];
const MAX_DRILLS_PER_GROUP = 6;
const DRILL_BUMP = 0.07; // พัฒนาการต่อสเตตต่อท่า (ก่อนคูณโบนัสโค้ช/ศูนย์ฝึก)
const DRILLS = {
  warmup: { icon: "🤸", name: "วอร์มอัพ", attrs: ["agility"], cond: 1, groups: ["GK", "DF", "MF", "FW"] },
  gk_training: { icon: "🧤", name: "ซ้อมเซฟ", attrs: ["decisions", "agility"], cond: 3, groups: ["GK"] },
  one_on_one: { icon: "⚔️", name: "1-ต่อ-1", attrs: ["composure", "finishing"], cond: 3, groups: ["GK", "FW"] },
  shooting_tech: { icon: "🎯", name: "ซ้อมยิงประตู", attrs: ["finishing", "composure"], cond: 3, groups: ["GK", "MF", "FW"] },
  long_run: { icon: "🏃", name: "วิ่งระยะไกล", attrs: ["determination", "workRate"], cond: 4, groups: ["GK", "DF", "MF", "FW"] },
  sprint: { icon: "⚡", name: "สปรินต์", attrs: ["pace", "acceleration"], cond: 4, groups: ["GK", "DF", "MF", "FW"] },
  slalom: { icon: "🎿", name: "สลาลมเลี้ยงบอล", attrs: ["dribbling", "agility"], cond: 3, groups: ["DF", "MF", "FW"] },
  pass_go_shoot: { icon: "🔄", name: "จ่าย-ไป-ยิง", attrs: ["passing", "finishing"], cond: 3, groups: ["MF", "FW"] },
  press_play: { icon: "🔥", name: "เพรสซิ่งไล่บอล", attrs: ["workRate", "tackling"], cond: 4, groups: ["DF", "MF", "FW"] },
  hold_line: { icon: "📏", name: "ยืนไลน์รับ", attrs: ["decisions", "vision"], cond: 2, groups: ["GK", "DF"] },
  def_cross: { icon: "🛡️", name: "ป้องกันบอลครอส", attrs: ["heading", "tackling"], cond: 3, groups: ["GK", "DF"] },
  use_head: { icon: "🎈", name: "โหม่งบอล", attrs: ["heading", "strength"], cond: 3, groups: ["DF", "MF", "FW"] },
  gym: { icon: "🏋️", name: "เข้ายิม", attrs: ["strength"], cond: 4, groups: ["GK", "DF", "MF", "FW"] },
  piggy: { icon: "🐒", name: "ลิงชิงบอล", attrs: ["passing", "vision"], cond: 2, groups: ["GK", "DF", "MF", "FW"] },
  video: { icon: "🎬", name: "วิดีโอวิเคราะห์", attrs: ["decisions", "vision"], cond: 1, groups: ["GK", "DF", "MF", "FW"] },
  counter: { icon: "🚀", name: "สวนกลับเร็ว", attrs: ["pace", "decisions"], cond: 3, groups: ["MF", "FW"] },
  crossing: { icon: "🎪", name: "เปิดบอลริมเส้น", attrs: ["crossing", "vision"], cond: 3, groups: ["DF", "MF"] },
};
function defaultDrillPlans() {
  return {
    GK: ["warmup", "gk_training", "one_on_one", "hold_line", "def_cross", "video"],
    DF: ["warmup", "press_play", "def_cross", "hold_line", "use_head", "gym"],
    MF: ["warmup", "piggy", "slalom", "pass_go_shoot", "counter", "video"],
    FW: ["warmup", "shooting_tech", "one_on_one", "pass_go_shoot", "sprint", "use_head"],
  };
}
function drillPlanCost(plan) { return (plan || []).reduce((s, id) => s + (DRILLS[id]?.cond || 0), 0); }
/* รันเซสชันซ้อมของกลุ่มตำแหน่งหนึ่ง — คืน null ถ้าไม่มีท่าซ้อม/ไม่มีนักเตะให้ซ้อม */
function applyDrillSession(c, group, opts = {}) {
  const skipIds = opts.skipPlayerIds || null;
  const plan = ((c.drillPlans || {})[group] || []).filter((id) => DRILLS[id]);
  if (!plan.length) return null;
  const uSquad = c.players.filter((p) => p.teamId === c.userTeamId && p.position === group && p.injuryDays <= 0 && !(skipIds && skipIds.has(p.id)));
  if (!uSquad.length) return null;
  const facMult = 1 + (((c.facilities || {}).training || 1) - 1) * 0.15;
  const coach = (c.staff[c.userTeamId] || {})[group];
  const coachMult = coachDrillMult(coach);
  const totalCost = drillPlanCost(plan);
  uSquad.forEach((p) => {
    plan.forEach((id) => {
      DRILLS[id].attrs.forEach((k) => { if (p.attrs[k] != null) p.attrs[k] = Math.round(clamp(p.attrs[k] + DRILL_BUMP * facMult * coachMult, 1, 20) * 10) / 10; });
    });
    p.stamina = clamp(p.stamina - totalCost, 0, 100);
    recomputeDerived(p);
  });
  return { count: uSquad.length, cost: totalCost };
}

/** เหตุการณ์สุ่มเบาๆ ระหว่างฝึกซ้อม — เพิ่มสีสันให้ตารางฝึกโดยไม่กระทบสมดุลมาก */
function rollTrainingEvent(c, uSquad, trainingType) {
  if (!uSquad.length || Math.random() > 0.16) return;
  const p = choice(uSquad);
  const roll = Math.random();
  if (roll < 0.35) {
    bumpAttrs(p, 0.3);
    c.log = [`✨ ${p.name} ซ้อมได้ไฟแรงเป็นพิเศษวันนี้ — พัฒนาการพุ่ง!`, ...c.log];
  } else if (roll < 0.6) {
    p.morale = clamp(p.morale + 5, 10, 99);
    c.log = [`🙂 โค้ชชมเชย ${p.name} หลังซ้อมหนัก — มูดดีขึ้น`, ...c.log];
  } else if (roll < 0.8) {
    uSquad.forEach((pl) => { pl.morale = clamp(pl.morale + 1, 10, 99); });
    c.log = [`🤝 บรรยากาศห้องแต่งตัวดี — มูดทั้งทีมดีขึ้นเล็กน้อย`, ...c.log];
  } else if (trainingType !== "REST") {
    p.stamina = clamp(p.stamina - 6, 0, 100);
    if (Math.random() < 0.2) {
      p.injuryDays = Math.max(p.injuryDays, 1);
      c.log = [`⚠️ ${p.name} ฝึกหนักเกินไป บาดเจ็บเล็กน้อย ต้องพัก 1 วัน`, ...c.log];
    } else {
      c.log = [`😮‍💨 ${p.name} ฝึกหนักจนเหนื่อยล้ากว่าปกติวันนี้`, ...c.log];
    }
  }
}

function formatMoney(n) {
  const sign = n < 0 ? "-" : "";
  n = Math.abs(n);
  if (n >= 1000000) return sign + (n / 1000000).toFixed(2) + "M฿";
  if (n >= 1000) return sign + (n / 1000).toFixed(0) + "K฿";
  return sign + n + "฿";
}

/* เศรษฐกิจระดับกลาง — แพ้บ้างยังไปต่อได้ */
const FAN_CAP = [250000, 80000]; // Master / Challenger
/** ค่าเหนื่อยนักเตะต่อวัน ≈ rating² × mult / 100 (ปัด 100) */
const PLAYER_WAGE_DAILY_MULT = 2.0;
/** สตาฟ/ผจก. — ฟิลด์ weeklyWage จ่ายรายวัน (ชื่อ legacy) */
const STAFF_WAGE_SCALE = 0.38;
const SPONSOR_TIERS = [
  { tier: 0, name: "สปอนเซอร์ท้องถิ่น", minFans: 0, baseDaily: 6500 },
  { tier: 1, name: "สปอนเซอร์ภูมิภาค", minFans: 8000, baseDaily: 14000 },
  { tier: 2, name: "สปอนเซอร์ระดับชาติ", minFans: 25000, baseDaily: 26000 },
  { tier: 3, name: "สปอนเซอร์แบรนด์ใหญ่", minFans: 60000, baseDaily: 48000 },
  { tier: 4, name: "สปอนเซอร์พันธมิตรหลัก", minFans: 150000, baseDaily: 92000 },
];
const LEAGUE_PRIZE_CHALLENGER = [6e6, 3.5e6, 2.5e6, 2e6, ...Array(4).fill(1.2e6), ...Array(4).fill(600e3), ...Array(4).fill(300e3)];
const LEAGUE_PRIZE_MASTER = [12e6, 7e6, 5e6, 4e6, ...Array(4).fill(2.5e6), ...Array(4).fill(1.2e6), ...Array(4).fill(500e3)];
const PROMOTION_BONUS = 4e6;
const RELEGATION_PARACHUTE = 2e6;

function fanIncomeMultiplier(fanBase) {
  return 1 + Math.log10(Math.max(fanBase, 500) / 1000) * 0.55;
}
function divisionIncomeMult(division) {
  return division === 0 ? 1.35 : 1;
}
function getFanCap(division, c) {
  const base = FAN_CAP[division] ?? FAN_CAP[1];
  return base + (c ? stadiumFanCapBonus(c) : 0);
}
function qualifySponsorTier(fanBase) {
  let tier = 0;
  while (tier + 1 < SPONSOR_TIERS.length && fanBase >= SPONSOR_TIERS[tier + 1].minFans) tier += 1;
  return tier;
}
function autoUpgradeSponsor(c, logUpgrade = false) {
  const qualified = qualifySponsorTier(c.fanBase || 0);
  if (qualified > (c.sponsorTier ?? 0)) {
    c.sponsorTier = qualified;
    if (logUpgrade) c.log = [`📈 สปอนเซอร์อัปเกรดเป็น ${SPONSOR_TIERS[c.sponsorTier].name}`, ...c.log];
  }
}
function computeSponsorDaily(c, uTeam) {
  const tier = SPONSOR_TIERS[c.sponsorTier ?? 0] || SPONSOR_TIERS[0];
  return Math.round(tier.baseDaily * fanIncomeMultiplier(c.fanBase || 0) * divisionIncomeMult(uTeam.division));
}
function computeMerchDaily(c, uTeam) {
  const squad = c.players.filter((p) => p.teamId === c.userTeamId);
  const starBonus = squad.some((p) => p.rating >= 85) ? 1.5 : squad.some((p) => p.rating >= 75) ? 1.2 : 1;
  const divMult = uTeam.division === 0 ? 1.2 : 1;
  return Math.round(((c.fanBase || 0) / 28) * starBonus * divMult);
}
function getLeaguePrize(division, position) {
  const table = division === 0 ? LEAGUE_PRIZE_MASTER : LEAGUE_PRIZE_CHALLENGER;
  return table[Math.max(0, Math.min(position - 1, table.length - 1))];
}
function getLast5LeaguePts(c, includeCurrentDay = true) {
  const uT = c.teams.find((t) => t.id === c.userTeamId);
  const league = c.leagues[uT.division];
  let pts = 0;
  let count = 0;
  for (let day = includeCurrentDay ? c.day : c.day - 1; day >= 1 && count < 5; day -= 1) {
    const round = league.fixtures.find((r) => r.day === day);
    if (!round) continue;
    const m = round.matches.find((mm) => mm.played && (mm.home === c.userTeamId || mm.away === c.userTeamId));
    if (!m) continue;
    const isHome = m.home === c.userTeamId;
    const gf = isHome ? m.homeGoals : m.awayGoals;
    const ga = isHome ? m.awayGoals : m.homeGoals;
    pts += gf > ga ? 3 : gf === ga ? 1 : 0;
    count += 1;
  }
  return pts;
}
function applyFanChangeAfterMatch(c, m, homeGoals, awayGoals) {
  if (m.home !== c.userTeamId && m.away !== c.userTeamId) return;
  const uT = c.teams.find((t) => t.id === c.userTeamId);
  const uIsHome = m.home === c.userTeamId;
  const myGoals = uIsHome ? homeGoals : awayGoals;
  const oppGoals = uIsHome ? awayGoals : homeGoals;
  const result = myGoals > oppGoals ? "win" : myGoals === oppGoals ? "draw" : "loss";
  let delta = result === "win" ? rand(80, 150) : result === "draw" ? rand(20, 50) : -rand(60, 120);
  delta += myGoals * rand(15, 25);
  if (oppGoals === 0) delta += rand(40, 80);
  delta = Math.round(delta * (uIsHome ? 1.15 : 0.85));
  if (getLast5LeaguePts(c, true) <= 4) delta -= rand(30, 60);
  const before = c.fanBase || 0;
  c.fanBase = clamp(before + delta, 500, getFanCap(uT.division, c));
  c.fanDeltaToday = c.fanBase - before;
  autoUpgradeSponsor(c, true);
  if (c.fanDeltaToday !== 0) {
    const sign = c.fanDeltaToday > 0 ? "+" : "";
    c.log = [`${c.fanDeltaToday > 0 ? "📈" : "📉"} แฟนบอล ${sign}${c.fanDeltaToday.toLocaleString()} (รวม ${c.fanBase.toLocaleString()})`, ...c.log];
  }
  // แฟนบอลทั่วโลก + Owner XP — ได้เล็กน้อยทุกแมท (ตัวใหญ่ๆ มาจากเหตุการณ์ระดับฤดูกาล เช่น เลื่อนชั้น/แชมป์)
  c.globalFanbase = (c.globalFanbase || 0) + (result === "win" ? rand(GLOBAL_FANBASE_AWARDS.winMatchMin, GLOBAL_FANBASE_AWARDS.winMatchMax) : 0);
  c.ownerXp = (c.ownerXp || 0) + OWNER_XP_AWARDS.matchPlayed + (result === "win" ? OWNER_XP_AWARDS.win : result === "draw" ? OWNER_XP_AWARDS.draw : OWNER_XP_AWARDS.loss);
}
function processSeasonEndFans(c, prevPos, prevRow, prevDivision, wasPromoted, wasRelegated) {
  const uT = c.teams.find((t) => t.id === c.userTeamId);
  const prize = getLeaguePrize(prevDivision, prevPos);
  c.budget += prize;
  c.log = [`🏆 รางวัลลีกอันดับ ${prevPos}: +${formatMoney(prize)}`, ...c.log];
  if (wasPromoted) {
    c.budget += PROMOTION_BONUS;
    c.fanBase = clamp(Math.round((c.fanBase || 0) * 1.08) + rand(500, 1500), 500, getFanCap(uT.division, c));
    c.log = [`🎉 โบนัสเลื่อนชั้น +${formatMoney(PROMOTION_BONUS)} · แฟนบอลเพิ่ม`, ...c.log];
  }
  if (wasRelegated) {
    c.budget += RELEGATION_PARACHUTE;
    c.fanBase = clamp(Math.round((c.fanBase || 0) * 0.92), 500, getFanCap(uT.division, c));
    c.log = [`🪂 เงินช่วยเหลือตกชั้น +${formatMoney(RELEGATION_PARACHUTE)}`, ...c.log];
  }
  // แฟนบอลทั่วโลก + Owner XP จากผลงานระดับฤดูกาล (คนละก้อนกับแฟนบอลเข้าสนามด้านบน)
  {
    let globalGain = 0, xpGain = 0;
    if (prevPos === 1) { globalGain += GLOBAL_FANBASE_AWARDS.champion; xpGain += OWNER_XP_AWARDS.champion; }
    else if (prevPos <= 4) globalGain += GLOBAL_FANBASE_AWARDS.top4Finish;
    if (prevDivision === 0 && prevPos <= 8) { globalGain += GLOBAL_FANBASE_AWARDS.masterTop8; xpGain += OWNER_XP_AWARDS.masterTop8; }
    if (wasPromoted) { globalGain += GLOBAL_FANBASE_AWARDS.promotion; xpGain += OWNER_XP_AWARDS.promotion; }
    if (globalGain > 0) {
      c.globalFanbase = (c.globalFanbase || 0) + globalGain;
      c.ownerXp = (c.ownerXp || 0) + xpGain;
      c.log = [`🌍 แฟนบอลทั่วโลก +${globalGain.toLocaleString()} (รวม ${c.globalFanbase.toLocaleString()})`, ...c.log];
    }
  }
  const snap = c.lastSeasonSnapshot;
  const curScore = prevRow.pts * 10 - prevPos;
  const lastScore = snap ? snap.pts * 10 - snap.pos : curScore;
  if (curScore < lastScore - 5) {
    const loss = rand(3000, 8000);
    c.fanBase = clamp((c.fanBase || 0) - loss, 500, getFanCap(uT.division, c));
    c.badSeasonStreak = (c.badSeasonStreak || 0) + 1;
    c.log = [`😞 ฤดูกาลแย่กว่าปีก่อน แฟนบอล -${loss.toLocaleString()}`, ...c.log];
  } else if (curScore > lastScore + 5) {
    const gain = rand(2000, 6000);
    c.fanBase = clamp((c.fanBase || 0) + gain, 500, getFanCap(uT.division, c));
    c.badSeasonStreak = 0;
    c.log = [`🙌 ฤดูกาลดีกว่าปีก่อน แฟนบอล +${gain.toLocaleString()}`, ...c.log];
  } else {
    c.badSeasonStreak = 0;
  }
  if ((c.badSeasonStreak || 0) >= 2) {
    const pct = c.badSeasonStreak >= 3 ? 0.25 : 0.15;
    const drop = Math.round((c.fanBase || 0) * pct);
    c.fanBase = clamp((c.fanBase || 0) - drop, 500, getFanCap(uT.division, c));
    c.log = [`📉 แฟนหนี ${c.badSeasonStreak} ฤดูกาลติดต่อกัน -${Math.round(pct * 100)}% (${drop.toLocaleString()})`, ...c.log];
    if (c.badSeasonStreak >= 3 && (c.sponsorTier ?? 0) > 0) {
      c.sponsorTier -= 1;
      c.log = [`📉 สปอนเซอร์ลดระดับเป็น ${SPONSOR_TIERS[c.sponsorTier].name}`, ...c.log];
    }
  }
  c.lastSeasonSnapshot = { pos: prevPos, pts: prevRow.pts, w: prevRow.w, d: prevRow.d, l: prevRow.l, division: prevDivision };
  c.fanBase = clamp(c.fanBase || 0, 500, getFanCap(uT.division, c));
  autoUpgradeSponsor(c, true);
  processBoardSeasonEnd(c, uT, prevPos);
}
function computePlayerWage(rating) {
  const raw = ((rating * rating * PLAYER_WAGE_DAILY_MULT) / 100) * starWageMultiplier(rating);
  return Math.max(100, Math.round(raw / 10) * 10);
}
/** ตัวสำรอง/โรตейชันจ่ายค่าเหนื่อยน้อยกว่าตัวจริง */
function effectivePlayerDailyWage(p) {
  const base = p.wage || computePlayerWage(p.rating || 50);
  const starts = (p.appearHistory || []).filter(Boolean).length;
  const mult = starts >= 4 ? 1 : starts >= 1 ? 0.78 : 0.55;
  return Math.max(100, Math.round(base * mult / 10) * 10);
}
function squadDailyWageBill(squad, staffTeam, manager, extras = {}) {
  const players = (squad || []).reduce((s, p) => s + effectivePlayerDailyWage(p), 0);
  const staff = Object.values(staffTeam || {}).reduce((s, co) => s + co.weeklyWage, 0);
  const mgr = manager?.weeklyWage || 0;
  const scouts = (extras.marketScout?.weeklyWage || 0) + (extras.youthScout?.weeklyWage || 0) + (extras.academyManager?.weeklyWage || 0);
  return players + staff + mgr + scouts;
}
function scaleStaffDailyWage(amount) {
  return Math.max(400, Math.round(amount * STAFF_WAGE_SCALE / 500) * 500);
}
function applyUserMatchRevenue(c, m, homeGoals, awayGoals) {
  if (m.home !== c.userTeamId && m.away !== c.userTeamId) return;
  const uIsHome = m.home === c.userTeamId;
  const myGoals = uIsHome ? homeGoals : awayGoals;
  const oppGoals = uIsHome ? awayGoals : homeGoals;
  const venue = uIsHome ? "home" : "away";
  const result = myGoals > oppGoals ? "win" : myGoals === oppGoals ? "draw" : "loss";
  const ranges = {
    win: { home: [260000, 340000], away: [145000, 195000] },
    draw: { home: [165000, 215000], away: [95000, 130000] },
    loss: { home: [105000, 155000], away: [60000, 90000] },
  };
  const [lo, hi] = ranges[result][venue];
  let amount = rand(lo, hi);
  if (uIsHome) amount = Math.round(amount * getStadiumDef(c).matchRevMult);
  c.budget += amount;
  const resultTh = result === "win" ? "ชนะ" : result === "draw" ? "เสมอ" : "แพ้";
  const stadiumNote = uIsHome && getStadiumLevel(c) > 1 ? ` · สนาม Lv.${getStadiumLevel(c)}` : "";
  c.log = [`💰 รายได้แมตช์ (${uIsHome ? "เหย้า" : "เยือน"}, ${resultTh}): +${formatMoney(amount)}${stadiumNote}`, ...c.log];
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
  const facilitiesValue = facilitiesAssetValue(career.facilities) + stadiumAssetValue(career);
  const coachesValue = staffAssetValue(career.staff?.[career.userTeamId]);
  const managerValue = contractAssetValue(uTeam?.manager, 40);
  const scoutValue = contractAssetValue(career.marketScout, 30) + contractAssetValue(career.youthScout, 30);
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

/** Infer saveVersion from legacy one-off flags (pre-0.4.0 careers) */
function resolveSaveVersion(c) {
  if (c.saveVersion != null && c.saveVersion >= 0) return c.saveVersion;
  const hadScoutSplit = Boolean(c.marketScoutOffer || c.youthScout || c.marketScout || c.scoutFinds?.length);
  if (c.squadBalanceV1 && c.economyBalanceV2 && hadScoutSplit) return 3;
  if (c.squadBalanceV1 && c.economyBalanceV2) return 2;
  if (c.squadBalanceV1) return 1;
  if (c.economyBalanceV2) return 2;
  return 0;
}

/** v1 — squad template balance */
function migrateSaveV0ToV1(c) {
  if (!c.squadBalanceV1) {
    c.teams.forEach((t) => topUpTeamSquad(c.players, t.id, t.tier, c.day || 1, c.legendLeagueId || "thailand", c.teams));
    c.teams.forEach((t) => { c.lineups[t.id] = getBestXI(c.players.filter((p) => p.teamId === t.id), t.formation); });
    c.squadBalanceV1 = true;
  }
  return c;
}

/** v2 — economy / fans / sponsor */
function migrateSaveV1ToV2(c) {
  if (!c.economyBalanceV2) {
    c.players.forEach((p) => { if (p.rating) p.wage = computePlayerWage(p.rating); });
    const scaleStaff = (person) => {
      if (person?.weeklyWage) person.weeklyWage = scaleStaffDailyWage(person.weeklyWage / 0.55);
    };
    c.teams.forEach((t) => scaleStaff(t.manager));
    Object.values(c.staff || {}).forEach((teamStaff) => Object.values(teamStaff).forEach(scaleStaff));
    scaleStaff(c.scout);
    scaleStaff(c.marketScout);
    scaleStaff(c.youthScout);
    scaleStaff(c.academyManager);
    c.economyBalanceV2 = true;
  }
  if (c.fanBase == null) c.fanBase = 2500;
  if (c.sponsorTier == null) c.sponsorTier = qualifySponsorTier(c.fanBase);
  if (c.badSeasonStreak == null) c.badSeasonStreak = 0;
  if (c.lastSeasonSnapshot === undefined) c.lastSeasonSnapshot = null;
  if (c.fanDeltaToday == null) c.fanDeltaToday = 0;
  if (!c.monthlyGoals) c.monthlyGoals = {};
  if (!c.monthlyApps) c.monthlyApps = {};
  c.players?.forEach((p) => { if (p.seasonGoals == null) p.seasonGoals = 0; });
  autoUpgradeSponsor(c);
  return c;
}

/** v3 — market vs youth scout split */
function migrateSaveV2ToV3(c) {
  if (c.scout && !c.youthScout && !c.marketScout) {
    c.youthScout = c.scout;
    delete c.scout;
  }
  if (c.scoutOffer && !c.youthScoutOffer && !c.marketScoutOffer) {
    c.youthScoutOffer = c.scoutOffer;
    c.marketScoutOffer = genScout();
    delete c.scoutOffer;
  }
  if (!c.marketScoutOffer) c.marketScoutOffer = genScout();
  if (!c.youthScoutOffer) c.youthScoutOffer = genScout();
  if (c.scoutRerollCount != null && c.youthScoutRerollCount == null) {
    c.youthScoutRerollCount = c.scoutRerollCount;
    delete c.scoutRerollCount;
  }
  if (c.marketScoutRerollCount == null) c.marketScoutRerollCount = 0;
  if (c.youthScoutRerollCount == null) c.youthScoutRerollCount = 0;
  if (!c.scoutFinds) c.scoutFinds = [];
  if (c.scoutSearchDay == null) c.scoutSearchDay = 0;
  return c;
}

/** v4 — squad own tab, legend rules, UI prefs; drop legacy flags */
function migrateSaveV3ToV4(c) {
  if (!c.uiPrefs) c.uiPrefs = {};
  if (c.uiPrefs.marketSub === "squad") c.uiPrefs.marketSub = "trade";
  if (!c.uiPrefs.marketSub) c.uiPrefs.marketSub = "trade";
  c.squadOwnTab = true;
  delete c.economyBalanceV2;
  delete c.squadBalanceV1;
  return c;
}

/** v5 — staff card gacha: ตู้หยอด (machineCoins), ซอง Platinum, bag, daily free draws */
function migrateSaveV4ToV5(c) {
  const init = defaultStaffCardState(c.day || 1);
  if (c.machineCoins == null) c.machineCoins = init.machineCoins;
  if (c.staffPlatinumPacks == null) c.staffPlatinumPacks = init.staffPlatinumPacks;
  if (c.staffFreeDrawResetDay == null) c.staffFreeDrawResetDay = init.staffFreeDrawResetDay;
  if (!c.staffCardBag) c.staffCardBag = init.staffCardBag;
  if (c.lastStaffPull == null) c.lastStaffPull = null;
  return c;
}

/** v6 — player nationality + Latin-script names (Thai romanized) */
function migrateSaveV5ToV6(c) {
  const ctx = natCtx(c);
  const touchPlayer = (p) => {
    const leg = p.legendId ? getLegendById(p.legendId) : null;
    ensurePlayerNationality(p, { ...ctx, legendDef: leg });
  };
  (c.players || []).forEach(touchPlayer);
  (c.academyPlayers || []).forEach(touchPlayer);
  (c.youthProspects || []).forEach(touchPlayer);
  (c.transferList || []).forEach(touchPlayer);
  (c.scoutFinds || []).forEach((f) => {
    if (!f.nationality) f.nationality = pickNationality(c.legendLeagueId || "thailand");
    if (!f.name || /[\u0E00-\u0E7F]/.test(f.name)) f.name = genPlayerName(f.nationality);
  });
  return c;
}

/** v7 — wage economy rebalance (lower daily wages, reserve discount, higher passive income) */
function migrateSaveV6ToV7(c) {
  if (!c.economyBalanceV3) {
    const staffScale = STAFF_WAGE_SCALE / 0.55;
    const rescaleStaff = (person) => {
      if (person?.weeklyWage) person.weeklyWage = Math.max(400, Math.round(person.weeklyWage * staffScale / 500) * 500);
    };
    (c.players || []).forEach((p) => { if (p.rating) p.wage = computePlayerWage(p.rating); });
    (c.academyPlayers || []).forEach((p) => { if (p.rating) p.wage = computePlayerWage(p.rating); });
    (c.transferList || []).forEach((p) => { if (p.rating) p.wage = computePlayerWage(p.rating); });
    c.teams?.forEach((t) => rescaleStaff(t.manager));
    Object.values(c.staff || {}).forEach((teamStaff) => Object.values(teamStaff || {}).forEach(rescaleStaff));
    rescaleStaff(c.marketScout);
    rescaleStaff(c.youthScout);
    rescaleStaff(c.academyManager);
    (c.staffCardBag || []).forEach((card) => rescaleStaff(card));
    c.economyBalanceV3 = true;
    c.log = [`💰 ปรับสมดุลค่าเหนื่อย — ลดค่าใช้จ่ายรายวัน ตัวสำรองจ่ายน้อยกว่าตัวจริง`, ...c.log];
  }
  return c;
}

/** v8 — star-tier wage scaling (1–4★ ค่าเหนื่อยต่ำ) */
function migrateSaveV7ToV8(c) {
  if (!c.economyStarWagesV8) {
    const touch = (p) => { if (p?.rating) p.wage = computePlayerWage(p.rating); };
    (c.players || []).forEach(touch);
    (c.academyPlayers || []).forEach(touch);
    (c.transferList || []).forEach(touch);
    (c.scoutFinds || []).forEach((f) => { if (f.rating) f.buyWage = Math.max(100, Math.round(computePlayerWage(f.rating) * 0.72 / 100) * 100); });
    c.economyStarWagesV8 = true;
    c.log = [`⭐ ปรับค่าเหนื่อยตามดาว — 1–4★ จ่ายต่ำลง 5★+ ใกล้เคียงเรตจริง`, ...c.log];
  }
  return c;
}

/** v9 — stadium, board, extra staff in-game effects */
function migrateSaveV8ToV9(c) {
  if (!c.clubSystemsV9) {
    c.stadiumLevel = c.stadiumLevel ?? 1;
    const uT = c.teams?.find((t) => t.id === c.userTeamId);
    if (!c.board && uT) initBoard(c, uT);
    c.clubSystemsV9 = true;
    c.log = [`🏟️ ระบบสนาม · บอร์ด · สตาฟสนับสนุน — มีผลในเกมแล้ว`, ...c.log];
  }
  return c;
}

/** v10 — training reports + Analyst training recommendations */
function migrateSaveV9ToV10(c) {
  if (!c.trainingReports) c.trainingReports = [];
  return c;
}

/** v11 — full master league rosters (8 legend leagues) */
function migrateSaveV10ToV11(c) {
  if (c.fullRosterDB) return c;
  return refreshFullRosterMasterLeagues(c);
}

/** v12 — Tier A/B roadmap features */
function migrateSaveV11ToV12(c) {
  if (c.roadmapV12) return c;
  ensureRoadmapFields(c);
  (c.players || []).forEach(enrichPlayerContract);
  return c;
}

const SAVE_MIGRATIONS = [
  migrateSaveV0ToV1,
  migrateSaveV1ToV2,
  migrateSaveV2ToV3,
  migrateSaveV3ToV4,
  migrateSaveV4ToV5,
  migrateSaveV5ToV6,
  migrateSaveV6ToV7,
  migrateSaveV7ToV8,
  migrateSaveV8ToV9,
  migrateSaveV9ToV10,
  migrateSaveV10ToV11,
  migrateSaveV11ToV12,
];

function normalizeCareerSave(c) {
  if (c.playMode == null) c.playMode = c.onlineUnlocked ? "online" : "sandbox";
  if (c.onlineUnlocked == null) c.onlineUnlocked = false;
  const hasOldMaster = c.teams?.some((t) => t.division === 0 && /^m\d+$/.test(t.id));
  if (!c.legendLeagueId || hasOldMaster) c = installLegendMasterLeague(c, c.legendLeagueId || "england");
  // เซฟเก่าบางฉบับเคยมีทีมผู้ใช้ซ้ำในลิสต์ (บั๊กใน installLegendMasterLeague ที่แก้แล้ว) — ล้างทิ้งอัตโนมัติ เก็บตัวแรกไว้
  if (Array.isArray(c.teams)) {
    const seen = new Set();
    c.teams = c.teams.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
    // เซฟเก่าก่อนแก้บั๊กกางเกงบอททุกทีมสีเดียวกัน (C.chalk ตายตัว) — คำนวณสีกางเกงใหม่ให้ตัดกับสีเสื้อจริง
    c.teams.forEach((t) => {
      if (!t.isUser && !t.shortsColor && t.secondaryColor === C.chalk) t.secondaryColor = botSecondaryColor(t.color);
    });
  }
  if (!c.legendOwnership) c.legendOwnership = initLegendOwnership(c.legendLeagueId, c.teams, c.players);
  // เซฟเก่าก่อนแก้บั๊กสเตตนักเตะจุดทศนิยมยาว (float drift จากการบวกทีละนิดหลายรอบตอนซ้อม) — ปัดเหลือ 1 ตำแหน่งทศนิยม
  (c.players || []).forEach((p) => {
    if (!p.attrs) return;
    Object.keys(p.attrs).forEach((k) => { p.attrs[k] = Math.round(p.attrs[k] * 10) / 10; });
  });
  if (c.globalFanbase == null) c.globalFanbase = 0;
  if (c.ownerXp == null) c.ownerXp = 0;
  if (!Array.isArray(c.constructionQueue)) c.constructionQueue = [];
  processConstructionQueue(c); // ปิดคิวที่ครบเวลาไปแล้วระหว่างที่ปิดแอป
  if (c.pendingLeaguePick == null) c.pendingLeaguePick = false;
  c.matchPrep = { ...defaultMatchPrep(), ...(c.matchPrep || {}) };
  // เซฟเก่าอาจมีคำสั่ง higher_line/deeper ค้างอยู่ — ย้ายไประบบแนวรับ (defLine) แล้วลบทิ้ง
  const validIns = MATCH_INSTRUCTIONS.map((i) => i.id);
  if ((c.matchPrep.instructions || []).some((i) => !validIns.includes(i))) {
    if (c.matchPrep.instructions.includes("higher_line")) c.matchPrep.defLine = "high";
    if (c.matchPrep.instructions.includes("deeper")) c.matchPrep.defLine = "deep";
    c.matchPrep.instructions = c.matchPrep.instructions.filter((i) => validIns.includes(i));
  }
  if (!c.tacticFamiliarity) {
    const uT = c.teams?.find((t) => t.id === c.userTeamId);
    c.tacticFamiliarity = { formation: uT?.formation || DEFAULT_FORMATION, matches: 0 };
  }
  if (!c.individualFocus) c.individualFocus = {};
  if (c.trainingCampCooldownDay == null) c.trainingCampCooldownDay = 0;
  if (!c.drillPlans) c.drillPlans = defaultDrillPlans();
  if (!c.drillDoneDay) c.drillDoneDay = {};
  // เซฟเก่าก่อนมีระบบใบเหลืองสะสม/แบน — เติม default ย้อนหลังให้ครบ
  (c.players || []).forEach((p) => {
    if (p.seasonYellows == null) p.seasonYellows = 0;
    if (p.suspendedMatches == null) p.suspendedMatches = 0;
    if (!p.personality) p.personality = rollPlayerPersonality();
  });
  // ตำแหน่งละเอียดแบบ FM — แจกให้นักเตะทุกคนในเซฟเก่าที่ยังไม่มี (จากสเตตเด่น)
  (c.players || []).forEach(ensureDetailedPos);
  (c.academyPlayers || []).forEach(ensureDetailedPos);
  (c.youthProspects || []).forEach(ensureDetailedPos);
  (c.transferList || []).forEach(ensureDetailedPos);
  (c.scoutFinds || []).forEach(ensureDetailedPos);
  const natContext = natCtx(c);
  const ensureNat = (p) => ensurePlayerNationality(p, { ...natContext, legendDef: p.legendId ? getLegendById(p.legendId) : null });
  (c.players || []).forEach(ensureNat);
  (c.academyPlayers || []).forEach(ensureNat);
  (c.youthProspects || []).forEach(ensureNat);
  (c.transferList || []).forEach(ensureNat);
  (c.scoutFinds || []).forEach((f) => {
    if (!f.nationality) f.nationality = pickNationality(c.legendLeagueId || "thailand");
  });
  if (!c.trophyCabinet) c.trophyCabinet = [];
  if (!c.seasonHistory) c.seasonHistory = [];
  if (!c.lineupSlots) c.lineupSlots = {};
  if (!c.benchLineups) c.benchLineups = {};
  const uT = c.teams?.find((t) => t.id === c.userTeamId);
  if (uT) {
    const sq = (c.players || []).filter((p) => p.teamId === c.userTeamId);
    const xi = c.lineups?.[c.userTeamId] || [];
    if (!c.benchLineups[c.userTeamId]?.length && sq.length > xi.length) {
      initBenchFromSquad(c, sq, xi);
    } else {
      resolveBenchLineup(c, sq, xi);
    }
  }
  if (c.leagues?.[0]) c.leagues[0].name = `Master · ${legendLeagueLabel(c.legendLeagueId)}`;
  (c.teams || []).forEach((t) => {
    if (t.primaryColor && !t.color) t.color = t.primaryColor;
    if (t.logoIndex == null || t.logoIndex === "") {
      const seed = t.legendTeamKey || t.id || t.short || "team";
      t.logoIndex = Math.abs([...String(seed)].reduce((h, ch) => ((h << 5) - h + ch.charCodeAt(0)) | 0, 0)) % LOGO_ICONS.length;
    }
    if (t.manager && !t.manager.trait) t.manager.trait = highestManagerStat(t.manager.stats);
  });
  ensureStaffCardFields(c); // เซฟเก่าก่อนมีระบบภาพเหมือนการ์ดสตาฟ — เติม portrait ย้อนหลังให้ครบทุกใบ
  Object.values(c.staff || {}).forEach((teamStaff) => {
    ["GK", "DF", "MF", "FW", "FITNESS"].forEach((spec) => {
      if (teamStaff[spec]) teamStaff[spec] = ensureCoachProfile(teamStaff[spec], spec);
    });
  });
  if (Array.isArray(c.staffCardBag)) {
    c.staffCardBag = c.staffCardBag.map((card) => (card.type === "COACH" ? ensureCoachProfile(card, card.specialty) : card));
  }
  if (c.stadiumLevel == null) c.stadiumLevel = 1;
  if (!c.board && uT) initBoard(c, uT);
  if (!c.trainingReports) c.trainingReports = [];
  if (!c.worldNews) c.worldNews = [];
  if (BETA_TEST) applyBetaCareerGrant(c);
  ensureRoadmapFields(c);
  return c;
}

const BETA_PACK_ID = "betaPack2026";

function applyBetaProfileGrant(p) {
  if (!BETA_TEST || !p || p[BETA_PACK_ID]) return p;
  p.sockerCoins = Math.max(p.sockerCoins || 0, BETA_STARTER_MASTER_COINS);
  p[BETA_PACK_ID] = true;
  return p;
}

function applyBetaCareerGrant(c) {
  if (!BETA_TEST || !c || c[BETA_PACK_ID]) return c;
  c.budget = Math.max(c.budget || 0, BETA_STARTING_BUDGET);
  const uT = c.teams?.find((t) => t.id === c.userTeamId);
  if (uT) uT.budget = Math.max(uT.budget || 0, BETA_STARTING_BUDGET);
  c[BETA_PACK_ID] = true;
  c.log = [`🎁 Beta Test — งบสโมสร ${formatMoney(BETA_STARTING_BUDGET)} · Master Coin ${BETA_STARTER_MASTER_COINS}`, ...(c.log || [])];
  return c;
}

function migrateCareerSave(c) {
  let v = resolveSaveVersion(c);
  while (v < SAVE_VERSION && v < SAVE_MIGRATIONS.length) {
    c = SAVE_MIGRATIONS[v](c);
    v += 1;
    c.saveVersion = v;
  }
  c.saveVersion = SAVE_VERSION;
  c.gameVersion = GAME_VERSION;
  c = normalizeCareerSave(c);
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

/* เลือก 11 ตัวที่ดีที่สุดแบบรู้ตำแหน่งละเอียด — จับคู่ทีละช่องด้วย rating×ฟอร์ม×ความคุ้นเคยตำแหน่ง */
function getBestXI(squad, formationKey, { excludeInjured = true } = {}) {
  const slotDefs = FORMATIONS[resolveFormation(formationKey)].slots;
  const pool = squad.filter((p) => !excludeInjured || (p.injuryDays <= 0 && (p.suspendedMatches || 0) <= 0));
  const assigned = new Set();
  const xi = [];
  slotDefs.forEach((slot) => {
    let best = null, bestScore = -1;
    pool.forEach((p) => {
      if (assigned.has(p.id)) return;
      const fam = p.pos ? playerSlotFamiliarity(p, slot.dpos) : (p.position === slot.pos ? 1 : 0.55);
      const score = p.rating * (p.stamina / 100 * 0.3 + 0.7) * fam;
      if (score > bestScore) { bestScore = score; best = p; }
    });
    if (best) { assigned.add(best.id); xi.push(best.id); }
  });
  return xi;
}

function topUpTeamSquad(players, teamId, tier, day, leagueId = "thailand", teams) {
  const squad = players.filter((p) => p.teamId === teamId);
  const have = { GK: 0, DF: 0, MF: 0, FW: 0 };
  squad.forEach((p) => { if (have[p.position] != null) have[p.position] += 1; });
  const added = [];
  const opts = { leagueId, teams };
  Object.keys(SQUAD_POSITION_TARGET).forEach((pos) => {
    while (have[pos] < SQUAD_POSITION_TARGET[pos]) {
      const p = genPlayer(pos, tier, teamId, rand(16, 22), day, opts);
      players.push(p);
      added.push(p);
      have[pos] += 1;
    }
  });
  return added;
}

function resolveTeamXI(team, squad, savedLineup) {
  const avail = squad.filter((p) => p.injuryDays <= 0 && (p.suspendedMatches || 0) <= 0);
  let xi;
  if (team.isUser && !team.autoMode && savedLineup?.length) {
    xi = fillLineupGaps(avail, savedLineup.filter((id) => avail.some((p) => p.id === id)), team.formation);
  } else {
    if (team.isUser && team.autoMode) team.formation = recommendFormation(team, avail);
    xi = getBestXI(avail, team.formation);
  }
  return { xi, canPlay: xi.length >= MIN_XI_SIZE, available: avail.length };
}

function recommendFormation(team, squad) {
  const avail = squad.filter((p) => p.injuryDays <= 0 && (p.suspendedMatches || 0) <= 0);
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
  const avail = squad.filter((p) => p.injuryDays <= 0 && (p.suspendedMatches || 0) <= 0);
  const counts = FORMATIONS[resolveFormation(formation)].counts;
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

/* ---------- slot-ordered lineup (กระดานจัดทีมแบบลากวาง) ---------- */
/* แปลง xi (array id) → slots array ยาวเท่ากับ slots ของแผน (id หรือ null ต่อช่อง) โดยจับตาม natural position */
function xiToSlots(squad, xiIds, formationKey) {
  const slotDefs = FORMATIONS[resolveFormation(formationKey)].slots;
  const remaining = (xiIds || []).map((id) => squad.find((x) => x.id === id)).filter(Boolean);
  const res = slotDefs.map(() => null);
  // รอบแรก: จับช่องที่ตรงตำแหน่งละเอียดเป๊ะก่อน
  slotDefs.forEach((slot, i) => {
    const idx = remaining.findIndex((p) => (p.pos || p.position) === slot.dpos);
    if (idx >= 0) res[i] = remaining.splice(idx, 1)[0].id;
  });
  // รอบสอง: ที่เหลือลงช่องว่างที่คุ้นเคยที่สุด
  slotDefs.forEach((slot, i) => {
    if (res[i] || !remaining.length) return;
    let bi = 0, bs = -1;
    remaining.forEach((p, j) => {
      const s = playerSlotFamiliarity(p, slot.dpos) * p.rating;
      if (s > bs) { bs = s; bi = j; }
    });
    res[i] = remaining.splice(bi, 1)[0].id;
  });
  return res;
}

/* อ่าน lineupSlots ของทีมผู้เล่น — ถ้าไม่มี/ไม่ตรงกับ lineups ปัจจุบัน (เช่นเพิ่งเปลี่ยนแผน,
   ออโต้จัดใหม่, ขายนักเตะ) จะสร้างใหม่จาก xi โดยอัตโนมัติ */
function resolveLineupSlots(c, squad, formationKey) {
  const slotDefs = FORMATIONS[resolveFormation(formationKey)].slots;
  const xi = c.lineups?.[c.userTeamId] || [];
  const saved = c.lineupSlots?.[c.userTeamId];
  if (Array.isArray(saved) && saved.length === slotDefs.length) {
    const savedIds = saved.filter(Boolean);
    const sameSet = savedIds.length === xi.length && savedIds.every((id) => xi.includes(id));
    if (sameSet) return [...saved];
  }
  return xiToSlots(squad, xi, formationKey);
}

function normalizeBenchSlots(c, squad, xiIds) {
  const teamId = c.userTeamId;
  const xiSet = new Set(xiIds);
  const raw = c.benchLineups?.[teamId];
  const list = Array.isArray(raw) ? raw : [];
  return Array.from({ length: MATCH_BENCH_SIZE }, (_, i) => {
    const id = list[i] || null;
    if (!id || xiSet.has(id) || !squad.some((p) => p.id === id)) return null;
    return id;
  });
}

function getBenchLineup(c, squad, xiIds) {
  return normalizeBenchSlots(c, squad, xiIds).filter(Boolean);
}

function resolveBenchLineup(c, squad, xiIds) {
  if (!c.benchLineups) c.benchLineups = {};
  c.benchLineups[c.userTeamId] = normalizeBenchSlots(c, squad, xiIds);
  return c.benchLineups[c.userTeamId].filter(Boolean);
}

function registerNewSquadPlayer(c, playerId) {
  if (!playerId) return;
  if (!c.benchLineups) c.benchLineups = {};
  const squad = c.players.filter((p) => p.teamId === c.userTeamId);
  const p = squad.find((x) => x.id === playerId);
  if (!p) return;
  ensureDetailedPos(p);
  const xi = c.lineups?.[c.userTeamId] || [];
  if (xi.includes(playerId)) return;
  const slots = normalizeBenchSlots(c, squad, xi);
  if (slots.includes(playerId)) return;
  const emptyIdx = slots.findIndex((id) => !id);
  if (emptyIdx >= 0) slots[emptyIdx] = playerId;
  else slots[MATCH_BENCH_SIZE - 1] = playerId;
  c.benchLineups[c.userTeamId] = slots;
  c.newSquadPlayerId = playerId;
}

function removePlayerFromLineups(c, playerId) {
  const tid = c.userTeamId;
  if (c.lineups?.[tid]) c.lineups[tid] = c.lineups[tid].filter((id) => id !== playerId);
  if (c.lineupSlots?.[tid]) {
    c.lineupSlots[tid] = c.lineupSlots[tid].map((id) => (id === playerId ? null : id));
    c.lineups[tid] = c.lineupSlots[tid].filter(Boolean);
  }
  if (c.benchLineups?.[tid]) c.benchLineups[tid] = c.benchLineups[tid].filter((id) => id !== playerId);
}

function initBenchFromSquad(c, squad, xiIds) {
  if (!c.benchLineups) c.benchLineups = {};
  const xiSet = new Set(xiIds);
  const posOrder = { GK: 0, DF: 1, MF: 2, FW: 3 };
  const picks = squad.filter((p) => !xiSet.has(p.id))
    .sort((a, b) => (posOrder[a.position] - posOrder[b.position]) || b.rating - a.rating)
    .slice(0, MATCH_BENCH_SIZE)
    .map((p) => p.id);
  c.benchLineups[c.userTeamId] = Array.from({ length: MATCH_BENCH_SIZE }, (_, i) => picks[i] || null);
  return picks;
}

/* map playerId → ตำแหน่งช่องละเอียดบนสนามจริง (สำหรับคำนวณโทษ out-of-position) — null ถ้าไม่มีข้อมูล */
function userSlotAssignMap(c) {
  const uT = c.teams?.find((t) => t.id === c.userTeamId);
  if (!uT) return null;
  const slotDefs = FORMATIONS[resolveFormation(uT.formation)].slots;
  const saved = c.lineupSlots?.[c.userTeamId];
  if (!Array.isArray(saved) || saved.length !== slotDefs.length) return null;
  const map = {};
  saved.forEach((id, i) => { if (id) map[id] = slotDefs[i].dpos; });
  return map;
}

function getManagerMatchAdvice(team, squad, xi, opponentTeam, oppSquad, isHome) {
  const mp = managerPlanProfile(team);
  const avail = squad.filter((p) => p.injuryDays <= 0);
  const recommendedFormation = recommendFormation(team, avail);
  const tips = [];
  if (mp.stars >= 3) {
    tips.push(`${mp.name} (${mp.stars}★ · แทคติก ${mp.tactics}): แผน ${recommendedFormation} เหมาะกับสควอดตอนนี้ที่สุด`);
  } else {
    tips.push(`แผน ${recommendedFormation} เหมาะกับสควอดตอนนี้ที่สุด`);
  }
  if (team.manager?.preferredFormation === recommendedFormation) {
    tips.push(`ตรงกับสไตล์ผจก. (${team.manager.preferredFormation})`);
  }
  const injured = squad.filter((p) => p.injuryDays > 0);
  if (injured.length) tips.push(`บาดเจ็บ: ${injured.slice(0, 3).map((p) => p.name).join(", ")}${injured.length > 3 ? ` +${injured.length - 3}` : ""}`);
  const fieldable = fillLineupGaps(avail, xi.filter((id) => avail.some((p) => p.id === id)), team.formation);
  if (fieldable.length < MIN_XI_SIZE) tips.push(`⚠️ ลงแข่งไม่ได้ — มีผู้เล่นพร้อมเพียง ${fieldable.length}/11 คน`);
  const inXi = xi.filter((id) => avail.some((p) => p.id === id));
  const tired = inXi.map((id) => avail.find((p) => p.id === id)).filter((p) => p && p.stamina < 50);
  if (tired.length) tips.push(`${tired[0].name} สตามินา ${Math.round(tired[0].stamina)}% — พิจารณาพัก`);
  if (opponentTeam && oppSquad?.length) {
    const oppAvail = oppSquad.filter((p) => p.injuryDays <= 0);
    const oppXI = getBestXI(oppAvail, opponentTeam.formation);
    const { attack: oa } = teamAttackDefense(oppAvail, oppXI);
    const { attack: ua } = teamAttackDefense(avail, inXi.length ? inXi : getBestXI(avail, team.formation));
    if (mp.tactics >= 55) {
      const mm = matchupMultiplier(team.formation, opponentTeam.formation);
      if (mm > 1.03) tips.push(`${mp.name}: แผน ${team.formation} ได้เปรียบแนว ${opponentTeam.formation}`);
      else if (mm < 0.97) tips.push(`${mp.name}: แผนเราเสียเปรียบ — ลอง ${recommendedFormation}`);
    }
    tips.push(oa > ua + 8
      ? "คู่แข่งบุกแรง — พิจารณาแผนรับหรือผู้เล่นสกัดดี"
      : oa > ua + 3
        ? "คู่แข่งมีเกมรุกดี — อย่าประมาท"
        : "สู้ได้สูสี — จัดทีมตามจุดแข็งของเรา");
    if (mp.scouting >= 58 && mp.insight >= 0.6) {
      const threat = oppAvail.filter((p) => oppXI.includes(p.id)).sort((a, b) => b.attack - a.attack)[0];
      if (threat) tips.push(`${mp.name} ชี้เป้า: ระวัง ${threat.name} (ATK ${threat.attack}) — พิจารณาประกบ`);
    }
  }
  if (mp.tactics >= 68) {
    tips.push(`${mp.name}: ส่งแผนลงสนามได้เต็มประสิทธิภาพ (+${Math.round((mp.prepMult - 1) * 100)}%)`);
  } else if (mp.tactics < 42) {
    tips.push(`ผจก.ยังไม่ชำนาญแทคติก (สเตต ${mp.tactics}) — คำแนะนำอาจไม่ละเอียด`);
  }
  tips.push(isHome ? "เล่นในบ้าน — ได้เปรียบเล็กน้อย" : "เล่นนอกบ้าน — ระวังเกมรับ");
  return { recommendedFormation, tips, managerPlan: mp };
}

/* ---------- pre-match scout & plan (FM-style) ---------- */
const MATCH_MENTALITIES = [
  { id: "very_defensive", label: "รับมาก", atk: 0.82, def: 1.12 },
  { id: "defensive", label: "รับ", atk: 0.9, def: 1.06 },
  { id: "balanced", label: "สมดุล", atk: 1, def: 1 },
  { id: "attacking", label: "บุก", atk: 1.08, def: 0.94 },
  { id: "very_attacking", label: "บุกมาก", atk: 1.16, def: 0.86 },
];
const MATCH_INSTRUCTIONS = [
  { id: "wider", label: "กางเกม", desc: "เปิดช่องข้าง" },
  { id: "narrower", label: "บีบกลาง", desc: "แน่นกลางสนาม" },
  { id: "more_direct", label: "บอลยาว", desc: "ส่งตรงเร็ว" },
  { id: "shorter", label: "บอลสั้น", desc: "ผ่านบอลต่อเนื่อง" },
];

function buildSuggestedPrep(weaknesses, managerProfile, keyThreats) {
  const mp = managerProfile || { tactics: 40, insight: 0.5, stars: 1 };
  const w = (weaknesses || []).join(" ");
  let mentality = "balanced";
  let defLine = "normal";
  let pressing = "medium";
  const instructions = [];
  if (w.includes("แนวรับคู่แข่งไม่แข็ง") || w.includes("บุก")) {
    mentality = "attacking";
    instructions.push("wider", "more_direct");
  }
  if (w.includes("เกมรุกคู่แข่งอันตราย")) {
    mentality = "defensive";
    defLine = "deep";
  }
  if (w.includes("สตามินาต่ำ")) {
    mentality = "attacking";
    defLine = "high";
    pressing = "high";
  }
  if (w.includes("เร็ว") || w.includes("ช้า")) {
    instructions.push("wider", "more_direct");
  }
  if (w.includes("assertive") || w.includes("เหนือกว่า")) {
    mentality = mp.tactics >= 50 ? "attacking" : "balanced";
    instructions.push("wider");
  }
  /* ผจก.แทคติกต่ำ — มักเลือกแผนปลอดภัย ไม่กล้าบุก/รับสุด */
  if (mp.tactics < 45) mentality = "balanced";
  else if (mp.tactics < 55 && (mentality === "very_attacking" || mentality === "very_defensive")) {
    mentality = mentality.includes("attacking") ? "attacking" : "defensive";
  } else if (mp.tactics >= 72 && mentality === "attacking") mentality = "very_attacking";
  else if (mp.tactics >= 72 && mentality === "defensive") mentality = "very_defensive";

  const prep = {
    mentality,
    instructions: [...new Set(instructions)].slice(0, mp.tactics >= 55 ? 3 : mp.tactics >= 42 ? 2 : 1),
    defLine,
    pressing,
  };
  if (mp.tactics >= 62 && keyThreats?.[0]) prep.markPlayerId = keyThreats[0].id;
  else if (mp.tactics >= 48 && mp.stars >= 3 && keyThreats?.[0]) prep.markPlayerId = keyThreats[0].id;
  else if ((mp.markMult ?? 1) >= 1.08 && keyThreats?.[0]) prep.markPlayerId = keyThreats[0].id;
  return prep;
}

function defaultMatchPrep() {
  return {
    mentality: "balanced", instructions: [], teamTalk: null,
    tempo: "normal", pressing: "medium", defLine: "normal", creativeFreedom: "balanced",
    offsideTrap: false, markPlayerId: null,
  };
}

const TEAM_TALK_OPTIONS = [
  { id: "motivate", label: "กระตุ้นใจ", morale: [3, 6], atk: 1.02 },
  { id: "calm", label: "ใจเย็น", morale: [1, 3], atk: 1 },
  { id: "aggressive", label: "ดุดัน", morale: [-1, 2], atk: 1.06 },
  { id: "focus", label: "มีสมาธิ", morale: [2, 4], atk: 1.03, def: 1.02 },
];

/**
 * meta (ทั้งหมด optional):
 *  - team, squad, xiIds: ทีมตัวเอง — ใช้คำนวณโบนัสลูกตั้งเตะ + ความเสี่ยงกับดักล้ำหน้า (ต้องมี pace แนวรับพอ)
 *  - familiarityMult: ตัวคูณความคุ้นเคยแทคติก (ยิ่งใช้แผนเดิมต่อเนื่องยิ่งได้เปรียบ)
 */
function applyMatchPrepToContext(ctx, prep, meta) {
  if (!prep) return ctx;
  const ment = MATCH_MENTALITIES.find((m) => m.id === prep.mentality) || MATCH_MENTALITIES[2];
  let atk = ctx.effAttack * ment.atk;
  let def = ctx.effDefense * ment.def;
  const ins = prep.instructions || [];
  if (ins.includes("more_direct")) atk *= 1.04;
  if (ins.includes("shorter")) atk *= 1.02;
  if (ins.includes("wider")) atk *= 1.02;
  if (ins.includes("narrower")) def *= 1.02;

  const tempo = TEMPO_OPTIONS.find((t) => t.id === prep.tempo) || TEMPO_OPTIONS[1];
  atk *= tempo.atk; def *= tempo.def;
  const pressing = PRESSING_OPTIONS.find((t) => t.id === prep.pressing) || PRESSING_OPTIONS[1];
  atk *= pressing.atk; def *= pressing.def;
  const defLine = DEF_LINE_OPTIONS.find((t) => t.id === prep.defLine) || DEF_LINE_OPTIONS[1];
  atk *= defLine.atk; def *= defLine.def;
  const creativeFreedom = CREATIVE_FREEDOM_OPTIONS.find((t) => t.id === prep.creativeFreedom) || CREATIVE_FREEDOM_OPTIONS[1];
  atk *= creativeFreedom.atk; def *= creativeFreedom.def;

  if (meta?.squad && meta?.xiIds) {
    const ownDefenders = meta.squad.filter((p) => meta.xiIds.includes(p.id) && (p.position === "DF" || p.position === "GK"));
    const avgDefPace = ownDefenders.length ? ownDefenders.reduce((s, p) => s + (p.attrs?.pace || 10), 0) / ownDefenders.length : 10;
    def *= offsideTrapMult(prep.defLine, prep.offsideTrap, avgDefPace);
  }
  if (meta?.team && meta?.squad) atk *= setPieceBonusMult(meta.team, meta.squad);
  if (prep.markPlayerId) def *= 0.985; // ค่าใช้จ่ายเล็กน้อยจากการดึงคนไปประกบ

  if (prep.teamTalk) {
    const tt = TEAM_TALK_OPTIONS.find((t) => t.id === prep.teamTalk);
    if (tt) {
      if (tt.atk) atk *= tt.atk;
      if (tt.def) def *= tt.def;
    }
  }
  if (meta?.familiarityMult) { atk *= meta.familiarityMult; def *= meta.familiarityMult; }
  /* ผจก.แทคติกเก่ง — ส่งแผนลงสนามได้เต็มที่ (scale เฉพาะส่วนที่ prep เพิ่ม/ลด) */
  if (meta?.team) {
    const { prepMult } = managerPlanProfile(meta.team);
    const baseAtk = ctx.effAttack;
    const baseDef = ctx.effDefense;
    atk = baseAtk + (atk - baseAtk) * prepMult;
    def = baseDef + (def - baseDef) * prepMult;
  }
  return { ...ctx, effAttack: atk, effDefense: def };
}

function getTeamRecentMatchResults(c, division, teamId, max = 5) {
  const league = c.leagues[division];
  const results = [];
  for (let day = c.day - 1; day >= 1 && results.length < max; day -= 1) {
    const round = league.fixtures.find((r) => r.day === day);
    if (!round) continue;
    const m = round.matches.find((mm) => mm.played && (mm.home === teamId || mm.away === teamId));
    if (!m) continue;
    const home = c.teams.find((t) => t.id === m.home);
    const away = c.teams.find((t) => t.id === m.away);
    if (!home || !away) continue;
    results.push({
      day, home, away, homeGoals: m.homeGoals, awayGoals: m.awayGoals,
      isUser: m.home === teamId || m.away === teamId,
    });
  }
  return results;
}

function getTeamFormStrip(c, teamId, division, max = 5) {
  return getTeamRecentMatchResults(c, division, teamId, max)
    .map((r) => {
      const isHome = r.home.id === teamId;
      const gf = isHome ? r.homeGoals : r.awayGoals;
      const ga = isHome ? r.awayGoals : r.homeGoals;
      return gf > ga ? "W" : gf < ga ? "L" : "D";
    })
    .reverse();
}

const KEY_COMPARE_ATTRS = ["pace", "passing", "tackling", "finishing", "heading", "strength"];
const LINE_COMPARE_LABELS = { GK: "ผู้รักษา", DF: "แนวรับ", MF: "กลางสนาม", FW: "แนวหน้า" };

function avgFromPlayers(players, fn) {
  if (!players.length) return 0;
  return players.reduce((s, p) => s + fn(p), 0) / players.length;
}

function buildTeamStatusProfile(squad, xiIds, slotAssign, chemistry) {
  const xi = squad.filter((p) => xiIds.includes(p.id));
  const raw = teamAttackDefense(squad, xiIds, slotAssign);
  const keyAttrs = {};
  KEY_COMPARE_ATTRS.forEach((k) => {
    keyAttrs[k] = Math.round(avgFromPlayers(xi, (p) => p.attrs?.[k] || 8) * 10) / 10;
  });
  const attrs = {};
  Object.keys(ATTR_GROUPS).forEach((g) => {
    attrs[g] = Math.round(avgFromPlayers(xi, (p) => attrGroupAvg(p, g)) * 10) / 10;
  });
  return {
    avgRating: xi.length ? Math.round(avgFromPlayers(xi, (p) => p.rating)) : 0,
    attack: Math.round(raw.attack),
    defense: Math.round(raw.defense),
    avgStamina: Math.round(raw.avgStamina),
    avgMorale: Math.round(raw.avgMorale),
    chemistry: chemistry != null ? Math.round(chemistry) : null,
    xiCount: xi.length,
    attrs,
    keyAttrs,
  };
}

function buildLineComparison(squad, xiIds, slotAssign) {
  const xi = squad.filter((p) => xiIds.includes(p.id));
  const slotGroupOf = (p) => POS_GROUP[slotAssign?.[p.id]] || p.position;
  const byLine = { GK: [], DF: [], MF: [], FW: [] };
  xi.forEach((p) => {
    const g = slotGroupOf(p);
    if (byLine[g]) byLine[g].push(p);
    else byLine.MF.push(p);
  });
  const lineStats = (arr) => ({
    count: arr.length,
    avgRating: arr.length ? Math.round(avgFromPlayers(arr, (p) => p.rating)) : 0,
    avgAttack: arr.length ? Math.round(avgFromPlayers(arr, (p) => p.attack)) : 0,
    avgDefense: arr.length ? Math.round(avgFromPlayers(arr, (p) => p.defense)) : 0,
    avgStamina: arr.length ? Math.round(avgFromPlayers(arr, (p) => p.stamina)) : 0,
  });
  return { GK: lineStats(byLine.GK), DF: lineStats(byLine.DF), MF: lineStats(byLine.MF), FW: lineStats(byLine.FW) };
}

function buildAttrComparisonRows(usProfile, oppProfile) {
  const rows = [
    { key: "avgRating", label: "OVR เฉลี่ย XI", us: usProfile.avgRating, them: oppProfile.avgRating },
    { key: "attack", label: "พลังบุก", us: usProfile.attack, them: oppProfile.attack },
    { key: "defense", label: "พลังรับ", us: usProfile.defense, them: oppProfile.defense },
    { key: "stamina", label: "สตามินา XI", us: usProfile.avgStamina, them: oppProfile.avgStamina },
    { key: "morale", label: "ขวัญกำลังใจ", us: usProfile.avgMorale, them: oppProfile.avgMorale },
  ];
  if (usProfile.chemistry != null) {
    rows.push({ key: "chemistry", label: "เคมีทีม (เรา)", us: usProfile.chemistry, them: null, usOnly: true });
  }
  Object.keys(ATTR_GROUPS).forEach((g) => {
    rows.push({
      key: `grp_${g}`, label: GROUP_TH[g],
      us: Math.round(usProfile.attrs[g] * 10), them: Math.round(oppProfile.attrs[g] * 10),
    });
  });
  KEY_COMPARE_ATTRS.forEach((k) => {
    rows.push({
      key: k, label: ATTR_TH[k],
      us: Math.round(usProfile.keyAttrs[k] * 10), them: Math.round(oppProfile.keyAttrs[k] * 10),
    });
  });
  return rows;
}

function buildSlotMatchups(career, uTeam, uSquad, opponent, oppSquad) {
  const slotDefs = FORMATIONS[resolveFormation(uTeam.formation)].slots;
  const usSlots = resolveLineupSlots(career, uSquad, uTeam.formation);
  const oppAvail = oppSquad.filter((p) => p.injuryDays <= 0);
  const oppXI = getBestXI(oppAvail, opponent.formation);
  const oppSlots = xiToSlots(oppAvail, oppXI, opponent.formation);
  return slotDefs.map((slot, i) => {
    const usP = usSlots[i] ? uSquad.find((p) => p.id === usSlots[i]) : null;
    const oppP = oppSlots[i] ? oppAvail.find((p) => p.id === oppSlots[i]) : null;
    let edge = "even";
    if (usP && oppP) {
      const usScore = usP.rating * (usP.stamina / 100 * 0.25 + 0.75);
      const oppScore = oppP.rating * (oppP.stamina / 100 * 0.25 + 0.75);
      edge = usScore >= oppScore + 3 ? "us" : oppScore >= usScore + 3 ? "them" : "even";
    } else if (usP && !oppP) edge = "us";
    else if (!usP && oppP) edge = "them";
    return {
      slot: slot.dpos,
      slotLabel: DPOS_TH[slot.dpos] || slot.dpos,
      us: usP, opp: oppP, edge,
    };
  });
}

function buildLineupSuggestions(career, uTeam, uSquad, opponent, oppSquad, xi, userProfile, oppProfile, managerProfile) {
  const mp = managerProfile || managerPlanProfile(uTeam);
  const maxTips = clamp(Math.round(1 + mp.insight * 4), 1, 5);
  const suggestions = [];
  const avail = uSquad.filter((p) => p.injuryDays <= 0);
  const inXi = new Set(xi.filter((id) => avail.some((p) => p.id === id)));
  if (mp.insight >= 0.42) {
    avail.filter((p) => inXi.has(p.id) && p.stamina < 45).forEach((p) => {
      const bench = avail.filter((p2) => !inXi.has(p2.id) && p2.position === p.position && p2.stamina > 60)
        .sort((a, b) => b.rating - a.rating)[0];
      if (bench) {
        suggestions.push({
          type: "rest", player: p, replaceWith: bench,
          reason: `${mp.name}: ${p.name} เหนื่อย (${Math.round(p.stamina)}%) — ลอง ${bench.name}`,
        });
      }
    });
  }
  if (mp.insight >= 0.55 && oppProfile.defense < 72) {
    const fast = avail.filter((p) => !inXi.has(p.id) && (p.attrs?.pace || 0) >= 14 && (p.position === "FW" || p.position === "MF"))
      .sort((a, b) => b.rating - a.rating)[0];
    if (fast) suggestions.push({ type: "start", player: fast, reason: `${mp.name}: แนวรับคู่แข่งอ่อน — ${fast.name} เร็ว ควรออกสตาร์ท` });
  }
  if (mp.insight >= 0.48 && oppProfile.attack > userProfile.attack + 5) {
    const tackler = avail.filter((p) => !inXi.has(p.id) && (p.attrs?.tackling || 0) >= 13)
      .sort((a, b) => b.defense - a.defense)[0];
    if (tackler) suggestions.push({ type: "start", player: tackler, reason: `${mp.name}: คู่แข่งบุกแรง — ${tackler.name} สกัดดี ควรลง` });
  }
  if (mp.tactics >= 50 && mp.insight >= 0.52) {
    const rec = recommendFormation(uTeam, avail);
    if (rec !== uTeam.formation) {
      suggestions.push({ type: "formation", formation: rec, reason: `${mp.name} แนะนำเปลี่ยนเป็น ${rec} กับคู่แข่งนี้` });
    }
  }
  return suggestions.slice(0, maxTips);
}

function detectScoutWeaknesses(uAvail, filledXI, oppAvail, oppXI, oppRaw, usRaw, insight) {
  const found = [];
  const tryAdd = (condition, text, minInsight) => {
    if (condition && insight >= minInsight) found.push(text);
  };
  tryAdd(oppRaw.defense < 70, "แนวรับคู่แข่งไม่แข็ง — ลองเล่นบุกหรือกางเกม", 0.45);
  tryAdd(oppRaw.attack > usRaw.attack + 5, "เกมรุกคู่แข่งอันตราย — พิจารณารับหรือแนวรับลึก", 0.40);
  tryAdd(oppAvail.some((p) => oppXI.includes(p.id) && p.stamina < 50), "คู่แข่งมีตัวหลักสตามินาต่ำ — กดตั้งแต่ต้นเกม", 0.55);
  const fast = uAvail.find((p) => filledXI.includes(p.id) && (p.attrs?.pace || 0) >= 14);
  tryAdd(oppRaw.defense < 72 && fast, `${fast?.name} เร็ว — ออกช่องข้างได้ผล`, 0.65);
  tryAdd(insight >= 0.75 && usRaw.attack > oppRaw.defense + 3, "เราเหนือกว่าเกมรุก — ลองบุกแบบ assertive", 0.75);
  if (insight >= 0.78) {
    const slowDef = oppAvail.filter((p) => oppXI.includes(p.id) && (p.attrs?.pace || 10) < 10);
    if (slowDef.length >= 2) found.push("แนวรับคู่แข่งช้า — วิ่งฝังหลังได้ผล");
  }
  const cap = insight >= 0.72 ? 3 : insight >= 0.52 ? 2 : 1;
  return found.slice(0, cap);
}

function buildMatchScoutReport(career, uTeam, opponent, uSquad, oppSquad, xi, isHome) {
  const uAvail = uSquad.filter((p) => p.injuryDays <= 0);
  const oppAvail = oppSquad.filter((p) => p.injuryDays <= 0);
  const userXI = (xi || []).filter((id) => uAvail.some((p) => p.id === id));
  const filledXI = userXI.length ? fillLineupGaps(uAvail, userXI, uTeam.formation) : getBestXI(uAvail, uTeam.formation);
  const oppXI = getBestXI(oppAvail, opponent.formation);
  const prep = career.matchPrep || defaultMatchPrep();
  const familiarityMult = familiarityMultiplier(
    career.tacticFamiliarity && career.tacticFamiliarity.formation === uTeam.formation ? career.tacticFamiliarity.matches : 0
  );

  let userCtx = buildMatchContext(uTeam, uAvail, filledXI, opponent.formation, isHome, uTeam.chemistry, userSlotAssignMap(career));
  let oppCtx = buildMatchContext(opponent, oppAvail, oppXI, uTeam.formation, !isHome, opponent.chemistry);
  const managerPlan = enrichedManagerPlan(career, uTeam);
  userCtx = applyMatchPrepToContext(userCtx, prep, { team: uTeam, squad: uAvail, xiIds: filledXI, familiarityMult });
  oppCtx = applyOppositionMarkToContext(oppCtx, prep.markPlayerId, oppAvail, oppXI, managerPlan.markMult);

  const { xgHome, xgAway } = expectedGoalsFull(isHome ? userCtx : oppCtx, isHome ? oppCtx : userCtx);
  const xgUs = isHome ? xgHome : xgAway;
  const xgThem = isHome ? xgAway : xgHome;
  const mm = matchupMultiplier(uTeam.formation, opponent.formation);
  const matchupLabel = mm > 1.03 ? "แผนได้เปรียบ" : mm < 0.97 ? "แผนเสียเปรียบ" : "แผนสูสี";

  const usRaw = teamAttackDefense(uAvail, filledXI);
  const oppRaw = teamAttackDefense(oppAvail, oppXI);
  const keyThreats = oppAvail.filter((p) => oppXI.includes(p.id)).sort((a, b) => b.rating - a.rating).slice(0, 3);
  const oppRosterStars = [...oppAvail].sort((a, b) => b.rating - a.rating).slice(0, 5);
  const oppStandings = standingsForDivision(career, opponent.division);
  const oppPos = oppStandings.findIndex((s) => s.team.id === opponent.id) + 1;

  const staffBonuses = staffSupportBonuses(career, uTeam.id);
  const scoutInsight = managerPlan.insight + (staffBonuses.scoutInsightBonus || 0);
  const weaknesses = detectScoutWeaknesses(uAvail, filledXI, oppAvail, oppXI, oppRaw, usRaw, scoutInsight);
  const advice = getManagerMatchAdvice(uTeam, uAvail, filledXI, opponent, oppSquad, isHome);
  const winChance = clamp(50 + (xgUs - xgThem) * 14 + (isHome ? 4 : -4) + (mm - 1) * 40, 12, 88);
  const slotAssign = userSlotAssignMap(career);
  const userProfile = buildTeamStatusProfile(uAvail, filledXI, slotAssign, uTeam.chemistry);
  const oppProfile = buildTeamStatusProfile(oppAvail, oppXI, null, opponent.chemistry);
  const attrCompare = buildAttrComparisonRows(userProfile, oppProfile);
  const lineCompare = {
    us: buildLineComparison(uAvail, filledXI, slotAssign),
    them: buildLineComparison(oppAvail, oppXI, null),
  };
  const slotMatchups = buildSlotMatchups(career, uTeam, uAvail, opponent, oppSquad);
  const lineupSuggestions = buildLineupSuggestions(career, uTeam, uSquad, opponent, oppSquad, xi, userProfile, oppProfile, managerPlan);

  return {
    userAtk: Math.round(userCtx.effAttack),
    userDef: Math.round(userCtx.effDefense),
    oppAtk: Math.round(oppCtx.effAttack),
    oppDef: Math.round(oppCtx.effDefense),
    avgStamina: Math.round(usRaw.avgStamina),
    oppAvgStamina: Math.round(oppRaw.avgStamina),
    xgUs, xgThem, matchupLabel, winChance,
    keyThreats, oppRosterStars, weaknesses: weaknesses.slice(0, 2),
    userForm: getTeamFormStrip(career, uTeam.id, uTeam.division),
    oppForm: getTeamFormStrip(career, opponent.id, opponent.division),
    oppPos, oppFormation: opponent.formation, userFormation: uTeam.formation,
    tips: advice.tips, recommendedFormation: advice.recommendedFormation,
    xiCount: filledXI.length,
    suggestedPrep: buildSuggestedPrep(weaknesses.slice(0, 2), managerPlan, keyThreats),
    oppXIList: oppAvail.filter((p) => oppXI.includes(p.id)),
    familiarityMatches: career.tacticFamiliarity && career.tacticFamiliarity.formation === uTeam.formation ? career.tacticFamiliarity.matches : 0,
    familiarityMult,
    opponentShort: opponent.short,
    isHome,
    userProfile, oppProfile, attrCompare, lineCompare, slotMatchups, lineupSuggestions,
    managerPlan,
  };
}

function FormStrip({ form, label }) {
  const colors = { W: C.good, D: C.amber, L: C.crimson };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {label && <span style={{ fontSize: 9, color: C.textDim, minWidth: 52 }}>{label}</span>}
      <div style={{ display: "flex", gap: 3 }}>
        {form.length === 0
          ? <span style={{ fontSize: 9, color: C.textDim }}>ยังไม่มีผล</span>
          : form.map((f, i) => (
            <span key={i} style={{ width: 18, height: 18, borderRadius: 4, background: colors[f], color: "#0a1210", fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{f}</span>
          ))}
      </div>
    </div>
  );
}

/* ============================== FM-STYLE PLAYER ROLES ============================== */
/* บทบาททั้งหมด (แบน) — ประกอบเป็นลิสต์ต่อตำแหน่งละเอียดด้านล่าง */
const ROLE_DEFS = {
  gk_standard: { id: "gk_standard", label: "โกลมาตรฐาน", desc: "เกมรับล้วน มั่นคง ไม่เสี่ยง", atkMult: 1.00, defMult: 1.00, bonusAttrs: ["composure", "decisions"] },
  gk_sweeper: { id: "gk_sweeper", label: "สวีปเปอร์คีปเปอร์", desc: "ออกมาเคลียร์/ริเริ่มเกมไกลขึ้น เสี่ยงมากขึ้น", atkMult: 1.08, defMult: 0.94, bonusAttrs: ["passing", "decisions"] },
  df_stopper: { id: "df_stopper", label: "หลังตัวหยุดเกม", desc: "ปะทะหนักแน่น เกมรับล้วน", atkMult: 0.90, defMult: 1.10, bonusAttrs: ["tackling", "heading"] },
  df_ballplaying: { id: "df_ballplaying", label: "หลังเล่นบอล", desc: "เริ่มเกมรุกจากแนวหลัง", atkMult: 1.08, defMult: 0.96, bonusAttrs: ["passing", "vision"] },
  df_fullback: { id: "df_fullback", label: "แบ็คยืนโซน", desc: "รับเป็นหลัก เติมเกมพองาม", atkMult: 1.02, defMult: 1.02, bonusAttrs: ["tackling", "pace"] },
  df_wingback: { id: "df_wingback", label: "แบ็คบุก (Wing-Back)", desc: "ทะลุขึ้นช่วยเกมรุกทางริม", atkMult: 1.18, defMult: 0.84, bonusAttrs: ["crossing", "pace"] },
  mf_anchor: { id: "mf_anchor", label: "แองเคอร์ (คุมเกมรับ)", desc: "ยืนคุมหน้ากองหลัง ตัดเกมล้วน", atkMult: 0.85, defMult: 1.18, bonusAttrs: ["tackling", "determination"] },
  mf_dlp: { id: "mf_dlp", label: "เพลย์เมคตัวลึก (DLP)", desc: "จ่ายสร้างเกมจากแดนลึก", atkMult: 1.10, defMult: 0.96, bonusAttrs: ["passing", "vision"] },
  mf_b2b: { id: "mf_b2b", label: "บ็อกซ์ทูบ็อกซ์", desc: "วิ่งครบสนาม สมดุลรุก-รับ", atkMult: 1.00, defMult: 1.00, bonusAttrs: ["workRate", "determination"] },
  mf_playmaker: { id: "mf_playmaker", label: "เพลย์เมคเกอร์", desc: "คุมจังหวะ จ่ายทะลุแนว", atkMult: 1.18, defMult: 0.85, bonusAttrs: ["passing", "vision"] },
  mf_wide: { id: "mf_wide", label: "มิดฟิลด์ริมเส้น", desc: "คุมริมเส้น เปิดบอล ช่วยรับ", atkMult: 1.06, defMult: 0.96, bonusAttrs: ["crossing", "workRate"] },
  mf_winger: { id: "mf_winger", label: "วิงเกอร์", desc: "เลาะริมเข้าเปิดบอล/เลี้ยงเดี่ยว", atkMult: 1.14, defMult: 0.88, bonusAttrs: ["crossing", "dribbling"] },
  fw_inside: { id: "fw_inside", label: "ตัดเข้าในยิง (Inside Fwd)", desc: "หุบจากริมเข้ากลางเพื่อจบสกอร์", atkMult: 1.20, defMult: 0.82, bonusAttrs: ["dribbling", "finishing"] },
  am_shadow: { id: "am_shadow", label: "กองหน้าตัวต่ำ (Shadow)", desc: "สอดจากแดนสองเข้าไปจบ", atkMult: 1.16, defMult: 0.84, bonusAttrs: ["finishing", "vision"] },
  fw_poacher: { id: "fw_poacher", label: "โพชเชอร์", desc: "รอจบสกอร์ในกรอบเขตโทษ", atkMult: 1.16, defMult: 0.80, bonusAttrs: ["finishing", "composure"] },
  fw_target: { id: "fw_target", label: "ตัวเป้า (Target Man)", desc: "รับบอลโล่งหลังหัน เป็นจุดวาง", atkMult: 1.06, defMult: 0.90, bonusAttrs: ["heading", "strength"] },
  fw_false9: { id: "fw_false9", label: "ฟอลส์ไนน์", desc: "ถอยรับเกม ดึงแนวรับแตก", atkMult: 1.10, defMult: 0.86, bonusAttrs: ["vision", "dribbling"] },
};
const RD = ROLE_DEFS;
/* บทบาทที่เลือกได้ต่อตำแหน่งละเอียดแบบ FM */
const PLAYER_ROLES_BY_DPOS = {
  GK: [RD.gk_standard, RD.gk_sweeper],
  DC: [RD.df_stopper, RD.df_ballplaying],
  DL: [RD.df_fullback, RD.df_wingback], DR: [RD.df_fullback, RD.df_wingback],
  WBL: [RD.df_wingback, RD.df_fullback], WBR: [RD.df_wingback, RD.df_fullback],
  DM: [RD.mf_anchor, RD.mf_dlp, RD.mf_b2b],
  MC: [RD.mf_b2b, RD.mf_playmaker, RD.mf_anchor],
  ML: [RD.mf_wide, RD.mf_winger], MR: [RD.mf_wide, RD.mf_winger],
  AML: [RD.mf_winger, RD.fw_inside], AMR: [RD.mf_winger, RD.fw_inside],
  AMC: [RD.mf_playmaker, RD.am_shadow],
  ST: [RD.fw_poacher, RD.fw_target, RD.fw_false9],
};
const GROUP_FALLBACK_DPOS = { GK: "GK", DF: "DC", MF: "MC", FW: "ST" };
function rolesForPlayer(p) {
  return PLAYER_ROLES_BY_DPOS[p.pos] || PLAYER_ROLES_BY_DPOS[GROUP_FALLBACK_DPOS[p.position]] || PLAYER_ROLES_BY_DPOS.MC;
}
/** legacy role ids (attacking/balanced/defensive) หรือ id ที่ไม่อยู่ในลิสต์ตำแหน่งใหม่ จะ fallback มาที่นี่ — ไม่ต้อง migrate เซฟเก่า */
function resolvePlayerRole(p) {
  const roles = rolesForPlayer(p);
  const found = roles.find((r) => r.id === p.role);
  if (found) return found;
  if (p.role === "attacking") return [...roles].sort((a, b) => b.atkMult - a.atkMult)[0];
  if (p.role === "defensive") return [...roles].sort((a, b) => b.defMult - a.defMult)[0];
  return roles[Math.floor((roles.length - 1) / 2)];
}
/** หน้าที่ซ้อนบนบทบาท (FM-style Duty) — เอียงบทบาทเดิมให้บุก/รับมากขึ้นอีกชั้น ไม่มีผลกับโกล (ไม่มี duty concept) */
const DUTY_DEFS = {
  attack: { id: "attack", label: "บุก (Attack)", atk: 1.08, def: 0.92 },
  support: { id: "support", label: "สนับสนุน (Support)", atk: 1.0, def: 1.0 },
  defend: { id: "defend", label: "รับ (Defend)", atk: 0.9, def: 1.08 },
};
const DUTY_LIST = [DUTY_DEFS.defend, DUTY_DEFS.support, DUTY_DEFS.attack];
function resolvePlayerDuty(p) {
  return DUTY_DEFS[p.duty] || DUTY_DEFS.support;
}
/** ย่อหน้าที่เป็นรหัสสั้นแบบ FM (เช่น "PF-At", "IF-Su") ต่อท้ายชื่อบทบาทในป้าย/แผนผัง */
const DUTY_SUFFIX = { attack: "At", support: "Su", defend: "De" };
function roleDutyShortCode(p) {
  const role = resolvePlayerRole(p);
  const short = (role.id.split("_")[1] || role.id).slice(0, 2).toUpperCase();
  if (role.id.startsWith("gk_")) return short;
  return `${short}-${DUTY_SUFFIX[p.duty] || "Su"}`;
}
/** โบนัส/บทลงโทษของบทบาทถูกขยาย/หดตามว่าผู้เล่นมีสเตตที่เหมาะกับบทบาทนั้นแค่ไหน (เล่นผิดบทบาทได้ผลน้อยลง)
 *  ซ้อนทับด้วย duty (บุก/สนับสนุน/รับ) อีกชั้นหนึ่ง — ยกเว้นโกลที่ไม่มี duty */
function roleAttackDefenseMult(p) {
  const role = resolvePlayerRole(p);
  const bonusAvg = role.bonusAttrs?.length ? role.bonusAttrs.reduce((s, k) => s + (p.attrs?.[k] || 10), 0) / role.bonusAttrs.length : 10;
  const fit = clamp(1 + (bonusAvg - 10) * 0.012, 0.85, 1.15);
  let atk = role.atkMult >= 1 ? role.atkMult * fit : role.atkMult;
  let def = role.defMult >= 1 ? role.defMult * fit : role.defMult;
  if (!role.id.startsWith("gk_")) {
    const duty = resolvePlayerDuty(p);
    atk *= duty.atk;
    def *= duty.def;
  }
  return { atk, def };
}

/* ============================== TEMPO / PRESSING / DEFENSIVE LINE ============================== */
const TEMPO_OPTIONS = [
  { id: "slow", label: "ช้า", desc: "ครองบอลนาน ประหยัดแรง", atk: 0.97, def: 1.03, staminaDrainMult: 0.85 },
  { id: "normal", label: "ปกติ", desc: "จังหวะมาตรฐาน", atk: 1, def: 1, staminaDrainMult: 1 },
  { id: "fast", label: "เร็ว", desc: "เล่นไวใส่ทุกจังหวะ เปลืองแรงมาก", atk: 1.06, def: 0.97, staminaDrainMult: 1.3 },
];
const PRESSING_OPTIONS = [
  { id: "low", label: "กดต่ำ", desc: "ยืนบล็อก ประหยัดแรง", atk: 0.98, def: 1.03, staminaDrainMult: 0.85, injuryRiskMult: 0.85 },
  { id: "medium", label: "กดปานกลาง", desc: "สมดุล", atk: 1, def: 1, staminaDrainMult: 1, injuryRiskMult: 1 },
  { id: "high", label: "กดสูงทั้งสนาม", desc: "บีบแย่งบอลไว เปลืองแรง+เสี่ยงบาดเจ็บ", atk: 1.06, def: 0.95, staminaDrainMult: 1.35, injuryRiskMult: 1.3 },
];
const DEF_LINE_OPTIONS = [
  { id: "deep", label: "แนวรับลึก", desc: "ถอยรอสวนกลับ", atk: 0.96, def: 1.05 },
  { id: "normal", label: "แนวรับปกติ", desc: "มาตรฐาน", atk: 1, def: 1 },
  { id: "high", label: "แนวรับสูง", desc: "ดันขึ้นบีบพื้นที่ — ต้องมีแบ็คเร็วคุ้มกับดักล้ำหน้า", atk: 1.04, def: 0.96 },
];
/** อิสระในการตัดสินใจ (Creative Freedom แบบ FM26) — ปล่อยอิสระ = สร้างสรรค์ขึ้นแต่เสี่ยงเสียบอลง่ายขึ้น */
const CREATIVE_FREEDOM_OPTIONS = [
  { id: "disciplined", label: "มีวินัย", desc: "ทำตามแผนเป๊ะ เสี่ยงน้อย", atk: 0.97, def: 1.03 },
  { id: "balanced", label: "สมดุล", desc: "มาตรฐาน", atk: 1, def: 1 },
  { id: "expressive", label: "อิสระ", desc: "กล้าเลี้ยง/จ่ายเสี่ยง สร้างโอกาสมากขึ้นแต่เสียบอลง่ายขึ้น", atk: 1.05, def: 0.95 },
];
/** กับดักล้ำหน้าได้ผลจริงก็ต่อเมื่อดันแนวสูง + แบ็คตัวเร็วพอ ไม่งั้นเสี่ยงโดนบอลทะลุ */
function offsideTrapMult(defLine, offsideTrap, avgDefPace) {
  if (!offsideTrap) return 1;
  if (defLine !== "high") return 0.98;
  return avgDefPace >= 13 ? 1.06 : 0.88;
}

/* ============================== SET-PIECE TAKERS ============================== */
const SET_PIECE_ATTRS = { corner: ["crossing", "dribbling"], freekick: ["finishing", "passing"], penalty: ["composure", "finishing"] };
function setPieceTakerScore(team, squad, kind) {
  const takerId = kind === "corner" ? team.cornerTakerId : kind === "freekick" ? team.freekickTakerId : team.penaltyTakerId;
  const taker = takerId ? squad.find((p) => p.id === takerId) : null;
  if (!taker) return 8; // baseline สเตตเฉลี่ยทีม ถ้ายังไม่เลือกมือดาวเตะ
  const attrs = SET_PIECE_ATTRS[kind];
  return attrs.reduce((s, k) => s + (taker.attrs?.[k] || 8), 0) / attrs.length;
}
/** โบนัสประสิทธิภาพลูกตั้งเตะรวม — ไม่ได้จำลองทีละลูก แต่สะท้อนคุณภาพมือดาวเตะเข้าไปในพลังรุกโดยรวม */
function setPieceBonusMult(team, squad) {
  if (!team) return 1;
  const avgScore = (setPieceTakerScore(team, squad, "corner") + setPieceTakerScore(team, squad, "freekick") + setPieceTakerScore(team, squad, "penalty")) / 3;
  return clamp(1 + (avgScore - 8) * 0.006, 0.97, 1.06);
}

/* ============================== TACTICAL FAMILIARITY ============================== */
function familiarityMultiplier(matches) {
  if (matches >= 15) return 1.05;
  if (matches >= 10) return 1.02;
  if (matches >= 6) return 1.0;
  if (matches >= 3) return 0.97;
  if (matches >= 1) return 0.94;
  return 0.90;
}
function updateTacticFamiliarity(c, formation, manager) {
  const fam = c.tacticFamiliarity || { formation, matches: 0 };
  let extra = manager ? managerPlanProfile({ manager }).famBonus : 0;
  if (c && manager) {
    const uT = c.teams?.find((t) => t.id === c.userTeamId);
    if (uT?.manager?.id === manager.id) extra += staffSupportBonuses(c, c.userTeamId).famBonusExtra || 0;
  }
  if (fam.formation === formation) fam.matches = Math.min(20, fam.matches + 1 + extra);
  else { fam.formation = formation; fam.matches = 0; }
  c.tacticFamiliarity = fam;
}

/* ============================== OPPOSITION INSTRUCTIONS (mark player) ============================== */
/** ลดพลังรุกของคู่แข่งเมื่อประกบตัวอันตราย — markMult จากผจก.+Analyst (0.55–1.35) */
function applyOppositionMarkToContext(ctx, markPlayerId, squad, xiIds, markMult = 1) {
  if (!markPlayerId || !xiIds || !xiIds.includes(markPlayerId)) return ctx;
  const xi = squad.filter((p) => xiIds.includes(p.id));
  const marked = xi.find((p) => p.id === markPlayerId);
  if (!marked) return ctx;
  const avgAtk = xi.length ? xi.reduce((s, p) => s + p.attack, 0) / xi.length : marked.attack;
  const importance = clamp((marked.attack - avgAtk) / 40, 0, 0.15);
  const skillMult = markMult > 3
    ? clamp(0.55 + markMult / 130, 0.55, 1.2)
    : clamp(markMult, 0.55, 1.35);
  const reduction = clamp((0.05 + importance) * skillMult, 0.03, 0.22);
  return { ...ctx, effAttack: ctx.effAttack * (1 - reduction) };
}

/* ---------- out-of-position (วางนักเตะข้ามตำแหน่ง) ---------- */
/* natural position → slot position: ตัวคูณประสิทธิภาพ (1 = ตรงตำแหน่ง) */
const POS_FAMILIARITY = {
  GK: { GK: 1, DF: 0.6, MF: 0.55, FW: 0.5 },
  DF: { GK: 0.45, DF: 1, MF: 0.85, FW: 0.72 },
  MF: { GK: 0.45, DF: 0.85, MF: 1, FW: 0.85 },
  FW: { GK: 0.45, DF: 0.72, MF: 0.85, FW: 1 },
};
function outOfPositionMult(naturalPos, slotPos) {
  if (!slotPos || naturalPos === slotPos) return 1;
  return POS_FAMILIARITY[naturalPos]?.[slotPos] ?? 0.8;
}

/* slotAssign (optional): { playerId: slotPos } — ถ้ามี ใช้ตำแหน่งบนสนามจริงแทน natural position
   พร้อมโทษ out-of-position; ถ้าไม่มี (บอท/ออโต้) พฤติกรรมเดิมทุกอย่าง */
function teamAttackDefense(squad, xiIds, slotAssign) {
  const xi = squad.filter((p) => xiIds.includes(p.id));
  if (xi.length === 0) return { attack: 40, defense: 40, avgStamina: 100, avgMorale: 75 };
  /* slotAssign อาจเป็นตำแหน่งละเอียด (DL/AMR/...) หรือกลุ่มหยาบ (เซฟเก่า) — แปลงเป็นกลุ่มก่อนแบ่งสายรุก/รับ */
  const slotGroupOf = (p) => POS_GROUP[slotAssign?.[p.id]] || p.position;
  const oopOf = (p) => playerOopMult(p, slotAssign?.[p.id]);
  const attackers = xi.filter((p) => slotGroupOf(p) === "FW" || slotGroupOf(p) === "MF");
  const defenders = xi.filter((p) => slotGroupOf(p) === "DF" || slotGroupOf(p) === "GK");
  const avg = (arr, key) => (arr.length ? arr.reduce((s, p) => s + p[key], 0) / arr.length : 45);
  const attack = attackers.length
    ? attackers.reduce((s, p) => s + p.attack * roleAttackDefenseMult(p).atk * oopOf(p), 0) / attackers.length
    : avg(xi, "attack");
  const defense = defenders.length
    ? defenders.reduce((s, p) => s + p.defense * roleAttackDefenseMult(p).def * oopOf(p), 0) / defenders.length
    : avg(xi, "defense");
  const avgStamina = avg(xi, "stamina");
  const avgMorale = avg(xi, "morale");
  return { attack, defense, avgStamina, avgMorale };
}

/* full performance multiplier combining tactics / morale / stamina / chemistry / home */
function teamPerformanceMult({ formation, manager, avgStamina, avgMorale, chemistry, isHome, opponentFormation }) {
  const staminaMult = clamp(0.72 + 0.28 * (avgStamina / 100), 0.72, 1.0);
  const psych = manager ? manager.stats.manManagement : 45;
  // สัญชาตญาณผจก. — "จอมยุทธวิธี"/"นักจิตวิทยาห้องแต่งตัว" มีผลเล็กน้อยจริงในผลแมท ไม่ใช่แค่ UI/มูดนอกสนาม
  const mmTraitBump = manager?.trait === "manManagement" ? 0.02 : 0;
  const tacticsTraitBump = manager?.trait === "tactics" ? 0.02 : 0;
  const moraleMult = clamp(1 + ((avgMorale - 70) / 300) * (psych / 70) + mmTraitBump, 0.85, 1.18);
  const tacticFitMult = (manager ? (manager.preferredFormation === formation ? 1.08 : 0.96) : 1.0) + tacticsTraitBump;
  const matchupMult = matchupMultiplier(formation, opponentFormation);
  const chemistryMult = clamp(0.94 + 0.11 * (chemistry / 100), 0.94, 1.05);
  const homeMult = isHome ? 1.1 : 0.93;
  const tierPerf = manager ? managerPlanProfile({ manager }).performanceBonus : 0;
  return staminaMult * moraleMult * tacticFitMult * matchupMult * chemistryMult * homeMult * (1 + tierPerf);
}

function expectedGoalsFull(homeCtx, awayCtx) {
  const xgHome = clamp(1.3 * (homeCtx.effAttack / Math.max(30, awayCtx.effDefense)), 0.2, 4.3);
  const xgAway = clamp(1.3 * (awayCtx.effAttack / Math.max(30, homeCtx.effDefense)), 0.15, 4.0);
  return { xgHome, xgAway };
}

function buildMatchContext(team, squad, xiIds, opponentFormation, isHome, chemistry, slotAssign) {
  const { attack, defense, avgStamina, avgMorale } = teamAttackDefense(squad, xiIds, slotAssign);
  const mult = teamPerformanceMult({ formation: team.formation, manager: team.manager, avgStamina, avgMorale, chemistry, isHome, opponentFormation });
  return { effAttack: attack * mult, effDefense: defense * mult, mult, avgStamina, avgMorale };
}

function simulateInstant(homeTeam, homeSquad, homeXI, awayTeam, awaySquad, awayXI, homeChem, awayChem, homeSlotAssign, awaySlotAssign) {
  const hc = buildMatchContext(homeTeam, homeSquad, homeXI, awayTeam.formation, true, homeChem, homeSlotAssign);
  const ac = buildMatchContext(awayTeam, awaySquad, awayXI, homeTeam.formation, false, awayChem, awaySlotAssign);
  const { xgHome, xgAway } = expectedGoalsFull(hc, ac);
  return { homeGoals: poisson(xgHome), awayGoals: poisson(xgAway) };
}

/* market hours: 12:00-14:00 and 18:00-22:00 local device time */
function isMarketOpen(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  return (h >= 12 && h < 14) || (h >= 18 && h < 22);
}
function resolveMarketOpen(career, date = new Date()) {
  if (career?.playMode === "sandbox") return true;
  return isMarketOpen(date);
}
function nextMarketOpenLabel(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h < 12) return "เปิด 12:00 น.";
  if (h < 18) return "เปิด 18:00 น.";
  return "เปิดพรุ่งนี้ 12:00 น.";
}
/* pick who scored, biased toward attacking positions, and log a milestone news line for the player's club (kept
   to the user's own club so the news feed stays about players you actually care about, not all 32 clubs) */
function pickScorer(squad, xiIds, markedPlayerId) {
  const xi = squad.filter((p) => xiIds.includes(p.id));
  if (!xi.length) return null;
  const weighted = [];
  xi.forEach((p) => {
    let w = p.position === "FW" ? 5 : p.position === "MF" ? 3 : p.position === "DF" ? 1 : 0.3;
    if (markedPlayerId && p.id === markedPlayerId) w *= 0.5; // ถูกประกบตัว — โอกาสเป็นผู้ทำประตูลดลง
    for (let i = 0; i < Math.round(Math.max(w, 0.3)); i++) weighted.push(p);
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
    scorer.seasonGoals = (scorer.seasonGoals || 0) + 1;
    if (scorer.teamId === c.userTeamId) {
      c.monthlyGoals = c.monthlyGoals || {};
      c.monthlyGoals[scorer.id] = (c.monthlyGoals[scorer.id] || 0) + 1;
      c.monthlyApps = c.monthlyApps || {};
      c.monthlyApps[scorer.id] = (c.monthlyApps[scorer.id] || 0) + 1;
    }
    checkMilestone(c, scorer, "goals");
  }
}
function checkBenchUnhappiness(c, squad, xiIds) {
  if (!squad.some((p) => p.teamId === c.userTeamId)) return;
  squad.filter((p) => p.teamId === c.userTeamId && p.rating > 60).forEach((p) => {
    const hist = p.appearHistory || [];
    let benchStreak = 0;
    for (const v of hist) { if (v) break; benchStreak += 1; }
    if (benchStreak < 3) return;
    if (benchStreak === 3) {
      const personality = PLAYER_PERSONALITIES[p.personality];
      const drop = Math.round(3 * (personality?.benchMult ?? 1));
      p.morale = clamp(p.morale - drop, 10, 99);
      c.log = [`😤 ${p.name} ไม่พอใจ — นั่งสำรองติดต่อกัน ${benchStreak} นัด (OVR ${p.rating})`, ...c.log];
    }
  });
}
function runMonthlyAwards(c) {
  const squad = c.players.filter((p) => p.teamId === c.userTeamId);
  const goals = c.monthlyGoals || {};
  const apps = c.monthlyApps || {};
  const withApps = squad.filter((p) => (apps[p.id] || 0) > 0);
  if (!withApps.length) return c;
  const topScorer = [...withApps].sort((a, b) => (goals[b.id] || 0) - (goals[a.id] || 0))[0];
  const potm = [...withApps].sort((a, b) => {
    const sa = (goals[a.id] || 0) * 3 + (apps[a.id] || 0) + a.rating * 0.05;
    const sb = (goals[b.id] || 0) * 3 + (apps[b.id] || 0) + b.rating * 0.05;
    return sb - sa;
  })[0];
  const monthNum = Math.floor(c.day / 28);
  const lines = [`📅 รางวัลประจำเดือน (ช่วงที่ ${monthNum})`];
  if (topScorer && (goals[topScorer.id] || 0) > 0) lines.push(`⚽ ดาวยิง: ${topScorer.name} (${goals[topScorer.id]} ประตู)`);
  if (potm) lines.push(`⭐ นักเตะยอดเยี่ยม: ${potm.name}`);
  c.log = [...lines, ...c.log];
  c.monthlyGoals = {};
  c.monthlyApps = {};
  return c;
}

function genTransferListing(teams, excludeTeamId, c = null) {
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
  if (c) checkShadowMarketAlerts(c, p);
  return p;
}

/* ============================== CAREER BOOTSTRAP ============================== */
const LEAGUE_NAMES = ["Master League", "Challenger League"];
function buildLeague(division, teams, legendLeagueId) {
  const teamIds = teams.filter((t) => t.division === division).map((t) => t.id);
  const table = {};
  teamIds.forEach((id) => { table[id] = { played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
  const name = division === 0 && legendLeagueId
    ? `Master · ${legendLeagueLabel(legendLeagueId)}`
    : LEAGUE_NAMES[division];
  return { division, name, fixtures: buildSeasonFixtures(teamIds), table };
}
function standingsForDivision(c, division) {
  return c.teams.filter((t) => t.division === division)
    .map((t) => ({ team: t, ...c.leagues[division].table[t.id], gd: c.leagues[division].table[t.id].gf - c.leagues[division].table[t.id].ga }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}

function getRecentMatchResults(c, division, userTeamId, max = 14) {
  const league = c.leagues[division];
  const results = [];
  for (let day = c.day; day >= 1 && results.length < max; day -= 1) {
    const round = league.fixtures.find((r) => r.day === day);
    if (!round) continue;
    round.matches.filter((m) => m.played).forEach((m) => {
      const home = c.teams.find((t) => t.id === m.home);
      const away = c.teams.find((t) => t.id === m.away);
      if (home && away) {
        results.push({
          day, home, away, homeGoals: m.homeGoals, awayGoals: m.awayGoals,
          isUser: m.home === userTeamId || m.away === userTeamId,
        });
      }
    });
  }
  return results;
}

function isMatchLogLine(line) {
  return /^[A-Z0-9]{2,4} \d+ - \d+/.test(line) || line.includes("⚽") || line.includes("ลงสนาม") || line.includes("นัด");
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
        if (winner.id === c.userTeamId) { c.budget += payouts.champion; userNote = `🏆 ทีมคุณคว้าแชมป์ Champ Master! รับเงินรางวัล ${formatMoney(payouts.champion)}`; awardTrophy(c, "champ_master"); }
        if (loser.id === c.userTeamId) { c.budget += payouts.runnerUp; userNote = `🥈 ทีมคุณเป็นรองแชมป์ Champ Master รับเงินรางวัล ${formatMoney(payouts.runnerUp)}`; awardTrophy(c, "champ_master_runnerup"); }
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

/* ---------- trophy cabinet ---------- */
const TROPHY_DEFS = {
  master_champion: { icon: "🏆", label: "แชมป์ Master League", color: "#d4af37" },
  challenger_champion: { icon: "🥇", label: "แชมป์ Challenger League", color: "#e0a458" },
  promotion: { icon: "⬆️", label: "เลื่อนชั้นสู่ Master League", color: "#6fae5a" },
  socker_cup: { icon: "🍺", label: "แชมป์ Socker Cup", color: "#e0a458" },
  champ_master: { icon: "🌟", label: "แชมป์ Champ Master", color: "#d4af37" },
  champ_master_runnerup: { icon: "🥈", label: "รองแชมป์ Champ Master", color: "#a9bdb1" },
};
// เฉพาะถ้วยแบบน็อกเอาต์ (คนละก้อนกับแชมป์ลีก ที่ได้โบนัสแฟนบอลทั่วโลกจาก processSeasonEndFans ไปแล้ว กันซ้ำ)
const CUP_TROPHY_IDS = ["socker_cup", "champ_master"];
function awardTrophy(c, trophyId, season) {
  if (!c.trophyCabinet) c.trophyCabinet = [];
  c.trophyCabinet.push({ id: trophyId, season: season ?? c.season, wonAt: Date.now() });
  if (CUP_TROPHY_IDS.includes(trophyId)) {
    c.globalFanbase = (c.globalFanbase || 0) + GLOBAL_FANBASE_AWARDS.cupWin;
    c.ownerXp = (c.ownerXp || 0) + OWNER_XP_AWARDS.cupWin;
  }
}

/* Socker Cup — domestic knockout mid-season (day 15), top 8 of user's division */
const SOCKER_CUP_PRIZES = { 8: 500000, 4: 800000, 2: 1200000, 1: 2000000 };
function runSockerCup(c) {
  if (c.sockerCupSeason === c.season) return c;
  const uT = c.teams.find((t) => t.id === c.userTeamId);
  const standings = standingsForDivision(c, uT.division);
  let field = standings.slice(0, 8).map((s) => ({
    id: s.team.id, name: s.team.name, short: s.team.short,
    strength: teamStrength(c, s.team.id),
  }));
  field = field.sort(() => Math.random() - 0.5);
  const roundLog = [];
  while (field.length > 1) {
    const size = field.length;
    const winners = [];
    for (let i = 0; i < field.length; i += 2) {
      const A = field[i], B = field[i + 1];
      if (!B) { winners.push(A); continue; }
      const { gA, gB } = simulateChampMatch(A.strength, B.strength);
      const winner = gA >= gB ? A : B;
      const loser = gA >= gB ? B : A;
      winners.push(winner);
      roundLog.push(`${A.short} ${gA}-${gB} ${B.short} → ${winner.short}`);
      const prize = size === 2
        ? (winner.id === c.userTeamId ? SOCKER_CUP_PRIZES[1] : SOCKER_CUP_PRIZES[2])
        : (SOCKER_CUP_PRIZES[size] || 500000);
      if (loser.id === c.userTeamId) {
        c.budget += prize;
        c.log = [`🍺 Socker Cup: ตกรอบรอบ ${size} ทีม รับ ${formatMoney(prize)}`, ...c.log];
      }
      if (winner.id === c.userTeamId) {
        c.budget += prize;
        const label = size === 2 ? "คว้าแชมป์ Socker Cup" : `ผ่านรอบ ${size} ทีม`;
        c.log = [`🏆 Socker Cup: ${label}! +${formatMoney(prize)}`, ...c.log];
        if (size === 2) awardTrophy(c, "socker_cup");
      }
    }
    field = winners;
  }
  c.sockerCupSeason = c.season;
  c.lastSockerCup = { season: c.season, rounds: roundLog };
  c.log = [`🍺 Socker Cup วันนี้ — knockout 8 ทีมจาก ${uT.division === 0 ? "Master" : "Challenger"} League`, ...c.log];
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

  const relegatedTeams = masterStandings.slice(-4).map((s) => s.team);
  const promotedTeams = challengerStandings.slice(0, 4).map((s) => s.team);
  processSeasonEndFans(c, prevPos, prevRow, prevDivision,
    !!promotedTeams.find((t) => t.id === c.userTeamId),
    !!relegatedTeams.find((t) => t.id === c.userTeamId));
  awardSeasonPlatinumPacks(c, prevPos);
  ensureStaffCardFields(c);
  c.machineCoins = (c.machineCoins || 0) + SEASON_END_MACHINE_COINS;
  c.log = [`🪙 จบฤดูกาล — ได้เหรียญตู้เพิ่ม ${SEASON_END_MACHINE_COINS}`, ...c.log];

  // --- trophy cabinet: league titles + promotion ---
  if (prevPos === 1) awardTrophy(c, prevDivision === 0 ? "master_champion" : "challenger_champion");
  if (promotedTeams.find((t) => t.id === c.userTeamId)) awardTrophy(c, "promotion");

  // --- season history: snapshot ก่อนล้างตาราง ---
  const uSquadHist = c.players.filter((p) => p.teamId === c.userTeamId);
  const topScorer = [...uSquadHist].sort((a, b) => (b.seasonGoals || 0) - (a.seasonGoals || 0))[0];
  if (!c.seasonHistory) c.seasonHistory = [];
  c.seasonHistory.push({
    season: c.season,
    division: prevDivision,
    pos: prevPos,
    pts: prevRow?.pts ?? 0,
    w: prevRow?.w ?? 0, d: prevRow?.d ?? 0, l: prevRow?.l ?? 0,
    gf: prevRow?.gf ?? 0, ga: prevRow?.ga ?? 0,
    topScorerName: topScorer && (topScorer.seasonGoals || 0) > 0 ? topScorer.name : null,
    topScorerGoals: topScorer?.seasonGoals || 0,
    trophies: (c.trophyCabinet || []).filter((t) => t.season === c.season).map((t) => t.id),
    budgetEnd: c.budget,
  });

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
  const relegated = relegatedTeams;
  const promoted = promotedTeams;
  relegated.forEach((t) => { t.division = 1; });
  promoted.forEach((t) => { t.division = 0; });
  const moveLines = [];
  relegated.forEach((t) => moveLines.push(`⬇️ ${t.short} ตกชั้นสู่ Challenger League`));
  promoted.forEach((t) => moveLines.push(`⬆️ ${t.short} เลื่อนชั้นสู่ Master League`));
  if (relegated.find((t) => t.id === c.userTeamId)) moveLines.push(`😔 ทีมของคุณตกชั้น! ต้องไต่กลับขึ้นมาใหม่`);
  if (promoted.find((t) => t.id === c.userTeamId)) moveLines.push(`🎉 ทีมของคุณเลื่อนชั้นสู่ Master League!`);
  c.log = [...moveLines, ...c.log];

  c.leagues = [buildLeague(0, c.teams, c.legendLeagueId), buildLeague(1, c.teams, c.legendLeagueId)];

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
    p.wage = computePlayerWage(p.rating);
    return true;
  });
  c.teams.forEach((t) => {
    const added = topUpTeamSquad(c.players, t.id, t.tier, c.day, c.legendLeagueId || "thailand", c.teams);
    if (added.length) c.log = [`🆕 ${t.short} เซ็นดาวรุ่ง ${added.length} คนเติมสควอด`, ...c.log];
  });
  c.teams.forEach((t) => { c.lineups[t.id] = getBestXI(c.players.filter((p) => p.teamId === t.id), t.formation); });
  if (retiredNames.length) c.log = [`👋 ฤดูกาลนี้มีนักเตะรีไทร์ ${retiredNames.length} คน`, ...c.log];
  c.players.forEach((p) => { p.seasonGoals = 0; });
  c.monthlyGoals = {};
  c.monthlyApps = {};
  c.sockerCupSeason = null;
  const sackResult = runSeasonEndRoadmap(c, uT, prevPos);
  if (sackResult.sacked) {
    c.managerSacked = true;
    c.sackReason = sackResult.reason;
    c.log = [`🚪 ${sackResult.reason}`, ...c.log];
  }
  if (canRunYouthIntakeCeremony(c)) {
    c = runYouthIntake(c);
    markYouthIntakeCeremony(c);
    c.log = [`🎓 Youth Intake Day — พิธีรับเด็กใหม่ประจำฤดูกาล`, ...c.log];
  }
  // โค้ชที่ทำงานกับสโมสรเราต่อเนื่อง ได้ปีประสบการณ์เพิ่ม — ทุก 2 ฤดูกาลค่อยๆ เก่งขึ้นถาวรเล็กน้อย
  const uStaff = c.staff[c.userTeamId];
  if (uStaff) {
    ["GK", "DF", "MF", "FW", "FITNESS"].forEach((spec) => {
      if (uStaff[spec]) uStaff[spec] = applyCoachSeasonXp(uStaff[spec]);
    });
  }
  c.log = [`เริ่มฤดูกาลที่ ${c.season} แล้ว!`, ...c.log];
  return c;
}

function createNewCareer(customClub, managerName = "ผู้จัดการ") {
  const legendLeagueId = "england";
  const masterBots = createLegendMasterTeams(legendLeagueId, 1);
  const challengerBots = CHALLENGER_TEAM_DEFS.map((t, idx) => ({
    id: "c" + idx, name: t.name, short: t.short, color: t.color, secondaryColor: botSecondaryColor(t.color), logoIndex: idx % LOGO_ICONS.length, tier: t.tier,
    division: 1, isUser: false, formation: "4-4-2", budget: rand(1500000, 4000000),
    manager: genManager(), autoMode: true, chemistry: 50,
  }));
  const userTeam = {
    id: "t_user", name: customClub.name, short: customClub.short, color: customClub.primaryColor,
    secondaryColor: customClub.secondaryColor, shirtColor: customClub.shirtColor, shortsColor: customClub.shortsColor,
    logoIndex: customClub.logoIndex, tier: -3, division: 1, isUser: true, formation: "4-4-2", budget: STARTING_BUDGET,
    manager: null, autoMode: false, chemistry: 50,
  };
  const teams = [...masterBots, ...challengerBots, userTeam];
  let players = [];
  teams.forEach((t) => {
    if (t.division === 0) players = players.concat(buildLegendSquadForTeam(t.id, legendLeagueId, t.legendTeamKey, t.tier, 1));
    else players = players.concat(genSquad(t.id, t.tier, 1, { leagueId: "thailand", teams }));
  });
  const leagues = [buildLeague(0, teams, legendLeagueId), buildLeague(1, teams, legendLeagueId)];
  const lineups = {};
  const benchLineups = {};
  teams.forEach((t) => {
    const sq = players.filter((p) => p.teamId === t.id);
    lineups[t.id] = getBestXI(sq, t.formation);
    if (t.id === userTeam.id) {
      benchLineups[t.id] = Array.from({ length: MATCH_BENCH_SIZE }, (_, i) => {
        const pick = sq.filter((p) => !lineups[t.id].includes(p.id)).sort((a, b) => b.rating - a.rating)[i];
        return pick ? pick.id : null;
      });
    }
  });
  const staff = {};
  teams.forEach((t) => { staff[t.id] = {}; });
  const coachOffers = { PHYSIOTHERAPIST: genUniformCoachOffer("PHYSIOTHERAPIST") };
  const career = {
    season: 1, day: 1, userTeamId: userTeam.id,
    teams, players, leagues, lineups, benchLineups, staff,
    budget: STARTING_BUDGET, transferList: [], coachOffers, coachRerollCounts: {}, managerOffer: null,
    managerRerollCount: 0, marketScoutRerollCount: 0, youthScoutRerollCount: 0, academyManagerRerollCount: 0,
    facilities: { fitness: 1, training: 1, techLab: 1, medical: 1 },
    weeklyQuests: pickWeeklyQuests(), weeklyProgress: { wins: 0, goals: 0, cleanSheets: 0 }, weeklyRewarded: [],
    liveMatch: null,
    // training program: 10-slot calendar, one slot consumed per game day (≈1 real hour, 9:00-20:00)
    trainingPlan: Array.from({ length: 10 }, (_, i) => (i % 3 === 2 ? "REST" : "BALANCED")),
    autoTraining: true,
    individualFocus: {}, trainingCampCooldownDay: 0,
    // บอร์ดซ้อมรายตำแหน่ง — คิวท่าซ้อมต่อกลุ่มตำแหน่ง + วันล่าสุดที่กดซ้อมเอง
    drillPlans: defaultDrillPlans(), drillDoneDay: {},
    trainingReports: [],
    // youth academy + market scout (separate)
    marketScout: null, marketScoutOffer: null,
    youthScout: null, youthScoutOffer: genUniformScoutOffer(),
    scoutFinds: [],
    scoutSearchDay: 0,
    academyManager: null, academyManagerOffer: genUniformManagerOffer(),
    academyPlayers: [], youthProspects: [], loans: [], seasonAcademySales: 0,
    // season goal (pick one each season for a budget bonus)
    seasonGoalOptions: pickSeasonGoalOptions(), seasonGoal: null,
    // idle catch-up bookkeeping
    lastSeenAt: Date.now(),
    playMode: "sandbox",
    onlineUnlocked: false,
    onlineUnlockedAt: null,
    legendLeagueId,
    legendOwnership: initLegendOwnership(legendLeagueId, teams, players),
    pendingLeaguePick: false,
    matchPrep: defaultMatchPrep(),
    fanBase: 2500, sponsorTier: 0, badSeasonStreak: 0, lastSeasonSnapshot: null, fanDeltaToday: 0,
    stadiumLevel: 1,
    globalFanbase: 0, ownerXp: 0, constructionQueue: [],
    monthlyGoals: {}, monthlyApps: {}, sockerCupSeason: null,
    saveVersion: SAVE_VERSION,
    gameVersion: GAME_VERSION,
    uiPrefs: { marketSub: "trade" },
    squadOwnTab: true,
    ...defaultStaffCardState(1),
    worldNews: [],
    flashWorldNewsId: null,
    log: [`📰 [โลก TMFC] สโมสรใหม่ ${userTeam.name} (${managerName}) ถูกจัดตั้งใน The Master FC Online`, `ยินดีต้อนรับสู่ตำแหน่งไดเรคเตอร์ฟุตบอลของ ${userTeam.name}! เริ่มในโลกจำลอง — Master League คือ ${legendLeagueLabel(legendLeagueId)} (ทีม/ซูเปอร์สตาร์ล้อโลกจริง)`, `งบเริ่มต้น ${formatMoney(STARTING_BUDGET)}`, `สร้างมูลค่าสโมสรรวมถึง ${formatMoney(ONLINE_UNLOCK_TEAM_VALUE)} เพื่อปลดล็อกออนไลน์`, `เริ่มต้นที่ Challenger League ไต่อันดับเพื่อเลื่อนชั้นสู่ Master League`, `👥 ฐานแฟนบอลเริ่มต้น 2,500 คน`, `🎰 ได้เหรียญตู้การ์ดสตาฟวันละ ${DAILY_MACHINE_COIN_GRANT} + จบฤดูกาลอีก ${SEASON_END_MACHINE_COINS} (สะสมข้ามวันได้)`],
  };
  const newsItem = buildNewClubWorldNews({
    season: career.season,
    day: career.day,
    clubName: userTeam.name,
    managerName,
  });
  career.worldNews = [newsItem];
  career.flashWorldNewsId = newsItem.id;
  return bootstrapStarterStaff(career);
}

/* ============================== UI PRIMITIVES (FC web theme) ============================== */
function Panel({ children, style, accent, onClick, plain, className }) {
  const cls = ["fc-panel", plain && "fc-panel--plain", accent && "fc-panel--accent", className].filter(Boolean).join(" ");
  return (
    <div
      onClick={onClick}
      className={cls}
      style={accent ? { "--fc-panel-accent": accent, ...style } : style}
    >
      {children}
    </div>
  );
}
function SectionLabel({ children, style, sub }) {
  return (
    <div className="fc-section" style={style}>
      <div className="fc-section-title fc-display">{children}</div>
      {sub && <div className="fc-section-sub">{sub}</div>}
    </div>
  );
}

/** เลื่อนแนวน/แนวตั้งโดยไม่โชว์ scrollbar — ลากเมาส์หรือใช้ลูกกลิ้ง */
function DragScroll({ children, axis = "x", style, className = "", wheelOnly = false, ...rest }) {
  const ref = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e) => {
      if (axis === "x" && el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [axis]);

  const scrollClass = axis === "y" ? "fc-scroll-y" : "fc-scroll-x";
  const cls = [scrollClass, "fc-hide-scrollbar", !wheelOnly && "fc-drag-scroll", wheelOnly && "fc-drag-scroll--wheel-only", className].filter(Boolean).join(" ");
  const hideBarStyle = { scrollbarWidth: "none", msOverflowStyle: "none" };

  const onPointerDown = (e) => {
    if (wheelOnly || e.button !== 0) return;
    if (e.target.closest(DRAG_SCROLL_SKIP)) return;
    const el = ref.current;
    if (!el) return;
    dragRef.current = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
    el.classList.add("fc-drag-scroll--active");
    el.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const el = ref.current;
    const d = dragRef.current;
    if (axis === "x") el.scrollLeft = d.sl - (e.clientX - d.x);
    else el.scrollTop = d.st - (e.clientY - d.y);
  };
  const endDrag = (e) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    const el = ref.current;
    el?.classList.remove("fc-drag-scroll--active");
    try { el?.releasePointerCapture(e.pointerId); } catch (_) { /* noop */ }
  };

  return (
    <div
      ref={ref}
      className={cls}
      style={{ ...hideBarStyle, ...style }}
      onPointerDown={wheelOnly ? undefined : onPointerDown}
      onPointerMove={wheelOnly ? undefined : onPointerMove}
      onPointerUp={wheelOnly ? undefined : endDrag}
      onPointerCancel={wheelOnly ? undefined : endDrag}
      {...rest}
    >
      {children}
    </div>
  );
}

function CardListScroll({ children, style }) {
  return <DragScroll axis="y" style={{ ...CARD_LIST_SCROLL, ...style }}>{children}</DragScroll>;
}

function fmBtnPrimary(extra = {}) {
  return {
    width: "100%", background: "#fff", color: "#050608", border: "none", borderRadius: 4,
    padding: "12px 0", fontFamily: DISPLAY_FONT, fontSize: 13, fontWeight: 700, cursor: "pointer",
    letterSpacing: 1.2, textTransform: "uppercase", ...extra,
  };
}
function fmBtnGhost(extra = {}) {
  return {
    flex: 1, background: "transparent", color: C.chalk, border: "1px solid rgba(255,255,255,0.35)",
    borderRadius: 4, padding: "10px 0", fontFamily: DISPLAY_FONT, fontSize: 12, fontWeight: 700,
    cursor: "pointer", letterSpacing: 0.8, textTransform: "uppercase", ...extra,
  };
}
function btnStyle(bg, fg) { return fmBtnPrimary({ background: bg, color: fg }); }

function StarGlyphs({ count, max = STAR_MAX, hollow = false, size = 10 }) {
  const c = hollow ? C.textDim : starColor(count);
  return (
    <span style={{ display: "inline-flex", gap: 1, lineHeight: 1 }} aria-label={`${count} ดาว`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ fontSize: size, color: i < count ? c : C.steel, opacity: i < count ? 1 : 0.35 }}>
          {hollow ? "☆" : "★"}
        </span>
      ))}
    </span>
  );
}
function PlayerStarsRow({ p, compact }) {
  const { current, potential, isWonderkid } = getPlayerStarProfile(p);
  if (compact) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <StarGlyphs count={current} size={9} />
        {potential > current && <span style={{ fontSize: 9, color: C.textDim }}>→<StarGlyphs count={potential} hollow size={9} /></span>}
      </span>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 9, color: C.textDim, minWidth: 36 }}>ตอนนี้</span>
        <StarGlyphs count={current} size={11} />
        <span style={{ fontSize: 9, color: starColor(current), fontWeight: 600 }}>{STAR_LABEL_TH[current]}</span>
        <span style={{ fontSize: 9, color: C.textDim, fontFamily: MONO_FONT }}>({p.rating})</span>
      </div>
      {potential > current && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9, color: C.textDim, minWidth: 36 }}>ศักยภาพ</span>
          <StarGlyphs count={potential} hollow size={11} />
          <span style={{ fontSize: 9, color: C.textDim, fontFamily: MONO_FONT }}>({p.potential})</span>
        </div>
      )}
      {isWonderkid && <span style={{ fontSize: 9, color: C.purple, fontWeight: 600 }}>🌟 Wonderkid</span>}
    </div>
  );
}

function AccountMenuChip({ accountUser, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!accountUser) return null;
  const label = accountUser.username || accountUser.displayName?.slice(0, 10) || "player";

  return (
    <div className="fc-account-menu" ref={ref}>
      <button
        type="button"
        className="fc-header-chip fc-account-menu-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="บัญชี"
      >
        @{label} ▾
      </button>
      {open && (
        <div className="fc-account-menu-drop" role="menu">
          <div className="fc-account-menu-name">
            {accountUser.displayName || accountUser.username || "ผู้เล่น"}
            {accountUser.username && (
              <span className="fc-account-menu-user">@{accountUser.username}</span>
            )}
          </div>
          <button
            type="button"
            className="fc-account-menu-logout"
            role="menuitem"
            onClick={() => { setOpen(false); onLogout?.(); }}
          >
            ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  );
}

function FMHeader({ uTeam, career, userLeague, budget, wageBill, sockerCoins = 0, onOpenShop, uiLang = "th", accountUser, onLogout }) {
  const day = Math.min(career.day, userLeague.fixtures.length);
  const total = userLeague.fixtures.length;
  return (
    <header className="fc-header">
      <div className="fc-header-row">
        <ClubBadge team={uTeam} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fc-header-team">{uTeam.name}</div>
          <div className="fc-header-meta">{userLeague.name} · ฤดูกาล {career.season}</div>
        </div>
        <button type="button" onClick={onOpenShop} className="fc-header-chip">
          🪙 {sockerCoins}
        </button>
        {accountUser && (
          <AccountMenuChip accountUser={accountUser} onLogout={onLogout} />
        )}
        <a
          href={GAME_DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="fc-header-chip fc-header-discord"
          title={GAME_DISCORD_HINT}
        >
          💬 Discord
        </a>
        <div style={{ textAlign: "right" }}>
          <div className="fc-header-budget">{formatMoney(budget)}</div>
          <div className="fc-header-meta">ค่าเหนื่อย {formatMoney(wageBill)}/วัน</div>
        </div>
      </div>
      <div className="fc-header-sub">
        <span>วัน {day}/{total}</span>
        <span>·</span>
        <span>{career.playMode === "online" ? t(uiLang, "mode.online") : t(uiLang, "mode.sandbox")}</span>
        {uTeam.manager && (
          <>
            <span>·</span>
            <span style={{ color: (staffEntityStars(uTeam.manager) || 1) >= 4 ? C.gold : C.chalk }}>
              ◆ {uTeam.manager.name.split(" ").pop()} {staffEntityStars(uTeam.manager) ? `${staffEntityStars(uTeam.manager)}★` : ""}
            </span>
          </>
        )}
        <span className="fc-header-short">{uTeam.short}</span>
        <span style={{ marginLeft: 8, opacity: 0.45, fontSize: 9 }}>v{GAME_VERSION}</span>
      </div>
    </header>
  );
}

function FMStandingsTable({ standings, uTeamId, compact }) {
  const rows = compact ? standings : standings;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: MONO_FONT, fontVariantNumeric: "tabular-nums" }}>
      <thead>
        <tr style={{ color: C.textDim, fontSize: 9, textTransform: "uppercase", borderBottom: `1px solid ${C.steel}` }}>
          <th style={{ padding: "5px 6px", textAlign: "left", fontWeight: 600 }}>#</th>
          <th style={{ padding: "5px 4px", textAlign: "left", fontWeight: 600 }}>ทีม</th>
          <th style={{ padding: "5px 2px", textAlign: "center" }}>น</th>
          <th style={{ padding: "5px 2px", textAlign: "center" }}>ช</th>
          <th style={{ padding: "5px 2px", textAlign: "center" }}>+/-</th>
          <th style={{ padding: "5px 6px", textAlign: "center" }}>คะแนน</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((s, i) => {
          const isUser = s.team.id === uTeamId;
          return (
            <tr key={s.team.id} style={{ background: isUser ? C.fmRowHi : "transparent", borderTop: `1px solid ${C.steel}` }}>
              <td style={{ padding: "4px 6px", color: C.textDim }}>{i + 1}</td>
              <td style={{ padding: "4px 4px", fontFamily: FM_FONT, fontWeight: isUser ? 700 : 400, color: isUser ? C.amber : C.chalk, fontSize: 11 }}>{s.team.short}</td>
              <td style={{ textAlign: "center", color: C.textDim }}>{s.played}</td>
              <td style={{ textAlign: "center", color: C.textDim }}>{s.w}</td>
              <td style={{ textAlign: "center", color: s.gd > 0 ? C.good : s.gd < 0 ? C.crimson : C.textDim }}>{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
              <td style={{ textAlign: "center", color: C.amber, fontWeight: 700 }}>{s.pts}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function RatingBadge({ value }) {
  const bg = value >= 78 ? C.good : value >= 60 ? C.amber : C.crimson;
  return <div style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: 13, color: "#08150e", background: bg, borderRadius: 7, width: 30, height: 22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,.3)" }}>{value}</div>;
}
/* renders any team's crest: a rounded badge with a gradient fill + one of the 10 selectable icons */
function TeamChip({ team }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 64 }}>
      <ClubBadge team={team} size={36} />
      <div style={{ fontFamily: DISPLAY_FONT, fontSize: 11, fontWeight: 700, color: team.color || C.chalk, textAlign: "center", lineHeight: 1.2 }}>{team.short}</div>
    </div>
  );
}

/* ---------- Live scoreboard — โทนเขียวธีมเกม (FM pitch palette) ---------- */
const SCOREBOARD = {
  bar: C.panel,
  barDeep: C.panel2,
  border: C.steel,
  accent: C.good,
  accentDim: "#2d6b42",
  scoreBg: C.chalk,
  scoreText: C.pitchDark,
  scoreSep: C.good,
  scoreFlash: C.amber,
  label: C.chalk,
  labelDim: C.textDim,
};

function LiveScoreHexBadge({ team, size = 74 }) {
  const h = Math.round(size * 1.14);
  return (
    <div style={{ width: size, height: h, position: "relative", flexShrink: 0, filter: "drop-shadow(0 5px 8px rgba(0,0,0,.45))" }}>
      <svg viewBox="0 0 100 114" width={size} height={h} style={{ display: "block" }}>
        <polygon points="50,1 99,29 99,85 50,113 1,85 1,29" fill={C.panel2} stroke={C.steelLight} strokeWidth="1.8" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "20% 24% 22%" }}>
        <ClubBadge team={team} size={Math.round(size * 0.52)} />
      </div>
    </div>
  );
}

function LiveScoreboard({ homeTeam, awayTeam, homeGoals, awayGoals, minute, half, isHalftime, goalFlash }) {
  const homeFlash = goalFlash?.team === "home";
  const awayFlash = goalFlash?.team === "away";
  const statusLabel = isHalftime ? "พักครึ่ง" : `สด · ${half === 1 ? "ครึ่งแรก" : "ครึ่งหลัง"} · ${minute}'`;

  return (
    <div style={{ width: "100%", marginBottom: 12, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 0, filter: "drop-shadow(0 6px 14px rgba(0,0,0,.35))" }}>
      <LiveScoreHexBadge team={homeTeam} />

      <div style={{ flex: 1, minWidth: 0, maxWidth: 520, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{
          background: `linear-gradient(180deg, ${C.steelLight}, ${SCOREBOARD.bar})`,
          color: SCOREBOARD.label, fontSize: 9, fontWeight: 800, letterSpacing: 1.4,
          padding: "3px 16px 2px", borderRadius: "4px 4px 0 0", textTransform: "uppercase", fontFamily: FM_FONT,
          border: `1px solid ${SCOREBOARD.border}`, borderBottom: "none", marginBottom: -1, zIndex: 2,
        }}>
          {!isHalftime && <span style={{ color: SCOREBOARD.accent, marginRight: 6 }}>●</span>}
          {statusLabel}
        </div>

        <div style={{ display: "flex", width: "100%", alignItems: "stretch", minHeight: 52 }}>
          <div style={{
            flex: 1, position: "relative",
            background: `linear-gradient(180deg, ${SCOREBOARD.bar}, ${SCOREBOARD.barDeep})`,
            display: "flex", alignItems: "center", justifyContent: "flex-end",
            padding: "8px 10px 10px 8px", overflow: "hidden",
            borderTop: `1px solid ${SCOREBOARD.border}`,
          }}>
            <div style={{
              position: "absolute", left: 0, right: 0, bottom: 0, height: 6,
              background: `linear-gradient(90deg, ${SCOREBOARD.accentDim}, ${SCOREBOARD.accent})`,
              borderRadius: "0 0 0 4px",
            }} />
            <span style={{
              fontFamily: DISPLAY_FONT, fontSize: 13, fontWeight: 800, color: SCOREBOARD.label, letterSpacing: 0.6,
              textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
            }}>{homeTeam.short || homeTeam.name}</span>
          </div>

          <div style={{
            flexShrink: 0, background: SCOREBOARD.scoreBg, display: "flex", alignItems: "center", justifyContent: "center",
            padding: "6px 14px 8px", minWidth: 108, borderTop: `3px solid ${SCOREBOARD.accent}`,
            boxShadow: `inset 0 0 0 1px ${SCOREBOARD.border}`,
          }}>
            <span style={{
              fontFamily: DISPLAY_FONT, fontSize: 30, fontWeight: 900, color: SCOREBOARD.scoreText, letterSpacing: 2,
              lineHeight: 1, transform: homeFlash || awayFlash ? "scale(1.08)" : "scale(1)",
              transition: "transform .2s ease",
              textShadow: homeFlash || awayFlash ? `0 0 14px ${SCOREBOARD.scoreFlash}` : "none",
            }}>
              {String(homeGoals).padStart(2, "0")}
              <span style={{ color: SCOREBOARD.scoreSep, fontWeight: 700, margin: "0 4px", fontSize: 22 }}>—</span>
              {String(awayGoals).padStart(2, "0")}
            </span>
          </div>

          <div style={{
            flex: 1, position: "relative",
            background: `linear-gradient(180deg, ${SCOREBOARD.bar}, ${SCOREBOARD.barDeep})`,
            display: "flex", alignItems: "center", justifyContent: "flex-start",
            padding: "8px 8px 10px 10px", overflow: "hidden",
            borderTop: `1px solid ${SCOREBOARD.border}`,
          }}>
            <div style={{
              position: "absolute", left: 0, right: 0, bottom: 0, height: 6,
              background: `linear-gradient(90deg, ${SCOREBOARD.accent}, ${SCOREBOARD.accentDim})`,
              borderRadius: "0 0 4px 0",
            }} />
            <span style={{
              fontFamily: DISPLAY_FONT, fontSize: 13, fontWeight: 800, color: SCOREBOARD.label, letterSpacing: 0.6,
              textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
            }}>{awayTeam.short || awayTeam.name}</span>
          </div>
        </div>
      </div>

      <LiveScoreHexBadge team={awayTeam} />
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
function formatBuildRemaining(ms) {
  if (ms <= 0) return "เสร็จแล้ว";
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} ชม. ${m} นาที` : `${m} นาที`;
}
/** แถบแสดงสถานะ "กำลังก่อสร้าง" — นับถอยหลังเองทุกวินาที ไม่ต้องรอ parent re-render */
function ConstructionBadge({ queued }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  if (!queued) return null;
  const total = queued.finishAt - queued.startedAt;
  const elapsed = clamp(now - queued.startedAt, 0, total);
  const remaining = queued.finishAt - now;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 10.5, color: C.amber, fontWeight: 700, marginBottom: 3 }}>🏗️ กำลังก่อสร้าง → ระดับ {queued.toLevel} · เหลือ {formatBuildRemaining(remaining)}</div>
      <MiniBar value={(elapsed / total) * 100} color={C.amber} />
    </div>
  );
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

function radarPolarPoint(cx, cy, r, angleRad) {
  return [cx + r * Math.sin(angleRad), cy - r * Math.cos(angleRad)];
}

/** กราฟเรดาร์ (spider chart) จริง — ใช้เทียบสเตตนักเตะแบบเห็นภาพรวมทีเดียว (0-100 ต่อแกน) */
function RadarChartSVG({ stats, size = 210, color = C.amber, compareStats = null, compareColor = C.blue }) {
  const entries = Object.entries(stats);
  const n = entries.length;
  if (n < 3) return null;
  const cx = 100;
  const cy = 100;
  const R = 74;
  const angleStep = (Math.PI * 2) / n;
  const toPoints = (vals) => entries.map(([k], i) => radarPolarPoint(cx, cy, (clamp(vals[k] ?? 0, 0, 100) / 100) * R, i * angleStep));
  const dataPoints = toPoints(stats);
  const comparePoints = compareStats ? toPoints(compareStats) : null;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size}>
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon
          key={ring}
          points={entries.map((_, i) => radarPolarPoint(cx, cy, ring * R, i * angleStep).join(",")).join(" ")}
          fill="none" stroke={C.steel} strokeOpacity={0.55} strokeWidth={1}
        />
      ))}
      {entries.map((_, i) => {
        const [x, y] = radarPolarPoint(cx, cy, R, i * angleStep);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={C.steel} strokeOpacity={0.55} strokeWidth={1} />;
      })}
      {comparePoints && (
        <polygon points={comparePoints.map((p) => p.join(",")).join(" ")} fill={compareColor} fillOpacity={0.18} stroke={compareColor} strokeWidth={1.5} />
      )}
      <polygon points={dataPoints.map((p) => p.join(",")).join(" ")} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={2} />
      {entries.map(([label, v], i) => {
        const [lx, ly] = radarPolarPoint(cx, cy, R + 18, i * angleStep);
        return (
          <text key={label} x={lx} y={ly} fontSize={8.5} fill={C.chalk} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO_FONT}>
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function playerRadarStats(p) {
  return {
    "โดยรวม": p.rating,
    "จ่ายบอล": (p.attrs?.passing || 0) * 5,
    "ยิงประตู": (p.attrs?.finishing || 0) * 5,
    "พละกำลัง": (p.attrs?.strength || 0) * 5,
    "ปะทะ": (p.attrs?.tackling || 0) * 5,
    "ความเร็ว": (p.attrs?.pace || 0) * 5,
    "เลี้ยงบอล": (p.attrs?.dribbling || 0) * 5,
  };
}

/** popup โชว์สเตตนักเตะแบบละเอียด + กราฟเรดาร์ — เปิดจากคลิกชื่อในหน้า Squad/Tactics
 *  squad (optional): รายชื่อนักเตะในทีมเดียวกัน — ถ้ามีจะเปิดให้เลือกนักเตะอีกคนมาเทียบกราฟซ้อนกันได้ */
function PlayerDetailModal({ player: p, onClose, squad = null }) {
  const [compareId, setCompareId] = useState("");
  if (!p) return null;
  const radarStats = playerRadarStats(p);
  const comparePlayer = compareId ? squad?.find((s) => s.id === compareId) : null;
  const compareStats = comparePlayer ? playerRadarStats(comparePlayer) : null;
  const compareOptions = (squad || []).filter((s) => s.id !== p.id);
  // ใช้ portal ต่อกับ document.body โดยตรง — กัน position:fixed ถูกดักด้วย backdrop-filter/transform ของ .fc-panel
  // บรรพบุรุษ (บั๊กที่เจอจริง: ป๊อปอัพ "จม" กลายเป็น inline อยู่ในการ์ดแทนที่จะลอยเต็มจอ ตอนเปิดจากในตลาดประมูล)
  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <Panel style={{ maxWidth: 420, width: "100%", maxHeight: "88vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{p.name}{comparePlayer && <span style={{ color: C.blue }}> vs {comparePlayer.name}</span>}</div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{playerPosTH(p)} · อายุ {p.age} · เรตติ้ง {p.rating}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.textDim, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        {compareOptions.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
            <span style={{ fontSize: 9.5, color: C.textDim }}>เทียบกับ:</span>
            <select value={compareId} onChange={(e) => setCompareId(e.target.value)} style={{
              flex: 1, fontSize: 10.5, padding: "5px 6px", borderRadius: 6, border: `1px solid ${C.steel}`,
              background: C.panel2, color: C.chalk,
            }}>
              <option value="">— ไม่เทียบ —</option>
              {compareOptions.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({playerPosTH(s)})</option>
              ))}
            </select>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", margin: "6px 0 4px" }}>
          <RadarChartSVG stats={radarStats} compareStats={compareStats} />
        </div>
        {comparePlayer && (
          <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 6, fontSize: 9.5 }}>
            <span style={{ color: C.amber }}>● {p.name}</span>
            <span style={{ color: C.blue }}>● {comparePlayer.name}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><PlayerStarsRow p={p} /></div>
        {(p.altPos || []).length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, color: C.textDim, alignSelf: "center" }}>เล่นได้:</span>
            {p.altPos.map((ap) => (
              <span key={ap} style={{ fontSize: 9.5, fontWeight: 700, color: C.chalk, background: C.panel2, border: `1px solid ${C.steel}`, borderRadius: 5, padding: "2px 6px" }}>{ap}</span>
            ))}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 12, fontFamily: MONO_FONT, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.chalk }}>{p.careerApps || 0}</div>
            <div style={{ fontSize: 8.5, color: C.textDim }}>ลงเล่น (รวม)</div>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.chalk }}>{p.careerGoals || 0}</div>
            <div style={{ fontSize: 8.5, color: C.textDim }}>ประตู (รวม)</div>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.good }}>{p.seasonGoals || 0}</div>
            <div style={{ fontSize: 8.5, color: C.textDim }}>ประตูฤดูนี้</div>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: p.seasonYellows >= 3 ? C.amber : C.chalk }}>{p.seasonYellows || 0}🟨</div>
            <div style={{ fontSize: 8.5, color: C.textDim }}>ใบเหลืองฤดูนี้</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.textDim, marginBottom: 2 }}><span>มูด</span><span style={{ fontFamily: MONO_FONT, color: C.chalk }}>{p.morale}</span></div>
            <MiniBar value={p.morale} color={p.morale >= 65 ? C.good : p.morale >= 40 ? C.amber : C.crimson} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.textDim, marginBottom: 2 }}><span>สภาพร่างกาย</span><span style={{ fontFamily: MONO_FONT, color: C.chalk }}>{p.stamina}</span></div>
            <MiniBar value={p.stamina} color={p.stamina >= 65 ? C.good : p.stamina >= 40 ? C.amber : C.crimson} />
          </div>
        </div>
        {p.personality && PLAYER_PERSONALITIES[p.personality] && (
          <div style={{ fontSize: 10.5, color: C.textDim, marginBottom: 12, textAlign: "center" }}>
            บุคลิก: <b style={{ color: C.chalk }}>{PLAYER_PERSONALITIES[p.personality].th}</b> — {PLAYER_PERSONALITIES[p.personality].descTh}
          </div>
        )}
        {Object.keys(ATTR_GROUPS).map((grp) => (
          <div key={grp} style={{ marginTop: 10 }}>
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
      </Panel>
    </div>,
    document.body,
  );
}

/* ============================== MAIN APP ============================== */
export default function App({
  onMigrateToServer,
  accountUser = null,
  onOpenAuth,
  onOpenOnlinePortal,
  onSyncOnlineServer,
  onLogout,
} = {}) {
  const [profile, setProfile] = useState(null);
  const [career, setCareer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [marketSub, setMarketSub] = useState("trade");
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [leaguePickOpen, setLeaguePickOpen] = useState(false);
  const [chosenPlayMode, setChosenPlayMode] = useState(null); // เลือกหลัง login ก่อนสร้างทีมครั้งแรก: "sandbox" | "online"
  const [managerHireConfirm, setManagerHireConfirm] = useState(null);
  const [mergeReport, setMergeReport] = useState(null); // { attempts: [{type, stars, success, card, chance}], auto: bool }
  const [booting, setBooting] = useState(false);
  const [loadMsg, setLoadMsg] = useState("กำลังโหลด...");
  const [splashDone, setSplashDone] = useState(false);
  const [gameEntered, setGameEntered] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const toastTimer = useRef(null);
  const saveUsername = accountUser?.username || "";
  const saveKeysRef = useRef({ profileKey: "profile_v1", careerKey: "career_v3", introKey: INTRO_SEEN_KEY });
  saveKeysRef.current = {
    profileKey: profileSaveKey(saveUsername),
    careerKey: careerSaveKey(saveUsername),
    introKey: introSeenKey(saveUsername),
  };

  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, []);
  // ปิดคิวก่อสร้างห้อง/สนามที่ครบเวลาจริงแล้ว — เช็คทุก 20 วิขณะเปิดแอปค้างไว้ (ปิดแอปไปก็ยังปิดคิวได้ตอนโหลดเซฟใหม่ผ่าน normalizeCareerSave)
  useEffect(() => {
    const iv = setInterval(() => {
      updateCareer((prev) => {
        if (!prev || !(prev.constructionQueue || []).length) return prev;
        const c = JSON.parse(JSON.stringify(prev));
        processConstructionQueue(c);
        return c;
      });
    }, 20000);
    return () => clearInterval(iv);
  }, []);
  // นับคนออนไลน์ — heartbeat ไม่ระบุตัวตนทุก 45 วิ ขณะเปิดแอปค้างอยู่ (ไม่ว่าจะอยู่หน้าไหนในเกม)
  // sessionId สุ่มใหม่ทุกครั้งที่โหลดหน้าเว็บ ไม่ผูกกับผู้เล่นจริง แค่ใช้นับจำนวนแท็บที่เปิดอยู่
  useEffect(() => {
    const sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    function beat() {
      fetch("/api/heartbeat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {}); // เงียบไว้ — ห้ามกระทบเกมถ้า endpoint ล่ม/ไม่มี
    }
    beat();
    const iv = setInterval(beat, 45000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => setSplashDone(true), 2000);
    return () => clearTimeout(t);
  }, [loading]);
  useEffect(() => {
    if (!saveUsername) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setLoadMsg("กำลังโหลด...");
    setProfile(null);
    setCareer(null);
    setIntroDone(false);
    setSplashDone(false);
    // ห้ามเรียก migrateLegacySavesToUser(saveUsername) ตรงนี้ — เคยเป็นบั๊กจริง: มันก็อปปี้เซฟเก่า
    // แบบไม่ผูก username (career_v3/profile_v1 ตัวเปล่าจากยุคก่อนมีระบบบัญชี) ให้กับ "ทุกไอดีใหม่"
    // ที่ล็อกอินครั้งแรกบนเบราว์เซอร์เดียวกัน ทำให้ไอดีใหม่เห็นเซฟของไอดีอื่นที่เคยทดสอบมาก่อน
    rememberLastUsername(saveUsername);
    const profileKey = profileSaveKey(saveUsername);
    const careerKey = careerSaveKey(saveUsername);

    (async () => {
      try {
        const pr = await window.storage.get(profileKey);
        if (pr && pr.value) {
          const p = JSON.parse(pr.value);
          if (p.sockerCoins == null) p.sockerCoins = 0;
          if (p.inventory == null) p.inventory = {};
          if (p.shopBuyDay == null) p.shopBuyDay = "";
          if (p.shopBuyCount == null) p.shopBuyCount = 0;
          if (!p.uiLang) p.uiLang = getDefaultGameUiLang();
          applyBetaProfileGrant(p);
          if (!cancelled) {
            setProfile(p);
            window.storage.set(profileKey, JSON.stringify(p)).catch(() => {});
          }
        }
      } catch (e) { /* ignore */ }
      try {
        const res = await window.storage.get(careerKey);
        if (res && res.value) {
          // parse แยกออกมาต่างหาก — ถ้า JSON เองเสียจริง (กู้ไม่ได้อยู่แล้ว) ถึงจะลบทิ้ง
          // ส่วน error อื่นๆ ที่เกิดหลังจากนี้ (บั๊กโค้ดเกม/migrate พัง) ต้อง "ไม่ลบเซฟ" เด็ดขาด
          // (บั๊กที่เจอจริง: เคยมีบั๊กวนลูปไม่รู้จบระหว่างจำลองวันที่ขาดหายไป ทำให้ error หลุดมาที่ catch
          // ข้างนอกแล้วลบเซฟผู้เล่นทิ้งทั้งที่ตัวเซฟเองไม่ได้เสีย แค่โค้ดมีบั๊ก)
          let c;
          try {
            c = JSON.parse(res.value);
          } catch (parseErr) {
            console.error("career JSON parse failed — save จริงๆ เสีย ลบทิ้ง", parseErr);
            await window.storage.delete(careerKey);
            throw parseErr;
          }
          const elapsedHours = (Date.now() - (c.lastSeenAt || Date.now())) / 3600000;
          const daysToSim = Math.min(Math.floor(elapsedHours), 7);
          if (daysToSim >= 1) {
            if (!cancelled) setLoadMsg(`สรุปผล ${daysToSim} วันที่ไม่อยู่...`);
            const startDay = c.day, startSeason = c.season;
            const logBefore = c.log;
            for (let i = 0; i < daysToSim; i++) c = simulateOneDayFast(c);
            const addedCount = c.log.length - logBefore.length;
            const newEntries = addedCount > 0 ? c.log.slice(0, addedCount) : [];
            const importantMarks = ["🎉", "⬇️", "⬆️", "😔", "🎯", "❌", "📄", "🏆", "🥈"];
            const highlights = newEntries.filter((l) => importantMarks.some((m) => l.startsWith(m))).slice(0, 8);
            const headline = `⏱ ระหว่างที่คุณไม่อยู่ ผ่านไป ${daysToSim} วันเกม (ฤดูกาล ${startSeason} วัน ${startDay} → ฤดูกาล ${c.season} วัน ${c.day})`;
            c.log = [headline, ...highlights, ...logBefore].slice(0, 60);
          }
          if (!cancelled) setLoadMsg("เตรียมข้อมูลลีก...");
          c.lastSeenAt = Date.now();
          c = migrateCareerSave(c);
          if (!cancelled) {
            setCareer(c);
            setMarketSub(c.uiPrefs?.marketSub === "squad" ? "trade" : (c.uiPrefs?.marketSub || "trade"));
            window.storage.set(careerKey, JSON.stringify(c)).catch(() => {});
          }
        }
      } catch (e) {
        // ไม่ลบเซฟที่นี่ — เซฟที่ parse ผ่านแล้วแปลว่าข้อมูลยังอยู่ครบ แค่โค้ดตอนประมวลผลมีบั๊ก
        // ปล่อยให้ค้างเป็น career=null (โชว์หน้าสร้างทีมชั่วคราว) ดีกว่าลบข้อมูลจริงทิ้งถาวรโดยกู้คืนไม่ได้
        console.error("career load failed (เซฟไม่ได้ถูกลบ รอแก้บั๊กแล้วลองเข้าใหม่)", e);
        if (!cancelled) showToast("โหลดเซฟไม่สำเร็จ — ข้อมูลยังอยู่ ลองรีเฟรชอีกครั้ง หรือแจ้งบั๊กใน Discord");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [saveUsername]);

  useEffect(() => {
    if (loading) return;
    if (profile || career) {
      setIntroDone(true);
      return;
    }
    try {
      if (localStorage.getItem(introSeenKey(saveUsername)) === "1") setIntroDone(true);
    } catch { /* ignore */ }
  }, [loading, profile, career, saveUsername]);

  // รับได้ทั้ง object ตรงๆ หรือ updater function (prev => next) — แบบหลังอ่านค่าล่าสุดจาก setProfile เอง
  // ไม่ใช่จาก closure ข้างนอกที่อาจค้าง กันบั๊กที่เจอจริง: กดใช้ไอเทม/ซื้อของติดกันเร็วๆ แล้วนับซ้ำ/หาย
  function saveProfile(updater) {
    setProfile((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      window.storage.set(saveKeysRef.current.profileKey, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }
  function setUiLang(lang) {
    saveProfile((prev) => prev ? { ...prev, uiLang: lang === "en" ? "en" : "th" } : prev);
  }

  function addSockerCoins(amount) {
    let resultCoins = 0;
    saveProfile((prev) => {
      const next = { ...prev, sockerCoins: (prev?.sockerCoins || 0) + amount };
      resultCoins = next.sockerCoins;
      return next;
    });
    return resultCoins;
  }

  function purchaseCoinPack(packId) {
    const pack = COIN_PACKAGES.find((p) => p.id === packId);
    if (!pack) return;
    const total = addSockerCoins(pack.coins);
    showToast(`ได้รับ ${pack.coins} Socker Coin! (รวม ${total} เหรียญ)`);
  }

  function buyShopItemToBag(itemId) {
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) return;
    const today = new Date().toDateString();
    // เช็คโควตา/เหรียญ + หักเหรียญ/เพิ่มไอเทม ทำทั้งหมดจาก "prev" ภายใน setProfile เดียวกัน (ไม่ใช้ profile
    // จาก closure ข้างนอก) กันบั๊กที่เจอจริง: กดซื้อติดกันเร็วๆ แล้วนับโควตา/หักเหรียญไม่ตรง
    const buyOut = { applied: false, reason: null, left: 0 };
    saveProfile((prev) => {
      const boughtToday = shopBuyCountToday(prev);
      if (boughtToday >= SHOP_DAILY_BUY_LIMIT) {
        buyOut.reason = `ซื้อได้วันละ ${SHOP_DAILY_BUY_LIMIT} ครั้ง (ครบแล้ววันนี้)`;
        return prev;
      }
      const coins = prev?.sockerCoins || 0;
      if (coins < item.coinCost) {
        buyOut.reason = `Socker Coin ไม่พอ (ต้องการ ${item.coinCost} เหรียญ)`;
        return prev;
      }
      const nextProfile = {
        ...prev,
        inventory: { ...(prev?.inventory || {}) },
        sockerCoins: coins - item.coinCost,
        shopBuyDay: today,
        shopBuyCount: (prev?.shopBuyDay === today ? (prev?.shopBuyCount || 0) : 0) + 1,
      };
      buyOut.left = SHOP_DAILY_BUY_LIMIT - nextProfile.shopBuyCount;
      if (!item.instant) nextProfile.inventory[itemId] = (nextProfile.inventory[itemId] || 0) + 1;
      buyOut.applied = true;
      return nextProfile;
    });
    if (!buyOut.applied) {
      showToast(buyOut.reason || "ซื้อไม่ได้");
      return;
    }
    if (item.instant) {
      // ใช้ผลทันที ไม่เข้ากระเป๋า — แก้ career โดยตรงตาม itemId
      updateCareer((prev) => {
        const c = JSON.parse(JSON.stringify(prev));
        if (itemId === "staff_ticket") {
          ensureStaffCardFields(c);
          c.machineCoins += MACHINE_PULL_COST;
          c.log = [`🎰 ได้เหรียญตู้พิเศษ ${MACHINE_PULL_COST} (ซื้อจากร้านค้า)`, ...c.log];
        } else if (itemId === "camp_skip") {
          c.trainingCampCooldownDay = c.day;
          c.log = [`⏩ ใช้บัตรข้ามคูลดาวน์แคมป์ซ้อม — จัดแคมป์ได้ทันที`, ...c.log];
        } else if (itemId === "termination_waiver") {
          c.staffTerminationWaiver = true;
          c.log = [`📜 ได้รับสิทธิ์ยกเว้นค่าปรับเลิกจ้างสตาฟครั้งถัดไป`, ...c.log];
        }
        return c;
      });
      showToast(`ใช้ ${item.name} แล้ว! (ซื้อได้อีก ${buyOut.left} ครั้งวันนี้)`);
      return;
    }
    showToast(`${item.name} เข้ากระเป๋าแล้ว! (ซื้อได้อีก ${buyOut.left} ครั้งวันนี้)`);
  }

  // เช็คของในกระเป๋า + หักออก ทำภายใน "prev" ของ setProfile เดียวกันเสมอ (ไม่ใช้ profile จาก closure ข้างนอก)
  // กันบั๊กที่เจอจริง: กดใช้ไอเทมติดกันเร็วๆ (เช่นรักษา 2 คนติดกัน) แล้วนับซ้ำ/หักไม่ตรงจนได้ผลฟรี
  function consumeInventoryItem(itemId) {
    const out = { applied: false };
    saveProfile((prev) => {
      const count = inventoryCount(prev, itemId);
      if (count <= 0) return prev;
      const inv = { ...(prev?.inventory || {}) };
      inv[itemId] = count - 1;
      out.applied = true;
      return { ...prev, inventory: inv };
    });
    return out.applied;
  }

  function useItemFromBag(itemId, playerId) {
    if (itemId === "morale_boost") {
      const target = career.players.find((p) => p.id === playerId && p.teamId === career.userTeamId);
      if (!target) { showToast("ไม่พบนักเตะ"); return; }
      if (!consumeInventoryItem(itemId)) { showToast("ไม่มีไอเทมในกระเป๋า"); return; }
      updateCareer((prev) => {
        const c = JSON.parse(JSON.stringify(prev));
        const p = c.players.find((pl) => pl.id === playerId);
        if (!p) return c;
        p.morale = Math.min(100, (p.morale || 0) + 15);
        c.log = [`😊 ใช้บูสต์ขวัญกำลังใจกับ ${p.name} — ขวัญกำลังใจ ${p.morale}`, ...c.log];
        return c;
      });
      showToast(`เพิ่มขวัญกำลังใจ ${target.name} แล้ว!`);
      return;
    }
    if (itemId !== "injury_pack") return;
    const target = career.players.find((p) => p.id === playerId && p.teamId === career.userTeamId);
    if (!target || target.injuryDays <= 0) { showToast("นักเตะคนนี้ไม่ได้บาดเจ็บ"); return; }
    if (!consumeInventoryItem(itemId)) { showToast("ไม่มีไอเทมในกระเป๋า"); return; }
    const reduced = rand(1, 4);
    const before = target.injuryDays;
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const p = c.players.find((pl) => pl.id === playerId);
      if (!p || p.injuryDays <= 0) return c;
      p.injuryDays = Math.max(0, p.injuryDays - reduced);
      c.log = [`🩹 ใช้ชุดปฐมพยาบาลกับ ${p.name} — ลดอาการบาดเจ็บ ${reduced} วัน (เหลือ ${p.injuryDays} วัน)`, ...c.log];
      return c;
    });
    const after = Math.max(0, before - reduced);
    showToast(after === 0 ? `${target.name} หายบาดเจ็บแล้ว!` : `ลดอาการบาดเจ็บ ${reduced} วัน — เหลือ ${after} วัน`);
  }

  const persist = useCallback((next) => {
    const saved = checkOnlineUnlock(typeof next === "object" && next !== null ? { ...next } : next);
    window.storage.set(saveKeysRef.current.careerKey, JSON.stringify({ ...saved, lastSeenAt: Date.now() })).catch(() => {});
  }, []);
  const updateCareer = useCallback((updater) => {
    setCareer((prev) => {
      // ยังไม่มีอาชีพ (อยู่หน้าสร้างทีม/เลือกโหมดก่อน career ถูกสร้าง) — ไม่มีอะไรให้อัปเดต ป้องกันทุกจุดเรียกที่อาจมาถึงก่อนเวลา (เช่น interval พื้นหลัง)
      if (!prev) return prev;
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (!next) return prev;
      const checked = checkOnlineUnlock(JSON.parse(JSON.stringify(next)));
      persist(checked);
      return checked;
    });
  }, [persist]);

  /* career.liveMatch เป็นระบบจำลองแมทฝั่ง sandbox ล้วนๆ — ไม่ควรมีอยู่เลยในโหมดออนไลน์ (แมทออนไลน์จริงคำนวณฝั่งเซิร์ฟเวอร์แยกต่างหาก)
   * ถ้าเจอ liveMatch ค้างอยู่ในเซฟที่ playMode="online" (เช่น เผลอกดปุ่ม "▶ ลงสนาม" เดิมแล้วปิดแอปก่อนจบ 90 นาที)
   * ล้างทิ้งอัตโนมัติแทนที่จะเปิดจอเดิมซ้ำไปเรื่อยๆ ทุกครั้งที่เข้าเกม */
  useEffect(() => {
    if (career?.playMode === "online" && career?.liveMatch) {
      updateCareer((prev) => ({ ...prev, liveMatch: null }));
    }
  }, [career?.playMode, career?.liveMatch, updateCareer]);

  function showToast(msg) { setToast(msg); playUiSound(inferToastSound(msg)); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 2600); }
  async function enterOnlineMode() {
    const fin = computeTeamFinances(career);
    if (!career?.onlineUnlocked || !canUnlockOnline(fin)) return;
    const sync = onSyncOnlineServer || onOpenOnlinePortal;
    if (sync) {
      try {
        await sync(career);
      } catch {
        return;
      }
    }
    setLeaguePickOpen(true);
  }

  function confirmLeaguePick(leagueId) {
    updateCareer((prev) => {
      let c = JSON.parse(JSON.stringify(prev));
      if (!c.onlineUnlocked || !canUnlockOnline(computeTeamFinances(c))) return c;
      if (c.legendLeagueId !== leagueId) c = installLegendMasterLeague(c, leagueId);
      c.legendLeagueId = leagueId;
      c.pendingLeaguePick = false;
      c.playMode = "online";
      c.onlineEnteredAt = Date.now();
      c.log = [`🌐 เข้าสู่โลกออนไลน์ — ลีก ${legendLeagueLabel(leagueId)} (ซูเปอร์สตาร์ตัวเดียวต่อเซิร์ฟเวอร์)`, ...c.log];
      return c;
    });
    setLeaguePickOpen(false);
    showToast("เข้าสู่โลกออนไลน์แล้ว!");
  }

  /** กลับไปเล่นโลกจำลองคนเดียว — แค่สลับ flag กลับ ข้อมูลทีม/ลีก/ฟิกซ์เจอร์โลกจำลองไม่ได้ถูกแตะระหว่างอยู่ออนไลน์เลย จึงเล่นต่อได้ปกติทันที
   * (สโมสรบนเซิร์ฟเวอร์ออนไลน์ไม่ถูกลบ — กลับเข้าออนไลน์ใหม่ได้เสมอที่ปุ่ม "เข้าสู่โลกออนไลน์") */
  function exitOnlineMode() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      if (c.playMode !== "online") return c;
      c.playMode = "sandbox";
      c.log = [`🕹️ กลับไปเล่นโลกจำลองคนเดียว — สโมสรออนไลน์ยังอยู่ กลับเข้าใหม่ได้ทุกเมื่อ`, ...c.log];
      return c;
    });
    showToast("กลับไปโลกจำลองแล้ว!");
  }

  function acquireLegend(legendId) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const res = tryAcquireLegendOnCareer(c, legendId);
      if (!res.ok) { showToast(res.msg); return prev; }
      showToast(res.msg);
      return c;
    });
  }

  function startCareer(clubConfig, mode = "sandbox") {
    if (booting) return;
    setBooting(true);
    setTimeout(async () => {
      try {
        const fresh = createNewCareer(clubConfig, profile?.name || accountUser?.username || "ผู้จัดการใหม่");
        if (mode === "online") {
          // เลือก "ออนไลน์" ตั้งแต่ตอนเริ่ม — ปลดล็อกทันทีไม่ต้องปั้นมูลค่าทีมถึง 50M ก่อน (เกตนั้นมีไว้
          // สำหรับคนเริ่มจากโลกจำลองแล้วค่อยเปลี่ยนใจทีหลัง ไม่ใช่คนที่เลือกออนไลน์ตรงๆ ตั้งแต่แรก)
          fresh.playMode = "online";
          fresh.onlineUnlocked = true;
          fresh.onlineUnlockedAt = Date.now();
          fresh.log = [`🌐 เลือกเริ่มในโลกออนไลน์ตั้งแต่แรก — ลีคเดียวกับผู้เล่นจริง`, ...fresh.log];
          try {
            // สร้างสโมสรจริงบนชาร์ดเซิร์ฟเวอร์ — ถ้าไม่ทำจุดนี้ playMode จะเป็น "online" แค่ในเซฟโลกจำลอง
            // ไม่มีสโมสรจริงอยู่หลังบ้านเลย (ระบบแมทอัตโนมัติ/สเปคเทตจะหาไม่เจอ)
            await createOnlineClubDirect(clubConfig);
          } catch (e) {
            console.error("createOnlineClubDirect failed", e);
            showToast("เชื่อมสโมสรออนไลน์ไม่สำเร็จ — เข้า \"ตั้งค่า\" แล้วกด \"เข้าสู่โลกออนไลน์\" อีกครั้งได้");
          }
        }
        setCareer(checkOnlineUnlock(fresh));
        persist(fresh);
        setTab("dashboard");
        showToast(mode === "online" ? "เริ่มอาชีพในโหมดออนไลน์แล้ว!" : "เริ่มอาชีพแล้ว!");
      } catch (e) {
        console.error("startCareer failed", e);
        showToast("สร้างเกมไม่สำเร็จ — ลองใหม่หรือรีเซ็ตเซฟ");
      } finally {
        setBooting(false);
      }
    }, 30);
  }
  function resetCareer() {
    window.storage.delete(saveKeysRef.current.careerKey).catch(() => {});
    setCareer(null);
    setTab("dashboard");
  }

  function dismissWorldNewsFlash() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const id = c.flashWorldNewsId;
      if (id && c.worldNews) {
        const w = c.worldNews.find((x) => x.id === id);
        if (w) w.unread = false;
      }
      c.flashWorldNewsId = null;
      return c;
    });
  }

  function markWorldNewsRead(newsId) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const w = c.worldNews?.find((x) => x.id === newsId);
      if (w) w.unread = false;
      return c;
    });
  }

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
    // จังหวะเกมเร็ว/กดสูงของทีมผู้เล่น: เปลืองสตามินามากขึ้น + เสี่ยงบาดเจ็บมากขึ้น (บอทไม่ใช้ matchPrep)
    const prep = c.matchPrep || {};
    const tempoOpt = TEMPO_OPTIONS.find((t) => t.id === prep.tempo);
    const pressOpt = PRESSING_OPTIONS.find((t) => t.id === prep.pressing);
    const userDrainMult = (tempoOpt?.staminaDrainMult || 1) * (pressOpt?.staminaDrainMult || 1);
    const userInjuryMult = pressOpt?.injuryRiskMult || 1;
    squad.forEach((p) => {
      if (xiIds.includes(p.id)) {
        const isUserPlayer = p.teamId === c.userTeamId;
        p.stamina = clamp(p.stamina - Math.round(rand(10, 18) * (isUserPlayer ? userDrainMult : 1)), 5, 100);
        p.appearHistory = [true, ...(p.appearHistory || [])].slice(0, 5);
        p.careerApps = (p.careerApps || 0) + 1;
        if (p.teamId === c.userTeamId) {
          c.monthlyApps = c.monthlyApps || {};
          c.monthlyApps[p.id] = (c.monthlyApps[p.id] || 0) + 1;
        }
        checkMilestone(c, p, "apps");
        const doctor = (c.staff[p.teamId] || {}).PHYSIO;
        const medicalLevel = p.teamId === c.userTeamId && c.facilities ? c.facilities.medical : 1;
        const headBuff = isUserPlayer ? headMedicalTeamBuff((c.staff[c.userTeamId] || {}).HEAD_MEDICAL) : { physioBoostMult: 1 };
        const doctorEff = doctor ? doctor.boost * headBuff.physioBoostMult : 0;
        const fragile = isPlayerFragile(p, c.day);
        const injuryChance = clamp((100 - p.stamina) / 100 * 0.06 + 0.004, 0.003, 0.07)
          * (doctor ? 1 - doctorEff * 0.3 : 1)
          * (1 - (medicalLevel - 1) * 0.1)
          * (isUserPlayer ? userInjuryMult : 1)
          * (fragile ? REINJURY_RISK_MULT : 1);
        if (Math.random() < injuryChance) {
          const inj = applyInjuryToPlayer(p);
          if (isUserPlayer) {
            c.log = [`🩹 ${p.name}${fragile ? " (กลับมาเจ็บซ้ำ!)" : ""} บาดเจ็บ${inj.typeLabel} ระดับ${inj.label} (${inj.days} วัน)`, ...c.log];
          }
        }
      } else {
        p.appearHistory = [false, ...(p.appearHistory || [])].slice(0, 5);
      }
    });
    checkBenchUnhappiness(c, squad, xiIds);
  }

  function computeStatuses(squad) {
    return squad.map((p) => {
      const starts = (p.appearHistory || []).filter(Boolean).length;
      const status = starts >= 4 ? "starter" : starts >= 1 ? "rotation" : "reserve";
      return { ...p, status };
    });
  }

  /* ---------- weekly / daily rollover extras ---------- */
  // freshlySuspendedIds: เซ็ต id ผู้เล่นที่เพิ่งโดนแบนจากแมตช์ของ "วันนี้เอง" (ส่งมาจาก finishLiveMatch)
  // กันนับซ้ำ ไม่งั้นคนเพิ่งโดนใบแดงนัดนี้จะถูกลดโทษเหลือ 0 ทันทีในฟังก์ชันเดียวกัน
  function finalizeDayExtras(c, freshlySuspendedIds = null) {
    // --- player contract expiry: bots auto-renew silently, your club must renew manually or the player leaves free ---
    const departed = [];
    const legendAutoRenewed = [];
    c.players = c.players.filter((p) => {
      if (p.contractEndsDay == null || c.day < p.contractEndsDay) return true;
      // Legend ห้ามหลุดออกจากเกมเด็ดขาด (ซื้อมาแพง/มีจำกัด ไม่มีตลาดให้เซ็นใหม่) — ต่อสัญญาอัตโนมัติแทนการปล่อยออก
      if (p.isLegend) {
        p.contractEndsDay = c.day + rand(150, 400);
        p.wage = Math.round((p.wage * rand(103, 112) / 100) / 100) * 100;
        if (p.teamId === c.userTeamId) legendAutoRenewed.push(p.name);
        return true;
      }
      if (p.teamId === c.userTeamId) { departed.push(p.name); return false; }
      p.contractEndsDay = c.day + rand(150, 400); // bots re-sign automatically
      p.wage = Math.round((p.wage * rand(103, 112) / 100) / 100) * 100;
      return true;
    });
    if (legendAutoRenewed.length) {
      c.log = [`⭐ สัญญา Legend ใกล้หมด ต่อให้อัตโนมัติแล้ว: ${legendAutoRenewed.join(", ")} (ไปกดต่อสัญญาเองได้ที่หน้าสควอด)`, ...c.log];
    }
    if (departed.length) {
      c.log = [`📄 หมดสัญญา: ${departed.join(", ")} ออกจากทีมแบบไม่มีค่าตัว (ไม่ได้ต่อสัญญาทัน)`, ...c.log];
      const remainingIds = c.players.filter((p) => p.teamId === c.userTeamId).map((p) => p.id);
      c.lineups[c.userTeamId] = (c.lineups[c.userTeamId] || []).filter((id) => remainingIds.includes(id));
      const uT = c.teams.find((t) => t.id === c.userTeamId);
      const added = topUpTeamSquad(c.players, c.userTeamId, uT.tier, c.day, c.legendLeagueId || "thailand", c.teams);
      if (added.length) c.log = [`🆕 สโมสรเซ็นฟรีเอเจนต์ ${added.length} คนเพื่อเติมสควอด`, ...c.log];
    }

    // ทีมที่มีนัดแข่งวันนี้ (ทุกดิวิชั่น) — ใช้กำหนดว่าใครนับวันแบนลดวันนี้ได้บ้าง (ทั้งทีมเราและทีมคู่แข่ง)
    const teamsPlayingToday = new Set();
    [0, 1].forEach((div) => {
      const round = c.leagues[div]?.fixtures?.find((r) => r.day === c.day);
      if (!round) return;
      round.matches.forEach((m) => { teamsPlayingToday.add(m.home); teamsPlayingToday.add(m.away); });
    });

    const uT = userTeam(c);
    const uSquad = squadOf(c.userTeamId, c);
    const wageBill = uSquad.reduce((s, p) => s + effectivePlayerDailyWage(p), 0);
    const staffWages = Object.values(c.staff[c.userTeamId] || {}).reduce((s, co) => s + co.weeklyWage, 0);
    const mgrWage = uT.manager ? uT.manager.weeklyWage : 0;
    const scoutWage = (c.marketScout ? c.marketScout.weeklyWage : 0) + (c.youthScout ? c.youthScout.weeklyWage : 0);
    const acaMgrWage = c.academyManager ? c.academyManager.weeklyWage : 0;
    const totalWages = wageBill + staffWages + mgrWage + scoutWage + acaMgrWage;
    c.fanDeltaToday = 0;
    const sponsorIncome = computeSponsorDaily(c, uT);
    const merchIncome = computeMerchDaily(c, uT);
    const dailyIncome = sponsorIncome + merchIncome;
    c.budget += dailyIncome - totalWages;
    const net = dailyIncome - totalWages;
    const sponsorName = (SPONSOR_TIERS[c.sponsorTier ?? 0] || SPONSOR_TIERS[0]).name;
    c.log = [`💼 ${sponsorName} +${formatMoney(sponsorIncome)} · เสื้อ +${formatMoney(merchIncome)} · ค่าเหนื่อย -${formatMoney(totalWages)} · สุทธิ ${net >= 0 ? "+" : ""}${formatMoney(net)}`, ...c.log];

    // --- today's training-calendar slot applies to the whole first-team squad ---
    const trainingSnap = snapshotPlayerAttrs(uSquad);
    const slotIdx = (c.day - 1) % 10;
    const trainingType = c.trainingPlan[slotIdx] || "BALANCED";
    const isRestDay = trainingType === "REST";
    const playedTodayIds = new Set(uSquad.filter((p) => p.appearHistory?.[0] === true).map((p) => p.id));
    uSquad.forEach((p) => {
      let effectiveType = !isRestDay && playedTodayIds.has(p.id) ? "REST" : trainingType;
      if (blocksHeavyTraining(p) && effectiveType !== "REST") effectiveType = "REST";
      applyTrainingToPlayer(p, effectiveType);
    });
    if (uT.manager && trainingType !== "REST") {
      const mp = enrichedManagerPlan(c, uT);
      const devBump = ((uT.manager.stats?.development || 40) / 100) * 0.05 * mp.devMult;
      if (devBump > 0) uSquad.filter((p) => !playedTodayIds.has(p.id)).forEach((p) => bumpAttrs(p, devBump));
    }
    const restNote = isRestDay ? " · วันพักฟื้น งดซ้อมหนัก" : playedTodayIds.size ? ` · ตัวจริง ${playedTodayIds.size} คนพักฟื้นหลังแข่ง` : "";
    c.log = [`${isRestDay ? "😴" : "🏋️"} วันฝึกที่ ${slotIdx + 1}/10: ${TRAINING_TH[trainingType]}${restNote}${uT.manager && !isRestDay ? ` · โบนัสปั้นนักเตะ ${uT.manager.name}` : ""}`, ...c.log];

    // --- per-position drill sessions (บอร์ดซ้อมรายตำแหน่ง) — ข้ามวันพัก + ข้ามตัวที่ลงแข่งวันนี้ ---
    if (!c.drillDoneDay) c.drillDoneDay = {};
    const drillSummary = [];
    if (!isRestDay) {
      DRILL_GROUPS.forEach((g) => {
        if (c.drillDoneDay[g] === c.day) return;
        const res = applyDrillSession(c, g, { skipPlayerIds: playedTodayIds });
        if (res) drillSummary.push(`${POS_TH[g]} -${res.cost}%`);
      });
    }
    if (isRestDay) c.log = [`😴 วันพักฟื้น — งดซ้อมรายตำแหน่ง ทีมฟื้นสภาพร่างกาย`, ...c.log];
    else if (drillSummary.length) c.log = [`🏟️ ซ้อมรายตำแหน่งวันนี้: ${drillSummary.join(" · ")}${playedTodayIds.size ? ` (ข้ามตัวจริง ${playedTodayIds.size} คน)` : ""}`, ...c.log];

    // daily stamina recovery for everyone (all clubs, so bots stay fair too)
    const myFacilities = c.facilities || { fitness: 1, training: 1, techLab: 1, medical: 1 };
    const userHeadMed = (c.staff[c.userTeamId] || {}).HEAD_MEDICAL;
    const headMedLongClears = [];
    c.players.forEach((p) => {
      const teamFitness = (c.staff[p.teamId] || {}).FITNESS;
      const fitnessCoach = teamFitness ? ensureCoachProfile(teamFitness, "FITNESS") : null;
      const facilityBonus = p.teamId === c.userTeamId ? (myFacilities.fitness - 1) * 2 : 0;
      const fitnessSynergy = p.teamId === c.userTeamId && trainingType === "FITNESS" ? 1.5 : 1;
      const restBoost = p.teamId === c.userTeamId && isRestDay ? 10 : 0;
      const postMatchBoost = p.teamId === c.userTeamId && playedTodayIds.has(p.id) && !isRestDay ? 12 : 0;
      const fitnessStaminaBonus = (p.teamId === c.userTeamId && fitnessCoach)
        ? Math.round((fitnessCoach ? coachFitnessStaminaPerDay(fitnessCoach) : 0) * fitnessSynergy)
        : (teamFitness ? Math.round(teamFitness.boost * 10 * fitnessSynergy) : 0);
      const headMedStamina = (p.teamId === c.userTeamId && userHeadMed && p.injuryDays > 0)
        ? headMedicalRehabStaminaBonus(userHeadMed)
        : 0;
      const recover = (isRestDay && p.teamId === c.userTeamId ? 22 : 12) + fitnessStaminaBonus + facilityBonus + restBoost + postMatchBoost + headMedStamina;
      p.stamina = clamp(p.stamina + recover, 0, 100);
      if (p.injuryDays > 0) {
        const doctor = (c.staff[p.teamId] || {}).PHYSIO;
        const physiotherapist = (c.staff[p.teamId] || {}).PHYSIOTHERAPIST;
        const headMedForPlayer = p.teamId === c.userTeamId ? userHeadMed : null;
        let recoverDays = dailyMedicalRecoveryDays(doctor, physiotherapist, headMedForPlayer);
        if (headMedForPlayer) {
          const longFx = headMedicalLongInjuryClear(headMedForPlayer, p.injuryDays);
          recoverDays += longFx.extraDays;
          if (longFx.longClear) headMedLongClears.push(p.name);
        }
        p.injuryDays = Math.max(0, p.injuryDays - recoverDays);
        if (p.injuryDays <= 0) {
          markRecoveredFragile(p, c.day);
          p.injurySeverity = null;
          p.injuryType = null;
        }
      }
      // นับวันแบนลดที่นี่แทน (ทุกทีมที่มีนัดแข่งวันนี้ วันละครั้งแน่นอน) แทนที่จะพึ่งเฉพาะตอนลงแข่งสดของทีมเรา —
      // กันบั๊กที่เจอจริง: ถ้าใช้โหมดเดินหน้าเร็ว/จำลองอัตโนมัติแทนลงแข่งสด นัดแบนไม่เคยลดเลย
      // freshlySuspendedIds กันไม่ให้คนเพิ่งโดนแบนจากแมตช์วันนี้เองถูกลดโทษเหลือ 0 ทันที
      if ((p.suspendedMatches || 0) > 0 && teamsPlayingToday.has(p.teamId) && !(freshlySuspendedIds && freshlySuspendedIds.has(p.id))) {
        p.suspendedMatches = Math.max(0, p.suspendedMatches - 1);
      }
    });
    if (headMedLongClears.length) {
      c.log = [`⚕️ ${userHeadMed.name} เร่งรักษาอาการยาว (เหลือ >5 วัน) — ตัดวันพักเพิ่มให้ ${headMedLongClears.slice(0, 3).join(", ")}${headMedLongClears.length > 3 ? ` +${headMedLongClears.length - 3} คน` : ""}`, ...c.log];
    }
    // training boosts from position coaches (main squad, all clubs) — ยิ่งวันฝึกตรงสายโค้ช ยิ่งได้ผลมาก
    if (!isRestDay) {
      Object.keys(c.staff).forEach((teamId) => {
        Object.keys(c.staff[teamId]).forEach((spec) => {
          if (!["GK", "DF", "MF", "FW"].includes(spec)) return;
          const co = ensureCoachProfile(c.staff[teamId][spec], spec);
          const facilityMult = teamId === c.userTeamId ? 1 + (myFacilities.training - 1) * 0.15 : 1;
          const synergyMult = teamId === c.userTeamId ? coachTrainingSynergyMult(spec, trainingType) : 1;
          const synergyBump = coachSynergyExtraBump(co, synergyMult);
          c.players.forEach((p) => {
            if (p.teamId === teamId && p.position === spec && !(teamId === c.userTeamId && playedTodayIds.has(p.id))) {
              const dailyBump = coachDailyAttrBump(co, p.age) + synergyBump;
              bumpAttrs(p, dailyBump * facilityMult);
              if (teamId === c.userTeamId && synergyMult > 1) {
                const md = coachTrainingMoraleTick(co, synergyMult);
                if (md) p.morale = clamp(p.morale + md, 10, 99);
              }
            }
          });
        });
      });
    }
    // individual training focus — โฟกัสรายคนนอกเหนือจากแผนทีม (จำนวนช่องตามเลเวลเทคโนโลยีฝึกซ้อม)
    const uSquadIds = new Set(uSquad.map((p) => p.id));
    c.individualFocus = Object.fromEntries(Object.entries(c.individualFocus || {}).filter(([pid]) => uSquadIds.has(pid)));
    const focusSlots = myFacilities.techLab || 1;
    const focusEntries = Object.entries(c.individualFocus || {}).slice(0, focusSlots);
    if (!isRestDay) {
      focusEntries.forEach(([playerId, focusType]) => {
        const p = uSquad.find((pl) => pl.id === playerId);
        if (p && !playedTodayIds.has(p.id) && INDIVIDUAL_FOCUS_TYPES.includes(focusType)) bumpAttrsSubset(p, TRAINING_FOCUS_ATTRS[focusType], 0.14);
      });
    }
    if (!isRestDay) rollTrainingEvent(c, uSquad.filter((p) => !playedTodayIds.has(p.id)), trainingType);

    const playerDeltas = computePlayerAttrDeltas(trainingSnap, uSquad);
    appendTrainingReport(c, buildTrainingDayReport({
      day: c.day,
      season: c.season,
      trainingType,
      trainingLabel: TRAINING_TH[trainingType],
      slotIdx,
      isRestDay,
      drillSummary,
      playerDeltas,
      individualFocus: { ...(c.individualFocus || {}) },
      skippedMatchIds: playedTodayIds,
    }));

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
    if (c.youthScout && Math.random() < c.youthScout.findChance && c.youthProspects.length < 6) {
      c.youthProspects = [...c.youthProspects, genYouthProspect(c.youthScout.qualityBoost, c.youthScout, c.facilities ? c.facilities.techLab : 1)];
      c.log = [`🔎 แมวมองเยาวชนพบดาวรุ่งใหม่: ${c.youthProspects[c.youthProspects.length - 1].name}`, ...c.log];
    }

    // market scout — cheap first-team finds
    if (!c.scoutFinds) c.scoutFinds = [];
    c.scoutFinds = c.scoutFinds.filter((f) => f.expiresDay > c.day);
    if (c.marketScout) {
      const uTScout = c.teams.find((t) => t.id === c.userTeamId);
      const maxFinds = 3 + c.marketScout.grade;
      if (c.scoutFinds.length < maxFinds && Math.random() < c.marketScout.findChance * 0.85) {
        const dirBonus = staffSupportBonuses(c, c.userTeamId).scoutRatingBonus || 0;
        const find = genScoutFind(c.marketScout, uTScout.tier, c.day, c.legendLeagueId || "thailand", dirBonus);
        c.scoutFinds.push(find);
        c.log = [`🔭 ${c.marketScout.name} พบ ${find.name} (${playerPosTH(find)}, OVR ${find.rating}) ราคา ${formatMoney(find.buyFee)} — ดูที่ตลาด`, ...c.log];
      }
    }

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
      c.marketScoutOffer = genScout();
      c.youthScoutOffer = genScout();
      c.academyManagerOffer = genManager(true);
      c.weeklyQuests = pickWeeklyQuests();
      c.weeklyProgress = { wins: 0, goals: 0, cleanSheets: 0 };
      c.weeklyRewarded = [];
      c.log = [`มีผู้สมัครผจก./แมวมองใหม่ประจำสัปดาห์! เควสใหม่มาแล้ว`, ...c.log];
    }
    if (c.day === 15 && c.sockerCupSeason !== c.season) c = runSockerCup(c);
    if (c.day > 0 && c.day % 28 === 0) c = runMonthlyAwards(c);
    while (c.transferList.length < 8) c.transferList.push(genTransferListing(c.teams, c.userTeamId, c));
    reconcileInactiveLegends(c);
    c.players.filter((p) => p.isLegend && p.teamId === c.userTeamId).forEach((p) => { p.lastOwnerActivityDay = c.day; });

    const roadmapTick = runDailyRoadmapTick(c, uT, { genScoutFind });
    if (roadmapTick.logs?.length) c.log = [...roadmapTick.logs, ...c.log];
    if (roadmapTick.reports?.length && c.marketScout) {
      const maxFinds = 3 + c.marketScout.grade;
      roadmapTick.reports.forEach((find) => {
        if ((c.scoutFinds || []).length < maxFinds) {
          c.scoutFinds.push(find);
          c.log = [`🔭 รายงานโซน ${find.zoneLabel || ""}: ${find.name} (OVR ${find.rating})`, ...c.log];
        }
      });
    }
    if (roadmapTick.sacked) {
      c.managerSacked = true;
      c.sackReason = roadmapTick.reason || "บอร์ดไล่ออก";
      c.log = [`🚪 ${c.sackReason}`, ...c.log];
    }

    c.day += 1;
    resetDailyStaffDraws(c);
    return c;
  }

  /* ---------- fast (idle) day resolution: no live match, used for interactive bye-days and offline catch-up ---------- */
  function simulateOneDayFast(c) {
    [0, 1].forEach((div) => {
      const round = c.leagues[div].fixtures.find((r) => r.day === c.day);
      if (!round) return;
      round.matches.forEach((m) => {
        const line = simOneFixture(c, m);
        if (line && (m.home === c.userTeamId || m.away === c.userTeamId)) c.log = [line, ...c.log];
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
    const homeRes = resolveTeamXI(homeTeam, homeSquad, c.lineups[m.home]);
    const awayRes = resolveTeamXI(awayTeam, awaySquad, c.lineups[m.away]);
    const homeXI = homeRes.xi;
    const awayXI = awayRes.xi;

    if (!homeRes.canPlay || !awayRes.canPlay) {
      m.played = true;
      let homeGoals = 0;
      let awayGoals = 0;
      let note = "";
      if (!homeRes.canPlay && !awayRes.canPlay) {
        note = " (เลื่อน — ทั้งสองทีมขาดนักเตะ)";
      } else if (!homeRes.canPlay) {
        homeGoals = 0;
        awayGoals = 3;
        note = ` (เจ้าบ้านแพ้ฟอร์เฟต — มีผู้เล่นพร้อม ${homeRes.xi.length}/11)`;
      } else {
        homeGoals = 3;
        awayGoals = 0;
        note = ` (ทีมเยือนแพ้ฟอร์เฟต — มีผู้เล่นพร้อม ${awayRes.xi.length}/11)`;
      }
      m.homeGoals = homeGoals;
      m.awayGoals = awayGoals;
      applyResultToTable(c, m, homeGoals, awayGoals);
      c.lineups[m.home] = homeXI;
      c.lineups[m.away] = awayXI;
      return `${homeTeam.short} ${homeGoals} - ${awayGoals} ${awayTeam.short}${note}`;
    }

    const uSlotAssignSim = m.home === c.userTeamId || m.away === c.userTeamId ? userSlotAssignMap(c) : null;
    const { homeGoals, awayGoals } = simulateInstant(
      homeTeam, homeSquad, homeXI, awayTeam, awaySquad, awayXI,
      homeTeam.chemistry, awayTeam.chemistry,
      m.home === c.userTeamId ? uSlotAssignSim : null,
      m.away === c.userTeamId ? uSlotAssignSim : null,
    );
    m.played = true;
    m.homeGoals = homeGoals;
    m.awayGoals = awayGoals;
    if (m.home === c.userTeamId || m.away === c.userTeamId) {
      const uTFam = c.teams.find((t) => t.id === c.userTeamId);
      updateTacticFamiliarity(c, uTFam.formation, uTFam.manager);
    }
    applyResultToTable(c, m, homeGoals, awayGoals);
    applyChemistry(c, m.home, homeXI);
    applyChemistry(c, m.away, awayXI);
    applyMatchWearAndInjury(c, homeSquad, homeXI);
    applyMatchWearAndInjury(c, awaySquad, awayXI);
    attributeGoals(c, homeSquad, homeXI, homeGoals);
    attributeGoals(c, awaySquad, awayXI, awayGoals);
    if (m.home === c.userTeamId || m.away === c.userTeamId) {
      const uT = c.teams.find((t) => t.id === c.userTeamId);
      const uIsHome = m.home === c.userTeamId;
      const won = uIsHome ? homeGoals > awayGoals : awayGoals > homeGoals;
      const draw = homeGoals === awayGoals;
      const moraleBonus = enrichedManagerPlan(c, uT).moraleBonus;
      const userXIForCaptain = uIsHome ? homeXI : awayXI;
      const captain = c.players
        .filter((p) => p.teamId === c.userTeamId && p.personality === "leader" && userXIForCaptain.includes(p.id))
        .sort((a, b) => b.rating - a.rating)[0];
      const captainBonus = captain ? 1 : 0;
      c.players.filter((p) => p.teamId === c.userTeamId).forEach((p) => {
        const delta = won ? rand(2, 6) + moraleBonus + captainBonus : draw ? captainBonus : -(rand(2, 6) - Math.floor(moraleBonus / 2)) + captainBonus;
        p.morale = clamp(p.morale + delta, 10, 99);
      });
    }
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
    const uT = career.teams.find((t) => t.id === career.userTeamId);
    const uSquadAvail = squadOf(career.userTeamId, career).filter((p) => p.injuryDays <= 0 && (p.suspendedMatches || 0) <= 0);
    const xi = career.lineups[career.userTeamId] || [];
    const filled = uT.autoMode
      ? getBestXI(uSquadAvail, recommendFormation(uT, uSquadAvail))
      : fillLineupGaps(uSquadAvail, xi.filter((id) => uSquadAvail.some((p) => p.id === id)), uT.formation);
    if (filled.length < MIN_XI_SIZE) {
      const injured = squadOf(career.userTeamId, career).filter((p) => p.injuryDays > 0).length;
      const suspended = squadOf(career.userTeamId, career).filter((p) => (p.suspendedMatches || 0) > 0).length;
      showToast(`ลงสนามไม่ได้ — พร้อมเล่น ${filled.length}/11 คน (บาดเจ็บ ${injured} คน · ติดแบน ${suspended} คน)`);
      return;
    }
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
      const uSquad = squadOf(c.userTeamId, c).filter((p) => p.injuryDays <= 0 && (p.suspendedMatches || 0) <= 0);
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

      const mp = managerPlanProfile(uT);
      if (uT.autoMode && mp.autoPlan && uT.manager) {
        const scout = buildMatchScoutReport(c, uT, oppTeam, uSquad, oppSquad, uXI, isHome);
        if (scout.suggestedPrep) {
          c.matchPrep = {
            ...(c.matchPrep || defaultMatchPrep()),
            mentality: scout.suggestedPrep.mentality || "balanced",
            instructions: [...(scout.suggestedPrep.instructions || [])].slice(0, 3),
            defLine: scout.suggestedPrep.defLine || "normal",
            pressing: scout.suggestedPrep.pressing || "medium",
            markPlayerId: scout.suggestedPrep.markPlayerId || null,
          };
          c.log = [`◆ ${mp.name} (${mp.stars}★) วางแผนอัตโนมัติก่อนเกม`, ...c.log];
        }
      }

      const oppXI = autoLineupFor(oppTeam, oppSquad);
      const prep = c.matchPrep || defaultMatchPrep();
      if (prep.teamTalk) {
        const tt = TEAM_TALK_OPTIONS.find((t) => t.id === prep.teamTalk);
        if (tt) {
          c.players.filter((p) => p.teamId === c.userTeamId).forEach((p) => {
            p.morale = clamp(p.morale + rand(tt.morale[0], tt.morale[1]), 10, 99);
          });
          c.log = [`🗣️ คุยนักเตะก่อนเกม: ${tt.label}`, ...c.log];
        }
      }
      const familiarityMult = familiarityMultiplier(
        c.tacticFamiliarity && c.tacticFamiliarity.formation === uT.formation ? c.tacticFamiliarity.matches : 0
      );
      const uSlotAssign = uT.autoMode ? null : userSlotAssignMap(c);
      let hc = buildMatchContext(
        isHome ? uT : oppTeam, isHome ? uSquad : oppSquad, isHome ? uXI : oppXI,
        isHome ? oppTeam.formation : uT.formation, true, isHome ? uT.chemistry : oppTeam.chemistry,
        isHome ? uSlotAssign : null,
      );
      let ac = buildMatchContext(
        isHome ? oppTeam : uT, isHome ? oppSquad : uSquad, isHome ? oppXI : uXI,
        isHome ? uT.formation : oppTeam.formation, false, isHome ? oppTeam.chemistry : uT.chemistry,
        isHome ? null : uSlotAssign,
      );
      const userMeta = { team: uT, squad: uSquad, xiIds: uXI, familiarityMult };
      const userMarkMult = enrichedManagerPlan(c, uT).markMult;
      if (isHome) {
        hc = applyMatchPrepToContext(hc, prep, userMeta);
        ac = applyOppositionMarkToContext(ac, prep.markPlayerId, oppSquad, oppXI, userMarkMult);
      } else {
        ac = applyMatchPrepToContext(ac, prep, userMeta);
        hc = applyOppositionMarkToContext(hc, prep.markPlayerId, oppSquad, oppXI, userMarkMult);
      }
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
      const sq = squadOf(c.userTeamId, c).filter((p) => p.injuryDays <= 0 && (p.suspendedMatches || 0) <= 0);
      const mp = managerPlanProfile(t);
      t.formation = recommendFormation(t, sq);
      c.lineups[c.userTeamId] = getBestXI(sq, t.formation);
      const league = c.leagues[t.division];
      const round = league.fixtures.find((r) => r.day === c.day);
      const userMatch = round?.matches.find((m) => m.home === c.userTeamId || m.away === c.userTeamId);
      if (userMatch && mp.autoPlan && mp.stars >= 4) {
        const isHome = userMatch.home === c.userTeamId;
        const oppId = isHome ? userMatch.away : userMatch.home;
        const opponent = c.teams.find((tm) => tm.id === oppId);
        const oppSquad = squadOf(oppId, c);
        const scout = buildMatchScoutReport(c, t, opponent, sq, oppSquad, c.lineups[c.userTeamId], isHome);
        if (scout.suggestedPrep) {
          c.matchPrep = {
            ...(c.matchPrep || defaultMatchPrep()),
            mentality: scout.suggestedPrep.mentality || "balanced",
            instructions: [...(scout.suggestedPrep.instructions || [])].slice(0, 3),
            defLine: scout.suggestedPrep.defLine || "normal",
            pressing: scout.suggestedPrep.pressing || "medium",
            markPlayerId: scout.suggestedPrep.markPlayerId || null,
          };
        }
        c.log = [`📋 ${mp.name} (${mp.stars}★ · ${mp.tierTitle}) จัด XI+แผนให้: ${t.formation}`, ...c.log];
      } else {
        c.log = [`📋 ${mp.name} (${mp.stars}★) จัดทีมให้นัดนี้: แผน ${t.formation}${mp.stars < 4 ? " — อัพเกรดเป็น 4★+ เพื่อจัดแผนให้ด้วย" : ""}`, ...c.log];
      }
      return c;
    });
    showToast("ผจก.จัดทีมให้แล้ว");
  }

  function setMatchPrepMentality(mentality) {
    updateCareer((prev) => ({
      ...prev,
      matchPrep: { ...(prev.matchPrep || defaultMatchPrep()), mentality },
    }));
  }
  function toggleMatchPrepInstruction(id) {
    updateCareer((prev) => {
      const base = prev.matchPrep || defaultMatchPrep();
      const ins = base.instructions || [];
      if (ins.includes(id)) {
        return { ...prev, matchPrep: { ...base, instructions: ins.filter((x) => x !== id) } };
      }
      if (ins.length >= 3) return prev;
      return { ...prev, matchPrep: { ...base, instructions: [...ins, id] } };
    });
  }
  function setMatchPrepTeamTalk(teamTalk) {
    updateCareer((prev) => ({
      ...prev,
      matchPrep: { ...(prev.matchPrep || defaultMatchPrep()), teamTalk },
    }));
  }
  /** field: "tempo" | "pressing" | "defLine" | "offsideTrap" | "markPlayerId" */
  function setMatchPrepField(field, value) {
    updateCareer((prev) => ({
      ...prev,
      matchPrep: { ...(prev.matchPrep || defaultMatchPrep()), [field]: value },
    }));
  }
  function applySuggestedPrep(suggested) {
    if (!suggested) return;
    updateCareer((prev) => ({
      ...prev,
      matchPrep: {
        ...(prev.matchPrep || defaultMatchPrep()),
        mentality: suggested.mentality || "balanced",
        instructions: [...(suggested.instructions || [])].slice(0, 3),
        defLine: suggested.defLine || "normal",
        pressing: suggested.pressing || "medium",
        markPlayerId: suggested.markPlayerId ?? (prev.matchPrep || {}).markPlayerId ?? null,
      },
    }));
    showToast("ใช้คำแนะนำจากผจก.แล้ว");
  }
  function upgradeSponsor() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const next = (c.sponsorTier ?? 0) + 1;
      if (next >= SPONSOR_TIERS.length || (c.fanBase || 0) < SPONSOR_TIERS[next].minFans) return c;
      c.sponsorTier = next;
      c.log = [`📈 อัปเกรดสปอนเซอร์เป็น ${SPONSOR_TIERS[next].name}`, ...c.log];
      return c;
    });
    showToast("อัปเกรดสปอนเซอร์แล้ว!");
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
    const mult = teamId === c.userTeamId
      ? managerPlanProfile(c.teams.find((t) => t.id === teamId)).xpMult
      : (mgr.cardStars >= 5 ? 1.15 : 1);
    mgr.xp = (mgr.xp || 0) + Math.round(xp * mult);
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
    applyUserMatchRevenue(c, m, homeGoals, awayGoals);
    applyFanChangeAfterMatch(c, m, homeGoals, awayGoals);
    if (m.home === c.userTeamId || m.away === c.userTeamId) {
      const uT = c.teams.find((t) => t.id === c.userTeamId);
      refreshBoardAfterUserMatch(c, uT, homeGoals, awayGoals, m.home === c.userTeamId);
    }
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

  function finishLiveMatch(homeGoals, awayGoals, finalHomeXI, finalAwayXI, cardEvents = []) {
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
      const moraleBonus = enrichedManagerPlan(c, uT).moraleBonus;
      const userXIForCaptain = uIsHome ? finalHomeXI : finalAwayXI;
      const captain = c.players
        .filter((p) => p.teamId === c.userTeamId && p.personality === "leader" && userXIForCaptain.includes(p.id))
        .sort((a, b) => b.rating - a.rating)[0];
      const captainBonus = captain ? 1 : 0;
      c.players.filter((p) => p.teamId === c.userTeamId).forEach((p) => {
        const delta = won ? rand(2, 6) + moraleBonus + captainBonus : draw ? captainBonus : -(rand(2, 6) - Math.floor(moraleBonus / 2)) + captainBonus;
        p.morale = clamp(p.morale + delta, 10, 99);
      });
      if (m.home === c.userTeamId || m.away === c.userTeamId) {
        const userSquad = uIsHome ? homeSquad : awaySquad;
        const oppSquad = uIsHome ? awaySquad : homeSquad;
        const userXI = uIsHome ? finalHomeXI : finalAwayXI;
        const oppTeam = uIsHome ? a : h;
        const userAvail = userSquad.filter((p) => p.injuryDays <= 0);
        const oppAvail = oppSquad.filter((p) => p.injuryDays <= 0);
        const oppXI = getBestXI(oppAvail, oppTeam.formation);
        const prep = c.matchPrep || defaultMatchPrep();
        const familiarityMult = familiarityMultiplier(
          c.tacticFamiliarity && c.tacticFamiliarity.formation === uT.formation ? c.tacticFamiliarity.matches : 0
        );
        let userCtx = buildMatchContext(uT, userAvail, userXI, oppTeam.formation, uIsHome, uT.chemistry, userSlotAssignMap(c));
        let oppCtx = buildMatchContext(oppTeam, oppAvail, oppXI, uT.formation, !uIsHome, oppTeam.chemistry);
        userCtx = applyMatchPrepToContext(userCtx, prep, { team: uT, squad: userAvail, xiIds: userXI, familiarityMult });
        const { xgHome, xgAway } = expectedGoalsFull(uIsHome ? userCtx : oppCtx, uIsHome ? oppCtx : userCtx);
        const xgUs = uIsHome ? xgHome : xgAway;
        const xgThem = uIsHome ? xgAway : xgHome;
        recordMatchXg(c, {
          xgUs, xgThem,
          homeGoals: uIsHome ? homeGoals : awayGoals,
          awayGoals: uIsHome ? awayGoals : homeGoals,
          day: c.day,
          opponent: oppTeam,
        });
        const derbyDelta = derbyMoraleBonus(c, m.home, m.away, won);
        if (derbyDelta) {
          c.players.filter((p) => p.teamId === c.userTeamId).forEach((p) => {
            p.morale = clamp(p.morale + derbyDelta, 10, 99);
          });
          if (isDerbyMatch(c, m.home, m.away)) {
            c.log = [`⚔️ ดาร์บี้! มูด ${derbyDelta >= 0 ? "+" : ""}${derbyDelta}`, ...c.log];
          }
        }
      }
      updateTacticFamiliarity(c, uT.formation, uT.manager);
      if (c.matchPrep) c.matchPrep = { ...c.matchPrep, markPlayerId: null };
      // ประมวลผลใบเหลือง/แดงสะสมจากแมตช์นี้ — ใช้กับผู้เล่นทั้ง 2 ทีม (ไม่ใช่แค่ทีมผู้ใช้) เพราะภาพ
      // ใบแดง/เหลืองที่โชว์ระหว่างแข่งเป็นของทั้งสองทีม ถ้าใช้ได้แค่ทีมเราจะดูเหมือนคู่แข่งโดนใบแดง
      // แต่ไม่มีผลแบนจริง (บั๊กที่เจอจริง) — เดินโทษแบนเก่าทำที่ finalizeDayExtras ด้านล่างแทน
      // (ส่ง freshlySuspendedIds กันคนเพิ่งโดนแดงนัดนี้ถูกลดโทษเหลือ 0 ทันทีในฟังก์ชันเดียวกัน)
      const freshlySuspendedIds = new Set();
      cardEvents.forEach(({ playerId, red }) => {
        const p = c.players.find((pl) => pl.id === playerId);
        if (!p) return;
        if (red) {
          p.suspendedMatches = Math.max(p.suspendedMatches || 0, 1);
          freshlySuspendedIds.add(p.id);
          c.log = [`🟥 ${p.name} โดนแบน 1 นัดจากใบแดง`, ...c.log];
        } else {
          p.seasonYellows = (p.seasonYellows || 0) + 1;
          if (p.seasonYellows >= 5) {
            p.seasonYellows = 0;
            p.suspendedMatches = Math.max(p.suspendedMatches || 0, 1);
            freshlySuspendedIds.add(p.id);
            c.log = [`🟨 ${p.name} ใบเหลืองครบ 5 ใบ — โดนแบน 1 นัด (รีเซ็ตตัวนับ)`, ...c.log];
          }
        }
      });
      c.liveMatch = null;
      finalizeDayExtras(c, freshlySuspendedIds);
      return c;
    });
  }

  function startNewSeason() {
    updateCareer((prev) => rolloverSeason(JSON.parse(JSON.stringify(prev))));
  }

  /* ---------- transfer auction ---------- */
  function buyScoutFind(findId) {
    if (!career.marketScout) { showToast("ต้องจ้างแมวมองที่แท็บ Scout ในตลาดก่อน"); return; }
    const findName = (career.scoutFinds || []).find((f) => f.findId === findId)?.name;
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const idx = (c.scoutFinds || []).findIndex((f) => f.findId === findId);
      if (idx < 0) return c;
      const f = c.scoutFinds[idx];
      const uT = c.teams.find((t) => t.id === c.userTeamId);
      const negPct = enrichedManagerPlan(c, uT).negotiationPct;
      const finalFee = Math.round(f.buyFee * (1 - negPct));
      const ffpCheck = canAffordTransferFfp(c, finalFee);
      if (!ffpCheck.ok) { c.log = [`⚠️ ${ffpCheck.reason}`, ...c.log]; return c; }
      if (c.budget < finalFee) return c;
      c.budget -= finalFee;
      recordTransferSpend(c, finalFee);
      const newPl = enrichPlayerContract({
        id: f.playerId,
        name: f.name,
        nationality: f.nationality,
        position: f.position,
        pos: f.pos,
        altPos: f.altPos,
        age: f.age,
        attrs: f.attrs,
        attack: f.attack,
        defense: f.defense,
        rating: f.rating,
        potential: f.potential,
        value: Math.round(f.buyFee * 1.15),
        wage: f.buyWage,
        morale: rand(68, 84),
        teamId: c.userTeamId,
        stamina: 92,
        injuryDays: 0,
        appearHistory: [],
        careerGoals: 0,
        seasonGoals: 0,
        careerApps: 0,
        role: "balanced",
        contractEndsDay: c.day + rand(120, 280),
      });
      c.players.push(newPl);
      c.scoutFinds.splice(idx, 1);
      registerNewSquadPlayer(c, f.playerId);
      c.log = [`✅ ซื้อ ${f.name} จากรายงานแมวมอง — ค่าตัว ${formatMoney(finalFee)}${negPct > 0 ? ` (ลด ${Math.round(negPct * 100)}% จากผจก.)` : ""} · ดูที่แท็บแทคติก`, ...c.log];
      return c;
    });
    showToast(`${findName || "นักเตะ"} เข้าทีมแล้ว — ดูที่แท็บแทคติก > ตัวสำรอง`);
  }

  function handlePressChoice(choiceId) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      applyPressChoice(c, choiceId);
      return c;
    });
  }

  function handleConversationResolve(accept) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      resolvePlayerConversation(c, accept);
      return c;
    });
  }

  function handleAssignScoutZone(zoneId) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      assignScoutZone(c, zoneId);
      const zone = SCOUT_ZONES.find((z) => z.id === zoneId);
      const on = c.scoutNetwork.assignments.some((a) => a.zoneId === zoneId && a.active);
      c.log = [`🔭 โซนสเกาต์ ${zone?.label || zoneId}: ${on ? "เปิด" : "ปิด"}`, ...c.log];
      return c;
    });
  }

  function handleAddShadowTarget(position) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      addShadowTarget(c, { position, minRating: 58, maxAge: 27, note: `เป้า ${position}` });
      c.log = [`📋 เพิ่มเป้าแผนเงา: ${position} OVR≥58`, ...c.log];
      return c;
    });
  }

  function handleSetDelegation(key) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      ensureRoadmapFields(c);
      c.delegation[key] = c.delegation[key] === "auto" ? "manual" : "auto";
      return c;
    });
  }

  function handleRestartAfterSack() {
    resetCareer();
    showToast("เริ่มใหม่ — สร้างสโมสรใหม่ได้จากเมนู");
  }

  function manualScoutSearch() {
    if (!career.marketScout) { showToast("ต้องจ้างแมวมองที่แท็บ Scout ในตลาดก่อน"); return; }
    if ((career.scoutSearchDay || 0) >= career.day) { showToast("ค้นหาได้วันละ 1 ครั้ง"); return; }
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      if (!c.marketScout) return c;
      const maxFinds = 3 + c.marketScout.grade;
      if ((c.scoutFinds || []).length >= maxFinds) {
        c.log = [`🔭 รายการแมวมองเต็มแล้ว (${maxFinds} คน) — ซื้อหรือรอหมดอายุก่อนค้นหาใหม่`, ...c.log];
        return c;
      }
      const uT = c.teams.find((t) => t.id === c.userTeamId);
      const find = genScoutFind(c.marketScout, uT.tier, c.day, c.legendLeagueId || "thailand");
      c.scoutFinds = [...(c.scoutFinds || []), find];
      c.scoutSearchDay = c.day;
      c.log = [`🔭 ${c.marketScout.name} ค้นพบ ${find.name} (${playerPosTH(find)}, OVR ${find.rating}) — ราคา ${formatMoney(find.buyFee)}`, ...c.log];
      return c;
    });
    showToast("แมวมองรายงานนักเตะใหม่แล้ว!");
  }

  function placeBid(listingId, wage, fee) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      if (!resolveMarketOpen(c)) return prev; // กันเผื่อ market ปิดไปแล้วแต่ยังมี event ค้างมาถึง handler นี้
      const l = c.transferList.find((x) => x.listingId === listingId);
      if (!l) return c;
      // กันงบติดลบตอนประมูลชนะหลายรายการพร้อมกัน — ต้องเผื่อเงินที่ "จอง" ไว้กับ bid สูงสุดของเรา
      // ในรายการอื่นที่ยังไม่ปิดด้วย ไม่ใช่แค่เช็คงบปัจจุบันเทียบกับ fee รายการนี้รายการเดียว
      const reservedElsewhere = c.transferList
        .filter((x) => x.listingId !== listingId && x.topBid?.isUser)
        .reduce((s, x) => s + x.topBid.fee, 0);
      if (fee > c.budget - reservedElsewhere) return c;
      const ffpCheck = canAffordTransferFfp(c, fee);
      if (!ffpCheck.ok) return c;
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
          // กันงบติดลบ: ถ้างบไม่พอจริงตอนปิดประมูล (เช่นชนะหลายรายการพร้อมกันจนเกินงบ) ให้เสียสิทธิ์
          // รายการนี้แทนที่จะหักจนติดลบ — ป้องกันชั้นสุดท้ายเผื่อ placeBid หลุดรอดมาได้จากเคสที่ไม่คาดคิด
          if (l.topBid.fee > c.budget) {
            c.log = [`⚠️ งบไม่พอตอนปิดประมูล ${l.name} (ต้องการ ${formatMoney(l.topBid.fee)}) — เสียสิทธิ์ประมูลรายการนี้`, ...c.log];
            return false;
          }
          const ffpCheck = canAffordTransferFfp(c, l.topBid.fee);
          if (!ffpCheck.ok) {
            c.log = [`⚠️ ${ffpCheck.reason} — เสียสิทธิ์ประมูล ${l.name}`, ...c.log];
            return false;
          }
          ensureDetailedPos(l);
          const newPlayer = enrichPlayerContract({
            id: l.id, name: l.name, position: l.position, pos: l.pos, altPos: l.altPos || [],
            age: l.age, attrs: l.attrs, attack: l.attack, defense: l.defense, rating: l.rating,
            potential: l.potential, value: l.topBid.fee, wage: l.topBid.wage, morale: 75,
            teamId: c.userTeamId, stamina: 90, injuryDays: 0, appearHistory: [],
            careerGoals: 0, seasonGoals: 0, careerApps: 0, role: "balanced",
            contractEndsDay: c.day + rand(150, 400),
          });
          ensureDetailedPos(newPlayer);
          c.players.push(newPlayer);
          c.budget -= l.topBid.fee;
          recordTransferSpend(c, l.topBid.fee);
          registerNewSquadPlayer(c, newPlayer.id);
          c.log = [`✅ ชนะประมูล ${l.name} (${playerPosTH(l)}) ค่าตัว ${formatMoney(l.topBid.fee)} ค่าเหนื่อย ${formatMoney(l.topBid.wage)}/วัน · ดูที่แท็บแทคติก`, ...c.log];
        } else {
          c.log = [`ตลาด: ${l.name} ถูกทีมอื่นซื้อไปด้วยราคา ${formatMoney(l.topBid.fee)}`, ...c.log];
        }
        return false;
      });
      if (changed) while (c.transferList.length < 8) c.transferList.push(genTransferListing(c.teams, c.userTeamId, c));
      return changed ? c : prev;
    });
  }
  useEffect(() => {
    if (!career) return;
    if (career.playMode !== "sandbox" && !isMarketOpen()) return;
    const iv = setInterval(() => {
      updateCareer((prev) => {
        const c = JSON.parse(JSON.stringify(prev));
        c.transferList.forEach((l) => {
          if (Date.now() >= l.endsAt) return;
          if (Math.random() > 0.35) return;
          const wageStep = Math.round((l.wage * 0.04) / 100) * 100 || 100;
          const feeStep = Math.round((l.value * 0.05) / 1000) * 1000 || 1000;
          const bidder = choice(c.teams.filter((t) => !t.isUser)).short;
          l.topBid = { wage: l.topBid.wage + wageStep, fee: l.topBid.fee + feeStep, bidder, isUser: false };
          l.bidHistory = [{ wage: l.topBid.wage, fee: l.topBid.fee, bidder }, ...(l.bidHistory || [])].slice(0, 8);
        });
        return c;
      });
    }, 4000);
    return () => clearInterval(iv);
  }, [career?.userTeamId, now]);
  useEffect(() => { if (career) resolveExpiredListings(); }, [now]);

  function sellPlayer(playerId) {
    const target = career.players.find((pl) => pl.id === playerId);
    if (target?.isLegend) { showToast("ซูเปอร์สตาร์ขายไม่ได้"); return; }
    const squad = career.players.filter((pl) => pl.teamId === career.userTeamId);
    if (squad.length <= MIN_SELL_SQUAD) { showToast(`ขายไม่ได้ — ต้องมีนักเตะอย่างน้อย ${MIN_SELL_SQUAD} คน`); return; }
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const p = c.players.find((pl) => pl.id === playerId);
      const squad = c.players.filter((pl) => pl.teamId === c.userTeamId);
      if (!p || squad.length <= MIN_SELL_SQUAD) return c;
      const price = Math.round((p.value * (0.75 + Math.random() * 0.25) * (1 + (staffSupportBonuses(c, c.userTeamId).sellBonus || 0))) / 1000) * 1000;
      c.budget += price;
      c.players = c.players.filter((pl) => pl.id !== playerId);
      removePlayerFromLineups(c, playerId);
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
      const personality = PLAYER_PERSONALITIES[p.personality];
      const raisePct = 5 + (rand(105, 118) - 105) * (personality?.wageDemandMult ?? 1);
      p.wage = Math.round((p.wage * (100 + raisePct)) / 100 / 100) * 100;
      p.contractEndsDay = c.day + rand(150, 400);
      p.morale = clamp(p.morale + 5 + (personality?.renewMoraleBonus ?? 0), 10, 99);
      c.log = [`✍️ ต่อสัญญา ${p.name} แล้ว (ค่าใช้จ่าย ${formatMoney(fee)})`, ...c.log];
      return c;
    });
    showToast("ต่อสัญญาสำเร็จ!");
  }
  function upgradeStadium() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      processConstructionQueue(c);
      if ((c.constructionQueue || []).some((q) => q.kind === "stadium")) return c;
      const level = getStadiumLevel(c);
      const maxLevel = Math.min(STADIUM_LEVELS.length, getMaxRoomLevel(c.globalFanbase));
      if (level >= maxLevel) return c;
      const cost = stadiumUpgradeCost(level);
      if (c.budget < cost) return c;
      c.budget -= cost;
      const toLevel = level + 1;
      const finishAt = Date.now() + stadiumBuildMs(toLevel);
      c.constructionQueue = [...(c.constructionQueue || []), { id: uid("bld"), kind: "stadium", toLevel, startedAt: Date.now(), finishAt }];
      c.log = [`🏗️ เริ่มก่อสร้างสนาม → ระดับ ${toLevel} (${formatMoney(cost)}) ใช้เวลาก่อสร้าง ${Math.round(stadiumBuildMs(toLevel) / 60000)} นาที`, ...c.log];
      return c;
    });
    showToast("เริ่มก่อสร้างสนามแล้ว!");
  }
  function upgradeFacility(type) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      processConstructionQueue(c);
      if ((c.constructionQueue || []).some((q) => q.kind === "facility" && q.facilityType === type)) return c;
      const level = (c.facilities || {})[type] || 1;
      const maxLevel = getMaxRoomLevel(c.globalFanbase);
      if (level >= maxLevel) return c;
      const cost = facilityUpgradeCost(level);
      if (c.budget < cost) return c;
      c.budget -= cost;
      const toLevel = level + 1;
      const finishAt = Date.now() + facilityBuildMs(toLevel);
      c.constructionQueue = [...(c.constructionQueue || []), { id: uid("bld"), kind: "facility", facilityType: type, toLevel, startedAt: Date.now(), finishAt }];
      c.log = [`🏗️ เริ่มก่อสร้าง${FACILITY_TH[type]} → ระดับ ${toLevel} (${formatMoney(cost)}) ใช้เวลาก่อสร้าง ${Math.round(facilityBuildMs(toLevel) / 60000)} นาที`, ...c.log];
      return c;
    });
    showToast("เริ่มก่อสร้างแล้ว!");
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
      if (t.formation !== f) c.tacticFamiliarity = { formation: f, matches: 0 };
      t.formation = f;
      c.lineups[c.userTeamId] = getBestXI(c.players.filter((p) => p.teamId === c.userTeamId), f);
      if (c.lineupSlots) delete c.lineupSlots[c.userTeamId];
      const sq = c.players.filter((p) => p.teamId === c.userTeamId);
      initBenchFromSquad(c, sq, c.lineups[c.userTeamId]);
      return c;
    });
  }
  /* กระดานจัดทีมลากวาง: ย้ายนักเตะระหว่างช่องในสนาม / ม้านั่งสำรอง / สำรองในทีม
     src/dst: {kind:"slot", index} | {kind:"sub", index} | {kind:"bench", playerId}
            | {kind:"benchArea"} | {kind:"subArea"} | {kind:"reserveArea"} | {kind:"reserve", playerId} */
  function moveBoardPiece(src, dst) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const t = c.teams.find((tm) => tm.id === c.userTeamId);
      if (t.autoMode) return c;
      const squad = c.players.filter((p) => p.teamId === c.userTeamId);
      const slots = resolveLineupSlots(c, squad, t.formation);
      let benchSlots = normalizeBenchSlots(c, squad, slots.filter(Boolean));
      const isInjured = (id) => { const p = squad.find((x) => x.id === id); return !p || p.injuryDays > 0; };

      const srcId = src.kind === "slot" ? slots[src.index]
        : src.kind === "sub" ? benchSlots[src.index]
          : src.playerId;
      if (!srcId || isInjured(srcId)) return c;

      const pullFromAll = (pid) => {
        for (let i = 0; i < slots.length; i++) if (slots[i] === pid) slots[i] = null;
        benchSlots = benchSlots.map((id) => (id === pid ? null : id));
      };

      if (dst.kind === "slot") {
        pullFromAll(srcId);
        const displaced = slots[dst.index];
        slots[dst.index] = srcId;
        if (displaced && displaced !== srcId) {
          const emptySub = benchSlots.findIndex((id) => !id);
          if (emptySub >= 0) benchSlots[emptySub] = displaced;
        }
      } else if (dst.kind === "sub") {
        pullFromAll(srcId);
        benchSlots[dst.index] = srcId;
      } else if (dst.kind === "subArea") {
        pullFromAll(srcId);
        const emptySub = benchSlots.findIndex((id) => !id);
        if (emptySub >= 0) benchSlots[emptySub] = srcId;
      } else if (src.kind === "slot" && (dst.kind === "benchArea" || dst.kind === "reserveArea")) {
        pullFromAll(srcId);
        const emptySub = benchSlots.findIndex((id) => !id);
        if (emptySub >= 0) benchSlots[emptySub] = srcId;
      } else if (dst.kind === "reserveArea" || dst.kind === "benchArea") {
        pullFromAll(srcId);
      } else if (src.kind === "slot" && dst.kind === "slot") {
        if (src.index === dst.index) return c;
        const tmp = slots[src.index];
        slots[src.index] = slots[dst.index];
        slots[dst.index] = tmp;
      } else if (src.kind === "bench" && dst.kind === "slot") {
        if (isInjured(src.playerId)) return c;
        pullFromAll(src.playerId);
        const displaced = slots[dst.index];
        slots[dst.index] = src.playerId;
        if (displaced && displaced !== src.playerId) {
          const emptySub = benchSlots.findIndex((id) => !id);
          if (emptySub >= 0) benchSlots[emptySub] = displaced;
        }
      } else {
        return c;
      }

      if (!c.lineupSlots) c.lineupSlots = {};
      c.lineupSlots[c.userTeamId] = slots;
      c.lineups[c.userTeamId] = slots.filter(Boolean);
      if (!c.benchLineups) c.benchLineups = {};
      c.benchLineups[c.userTeamId] = benchSlots;
      if (c.newSquadPlayerId === srcId) c.newSquadPlayerId = null;
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
  function setPlayerDuty(playerId, duty) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const p = c.players.find((pl) => pl.id === playerId);
      if (p) p.duty = duty;
      return c;
    });
  }
  /** kind: "corner" | "freekick" | "penalty" */
  function setSetPieceTaker(kind, playerId) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const t = c.teams.find((tm) => tm.id === c.userTeamId);
      const field = kind === "corner" ? "cornerTakerId" : kind === "freekick" ? "freekickTakerId" : "penaltyTakerId";
      t[field] = t[field] === playerId ? null : playerId;
      return c;
    });
  }
  /* จัดตัวจริงอัตโนมัติ (คงแผนเดิม) — ใช้จากปุ่ม "จัดทีมอัตโนมัติ" ท้ายตารางแทคติก */
  function autoPickLineup() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const t = c.teams.find((tm) => tm.id === c.userTeamId);
      const avail = c.players.filter((p) => p.teamId === c.userTeamId && p.injuryDays <= 0);
      c.lineups[c.userTeamId] = getBestXI(avail, t.formation);
      if (c.lineupSlots) delete c.lineupSlots[c.userTeamId];
      const sq = c.players.filter((p) => p.teamId === c.userTeamId);
      initBenchFromSquad(c, sq, c.lineups[c.userTeamId]);
      c.log = [`📋 จัดตัวจริงอัตโนมัติ (แผน ${t.formation})`, ...c.log];
      return c;
    });
    showToast("จัดตัวจริงอัตโนมัติแล้ว");
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
    let locked = false;
    let hired = false;
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const offer = c.coachOffers[specialty];
      if (!offer) return c;
      const existing = c.staff[c.userTeamId][specialty];
      if (isStaffRoleLocked(existing, c.season)) { locked = true; return c; }
      const terminationFee = existing ? Math.round((existing.weeklyWage * 8) / 1000) * 1000 : 0;
      const totalCost = offer.signingCost + terminationFee;
      if (c.budget < totalCost) return c;
      c.budget -= totalCost;
      if (existing) c.log = [`✂️ เลิกจ้าง ${existing.name} จ่ายค่าปรับ ${formatMoney(terminationFee)}`, ...c.log];
      offer.hiredSeason = c.season;
      c.staff[c.userTeamId] = { ...c.staff[c.userTeamId], [specialty]: offer };
      c.log = [`🧢 จ้าง ${offer.name} เป็น${STAFF_TH[specialty]}แล้ว`, ...c.log];
      c.coachOffers[specialty] = null;
      hired = true;
      return c;
    });
    if (locked) showToast("ตำแหน่งนี้เพิ่งเปลี่ยนสตาฟไปแล้ว — เปลี่ยนใหม่ได้ตอนขึ้นฤดูกาลหน้า");
    else if (hired) showToast("จ้างสตาฟสำเร็จ!");
    else showToast("งบไม่พอจ้างสตาฟคนนี้");
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
      offer.cardStars = managerStarsFromStats(offer.stats);
      c.log = [`📋 แต่งตั้ง ${offer.name} (${offer.cardStars}★) เป็นผจก.คนใหม่ สัญญา ${contractDays} วัน`, ...c.log];
      t.manager = offer;
      c.managerOffer = null;
      return c;
    });
    setManagerHireConfirm(null);
    showToast("แต่งตั้งผจก.สำเร็จ!");
  }
  function requestHireManager() {
    const offer = career?.managerOffer;
    if (!offer) return;
    const t = career.teams.find((tm) => tm.id === career.userTeamId);
    const underContract = t?.manager && t.manager.contractEndsDay != null && career.day < t.manager.contractEndsDay;
    const daysLeft = underContract ? t.manager.contractEndsDay - career.day : 0;
    const terminationFee = underContract ? Math.round((daysLeft * t.manager.weeklyWage * 1.4) / 1000) * 1000 : 0;
    setManagerHireConfirm({
      source: "offer",
      name: offer.name,
      stars: managerStarsFromStats(offer.stats),
      preferredFormation: offer.preferredFormation,
      weeklyWage: offer.weeklyWage,
      signingCost: offer.signingCost || 0,
      terminationFee,
      daysLeft,
      currentName: t?.manager?.name || null,
    });
  }
  function terminateManager() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const t = c.teams.find((tm) => tm.id === c.userTeamId);
      if (!t.manager) return c;
      const underContract = t.manager.contractEndsDay != null && c.day < t.manager.contractEndsDay;
      const daysLeft = underContract ? t.manager.contractEndsDay - c.day : 0;
      const fee = underContract ? Math.round((daysLeft * t.manager.weeklyWage * 1.4) / 1000) * 1000 : 0;
      if (fee > 0 && c.budget < fee) return c;
      c.budget -= fee;
      c.log = [`✂️ เลิกจ้าง ${t.manager.name} ${fee > 0 ? `จ่ายค่าปรับ ${formatMoney(fee)}` : "(หมดสัญญาแล้ว ไม่มีค่าปรับ)"}`, ...c.log];
      t.manager = null;
      return c;
    });
  }

  /* ---------- staff card gacha: ตู้หยอด (สุ่ม Bronze/Silver/Gold ฟรีวันละ N ครั้ง) + ซอง Platinum (รางวัลจบลีกท็อป 3) ---------- */
  function applyPulledCardsToCareer(c, pulled, tier, mergeOut) {
    c.staffCardBag = [...c.staffCardBag, ...pulled];
    const { removeIds, newCards, attempts } = computeAutoMergeAttempts(c.staffCardBag, c.autoMergeTiers);
    if (attempts.length) {
      const removeSet = new Set(removeIds);
      purgeCardsFromBag(c, removeSet);
      c.staffCardBag.push(...newCards);
      mergeOut.attempts = attempts;
    }
    c.lastStaffPull = pulled
      .map((card) => c.staffCardBag.find((b) => b.cardId === card.cardId))
      .filter(Boolean);
    c.log = [`🎰 หยอดตู้ได้ซอง ${tier.label} — การ์ด ${pulled.length} ใบ`, ...c.log];
    if (attempts.length) {
      const ok = attempts.filter((a) => a.success).length;
      c.log = [`✨ รวมการ์ดอัตโนมัติ ${attempts.length} ชุด — สำเร็จ ${ok} ชุด`, ...c.log];
    }
  }

  function pullFromMachine() {
    const tier = rollMachineTier();
    const pulled = Array.from({ length: CARDS_PER_STAFF_PULL }, () => genStaffCard(null, null, tier.weights));
    const mergeOut = { attempts: [] };
    // เช็คสิทธิ์หยอดตู้และหักออกจาก "prev" ภายใน updateCareer เท่านั้น (ไม่ใช้ค่า career จาก closure ข้างนอก)
    // กันบั๊กที่เจอจริง: เปิดซองได้ (การ์ดเข้ากระเป๋า) แต่ตัวนับสิทธิ์ไม่ลด เพราะคำนวณจากค่า career ตอนคลิกซึ่งอาจไม่ตรงกับค่าล่าสุด
    const pullOut = { applied: false, reason: null };
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      ensureStaffCardFields(c);
      if ((c.machineCoins || 0) < MACHINE_PULL_COST) {
        pullOut.reason = "เหรียญตู้ไม่พอ — รอรับเหรียญวันถัดไป หรือจบฤดูกาล";
        return prev;
      }
      applyPulledCardsToCareer(c, pulled, tier, mergeOut);
      c.machineCoins -= MACHINE_PULL_COST;
      pullOut.applied = true;
      return c;
    });
    if (!pullOut.applied) {
      showToast(pullOut.reason || "หยอดตู้ไม่ได้");
      return null;
    }
    showToast(`หยอดตู้ได้ซอง ${tier.label}! การ์ด ${pulled.length} ใบ`);
    if (mergeOut.attempts.length) setMergeReport({ attempts: mergeOut.attempts, auto: true });
    return tier;
  }

  function openPlatinumPack() {
    const tier = STAFF_PACK_TIERS.platinum;
    const pulled = Array.from({ length: CARDS_PER_STAFF_PULL }, () => genStaffCard(null, null, tier.weights));
    const mergeOut = { attempts: [] };
    const pullOut = { applied: false, reason: null };
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      ensureStaffCardFields(c);
      if ((c.staffPlatinumPacks || 0) <= 0) {
        pullOut.reason = "ไม่มีซอง Platinum — ได้จากการจบลีกอันดับ 1-3 เท่านั้น";
        return prev;
      }
      applyPulledCardsToCareer(c, pulled, tier, mergeOut);
      c.staffPlatinumPacks -= 1;
      pullOut.applied = true;
      return c;
    });
    if (!pullOut.applied) {
      showToast(pullOut.reason || "เปิดซองไม่ได้");
      return null;
    }
    showToast(`เปิดซอง Platinum! การ์ด ${pulled.length} ใบ (5-7★)`);
    if (mergeOut.attempts.length) setMergeReport({ attempts: mergeOut.attempts, auto: true });
    return tier;
  }

  /** ตู้หยอดออนไลน์ — เซิร์ฟเวอร์เป็นคนสุ่ม/หักโควต้า (staffFreeDrawsLeft/staffDrawTickets), การ์ดที่ได้เอามารวมเข้ากระเป๋า local เหมือนเดิม */
  async function pullOnlineMachine() {
    let res;
    try {
      res = await pullOnlineStaffMachine();
    } catch (e) {
      showToast(e.message || "หยอดตู้ไม่ได้");
      return null;
    }
    // เซิร์ฟเวอร์เป็นคนตัดสิน type/stars (คุมโควต้า/ความหายาก) ส่วนสเตตละเอียด+ค่าตัว/ค่าจ้าง/portrait ใช้สูตรเดียวกับ Sandbox เติมฝั่ง client
    const cards = res.cards.map((card) => ({
      cardId: card.cardId, type: card.type, stars: card.stars, name: card.name,
      portrait: pickStaffPortrait(card.type, card.specialty, card.stars),
      ...buildStaffCardPayload(card.type, card.stars),
      ...(card.type === "COACH" ? { specialty: card.specialty } : {}),
    }));
    const mergeOut = { attempts: [] };
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      ensureStaffCardFields(c);
      applyPulledCardsToCareer(c, cards, res.tier, mergeOut);
      return c;
    });
    showToast(`หยอดตู้ได้ซอง ${res.tier.label}! การ์ด ${cards.length} ใบ (${res.source === "free" ? "สิทธิ์ฟรี" : "ใช้เหรียญตู้"})`);
    if (mergeOut.attempts.length) setMergeReport({ attempts: mergeOut.attempts, auto: true });
    return { tier: res.tier, staffDraws: res.staffDraws };
  }

  function mergeStaffCards(type, stars, pickedCardIds = null) {
    const mergeOut = { applied: false, attempts: null };
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      ensureStaffCardFields(c);
      if (stars >= 7) return prev;
      const matches = c.staffCardBag.filter((card) => card.type === type && card.stars === stars && !card.locked);
      if (matches.length < MERGE_CARD_COUNT) return prev;
      // ถ้าผู้เล่นติ๊กเลือกการ์ดเองมา ใช้ตามนั้น (ต้องครบจำนวนและตรงชนิด/ดาวเป๊ะ) ไม่งั้นหยิบ N ใบแรกเหมือนเดิม
      let chosenIds = matches.slice(0, MERGE_CARD_COUNT).map((card) => card.cardId);
      if (Array.isArray(pickedCardIds) && pickedCardIds.length === MERGE_CARD_COUNT) {
        const matchIds = new Set(matches.map((card) => card.cardId));
        const validPick = pickedCardIds.every((id) => matchIds.has(id));
        if (validPick) chosenIds = pickedCardIds;
      }
      const removeSet = new Set(chosenIds);
      const chance = mergeSuccessChance(stars);
      const success = Math.random() < chance;
      const upgraded = success ? genStaffCard(type, stars + 1) : null;
      purgeCardsFromBag(c, removeSet);
      if (upgraded) c.staffCardBag.push(upgraded);
      c.log = success
        ? [`✨ รวมการ์ด ${STAFF_CARD_TYPE_TH[type]} ${stars}★ สำเร็จ → ${stars + 1}★ ${upgraded.name}`, ...c.log]
        : [`💨 รวมการ์ด ${STAFF_CARD_TYPE_TH[type]} ${stars}★ ไม่สำเร็จ (โอกาส ${Math.round(chance * 100)}%)`, ...c.log];
      mergeOut.applied = true;
      mergeOut.attempts = [{ type, stars, success, card: upgraded, chance }];
      return c;
    });
    if (mergeOut.applied) {
      setMergeReport({ attempts: mergeOut.attempts, auto: false });
    } else {
      showToast(`การ์ดไม่พอ ${MERGE_CARD_COUNT} ใบ`);
    }
  }

  /** กดรวมอัตโนมัติทันทีจากหน้ารวมการ์ด — ใช้ tier ที่เปิดสวิตช์ไว้ */
  function runAutoMergeNow() {
    const mergeOut = { attempts: [] };
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      ensureStaffCardFields(c);
      const { removeIds, newCards, attempts } = computeAutoMergeAttempts(c.staffCardBag, c.autoMergeTiers);
      if (!attempts.length) return prev;
      const removeSet = new Set(removeIds);
      purgeCardsFromBag(c, removeSet);
      c.staffCardBag.push(...newCards);
      const ok = attempts.filter((a) => a.success).length;
      c.log = [`✨ รวมการ์ดอัตโนมัติ ${attempts.length} ชุด — สำเร็จ ${ok} ชุด`, ...c.log];
      mergeOut.attempts = attempts;
      return c;
    });
    if (mergeOut.attempts.length) {
      setMergeReport({ attempts: mergeOut.attempts, auto: true });
    } else {
      showToast("ไม่มีชุดที่รวมได้ใน tier ที่เปิดรวมอัตโนมัติ");
    }
  }

  function toggleAutoMergeTier(stars) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      ensureStaffCardFields(c);
      c.autoMergeTiers[stars] = !c.autoMergeTiers[stars];
      return c;
    });
  }

  /** ล็อก/ปลดล็อกการ์ดสตาฟใบเดียว — การ์ดที่ล็อกจะไม่ถูกดึงไปรวม ทั้งอัตโนมัติและตอนกด "รวม" แบบหยิบให้ */
  function toggleStaffCardLock(cardId) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      ensureStaffCardFields(c);
      const card = c.staffCardBag.find((cd) => cd.cardId === cardId);
      if (!card) return prev;
      card.locked = !card.locked;
      return c;
    });
  }

  function requestHireFromStaffCard(cardId) {
    const card = (career?.staffCardBag || []).find((c) => c.cardId === cardId);
    if (!card) return;
    if (card.type === "MANAGER") {
      const t = career.teams.find((tm) => tm.id === career.userTeamId);
      const underContract = t?.manager && t.manager.contractEndsDay != null && career.day < t.manager.contractEndsDay;
      const daysLeft = underContract ? t.manager.contractEndsDay - career.day : 0;
      const terminationFee = underContract ? Math.round((daysLeft * t.manager.weeklyWage * 1.4) / 1000) * 1000 : 0;
      setManagerHireConfirm({
        source: "card",
        cardId,
        name: card.name,
        stars: card.stars,
        preferredFormation: card.preferredFormation,
        weeklyWage: card.weeklyWage,
        signingCost: 0,
        terminationFee,
        daysLeft,
        currentName: t?.manager?.name || null,
      });
      return;
    }
    hireFromStaffCard(cardId);
  }

  function hireFromStaffCard(cardId) {
    let hired = false;
    let locked = false;
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      ensureStaffCardFields(c);
      const idx = c.staffCardBag.findIndex((card) => card.cardId === cardId);
      if (idx < 0) return c;
      const card = c.staffCardBag[idx];
      const t = c.teams.find((tm) => tm.id === c.userTeamId);

      if (card.type === "MANAGER") {
        const underContract = t.manager && t.manager.contractEndsDay != null && c.day < t.manager.contractEndsDay;
        const daysLeft = underContract ? t.manager.contractEndsDay - c.day : 0;
        const terminationFee = underContract ? Math.round((daysLeft * t.manager.weeklyWage * 1.4) / 1000) * 1000 : 0;
        const waived = !!c.staffTerminationWaiver;
        const actualFee = waived ? 0 : terminationFee;
        if (actualFee > 0 && c.budget < actualFee) return c;
        if (waived && terminationFee > 0) {
          c.staffTerminationWaiver = false;
          c.log = [`📜 ใช้สิทธิ์ยกเว้นค่าปรับเลิกจ้าง (ประหยัดไป ${formatMoney(terminationFee)})`, ...c.log];
        } else if (actualFee > 0) {
          c.budget -= actualFee;
          c.log = [`✂️ เลิกสัญญา ${t.manager.name} ก่อนครบกำหนด (เหลือ ${daysLeft} วัน) จ่ายค่าปรับ ${formatMoney(actualFee)}`, ...c.log];
        }
        const mgr = staffCardToManager(card);
        const contractDays = rand(70, 160);
        mgr.contractEndsDay = c.day + contractDays;
        mgr.contractDays = contractDays;
        t.manager = mgr;
        c.log = [`📋 แต่งตั้ง ${mgr.name} (${card.stars}★) จากการ์ด สัญญา ${contractDays} วัน`, ...c.log];
      } else if (card.type === "COACH" || card.type === "DOCTOR" || EXTRA_STAFF_TYPES.includes(card.type)) {
        const spec = card.specialty;
        const existing = c.staff[c.userTeamId][spec];
        if (isStaffRoleLocked(existing, c.season)) { locked = true; return c; }
        const terminationFee = existing ? Math.round((existing.weeklyWage * 8) / 1000) * 1000 : 0;
        const waived = !!c.staffTerminationWaiver;
        const actualFee = waived ? 0 : terminationFee;
        if (actualFee > 0 && c.budget < actualFee) return c;
        if (waived && terminationFee > 0) {
          c.staffTerminationWaiver = false;
          c.log = [`📜 ใช้สิทธิ์ยกเว้นค่าปรับเลิกจ้าง (ประหยัดไป ${formatMoney(terminationFee)})`, ...c.log];
        } else if (actualFee > 0) {
          c.budget -= actualFee;
          c.log = [`✂️ เลิกจ้าง ${existing.name} จ่ายค่าปรับ ${formatMoney(actualFee)}`, ...c.log];
        }
        c.staff[c.userTeamId] = { ...c.staff[c.userTeamId], [spec]: { ...staffCardToCoach(card), hiredSeason: c.season } };
        c.log = [`🧢 จ้าง ${card.name} (${card.stars}★) เป็น${STAFF_TH[spec]}จากการ์ด`, ...c.log];
      } else if (card.type === "SCOUT") {
        const scout = staffCardToScout(card);
        if (!c.marketScout) {
          c.marketScout = { ...scout, hiredSeason: c.season };
          c.log = [`🔭 จ้าง ${card.name} (${card.stars}★) เป็นแมวมองทีมชุดใหญ่จากการ์ด`, ...c.log];
        } else if (!c.youthScout) {
          c.youthScout = { ...scout, hiredSeason: c.season };
          c.log = [`🔎 จ้าง ${card.name} (${card.stars}★) เป็นแมวมองเยาวชนจากการ์ด`, ...c.log];
        } else if (!isStaffRoleLocked(c.marketScout, c.season)) {
          const fee = Math.round((c.marketScout.weeklyWage * 8) / 1000) * 1000;
          const waived = !!c.staffTerminationWaiver;
          const actualFee = waived ? 0 : fee;
          if (actualFee > 0 && c.budget < actualFee) return c;
          if (waived && fee > 0) {
            c.staffTerminationWaiver = false;
            c.log = [`📜 ใช้สิทธิ์ยกเว้นค่าปรับเลิกจ้าง (ประหยัดไป ${formatMoney(fee)})`, ...c.log];
          } else if (actualFee > 0) {
            c.budget -= actualFee;
            c.log = [`✂️ เลิกจ้างแมวมอง ${c.marketScout.name} จ่ายค่าปรับ ${formatMoney(actualFee)}`, ...c.log];
          }
          c.marketScout = { ...scout, hiredSeason: c.season };
          c.log = [`🔭 จ้าง ${card.name} (${card.stars}★) แทนแมวมองทีมชุดใหญ่จากการ์ด`, ...c.log];
        } else if (!isStaffRoleLocked(c.youthScout, c.season)) {
          const fee = Math.round((c.youthScout.weeklyWage * 8) / 1000) * 1000;
          const waived = !!c.staffTerminationWaiver;
          const actualFee = waived ? 0 : fee;
          if (actualFee > 0 && c.budget < actualFee) return c;
          if (waived && fee > 0) {
            c.staffTerminationWaiver = false;
            c.log = [`📜 ใช้สิทธิ์ยกเว้นค่าปรับเลิกจ้าง (ประหยัดไป ${formatMoney(fee)})`, ...c.log];
          } else if (actualFee > 0) {
            c.budget -= actualFee;
            c.log = [`✂️ เลิกจ้างแมวมอง ${c.youthScout.name} จ่ายค่าปรับ ${formatMoney(actualFee)}`, ...c.log];
          }
          c.youthScout = { ...scout, hiredSeason: c.season };
          c.log = [`🔎 จ้าง ${card.name} (${card.stars}★) แทนแมวมองเยาวชนจากการ์ด`, ...c.log];
        } else {
          locked = true;
          return c;
        }
      }

      c.staffCardBag.splice(idx, 1);
      hired = true;
      return c;
    });
    if (hired) {
      setManagerHireConfirm(null);
      showToast("จ้างจากการ์ดสำเร็จ!");
    } else if (locked) {
      showToast("ตำแหน่งนี้เพิ่งเปลี่ยนสตาฟไปแล้ว — เปลี่ยนใหม่ได้ตอนขึ้นฤดูกาลหน้า");
    } else showToast("จ้างไม่สำเร็จ — งบไม่พอจ่ายค่าปรับ");
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
  /* ---------- บอร์ดซ้อมรายตำแหน่ง ---------- */
  function setDrillPlan(group, plan) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      if (!c.drillPlans) c.drillPlans = defaultDrillPlans();
      c.drillPlans[group] = (plan || []).filter((id) => DRILLS[id] && DRILLS[id].groups.includes(group)).slice(0, MAX_DRILLS_PER_GROUP);
      return c;
    });
  }
  function autoAssignDrills(group) {
    setDrillPlan(group, defaultDrillPlans()[group]);
    showToast(`โค้ชจัดโปรแกรมซ้อม${POS_TH[group]}ให้แล้ว`);
  }
  function autoAssignAnalystDrills(group) {
    const plan = suggestDrillPlanForGroup(group, uSquad.filter((p) => p.injuryDays <= 0), DRILLS, MAX_DRILLS_PER_GROUP);
    if (!plan.length) { showToast("Analyst ยังหาท่าซ้อมที่เหมาะไม่ได้"); return; }
    setDrillPlan(group, plan);
    showToast(`📊 Analyst จัดท่าซ้อม${POS_TH[group]} ${plan.length} ท่าแล้ว`);
  }
  function autoAssignAllAnalystDrills() {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const sq = c.players.filter((p) => p.teamId === c.userTeamId && p.injuryDays <= 0);
      if (!c.drillPlans) c.drillPlans = defaultDrillPlans();
      DRILL_GROUPS.forEach((g) => {
        const plan = suggestDrillPlanForGroup(g, sq, DRILLS, MAX_DRILLS_PER_GROUP);
        if (plan.length) c.drillPlans[g] = plan;
      });
      return c;
    });
    showToast("📊 Analyst จัดบอร์ดซ้อมทุกตำแหน่งแล้ว");
  }
  function runDrillSessionNow(group) {
    let result = null;
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      if (!c.drillDoneDay) c.drillDoneDay = {};
      if (c.drillDoneDay[group] === c.day) { result = "done"; return c; }
      const res = applyDrillSession(c, group);
      if (!res) { result = "empty"; return c; }
      c.drillDoneDay[group] = c.day;
      result = "ok";
      c.log = [`🏟️ ซ้อมรายตำแหน่ง ${POS_TH[group]} ${res.count} คน เสร็จแล้ว (คอนดิชัน -${res.cost}%)`, ...c.log];
      return c;
    });
    if (result === "ok") showToast(`✅ ${POS_TH[group]} ซ้อมเสร็จแล้ว!`);
    else if (result === "done") showToast("กลุ่มนี้ซ้อมไปแล้ววันนี้ — พรุ่งนี้ค่อยซ้อมใหม่");
    else showToast("ยังไม่มีท่าซ้อม/นักเตะพร้อมซ้อมในกลุ่มนี้");
  }
  function setIndividualFocus(playerId, focusType) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const current = { ...(c.individualFocus || {}) };
      const slots = (c.facilities || {}).techLab || 1;
      if (!focusType || current[playerId] === focusType) {
        delete current[playerId];
      } else if (current[playerId] || Object.keys(current).length < slots) {
        current[playerId] = focusType;
      } else {
        return c; // เต็มโควตาช่องโฟกัส
      }
      c.individualFocus = current;
      return c;
    });
  }
  function runTrainingCamp() {
    let result = "ok";
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      if (c.day < (c.trainingCampCooldownDay || 0)) { result = "cooldown"; return c; }
      const cost = trainingCampCost(c.facilities);
      if (c.budget < cost) { result = "budget"; return c; }
      c.budget -= cost;
      c.trainingCampCooldownDay = c.day + TRAINING_CAMP_COOLDOWN_DAYS;
      const uSquad = c.players.filter((p) => p.teamId === c.userTeamId);
      uSquad.forEach((p) => {
        bumpAttrs(p, 0.5);
        p.stamina = 100;
        p.morale = clamp(p.morale + 10, 10, 99);
      });
      c.log = [`🏕️ จัดแคมป์ฝึกพิเศษ! ทีมชุดใหญ่ฟิตเต็มร้อย มูดพุ่ง พัฒนาการกระชากขึ้น (-${formatMoney(cost)})`, ...c.log];
      return c;
    });
    if (result === "cooldown") showToast("แคมป์ฝึกยังอยู่ในช่วงพัก รอรอบถัดไปก่อน");
    else if (result === "budget") showToast("งบไม่พอจัดแคมป์ฝึกพิเศษ");
    else showToast("🏕️ จัดแคมป์ฝึกพิเศษสำเร็จ!");
  }

  /* ---------- youth academy ---------- */
  function hireYouthScout() {
    let locked = false;
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      if (!c.youthScoutOffer || c.budget < c.youthScoutOffer.signingCost) return c;
      if (isStaffRoleLocked(c.youthScout, c.season)) { locked = true; return c; }
      c.budget -= c.youthScoutOffer.signingCost;
      c.youthScout = { ...c.youthScoutOffer, hiredSeason: c.season }; c.youthScoutOffer = null;
      c.log = [`🔎 จ้าง ${c.youthScout.name} เป็นแมวมองเยาวชนแล้ว`, ...c.log];
      return c;
    });
    showToast(locked ? "ตำแหน่งนี้เปลี่ยนใหม่ได้ตอนขึ้นฤดูกาลหน้า" : "จ้างแมวมองเยาวชนสำเร็จ!");
  }
  function hireMarketScout() {
    let locked = false;
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      if (!c.marketScoutOffer || c.budget < c.marketScoutOffer.signingCost) return c;
      if (isStaffRoleLocked(c.marketScout, c.season)) { locked = true; return c; }
      c.budget -= c.marketScoutOffer.signingCost;
      c.marketScout = { ...c.marketScoutOffer, hiredSeason: c.season }; c.marketScoutOffer = null;
      c.log = [`🔭 จ้าง ${c.marketScout.name} เป็นแมวมองทีมชุดใหญ่แล้ว`, ...c.log];
      return c;
    });
    showToast(locked ? "ตำแหน่งนี้เปลี่ยนใหม่ได้ตอนขึ้นฤดูกาลหน้า" : "จ้างแมวมองทีมชุดใหญ่สำเร็จ!");
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
  function signProspect(prospectId) {
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const p = c.youthProspects.find((x) => x.prospectId === prospectId);
      if (!p || c.budget < p.signingCost) return c;
      c.budget -= p.signingCost;
      c.academyPlayers.push({ ...p, teamId: c.userTeamId, contractEndsDay: c.day + rand(150, 400) });
      c.youthProspects = c.youthProspects.filter((x) => x.prospectId !== prospectId);
      c.log = [`✅ เซ็นดาวรุ่ง ${p.name} (${playerPosTH(p)}) เข้าอคาเดมีแล้ว`, ...c.log];
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
  if (loading) return <div style={{ minHeight: "100vh", background: C.pitchDark, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}><div style={{ color: C.chalk, fontFamily: FM_FONT }}>{loadMsg}</div><div style={{ fontSize: 11, color: C.textDim }}>ครั้งแรกอาจใช้เวลา 5–15 วินาที</div></div>;
  if (!splashDone) return <SplashScreen />;
  if (!gameEntered) {
    return (
      <TitleScreen
        onEnter={() => setGameEntered(true)}
        hasProfile={!!profile}
        hasCareer={!!career}
        profile={profile}
        career={career}
        accountUser={accountUser}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
      />
    );
  }
  if (!profile && !introDone) {
    return (
      <IntroCutscene
        username={accountUser?.username}
        introStorageKey={saveKeysRef.current.introKey}
        onComplete={() => setIntroDone(true)}
      />
    );
  }
  if (!profile) return <ProfileSetup onSave={saveProfile} booting={booting} toast={toast} />;
  if (!career && !chosenPlayMode) return <ModeSelectScreen onChoose={setChosenPlayMode} />;
  if (!career) return <ClubCreator profile={profile} onCreate={(clubConfig) => startCareer(clubConfig, chosenPlayMode)} booting={booting} toast={toast} />;

  const uTeam = userTeam();
  if (!uTeam) {
    return (
      <div style={{ minHeight: "100vh", background: C.pitchDark, color: C.chalk, padding: 24, fontFamily: FM_FONT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <h2 style={{ color: C.amber, margin: 0 }}>⚠️ เซฟเสียหาย</h2>
        <p style={{ color: C.textDim, textAlign: "center", maxWidth: 360, lineHeight: 1.6 }}>ไม่พบทีมของคุณในไฟล์เซฟ — กดปุ่มด้านล่างเพื่อเริ่มใหม่</p>
        <button type="button" onClick={resetCareer} style={{ ...btnStyle(C.amber, "#0b2318"), width: "min(280px, 90vw)" }}>เริ่มอาชีพใหม่</button>
      </div>
    );
  }
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
  const xiPicked = xi.filter((id) => uSquad.find((p) => p.id === id && p.injuryDays <= 0 && (p.suspendedMatches || 0) <= 0)).length;
  const xiAfterFill = fillLineupGaps(uSquad, xi, uTeam.formation).length;
  const canKickoff = xiAfterFill >= MIN_XI_SIZE;
  const injuredCount = uSquadRaw.filter((p) => p.injuryDays > 0).length;
  const wageBill = squadDailyWageBill(uSquad, career.staff[uTeam.id], uTeam.manager, {
    marketScout: career.marketScout,
    youthScout: career.youthScout,
    academyManager: career.academyManager,
  });
  const marketOpen = resolveMarketOpen(career, new Date(now));
  const uiLang = resolveUiLang(profile);
  const matchPrep = career.matchPrep || defaultMatchPrep();
  const matchScout = opponent && userMatch && !seasonOver
    ? buildMatchScoutReport(career, uTeam, opponent, uSquad, oppSquadRaw, xi, isHome)
    : null;

  return (
    <div className="fc-game-shell">
      <div className="fc-game-bg" style={{ backgroundImage: `url(${BRAND_LOGIN_BG})` }} aria-hidden />
      <div className="fc-game-noise" aria-hidden />
      <div className="fc-game-content">
      <BetaStrip />
      <FMHeader uTeam={uTeam} career={career} userLeague={userLeague} budget={career.budget} wageBill={wageBill} sockerCoins={profile?.sockerCoins || 0} onOpenShop={() => setTab("shop")} uiLang={uiLang} accountUser={accountUser} onLogout={onLogout} />

      {toast && <div className="fc-toast">{toast}</div>}

      {leaguePickOpen && (
        <LeaguePickModal currentLeagueId={career.legendLeagueId} onPick={confirmLeaguePick} onClose={() => setLeaguePickOpen(false)} />
      )}
      {managerHireConfirm && (
        <ManagerHireConfirmModal
          name={managerHireConfirm.name}
          stars={managerHireConfirm.stars}
          preferredFormation={managerHireConfirm.preferredFormation}
          weeklyWage={managerHireConfirm.weeklyWage}
          signingCost={managerHireConfirm.signingCost}
          terminationFee={managerHireConfirm.terminationFee}
          daysLeft={managerHireConfirm.daysLeft}
          currentName={managerHireConfirm.currentName}
          budget={career.budget}
          onConfirm={() => {
            if (managerHireConfirm.source === "card") hireFromStaffCard(managerHireConfirm.cardId);
            else hireManager();
          }}
          onCancel={() => setManagerHireConfirm(null)}
        />
      )}
      {mergeReport && <MergeResultModal report={mergeReport} onClose={() => setMergeReport(null)} />}
      {career?.flashWorldNewsId && (
        <WorldNewsFlash
          item={career.worldNews?.find((w) => w.id === career.flashWorldNewsId)}
          onClose={dismissWorldNewsFlash}
        />
      )}

      {career.liveMatch && career.playMode !== "online" && <LiveMatchModal career={career} liveMatch={career.liveMatch} userAutoMode={uTeam.autoMode} onFinish={finishLiveMatch} suggestTacticSwitch={suggestTacticSwitch} fullOnlineMode={false} />}
      {career.playMode === "online" && tab !== "onlinematch" && (
        <OnlineFloatingScoreWidget onOpen={() => setTab("onlinematch")} />
      )}

      <div className="fc-main-wrap">
        {tab === "dashboard" && <SandboxModePanel career={career} onEnterOnline={enterOnlineMode} compact />}
        {tab === "dashboard" && (
          <Dashboard career={career} uTeam={uTeam} standings={standings} userMatch={userMatch} opponent={opponent}
            isHome={isHome} seasonOver={seasonOver} onAdvance={advanceDay} onKickoff={kickoffUserMatch}
            onGoTactics={() => setTab("tactics")} onGoManager={() => setTab("manager")}
            xiPicked={xiPicked} xiAfterFill={xiAfterFill} canKickoff={canKickoff} injuredCount={injuredCount} onNewSeason={startNewSeason}
            matchScout={matchScout} matchPrep={matchPrep}
            onSetMentality={setMatchPrepMentality} onToggleInstruction={toggleMatchPrepInstruction}
            onSetTeamTalk={setMatchPrepTeamTalk} onUpgradeSponsor={upgradeSponsor}
            onApplySuggested={applySuggestedPrep} onGoClub={() => setTab("club")}
            onSetPrepField={setMatchPrepField} onBoardMove={moveBoardPiece}
            onMarkNewsRead={markWorldNewsRead}
            onPressChoice={handlePressChoice}
            onConversationResolve={handleConversationResolve}
            onAssignScoutZone={handleAssignScoutZone}
            onAddShadowTarget={handleAddShadowTarget}
            onSetDelegation={handleSetDelegation}
            onRestartAfterSack={handleRestartAfterSack} />
        )}
        {tab === "club" && (
          <ClubHubView career={career} uTeam={uTeam} standings={standings} seasonOver={seasonOver}
            onUpgradeSponsor={upgradeSponsor} onUpgradeStadium={upgradeStadium}
            onHireCard={requestHireFromStaffCard} uiLang={uiLang} />
        )}
        {tab === "profile" && (
          <ProfileView career={career} uTeam={uTeam} standings={standings} />
        )}
        {tab === "manager" && (
          <ManagerView career={career} uTeam={uTeam} userMatch={userMatch} opponent={opponent} isHome={isHome}
            seasonOver={seasonOver} matchAdvice={matchAdvice} xiPicked={xiPicked} xiAfterFill={xiAfterFill}
            onTerminateManager={terminateManager} onChooseSeasonGoal={chooseSeasonGoal}
            onAllocateSkillPoint={allocateSkillPoint} onApplyManagerLineup={applyManagerLineupForMatch}
            onGoTactics={() => setTab("tactics")} onHireManagerCard={requestHireFromStaffCard} />
        )}
        {tab === "tactics" && (
          <TacticsView
            career={career}
            squad={uSquad}
            team={uTeam}
            xi={xi}
            matchScout={matchScout}
            matchPrep={matchPrep}
            seasonOver={seasonOver}
            onSetFormation={setFormation}
            onToggleAuto={toggleAutoMode}
            onSetPlayerRole={setPlayerRole}
            onSetPlayerDuty={setPlayerDuty}
            onSetSetPieceTaker={setSetPieceTaker}
            onBoardMove={moveBoardPiece}
            onSetPrepField={setMatchPrepField}
            onAutoPick={autoPickLineup}
            onSetMentality={setMatchPrepMentality}
            onToggleInstruction={toggleMatchPrepInstruction}
            onSetTeamTalk={setMatchPrepTeamTalk}
            onApplySuggested={applySuggestedPrep}
          />
        )}
        {tab === "squad" && (
          <SquadView
            squad={uSquad}
            xi={xi}
            squadSize={uSquadRaw.length}
            injuredCount={injuredCount}
            canKickoff={canKickoff}
            xiAfterFill={xiAfterFill}
            allowSell={false}
            budget={career.budget}
            currentDay={career.day}
            onRenewContract={renewPlayerContract}
            onGoMedical={() => setTab("medical")}
            onGoCoach={() => setTab("coach")}
            uiLang={uiLang}
            teams={career.teams}
            leagueId={career.legendLeagueId || "thailand"}
            team={uTeam}
          />
        )}
        {tab === "market" && (
          <MarketHubView
            subTab={marketSub}
            setSubTab={setMarketSub}
            list={career.transferList}
            scoutFinds={career.scoutFinds || []}
            budget={career.budget}
            onBid={placeBid}
            onBuyScoutFind={buyScoutFind}
            onScoutSearch={manualScoutSearch}
            onHireMarketScout={hireMarketScout}
            onHireScoutCard={requestHireFromStaffCard}
            marketOpen={marketOpen}
            now={now}
            career={career}
            onAcquireLegend={acquireLegend}
            playMode={career.playMode}
            squad={uSquad}
            squadSize={uSquadRaw.length}
            onSell={sellPlayer}
          />
        )}
        {tab === "training" && (
          <TrainingView trainingPlan={career.trainingPlan} autoTraining={career.autoTraining} currentSlot={(career.day - 1) % 10}
            onSetDay={setTrainingDay} onToggleAuto={toggleAutoTraining} onAutoAssign={autoAssignTraining}
            facilities={career.facilities} budget={career.budget} onUpgradeFacility={upgradeFacility} globalFanbase={career.globalFanbase}
            squad={uSquad} staff={career.staff[uTeam.id] || {}}
            individualFocus={career.individualFocus || {}} onSetFocus={setIndividualFocus}
            campCooldownDay={career.trainingCampCooldownDay || 0} currentDay={career.day} onRunCamp={runTrainingCamp}
            drillPlans={career.drillPlans || {}} drillDoneDay={career.drillDoneDay || {}}
            onSetDrillPlan={setDrillPlan} onAutoDrills={autoAssignDrills} onRunDrills={runDrillSessionNow}
            trainingReports={career.trainingReports || []}
            staffBonuses={staffSupportBonuses(career, uTeam.id)}
            onAutoAnalystDrills={autoAssignAnalystDrills} onAutoAnalystAll={autoAssignAllAnalystDrills}
            constructionQueue={career.constructionQueue || []} />
        )}
        {tab === "academy" && (
          <AcademyView career={career} budget={career.budget}
            onHireScout={hireYouthScout}
            onHireScoutCard={requestHireFromStaffCard}
            onHireAcademyManager={hireAcademyManager}
            onSignProspect={signProspect} onLoanOut={loanOutPlayer} onSellAcademy={sellAcademyPlayer} onPromote={promotePlayer} />
        )}
        {tab === "more" && (
          <MoreView setTab={setTab} marketOpen={marketOpen} isOnline={career.playMode === "online"} />
        )}
        {tab === "onlinemarket" && (
          <OnlineMarketView uiLang={uiLang} />
        )}
        {tab === "onlinematch" && (
          <OnlineMatchCenterView uiLang={uiLang} />
        )}
        {tab === "battlepass" && (
          <BattlePassView uiLang={uiLang} />
        )}
        {tab === "table" && (
          <TableView
            career={career}
            userTeamId={career.userTeamId}
            userDivision={uTeam.division}
            round={round}
            teams={career.teams}
            players={career.players}
            legendLeagueId={career.legendLeagueId}
          />
        )}
        {tab === "medical" && (
          <MedicalRoomView
            career={career}
            squad={uSquad}
            budget={career.budget}
            inventory={profile?.inventory || {}}
            onUseItemFromBag={useItemFromBag}
            onUpgradeFacility={upgradeFacility}
            onHireCoach={hireCoach}
            onHireCard={requestHireFromStaffCard}
          />
        )}
        {tab === "coach" && (
          <CoachRoomView
            career={career}
            staff={career.staff[uTeam.id] || {}}
            coachOffers={career.coachOffers}
            budget={career.budget}
            onHireCoach={hireCoach}
            onHireCard={requestHireFromStaffCard}
            uiLang={uiLang}
          />
        )}
        {tab === "staffcards" && (
          <StaffCardsView
            career={career}
            uiLang={uiLang}
            onPull={pullFromMachine}
            onPullOnline={pullOnlineMachine}
            onOpenPlatinum={openPlatinumPack}
            onMerge={mergeStaffCards}
            onHire={requestHireFromStaffCard}
            onAutoMerge={runAutoMergeNow}
            onToggleAutoTier={toggleAutoMergeTier}
            onToggleLock={toggleStaffCardLock}
          />
        )}
        {tab === "staffguide" && <StaffGuideView career={career} uiLang={uiLang} />}
        {tab === "shop" && (
          <ShopView
            sockerCoins={profile?.sockerCoins || 0}
            inventory={profile?.inventory || {}}
            shopBuyCount={shopBuyCountToday(profile)}
            onPurchasePack={purchaseCoinPack}
            onBuyItemToBag={buyShopItemToBag}
          />
        )}
        {tab === "settings" && (
          <SettingsView
            career={career}
            onReset={resetCareer}
            onEnterOnline={enterOnlineMode}
            onExitOnline={exitOnlineMode}
            uiLang={uiLang}
            onSetUiLang={setUiLang}
            accountUser={accountUser}
            onOpenAuth={onOpenAuth}
            onOpenOnlinePortal={onOpenOnlinePortal}
            onLogout={onLogout}
          />
        )}
        {tab === "feedback" && (
          <FeedbackView uiLang={uiLang} />
        )}
      </div>

      <BottomNav tab={tab} setTab={setTab} marketOpen={marketOpen} marketSub={marketSub} setMarketSub={setMarketSub} uiLang={uiLang} />
      </div>
    </div>
  );
}

/* ============================== BRANDING — splash + login backdrop ============================== */
function SplashScreen() {
  return (
    <div className="fc-title-screen">
      <div className="fc-title-bg" style={{ backgroundImage: `url(${BRAND_LOGIN_BG})` }} aria-hidden />
      <div className="fc-game-noise" aria-hidden />
      <img src={BRAND_SPLASH_LOGO} alt={GAME_NAME} className="fc-title-logo" style={{ position: "relative", zIndex: 1 }} />
    </div>
  );
}

function LoginBackdrop({ children, style }) {
  return (
    <div className="fc-title-screen" style={style}>
      <div className="fc-title-bg" style={{ backgroundImage: `url(${BRAND_LOGIN_BG})` }} aria-hidden />
      <div className="fc-game-noise" aria-hidden />
      <div className="fc-title-inner">{children}</div>
    </div>
  );
}

/* ============================== TITLE SCREEN ============================== */
/** จำนวนคนออนไลน์ตอนนี้ — ดึงจาก /api/online-count (Cloudflare Pages Function ที่เก็บ Umami API
 * key ไว้ฝั่งเซิร์ฟเวอร์) โพลทุก 45 วิ ถ้า fetch ล้มเหลว/endpoint ไม่มี ให้ซ่อนเงียบๆ ไม่โชว์อะไรเลย
 * (ห้ามกระทบหน้าเข้าเกมแม้ analytics จะล่ม) */
function OnlineCountBadge() {
  const [online, setOnline] = useState(null);
  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await fetch("/api/online-count");
        if (!res.ok) return;
        const data = await res.json();
        if (alive && typeof data.online === "number") setOnline(data.online);
      } catch {
        // เงียบไว้ — ไม่ให้กระทบหน้าเข้าเกม
      }
    }
    poll();
    const iv = setInterval(poll, 45000);
    return () => { alive = false; clearInterval(iv); };
  }, []);
  if (online == null) return null;
  return (
    <div style={{ fontSize: 11, color: C.good, fontFamily: MONO_FONT, marginBottom: 10, display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.good, display: "inline-block" }} />
      {online} คนออนไลน์ตอนนี้
    </div>
  );
}

function TitleScreen({
  onEnter,
  hasProfile,
  hasCareer,
  profile,
  career,
  accountUser,
  onOpenAuth,
  onLogout,
}) {
  const teamName = hasCareer ? career?.teams?.find((t) => t.id === career.userTeamId)?.name : null;
  const [shareMsg, setShareMsg] = useState(null);
  const isWeb = typeof window !== "undefined" && window.location.protocol.startsWith("http");
  const playUrl = typeof window !== "undefined" ? window.location.origin + "/play" : "";

  async function shareLink() {
    const text = `ลองเล่น ${GAME_NAME} — ${GAME_TAGLINE}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: GAME_NAME, text, url: playUrl });
        return;
      }
      await navigator.clipboard.writeText(playUrl);
      setShareMsg("คัดลอกลิงก์แล้ว");
    } catch {
      setShareMsg("คัดลอก URL จากแถบด้านบน");
    }
    setTimeout(() => setShareMsg(null), 2800);
  }

  return (
    <LoginBackdrop>
      {accountUser ? (
        <span className="fc-eyebrow">
          ยินดีต้อนรับ · @{accountUser.username || accountUser.displayName || "ผู้เล่น"}
        </span>
      ) : (
        <span className="fc-eyebrow">Game ID · สมัครฟรี · เซฟผูกบัญชี</span>
      )}
      <OnlineCountBadge />
      <img src={BRAND_SPLASH_LOGO} alt={GAME_NAME} className="fc-title-logo" />
      <p className="fc-title-tagline">{GAME_TAGLINE}</p>
      <div style={{ fontSize: 11.5, color: C.textDim, marginBottom: 20, lineHeight: 1.55, maxWidth: 340, textAlign: "center" }}>
        ระบบเดียวกับออนไลน์ — ตอนนี้แข่งกับบอทจนกว่าจะมีผู้เล่นครบ
      </div>

      {hasCareer && teamName && (
        <div className="fc-save-card">
          {profile?.avatar} {profile?.name} · {teamName} · ฤดูกาล {career.season} วัน {career.day}
        </div>
      )}

      {!accountUser ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "min(320px, 90vw)" }}>
          <button type="button" className="fc-btn fc-btn--primary" onClick={() => onOpenAuth?.(true)}>
            สมัคร Game ID ฟรี
          </button>
          <button type="button" className="fc-btn fc-btn--ghost" onClick={() => onOpenAuth?.(false)}>
            เข้าสู่ระบบ
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            className="fc-btn fc-btn--primary"
            onClick={onEnter}
            style={{ width: "min(320px, 90vw)", fontSize: 16, padding: "16px 0", letterSpacing: 2 }}
          >
            ▶ {hasCareer ? "เข้าเล่น" : "เริ่มเล่น"}
          </button>
          <button
            type="button"
            className="fc-btn fc-btn--ghost"
            onClick={() => onLogout?.()}
            style={{ width: "min(320px, 90vw)", fontSize: 12, padding: "12px 0", marginTop: 10 }}
          >
            ออกจากระบบ
          </button>
        </>
      )}

      {isWeb && accountUser && (
        <button
          type="button"
          className="fc-btn fc-btn--ghost"
          onClick={shareLink}
          style={{ width: "min(320px, 90vw)", fontSize: 12, padding: "12px 0", marginTop: 10 }}
        >
          🔗 แชร์ลิงก์ให้เพื่อน
        </button>
      )}
      {shareMsg && <div style={{ fontSize: 11, color: C.good, marginTop: 8 }}>{shareMsg}</div>}

      <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 20, maxWidth: 340, lineHeight: 1.55, textAlign: "center" }}>
        v{GAME_VERSION} · {BETA_TEST ? "Test Beta" : "Play"}
      </div>
    </LoginBackdrop>
  );
}

/* ============================== TEAM PICKER ============================== */
const AVATAR_CHOICES = ["⚽", "🎯", "🏆", "👔", "🧢", "📋", "🔥", "⭐", "🦁", "🛡️"];
function SetupToast({ toast }) {
  if (!toast) return null;
  return <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: C.crimson, color: C.chalk, padding: "10px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, zIndex: 80, maxWidth: "90vw", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,.4)" }}>{toast}</div>;
}
/** เลือกโหมดหลัง login ก่อนสร้างทีมครั้งแรก — โลกจำลอง (โซโล) หรือ ออนไลน์ (ลีค 16 คนจริง) */
function ModeSelectScreen({ onChoose }) {
  return (
    <LoginBackdrop style={{ padding: 20, display: "flex", alignItems: "center" }}>
      <div style={{ maxWidth: 460, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src={BRAND_SPLASH_LOGO} alt={GAME_NAME} style={{ maxWidth: "min(260px, 72vw)", width: "100%", height: "auto", marginBottom: 10 }} />
          <div style={{ fontSize: 12.5, color: C.textDim, marginTop: 6 }}>เลือกโหมดที่จะเล่น (เปลี่ยนทีหลังได้ในตั้งค่า)</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button type="button" onClick={() => onChoose("sandbox")} style={{
            textAlign: "left", padding: "18px 16px", borderRadius: 14, cursor: "pointer",
            background: C.panel2, border: `2px solid ${C.steel}`, color: C.chalk,
          }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>🎮 โลกจำลอง</div>
            <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.55 }}>
              เล่นคนเดียวตามจังหวะตัวเอง เร่งความเร็ว/ข้ามแมตช์ได้เต็มที่ เหมาะสำหรับฝึกฝน/ผู้เล่นใหม่
            </div>
          </button>
          <button type="button" onClick={() => onChoose("online")} style={{
            textAlign: "left", padding: "18px 16px", borderRadius: 14, cursor: "pointer",
            background: "rgba(224,164,88,.12)", border: `2px solid ${C.amber}`, color: C.chalk,
          }}>
            <div style={{ fontSize: 20, marginBottom: 6, color: C.amber }}>🌐 ออนไลน์</div>
            <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.55 }}>
              ลีคเดียวกับผู้เล่นจริง 16 คน (บอทเติมที่ว่างช่วงแรก) · เสนอซื้อขายนักเตะตรงกับทีมอื่น ·
              แข่งขันตามเวลาจริง 9:00-20:00 น. · ห้ามเร่งเวลา/ข้ามแมตช์
            </div>
          </button>
        </div>
      </div>
    </LoginBackdrop>
  );
}

function ProfileSetup({ onSave, booting, toast }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_CHOICES[0]);
  const canSave = !!name.trim() && !booting;
  return (
    <LoginBackdrop style={{ padding: 20, display: "flex", alignItems: "center" }}>
      <SetupToast toast={toast} />
      <div style={{ maxWidth: 420, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src={BRAND_SPLASH_LOGO} alt={GAME_NAME} style={{ maxWidth: "min(260px, 72vw)", width: "100%", height: "auto", marginBottom: 10 }} />
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
          <button type="button" disabled={!canSave} onClick={() => onSave({ name: name.trim(), avatar, sockerCoins: STARTER_MASTER_COINS, inventory: {}, shopBuyDay: "", shopBuyCount: 0, uiLang: getDefaultGameUiLang() })} style={{ ...fmBtnPrimary(), ...(canSave ? {} : { background: "#2a3530", color: C.textDim, cursor: "not-allowed", opacity: 0.75 }) }}>
            {booting ? "กำลังเตรียม..." : "เข้าสู่ระบบ"}
          </button>
          {!name.trim() && <div style={{ fontSize: 10, color: C.textDim, marginTop: 8, textAlign: "center" }}>พิมพ์ชื่อผู้จัดการก่อน แล้วกดปุ่ม</div>}
          <div style={{ fontSize: 10, color: C.gold, marginTop: 10, textAlign: "center" }}>
            {BETA_TEST
              ? `🎁 Beta Test — Master Coin ${STARTER_MASTER_COINS} · งบสโมสรเริ่ม ${formatMoney(STARTING_BUDGET)}`
              : `🎁 ผู้เล่นใหม่ได้ Master Coin ${STARTER_MASTER_COINS} เหรียญ`}
          </div>
        </Panel>
      </div>
    </LoginBackdrop>
  );
}

function ClubCreator({ profile, onCreate, booting, toast }) {
  const [name, setName] = useState("");
  const canStart = !!name.trim() && !booting;
  const [logoIndex, setLogoIndex] = useState(0);
  const [primaryColor, setPrimaryColor] = useState("#c1440e");
  const [secondaryColor, setSecondaryColor] = useState("#f2f0e6");
  const [shirtColor, setShirtColor] = useState("#c1440e");
  const [shortsColor, setShortsColor] = useState("#0b2318");
  const short = name.trim().slice(0, 3).toUpperCase() || "CLB";
  const previewTeam = { color: primaryColor, secondaryColor, logoIndex };
  return (
    <LoginBackdrop style={{ padding: 20, paddingBottom: 40 }}>
      <SetupToast toast={toast} />
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
          type="button"
          disabled={!canStart}
          onClick={() => onCreate({ name: name.trim(), short, logoIndex, primaryColor, secondaryColor, shirtColor, shortsColor })}
          style={{ ...fmBtnPrimary(), ...(canStart ? {} : { background: "#2a3530", color: C.textDim, cursor: "not-allowed", opacity: 0.75 }) }}
        >{booting ? "กำลังสร้างโลก..." : "เริ่มอาชีพผู้จัดการ"}</button>
        {!name.trim() && <div style={{ fontSize: 10, color: C.textDim, marginTop: 8, textAlign: "center" }}>พิมพ์ชื่อสโมสรก่อน แล้วกดปุ่ม</div>}
      </div>
    </LoginBackdrop>
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

/* ============================== LEAGUE PICK (ONLINE) ============================== */
function LeaguePickModal({ currentLeagueId, onPick, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Panel style={{ maxWidth: 420, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
        <SectionLabel>🌐 เลือกลีกออนไลน์</SectionLabel>
        <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6, marginBottom: 14 }}>
          ทุกลีกมี 16 ทีม · roster ~23 คน/ทีม อิงโลกจริง · ซูเปอร์สตาร์คว้าได้ใน Master League
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {LEGEND_LEAGUES.map((lg) => {
            const full = hasFullRosterLeague(lg.id);
            const rosterCount = full ? getRosterForLeague(lg.id).length : 0;
            return (
            <button key={lg.id} onClick={() => onPick(lg.id)} style={{
              textAlign: "left", padding: "12px 14px", borderRadius: 10, cursor: "pointer",
              border: `1px solid ${currentLeagueId === lg.id ? C.amber : C.steel}`,
              background: currentLeagueId === lg.id ? "rgba(224,164,88,.12)" : C.panel2, color: C.chalk,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{lg.emoji} {lg.name}</div>
              <div style={{ fontSize: 11, color: C.textDim }}>
                {lg.region} · 16 ทีม
                {full && <> · <span style={{ color: C.good }}>full roster</span> ({rosterCount} นักเตะ)</>}
              </div>
            </button>
            );
          })}
        </div>
        <button onClick={onClose} style={{ ...btnStyle("transparent", C.textDim), border: `1px solid ${C.steel}`, marginTop: 12 }}>ยกเลิก</button>
      </Panel>
    </div>
  );
}

/* ============================== SANDBOX / ONLINE UNLOCK ============================== */
function SandboxModePanel({ career, onEnterOnline, onExitOnline, compact }) {
  const fin = computeTeamFinances(career);
  const pct = clamp((fin.teamValue / ONLINE_UNLOCK_TEAM_VALUE) * 100, 0, 100);
  const unlocked = career.onlineUnlocked;
  const inOnline = career.playMode === "online";
  const valueOk = fin.teamValue >= 0;

  if (inOnline) {
    if (compact) return null;
    return (
      <Panel style={{ marginBottom: 8 }} accent={C.good}>
        <SectionLabel>โหมดออนไลน์</SectionLabel>
        <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10 }}>มูลค่าสโมสร <span style={{ color: C.amber, fontFamily: MONO_FONT }}>{formatMoney(fin.teamValue)}</span></div>
        {onExitOnline && (
          <>
            <button type="button" onClick={onExitOnline} style={{ ...fmBtnGhost(), width: "100%" }}>🕹️ กลับไปโลกจำลอง (Sandbox)</button>
            <div style={{ fontSize: 9.5, color: C.textDim, marginTop: 6, lineHeight: 1.5 }}>สโมสรออนไลน์ยังอยู่ — กดเข้าออนไลน์ใหม่ได้เสมอทีหลัง</div>
          </>
        )}
      </Panel>
    );
  }

  if (compact) {
    return (
      <div style={{ marginBottom: 8, padding: "8px 10px", background: C.panel2, borderRadius: 6, border: `1px solid ${C.steel}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.textDim, marginBottom: 4 }}>
          <span>{unlocked ? "ปลดล็อกออนไลน์แล้ว" : "โลกจำลอง"}</span>
          <span style={{ fontFamily: MONO_FONT, color: fin.teamValue >= ONLINE_UNLOCK_TEAM_VALUE ? C.good : C.amber }}>{formatMoney(fin.teamValue)} / 50M</span>
        </div>
        <MiniBar value={pct} color={fin.teamValue >= ONLINE_UNLOCK_TEAM_VALUE ? C.good : C.purple} />
        {unlocked && valueOk && (
          <button type="button" onClick={onEnterOnline} style={{ ...fmBtnGhost(), marginTop: 6, padding: "6px 0", fontSize: 10, color: C.good, borderColor: C.good, width: "100%" }}>เข้าสู่โลกออนไลน์</button>
        )}
      </div>
    );
  }

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

  return (
    <Panel style={{ marginBottom: 12 }} accent={unlocked ? C.good : C.purple}>
      <SectionLabel>โลกจำลอง — เล่นคนเดียว</SectionLabel>
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

/* ============================== MANAGER TAB ============================== */
function ManagerTierPerksList({ stars, perks, compact, accent = C.gold }) {
  const list = perks || managerTierDef(stars).perks;
  const tier = managerTierDef(stars);
  if (!list?.length) return null;
  const shown = compact ? list.slice(0, 2) : list;
  return (
    <div style={{
      marginTop: compact ? 4 : 8, padding: compact ? "6px 8px" : "8px 10px", borderRadius: 8,
      background: stars >= 5 ? "rgba(212,175,55,.08)" : "rgba(90,155,213,.06)",
      border: `1px solid ${stars >= 4 ? C.gold : C.steel}`,
    }}>
      <div style={{ fontSize: compact ? 9 : 9.5, color: accent, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {stars}★ · {tier.title}{!compact && " — สิทธิประโยชน์"}
      </div>
      {shown.map((p, i) => (
        <div key={i} style={{ fontSize: compact ? 9.5 : 10.5, color: C.chalk, marginBottom: 2, lineHeight: 1.4 }}>✦ {p}</div>
      ))}
      {compact && list.length > 2 && (
        <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>+{list.length - 2} สิทธิ์เพิ่มเมื่อจ้าง</div>
      )}
    </div>
  );
}

function ManagerView({ career, uTeam, userMatch, opponent, isHome, seasonOver, matchAdvice, xiPicked, xiAfterFill,
  onTerminateManager, onChooseSeasonGoal, onAllocateSkillPoint,
  onApplyManagerLineup, onGoTactics, onHireManagerCard }) {
  const mgr = uTeam.manager;
  const mgrStars = staffEntityStars(mgr);
  const mgrPlan = mgr ? managerPlanProfile(uTeam) : null;
  const daysLeftOnContract = mgr && mgr.contractEndsDay != null ? mgr.contractEndsDay - career.day : null;
  const managerCards = (career.staffCardBag || []).filter((c) => c.type === "MANAGER");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {mgr ? (
        <Panel>
          <SectionLabel>ผู้จัดการทีม</SectionLabel>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap" }}>
            <StaffPackCardFace card={{ type: "MANAGER", name: mgr.name, portrait: mgr.portrait, stars: mgr.cardStars || 3, stats: mgr.stats, preferredFormation: mgr.preferredFormation }} />
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {mgr.name}
                {mgrStars ? <StarGlyphs count={mgrStars} size={10} /> : null}
                {mgrPlan?.trait && MANAGER_TRAITS[mgrPlan.trait] && (
                  <span title={MANAGER_TRAITS[mgrPlan.trait].descTh} style={{ fontSize: 9.5, color: C.gold, fontWeight: 700, background: "rgba(212,175,55,.12)", border: `1px solid ${C.gold}55`, borderRadius: 5, padding: "1px 6px" }}>
                    🌟 {MANAGER_TRAITS[mgrPlan.trait].th}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: C.textDim, fontFamily: MONO_FONT, marginBottom: 8 }}>
            Lv.{mgr.level || 1} · ถนัด {mgr.preferredFormation} · ผลงาน {mgr.wins}ช-{mgr.draws}ส-{mgr.losses}พ
            {daysLeftOnContract != null && (daysLeftOnContract > 0 ? ` · สัญญาเหลือ ${daysLeftOnContract} วัน` : " · หมดสัญญาแล้ว")}
          </div>
          <div style={{ fontSize: 11, color: C.textDim, marginBottom: 4 }}>EXP ขึ้นเลเวล</div>
          <MiniBar value={((mgr.xp || 0) / ((mgr.level || 1) * 80)) * 100} color={C.gold} />
          <div style={{ marginTop: 12 }}><RadarStats stats={mgr.stats} /></div>
          {mgrStars && mgrPlan && (
            <ManagerTierPerksList stars={mgrStars} perks={mgrPlan.perks} />
          )}
          {mgrPlan && (
            <div style={{ marginTop: 8, fontSize: 10, fontFamily: MONO_FONT, color: C.textDim, lineHeight: 1.55 }}>
              ส่งแผนลงสนาม ×{mgrPlan.prepMult.toFixed(2)} · พลังทีม +{Math.round(mgrPlan.performanceBonus * 100)}%
              {mgrPlan.negotiationPct > 0 && ` · เจรจาซื้อ -${Math.round(mgrPlan.negotiationPct * 100)}%`}
            </div>
          )}
          {(mgr.skillPoints || 0) > 0 && (
            <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(244,201,93,.1)", border: `1px solid ${C.gold}` }}>
              <div style={{ fontSize: 11, color: C.gold, marginBottom: 8 }}>🌟 แต้มสกิล {mgr.skillPoints} — เลือกเพิ่มสเตต</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.keys(MANAGER_STAT_TH).map((k) => (
                  <button key={k} onClick={() => onAllocateSkillPoint(k)} style={{ fontSize: 10, padding: "5px 9px", borderRadius: 6, border: `1px solid ${C.gold}`, background: "transparent", color: C.gold, cursor: "pointer" }}>+{MANAGER_STAT_TH[k]}</button>
                ))}
              </div>
            </div>
          )}
          <button onClick={onTerminateManager} style={{ ...btnStyle("transparent", C.crimson), border: `1px solid ${C.crimson}`, marginTop: 12 }}>
            {daysLeftOnContract > 0 ? "เลิกจ้าง (มีค่าปรับ)" : "เลิกจ้าง"}
          </button>
        </Panel>
      ) : (
        <Panel>
          <SectionLabel>ผู้จัดการทีม</SectionLabel>
          <div style={{ fontSize: 12.5, color: C.textDim }}>ยังไม่มีผู้จัดการ — ติดตั้งจากการ์ดผจก.ที่สุ่มได้ด้านล่าง</div>
        </Panel>
      )}

      <StaffCardPickerRow cards={managerCards} title="การ์ดผจก.ที่สุ่มได้" career={career} onHire={onHireManagerCard} />

      {userMatch && opponent && !seasonOver && (
        <Panel style={{ border: `1px solid ${C.purple}` }}>
          <SectionLabel style={{ color: C.purple }}>คำแนะนำก่อนนัด</SectionLabel>
          {uTeam.autoMode ? (
            <div style={{ fontSize: 12, color: C.purple, lineHeight: 1.6 }}>
              โหมดออโต้เปิด — ผจก.จัดแผน+ตัวจริงให้ทุกนัด และปรับกลางเกมได้
            </div>
          ) : (
            <>
              {matchAdvice?.tips.map((tip, i) => (
                <div key={i} style={{ fontSize: 11.5, color: i === 0 ? C.chalk : C.textDim, marginBottom: 5, fontFamily: MONO_FONT }}>• {tip}</div>
              ))}
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 8, fontFamily: MONO_FONT }}>
                ตัวจริง {xiPicked}/11 · หลังเติมอัตโนมัติ {xiAfterFill}/11 · แผน {uTeam.formation}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button onClick={onGoTactics} style={{ ...btnStyle(C.steel, C.chalk), flex: 1, minWidth: 120, padding: "10px 0", fontSize: 12 }}>จัดทีมเอง</button>
                <button onClick={onApplyManagerLineup} style={{ ...btnStyle(C.purple, "#fff"), flex: 1, minWidth: 120, padding: "10px 0", fontSize: 12 }}>ผจก.จัดให้ (นัดนี้)</button>
              </div>
            </>
          )}
          <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 8 }}>
            นัดถัดไป: {uTeam.short} {isHome ? "เหย้า" : "เยือน"} vs {opponent.short}
          </div>
        </Panel>
      )}

      <Panel style={{ border: `1px solid ${C.gold}` }}>
        <SectionLabel style={{ color: C.gold }}>เป้าหมายฤดูกาล</SectionLabel>
        {career.seasonGoal ? (
          <div style={{ fontSize: 12.5 }}>🎯 {SEASON_GOAL_TEMPLATES.find((g) => g.id === career.seasonGoal)?.label}</div>
        ) : career.seasonGoalOptions?.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {career.seasonGoalOptions.map((g) => (
              <button key={g.id} onClick={() => onChooseSeasonGoal(g.id)} style={{ textAlign: "left", padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.steel}`, background: C.panel2, color: C.chalk, cursor: "pointer" }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{g.label}</div>
                <div style={{ fontSize: 10.5, color: C.amber, fontFamily: MONO_FONT }}>รางวัล {formatMoney(g.reward)}</div>
              </button>
            ))}
          </div>
        ) : <div style={{ fontSize: 12, color: C.textDim }}>ไม่มีเป้าหมายให้เลือก</div>}
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

    </div>
  );
}

/* ============================== MATCH BRIEFING (FM pre-match) ============================== */
function StatCompareBar({ label, us, them, higherBetter = true }) {
  const total = Math.max(us + (them ?? 0), 1);
  const usPct = (us / total) * 100;
  const usBetter = them == null ? true : higherBetter ? us >= them : us <= them;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.textDim, marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ fontFamily: MONO_FONT }}>
          <span style={{ color: usBetter ? C.good : C.chalk }}>{us}</span>
          {them != null && (
            <>
              {" · "}
              <span style={{ color: !usBetter ? C.crimson : C.textDim }}>{them}</span>
            </>
          )}
        </span>
      </div>
      <div style={{ display: "flex", height: 5, borderRadius: 3, overflow: "hidden", background: C.steel }}>
        <div style={{ width: `${usPct}%`, background: usBetter ? C.good : C.blue }} />
        {them != null && <div style={{ flex: 1, background: C.crimson, opacity: 0.55 }} />}
      </div>
    </div>
  );
}

const MATCH_PLAN_TABS = [
  { id: "compare", label: "เทียบสถิติ", icon: "📊" },
  { id: "lineup", label: "จัดตัว", icon: "👕" },
  { id: "plan", label: "วางแผน", icon: "📋" },
];

function MatchStatComparisonPanel({ scout }) {
  if (!scout?.attrCompare) return null;
  const winColor = scout.winChance >= 55 ? C.good : scout.winChance <= 45 ? C.crimson : C.amber;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <FormStrip label="ฟอร์มเรา" form={scout.userForm} />
        <FormStrip label="ฟอร์มเขา" form={scout.oppForm} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 10, fontFamily: MONO_FONT }}>
        <span>โอกาสชนะ <span style={{ color: winColor, fontWeight: 700 }}>~{scout.winChance}%</span></span>
        <span>xG <span style={{ color: C.good }}>{scout.xgUs.toFixed(1)}</span>-<span style={{ color: C.crimson }}>{scout.xgThem.toFixed(1)}</span></span>
        <span style={{ color: C.amber }}>{scout.matchupLabel}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10, fontSize: 10, fontFamily: MONO_FONT }}>
        <div style={{ background: C.panel2, borderRadius: 6, padding: 8, border: `1px solid ${C.steel}` }}>
          <div style={{ color: C.amber, fontWeight: 700 }}>เรา · {scout.userFormation}</div>
          <div style={{ color: C.textDim }}>OVR {scout.userProfile?.avgRating} · XI {scout.xiCount}/11</div>
        </div>
        <div style={{ background: C.panel2, borderRadius: 6, padding: 8, border: `1px solid ${C.steel}` }}>
          <div style={{ color: C.chalk, fontWeight: 700 }}>{scout.opponentShort} · {scout.oppFormation}</div>
          <div style={{ color: C.textDim }}>OVR {scout.oppProfile?.avgRating} · #{scout.oppPos}</div>
        </div>
      </div>
      <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>ภาพรวม</div>
      <div className="fc-stat-grid">
        {scout.attrCompare.filter((r) => !r.key.startsWith("grp_") && !KEY_COMPARE_ATTRS.includes(r.key)).map((r) => (
          <StatCompareBar key={r.key} label={r.label} us={r.us} them={r.usOnly ? null : r.them} />
        ))}
      </div>
      <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, margin: "10px 0 6px" }}>กลุ่มสเตต</div>
      <div className="fc-stat-grid">
        {scout.attrCompare.filter((r) => r.key.startsWith("grp_")).map((r) => (
          <StatCompareBar key={r.key} label={r.label} us={r.us} them={r.them} />
        ))}
      </div>
      <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, margin: "10px 0 6px" }}>สเตตสำคัญ</div>
      <div className="fc-stat-grid">
        {scout.attrCompare.filter((r) => KEY_COMPARE_ATTRS.includes(r.key)).map((r) => (
          <StatCompareBar key={r.key} label={r.label} us={r.us} them={r.them} />
        ))}
      </div>
      {scout.lineCompare && (
        <>
          <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, margin: "12px 0 6px" }}>เทียบตามแนว</div>
          <div className="fc-stat-grid">
          {["GK", "DF", "MF", "FW"].map((line) => {
            const usL = scout.lineCompare.us[line];
            const themL = scout.lineCompare.them[line];
            if (!usL.count && !themL.count) return null;
            return (
              <StatCompareBar
                key={line}
                label={`${LINE_COMPARE_LABELS[line]} (OVR)`}
                us={usL.avgRating || 0}
                them={themL.avgRating || 0}
              />
            );
          })}
          </div>
        </>
      )}
      {scout.slotMatchups?.length > 0 && (
        <>
          <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, margin: "12px 0 6px" }}>เทียบตัวต่อตัว (ตามช่องแผน)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {scout.slotMatchups.map((m, i) => {
              const edgeColor = m.edge === "us" ? C.good : m.edge === "them" ? C.crimson : C.textDim;
              return (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 6, alignItems: "center",
                  fontSize: 10, padding: "5px 8px", borderRadius: 6, background: C.panel2, border: `1px solid ${C.steel}`,
                }}>
                  <div style={{ textAlign: "right" }}>
                    {m.us ? (
                      <><span style={{ fontWeight: 600, color: m.edge === "us" ? C.good : C.chalk }}>{m.us.name.split(" ").pop()}</span>
                      <span style={{ color: C.textDim, marginLeft: 4 }}>{m.us.rating}</span></>
                    ) : <span style={{ color: C.textDim }}>—</span>}
                  </div>
                  <div style={{ fontSize: 8, color: C.textDim, textAlign: "center", minWidth: 52 }}>{m.slotLabel}</div>
                  <div>
                    {m.opp ? (
                      <><span style={{ fontWeight: 600, color: m.edge === "them" ? C.crimson : C.chalk }}>{m.opp.name.split(" ").pop()}</span>
                      <span style={{ color: C.textDim, marginLeft: 4 }}>{m.opp.rating}</span></>
                    ) : <span style={{ color: C.textDim }}>—</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 9, color: C.textDim, marginTop: 6 }}>เขียว = เราได้เปรียบ · แดง = คู่แข่งได้เปรียบ</div>
        </>
      )}
    </div>
  );
}

function MatchLineupAdvisorPanel({ scout, onSetFormation, onAutoPick }) {
  if (!scout) return null;
  return (
    <div>
      {scout.weaknesses?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: C.good, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>ช่องทางจากสカウต</div>
          {scout.weaknesses.map((w, i) => (
            <div key={i} style={{ fontSize: 11, color: C.chalk, marginBottom: 3, lineHeight: 1.45 }}>→ {w}</div>
          ))}
        </div>
      )}
      {scout.keyThreats?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: C.crimson, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>ตัวอันตรายคู่แข่ง</div>
          {scout.keyThreats.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, marginBottom: 4 }}>
              <RatingBadge value={p.rating} />
              <span style={{ fontWeight: 600 }}>{p.name}</span>
              <span style={{ color: playerPosColor(p), fontSize: 10 }}>{playerPosTH(p)}</span>
              <span style={{ color: C.textDim, fontFamily: MONO_FONT, fontSize: 10 }}>ATK {p.attack}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 9, color: C.amber, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>คำแนะนำจัด XI</div>
      {(scout.lineupSuggestions || []).length === 0 ? (
        <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10 }}>ทีมชุดปัจจุบันเหมาะสม — ไม่มีคำแนะนำพิเศษ</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {scout.lineupSuggestions.map((s, i) => (
            <div key={i} style={{
              padding: "8px 10px", borderRadius: 6, background: C.panel2, border: `1px solid ${C.steel}`,
              fontSize: 11, color: C.chalk, lineHeight: 1.45,
            }}>
              {s.type === "formation" ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span>→ {s.reason}</span>
                  {onSetFormation && (
                    <button type="button" onClick={() => onSetFormation(s.formation)} style={{
                      padding: "4px 8px", borderRadius: 5, fontSize: 9, fontWeight: 700, cursor: "pointer",
                      border: `1px solid ${C.amber}`, background: "rgba(224,164,88,.12)", color: C.amber, flexShrink: 0,
                    }}>เปลี่ยน</button>
                  )}
                </div>
              ) : (
                <>
                  → {s.reason}
                  {s.player && <span style={{ color: C.textDim, marginLeft: 6 }}>(OVR {s.player.rating})</span>}
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {scout.tips?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>หมายเหตุผจก.</div>
          {scout.tips.slice(0, 4).map((t, i) => (
            <div key={i} style={{ fontSize: 10.5, color: C.textDim, marginBottom: 3 }}>· {t}</div>
          ))}
        </div>
      )}
      {onAutoPick && (
        <button type="button" onClick={onAutoPick} style={{
          width: "100%", padding: "8px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
          border: `1px solid ${C.good}`, background: "rgba(76,175,106,.12)", color: C.good,
        }}>จัด XI อัตโนมัติตามสควอด</button>
      )}
      <div style={{ fontSize: 9.5, color: C.textDim, marginTop: 8 }}>ลากวางนักเตะบนกระดานด้านล่างเพื่อปรับตัวจริง</div>
    </div>
  );
}

function MatchPlanControls({ scout, matchPrep, onSetMentality, onToggleInstruction, onSetTeamTalk, onApplySuggested, onSetPrepField }) {
  const prep = matchPrep || defaultMatchPrep();
  return (
    <div>
      <SectionLabel sub="ก่อนลงสนาม">คุยนักเตะ (Team Talk)</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
        {TEAM_TALK_OPTIONS.map((tt) => (
          <button key={tt.id} type="button" onClick={() => onSetTeamTalk(prep.teamTalk === tt.id ? null : tt.id)} style={{
            padding: "5px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer",
            border: `1px solid ${prep.teamTalk === tt.id ? C.gold : C.steel}`,
            background: prep.teamTalk === tt.id ? "rgba(212,175,55,.12)" : C.panel2,
            color: prep.teamTalk === tt.id ? C.gold : C.textDim,
          }}>{tt.label}</button>
        ))}
      </div>
      <SectionLabel sub="ปรับได้ก่อนลงสนาม">แผนการเล่น</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
        {MATCH_MENTALITIES.map((m) => (
          <button key={m.id} type="button" onClick={() => onSetMentality(m.id)} style={{
            padding: "5px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer",
            border: `1px solid ${prep.mentality === m.id ? C.amber : C.steel}`,
            background: prep.mentality === m.id ? "rgba(201,162,39,.15)" : C.panel2,
            color: prep.mentality === m.id ? C.amber : C.textDim,
          }}>{m.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
        {MATCH_INSTRUCTIONS.map((ins) => {
          const on = (prep.instructions || []).includes(ins.id);
          return (
            <button key={ins.id} type="button" onClick={() => onToggleInstruction(ins.id)} style={{
              padding: "5px 8px", borderRadius: 6, fontSize: 9.5, cursor: "pointer",
              border: `1px solid ${on ? C.blue : C.steel}`,
              background: on ? "rgba(90,155,213,.12)" : C.panel2,
              color: on ? C.blue : C.textDim,
            }} title={ins.desc}>{ins.label}</button>
          );
        })}
      </div>
      <div style={{ fontSize: 9.5, color: C.textDim, marginBottom: 10 }}>เลือกคำสั่งได้สูงสุด 3 อย่าง · แนะนำแผน {scout?.recommendedFormation}</div>
      {scout?.weaknesses?.length > 0 && scout.suggestedPrep && onApplySuggested && (
        <button type="button" onClick={() => onApplySuggested(scout.suggestedPrep)} style={{
          width: "100%", marginBottom: 10, padding: "6px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer",
          border: `1px solid ${C.good}`, background: "rgba(76,175,106,.12)", color: C.good,
        }}>
          ใช้คำแนะนำจาก{scout.managerPlan?.name || "ผจก."}
          {scout.suggestedPrep.markPlayerId ? " (รวมประกบตัวอันตราย)" : ""}
        </button>
      )}
      {onSetPrepField && (
        <>
          {[
            { field: "tempo", label: "จังหวะเกม (Tempo)", options: TEMPO_OPTIONS, color: C.amber },
            { field: "pressing", label: "การกดดัน (Pressing)", options: PRESSING_OPTIONS, color: C.crimson },
            { field: "defLine", label: "แนวรับ (Defensive Line)", options: DEF_LINE_OPTIONS, color: C.blue },
          ].map(({ field, label, options, color }) => (
            <div key={field} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
              <div style={{ display: "flex", gap: 5 }}>
                {options.map((opt) => {
                  const on = (prep[field] || options[1].id) === opt.id;
                  return (
                    <button key={opt.id} type="button" onClick={() => onSetPrepField(field, opt.id)} title={opt.desc} style={{
                      flex: 1, padding: "5px 4px", borderRadius: 6, fontSize: 9.5, fontWeight: on ? 700 : 400, cursor: "pointer",
                      border: `1px solid ${on ? color : C.steel}`,
                      background: on ? `${color}22` : C.panel2,
                      color: on ? color : C.textDim,
                    }}>{opt.label}</button>
                  );
                })}
              </div>
            </div>
          ))}
          {prep.defLine === "high" && (
            <button type="button" onClick={() => onSetPrepField("offsideTrap", !prep.offsideTrap)} style={{
              width: "100%", padding: "6px 10px", borderRadius: 6, fontSize: 10, cursor: "pointer", marginBottom: 8,
              border: `1px solid ${prep.offsideTrap ? C.gold : C.steel}`,
              background: prep.offsideTrap ? "rgba(212,175,55,.12)" : C.panel2,
              color: prep.offsideTrap ? C.gold : C.textDim, textAlign: "left",
            }}>
              {prep.offsideTrap ? "☑" : "☐"} กับดักล้ำหน้า (Offside Trap)
            </button>
          )}
          {(scout?.oppXIList || []).length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>ประกบตัวอันตราย</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {[...scout.oppXIList].sort((a, b) => b.attack - a.attack).slice(0, 5).map((p) => {
                  const on = prep.markPlayerId === p.id;
                  return (
                    <button key={p.id} type="button" onClick={() => onSetPrepField("markPlayerId", on ? null : p.id)} style={{
                      fontSize: 9.5, padding: "4px 8px", borderRadius: 6, cursor: "pointer",
                      border: `1px solid ${on ? C.crimson : C.steel}`,
                      background: on ? "rgba(193,68,14,.15)" : C.panel2,
                      color: on ? C.crimson : C.textDim,
                    }}>{on ? "🔒 " : ""}{p.name.split(" ").pop()} ({playerPosCode(p)})</button>
                  );
                })}
              </div>
            </div>
          )}
          {scout?.familiarityMult != null && (
            <div style={{ fontSize: 9.5, fontFamily: MONO_FONT, color: scout.familiarityMult >= 1 ? C.good : C.crimson }}>
              ความคุ้นเคยแผน {scout.userFormation}: {scout.familiarityMatches} นัด ({scout.familiarityMult >= 1 ? "+" : ""}{Math.round((scout.familiarityMult - 1) * 100)}%)
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MatchPlanHub({
  scout, matchPrep, onSetMentality, onToggleInstruction, onSetTeamTalk, onApplySuggested, onSetPrepField,
  onSetFormation, onAutoPick,
}) {
  const [section, setSection] = useState("compare");
  if (!scout) return null;
  const mp = scout.managerPlan;
  const insightPct = mp ? Math.round(mp.insight * 100) : 0;
  const prepBonusPct = mp ? Math.round((mp.prepMult - 1) * 100) : 0;
  return (
    <Panel accent={C.blue}>
      <SectionLabel sub={`${scout.isHome ? "เหย้า" : "เยือน"} · โอกาสชนะ ~${scout.winChance}% · xG ${scout.xgUs.toFixed(1)}-${scout.xgThem.toFixed(1)}`}>
        ศูนย์แผนก่อนเกม vs {scout.opponentShort}
      </SectionLabel>
      {mp && (
        <div style={{
          marginBottom: 10, padding: "8px 10px", borderRadius: 8,
          background: mp.stars >= 4 ? "rgba(212,175,55,.08)" : C.panel2,
          border: `1px solid ${mp.stars >= 4 ? C.gold : C.steel}`,
          fontSize: 10, lineHeight: 1.5,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: C.chalk }}>◆ {mp.name}</span>
            {mp.stars > 0 && <StarGlyphs count={mp.stars} size={9} />}
            <span style={{ color: C.textDim, fontFamily: MONO_FONT }}>{mp.label}</span>
          </div>
          <div style={{ fontFamily: MONO_FONT, color: C.textDim }}>
            แทคติก {mp.tactics} · สเกาต์ {mp.scouting} · คุณภาพคำแนะนำ {insightPct}%
            {prepBonusPct > 0 && <span style={{ color: C.good }}> · ส่งแผนลงสนาม +{prepBonusPct}%</span>}
            {mp.performanceBonus > 0 && <span style={{ color: C.amber }}> · พลังทีม +{Math.round(mp.performanceBonus * 100)}%</span>}
          </div>
          {mp.perks?.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 9.5, color: C.chalk, lineHeight: 1.45 }}>
              {mp.perks.slice(0, 2).map((p, i) => <div key={i}>✦ {p}</div>)}
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
        {MATCH_PLAN_TABS.map((t) => {
          const active = section === t.id;
          return (
            <button key={t.id} type="button" onClick={() => setSection(t.id)} style={{
              flex: 1, padding: "8px 4px", borderRadius: 8, cursor: "pointer", fontSize: 10, fontWeight: 700,
              border: `2px solid ${active ? C.blue : C.steel}`,
              background: active ? "rgba(90,155,213,.15)" : C.panel2,
              color: active ? C.blue : C.textDim,
            }}>{t.icon} {t.label}</button>
          );
        })}
      </div>
      {section === "compare" && <MatchStatComparisonPanel scout={scout} />}
      {section === "lineup" && (
        <MatchLineupAdvisorPanel scout={scout} onSetFormation={onSetFormation} onAutoPick={onAutoPick} />
      )}
      {section === "plan" && (
        <MatchPlanControls
          scout={scout} matchPrep={matchPrep}
          onSetMentality={onSetMentality} onToggleInstruction={onToggleInstruction}
          onSetTeamTalk={onSetTeamTalk} onApplySuggested={onApplySuggested} onSetPrepField={onSetPrepField}
        />
      )}
    </Panel>
  );
}

function MatchBriefingPanel({ scout, matchPrep, onSetMentality, onToggleInstruction, onSetTeamTalk, onGoTactics, onApplySuggested, onSetPrepField }) {
  if (!scout) return null;
  const prep = matchPrep || defaultMatchPrep();
  const [expanded, setExpanded] = useState(false);
  const topThreat = scout.keyThreats[0];
  const winColor = scout.winChance >= 55 ? C.good : scout.winChance <= 45 ? C.crimson : C.amber;

  return (
    <Panel accent={C.blue} style={{ marginBottom: 0 }}>
      <button type="button" onClick={() => setExpanded((v) => !v)} style={{
        width: "100%", background: "transparent", border: "none", cursor: "pointer", padding: 0, textAlign: "left", color: C.chalk,
      }}>
        <SectionLabel sub={`#${scout.oppPos} ${scout.matchupLabel}`}>รายงานก่อนเกม</SectionLabel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: expanded ? 10 : 0 }}>
          <div style={{ fontSize: 10, fontFamily: MONO_FONT, color: C.textDim, lineHeight: 1.5 }}>
            โอกาสชนะ <span style={{ color: winColor, fontWeight: 700 }}>~{scout.winChance}%</span>
            {" · "}xG <span style={{ color: C.good }}>{scout.xgUs.toFixed(1)}</span>-<span style={{ color: C.crimson }}>{scout.xgThem.toFixed(1)}</span>
            {topThreat && <> · อันตราย <span style={{ color: C.chalk }}>{topThreat.name}</span></>}
          </div>
          <span style={{ fontSize: 10, color: C.amber, flexShrink: 0 }}>{expanded ? "ย่อ ▲" : "ดูรายละเอียด ▼"}</span>
        </div>
      </button>

      {expanded && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <FormStrip label="ฟอร์มเรา" form={scout.userForm} />
            <FormStrip label="ฟอร์มเขา" form={scout.oppForm} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10, fontSize: 10, fontFamily: MONO_FONT }}>
            <div style={{ background: C.panel2, borderRadius: 6, padding: 8, border: `1px solid ${C.steel}` }}>
              <div style={{ color: C.amber, fontWeight: 700, marginBottom: 4 }}>เรา · {scout.userFormation}</div>
              <div style={{ color: C.textDim }}>XI {scout.xiCount}/11</div>
            </div>
            <div style={{ background: C.panel2, borderRadius: 6, padding: 8, border: `1px solid ${C.steel}` }}>
              <div style={{ color: C.chalk, fontWeight: 700, marginBottom: 4 }}>เขา · {scout.oppFormation}</div>
              <div style={{ color: C.textDim }}>อันดับ #{scout.oppPos}</div>
            </div>
          </div>
          <StatCompareBar label="พลังบุก" us={scout.userAtk} them={scout.oppAtk} />
          <StatCompareBar label="พลังรับ" us={scout.userDef} them={scout.oppDef} />
          <StatCompareBar label="สตามินา XI" us={scout.avgStamina} them={scout.oppAvgStamina} />
          {scout.keyThreats.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>อันตราย (XI คาด)</div>
              {scout.keyThreats.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, marginBottom: 4 }}>
                  <RatingBadge value={p.rating} />
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  <span style={{ color: playerPosColor(p), fontSize: 10 }}>{playerPosTH(p)}</span>
                </div>
              ))}
            </div>
          )}
          {scout.oppRosterStars?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: C.amber, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>ดาวเด่นในทีม ({scout.opponentShort})</div>
              {scout.oppRosterStars.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, marginBottom: 4 }}>
                  <RatingBadge value={p.rating} />
                  <span style={{ fontWeight: 600 }}>{p.name}{p.isLegend ? " ⭐" : ""}</span>
                  <span style={{ color: playerPosColor(p), fontSize: 10 }}>{playerPosTH(p)}</span>
                  {p.injuryDays > 0 && <span style={{ fontSize: 9, color: C.crimson }}>🤕</span>}
                  {(p.suspendedMatches || 0) > 0 && <span style={{ fontSize: 9, color: C.amber }}>🚫</span>}
                </div>
              ))}
            </div>
          )}
          {scout.weaknesses.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: C.good, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>ช่องทาง</div>
              {scout.weaknesses.map((w, i) => (
                <div key={i} style={{ fontSize: 11, color: C.chalk, marginBottom: 3, lineHeight: 1.45 }}>→ {w}</div>
              ))}
              {scout.suggestedPrep && onApplySuggested && (
                <button type="button" onClick={() => onApplySuggested(scout.suggestedPrep)} style={{
                  marginTop: 6, padding: "6px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer",
                  border: `1px solid ${C.good}`, background: "rgba(76,175,106,.12)", color: C.good, width: "100%",
                }}>ใช้คำแนะนำ</button>
              )}
            </div>
          )}
        </>
      )}

      <div style={{ borderTop: `1px solid ${C.steel}`, paddingTop: 10, marginTop: 4 }}>
        <SectionLabel sub="ก่อนลงสนาม">คุยนักเตะ (Team Talk)</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: expanded ? 10 : 0 }}>
          {TEAM_TALK_OPTIONS.map((tt) => (
            <button key={tt.id} type="button" onClick={() => onSetTeamTalk(prep.teamTalk === tt.id ? null : tt.id)} style={{
              padding: "5px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${prep.teamTalk === tt.id ? C.gold : C.steel}`,
              background: prep.teamTalk === tt.id ? "rgba(212,175,55,.12)" : C.panel2,
              color: prep.teamTalk === tt.id ? C.gold : C.textDim,
            }}>{tt.label}</button>
          ))}
        </div>
        {expanded && (
          <>
            <SectionLabel sub="ปรับได้ก่อนลงสนาม">แผนการเล่น</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
              {MATCH_MENTALITIES.map((m) => (
                <button key={m.id} type="button" onClick={() => onSetMentality(m.id)} style={{
                  padding: "5px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${prep.mentality === m.id ? C.amber : C.steel}`,
                  background: prep.mentality === m.id ? "rgba(201,162,39,.15)" : C.panel2,
                  color: prep.mentality === m.id ? C.amber : C.textDim,
                }}>{m.label}</button>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
              {MATCH_INSTRUCTIONS.map((ins) => {
                const on = (prep.instructions || []).includes(ins.id);
                return (
                  <button key={ins.id} type="button" onClick={() => onToggleInstruction(ins.id)} style={{
                    padding: "5px 8px", borderRadius: 6, fontSize: 9.5, cursor: "pointer",
                    border: `1px solid ${on ? C.blue : C.steel}`,
                    background: on ? "rgba(90,155,213,.12)" : C.panel2,
                    color: on ? C.blue : C.textDim,
                  }} title={ins.desc}>{ins.label}</button>
                );
              })}
            </div>
            <div style={{ fontSize: 9.5, color: C.textDim, marginBottom: 10 }}>เลือกคำสั่งได้สูงสุด 3 อย่าง · แนะนำแผน {scout.recommendedFormation}</div>

            {onSetPrepField && (
              <>
                {[
                  { field: "tempo", label: "จังหวะเกม (Tempo)", options: TEMPO_OPTIONS, color: C.amber },
                  { field: "creativeFreedom", label: "อิสระความคิด (Creative Freedom)", options: CREATIVE_FREEDOM_OPTIONS, color: C.gold },
                  { field: "pressing", label: "การกดดัน (Pressing)", options: PRESSING_OPTIONS, color: C.crimson },
                  { field: "defLine", label: "แนวรับ (Defensive Line)", options: DEF_LINE_OPTIONS, color: C.blue },
                ].map(({ field, label, options, color }) => (
                  <div key={field} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                    <div style={{ display: "flex", gap: 5 }}>
                      {options.map((opt) => {
                        const on = (prep[field] || options[1].id) === opt.id;
                        return (
                          <button key={opt.id} type="button" onClick={() => onSetPrepField(field, opt.id)} title={opt.desc} style={{
                            flex: 1, padding: "5px 4px", borderRadius: 6, fontSize: 9.5, fontWeight: on ? 700 : 400, cursor: "pointer",
                            border: `1px solid ${on ? color : C.steel}`,
                            background: on ? `${color}22` : C.panel2,
                            color: on ? color : C.textDim,
                          }}>{opt.label}</button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {prep.defLine === "high" && (
                  <button type="button" onClick={() => onSetPrepField("offsideTrap", !prep.offsideTrap)} style={{
                    width: "100%", padding: "6px 10px", borderRadius: 6, fontSize: 10, cursor: "pointer", marginBottom: 8,
                    border: `1px solid ${prep.offsideTrap ? C.gold : C.steel}`,
                    background: prep.offsideTrap ? "rgba(212,175,55,.12)" : C.panel2,
                    color: prep.offsideTrap ? C.gold : C.textDim, textAlign: "left",
                  }}>
                    {prep.offsideTrap ? "☑" : "☐"} กับดักล้ำหน้า (Offside Trap) — ได้ผลเมื่อแบ็คเร็วพอ ถ้าแบ็คช้าเสี่ยงโดนบอลทะลุ
                  </button>
                )}
                {(scout.oppXIList || []).length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>ประกบตัวอันตราย (Opposition Mark)</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {[...scout.oppXIList].sort((a, b) => b.attack - a.attack).slice(0, 5).map((p) => {
                        const on = prep.markPlayerId === p.id;
                        return (
                          <button key={p.id} type="button" onClick={() => onSetPrepField("markPlayerId", on ? null : p.id)} style={{
                            fontSize: 9.5, padding: "4px 8px", borderRadius: 6, cursor: "pointer",
                            border: `1px solid ${on ? C.crimson : C.steel}`,
                            background: on ? "rgba(193,68,14,.15)" : C.panel2,
                            color: on ? C.crimson : C.textDim,
                          }}>{on ? "🔒 " : ""}{p.name.split(" ")[1] || p.name} ({playerPosCode(p)})</button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 9, color: C.textDim, marginTop: 3 }}>ล็อกประกบ 1 คน — ลดพลังรุกตัวนั้น แต่เสียเกมรับเราเล็กน้อย (รีเซ็ตหลังจบนัด)</div>
                  </div>
                )}
                {scout.familiarityMult != null && (
                  <div style={{ fontSize: 9.5, fontFamily: MONO_FONT, color: scout.familiarityMult >= 1 ? C.good : C.crimson, marginBottom: 8 }}>
                    ความคุ้นเคยแผน {scout.userFormation}: {scout.familiarityMatches} นัด ({scout.familiarityMult >= 1 ? "+" : ""}{Math.round((scout.familiarityMult - 1) * 100)}%)
                  </div>
                )}
              </>
            )}
            <button type="button" onClick={onGoTactics} style={fmBtnGhost({ fontSize: 11 })}>จัด XI / แผน / บทบาท / ลูกตั้งเตะ →</button>
          </>
        )}
      </div>
    </Panel>
  );
}

function ClubFansPanel({ career, uTeam, seasonOver, posInTable, userRow, onUpgradeSponsor }) {
  const sponsorTier = SPONSOR_TIERS[career.sponsorTier ?? 0] || SPONSOR_TIERS[0];
  const nextTier = SPONSOR_TIERS[(career.sponsorTier ?? 0) + 1];
  const sponsorDaily = computeSponsorDaily(career, uTeam);
  const merchDaily = computeMerchDaily(career, uTeam);
  const fanCap = getFanCap(uTeam.division, career);
  const canUpgrade = nextTier && (career.fanBase || 0) >= nextTier.minFans && (career.sponsorTier ?? 0) < qualifySponsorTier(career.fanBase || 0);
  const leaguePrize = seasonOver ? getLeaguePrize(uTeam.division, posInTable) : 0;

  return (
    <Panel accent={C.gold}>
      <SectionLabel sub={`เพดานแฟน ${fanCap.toLocaleString()} คน · ${uTeam.division === 0 ? "Master" : "Challenger"}`}>สโมสร & แฟนบอล</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div style={{ background: C.panel2, borderRadius: 6, padding: 8, border: `1px solid ${C.steel}` }}>
          <div style={{ fontSize: 9, color: C.textDim }}>แฟนบอล</div>
          <div style={{ fontFamily: MONO_FONT, fontSize: 16, fontWeight: 700, color: C.amber }}>{(career.fanBase || 0).toLocaleString()}</div>
          {(career.fanDeltaToday || 0) !== 0 && (
            <div style={{ fontSize: 10, color: career.fanDeltaToday > 0 ? C.good : C.crimson }}>
              วันนี้ {career.fanDeltaToday > 0 ? "+" : ""}{career.fanDeltaToday.toLocaleString()}
            </div>
          )}
        </div>
        <div style={{ background: C.panel2, borderRadius: 6, padding: 8, border: `1px solid ${C.steel}` }}>
          <div style={{ fontSize: 9, color: C.textDim }}>สปอนเซอร์</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.chalk }}>{sponsorTier.name}</div>
          <div style={{ fontSize: 10, color: C.good, fontFamily: MONO_FONT }}>+{formatMoney(sponsorDaily)}/วัน</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.55, marginBottom: 8 }}>
        เสื้อ/ของที่ระลึก <b style={{ color: C.chalk }}>+{formatMoney(merchDaily)}</b>/วัน
        {" · "}รายได้รวมวันละ <b style={{ color: C.good }}>+{formatMoney(sponsorDaily + merchDaily)}</b>
      </div>
      {canUpgrade && (
        <button type="button" onClick={onUpgradeSponsor} style={{ ...btnStyle(C.gold, "#0a1210"), width: "100%", fontSize: 11, padding: "8px 0", marginBottom: 8 }}>
          อัปเกรดสปอนเซอร์ → {nextTier.name}
        </button>
      )}
      {seasonOver && (
        <div style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(212,175,55,.08)", border: `1px solid ${C.gold}`, fontSize: 11, lineHeight: 1.55 }}>
          <b style={{ color: C.gold }}>สรุปปลายฤดูกาล</b> — อันดับ #{posInTable} · {userRow?.pts ?? 0} แต้ม
          {leaguePrize > 0 && (
            <div style={{ color: C.good, marginTop: 4 }}>🏆 รางวัลลีก: +{formatMoney(leaguePrize)}</div>
          )}
          {career.lastSeasonSnapshot && (
            <div style={{ color: C.textDim, marginTop: 4 }}>
              ฤดูกาลก่อน: อันดับ #{career.lastSeasonSnapshot.pos} · {career.lastSeasonSnapshot.pts} แต้ม
              {(career.badSeasonStreak || 0) > 0 && ` · แฟนท้อ ${career.badSeasonStreak} ฤดูกาล`}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

/* ============================== CLUB HUB ============================== */
function ClubBoardPanel({ career, uTeam, posInTable, uiLang = "th" }) {
  const board = career.board;
  if (!board) return null;
  const sat = board.satisfaction ?? 70;
  const satColor = sat >= 75 ? C.good : sat >= 45 ? C.amber : C.crimson;
  const budgetOk = (career.budget || 0) >= (board.minBudget || 0);
  return (
    <Panel accent={satColor}>
      <SectionLabel sub={t(uiLang, "club.boardSub")}>🤝 {t(uiLang, "club.board")}</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div style={{ background: C.panel2, borderRadius: 6, padding: 8, border: `1px solid ${C.steel}` }}>
          <div style={{ fontSize: 9, color: C.textDim }}>{t(uiLang, "club.boardSat")}</div>
          <div style={{ fontFamily: MONO_FONT, fontSize: 16, fontWeight: 700, color: satColor }}>{sat}%</div>
          {board.warned && <div style={{ fontSize: 9, color: C.crimson, marginTop: 2 }}>{t(uiLang, "club.boardWarn")}</div>}
        </div>
        <div style={{ background: C.panel2, borderRadius: 6, padding: 8, border: `1px solid ${C.steel}` }}>
          <div style={{ fontSize: 9, color: C.textDim }}>{t(uiLang, "club.boardTarget")}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.chalk }}>{boardTargetLabel(board, uiLang)}</div>
          <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{t(uiLang, "club.boardNow")} #{posInTable || "-"}</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.55 }}>
        {t(uiLang, "club.boardMinBudget")} <b style={{ color: budgetOk ? C.good : C.crimson }}>{formatMoney(board.minBudget || 0)}</b>
        {" · "}{t(uiLang, "club.boardEndBonus")}
      </div>
    </Panel>
  );
}

function ClubStadiumPanel({ career, uiLang = "th", onUpgradeStadium }) {
  const level = getStadiumLevel(career);
  const def = getStadiumDef(career);
  const steps = stadiumProgressSteps(level);
  const tierCap = Math.min(STADIUM_LEVELS.length, getMaxRoomLevel(career.globalFanbase || 0));
  const maxed = level >= tierCap;
  const cost = stadiumUpgradeCost(level);
  const canAfford = (career.budget || 0) >= cost;
  const nextDef = !maxed ? STADIUM_LEVELS[level] : null;
  const stadiumQueued = (career.constructionQueue || []).find((q) => q.kind === "stadium");
  return (
    <Panel accent={C.blue}>
      <SectionLabel sub={`${t(uiLang, "club.stadiumCap")} ${def.capacity.toLocaleString()} · ${t(uiLang, "club.stadiumRev")} ×${def.matchRevMult}`}>
        🏟️ {t(uiLang, "club.stadium")} — {stadiumName(career, uiLang)}
      </SectionLabel>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10,
      }}>
        <div style={{ background: C.panel2, borderRadius: 6, padding: "10px 8px", border: `1px solid ${C.steel}`, textAlign: "center" }}>
          <div style={{ fontSize: 9, color: C.textDim }}>{t(uiLang, "club.stadiumCap")}</div>
          <div style={{ fontFamily: MONO_FONT, fontSize: 15, fontWeight: 700, color: C.chalk }}>{def.capacity.toLocaleString()}</div>
        </div>
        <div style={{ background: C.panel2, borderRadius: 6, padding: "10px 8px", border: `1px solid ${C.steel}`, textAlign: "center" }}>
          <div style={{ fontSize: 9, color: C.textDim }}>{t(uiLang, "club.stadiumFanBonus")}</div>
          <div style={{ fontFamily: MONO_FONT, fontSize: 15, fontWeight: 700, color: C.good }}>+{stadiumFanCapBonus(career).toLocaleString()}</div>
        </div>
        <div style={{ background: C.panel2, borderRadius: 6, padding: "10px 8px", border: `1px solid ${C.steel}`, textAlign: "center" }}>
          <div style={{ fontSize: 9, color: C.textDim }}>{t(uiLang, "club.stadiumRev")}</div>
          <div style={{ fontFamily: MONO_FONT, fontSize: 15, fontWeight: 700, color: C.amber }}>×{def.matchRevMult}</div>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: C.textDim, marginBottom: 6 }}>
          {t(uiLang, "club.stadiumProgress")} · Lv.{level}/{STADIUM_LEVELS.length}
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
          {steps.map((s) => (
            <div
              key={s.level}
              title={uiLang === "en" ? s.nameEn : s.nameTh}
              style={{
                flex: 1, height: 6, borderRadius: 3,
                background: s.current ? C.good : s.unlocked ? "rgba(61,186,106,.45)" : C.steel,
                boxShadow: s.current ? `0 0 0 1px ${C.good}` : "none",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {steps.map((s) => (
            <div
              key={s.level}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                padding: "6px 8px", borderRadius: 6,
                background: s.current ? "rgba(61,186,106,.1)" : s.unlocked ? C.panel2 : "transparent",
                border: `1px solid ${s.current ? C.good : s.unlocked ? C.steel : "rgba(255,255,255,.06)"}`,
                opacity: s.unlocked ? 1 : 0.55,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: s.current ? 700 : 500, color: s.current ? C.good : C.chalk }}>
                Lv.{s.level} {uiLang === "en" ? s.nameEn : s.nameTh}
                {s.current && " · " + (uiLang === "en" ? "current" : "ปัจจุบัน")}
              </div>
              <div style={{ fontSize: 9, color: C.textDim, fontFamily: MONO_FONT, textAlign: "right" }}>
                {s.capacity.toLocaleString()} · +{s.fanCapBonus.toLocaleString()} · ×{s.matchRevMult}
              </div>
            </div>
          ))}
        </div>
      </div>
      {!maxed && nextDef && (
        <div style={{
          marginBottom: 10, padding: "8px 10px", borderRadius: 8,
          background: C.panel2, border: `1px solid ${C.steel}`, fontSize: 10.5, color: C.textDim, lineHeight: 1.55,
        }}>
          <div style={{ color: C.chalk, fontWeight: 700, marginBottom: 4 }}>
            {t(uiLang, "club.stadiumUpgrade")} → {uiLang === "en" ? nextDef.nameEn : nextDef.nameTh}
          </div>
          {uiLang === "en"
            ? `Capacity ${nextDef.capacity.toLocaleString()} · fan cap +${nextDef.fanCapBonus.toLocaleString()} · home match revenue ×${nextDef.matchRevMult}`
            : `ความจุ ${nextDef.capacity.toLocaleString()} · เพดานแฟน +${nextDef.fanCapBonus.toLocaleString()} · รายได้แมตช์เหย้า ×${nextDef.matchRevMult}`}
        </div>
      )}
      {stadiumQueued ? (
        <ConstructionBadge queued={stadiumQueued} />
      ) : !maxed ? (
        <button type="button" disabled={!canAfford} onClick={onUpgradeStadium} style={{
          ...btnStyle(canAfford ? C.good : "#2b332f", canAfford ? "#08150e" : C.textDim),
          width: "100%", fontSize: 11, padding: "8px 0", cursor: canAfford ? "pointer" : "not-allowed",
        }}>
          {t(uiLang, "club.stadiumUpgrade")} ({formatMoney(cost)})
        </button>
      ) : level >= STADIUM_LEVELS.length ? (
        <div style={{ fontSize: 11, color: C.gold }}>{t(uiLang, "club.stadiumMax")}</div>
      ) : (
        <div style={{ fontSize: 11, color: C.textDim }}>🔒 ต้อง Club Tier {level + 1} ก่อน (ดูที่แท็บสโมสร)</div>
      )}
    </Panel>
  );
}

function ClubExtraStaffPanel({ career, uiLang = "th", onHireCard }) {
  const st = career.staff?.[career.userTeamId] || {};
  const bagCards = (career.staffCardBag || []).filter((c) => EXTRA_STAFF_TYPES.includes(c.type));
  return (
    <Panel>
      <SectionLabel sub={t(uiLang, "club.extraStaffSub")}>🧢 {t(uiLang, "club.extraStaff")}</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {EXTRA_STAFF_TYPES.map((type) => {
          const hired = st[type];
          const fx = EXTRA_STAFF_EFFECTS[type];
          return (
            <div key={type} style={{ padding: "8px 10px", borderRadius: 6, background: C.panel2, border: `1px solid ${hired ? C.good : C.steel}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{STAFF_CARD_TYPE_ICON[type]} {STAFF_CARD_TYPE_TH[type]}</div>
                {hired ? (
                  <span style={{ fontSize: 10, color: C.good, fontFamily: MONO_FONT }}>{hired.name} · +{hired.boost}</span>
                ) : (
                  <span style={{ fontSize: 10, color: C.textDim }}>{t(uiLang, "club.vacant")}</span>
                )}
              </div>
              {fx && <div style={{ fontSize: 10, color: C.textDim, marginTop: 4, lineHeight: 1.45 }}>{uiLang === "en" ? fx.en : fx.th}</div>}
            </div>
          );
        })}
      </div>
      {bagCards.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <StaffCardPickerRow cards={bagCards} title={t(uiLang, "club.extraStaffCards")} career={career} onHire={onHireCard} />
        </div>
      )}
    </Panel>
  );
}

/** Club Tier (1-9, เกตความสามารถอัพเกรดห้องต่างๆ) + Owner Level (1-100, ตัวผู้เล่นเอง) — คนละแกนกัน */
function ClubTierPanel({ career }) {
  const tierInfo = clubTierProgress(career.globalFanbase || 0);
  const ownerInfo = getOwnerLevelProgress(career.ownerXp || 0);
  return (
    <Panel style={{ border: `1px solid ${C.gold}` }}>
      <SectionLabel style={{ color: C.gold }} sub="เกตการอัพเกรดห้องต่างๆ ในสโมสร (ห้องพยาบาล/โค้ช/สนามซ้อม/สนามแข่ง) — ได้จากผลงานระดับฤดูกาล ไม่ใช่ชนะรายแมท">
        🌍 Club Tier {tierInfo.tier}/9 — {tierInfo.name}
      </SectionLabel>
      <div style={{ height: 8, borderRadius: 4, background: C.panel2, overflow: "hidden", marginBottom: 4 }}>
        <div style={{ width: `${tierInfo.pct}%`, height: "100%", background: `linear-gradient(90deg, ${C.gold}, ${C.amber})`, borderRadius: 4 }} />
      </div>
      <div style={{ fontSize: 10, color: C.textDim, fontFamily: MONO_FONT }}>
        แฟนบอลทั่วโลก {tierInfo.current.toLocaleString()}{tierInfo.next ? ` / ${tierInfo.next.toLocaleString()}` : " (สูงสุดแล้ว)"}
      </div>
      <div style={{ height: 1, background: C.steel, margin: "10px 0" }} />
      <SectionLabel sub="ตัวคุณเอง (ผู้จัดการ/เจ้าของสโมสร) — ได้ XP จากเล่นแมท/ผลงาน/ถ้วยรางวัล">
        👤 Owner Lv.{ownerInfo.level}/100
      </SectionLabel>
      <div style={{ height: 8, borderRadius: 4, background: C.panel2, overflow: "hidden", marginBottom: 4 }}>
        <div style={{ width: `${ownerInfo.pct}%`, height: "100%", background: `linear-gradient(90deg, ${C.blue}, ${C.purple})`, borderRadius: 4 }} />
      </div>
      <div style={{ fontSize: 10, color: C.textDim, fontFamily: MONO_FONT }}>
        {ownerInfo.xpForNext != null ? `XP ${Math.round(ownerInfo.xpIntoLevel).toLocaleString()} / ${ownerInfo.xpForNext.toLocaleString()}` : "เลเวลสูงสุดแล้ว"}
      </div>
    </Panel>
  );
}

function ClubHubView({ career, uTeam, standings, seasonOver, onUpgradeSponsor, onUpgradeStadium, onHireCard, uiLang = "th" }) {
  const posInTable = standings.findIndex((s) => s.team.id === uTeam.id) + 1;
  const userRow = standings.find((s) => s.team.id === uTeam.id);
  const sponsorTier = SPONSOR_TIERS[career.sponsorTier ?? 0] || SPONSOR_TIERS[0];
  const merchDaily = computeMerchDaily(career, uTeam);
  const fin = computeTeamFinances(career);
  const clubNews = career.log.filter((l) => /📈|📉|💼|🎉|😞|🙌|📄|✂️/.test(l)).slice(0, 10);

  return (
    <div className="fc-clubhub-split">
      <div className="fc-clubhub-side" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Panel accent={C.gold} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ClubBadge team={uTeam} size={44} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: DISPLAY_FONT }}>{uTeam.name}</div>
            <div style={{ fontSize: 10.5, color: C.textDim }}>{uTeam.division === 0 ? "Master League" : "Challenger League"} · อันดับ #{posInTable || "-"}</div>
          </div>
        </Panel>

        <ClubTierPanel career={career} />
        <ClubFansPanel career={career} uTeam={uTeam} seasonOver={seasonOver} posInTable={posInTable} userRow={userRow} onUpgradeSponsor={onUpgradeSponsor} />
        <ClubBoardPanel career={career} uTeam={uTeam} posInTable={posInTable} uiLang={uiLang} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <ClubStadiumPanel career={career} uiLang={uiLang} onUpgradeStadium={onUpgradeStadium} />
        <ClubExtraStaffPanel career={career} uiLang={uiLang} onHireCard={onHireCard} />

        <Panel>
          <SectionLabel sub="ยิ่งฐานแฟนเยอะ ยิ่งปลดล็อกสปอนเซอร์เกรดสูง">🪜 บันไดสปอนเซอร์</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {SPONSOR_TIERS.map((t) => {
              const active = t.tier === (career.sponsorTier ?? 0);
              const reached = (career.fanBase || 0) >= t.minFans;
              return (
                <div key={t.tier} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", borderRadius: 6,
                  background: active ? "rgba(212,175,55,.12)" : C.panel2, border: `1px solid ${active ? C.gold : C.steel}`,
                }}>
                  <div style={{ fontSize: 11.5, fontWeight: active ? 700 : 500, color: reached ? C.chalk : C.textDim }}>
                    {active && "▶ "}{t.name}
                  </div>
                  <div style={{ fontSize: 10, color: C.textDim, fontFamily: MONO_FONT, textAlign: "right" }}>
                    ต้องการแฟน {t.minFans.toLocaleString()}+<br />
                    <span style={{ color: C.good }}>+{formatMoney(t.baseDaily)}/วัน (ฐาน)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <SectionLabel sub={`ฐานแฟน ${(career.fanBase || 0).toLocaleString()} คน × โบนัสนักเตะสตาร์`}>👕 รายได้เสื้อ/ของที่ระลึก</SectionLabel>
          <div style={{ fontSize: 11.5, color: C.textDim, lineHeight: 1.6 }}>
            รายได้วันนี้ <b style={{ color: C.good, fontFamily: MONO_FONT }}>+{formatMoney(merchDaily)}</b>
            <br />มีนักเตะเรต 85+ ในทีมช่วยเพิ่มยอดขาย 50% · เรต 75+ เพิ่ม 20%
          </div>
        </Panel>

        <Panel>
          <SectionLabel sub="ทุกสินทรัพย์รวมกันเป็นมูลค่าสโมสร">💰 การเงินสโมสร</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, fontFamily: MONO_FONT }}>
            {[
              ["งบสด", fin.budget, C.amber],
              ["มูลค่านักเตะชุดใหญ่", fin.squadValue, C.chalk],
              ["มูลค่าอคาเดมี+ดาวรุ่ง", fin.academyValue + fin.prospectValue, C.chalk],
              ["สิ่งอำนวยความสะดวก", fin.facilitiesValue, C.chalk],
              ["สตาฟ/ผจก/แมวมอง", fin.coachesValue + fin.managerValue + fin.scoutValue + fin.academyMgrValue, C.chalk],
            ].map(([label, val, color]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: C.textDim, fontFamily: FM_FONT }}>{label}</span>
                <span style={{ color }}>{formatMoney(val)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.steel}`, paddingTop: 5, marginTop: 3 }}>
              <span style={{ fontWeight: 700, fontFamily: FM_FONT }}>มูลค่าสโมสรรวม</span>
              <span style={{ fontWeight: 700, color: C.gold }}>{formatMoney(fin.teamValue)}</span>
            </div>
          </div>
        </Panel>

        {clubNews.length > 0 && (
          <Panel>
            <SectionLabel>📰 ข่าวสโมสรล่าสุด</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: C.textDim, lineHeight: 1.5 }}>
              {clubNews.map((l, i) => <div key={i} style={{ borderTop: i > 0 ? `1px solid ${C.steel}` : "none", paddingTop: i > 0 ? 6 : 0 }}>{l}</div>)}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

/* ============================== ROADMAP TIER A/B — Dashboard widgets ============================== */
function RoadmapDashboardPanel({
  career, uTeam, onPressChoice, onConversationResolve, onAssignScoutZone,
  onAddShadowTarget, onSetDelegation, onRestartAfterSack,
}) {
  const ffp = career.ffp || {};
  const board = career.board || {};
  const xgHist = career.xgHistory || [];
  const rivals = career.rivals || [];
  const assignments = career.scoutNetwork?.assignments || [];
  const shadowTargets = career.shadowSquad?.targets || [];
  const shadowAlerts = career.shadowSquad?.marketAlerts || [];
  const delegation = career.delegation || {};
  const wc = career.worldCupEvent || {};
  const bTeam = career.bTeam || {};

  if (career.managerSacked) {
    return (
      <Panel accent={C.crimson} style={{ padding: 14 }}>
        <SectionLabel sub={career.sackReason || "บอร์ดไล่ออกจากตำแหน่ง"}>🚪 จบอาชีพผู้จัดการ</SectionLabel>
        <p style={{ fontSize: 12, color: C.textDim, margin: "8px 0 12px", lineHeight: 1.5 }}>
          ความพอใจบอร์ดและผลงานไม่ถึงเป้า — เริ่มสโมสรใหม่เพื่อลองอีกครั้ง
        </p>
        <button type="button" onClick={onRestartAfterSack} style={fmBtnPrimary()}>เริ่มอาชีพใหม่</button>
      </Panel>
    );
  }

  return (
    <>
      {career.pendingPress && (
        <Panel accent={C.blue} style={{ padding: 12 }}>
          <SectionLabel sub="เลือกแถลงข่าว — มีผลมูด/แฟน/บอร์ด">📰 สื่อถามความเห็น</SectionLabel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {career.pendingPress.choices.map((ch) => (
              <button key={ch.id} type="button" onClick={() => onPressChoice(ch.id)} style={fmBtnGhost({ flex: "1 1 120px" })}>
                {ch.label}
              </button>
            ))}
          </div>
        </Panel>
      )}

      {career.pendingConversation && (
        <Panel accent={C.purple} style={{ padding: 12 }}>
          <SectionLabel sub={career.pendingConversation.label}>💬 {career.pendingConversation.playerName} อยากคุย</SectionLabel>
          {(() => {
            const convoPlayer = career.players.find((p) => p.id === career.pendingConversation.playerId);
            const personality = convoPlayer && PLAYER_PERSONALITIES[convoPlayer.personality];
            return personality ? (
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>🎭 {personality.th} — {personality.descTh}</div>
            ) : null;
          })()}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" onClick={() => onConversationResolve(true)} style={fmBtnPrimary({ flex: 1 })}>ตกลง</button>
            <button type="button" onClick={() => onConversationResolve(false)} style={fmBtnGhost({ flex: 1 })}>ปฏิเสธ</button>
          </div>
        </Panel>
      )}

      <Panel accent={C.steelLight} style={{ padding: 12 }}>
        <SectionLabel sub="FFP · บอร์ด · xG · โซนสเกาต์ · แผนเงา · มอบหมายสตาฟ">📋 ระบบสโมสร (Roadmap A/B)</SectionLabel>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 10 }}>
          <div style={{ background: C.panel2, borderRadius: 6, padding: 8, border: `1px solid ${C.steel}` }}>
            <div style={{ fontSize: 9, color: C.textDim }}>FFP โอน</div>
            <div style={{ fontFamily: MONO_FONT, fontSize: 12, fontWeight: 700, color: ffp.blocked ? C.crimson : C.chalk }}>
              {Math.round((ffp.seasonSpend || 0) / 1000)}K / {Math.round((ffp.cap || 0) / 1000)}K
            </div>
          </div>
          <div style={{ background: C.panel2, borderRadius: 6, padding: 8, border: `1px solid ${C.steel}` }}>
            <div style={{ fontSize: 9, color: C.textDim }}>เสี่ยงไล่ออก</div>
            <div style={{ fontFamily: MONO_FONT, fontSize: 12, fontWeight: 700, color: (board.sackRisk || 0) >= 60 ? C.crimson : C.amber }}>
              {board.sackRisk ?? 0}%
            </div>
          </div>
          <div style={{ background: C.panel2, borderRadius: 6, padding: 8, border: `1px solid ${C.steel}` }}>
            <div style={{ fontSize: 9, color: C.textDim }}>xG ล่าสุด</div>
            <div style={{ fontFamily: MONO_FONT, fontSize: 12, fontWeight: 700, color: C.chalk }}>
              {career.lastMatchXg
                ? `${career.lastMatchXg.xgUs}-${career.lastMatchXg.xgThem} (${career.lastMatchXg.goalsUs}-${career.lastMatchXg.goalsThem})`
                : "—"}
            </div>
          </div>
        </div>

        {xgHist.length > 0 && (
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 8, lineHeight: 1.6 }}>
            {xgHist.slice(0, 5).map((x, i) => (
              <div key={i}>ว.{x.day} vs {x.opponent}: xG {x.xgUs}-{x.xgThem} · สกอร์ {x.goalsUs}-{x.goalsThem}</div>
            ))}
          </div>
        )}

        {rivals.length > 0 && (
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 8 }}>
            ⚔️ คู่แข่ง: {rivals.map((r) => r.short || r.name).join(" · ")}
          </div>
        )}

        {wc.phase && wc.phase !== "idle" && (
          <div style={{ fontSize: 10, color: C.gold, marginBottom: 8 }}>
            🏆 {wc.name || "World Cup"} — {wc.phase === "registration" ? "เปิดรับสมัคร" : wc.phase}
          </div>
        )}

        <div style={{ fontSize: 10, color: C.textDim, marginBottom: 6 }}>🔭 โซนสเกาต์ (ส่งตามลีก)</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {SCOUT_ZONES.map((z) => {
            const on = assignments.some((a) => a.zoneId === z.id && a.active);
            return (
              <button key={z.id} type="button" onClick={() => onAssignScoutZone(z.id)}
                style={fmBtnGhost({ fontSize: 9, padding: "4px 8px", opacity: on ? 1 : 0.55, borderColor: on ? C.blue : C.steel })}>
                {z.label}{on ? " ✓" : ""}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {["GK", "DF", "MF", "FW"].map((pos) => (
            <button key={pos} type="button" onClick={() => onAddShadowTarget(pos)}
              style={fmBtnGhost({ fontSize: 9, padding: "4px 8px" })}>
              + เป้า {pos}
            </button>
          ))}
        </div>
        {shadowTargets.length > 0 && (
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 6 }}>
            แผนเงา: {shadowTargets.map((t) => `${t.position}≥${t.minRating}`).join(" · ")}
          </div>
        )}
        {shadowAlerts.length > 0 && (
          <div style={{ fontSize: 10, color: C.good, marginBottom: 8 }}>
            🔔 ตลาดตรงเป้า: {shadowAlerts[0].playerName} (OVR {shadowAlerts[0].rating})
          </div>
        )}

        <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4 }}>มอบหมายสตาฟ</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            ["press", "แถลงข่าว"],
            ["market", "ตลาด"],
            ["training", "ฝึก"],
          ].map(([key, label]) => (
            <button key={key} type="button" onClick={() => onSetDelegation(key)}
              style={fmBtnGhost({
                fontSize: 9, padding: "4px 8px",
                borderColor: delegation[key] === "auto" ? C.good : C.steel,
              })}>
              {label}: {delegation[key] === "auto" ? "ออโต้" : "เอง"}
            </button>
          ))}
        </div>

        {bTeam.reserveIds?.length > 0 && (
          <div style={{ fontSize: 10, color: C.textDim, marginTop: 8 }}>
            B-team สำรอง: {bTeam.reserveIds.length} คน (อายุ ≤21)
          </div>
        )}
      </Panel>
    </>
  );
}

/* ============================== DASHBOARD (HOME) — FM Mobile ============================== */
function Dashboard({ career, uTeam, standings, userMatch, opponent, isHome, seasonOver, onAdvance, onKickoff, onGoTactics, onGoManager, xiPicked, xiAfterFill, canKickoff, injuredCount, onNewSeason, matchScout, matchPrep, onSetMentality, onToggleInstruction, onSetTeamTalk, onUpgradeSponsor, onApplySuggested, onGoClub, onSetPrepField, onBoardMove, onMarkNewsRead, onPressChoice, onConversationResolve, onAssignScoutZone, onAddShadowTarget, onSetDelegation, onRestartAfterSack }) {
  const posInTable = standings.findIndex((s) => s.team.id === uTeam.id) + 1;
  const recentResults = getRecentMatchResults(career, uTeam.division, uTeam.id, 8);
  const [boardOpen, setBoardOpen] = useState(false);
  const userRow = standings.find((s) => s.team.id === uTeam.id);
  const dashSquad = career.players.filter((p) => p.teamId === uTeam.id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {career.playMode === "online" && <OnlineLiveHomeCard />}
      <RoadmapDashboardPanel
        career={career} uTeam={uTeam}
        onPressChoice={onPressChoice}
        onConversationResolve={onConversationResolve}
        onAssignScoutZone={onAssignScoutZone}
        onAddShadowTarget={onAddShadowTarget}
        onSetDelegation={onSetDelegation}
        onRestartAfterSack={onRestartAfterSack}
      />
      <div className="fc-dash-split">
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
      {/* Hero: นัดวันนี้ */}
      <Panel accent={C.amber} style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 12px 0" }}>
          <SectionLabel sub={seasonOver ? `ฤดูกาล ${career.season} จบแล้ว` : opponent ? `${isHome ? "เหย้า" : "เยือน"} · วันที่ ${career.day}` : "วันพัก"}>
            นัดถัดไป
          </SectionLabel>
        </div>
        {seasonOver ? (
          <div style={{ padding: "0 12px 12px" }}>
            <div style={{ fontSize: 12, color: C.textDim, marginBottom: 10 }}>
              อันดับสุดท้าย #{posInTable} · {userRow?.pts ?? 0} แต้ม · {userRow?.w ?? 0}ช {userRow?.d ?? 0}ส {userRow?.l ?? 0}พ
              {getLeaguePrize(uTeam.division, posInTable) > 0 && (
                <span style={{ color: C.good }}> · รางวัลลีก {formatMoney(getLeaguePrize(uTeam.division, posInTable))}</span>
              )}
            </div>
            <button type="button" onClick={onNewSeason} style={fmBtnPrimary()}>เริ่มฤดูกาลใหม่</button>
          </div>
        ) : opponent ? (
          <div style={{ padding: "0 12px 12px" }}>
            {career.playMode === "online" ? (
              <>
                <div style={{ textAlign: "center", marginBottom: 10 }}>
                  <ClubBadge team={uTeam} size={40} />
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>{uTeam.short}</div>
                </div>
                <div style={{ fontSize: 11, color: C.textDim, marginBottom: 8, lineHeight: 1.6, padding: "8px 10px", borderRadius: 8, background: C.panel2, border: `1px solid ${C.steel}` }}>
                  🔴 โหมดออนไลน์แข่งอัตโนมัติตามเวลาจริง — ไปที่แท็บ "แข่งขันสด" เพื่อดูคู่แข่งจริง/สั่งกลางแมท
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ textAlign: "center" }}>
                    <ClubBadge team={uTeam} size={40} />
                    <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>{uTeam.short}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: MONO_FONT, fontSize: 10, color: C.textDim }}>{isHome ? "H" : "A"}</div>
                    <div style={{ fontSize: 11, color: C.textDim }}>vs</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <ClubBadge team={opponent} size={40} />
                    <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>{opponent.short}</div>
                  </div>
                </div>
              </>
            )}
            {career.playMode !== "online" && (
              <>
                <button type="button" onClick={onKickoff} disabled={!canKickoff} style={fmBtnPrimary({ marginBottom: 8, opacity: canKickoff ? 1 : 0.45, cursor: canKickoff ? "pointer" : "not-allowed" })}>
                  {canKickoff ? "▶ ลงสนาม" : `▶ ลงสนามไม่ได้ (${xiAfterFill}/11)`}
                </button>
                {!canKickoff && (
                  <div style={{ fontSize: 10, color: C.crimson, marginBottom: 8, lineHeight: 1.5 }}>
                    ต้องมีนักเตะพร้อมเล่นครบ 11 คนตามแผน — บาดเจ็บ {injuredCount} คน · ไปแท็บทีมเพื่อดูสถานะ
                  </div>
                )}
              </>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={onGoTactics} style={fmBtnGhost()}>จัดทีม · {xiPicked}/11</button>
              <button type="button" onClick={onGoManager} style={fmBtnGhost()}>ผจก.</button>
            </div>
            <div style={{ fontSize: 9, color: C.textDim, marginTop: 6, textAlign: "center", fontFamily: MONO_FONT }}>
              XI {xiPicked}/11 → เติมอัตโนมัติ {xiAfterFill}/11
            </div>
          </div>
        ) : (
          <div style={{ padding: "0 12px 12px" }}>
            <div style={{ fontSize: 11, color: C.textDim, marginBottom: 8 }}>ทีมว่างวันนี้ — ข้ามไปวันถัดไป</div>
            <button type="button" onClick={onAdvance} style={fmBtnGhost({ width: "100%" })}>ข้ามวัน</button>
          </div>
        )}
      </Panel>

      {/* ข่าวสารหน้าหลัก — FM style */}
      <Panel accent={C.good} style={{ padding: 0, overflow: "hidden" }}>
        <HomeNewsPanel career={career} onMarkRead={onMarkNewsRead} />
      </Panel>

      <Panel accent={C.gold} style={{ cursor: onGoClub ? "pointer" : "default" }} onClick={onGoClub}>
        <SectionLabel sub={`${stadiumName(career)} · Lv.${getStadiumLevel(career)}/${STADIUM_LEVELS.length} — แฟนบอล · สปอนเซอร์ · อัปเกรดสนาม`}>🏟️ สโมสร & แฟนบอล</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: career.board ? "1fr 1fr 1fr" : "1fr 1fr", gap: 8 }}>
          <div style={{ background: C.panel2, borderRadius: 6, padding: 8, border: `1px solid ${C.steel}` }}>
            <div style={{ fontSize: 9, color: C.textDim }}>แฟนบอล</div>
            <div style={{ fontFamily: MONO_FONT, fontSize: 16, fontWeight: 700, color: C.amber }}>{(career.fanBase || 0).toLocaleString()}</div>
          </div>
          <div style={{ background: C.panel2, borderRadius: 6, padding: 8, border: `1px solid ${C.steel}` }}>
            <div style={{ fontSize: 9, color: C.textDim }}>สปอนเซอร์</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.chalk }}>{(SPONSOR_TIERS[career.sponsorTier ?? 0] || SPONSOR_TIERS[0]).name}</div>
          </div>
          {career.board && (
            <div style={{ background: C.panel2, borderRadius: 6, padding: 8, border: `1px solid ${C.steel}` }}>
              <div style={{ fontSize: 9, color: C.textDim }}>บอร์ด</div>
              <div style={{ fontFamily: MONO_FONT, fontSize: 16, fontWeight: 700, color: (career.board.satisfaction ?? 70) >= 75 ? C.good : (career.board.satisfaction ?? 70) >= 45 ? C.amber : C.crimson }}>
                {career.board.satisfaction ?? 70}%
              </div>
            </div>
          )}
        </div>
        {onGoClub && <div style={{ fontSize: 10.5, color: C.gold, marginTop: 8, textAlign: "right" }}>ดูรายละเอียดสโมสร →</div>}
      </Panel>

      {opponent && !seasonOver && matchScout && (
        <MatchBriefingPanel scout={matchScout} matchPrep={matchPrep}
          onSetMentality={onSetMentality} onToggleInstruction={onToggleInstruction}
          onSetTeamTalk={onSetTeamTalk} onGoTactics={onGoTactics} onApplySuggested={onApplySuggested}
          onSetPrepField={onSetPrepField} />
      )}

      {/* กระดานจัดทีมก่อนเกม (ลากวาง) */}
      {opponent && !seasonOver && onBoardMove && (
        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <button type="button" onClick={() => setBoardOpen((v) => !v)} style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", padding: "12px 14px", textAlign: "left", color: C.chalk, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: FM_FONT, color: C.textDim, fontSize: 10, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase" }}>⚽ จัดทีมก่อนเกม ({xiPicked}/11)</span>
            <span style={{ fontSize: 10, color: C.amber }}>{boardOpen ? "ย่อ ▲" : "เปิดสนาม ▼"}</span>
          </button>
          {boardOpen && (
            <SquadPitchBoard
              team={uTeam}
              squad={dashSquad}
              slots={resolveLineupSlots(career, dashSquad, uTeam.formation)}
              editable={!uTeam.autoMode}
              onMove={onBoardMove}
            />
          )}
        </Panel>
      )}
      </div>

      <div className="fc-dash-side" style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
      {/* สรุปอันดับ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {[
          ["อันดับ", `#${posInTable}`, C.amber],
          ["แต้ม", userRow?.pts ?? 0, C.chalk],
          ["ชนะ", userRow?.w ?? 0, C.good],
          ["+/-", (userRow?.gd ?? 0) > 0 ? `+${userRow.gd}` : userRow?.gd ?? 0, (userRow?.gd ?? 0) >= 0 ? C.good : C.crimson],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: C.panel2, borderRadius: 6, padding: "8px 6px", textAlign: "center", border: `1px solid ${C.steel}` }}>
            <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontFamily: MONO_FONT, fontSize: 15, fontWeight: 700, color, marginTop: 2 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* ตารางคะแนน */}
      <Panel style={{ padding: 0, overflow: "hidden" }} accent={C.good}>
        <div style={{ padding: "10px 12px 0" }}>
          <SectionLabel>ตารางคะแนน</SectionLabel>
        </div>
        <div style={{ padding: "0 4px 8px" }}>
          <FMStandingsTable standings={standings} uTeamId={uTeam.id} />
        </div>
      </Panel>

      {/* ผลล่าสุด */}
      <Panel style={{ padding: 0 }}>
        <div style={{ padding: "10px 12px 0" }}>
          <SectionLabel>ผลแข่งล่าสุด</SectionLabel>
        </div>
        <div style={{ padding: "8px 12px", maxHeight: 200, overflowY: "auto" }}>
          {recentResults.length === 0
            ? <div style={{ fontSize: 11, color: C.textDim }}>ยังไม่มีผลแข่ง</div>
            : recentResults.map((r, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "28px 1fr auto 1fr 16px", alignItems: "center", gap: 4,
                fontSize: 11, fontFamily: MONO_FONT, padding: "5px 0",
                borderBottom: i < recentResults.length - 1 ? `1px solid ${C.steel}` : "none",
                background: r.isUser ? C.fmRowHi : "transparent",
              }}>
                <span style={{ fontSize: 9, color: C.textDim }}>D{r.day}</span>
                <span style={{ textAlign: "right", color: r.homeGoals > r.awayGoals ? C.chalk : C.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.home.short}</span>
                <span style={{ color: C.amber, fontWeight: 700, padding: "0 4px" }}>{r.homeGoals}-{r.awayGoals}</span>
                <span style={{ color: r.awayGoals > r.homeGoals ? C.chalk : C.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.away.short}</span>
                <span>{r.isUser ? "★" : ""}</span>
              </div>
            ))}
        </div>
      </Panel>

      {career.lastChampMaster && (
        <Panel accent={C.gold}>
          <SectionLabel>Champ Master</SectionLabel>
          {career.lastChampMaster.rounds.slice(0, 1).map((r, ri) => (
            <div key={ri} style={{ fontSize: 10, fontFamily: MONO_FONT, color: C.textDim }}>
              {r.matches.slice(0, 3).map((m, mi) => <div key={mi}>{m.a} {m.gA}-{m.gB} {m.b}</div>)}
            </div>
          ))}
        </Panel>
      )}
      </div>
      </div>
    </div>
  );
}

/* ============================== SQUAD ============================== */
/** การ์ดผู้สมัครรายสัปดาห์แบบใช้ซ้ำได้ — ใช้ทั้งห้องโค้ชและห้องพยาบาล */
function CoachStatMini({ co, lang = "th" }) {
  if (!co || !["GK", "DF", "MF", "FW", "FITNESS"].includes(co.specialty)) return null;
  const sum = coachImpactSummary(co, lang);
  return (
    <div style={{ marginTop: 6, padding: "6px 8px", borderRadius: 6, background: "rgba(91,141,184,.08)", border: `1px solid ${C.steel}`, fontSize: 10, color: C.textDim, lineHeight: 1.5 }}>
      {sum.lines.slice(0, 4).map((line, i) => <div key={i}>{line}</div>)}
    </div>
  );
}

function StaffOfferCard({ spec, co, offer, locked, budget, onHire, uiLang = "th" }) {
  const terminationFee = co ? Math.round((co.weeklyWage * 8) / 1000) * 1000 : 0;
  return (
    <div style={{ padding: "8px 10px", borderRadius: 8, background: co ? "rgba(111,174,90,.1)" : C.panel2, border: `1px solid ${co ? C.good : C.steel}` }}>
      <div style={{ fontSize: 11, fontFamily: MONO_FONT, color: C.textDim, marginBottom: 4 }}>{STAFF_TH[spec]}</div>
      {co && (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 6, flexWrap: "wrap" }}>
          <StaffPackCardFace card={{ type: "COACH", name: co.name, portrait: co.portrait, stars: co.cardStars || 3, specialty: co.specialty, grade: co.grade || 1, boost: co.boost, technique: co.technique, motivation: co.motivation, drillSkill: co.drillSkill, coachingStyle: co.coachingStyle }} />
          <div style={{ flex: 1, minWidth: 140, fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {co.name}
            {staffEntityStars(co) ? <StarGlyphs count={staffEntityStars(co)} size={8} /> : null}
            {["GK", "DF", "MF", "FW", "FITNESS"].includes(spec) && (
              <span style={{ fontSize: 10, color: C.blue, fontWeight: 600 }}>
                {COACHING_STYLES[co.coachingStyle]?.th || ""} · ~{Math.round(coachDailyAttrBump(co) * 1000) / 10}%/วัน
              </span>
            )}
            {!["GK", "DF", "MF", "FW", "FITNESS"].includes(spec) && (
              <span style={{ fontSize: 10, color: C.textDim, fontWeight: 500 }}>+{co.boost}</span>
            )}
            {co.trait && COACH_TRAITS[co.trait] && (
              <span title={COACH_TRAITS[co.trait].descTh} style={{ fontSize: 9.5, color: C.gold, fontWeight: 700, background: "rgba(212,175,55,.12)", border: `1px solid ${C.gold}55`, borderRadius: 5, padding: "1px 6px" }}>
                🌟 {COACH_TRAITS[co.trait].th}
              </span>
            )}
            {co.seasonsServed > 0 && (
              <span style={{ fontSize: 9.5, color: C.textDim, fontFamily: MONO_FONT }}>· {co.seasonsServed} ฤดูกาล</span>
            )}
            {locked && <span style={{ fontSize: 9.5, color: C.textDim }}>🔒 เปลี่ยนได้ตอนขึ้นฤดูกาลหน้า</span>}
          </div>
        </div>
      )}
      {co && ["GK", "DF", "MF", "FW", "FITNESS"].includes(spec) && <CoachStatMini co={co} lang={uiLang} />}
      {locked ? (
        <div style={{ fontSize: 10.5, color: C.textDim }}>ล็อกจนจบฤดูกาลนี้ — เปลี่ยนสตาฟตำแหน่งนี้ได้อีกครั้งตอนขึ้นฤดูกาลหน้า</div>
      ) : offer ? (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{offer.name} (เกรด {offer.grade}/5)</div>
          {["GK", "DF", "MF", "FW", "FITNESS"].includes(spec) && <CoachStatMini co={ensureCoachProfile(offer, spec)} lang={uiLang} />}
          <div style={{ fontSize: 10.5, color: C.textDim, fontFamily: MONO_FONT, margin: "3px 0 6px" }}>
            ค่าแรกเข้า {formatMoney(offer.signingCost)} · ค่าเหนื่อย {formatMoney(offer.weeklyWage)}/วัน{co ? ` · +ค่าปรับเลิกจ้างคนเดิม ${formatMoney(terminationFee)}` : ""}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button disabled={budget < offer.signingCost + terminationFee} onClick={() => onHire(spec)} style={{ fontSize: 10.5, padding: "5px 10px", borderRadius: 6, border: "none", background: budget >= offer.signingCost + terminationFee ? C.good : "#2b332f", color: budget >= offer.signingCost + terminationFee ? "#08150e" : C.textDim, cursor: "pointer", fontWeight: 700 }}>{co ? "จ้างแทนคนเดิม" : "จ้าง"}</button>
          </div>
        </div>
      ) : <div style={{ fontSize: 10.5, color: C.textDim }}>ไม่มีผู้สมัครตอนนี้ รอรอบถัดไป</div>}
    </div>
  );
}

/* ============================== COACH ROOM ============================== */
function CoachRoomView({ career, staff, coachOffers, budget, onHireCoach, onHireCard, uiLang = "th" }) {
  const specs = ["GK", "DF", "MF", "FW", "FITNESS"];
  const cards = (career.staffCardBag || []).filter((c) => c.type === "COACH");
  const trainLevel = (career.facilities || {}).training || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel accent={C.blue}>
        <SectionLabel sub="โค้ชมี 3 สเตตหลัก + สไตล์ + สัญชาตญาณ (trait) · ยิ่งดาว/เกรดสูงยิ่งปั้นเร็ว · วันฝึกตรงสายได้ synergy">🧑‍🏫 ห้องโค้ช</SectionLabel>
        <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.55 }}>
          <b style={{ color: C.chalk }}>เทคนิค</b> = ปั้นสเตตรายวัน · <b style={{ color: C.chalk }}>แรงจูงใจ</b> = มูดหลังซ้อม synergy · <b style={{ color: C.chalk }}>ทักษะซ้อม</b> = บอร์ดซ้อมรายตำแหน่ง
          <br />สนามฝึก Lv.{trainLevel} บัพเพิ่ม · โค้ชฟิตเนสฟื้นสตามินาทั้งทีม · โค้ชที่อยู่ครบ 2 ฤดูกาลจะเก่งขึ้นถาวรทีละนิด
        </div>
      </Panel>
      {specs.some((spec) => staff[spec]) && (
        <Panel>
          <SectionLabel sub="สัญชาตญาณของแต่ละโค้ชในทีมตอนนี้">🌟 สัญชาตญาณสตาฟ</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {specs.filter((spec) => staff[spec]).map((spec) => {
              const co = ensureCoachProfile(staff[spec], spec);
              const trait = COACH_TRAITS[co.trait];
              return (
                <div key={spec} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5 }}>
                  <span>{STAFF_TH[spec]} — <b>{co.name}</b></span>
                  {trait ? <span style={{ color: C.gold, fontWeight: 700 }}>🌟 {trait.th}</span> : <span style={{ color: C.textDim }}>—</span>}
                </div>
              );
            })}
          </div>
        </Panel>
      )}
      <StaffCardPickerRow cards={cards} title="การ์ดโค้ชที่สุ่มได้" career={career} onHire={onHireCard} />
      <Panel>
        <SectionLabel>ผู้สมัครรายสัปดาห์</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {specs.map((spec) => (
            <StaffOfferCard
              key={spec}
              spec={spec}
              co={staff[spec]}
              offer={coachOffers ? coachOffers[spec] : null}
              locked={isStaffRoleLocked(staff[spec], career.season)}
              budget={budget}
              onHire={onHireCoach}
              uiLang={uiLang}
            />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function NationalityBadge({ nationality, lang, compact }) {
  const code = (nationality || "??").toUpperCase();
  const nat = getNationality(nationality);
  const label = nat ? formatNationality(nationality, lang) : code;
  return (
    <span
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 3 : 4,
        flexShrink: 0,
        fontSize: compact ? 9 : 10,
        fontWeight: 700,
        fontFamily: MONO_FONT,
        letterSpacing: 0.06,
        color: C.amber,
        background: "rgba(212,175,55,.14)",
        border: "1px solid rgba(212,175,55,.4)",
        borderRadius: 3,
        padding: compact ? "2px 5px" : "2px 7px",
        lineHeight: 1.2,
      }}
    >
      {nat?.flag && <span style={{ fontSize: compact ? 11 : 12, lineHeight: 1 }}>{nat.flag}</span>}
      <span>{compact ? code : `${code} · ${label}`}</span>
    </span>
  );
}

function SquadView({ squad, xi, squadSize, injuredCount, canKickoff, xiAfterFill, onSell, allowSell, currentDay, budget, onRenewContract, onGoMedical, onGoCoach, uiLang = "th", teams, leagueId = "thailand", team }) {
  const groups = ["GK", "DF", "MF", "FW"];
  const sorted = [...squad].sort((a, b) => b.rating - a.rating);
  const fitCount = squad.filter((p) => p.injuryDays <= 0).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel accent={canKickoff ? C.good : C.crimson}>
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
          <b>{t(uiLang, "squad.members")} {squadSize} {t(uiLang, "squad.people")}</b> · {t(uiLang, "squad.fit")} {fitCount} · {t(uiLang, "squad.injured")} {injuredCount}
          <br />{t(uiLang, "squad.xi")} {xi.filter(Boolean).length}/{MIN_XI_SIZE} · {t(uiLang, "squad.bench")} {MATCH_BENCH_SIZE} ({t(uiLang, "squad.subsPerMatch")} {MAX_MATCH_SUBS}{uiLang === "en" ? "/match" : "/นัด"})
          <br />{t(uiLang, "squad.xi")} <b style={{ color: canKickoff ? C.good : C.crimson }}>{xiAfterFill}/11</b>
          {!canKickoff && <span style={{ color: C.crimson }}> — {t(uiLang, "squad.cannotPlay")}</span>}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {onGoCoach && (
            <button type="button" onClick={onGoCoach} style={{ ...fmBtnGhost(), flex: 1, minWidth: 140, fontSize: 11, borderColor: C.blue, color: C.blue }}>🧑‍🏫 ห้องโค้ช — ปรับ/เปลี่ยนสตาฟ</button>
          )}
          {onGoMedical && (
            <button type="button" onClick={onGoMedical} style={{ ...fmBtnGhost(), flex: 1, minWidth: 140, fontSize: 11, borderColor: C.crimson, color: C.crimson }}>🏥 ห้องพยาบาล{injuredCount > 0 ? ` — บาดเจ็บ ${injuredCount} คน` : ""}</button>
          )}
        </div>
      </Panel>
      {groups.map((g) => (
        <Panel key={g}>
          <SectionLabel>{POS_TH[g]} ({sorted.filter((p) => p.position === g).length})</SectionLabel>
          <div className="fc-squad-grid">
            {sorted.filter((p) => p.position === g).map((p) => (
              <PlayerRow key={p.id} p={p} isXI={xi.includes(p.id)} squadSize={squadSize} onSell={onSell} allowSell={allowSell} currentDay={currentDay} budget={budget} onRenewContract={onRenewContract} uiLang={uiLang} teams={teams} leagueId={leagueId} team={team} />
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}
function attrGroupAvg(p, group) { return ATTR_GROUPS[group].reduce((s, k) => s + p.attrs[k], 0) / ATTR_GROUPS[group].length; }
/** รูปหน้านักเตะจิ๋วทรงกลม — โชว์ต่อแถวใน Squad list (ครอปเฉพาะหน้าจาก neck-crop portrait) */
function MiniPortraitAvatar({ player, size = 30 }) {
  if (!player?.portrait) return null;
  return (
    <img
      src={player.portrait}
      alt=""
      draggable={false}
      style={{
        width: size, height: size, borderRadius: "50%", objectFit: "cover", objectPosition: "center 12%",
        flexShrink: 0, border: `1.5px solid ${C.steel}`, boxShadow: "0 1px 3px rgba(0,0,0,.3)",
      }}
    />
  );
}
/** ไอคอนเสื้อจิ๋วสีทีม — โชว์ต่อแถวนักเตะใน Squad list ให้เห็นสีชุดแข่งเร็วๆ */
function MiniKitBadge({ team, size = 18 }) {
  const shirt = teamShirtColor(team);
  const trim = team?.secondaryColor || "#f2f0e6";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0 }} aria-hidden>
      <path d="M30 10 L10 25 L20 40 L30 32 L30 88 L70 88 L70 32 L80 40 L90 25 L70 10 L60 18 Q50 25 40 18 Z" fill={shirt} stroke={trim} strokeWidth="6" />
    </svg>
  );
}
function PlayerRow({ p, isXI, squadSize, onSell, allowSell, currentDay, budget, onRenewContract, uiLang = "th", teams, leagueId = "thailand", team }) {
  const [open, setOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const daysLeft = p.contractEndsDay != null && currentDay != null ? p.contractEndsDay - currentDay : null;
  const contractColor = daysLeft == null ? C.textDim : daysLeft > 60 ? C.good : daysLeft > 20 ? C.amber : C.crimson;
  const renewFee = Math.round((p.value * 0.06) / 1000) * 1000;
  const natId = resolvePlayerNationality(p, teams, leagueId);
  return (
    <div style={{ borderBottom: `1px solid ${C.steel}`, padding: "6px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <MiniPortraitAvatar player={p} />
        {team && <MiniKitBadge team={team} />}
        <span
          title={playerPosTH(p)}
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: "#08150e",
            background: playerPosColor(p),
            borderRadius: 5,
            padding: "3px 6px",
            flexShrink: 0,
            fontFamily: MONO_FONT,
            minWidth: 30,
            textAlign: "center",
            lineHeight: 1.2,
            boxShadow: "0 1px 3px rgba(0,0,0,.25)",
          }}
        >
          {playerPosCode(p)}
        </span>
        <RatingBadge value={p.rating} />
        <div style={{ flex: 1, minWidth: 0 }} onClick={() => setOpen((o) => !o)} role="button">
          <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {p.name}
            <button
              onClick={(e) => { e.stopPropagation(); setShowDetail(true); }}
              title="ดูสเตตแบบละเอียด"
              style={{ background: "transparent", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer", padding: 0, lineHeight: 1 }}
            >📊</button>
            {p.isLegend && <span style={{ fontSize: 9, background: C.gold, color: "#0b2318", borderRadius: 4, padding: "1px 5px" }}>⭐ {t(uiLang, "player.legend")}</span>}
            {isXI && <span style={{ fontSize: 9, background: C.good, color: "#08150e", borderRadius: 4, padding: "1px 5px" }}>{t(uiLang, "player.xiBadge")}</span>}
            {p.injuryDays > 0 && (
              <span style={{ fontSize: 9, background: C.crimson, color: "#fff", borderRadius: 4, padding: "1px 5px" }}>
                {t(uiLang, "player.injuredBadge")}
                {p.injurySeverity && INJURY_SEVERITY[p.injurySeverity] ? ` ${INJURY_SEVERITY[p.injurySeverity].label}` : ""} {p.injuryDays}{t(uiLang, "player.days")}
              </span>
            )}
            {(p.suspendedMatches || 0) > 0 && <span style={{ fontSize: 9, background: C.amber, color: "#2b1c00", borderRadius: 4, padding: "1px 5px" }}>🚫 ติดแบน {p.suspendedMatches} นัด</span>}
            <span style={{ fontSize: 9, background: STATUS_COLOR[p.status], color: "#08150e", borderRadius: 4, padding: "1px 5px" }}>{STATUS_TH[p.status]}</span>
            {p.personality && PLAYER_PERSONALITIES[p.personality] && (
              <span title={PLAYER_PERSONALITIES[p.personality].descTh} style={{ fontSize: 9, background: "transparent", border: `1px solid ${C.gold}55`, color: C.gold, borderRadius: 4, padding: "1px 5px" }}>
                🎭 {PLAYER_PERSONALITIES[p.personality].th}
              </span>
            )}
            {daysLeft != null && <span style={{ fontSize: 9, background: contractColor, color: "#08150e", borderRadius: 4, padding: "1px 5px" }}>{t(uiLang, "player.contract")} {daysLeft > 0 ? `${daysLeft}${t(uiLang, "player.days")}` : t(uiLang, "player.expired")}</span>}
          </div>
          <div style={{ marginTop: 3 }}>
            <NationalityBadge nationality={natId} lang={uiLang} />
          </div>
          <div style={{ fontSize: 11, color: C.textDim, fontFamily: MONO_FONT, marginTop: 4 }}>
            {t(uiLang, "player.age")} {p.age}{(p.altPos || []).length ? ` · ${t(uiLang, "player.altPos")}: ${p.altPos.join("/")}` : ""}
            {" · "}<PlayerStarsRow p={p} compact />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <div style={{ flex: 1 }}><MiniBar value={p.stamina} color={p.stamina > 60 ? C.good : p.stamina > 30 ? C.amber : C.crimson} /></div>
            <div style={{ flex: 1 }}><MiniBar value={p.morale} color={C.blue} /></div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: C.amber, fontFamily: MONO_FONT }}>{formatMoney(p.value)}</div>
          {allowSell && !p.isLegend && onSell && (
            <button
              disabled={squadSize <= MIN_SELL_SQUAD}
              onClick={() => onSell(p.id)}
              style={{
                marginTop: 4, background: "transparent",
                border: `1px solid ${squadSize <= MIN_SELL_SQUAD ? C.steel : C.crimson}`,
                color: squadSize <= MIN_SELL_SQUAD ? C.textDim : C.crimson,
                borderRadius: 6, fontSize: 10, padding: "2px 8px",
                cursor: squadSize <= MIN_SELL_SQUAD ? "not-allowed" : "pointer",
              }}
            >
              {t(uiLang, "player.sell")}
            </button>
          )}
        </div>
      </div>
      {daysLeft != null && daysLeft <= 60 && onRenewContract && (
        <div style={{ marginTop: 6, marginLeft: 40, display: "flex", alignItems: "center", gap: 8 }}>
          <button disabled={budget < renewFee} onClick={() => onRenewContract(p.id)} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.good}`, background: budget >= renewFee ? "rgba(111,174,90,.15)" : "transparent", color: budget >= renewFee ? C.good : C.textDim, cursor: budget >= renewFee ? "pointer" : "not-allowed" }}>{t(uiLang, "player.renew")} ({formatMoney(renewFee)})</button>
          {daysLeft <= 20 && <span style={{ fontSize: 10, color: C.crimson }}>⚠️ ใกล้หมดสัญญา ถ้าไม่ต่อจะออกฟรี</span>}
        </div>
      )}
      {open && (
        <div style={{ marginTop: 8, paddingLeft: 40, display: "flex", flexDirection: "column", gap: 8 }}>
          <PlayerStarsRow p={p} />
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
      {showDetail && <PlayerDetailModal player={p} team={teams?.find((t) => t.id === p.teamId)} onClose={() => setShowDetail(false)} />}
    </div>
  );
}

/* ============================== TACTICS ============================== */
/* ============================== SQUAD PITCH BOARD (ลากวางจัดทีม) ============================== */
function ShirtToken({ player, teamColor, slotPos, size = 46, ghost }) {
  const ratingRing = player.rating >= 82 ? C.gold : player.rating >= 72 ? "#b8c4bc" : "#7d6a45";
  const oopMult = playerOopMult(player, slotPos);
  const oop = slotPos && oopMult < 0.995;
  const hurt = player.injuryDays > 0;
  const banned = (player.suspendedMatches || 0) > 0;
  const lastName = player.name.split(" ")[1] || player.name;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: size + 20, opacity: (hurt || banned) && !ghost ? 0.45 : 1, pointerEvents: "none" }}>
      <div style={{ position: "relative", width: size, height: size, borderRadius: "50%", border: `2.5px solid ${oop ? C.crimson : ratingRing}`, background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,.12), rgba(0,0,0,.35))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: ghost ? "0 8px 20px rgba(0,0,0,.6)" : "0 2px 6px rgba(0,0,0,.4)" }}>
        <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 64 64">
          <path d="M22 8 L32 13 L42 8 L57 17 L50 31 L44 27 L44 56 L20 56 L20 27 L14 31 L7 17 Z"
            fill={teamColor} stroke="rgba(255,255,255,.75)" strokeWidth="2.5" strokeLinejoin="round" />
          <text x="32" y="44" textAnchor="middle" fontSize="21" fontWeight="800" fill="#fff" fontFamily="ui-monospace, monospace">{player.rating}</text>
        </svg>
        {hurt && <div style={{ position: "absolute", top: -4, right: -4, fontSize: 13 }}>🤕</div>}
        {!hurt && banned && <div style={{ position: "absolute", top: -4, right: -4, fontSize: 13 }}>🚫</div>}
        {player.isLegend && <div style={{ position: "absolute", top: -5, left: -5, fontSize: 11 }}>⭐</div>}
      </div>
      <div style={{ width: size - 4, height: 3, borderRadius: 2, background: "#0a1611", marginTop: 2, overflow: "hidden" }}>
        <div style={{ width: `${player.stamina}%`, height: "100%", background: player.stamina >= 60 ? C.good : player.stamina >= 35 ? C.amber : C.crimson }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 2, maxWidth: size + 20 }}>
        <span style={{ fontSize: 8.5, color: "#fff", background: "rgba(8,18,12,.8)", borderRadius: 3, padding: "1px 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lastName}</span>
        <span style={{ fontSize: 7.5, fontWeight: 800, color: "#08150e", background: playerPosColor(player), borderRadius: 3, padding: "1px 3px", flexShrink: 0 }}>{playerPosCode(player)}</span>
      </div>
      {oop && <span style={{ fontSize: 7.5, color: C.crimson, background: "rgba(8,18,12,.85)", borderRadius: 3, padding: "0 3px", marginTop: 1 }}>ผิดตำแหน่ง −{Math.round((1 - oopMult) * 100)}%</span>}
    </div>
  );
}

/** ความเข้าขา (chemistry) ระหว่างนักเตะ 2 คน — สัญชาติเดียวกัน + มูดเฉลี่ยของทั้งคู่ (proxy แทนการนับนัดที่เล่นด้วยกันจริง) */
function chemistryScore(a, b) {
  if (!a || !b) return 0;
  let score = 40;
  if (a.nationality && a.nationality === b.nationality) score += 25;
  score += Math.round(((a.morale ?? 50) + (b.morale ?? 50)) / 2 * 0.35);
  return clamp(score, 0, 100);
}
/** หา 2 ช่องที่อยู่ใกล้ที่สุดของแต่ละช่อง (ตามพิกัด x,y ของฟอร์เมชัน) ไว้วาดเป็นเส้นเชื่อมคู่ที่ยืนใกล้กัน */
function nearestSlotPairs(slotDefs) {
  return slotDefs.map((s, i) => {
    const order = slotDefs.map((_, j) => j).filter((j) => j !== i)
      .sort((a, b) => Math.hypot(s.x - slotDefs[a].x, s.y - slotDefs[a].y) - Math.hypot(s.x - slotDefs[b].x, s.y - slotDefs[b].y));
    return order.slice(0, 2);
  });
}
/** เส้นเชื่อมนักเตะ (Player Interaction) — สีเขียว/ส้ม/เทา ตามความเข้าขา วาดทับสนามใต้หมุดนักเตะ */
function ChemistryLinesSVG({ slotDefs, slots, byId }) {
  const neighborIdx = nearestSlotPairs(slotDefs);
  const seen = new Set();
  const lines = [];
  neighborIdx.forEach((neighbors, i) => {
    const pA = slots[i] ? byId[slots[i]] : null;
    if (!pA) return;
    neighbors.forEach((j) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) return;
      seen.add(key);
      const pB = slots[j] ? byId[slots[j]] : null;
      if (!pB) return;
      const score = chemistryScore(pA, pB);
      const color = score >= 75 ? "#3dba6a" : score >= 55 ? "#e0a458" : "#8d88ad";
      lines.push({ key, x1: slotDefs[i].x, y1: slotDefs[i].y, x2: slotDefs[j].x, y2: slotDefs[j].y, color, score });
    });
  });
  if (!lines.length) return null;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      {lines.map((l) => (
        <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth="0.6" strokeOpacity="0.6" strokeDasharray={l.score < 55 ? "2,1.5" : undefined} />
      ))}
    </svg>
  );
}
function SquadPitchBoard({ team, squad, slots, benchIds, editable, onMove, highlightId }) {
  const slotDefs = FORMATIONS[resolveFormation(team.formation)].slots;
  const benchRef = useRef(null);
  const subRefs = useRef([]);
  const slotRefs = useRef([]);
  const dragRef = useRef(null);
  const [drag, setDrag] = useState(null);

  const xiIds = slots.filter(Boolean);
  const byId = Object.fromEntries(squad.map((p) => [p.id, p]));
  const posOrder = { GK: 0, DF: 1, MF: 2, FW: 3 };
  const subSlotIds = benchIds || [];
  const subs = subSlotIds.map((id) => (id ? byId[id] : null));
  const allSubIds = subSlotIds.filter(Boolean);
  const reserves = squad.filter((p) => !xiIds.includes(p.id) && !allSubIds.includes(p.id))
    .sort((a, b) => (posOrder[a.position] - posOrder[b.position]) || b.rating - a.rating);

  dragRef.current = drag;

  function startDrag(e, src, player) {
    if (!editable || !player) return;
    if (player.injuryDays > 0) return;
    e.preventDefault();
    setDrag({ src, player, x: e.clientX, y: e.clientY });
  }

  useEffect(() => {
    if (!drag) return;
    const onPointerMove = (e) => {
      e.preventDefault();
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    };
    const onPointerUp = (e) => {
      const d = dragRef.current;
      setDrag(null);
      if (!d) return;
      const x = e.clientX, y = e.clientY;
      // หา slot ที่ใกล้จุดปล่อยที่สุด (รัศมี 46px)
      let dst = null, bestDist = 46;
      slotRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dist = Math.hypot(x - cx, y - cy);
        if (dist < bestDist) { bestDist = dist; dst = { kind: "slot", index: i }; }
      });
      subRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dist = Math.hypot(x - cx, y - cy);
        if (dist < 38) { bestDist = dist; dst = { kind: "sub", index: i }; }
      });
      if (!dst && benchRef.current) {
        const r = benchRef.current.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          dst = drag?.src.kind === "slot" ? { kind: "subArea" } : { kind: "reserveArea" };
        }
      }
      if (dst) onMove(d.src, dst);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [drag != null]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* สนาม — หญ้า + เส้นสนาม SVG สัดส่วน 68×105 ม. (วงกลมกลางสนามไม่เบี้ยว) */}
      <div style={{
        position: "relative", width: "100%", aspectRatio: PITCH_PORTRAIT_AR,
        background: PITCH_GRASS_STRIPES_PORTRAIT,
        borderRadius: "8px 8px 0 0", overflow: "hidden",
      }}>
        <PitchMarkingsSVG layout="portrait" />
        <ChemistryLinesSVG slotDefs={slotDefs} slots={slots} byId={byId} />
        {slotDefs.map((slot, i) => {
          const player = slots[i] ? byId[slots[i]] : null;
          const isDragSrc = drag?.src.kind === "slot" && drag.src.index === i;
          return (
            <div
              key={i}
              ref={(el) => { slotRefs.current[i] = el; }}
              onPointerDown={(e) => startDrag(e, { kind: "slot", index: i }, player)}
              style={{
                position: "absolute", left: `${slot.x}%`, top: `${slot.y}%`, transform: "translate(-50%,-50%)",
                touchAction: "none", cursor: editable && player ? "grab" : "default",
                opacity: isDragSrc ? 0.3 : 1,
              }}
            >
              {player ? (
                <ShirtToken player={player} teamColor={team.color} slotPos={slot.dpos} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 62 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px dashed ${drag ? C.amber : "rgba(255,255,255,.4)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, color: drag ? C.amber : "rgba(255,255,255,.55)", fontWeight: 700 }}>{slot.dpos}</div>
                  <span style={{ fontSize: 8.5, color: "rgba(255,255,255,.55)", marginTop: 3 }}>ว่าง</span>
                </div>
              )}
            </div>
          );
        })}
        {!editable && (
          <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", fontSize: 9.5, color: C.chalk, background: "rgba(8,18,12,.75)", borderRadius: 6, padding: "3px 10px", whiteSpace: "nowrap" }}>
            🤖 โหมดออโต้ — ผจก.จัดทีมให้ (ปิดออโต้เพื่อลากจัดเอง)
          </div>
        )}
      </div>

      {/* ม้านั่งสำรอง — ลงรายชื่อได้ {MATCH_BENCH_SIZE} คน (เปลี่ยนตัวได้ {MAX_MATCH_SUBS}/นัด) */}
      <div ref={benchRef} style={{ background: "#0e1d15", border: `1px solid ${C.steel}`, borderTop: `2px solid ${drag?.src.kind === "slot" ? C.crimson : C.blue}`, borderRadius: "0 0 8px 8px", padding: "8px 6px 6px" }}>
        <div style={{ fontSize: 8.5, color: C.textDim, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6, paddingLeft: 4 }}>
          ตัวสำรอง ({subs.filter(Boolean).length}/{MATCH_BENCH_SIZE}) {editable ? "— ลากขึ้นสนาม / สลับช่องสำรอง" : ""}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(MATCH_BENCH_SIZE, 5)}, 1fr)`, gap: 4, marginBottom: reserves.length ? 6 : 0 }}>
          {subs.map((p, i) => {
            const isDragSrc = (drag?.src.kind === "sub" && drag.src.index === i) || (drag?.src.kind === "bench" && drag.src.playerId === p?.id);
            return (
              <div
                key={`sub-${i}`}
                ref={(el) => { subRefs.current[i] = el; }}
                onPointerDown={(e) => p && startDrag(e, { kind: "sub", index: i }, p)}
                style={{
                  touchAction: "none", minHeight: 72, borderRadius: 8, border: `1px dashed ${p ? C.blue : "rgba(255,255,255,.25)"}`,
                  background: p ? (highlightId === p.id ? "rgba(224,164,88,.18)" : "rgba(90,155,213,.08)") : "rgba(0,0,0,.2)",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: editable && p && p.injuryDays <= 0 ? "grab" : "default",
                  opacity: isDragSrc ? 0.3 : 1,
                }}
              >
                {p ? <ShirtToken player={p} teamColor={team.color} size={36} /> : (
                  <span style={{ fontSize: 9, color: C.textDim }}>SUB {i + 1}</span>
                )}
              </div>
            );
          })}
        </div>
        {reserves.length > 0 && (
          <>
            <div style={{ fontSize: 8, color: C.textDim, marginBottom: 4, paddingLeft: 4 }}>นักเตะในทีม ({reserves.length}) — ลากลงมาช่อง SUB หรือเลือกจากตารางด้านล่าง</div>
            <DragScroll wheelOnly style={{ display: "flex", gap: 4, paddingBottom: 4 }}>
              {reserves.map((p) => {
                const isDragSrc = drag?.src.kind === "bench" && drag.src.playerId === p.id;
                return (
                  <div
                    key={p.id}
                    onPointerDown={(e) => startDrag(e, { kind: "bench", playerId: p.id }, p)}
                    style={{
                      touchAction: "none", cursor: editable && p.injuryDays <= 0 ? "grab" : "default", flexShrink: 0,
                      opacity: isDragSrc ? 0.3 : 1, outline: highlightId === p.id ? `2px solid ${C.amber}` : "none", borderRadius: 8,
                    }}
                  >
                    <ShirtToken player={p} teamColor={team.color} size={34} />
                  </div>
                );
              })}
            </DragScroll>
          </>
        )}
        {subs.filter(Boolean).length === 0 && reserves.length === 0 && (
          <span style={{ fontSize: 10, color: C.textDim, padding: 6 }}>ไม่มีนักเตะสำรอง</span>
        )}
      </div>

      {/* ghost ตามนิ้ว/เมาส์ตอนลาก */}
      {drag && (
        <div style={{ position: "fixed", left: drag.x, top: drag.y, transform: "translate(-50%,-60%)", zIndex: 9999, pointerEvents: "none" }}>
          <ShirtToken player={drag.player} teamColor={team.color} ghost />
        </div>
      )}
    </div>
  );
}

/* ---------- ตารางนักเตะสไตล์ Top Eleven (แท็บแทคติก) ---------- */
function PosBadge({ pos, tier, oop }) {
  const bg = tier === "sub" ? "#5a9bd5" : tier === "res" ? "#3a4a42" : POS_COLOR[POS_GROUP[pos] || pos] || C.steel;
  const label = tier === "sub" ? "SUB" : tier === "res" ? "RES" : pos;
  const fg = tier === "res" ? C.textDim : "#08150e";
  return (
    <div style={{ position: "relative", width: 34, flexShrink: 0 }}>
      <div style={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: 9.5, color: fg, background: bg, borderRadius: 5, textAlign: "center", padding: "3px 0" }}>{label}</div>
      {oop && <div style={{ position: "absolute", top: -5, right: -5, fontSize: 8 }} title="ยืนผิดตำแหน่ง">⚠️</div>}
    </div>
  );
}

function TacticsSquadTable({ career, squad, team, onSetPlayerRole, onSetPlayerDuty, onAutoPick, onBoardMove, editable, highlightId }) {
  const [expandedId, setExpandedId] = useState(null);
  const [pick, setPick] = useState(null); // { kind, index?, playerId? }
  const [dragOver, setDragOver] = useState(null);
  const [detailPlayer, setDetailPlayer] = useState(null);
  const slots = resolveLineupSlots(career, squad, team.formation);
  const slotDefs = FORMATIONS[resolveFormation(team.formation)].slots;
  const xiIds = slots.filter(Boolean);
  const benchSlots = normalizeBenchSlots(career, squad, xiIds);
  const benchIds = benchSlots.filter(Boolean);
  const byId = Object.fromEntries(squad.map((p) => [p.id, p]));

  const xiRows = slots.map((id, i) => ({ p: id ? byId[id] : null, slotPos: slotDefs[i].dpos, tier: "xi", slotIndex: i })).filter((r) => r.p);
  const subRows = benchSlots.map((id, i) => ({
    p: id ? byId[id] : null, slotPos: null, tier: "sub", subIndex: i,
  }));
  const resRows = squad.filter((p) => !xiIds.includes(p.id) && !benchIds.includes(p.id))
    .sort((a, b) => b.rating - a.rating)
    .map((p) => ({ p, slotPos: null, tier: "res", playerId: p.id }));

  function srcFromRow(row) {
    if (row.tier === "xi") return { kind: "slot", index: row.slotIndex };
    if (row.tier === "sub") return row.p ? { kind: "sub", index: row.subIndex } : null;
    return { kind: "bench", playerId: row.p.id };
  }
  function dstFromRow(row) {
    if (row.tier === "xi") return { kind: "slot", index: row.slotIndex };
    if (row.tier === "sub") return { kind: "sub", index: row.subIndex };
    return { kind: "reserveArea" };
  }
  function tryMove(src, dst) {
    if (!editable || !onBoardMove || !src || !dst) return;
    onBoardMove(src, dst);
    setPick(null);
  }
  function onRowTap(row) {
    if (!editable || row.p?.injuryDays > 0) return;
    const src = srcFromRow(row);
    if (!pick) { setPick(src); return; }
    if (pick.kind === src.kind && pick.index === src.index && pick.playerId === src.playerId) { setPick(null); return; }
    tryMove(pick, dstFromRow(row));
  }

  const grid = "34px 1fr 26px 66px 30px 84px";

  function renderRow(row, key) {
    const { p, slotPos, tier } = row;
    if (!p && tier !== "sub") return null;
    const oopMult = slotPos ? playerOopMult(p, slotPos) : 1;
    const oop = slotPos && oopMult < 0.995;
    const role = p ? resolvePlayerRole(p) : null;
    const condColor = p ? (p.stamina >= 60 ? C.good : p.stamina >= 35 ? C.amber : C.crimson) : C.steel;
    const expanded = p && expandedId === p.id;
    const isPick = pick && ((pick.kind === "slot" && tier === "xi" && pick.index === row.slotIndex)
      || (pick.kind === "sub" && tier === "sub" && pick.index === row.subIndex)
      || (pick.kind === "bench" && p && pick.playerId === p.id));
    const isNew = p && highlightId === p.id;
    const rowBg = expanded ? "rgba(224,164,88,.05)" : isPick ? "rgba(90,155,213,.12)" : isNew ? "rgba(224,164,88,.12)" : tier === "res" ? "rgba(0,0,0,.14)" : tier === "sub" ? "rgba(90,155,213,.06)" : "transparent";

    return (
      <div
        key={key}
        draggable={editable && p && p.injuryDays <= 0}
        onDragStart={(e) => { if (!p) return; e.dataTransfer.setData("text/plain", p.id); setPick(srcFromRow(row)); }}
        onDragEnd={() => setDragOver(null)}
        onDragOver={(e) => { e.preventDefault(); setDragOver(key); }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(null);
          const pid = e.dataTransfer.getData("text/plain");
          if (!pid || !p) return;
          let src = pick;
          if (!src) {
            if (xiIds.includes(pid)) src = { kind: "slot", index: slots.indexOf(pid) };
            else if (benchIds.includes(pid)) src = { kind: "sub", index: benchIds.indexOf(pid) };
            else src = { kind: "bench", playerId: pid };
          }
          tryMove(src, dstFromRow(row));
        }}
        onClick={() => (p ? onRowTap(row) : editable && pick && tryMove(pick, dstFromRow(row)))}
        style={{
          borderBottom: `1px solid #1c2a24`, background: dragOver === key ? "rgba(111,174,90,.12)" : rowBg,
          cursor: editable && (p || tier === "sub") ? "pointer" : "default",
          outline: isNew ? `1px solid ${C.amber}` : "none",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: grid, gap: 6, alignItems: "center", padding: "5px 10px" }}>
          <PosBadge pos={slotPos || (p ? playerPosCode(p) : "—")} tier={tier} oop={oop} />
          <div style={{ minWidth: 0 }}>
            {p ? (
              <>
                <div style={{ fontSize: 11.5, fontWeight: tier === "xi" ? 700 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDetailPlayer(p); }}
                    title="ดูสเตตแบบละเอียด"
                    style={{ background: "transparent", border: "none", color: "inherit", font: "inherit", fontWeight: "inherit", padding: 0, cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textDecorationColor: C.textDim }}
                  >{p.name}</button>
                  {p.injuryDays > 0 && " 🤕"}{p.injuryDays <= 0 && (p.suspendedMatches || 0) > 0 && " 🚫"}{p.isLegend && " ⭐"}{isNew && <span style={{ color: C.amber, fontSize: 9 }}> NEW</span>}
                </div>
                <div style={{ fontSize: 8, color: oop ? C.crimson : C.textDim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {oop
                    ? `ถนัด ${playerPosCode(p)} — ผิดตำแหน่ง −${Math.round((1 - oopMult) * 100)}%`
                    : `${playerPosCode(p)}${(p.altPos || []).length ? ` · รอง: ${p.altPos.join(", ")}` : ""}`}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 10, color: C.textDim, fontStyle: "italic" }}>ช่องสำรองว่าง — แตะเพื่อวาง</div>
            )}
          </div>
          <span style={{ fontSize: 10.5, fontFamily: MONO_FONT, color: C.textDim }}>{p ? p.age : "—"}</span>
          <div>{p ? (<><MiniBar value={p.stamina} color={condColor} /><div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}><span style={{ fontSize: 7.5, fontFamily: MONO_FONT, color: condColor }}>{Math.round(p.stamina)}%</span><span style={{ fontSize: 7.5, color: C.textDim }}>มูด {Math.round(p.morale)}</span></div></>) : null}</div>
          {p ? <RatingBadge value={p.rating} /> : <span />}
          {p ? (
            <button type="button" onClick={(e) => { e.stopPropagation(); setExpandedId(expanded ? null : p.id); }} style={{
              fontSize: 8.5, padding: "4px 4px", borderRadius: 6, cursor: "pointer", textAlign: "center",
              border: `1px solid ${expanded ? C.amber : C.steel}`, background: expanded ? "rgba(224,164,88,.15)" : C.panel2,
              color: expanded ? C.amber : C.chalk, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{p ? roleDutyShortCode(p) : ""} · {role.label}</button>
          ) : <span />}
        </div>
        {expanded && p && (
          <div style={{ padding: "2px 10px 8px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {rolesForPlayer(p).map((r) => {
                const on = role.id === r.id;
                return (
                  <button key={r.id} type="button" onClick={() => onSetPlayerRole(p.id, r.id)} style={{
                    fontSize: 9, padding: "4px 8px", borderRadius: 6, cursor: "pointer",
                    border: `1px solid ${on ? C.amber : C.steel}`, background: on ? "rgba(224,164,88,.15)" : "transparent",
                    color: on ? C.amber : C.textDim,
                  }}>{r.label}{on ? " ✓" : ""}</button>
                );
              })}
            </div>
            {!role.id.startsWith("gk_") && onSetPlayerDuty && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {DUTY_LIST.map((d) => {
                  const on = (p.duty || "support") === d.id;
                  return (
                    <button key={d.id} type="button" onClick={() => { onSetPlayerDuty(p.id, d.id); setExpandedId(null); }} style={{
                      fontSize: 9, padding: "4px 8px", borderRadius: 6, cursor: "pointer",
                      border: `1px solid ${on ? C.blue : C.steel}`, background: on ? "rgba(90,155,213,.15)" : "transparent",
                      color: on ? C.blue : C.textDim,
                    }}>{d.label}{on ? " ✓" : ""}</button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
    <Panel style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 14px 8px" }}>
        <SectionLabel sub={`ตัวจริง ${MIN_XI_SIZE} · ตัวสำรอง ${MATCH_BENCH_SIZE} (เปลี่ยนได้ ${MAX_MATCH_SUBS}/นัด) · ทีมทั้งหมด ${squad.length} คน — ลากหรือแตะสลับ`}>รายชื่อนักเตะ</SectionLabel>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: grid, gap: 6, alignItems: "center", padding: "4px 10px 6px", borderBottom: `1px solid ${C.steel}` }}>
        <span style={{ fontSize: 9, color: C.textDim, fontWeight: 700 }}>ตำแหน่ง</span>
        <span style={{ fontSize: 9, color: C.textDim, fontWeight: 700 }}>ชื่อ</span>
        <span style={{ fontSize: 9, color: C.textDim, fontWeight: 700 }}>อายุ</span>
        <span style={{ fontSize: 9, color: C.textDim, fontWeight: 700 }}>คอนดิชัน</span>
        <span style={{ fontSize: 9, color: C.textDim, fontWeight: 700 }}>OVR</span>
        <span style={{ fontSize: 9, color: C.textDim, fontWeight: 700 }}>บทบาท</span>
      </div>
      <div style={{ padding: "6px 10px 2px", fontSize: 9, color: C.good, fontWeight: 700, letterSpacing: 0.5 }}>▸ ตัวจริง ({xiRows.length}/{MIN_XI_SIZE})</div>
      {xiRows.map((row) => renderRow(row, `xi-${row.slotIndex}`))}
      <div style={{ padding: "8px 10px 2px", fontSize: 9, color: C.blue, fontWeight: 700, letterSpacing: 0.5, borderTop: `1px solid ${C.steel}` }}>▸ ตัวสำรอง ({benchIds.length}/{MATCH_BENCH_SIZE})</div>
      {subRows.map((row) => renderRow(row, `sub-${row.subIndex}`))}
      <div style={{ padding: "8px 10px 2px", fontSize: 9, color: C.textDim, fontWeight: 700, letterSpacing: 0.5, borderTop: `1px solid ${C.steel}` }}>▸ นักเตะในทีม ({resRows.length})</div>
      {resRows.map((row) => renderRow(row, `res-${row.p.id}`))}
      {pick && editable && (
        <div style={{ padding: "6px 10px", fontSize: 10, color: C.amber, background: "rgba(224,164,88,.08)", borderTop: `1px solid ${C.steel}` }}>
          เลือกแล้ว — แตะแถวปลายทางเพื่อสลับ · แตะแถวเดิมอีกครั้งเพื่อยกเลิก
        </div>
      )}
      <div style={{ padding: 10 }}>
        <button type="button" onClick={onAutoPick} disabled={team.autoMode} style={{ ...btnStyle(team.autoMode ? "#2b332f" : C.blue, team.autoMode ? C.textDim : "#fff"), width: "100%", cursor: team.autoMode ? "not-allowed" : "pointer" }}>
          {team.autoMode ? "โหมดออโต้จัดให้อยู่แล้ว" : "จัดทีมอัตโนมัติ"}
        </button>
      </div>
    </Panel>
    {detailPlayer && <PlayerDetailModal player={detailPlayer} team={team} squad={squad} onClose={() => setDetailPlayer(null)} />}
    </>
  );
}

/* ---------- การ์ดสไตล์ทีมแบบใหญ่ (จังหวะ/เพรสซิ่ง/แนวรับ) ---------- */
const STYLE_CARD_ICONS = {
  tempo: { slow: "🐢", normal: "⚖️", fast: "⚡" },
  pressing: { low: "🧱", medium: "🔁", high: "🔥" },
  defLine: { deep: "🛡️", normal: "➖", high: "📏" },
  creativeFreedom: { disciplined: "📐", balanced: "⚖️", expressive: "🎨" },
};
function styleEffectLine(opt) {
  const parts = [];
  if (opt.atk !== 1) parts.push(`${opt.atk > 1 ? "+" : ""}${Math.round((opt.atk - 1) * 100)}% รุก`);
  if (opt.def !== 1) parts.push(`${opt.def > 1 ? "+" : ""}${Math.round((opt.def - 1) * 100)}% รับ`);
  if (opt.staminaDrainMult && opt.staminaDrainMult !== 1) parts.push(opt.staminaDrainMult > 1 ? `แรง x${opt.staminaDrainMult}` : "ประหยัดแรง");
  if (opt.injuryRiskMult && opt.injuryRiskMult > 1) parts.push("เสี่ยงเจ็บ ↑");
  return parts.length ? parts.join(" · ") : "สมดุล";
}
function TeamStyleCards({ matchPrep, onSetPrepField, squad, xi }) {
  const groups = [
    { field: "tempo", label: "จังหวะเกม (Tempo)", options: TEMPO_OPTIONS, group: "in" },
    { field: "creativeFreedom", label: "อิสระความคิด (Creative Freedom)", options: CREATIVE_FREEDOM_OPTIONS, group: "in" },
    { field: "pressing", label: "เพรสซิ่ง (Pressing)", options: PRESSING_OPTIONS, group: "out" },
    { field: "defLine", label: "แนวรับ (Defensive Line)", options: DEF_LINE_OPTIONS, group: "out" },
  ];
  const xiDF = squad.filter((p) => xi.includes(p.id) && p.position === "DF");
  const avgDefPace = xiDF.length ? xiDF.reduce((s, p) => s + (p.attrs?.pace || 10), 0) / xiDF.length : 10;
  const sections = [
    { id: "in", label: "🔵 ครองบอล (In Possession)" },
    { id: "out", label: "🔴 ไม่ได้ครองบอล (Out of Possession)" },
  ];
  return (
    <Panel style={{ border: `1px solid ${C.blue}` }}>
      <SectionLabel style={{ color: C.blue }} sub="มีผลทุกนัดจนกว่าจะเปลี่ยน — ปรับเฉพาะนัดได้ที่หน้าเตรียมแมตช์เหมือนเดิม">สไตล์การเล่นของทีม</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {sections.map((section) => (
          <div key={section.id}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: C.chalk, marginBottom: 10 }}>{section.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {groups.filter((g) => g.group === section.id).map(({ field, label, options }) => {
                const current = matchPrep?.[field] || options[1].id;
                return (
                  <div key={field}>
                    <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: 8 }}>
                      {options.map((opt) => {
                        const on = current === opt.id;
                        return (
                          <button key={opt.id} type="button" onClick={() => onSetPrepField(field, opt.id)} style={{
                            padding: "12px 6px 10px", borderRadius: 10, cursor: "pointer", textAlign: "center",
                            border: `2px solid ${on ? "#6db3f2" : C.steel}`,
                            background: on ? "linear-gradient(165deg,#1d3a5f,#12253f)" : C.panel2,
                            boxShadow: on ? "0 0 12px rgba(109,179,242,.25)" : "none",
                            transition: "all .15s",
                          }}>
                            <div style={{ fontSize: 24, filter: on ? "none" : "grayscale(.6)" }}>{STYLE_CARD_ICONS[field][opt.id]}</div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: on ? "#bcdcf7" : C.chalk, marginTop: 4 }}>{opt.label}</div>
                            <div style={{ fontSize: 8, color: on ? "#8fb8dd" : C.textDim, marginTop: 3, lineHeight: 1.35 }}>{styleEffectLine(opt)}</div>
                            {on && <div style={{ fontSize: 8.5, color: "#6db3f2", marginTop: 4, fontWeight: 700 }}>✓ ใช้อยู่</div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: C.panel2, border: `1px solid ${C.steel}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700 }}>🪤 กับดักล้ำหน้า (Offside Trap)</div>
            <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>
              ได้ผลเมื่อใช้แนวรับสูง + แบ็คตัวเร็ว (ความเร็วเฉลี่ยกองหลังตอนนี้ {avgDefPace.toFixed(1)})
            </div>
          </div>
          <button type="button" onClick={() => onSetPrepField("offsideTrap", !matchPrep?.offsideTrap)} style={{
            fontSize: 10, fontWeight: 700, padding: "6px 12px", borderRadius: 7, cursor: "pointer",
            border: `1px solid ${matchPrep?.offsideTrap ? "#6db3f2" : C.steel}`,
            background: matchPrep?.offsideTrap ? "#1d3a5f" : "transparent",
            color: matchPrep?.offsideTrap ? "#bcdcf7" : C.textDim,
          }}>{matchPrep?.offsideTrap ? "เปิดอยู่ ✓" : "ปิดอยู่"}</button>
        </div>
      </div>
    </Panel>
  );
}

/** สรุปคู่เข้าขาที่สุด/ตึงที่สุดในตัวจริง — วิเคราะห์จากเส้นเชื่อมความเข้าขา (ChemistryLinesSVG) แบบสรุปเป็นข้อความ */
function ChemistrySummaryPanel({ squad, slots, formation }) {
  const slotDefs = FORMATIONS[resolveFormation(formation)].slots;
  const byId = Object.fromEntries(squad.map((p) => [p.id, p]));
  const neighborIdx = nearestSlotPairs(slotDefs);
  const seen = new Set();
  const pairs = [];
  neighborIdx.forEach((neighbors, i) => {
    const pA = slots[i] ? byId[slots[i]] : null;
    if (!pA) return;
    neighbors.forEach((j) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) return;
      seen.add(key);
      const pB = slots[j] ? byId[slots[j]] : null;
      if (!pB) return;
      pairs.push({ key, pA, pB, score: chemistryScore(pA, pB) });
    });
  });
  if (pairs.length < 2) return null;
  const sorted = [...pairs].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  return (
    <Panel>
      <SectionLabel sub="คำนวณจากสัญชาติที่ตรงกัน + มูดของทั้งคู่ในสควอดตัวจริงตอนนี้">🔗 ความเข้าขาในทีม</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", borderRadius: 8, background: "rgba(61,186,106,.1)", border: `1px solid ${C.good}` }}>
          <div style={{ fontSize: 11.5 }}>💚 <b>{best.pA.name}</b> ↔ <b>{best.pB.name}</b></div>
          <div style={{ fontSize: 11, fontFamily: MONO_FONT, color: C.good, fontWeight: 700 }}>{best.score}%</div>
        </div>
        {worst.score < 55 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", borderRadius: 8, background: "rgba(224,90,74,.08)", border: `1px solid ${C.crimson}` }}>
            <div style={{ fontSize: 11.5 }}>⚠️ <b>{worst.pA.name}</b> ↔ <b>{worst.pB.name}</b></div>
            <div style={{ fontSize: 11, fontFamily: MONO_FONT, color: C.crimson, fontWeight: 700 }}>{worst.score}%</div>
          </div>
        )}
      </div>
    </Panel>
  );
}

function TacticsView({
  career, squad, team, xi, matchScout, matchPrep, seasonOver,
  onSetFormation, onToggleAuto, onSetPlayerRole, onSetPlayerDuty, onSetSetPieceTaker, onBoardMove, onSetPrepField, onAutoPick,
  onSetMentality, onToggleInstruction, onSetTeamTalk, onApplySuggested,
}) {
  const formation = team.formation;
  const slots = resolveLineupSlots(career, squad, formation);
  const benchSlotIds = normalizeBenchSlots(career, squad, slots.filter(Boolean));
  const highlightId = career?.newSquadPlayerId || null;
  const xiPlayers = squad.filter((p) => xi.includes(p.id));
  const famMatches = career?.tacticFamiliarity && career.tacticFamiliarity.formation === formation ? career.tacticFamiliarity.matches : 0;
  const famMult = familiarityMultiplier(famMatches);
  const famPct = Math.round(clamp((famMatches / 15) * 100, 0, 100));
  const famLabel = famMatches >= 15 ? "ชำนาญสูงสุด" : famMatches >= 10 ? "คุ้นเคยดี" : famMatches >= 6 ? "เริ่มเข้าที่" : famMatches >= 3 ? "กำลังปรับตัว" : "ยังใหม่กับแผนนี้";
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
      {matchScout && !seasonOver && (
        <MatchPlanHub
          scout={matchScout}
          matchPrep={matchPrep}
          onSetMentality={onSetMentality}
          onToggleInstruction={onToggleInstruction}
          onSetTeamTalk={onSetTeamTalk}
          onApplySuggested={onApplySuggested}
          onSetPrepField={onSetPrepField}
          onSetFormation={onSetFormation}
          onAutoPick={onAutoPick}
        />
      )}
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
        <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, background: C.panel2, border: `1px solid ${C.steel}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1 }}>ความคุ้นเคยแทคติก</span>
            <span style={{ fontSize: 10.5, fontFamily: MONO_FONT, color: famMult >= 1 ? C.good : C.crimson, fontWeight: 700 }}>
              {famLabel} ({famMult >= 1 ? "+" : ""}{Math.round((famMult - 1) * 100)}%)
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "#1c2a24", overflow: "hidden" }}>
            <div style={{ width: `${famPct}%`, height: "100%", background: famMult >= 1 ? C.good : C.amber, transition: "width .3s" }} />
          </div>
          <div style={{ fontSize: 9.5, color: C.textDim, marginTop: 4 }}>
            เล่นแผน {formation} ต่อเนื่อง {famMatches} นัด — เปลี่ยนแผนใหม่จะเริ่มนับใหม่และเสียฟอร์มช่วงแรก (เหมือน FM)
          </div>
        </div>
      </Panel>
      <div className="fc-tactics-split">
        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <SquadPitchBoard
            team={team} squad={squad}
            slots={slots}
            benchIds={benchSlotIds}
            editable={!team.autoMode}
            onMove={onBoardMove}
            highlightId={highlightId}
          />
        </Panel>

        <TacticsSquadTable
          career={career} squad={squad} team={team}
          onSetPlayerRole={onSetPlayerRole} onSetPlayerDuty={onSetPlayerDuty} onAutoPick={onAutoPick}
          onBoardMove={onBoardMove} editable={!team.autoMode} highlightId={highlightId}
        />
      </div>

      <ChemistrySummaryPanel squad={squad} slots={slots} formation={formation} />

      <TeamStyleCards matchPrep={career.matchPrep} onSetPrepField={onSetPrepField} squad={squad} xi={xi} />

      <Panel>
        <SectionLabel sub="เลือกมือดาวเตะเอง — สเตตคนเตะมีผลต่อคุณภาพลูกตั้งเตะทั้งเกม">มือดาวเตะลูกตั้งเตะ (Set Pieces)</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { kind: "corner", label: "คอร์เนอร์", icon: "🚩", takerId: team.cornerTakerId },
            { kind: "freekick", label: "ฟรีคิก", icon: "🎯", takerId: team.freekickTakerId },
            { kind: "penalty", label: "จุดโทษ", icon: "⚽", takerId: team.penaltyTakerId },
          ].map(({ kind, label, icon, takerId }) => {
            const attrs = SET_PIECE_ATTRS[kind];
            const candidates = [...xiPlayers]
              .map((p) => ({ p, score: attrs.reduce((s, k) => s + (p.attrs?.[k] || 8), 0) / attrs.length }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 5);
            return (
              <div key={kind}>
                <div style={{ fontSize: 10.5, color: C.chalk, marginBottom: 4 }}>
                  {icon} {label} <span style={{ fontSize: 9, color: C.textDim }}>(ใช้สเตต {attrs.map((k) => ATTR_TH[k]).join(" + ")})</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {candidates.map(({ p, score }) => {
                    const on = takerId === p.id;
                    return (
                      <button key={p.id} onClick={() => onSetSetPieceTaker(kind, p.id)} style={{
                        fontSize: 9.5, padding: "4px 8px", borderRadius: 6, cursor: "pointer",
                        border: `1px solid ${on ? C.good : C.steel}`,
                        background: on ? "rgba(111,174,90,.15)" : "transparent",
                        color: on ? C.good : C.textDim,
                      }}>{p.name.split(" ")[1] || p.name} · {score.toFixed(1)}{on ? " ✓" : ""}</button>
                    );
                  })}
                  {candidates.length === 0 && <span style={{ fontSize: 10, color: C.textDim }}>ยังไม่มีตัวจริง</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

    </div>
  );
}

/* ============================== TABLE ============================== */
function TeamRosterPanel({ team, players, onClose }) {
  const squad = [...(players || []).filter((p) => p.teamId === team.id)].sort((a, b) => b.rating - a.rating);
  const byPos = { GK: [], DF: [], MF: [], FW: [] };
  squad.forEach((p) => { if (byPos[p.position]) byPos[p.position].push(p); });
  return (
    <Panel accent={team.color || C.amber}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <SectionLabel sub={`${squad.length} คน · ${team.formation || "4-4-2"}`}>{team.name}</SectionLabel>
        <button type="button" onClick={onClose} style={{ ...btnStyle("transparent", C.textDim), border: `1px solid ${C.steel}`, width: "auto", padding: "4px 10px", fontSize: 10 }}>ปิด</button>
      </div>
      {squad.length === 0 ? (
        <div style={{ fontSize: 12, color: C.textDim }}>ไม่มีข้อมูล squad</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {["GK", "DF", "MF", "FW"].map((pos) => byPos[pos].length > 0 && (
            <div key={pos}>
              <div style={{ fontSize: 9, color: POS_COLOR[pos], fontWeight: 700, marginBottom: 4, letterSpacing: 0.5 }}>{POS_TH[pos]} ({byPos[pos].length})</div>
              {byPos[pos].map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", borderBottom: `1px solid ${C.steel}`, fontSize: 11 }}>
                  <RatingBadge value={p.rating} />
                  <span style={{ flex: 1, fontWeight: p.isLegend ? 700 : 400 }}>{p.name}{p.isLegend ? " ⭐" : ""}</span>
                  <span style={{ fontSize: 9, color: C.textDim, fontFamily: MONO_FONT }}>{p.age}y</span>
                  {p.injuryDays > 0 && <span style={{ fontSize: 9 }}>🤕</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function TableView({ career, userTeamId, userDivision, round, teams, players, legendLeagueId }) {
  const [viewDiv, setViewDiv] = useState(userDivision);
  const [rosterTeamId, setRosterTeamId] = useState(null);
  const standings = standingsForDivision(career, viewDiv);
  const league = career.leagues[viewDiv];
  const rosterTeam = rosterTeamId ? teams.find((t) => t.id === rosterTeamId) : null;
  const canBrowseRoster = viewDiv === 0 && hasFullRosterLeague(legendLeagueId);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {[0, 1].map((d) => (
          <button key={d} onClick={() => { setViewDiv(d); setRosterTeamId(null); }} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `2px solid ${viewDiv === d ? C.amber : C.steel}`, background: viewDiv === d ? "rgba(224,164,88,.12)" : "transparent", color: viewDiv === d ? C.amber : C.chalk, fontFamily: DISPLAY_FONT, fontSize: 12, cursor: "pointer" }}>
            {LEAGUE_NAMES[d]}{d === userDivision ? " (ทีมคุณ)" : ""}
          </button>
        ))}
      </div>
      {canBrowseRoster && (
        <div style={{ fontSize: 10, color: C.textDim, lineHeight: 1.5 }}>แตะชื่อทีม Master League เพื่อดู roster ~23 คน</div>
      )}
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
              const clickable = canBrowseRoster && s.team.legendTeamKey;
              return (
                <tr key={s.team.id} onClick={clickable ? () => setRosterTeamId(rosterTeamId === s.team.id ? null : s.team.id) : undefined} style={{
                  background: rosterTeamId === s.team.id ? "rgba(224,164,88,.2)" : s.team.id === userTeamId ? "rgba(224,164,88,.15)" : zone === "up" ? "rgba(111,174,90,.06)" : zone === "down" ? "rgba(193,68,14,.06)" : "transparent",
                  borderTop: `1px solid ${C.steel}`, cursor: clickable ? "pointer" : "default",
                }}>
                  <td style={{ padding: "5px 6px" }}>{i + 1}</td>
                  <td style={{ padding: "5px 6px", fontFamily: "'Segoe UI', sans-serif", fontWeight: s.team.id === userTeamId ? 700 : 400, color: clickable ? C.amber : C.chalk }}>{s.team.short}{clickable ? " ›" : ""}</td>
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
      {rosterTeam && (
        <TeamRosterPanel team={rosterTeam} players={players} onClose={() => setRosterTeamId(null)} />
      )}
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

/* ============================== MARKET HUB ============================== */
const MARKET_SUB_TABS = [
  { id: "trade", label: "ซื้อ/ขาย", icon: "¤" },
  { id: "scout", label: "Scout", icon: "🔭" },
];

function MarketHubView({
  subTab, setSubTab, list, scoutFinds, budget, onBid, onBuyScoutFind, onScoutSearch,
  onHireMarketScout, onHireScoutCard, marketOpen, now, career, onAcquireLegend, playMode,
  squad, squadSize, onSell,
}) {
  const activeSub = subTab === "squad" ? "trade" : subTab;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {MARKET_SUB_TABS.map((t) => {
          const active = activeSub === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              style={{
                flex: 1, padding: "10px 6px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700,
                background: active ? "rgba(224,164,88,.15)" : C.panel2,
                border: `2px solid ${active ? C.amber : C.steel}`,
                color: active ? C.amber : C.textDim,
              }}
            >
              <div style={{ fontSize: 14, marginBottom: 2 }}>{t.icon}</div>
              {t.label}
            </button>
          );
        })}
      </div>
      {activeSub === "trade" && (
        <MarketTradeView
          list={list}
          budget={budget}
          onBid={onBid}
          marketOpen={marketOpen}
          now={now}
          career={career}
          onAcquireLegend={onAcquireLegend}
          squad={squad}
          squadSize={squadSize}
          onSell={onSell}
          playMode={playMode}
        />
      )}
      {activeSub === "scout" && (
        <MarketScoutView
          scoutFinds={scoutFinds}
          budget={budget}
          onBuyScoutFind={onBuyScoutFind}
          onScoutSearch={onScoutSearch}
          onHireMarketScout={onHireMarketScout}
          onHireScoutCard={onHireScoutCard}
          career={career}
        />
      )}
    </div>
  );
}

function MarketTradeView({ list, budget, onBid, marketOpen, now, career, onAcquireLegend, squad, squadSize, onSell, playMode }) {
  const [legendExpanded, setLegendExpanded] = useState(false);
  const uTeam = career?.teams?.find((t) => t.id === career.userTeamId);
  const inMaster = canBidForLegend(uTeam?.division ?? 1);
  const userRank = inMaster ? standingsForDivision(career, 0).findIndex((s) => s.team.id === career.userTeamId) + 1 : null;
  const teamValue = career ? computeTeamFinances(career).teamValue : 0;
  const meetsValue = teamValue >= LEGEND_ACQUIRE_MIN_TEAM_VALUE;
  const canBidLegend = inMaster && meetsValue;
  const leagueLegends = career?.legendLeagueId
    ? LEGEND_PLAYERS.filter((l) => l.leagueId === career.legendLeagueId)
    : [];
  const sortedLegends = [...leagueLegends].sort((a, b) => b.rating - a.rating);
  const LEGEND_PREVIEW = 4;
  const visibleLegends = legendExpanded ? sortedLegends : sortedLegends.slice(0, LEGEND_PREVIEW);
  const sellable = [...squad].sort((a, b) => b.rating - a.rating);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {leagueLegends.length > 0 && (
        <Panel style={{ border: `1px solid ${C.gold}` }}>
          <SectionLabel style={{ color: C.gold }} sub={`${sortedLegends.length} คน · ตัวเดียวต่อเซิร์ฟเวอร์`}>⭐ ซูเปอร์สตาร์</SectionLabel>
          <div style={{ fontSize: 10.5, color: C.textDim, marginBottom: 8, fontFamily: MONO_FONT }}>
            {!inMaster
              ? "ต้องอยู่ Master League"
              : !meetsValue
                ? `มูลค่า ${formatMoney(teamValue)} · ต้อง ≥ ${formatMoney(LEGEND_ACQUIRE_MIN_TEAM_VALUE)}`
                : `Master #${userRank} · มูลค่า ${formatMoney(teamValue)} · คว้าได้`}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {visibleLegends.map((def) => {
              const player = career.players.find((p) => p.legendId === def.legendId);
              const ownerTeam = career.teams.find((t) => t.id === player?.teamId);
              const owned = player?.teamId === career.userTeamId;
              const canBuy = canBidLegend && budget >= def.acquireCost && player && !owned;
              return (
                <div key={def.legendId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: `1px solid ${C.steel}` }}>
                  <RatingBadge value={def.rating} />
                  <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 5, overflow: "hidden" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{def.name}</span>
                    <span style={{ fontSize: 9, color: POS_COLOR[def.position], flexShrink: 0 }}>{POS_TH[def.position]}</span>
                    <span style={{ fontSize: 10, color: C.textDim, fontFamily: MONO_FONT, flexShrink: 0 }}>{formatMoney(def.acquireCost)}</span>
                    <span style={{ fontSize: 9.5, color: C.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ownerTeam?.short || "?"}</span>
                  </div>
                  {owned ? (
                    <span style={{ fontSize: 9, color: C.good, flexShrink: 0 }}>✓</span>
                  ) : (
                    <button
                      disabled={!canBuy}
                      onClick={() => onAcquireLegend(def.legendId)}
                      style={{ ...btnStyle(canBuy ? C.gold : "#2b332f", canBuy ? "#0b2318" : C.textDim), width: "auto", padding: "5px 10px", fontSize: 10, flexShrink: 0 }}
                    >คว้า</button>
                  )}
                </div>
              );
            })}
          </div>
          {sortedLegends.length > LEGEND_PREVIEW && (
            <button type="button" onClick={() => setLegendExpanded((v) => !v)} style={{
              marginTop: 6, width: "100%", padding: "6px 0", background: "transparent", border: "none",
              color: C.amber, fontSize: 10, cursor: "pointer", fontWeight: 600,
            }}>{legendExpanded ? "ย่อ ▲" : `ดูทั้งหมด (${sortedLegends.length}) ▼`}</button>
          )}
        </Panel>
      )}
      <Panel style={{ border: `1px solid ${marketOpen ? C.good : C.steel}` }}>
        <SectionLabel>สถานะตลาดซื้อขาย</SectionLabel>
        {marketOpen ? (
          <div style={{ fontSize: 13, color: C.good, fontWeight: 700 }}>
            {playMode === "sandbox"
              ? "🟢 เปิดตลอดเวลา — โหมดโลกจำลอง"
              : "🟢 เปิดอยู่ตอนนี้ — ประมูลได้ (12:00-14:00, 18:00-22:00)"}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: C.textDim }}>🔴 ปิดอยู่ · {nextMarketOpenLabel(new Date(now))}</div>
        )}
        <div style={{ fontSize: 11.5, color: C.textDim, marginTop: 6 }}>งบคงเหลือ: <span style={{ color: C.amber, fontFamily: MONO_FONT }}>{formatMoney(budget)}</span> — เสนอ "ค่าเหนื่อย" สูงกว่าชนะก่อน ถ้าเท่ากันตัดสินด้วย "ค่าตัว"</div>
      </Panel>
      {(() => {
        const hotCount = list.filter((l) => Math.max(0, Math.round((l.endsAt - now) / 1000)) <= 20).length;
        const sorted = [...list].sort((a, b) => (a.endsAt - now) - (b.endsAt - now));
        return (
          <>
            {list.length > 0 && (
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", borderRadius: 8, background: hotCount > 0 ? "rgba(193,68,14,.12)" : C.panel2,
                border: `1px solid ${hotCount > 0 ? C.crimson : C.steel}`, fontSize: 11.5,
              }}>
                <span style={{ fontWeight: 700, color: hotCount > 0 ? C.crimson : C.textDim }}>
                  {hotCount > 0 ? `🔥 ${hotCount} รายการใกล้ปิด!` : "📋 รายการประมูลวันนี้"}
                </span>
                <span style={{ color: C.textDim, fontFamily: MONO_FONT }}>{list.length} ทั้งหมด</span>
              </div>
            )}
            <div className="fc-auction-grid">
              {sorted.map((l) => <ListingCard key={l.listingId} l={l} budget={budget} onBid={onBid} marketOpen={marketOpen} now={now} />)}
            </div>
          </>
        );
      })()}
      <Panel accent={C.crimson}>
        <SectionLabel sub={`ต้องมีอย่างน้อย ${MIN_SELL_SQUAD} คนในทีม`}>💰 ขายนักเตะในทีม</SectionLabel>
        {squadSize <= MIN_SELL_SQUAD ? (
          <div style={{ fontSize: 12, color: C.textDim }}>ขายไม่ได้ — ทีมเหลือน้อยเกินไป</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sellable.filter((p) => !p.isLegend).map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.steel}` }}>
                <RatingBadge value={p.rating} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name} <span style={{ fontSize: 10, color: playerPosColor(p) }}>{playerPosTH(p)}</span></div>
                  <div style={{ fontSize: 11, color: C.textDim, fontFamily: MONO_FONT }}>มูลค่า ~{formatMoney(p.value)}</div>
                </div>
                <button type="button" onClick={() => onSell(p.id)} style={{ fontSize: 10, padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.crimson}`, background: "transparent", color: C.crimson, cursor: "pointer", fontWeight: 700 }}>ขาย</button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function MarketScoutView({ scoutFinds, budget, onBuyScoutFind, onScoutSearch, onHireMarketScout, onHireScoutCard, career }) {
  const hasScout = Boolean(career?.marketScout);
  const scout = career?.marketScout;
  const canSearchToday = hasScout && (career.scoutSearchDay || 0) < career.day;
  const maxFinds = scout ? 3 + scout.grade : 0;
  const scoutCards = (career?.staffCardBag || []).filter((c) => c.type === "SCOUT");

  return (
    <div className="fc-scout-split">
      <div className="fc-scout-side" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Panel style={{ border: `1px solid ${hasScout ? C.blue : C.steel}` }}>
          <SectionLabel sub="แยกจากแมวมองเยาวชนในอคาเดมี">แมวมองทีมชุดใหญ่</SectionLabel>
          {career.marketScout ? (
            <div>
              <div style={{ fontSize: 12.5, fontFamily: MONO_FONT, color: C.textDim }}>{career.marketScout.name} · เกรด {career.marketScout.grade}/5 · ค่าเหนื่อย {formatMoney(career.marketScout.weeklyWage)}/วัน</div>
              {isStaffRoleLocked(career.marketScout, career.season) && (
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>🔒 เปลี่ยนแมวมองคนนี้ได้ตอนขึ้นฤดูกาลหน้า</div>
              )}
            </div>
          ) : career.marketScoutOffer ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{career.marketScoutOffer.name} (เกรด {career.marketScoutOffer.grade}/5)</div>
              <div style={{ fontSize: 11, color: C.textDim, fontFamily: MONO_FONT, margin: "4px 0 10px" }}>ค่าแรกเข้า {formatMoney(career.marketScoutOffer.signingCost)} · ค่าเหนื่อย {formatMoney(career.marketScoutOffer.weeklyWage)}/วัน</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={onHireMarketScout} style={{ ...btnStyle(C.good, "#08150e"), flex: 1 }}>จ้าง</button>
              </div>
            </div>
          ) : <div style={{ fontSize: 12, color: C.textDim }}>รอผู้สมัครใหม่สัปดาห์หน้า</div>}
        </Panel>

        <StaffCardPickerRow cards={scoutCards} title="การ์ดแมวมองที่สุ่มได้" career={career} onHire={onHireScoutCard} />
      </div>

      <Panel style={{ border: `1px solid ${hasScout ? C.blue : C.steel}` }}>
        <SectionLabel sub={hasScout ? `${scout.name} · เกรด ${scout.grade}/5 · สูงสุด ${maxFinds} รายการ` : "จ้างแมวมองด้านบนก่อน"}>
          🔭 รายงานจากแมวมอง
        </SectionLabel>
        {!hasScout ? (
          <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.65 }}>
            จ้าง <b style={{ color: C.blue }}>แมวมองทีมชุดใหญ่</b> แล้วระบบจะค้นหานักเตะราคาถูกมาให้ที่นี่
            <br />ตัวไม่เก่งมาก แต่พอใช้เติมสควอด / สำรองได้
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11.5, color: C.textDim, marginBottom: 10, lineHeight: 1.6 }}>
              ซื้อตรงราคาคงที่ — ไม่ต้องประมูล · รายการหมดอายุใน 8 วัน · แมวมองค้นหาให้อัตโนมัติทุกวัน
            </div>
            <button
              type="button"
              disabled={!canSearchToday || scoutFinds.length >= maxFinds}
              onClick={onScoutSearch}
              style={{
                ...btnStyle(canSearchToday && scoutFinds.length < maxFinds ? C.blue : "#2b332f", canSearchToday && scoutFinds.length < maxFinds ? "#fff" : C.textDim),
                width: "auto", padding: "8px 14px", fontSize: 11, marginBottom: 12,
                cursor: canSearchToday && scoutFinds.length < maxFinds ? "pointer" : "not-allowed",
              }}
            >
              {canSearchToday ? "🔍 สั่งค้นหาเพิ่มวันนี้" : "✓ ค้นหาวันนี้แล้ว"}
            </button>
            {scoutFinds.length === 0 ? (
              <div style={{ fontSize: 12, color: C.textDim }}>ยังไม่มีรายการ — รอแมวมองรายงานหรือกดค้นหา</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {scoutFinds.map((f) => (
                  <ScoutFindCard key={f.findId} f={f} budget={budget} currentDay={career.day} onBuy={onBuyScoutFind} />
                ))}
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
function ScoutFindCard({ f, budget, currentDay, onBuy }) {
  const [showDetail, setShowDetail] = useState(false);
  const daysLeft = f.expiresDay - currentDay;
  const canBuy = budget >= f.buyFee;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.steel}` }}>
      <RatingBadge value={f.rating} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>
          <span onClick={() => setShowDetail(true)} role="button" style={{ cursor: "pointer", textDecoration: "underline dotted" }}>{f.name}</span> <span style={{ fontSize: 10, color: playerPosColor(f) }}>{playerPosTH(f)}</span>
        </div>
        {showDetail && <PlayerDetailModal player={f} onClose={() => setShowDetail(false)} />}
        <div style={{ fontSize: 11, color: C.textDim, fontFamily: MONO_FONT, marginTop: 2 }}>
          อายุ {f.age} · ศักยภาพ {bandOf(f.potential)} · {f.sourceNote}
        </div>
        <div style={{ fontSize: 10.5, color: C.blue, marginTop: 2 }}>
          รายงานโดย {f.scoutName} (เกรด {f.scoutGrade}/5) · เหลือ {daysLeft} วัน
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, fontFamily: MONO_FONT, color: C.amber }}>{formatMoney(f.buyFee)}</div>
        <div style={{ fontSize: 10, color: C.textDim, fontFamily: MONO_FONT }}>{formatMoney(f.buyWage)}/วัน</div>
        <button
          type="button"
          disabled={!canBuy}
          onClick={() => onBuy(f.findId)}
          style={{
            marginTop: 4, fontSize: 10, padding: "4px 10px", borderRadius: 6, border: "none", fontWeight: 700,
            background: canBuy ? C.good : "#2b332f",
            color: canBuy ? "#08150e" : C.textDim,
            cursor: canBuy ? "pointer" : "not-allowed",
          }}
        >
          ซื้อเลย
        </button>
      </div>
    </div>
  );
}
function ListingCard({ l, budget, onBid, marketOpen, now }) {
  const [showDetail, setShowDetail] = useState(false);
  const secsLeft = Math.max(0, Math.round((l.endsAt - now) / 1000));
  const wageStep = Math.max(100, Math.round((l.topBid.wage * 0.05) / 100) * 100);
  const feeStep = Math.max(1000, Math.round((l.topBid.fee * 0.05) / 1000) * 1000);
  const [wageAdd, setWageAdd] = useState(wageStep);
  const [feeAdd, setFeeAdd] = useState(feeStep);
  const myWage = l.topBid.wage + wageAdd;
  const myFee = l.topBid.fee + feeAdd;
  const valid = (wageAdd > 0 || feeAdd > 0) && (myWage > l.topBid.wage || (myWage === l.topBid.wage && myFee > l.topBid.fee)) && myFee <= budget;
  const urgent = secsLeft <= 20;
  const soon = secsLeft <= 60 && !urgent;
  const clockColor = urgent ? C.crimson : soon ? C.amber : C.good;
  const iLead = l.topBid.isUser;
  return (
    <Panel
      className={urgent ? "fc-auction-urgent" : iLead ? "fc-auction-leading" : undefined}
      style={{ border: `2px solid ${iLead ? C.good : urgent ? C.crimson : C.steel}`, position: "relative", overflow: "hidden" }}
    >
      <div style={{
        position: "absolute", top: 0, right: 0, padding: "3px 10px 3px 12px", borderBottomLeftRadius: 10,
        background: clockColor, color: "#08150e", fontFamily: MONO_FONT, fontSize: 12, fontWeight: 800,
      }}>
        ⏱ {secsLeft}s
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingRight: 54 }}>
        <RatingBadge value={l.rating} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>
            <span onClick={() => setShowDetail(true)} role="button" style={{ cursor: "pointer", textDecoration: "underline dotted" }}>{l.name}</span> <span style={{ fontSize: 10, color: playerPosColor(l) }}>{playerPosTH(l)}</span>
          </div>
          <div style={{ fontSize: 10.5, color: C.textDim, fontFamily: MONO_FONT }}>อายุ {l.age} · ศักยภาพ {bandOf(l.potential)} · จาก {l.sourceTeamName}</div>
          {showDetail && <PlayerDetailModal player={l} onClose={() => setShowDetail(false)} />}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8, fontSize: 9.5, fontFamily: MONO_FONT }}>
        <span style={{ flex: 1, textAlign: "center", padding: "3px 0", borderRadius: 5, background: C.panel2, color: GROUP_COLOR.technical }}>TEC {Math.round(attrGroupAvg(l, "technical"))}</span>
        <span style={{ flex: 1, textAlign: "center", padding: "3px 0", borderRadius: 5, background: C.panel2, color: GROUP_COLOR.mental }}>MEN {Math.round(attrGroupAvg(l, "mental"))}</span>
        <span style={{ flex: 1, textAlign: "center", padding: "3px 0", borderRadius: 5, background: C.panel2, color: GROUP_COLOR.physical }}>PHY {Math.round(attrGroupAvg(l, "physical"))}</span>
      </div>
      <div style={{
        marginTop: 10, padding: "8px 10px", borderRadius: 8, fontSize: 12, fontFamily: MONO_FONT,
        background: iLead ? "rgba(111,174,90,.14)" : "rgba(224,164,88,.10)",
        border: `1px solid ${iLead ? C.good : C.amber}`,
      }}>
        <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
          {iLead ? "🏆 คุณนำอยู่" : "ผู้เสนอสูงสุด"}
        </div>
        <b style={{ color: iLead ? C.good : C.amber, fontSize: 13 }}>{l.topBid.bidder}</b>
        <div style={{ color: C.textDim, marginTop: 2 }}>ค่าเหนื่อย {formatMoney(l.topBid.wage)}/วัน · ค่าตัว {formatMoney(l.topBid.fee)}</div>
      </div>
      {l.bidHistory?.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 2, maxHeight: 54, overflowY: "auto" }}>
          {l.bidHistory.slice(0, 3).map((b, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: C.textDim, fontFamily: MONO_FONT }}>
              <span>{b.bidder}</span><span>{formatMoney(b.fee)}</span>
            </div>
          ))}
        </div>
      )}
      {marketOpen ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {[[0.05, "+5%"], [0.15, "+15%"], [0.3, "+30%"]].map(([pct, label]) => (
              <button
                key={pct}
                type="button"
                onClick={() => {
                  setWageAdd(Math.max(wageStep, Math.round((l.topBid.wage * pct) / 100) * 100));
                  setFeeAdd(Math.max(feeStep, Math.round((l.topBid.fee * pct) / 1000) * 1000));
                }}
                style={{ flex: 1, background: C.panel2, border: `1px solid ${C.steel}`, borderRadius: 6, color: C.amber, fontSize: 10.5, fontWeight: 700, padding: "5px 0", cursor: "pointer" }}
              >⚡ {label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <StepperField label="เพิ่มค่าเหนื่อย" value={wageAdd} step={wageStep} onChange={setWageAdd} />
            <StepperField label="เพิ่มค่าตัว" value={feeAdd} step={feeStep} onChange={setFeeAdd} />
          </div>
          <div style={{ fontSize: 11, color: C.textDim, marginBottom: 6, fontFamily: MONO_FONT }}>ข้อเสนอของคุณ: ค่าเหนื่อย {formatMoney(myWage)} · ค่าตัว {formatMoney(myFee)}</div>
          <button
            disabled={!valid}
            onClick={() => { onBid(l.listingId, myWage, myFee); setWageAdd(wageStep); setFeeAdd(feeStep); }}
            style={{ ...btnStyle(valid ? C.crimson : "#2b332f", valid ? "#fff" : C.textDim), cursor: valid ? "pointer" : "not-allowed", fontWeight: 800, fontSize: 13, letterSpacing: 0.5 }}
          >🔨 ยื่นประมูลแข่ง</button>
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
// 428 หน่วย clock × ~420ms/tick ที่ความเร็ว 1x ≈ 3 นาทีจริงต่อครึ่ง (เต็มเกม ~6 นาที)
const HALF_SECONDS = 428;

const FM_LIVE = {
  bg: "#0c0a18", panel: "#13112a", panel2: "#1a1838", bar: "#252245",
  accent: "#6b4fd4", text: "#eceaf5", dim: "#8d88ad", green: "#3dba6a", red: "#e05a4a",
};
const MENTALITIES = MATCH_MENTALITIES;
const INSTRUCTIONS = MATCH_INSTRUCTIONS;

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
  const slots = FORMATIONS[resolveFormation(formation)].slots;
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
      <DragScroll wheelOnly style={{ display: "flex", gap: 6, paddingBottom: 2 }}>
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
      </DragScroll>
    </div>
  );
}

function LivePlanEditor({ formation, mentality, instructions, onFormation, onMentality, onToggleInstruction }) {
  return (
    <>
      <div style={{ fontSize: 11, color: FM_LIVE.dim, marginBottom: 6 }}>รูปแบบการเล่น</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {FORMATION_KEYS.map((f) => (
          <button key={f} type="button" onClick={() => onFormation(f)} style={{
            padding: "7px 12px", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: 12,
            border: `1px solid ${f === formation ? FM_LIVE.accent : FM_LIVE.bar}`,
            background: f === formation ? FM_LIVE.accent : "transparent", color: FM_LIVE.text,
          }}>{f}</button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: FM_LIVE.dim, marginBottom: 6 }}>แนวทางเกม</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
        {MENTALITIES.map((m) => (
          <button key={m.id} type="button" onClick={() => onMentality(m.id)} style={{
            padding: "6px 10px", borderRadius: 7, cursor: "pointer", fontSize: 11,
            border: `1px solid ${mentality === m.id ? C.amber : FM_LIVE.bar}`,
            background: mentality === m.id ? "rgba(224,164,88,.2)" : "transparent", color: FM_LIVE.text,
          }}>{m.label}</button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: FM_LIVE.dim, marginBottom: 6 }}>คำสั่ง (สูงสุด 3)</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {INSTRUCTIONS.map((ins) => {
          const on = instructions.includes(ins.id);
          const full = instructions.length >= 3 && !on;
          return (
            <button key={ins.id} type="button" disabled={full} onClick={() => onToggleInstruction(ins.id)} title={ins.desc} style={{
              padding: "5px 9px", borderRadius: 6, cursor: full ? "not-allowed" : "pointer", fontSize: 10,
              border: `1px solid ${on ? FM_LIVE.green : FM_LIVE.bar}`,
              background: on ? "rgba(61,186,106,.15)" : "transparent",
              color: full ? FM_LIVE.dim : FM_LIVE.text, opacity: full ? 0.5 : 1,
            }}>{ins.label}</button>
          );
        })}
      </div>
    </>
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
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: FM_LIVE.dim, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <LivePlanEditor
          formation={formation}
          mentality={mentality}
          instructions={instructions}
          onFormation={onFormation}
          onMentality={onMentality}
          onToggleInstruction={onToggleInstruction}
        />
      </div>
    </div>
  );
}

function HalftimeOverlay({ scoreLabel, formation, mentality, instructions, onFormation, onMentality, onToggleInstruction, teamTalkHalf, onSetTeamTalkHalf, onContinue, myXI, mySquad, bench, onSub, subsUsed }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(4,10,7,.94)", zIndex: 110,
      display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: 16,
    }}>
      <div style={{ width: "100%", maxWidth: 520, marginTop: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 22, color: C.amber, letterSpacing: 2 }}>⏸ พักครึ่ง</div>
          <div style={{ fontFamily: MONO_FONT, fontSize: 28, fontWeight: 800, color: C.chalk, marginTop: 8 }}>{scoreLabel}</div>
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 8 }}>ปรับแผนได้ครั้งเดียวตอนนี้ · เปลี่ยนตัวได้ตลอดเกม</div>
        </div>
        <Panel accent={C.amber} style={{ marginBottom: 12 }}>
          <SectionLabel>ปรับแผน (ครึ่งหลัง)</SectionLabel>
          <LivePlanEditor
            formation={formation}
            mentality={mentality}
            instructions={instructions}
            onFormation={onFormation}
            onMentality={onMentality}
            onToggleInstruction={onToggleInstruction}
          />
        </Panel>
        <Panel style={{ marginBottom: 12 }}>
          <SectionLabel sub="เลือก 1 อย่าง — มีผลครึ่งหลัง">คุยนักเตะ (Team Talk)</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {TEAM_TALK_OPTIONS.map((tt) => (
              <button key={tt.id} type="button" onClick={() => onSetTeamTalkHalf(teamTalkHalf === tt.id ? null : tt.id)} style={{
                padding: "6px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${teamTalkHalf === tt.id ? C.gold : C.steel}`,
                background: teamTalkHalf === tt.id ? "rgba(212,175,55,.12)" : C.panel2,
                color: teamTalkHalf === tt.id ? C.gold : C.textDim,
              }}>{tt.label}</button>
            ))}
          </div>
        </Panel>
        <Panel style={{ marginBottom: 12 }}>
          <SectionLabel sub={`ใช้ไป ${subsUsed}/5 · เปลี่ยนได้ตลอดแมตช์`}>เปลี่ยนตัว</SectionLabel>
          <SubPicker myXI={myXI} mySquad={mySquad} bench={bench} onSub={onSub} disabled={subsUsed >= MAX_MATCH_SUBS} />
        </Panel>
        <button type="button" onClick={onContinue} style={{ ...btnStyle(C.good, "#08150e"), width: "100%", fontSize: 16, padding: "14px 0" }}>
          ▶ เริ่มครึ่งหลัง
        </button>
      </div>
    </div>
  );
}

/** หน้าต่างรายงานผลหลังจบเกม — ใช้ได้ทั้งซานด์บ็อกซ์และออนไลน์ ผู้เล่นต้องกดปิดเอง ไม่ปิดอัตโนมัติ */
function MatchReportModal({ homeTeam, awayTeam, homeGoals, awayGoals, scorers = [], starMan, stats, possHomePct, onClose }) {
  const homeScorers = scorers.filter((s) => s.team === "home" || s.side === "home");
  const awayScorers = scorers.filter((s) => s.team === "away" || s.side === "away");
  // ใช้ portal ต่อกับ document.body — กันบั๊กเดียวกับป๊อปอัพโปรไฟล์นักเตะ (position:fixed ถูกดักด้วย backdrop-filter ของ .fc-panel บรรพบุรุษ)
  return createPortal(
    <div style={{
      position: "fixed", inset: 0, background: "#04100a", zIndex: 210,
      display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: 16,
    }}>
      <div style={{ width: "100%", maxWidth: 480, marginTop: 32, marginBottom: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 20, color: C.gold, letterSpacing: 2 }}>⏹ จบเกม — รายงานผล</div>
        </div>
        <Panel accent={C.gold} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <ClubBadge team={homeTeam} size={48} />
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>{homeTeam?.short || homeTeam?.name}</div>
            </div>
            <div style={{ fontFamily: MONO_FONT, fontSize: 30, fontWeight: 800, padding: "0 12px" }}>{homeGoals} - {awayGoals}</div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <ClubBadge team={awayTeam} size={48} />
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>{awayTeam?.short || awayTeam?.name}</div>
            </div>
          </div>
        </Panel>
        {scorers.length > 0 && (
          <Panel style={{ marginBottom: 12 }}>
            <SectionLabel>⚽ ผู้ทำประตู</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {homeScorers.map((s, i) => (
                  <div key={i} style={{ fontSize: 11.5, fontFamily: MONO_FONT }}>{s.player || s.name || homeTeam?.short} {s.minute}'</div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, textAlign: "right" }}>
                {awayScorers.map((s, i) => (
                  <div key={i} style={{ fontSize: 11.5, fontFamily: MONO_FONT }}>{s.player || s.name || awayTeam?.short} {s.minute}'</div>
                ))}
              </div>
            </div>
          </Panel>
        )}
        {starMan && (
          <Panel style={{ marginBottom: 12, border: `1px solid ${C.gold}` }}>
            <SectionLabel style={{ color: C.gold }}>⭐ ผู้เล่นยอดเยี่ยม</SectionLabel>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{starMan.name} <span style={{ color: C.amber, fontFamily: MONO_FONT }}>{Number(starMan.rating).toFixed(1)}</span></div>
          </Panel>
        )}
        {stats && (
          <Panel style={{ marginBottom: 12 }}>
            <SectionLabel>📊 สถิติการแข่งขัน</SectionLabel>
            {possHomePct != null && <StatRow label="ครองบอล" home={possHomePct} away={100 - possHomePct} />}
            <StatRow label="ยิงประตู" home={stats.shotsH} away={stats.shotsA} />
            <StatRow label="ยิงตรงกรอบ" home={stats.sotH} away={stats.sotA} />
            <StatRow label="เตะมุม" home={stats.cornersH} away={stats.cornersA} />
            <StatRow label="ฟาวล์" home={stats.foulsH} away={stats.foulsA} />
            <StatRow label="ใบเหลือง/แดง" home={stats.cardsH} away={stats.cardsA} />
          </Panel>
        )}
        <button type="button" onClick={onClose} style={{ ...btnStyle(C.good, "#08150e"), width: "100%", fontSize: 14, fontWeight: 800, padding: "12px 0" }}>
          ปิดหน้าต่าง
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** หน้ารายชื่อผู้เล่นก่อนเขี่ยเปิดเกม — โชว์ทีละฝั่ง เรียงตามฟอร์เมชัน มีดาว/เรตติ้ง */
function LineupScreen({ team, squad, xi, onSkip }) {
  const players = xi.map((id) => squad.find((sp) => sp.id === id)).filter(Boolean);
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 16,
      background: "linear-gradient(160deg,#0a1c12,#05100a)",
    }}>
      <ClubBadge team={team} size={56} />
      <div style={{ fontFamily: DISPLAY_FONT, fontSize: 20, fontWeight: 800, color: "#fff", margin: "10px 0 2px", textAlign: "center" }}>
        {team.name || team.short}
      </div>
      <div style={{ fontSize: 11, color: C.textDim, marginBottom: 14 }}>ตัวจริง 11 คน</div>
      <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 6, maxHeight: "52vh", overflowY: "auto" }}>
        {players.map((p, i) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,.05)" }}>
            <span style={{ width: 20, textAlign: "center", fontFamily: MONO_FONT, fontSize: 11, color: C.textDim }}>{i + 1}</span>
            <span style={{ flex: 1, fontSize: 13, color: "#fff" }}>{p.name}</span>
            <span style={{ fontSize: 10, color: C.textDim, width: 34, textAlign: "center" }}>{playerPosCode(p)}</span>
            <span style={{ fontSize: 11, color: C.gold, letterSpacing: 1 }}>{"★".repeat(starsFromRating(p.rating))}</span>
          </div>
        ))}
      </div>
      <button type="button" onClick={onSkip} style={{ marginTop: 18, ...btnStyle(C.steel, C.chalk), padding: "9px 22px" }}>ข้าม ▶</button>
    </div>
  );
}

/** หน้ารอนกหวีดเขี่ยกลาง — ข้ามไม่ได้ */
function KickoffWhistleBanner() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(4,10,7,.55)", pointerEvents: "none",
    }}>
      <div style={{
        fontFamily: DISPLAY_FONT, fontSize: 16, fontWeight: 700, color: "#fff",
        padding: "10px 20px", borderRadius: 10, background: "rgba(10,10,14,.85)", border: `1px solid ${C.gold}`,
      }}>
        🟨 ผู้ตัดสินเป่านกหวีด — เตรียมเขี่ยเปิดเกม!
      </div>
    </div>
  );
}

/** กล่องฟอร์เมชันจิ๋วแบบ FM — จุดผู้เล่นวางตามตำแหน่งจริงในสนามย่อ ใช้โชว์ทีมเราคู่กับคู่แข่งระหว่างแมทสด
 *  ขนาดคุมด้วย maxWidth ตายตัว กันโดนยืดเต็มคอลัมน์ตอนวางเป็น 1 ใน 4 ช่องแคบ */
function FormationMiniBoard({ team, formationKey, xi, squad, ratings }) {
  const formation = FORMATIONS[resolveFormation(formationKey)];
  const shirt = teamShirtColor(team);
  const trim = team?.secondaryColor || "#f2f0e6";
  return (
    <Panel style={{ padding: 6, maxWidth: 190, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 9.5, fontWeight: 800, color: C.chalk }}>{team?.short || team?.name}</span>
        <span style={{ fontSize: 8, color: C.textDim, fontFamily: MONO_FONT }}>{formation.label}</span>
      </div>
      <div style={{ position: "relative", width: "100%", aspectRatio: "0.78", borderRadius: 6, background: "linear-gradient(180deg, #163a24, #0e2718)", border: `1px solid ${C.steel}`, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: "rgba(255,255,255,.14)" }} />
        <div style={{
          position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
          width: "34%", aspectRatio: "1", borderRadius: "50%", border: "1px solid rgba(255,255,255,.14)",
        }} />
        {formation.slots.map((slot, i) => {
          const pid = xi[i];
          const p = squad.find((sp) => sp.id === pid);
          const rating = ratings?.[pid];
          return (
            <div key={i} style={{ position: "absolute", left: `${slot.x}%`, top: `${slot.y}%`, transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: 15, height: 15, borderRadius: "50%", background: shirt, border: `1px solid ${trim}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6.5, fontWeight: 800, color: "#08150e",
                fontFamily: MONO_FONT, boxShadow: "0 1px 2px rgba(0,0,0,.4)",
              }}>
                {rating != null ? Math.round(rating * 10) / 10 : ""}
              </div>
              <div style={{ fontSize: 6.5, color: C.chalk, marginTop: 1, maxWidth: 34, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p ? (p.name.split(" ")[1] || p.name) : "?"}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function LiveMatchModal({ career, liveMatch, userAutoMode, onFinish, suggestTacticSwitch, fullOnlineMode = false }) {
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
  const [speed, setSpeed] = useState(fullOnlineMode ? 1 : 1);
  const effectiveSpeed = fullOnlineMode ? 1 : speed;
  // ก่อนเขี่ยเปิดเกม: รายชื่อผู้เล่น(บ้าน) → รายชื่อผู้เล่น(เยือน) → เดินออกอุโมง → รอนกหวีด → เล่นจริง
  // เกมค้าง (paused=true) ตลอดจนกว่านกหวีดจะจบ ใช้ paused ตัวเดิมที่คุมลูป sim อยู่แล้ว ไม่ต้องเพิ่มธงใหม่
  const [preMatchPhase, setPreMatchPhase] = useState("lineup-home");
  const [walkoutT, setWalkoutT] = useState(0);
  const [paused, setPaused] = useState(true);
  // ฉากเปลี่ยนตัว — { outId, inId, side, outSlotIdx, outNum, inNum, outName, inName, phase: "board"|"walk", t }
  // เกมหยุดสนิทตลอดฉาก (ตั้ง paused=true ตอนเริ่ม) จนกว่าตัวใหม่จะเดินถึงตำแหน่ง
  const [subScene, setSubScene] = useState(null);
  const [homeFormation, setHomeFormation] = useState(liveMatch.homeFormation);
  const [awayFormation, setAwayFormation] = useState(liveMatch.awayFormation);
  const [homeXI, setHomeXI] = useState(liveMatch.homeXI);
  const [awayXI, setAwayXI] = useState(liveMatch.awayXI);
  const [subsUsed, setSubsUsed] = useState(0);
  const [showSubs, setShowSubs] = useState(true);
  const [halftimeOpen, setHalftimeOpen] = useState(false);
  const [teamTalkHalf, setTeamTalkHalf] = useState(null);
  const prep = career.matchPrep || defaultMatchPrep();
  const [myMentality, setMyMentality] = useState(prep.mentality || "balanced");
  const [myInstructions, setMyInstructions] = useState(() => [...(prep.instructions || [])]);
  const [playerRatings, setPlayerRatings] = useState(() => ({
  ...initMatchRatings(liveMatch.homeXI, homeSquad),
  ...initMatchRatings(liveMatch.awayXI, awaySquad),
  }));
  const [dugoutTip, setDugoutTip] = useState(null);
  const [goalLog, setGoalLog] = useState([]);
  const [stats, setStats] = useState({ shotsH: 0, shotsA: 0, sotH: 0, sotA: 0, cornersH: 0, cornersA: 0, foulsH: 0, foulsA: 0, cardsH: 0, cardsA: 0 });
  const [possession, setPossession] = useState({ homeTicks: 1, awayTicks: 1 });
  const [momentum, setMomentum] = useState([]);
  const [highlight, setHighlight] = useState(null); // { team, kind, minute }
  // ระบบรีเพลย์แยกถูกถอดออกแล้ว — ทุกช็อตเล่นสดต่อเนื่องใน ambient sim (สโลว์โมชั่นในตัว)
  const [goalFlash, setGoalFlash] = useState(null);
  const [refereeCard, setRefereeCard] = useState(null); // { team, kind: "yellow"|"red", player, minute }
  const [ended, setEnded] = useState(false);
  const [matchReport, setMatchReport] = useState(null); // { homeGoals, awayGoals, scorers, starMan } — โชว์เป็นหน้าต่างเด้งหลังจบเกม ต้องกดปิดเอง
  const pendingFinishRef = useRef(null);
  const [pressure, setPressure] = useState(0);
  const [livePossSide, setLivePossSide] = useState("home");
  const [possBallX, setPossBallX] = useState(0.5);
  const [matchStatus, setMatchStatus] = useState("กำลังเริ่มเกม...");
  const [commentaryFeed, setCommentaryFeed] = useState([{
    id: 1, minute: 0, text: "⚽ เริ่มเกม — แมตช์จำลองอัตโนมัติจาก engine",
  }]);
  const [animTick, setAnimTick] = useState(0);
  const [crowdMuted, setCrowdMutedState] = useState(() => isCrowdMuted());
  const [crowdNeedsUnlock, setCrowdNeedsUnlock] = useState(false);
  const [crowdUnlockTick, setCrowdUnlockTick] = useState(0);
  const [ballSim, setBallSim] = useState(() => ({
    px: 42, py: 50, fromPx: 42, fromPy: 50, toPx: 48, toPy: 50,
    t: 0, side: "home", carrier: 6, phase: "dribble",
  }));
  const playerMotionRef = useRef({});
  const ambientRef = useRef(null);
  const livePossSideRef = useRef("home");

  const tickRef = useRef(0);
  const gameStateRef = useRef({ pressure: 0, homePressure: 0.5 });
  const homeFormationRef = useRef(homeFormation);
  const awayFormationRef = useRef(awayFormation);
  homeFormationRef.current = homeFormation;
  awayFormationRef.current = awayFormation;
  const finishedRef = useRef(false);
  const lastAiCheckRef = useRef(0);
  const bucketRef = useRef({ home: 0, away: 0 });
  const lastShotMetaRef = useRef(null); // { scorerName, teamShort, shotSide } ของช็อตล่าสุด — ใช้ตอนบอลถึงตาข่ายค่อยโชว์ GOAL flash
  const ballSimRef = useRef(ballSim);
  ballSimRef.current = ballSim;
  const possBallXRef = useRef(0.5);
  const cardsRef = useRef(new Map()); // playerId -> จำนวนใบเหลืองสะสม (สอง = แดง)
  const redCardIdsRef = useRef(new Set()); // playerId ที่โดนแดงในแมตช์นี้ (ตรงๆ หรือ 2 เหลือง) — ใช้ส่งต่อระบบแบนสะสม
  const virtualBallPxRef = useRef(50);
  const commentaryIdRef = useRef(1);
  const gameMinRef = useRef(0);
  const xgRef = useRef({ xgHome: 1, xgAway: 1 });
  const lastAttackingHomeRef = useRef(true);

  function toggleCrowdMute() {
    setCrowdMutedState((m) => {
      const next = !m;
      setCrowdMuted(next);
      if (!next) setCrowdNeedsUnlock(false);
      return next;
    });
  }

  async function unlockCrowdAudio() {
    setCrowdMutedState(false);
    setCrowdMuted(false);
    setCrowdNeedsUnlock(false);
    setCrowdUnlockTick((t) => t + 1);
  }

  useStadiumCrowd({
    active: !ended,
    paused: paused || halftimeOpen,
    ended,
    half,
    pressure,
    ballPx: ballSim.px,
    highlight,
    goalFlash,
    highlightSeq: null,
    fanBase: career.fanBase || 2500,
    muted: crowdMuted,
    onNeedsUnlock: setCrowdNeedsUnlock,
    unlockTick: crowdUnlockTick,
    refereeCard,
    subTick: subsUsed,
  });

  // หน้ารายชื่อผู้เล่น ~5 วิ/ฝั่ง แล้วไปต่ออัตโนมัติ (กดข้ามได้ผ่าน skipPreMatch)
  useEffect(() => {
    if (preMatchPhase !== "lineup-home" && preMatchPhase !== "lineup-away") return undefined;
    const t = setTimeout(() => {
      setPreMatchPhase((p) => (p === "lineup-home" ? "lineup-away" : "walkout"));
    }, 5000);
    return () => clearTimeout(t);
  }, [preMatchPhase]);

  // นักเตะเดินออกจากอุโมงเข้าตำแหน่งฟอร์เมชัน ~3.6 วิ (กดข้ามได้)
  useEffect(() => {
    if (preMatchPhase !== "walkout") return undefined;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 3600);
      setWalkoutT(t);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setPreMatchPhase("whistle");
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [preMatchPhase]);

  // ผู้ตัดสินเป่านกหวีดเขี่ยกลาง — ข้ามไม่ได้ ปล่อยเกมเดินหลังเป่าเสร็จ
  useEffect(() => {
    if (preMatchPhase !== "whistle") return undefined;
    const t1 = setTimeout(() => playWhistle(), 250);
    const t2 = setTimeout(() => { setPreMatchPhase(null); setPaused(false); }, 950);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [preMatchPhase]);

  // กดข้าม — ตัดตรงไปจุดยืนรอเขี่ยกลาง (ยังต้องรอนกหวีดเสมอ ข้ามนกหวีดไม่ได้)
  function skipPreMatch() {
    if (preMatchPhase && preMatchPhase !== "whistle") setPreMatchPhase("whistle");
  }

  // ฉากเปลี่ยนตัว — หน้าป้าย (~2 วิ) แล้วเดินสวนกันจริง (~2.2 วิ) หยุดเกมสนิทตลอด
  useEffect(() => {
    if (!subScene) return undefined;
    if (subScene.phase === "board") {
      const t = setTimeout(() => setSubScene((s) => (s ? { ...s, phase: "walk", t: 0 } : s)), 2000);
      return () => clearTimeout(t);
    }
    if (subScene.phase === "walk") {
      let raf;
      const start = performance.now();
      const tick = (now) => {
        const t = (now - start) / 1000;
        if (t >= 2.2) { finishSubScene(); return; }
        setSubScene((s) => (s ? { ...s, t } : s));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subScene?.phase]);

  function pushCommentary(text, minute) {
    commentaryIdRef.current += 1;
    setCommentaryFeed((f) => [{ id: commentaryIdRef.current, text, minute }, ...f].slice(0, 5));
    setMatchStatus(text);
  }

  const myXI = isUserHome ? homeXI : awayXI;
  const mySquad = isUserHome ? homeSquad : awaySquad;
  const namedBenchIds = (career.benchLineups?.[career.userTeamId] || []).filter((id) => mySquad.some((p) => p.id === id) && !myXI.includes(id));
  const bench = namedBenchIds.length
    ? namedBenchIds.map((id) => mySquad.find((p) => p.id === id)).filter((p) => p && p.injuryDays <= 0)
    : mySquad.filter((p) => !myXI.includes(p.id) && p.injuryDays <= 0);

  const myTeam = isUserHome ? homeTeam : awayTeam;
  const myFormation = isUserHome ? homeFormation : awayFormation;
  const oppFormation = isUserHome ? awayFormation : homeFormation;
  const oppSquadForMark = isUserHome ? awaySquad : homeSquad;
  const oppXIForMark = isUserHome ? awayXI : homeXI;
  const familiarityMult = familiarityMultiplier(
    career.tacticFamiliarity && career.tacticFamiliarity.formation === myFormation ? career.tacticFamiliarity.matches : 0
  );

  function setMyFormation(f) {
    const newXI = getBestXI(mySquad, f);
    if (isUserHome) { setHomeFormation(f); setHomeXI(newXI); }
    else { setAwayFormation(f); setAwayXI(newXI); }
    setEvents((e) => [`🔄 ปรับแผนเป็น ${f}`, ...e]);
  }

  function toggleInstruction(id) {
    setMyInstructions((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  const halfRef = useRef(half);
  const teamTalkHalfRef = useRef(teamTalkHalf);
  halfRef.current = half;
  teamTalkHalfRef.current = teamTalkHalf;

  function startSecondHalf() {
    setHalf(2);
    setClock(0);
    setHalftimeOpen(false);
    setPaused(false);
    const tt = teamTalkHalf ? TEAM_TALK_OPTIONS.find((t) => t.id === teamTalkHalf) : null;
    if (tt) {
      pushCommentary(`🗣️ คุยนักเตะครึ่งหลัง: ${tt.label}`, 45);
      setEvents((e) => [`🗣️ คุยนักเตะครึ่งหลัง: ${tt.label}`, ...e]);
    } else {
      pushCommentary("▶ เริ่มครึ่งหลัง", 45);
      setEvents((e) => [`▶ เริ่มครึ่งหลัง`, ...e]);
    }
  }

  function bumpRating(playerId, delta) {
    if (!playerId) return;
    setPlayerRatings((r) => ({ ...r, [playerId]: clamp((r[playerId] || 6.5) + delta, 5.5, 9.5) }));
  }

  function applyTacticMods(ctx, isUserCtx) {
    if (!isUserCtx) return applyOppositionMarkToContext(ctx, prep.markPlayerId, oppSquadForMark, oppXIForMark);
    const ment = MENTALITIES.find((m) => m.id === myMentality) || MENTALITIES[2];
    let atk = ctx.effAttack * ment.atk;
    let def = ctx.effDefense * ment.def;
    if (myInstructions.includes("more_direct")) atk *= 1.04;
    if (myInstructions.includes("shorter")) atk *= 1.02;
    if (myInstructions.includes("wider")) atk *= 1.02;
    if (myInstructions.includes("narrower")) def *= 1.02;
    const tempo = TEMPO_OPTIONS.find((t) => t.id === prep.tempo) || TEMPO_OPTIONS[1];
    atk *= tempo.atk; def *= tempo.def;
    const pressing = PRESSING_OPTIONS.find((t) => t.id === prep.pressing) || PRESSING_OPTIONS[1];
    atk *= pressing.atk; def *= pressing.def;
    const defLineOpt = DEF_LINE_OPTIONS.find((t) => t.id === prep.defLine) || DEF_LINE_OPTIONS[1];
    atk *= defLineOpt.atk; def *= defLineOpt.def;
    const creativeFreedomOpt = CREATIVE_FREEDOM_OPTIONS.find((t) => t.id === prep.creativeFreedom) || CREATIVE_FREEDOM_OPTIONS[1];
    atk *= creativeFreedomOpt.atk; def *= creativeFreedomOpt.def;
    const ownDefenders = mySquad.filter((p) => myXI.includes(p.id) && (p.position === "DF" || p.position === "GK"));
    const avgDefPace = ownDefenders.length ? ownDefenders.reduce((s, p) => s + (p.attrs?.pace || 10), 0) / ownDefenders.length : 10;
    def *= offsideTrapMult(prep.defLine, prep.offsideTrap, avgDefPace);
    atk *= setPieceBonusMult(myTeam, mySquad);
    if (prep.markPlayerId) def *= 0.985;
    const ttId = halfRef.current === 2 ? teamTalkHalfRef.current : prep.teamTalk;
    if (ttId) {
      const tt = TEAM_TALK_OPTIONS.find((t) => t.id === ttId);
      if (tt) {
        if (tt.atk) atk *= tt.atk;
        if (tt.def) def *= tt.def;
      }
    }
    atk *= familiarityMult; def *= familiarityMult;
    return { ...ctx, effAttack: atk, effDefense: def };
  }

  // เปลี่ยนตัวระหว่างเกมจริง (ไม่ใช่ตอนพักครึ่ง) — เริ่มฉาก: หยุดเกม, ผจก./ตัวสำรอง/ผู้ช่วยผู้ตัดสิน/คนถือป้ายโผล่ข้างสนาม
  // ข้อมูลจริง (สลับ XI ฯลฯ) ค่อยอัปเดตตอนจบฉาก (finishSubScene) พร้อมกับตอนตัวใหม่เดินถึงตำแหน่งพอดี
  function startSubScene(outId, inId) {
    if (subsUsed >= MAX_MATCH_SUBS || subScene) return;
    const side = isUserHome ? "home" : "away";
    const xi = isUserHome ? homeXI : awayXI;
    const outSlotIdx = xi.indexOf(outId);
    if (outSlotIdx < 0) return;
    const outP = mySquad.find((p) => p.id === outId);
    const inP = mySquad.find((p) => p.id === inId);
    const benchIdx = bench.findIndex((p) => p.id === inId);
    setPaused(true);
    setSubScene({
      outId, inId, side, outSlotIdx, t: 0, phase: "board",
      outName: outP?.name || "?", inName: inP?.name || "?",
      outNum: outSlotIdx + 1, inNum: 12 + Math.max(0, benchIdx),
    });
  }

  function finishSubScene() {
    setSubScene((sc) => {
      if (!sc) return null;
      if (sc.side === "home") setHomeXI((xi) => xi.map((id) => (id === sc.outId ? sc.inId : id)));
      else setAwayXI((xi) => xi.map((id) => (id === sc.outId ? sc.inId : id)));
      setSubsUsed((s) => s + 1);
      setPlayerRatings((r) => {
        const nr = { ...r };
        const p = career.players.find((pl) => pl.id === sc.inId);
        nr[sc.inId] = clamp(6.2 + (p ? p.rating / 85 : 0), 5.8, 7.2);
        return nr;
      });
      setEvents((e) => [`🔁 เปลี่ยนตัว: นำ ${sc.inName} ลงแทน ${sc.outName}`, ...e]);
      return null;
    });
    setPaused(false);
  }

  function doSub(outId, inId) {
    if (subsUsed >= MAX_MATCH_SUBS) return;
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
  }

  useEffect(() => {
    const hSlots = FORMATIONS[resolveFormation(homeFormation)].slots;
    const aSlots = FORMATIONS[resolveFormation(awayFormation)].slots;
    ambientRef.current = createAmbientPitchState(hSlots, aSlots);
  }, [homeFormation, awayFormation]);

  function finalize(finalHomeGoals, finalAwayGoals) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const cardEvents = Array.from(cardsRef.current.keys()).map((playerId) => ({
      playerId,
      red: redCardIdsRef.current.has(playerId),
    }));
    // ยังไม่เรียก onFinish ทันที — โชว์รายงานผลก่อน แล้วรอผู้เล่นกดปิดเองค่อยเรียกจริง (เก็บไว้ใน ref)
    pendingFinishRef.current = () => onFinish(finalHomeGoals, finalAwayGoals, homeXI, awayXI, cardEvents);
    setEnded(true);
    let starMan = null;
    [...homeXI.map((id) => ({ id, side: "home" })), ...awayXI.map((id) => ({ id, side: "away" }))].forEach(({ id, side }) => {
      const rt = playerRatings[id];
      if (rt == null) return;
      if (!starMan || rt > starMan.rating) {
        const p = [...homeSquad, ...awaySquad].find((pl) => pl.id === id);
        if (p) starMan = { name: p.name, rating: rt, side };
      }
    });
    setMatchReport({ homeGoals: finalHomeGoals, awayGoals: finalAwayGoals, scorers: goalLog, starMan, stats, possHomePct });
  }

  function closeMatchReport() {
    setMatchReport(null);
    pendingFinishRef.current?.();
  }

  /* beta-only: instantly resolve remaining time using expected-goals proportional to time left */
  function skipToFullTime() {
    const elapsedMin = Math.round((half === 1 ? 0 : 45) + (clock / HALF_SECONDS) * 45);
    const remainingFrac = clamp((90 - elapsedMin) / 90, 0, 1);
    const uSlotSkip = userAutoMode ? null : userSlotAssignMap(career);
    let hc = buildMatchContext(homeTeam, homeSquad, homeXI, awayFormation, true, homeTeam.chemistry, isUserHome ? uSlotSkip : null);
    let ac = buildMatchContext(awayTeam, awaySquad, awayXI, homeFormation, false, awayTeam.chemistry, isUserHome ? null : uSlotSkip);
    hc = applyTacticMods(hc, isUserHome);
    ac = applyTacticMods(ac, !isUserHome);
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
      setAnimTick((t) => t + dt * 60);

      const gs = gameStateRef.current;
      const hSlots = FORMATIONS[resolveFormation(homeFormationRef.current)].slots;
      const aSlots = FORMATIONS[resolveFormation(awayFormationRef.current)].slots;
      if (!ambientRef.current) {
        ambientRef.current = createAmbientPitchState(hSlots, aSlots);
      }
      // timeScale = สโลว์โมชั่นจังหวะยิง (ambient ตั้งเป้าไว้ 0.35 ช่วงเงื้อ→บอลถึงเป้า, กลับ 1 ตอนจบ) —
      // ไล่ระดับด้วย "เวลาจริง" (dt ก่อนคูณ timeScale) แทนการสแนปทันที กันจังหวะเข้า/ออกสโลว์โมดู "วาป"
      const amb = ambientRef.current;
      if (amb.timeScaleTarget == null) amb.timeScaleTarget = amb.timeScale ?? 1;
      if (amb.timeScale == null) amb.timeScale = 1;
      amb.timeScale += (amb.timeScaleTarget - amb.timeScale) * Math.min(1, dt * 8);
      const ts = amb.timeScale;
      ambientRef.current = advanceAmbientPitch(ambientRef.current, dt * ts, {
        pressure: gs.pressure,
        homeSlots: hSlots,
        awaySlots: aSlots,
      });
      const bs = ambientAsBallSim(ambientRef.current);
      ballSimRef.current = bs;
      if (livePossSideRef.current !== ambientRef.current.possSide) {
        livePossSideRef.current = ambientRef.current.possSide;
        setLivePossSide(ambientRef.current.possSide);
      }
      setBallSim(bs);

      // เหตุการณ์จาก ambient (ช็อตถึงปลายทาง / นกหวีดเขี่ยกลาง) — โชว์ผล/นับช็อตที่เกิดในซีน (เตะมุม/ฟรีคิก = counted:false)
      const evs = ambientRef.current.pendingEvents;
      if (evs && evs.length) {
        const list = evs.splice(0, evs.length);
        list.forEach((ev) => {
          if (ev.type === "kickoffWhistle") {
            playWhistle();
            return;
          }
          if (ev.type !== "shotResolved") return;
          const evMin = gameMinRef.current;
          const evTeam = ev.shotSide === "home" ? homeTeam : awayTeam;
          if (!ev.counted) {
            const onT = ev.outcome === "goal" || ev.outcome === "save";
            setStats((st) => (ev.shotSide === "home"
              ? { ...st, shotsH: st.shotsH + 1, sotH: st.sotH + (onT ? 1 : 0) }
              : { ...st, shotsA: st.shotsA + 1, sotA: st.sotA + (onT ? 1 : 0) }));
            if (ev.outcome === "goal") {
              if (ev.shotSide === "home") setHomeGoals((g) => g + 1); else setAwayGoals((g) => g + 1);
              setGoalLog((g) => [{ minute: evMin, team: ev.shotSide, player: evTeam.short }, ...g].slice(0, 8));
              setEvents((e) => [`⚽ ${evMin}' ประตูจากลูกเซ็ตพีซ! (${evTeam.short})`, ...e]);
            }
          }
          if (ev.outcome === "goal") {
            const meta = ev.counted ? lastShotMetaRef.current : null;
            setGoalFlash({ player: meta?.scorerName, team: ev.shotSide });
            setTimeout(() => setGoalFlash(null), 2200);
          }
        });
      }
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [paused, ended]);

  useEffect(() => {
    if (paused || ended) return;
    const iv = setInterval(() => {
      tickRef.current += 1;
      setClock((c) => {
        const next = c + 1 * effectiveSpeed;
        if (next >= HALF_SECONDS) {
          if (half === 1) {
            setPaused(true);
            setHalftimeOpen(true);
            setEvents((e) => [`⏸ พักครึ่ง ${homeGoals}-${awayGoals}`, ...e]);
            return HALF_SECONDS;
          }
          clearInterval(iv);
          setTimeout(() => finalize(homeGoals, awayGoals), 600);
          return HALF_SECONDS;
        }
        return next;
      });

      const gameMin = Math.round((half === 1 ? 0 : 45) + (clock / HALF_SECONDS) * 45);
      const uSlotLive = userAutoMode ? null : userSlotAssignMap(career);
      let hc = buildMatchContext(homeTeam, homeSquad, homeXI, awayFormation, true, homeTeam.chemistry, isUserHome ? uSlotLive : null);
      let ac = buildMatchContext(awayTeam, awaySquad, awayXI, homeFormation, false, awayTeam.chemistry, isUserHome ? null : uSlotLive);
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
      gameStateRef.current = { pressure: pr, homePressure };
      if (tickRef.current % 4 === 0) setLivePossSide(livePossSideRef.current);

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
      // ×speed ชดเชยจำนวนติ๊กที่หายไปตอนเร่งความเร็ว (เร็ว 6 เท่า = ติ๊กน้อยลง 6 เท่า) — จำนวน event ต่อแมตช์คงที่ทุกความเร็ว
      if (tickRef.current % 5 === 0 && Math.random() < Math.min(0.8, 0.06 * effectiveSpeed)) {
        const cornerHome = Math.random() < homePressure;
        if (cornerHome) setStats((s) => ({ ...s, cornersH: s.cornersH + 1 }));
        else setStats((s) => ({ ...s, cornersA: s.cornersA + 1 }));
        // ซีนเตะมุมเต็ม: บอลออกหลัง → วิ่งไปเตะมุมธง → ออกันหน้าโกล → เปิด → จบช็อต → กลับตำแหน่ง
        const ambC = ambientRef.current;
        if (ambC && !ambC.shotSeq && !ambC.setPiece && !ambC.celebration && !ambC.restart) {
          startCornerScene(ambC, cornerHome ? "home" : "away");
        }
      }
      if (tickRef.current % 6 === 0 && Math.random() < Math.min(0.8, 0.14 * effectiveSpeed)) {
        const awayFouled = Math.random() < homePressure;
        if (awayFouled) setStats((s) => ({ ...s, foulsA: s.foulsA + 1 }));
        else setStats((s) => ({ ...s, foulsH: s.foulsH + 1 }));
        playWhistle();

        // ผู้ตัดสิน — บางฟาวล์ได้ใบเหลือง/แดง (สะสม 2 เหลือง = แดง) เก็บทั้งเกม ยังไม่ตัดผู้เล่นออกจากสนามจริง (ผลกระทบเชิงภาพ/สถิติเท่านั้น)
        if (Math.random() < 0.16) {
          const foulTeam = awayFouled ? awayTeam : homeTeam;
          const offender = pickLivePlayer(awayFouled ? awaySquad : homeSquad, awayFouled ? awayXI : homeXI);
          if (offender) {
            const prevYellow = cardsRef.current.get(offender.id) || 0;
            const isRed = prevYellow >= 1 || Math.random() < 0.05;
            cardsRef.current.set(offender.id, prevYellow + 1);
            if (isRed) redCardIdsRef.current.add(offender.id);
            const kind = isRed ? "red" : "yellow";
            setStats((s) => (awayFouled ? { ...s, cardsA: s.cardsA + 1 } : { ...s, cardsH: s.cardsH + 1 }));
            setEvents((e) => [`${isRed ? "🟥 ใบแดง!" : "🟨 ใบเหลือง"} ${gameMin}' ${offender.name} (${foulTeam.short})`, ...e]);
            setRefereeCard({ team: awayFouled ? "away" : "home", kind, player: offender.name, minute: gameMin });
            playWhistle(true);
            setTimeout(() => setRefereeCard(null), 2200);
          }
        }

        // ฟาวล์ในกรอบเขตโทษ = จุดโทษ, นอกกรอบ = ฟรีคิกเหมือนเดิม
        const fkSide = awayFouled ? "home" : "away";
        const amb = ambientRef.current;
        const foulInBox = ballSimRef.current.px > 74 || ballSimRef.current.px < 26;
        if (amb && !amb.shotSeq && !amb.setPiece && !amb.celebration && !amb.restart) {
          if (foulInBox) {
            startPenaltyScene(amb, fkSide);
          } else if (Math.random() < 0.4) {
            startFreekickScene(amb, fkSide);
          }
        }
      }

      // ช็อต — engine อัตโนมัติ (แบบ FM: ดราม่ามากขึ้นเมื่อเกมสูสี) เล่นสดในจอปกติทุกลูก (สโลว์โมในตัว)
      const bs = ballSimRef.current;
      const inAttThird = bs.px > 62 || bs.px < 38;
      const inBox = bs.px > 74 || bs.px < 26;
      const highlightBias = getLiveHighlightBias(homeGoals, awayGoals, gameMin);
      const shotBase = (inBox ? 0.16 : inAttThird ? 0.1 : 0.035) * highlightBias;
      const shotChance = Math.min(0.85, (shotBase + Math.abs(pr) * 0.05) * effectiveSpeed);
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
        const shootingIsUser = attackingHome === isUserHome;
        const scorer = pickScorer(sq, xi, shootingIsUser ? null : prep.markPlayerId);
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

        // ประตูนับผลทันที (สกอร์บอร์ดขึ้นก่อนภาพเล็กน้อย) — GOAL flash จะเด้งตอนบอลถึงตาข่ายจริงผ่าน pendingEvents
        if (isGoal) {
          if (attackingHome) setHomeGoals((g) => g + 1); else setAwayGoals((g) => g + 1);
          setGoalLog((g) => [{ minute: gameMin, team: shotSide, player: scorer?.name || teamShort }, ...g].slice(0, 8));
          setEvents((e) => [`⚽ ${gameMin}' ประตู! ${scorer?.name || teamShort} (${teamShort})`, ...e]);
        } else {
          setHighlight({ team: shotSide, kind: shotResult === "save" ? "save" : "miss", minute: gameMin });
          setTimeout(() => setHighlight(null), 2200);
        }

        // ยิงสดในจอปกติ: สโลว์โมตั้งแต่เงื้อจนบอลถึงเป้า + เส้นปะวิถียิง (ambient จัดการเอง)
        const ambShot = ambientRef.current;
        if (ambShot && !ambShot.shotSeq && !ambShot.setPiece && !ambShot.celebration && !ambShot.restart) {
          const outcome = isGoal ? "goal" : shotResult === "save" ? "save" : (Math.random() < 0.3 ? "post" : "wide");
          lastShotMetaRef.current = { scorerName: scorer?.name, teamShort, shotSide };
          beginAmbientShot(ambShot, { shotSide, outcome });
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
    }, Math.max(180, 420 / effectiveSpeed));
    return () => clearInterval(iv);
  }, [half, paused, ended, effectiveSpeed, homeGoals, awayGoals, homeXI, awayXI, homeFormation, awayFormation]);

  const gameMinuteDisplay = Math.round((half === 1 ? 0 : 45) + (clock / HALF_SECONDS) * 45);
  const possTotal = possession.homeTicks + possession.awayTicks;
  const possHomePct = Math.round((possession.homeTicks / possTotal) * 100);
  const possAwayPct = 100 - possHomePct;

  const hSlots = FORMATIONS[resolveFormation(homeFormation)].slots;
  const aSlots = FORMATIONS[resolveFormation(awayFormation)].slots;

  // ชื่อนักเตะตามลำดับ slot เดียวกับ homeXI/awayXI (getBestXI push ตามลำดับ slotDefs)
  const homeNames = homeXI.map((id) => {
    const p = homeSquad.find((sp) => sp.id === id);
    return p ? (p.name.split(" ")[1] || p.name) : "";
  });
  const awayNames = awayXI.map((id) => {
    const p = awaySquad.find((sp) => sp.id === id);
    return p ? (p.name.split(" ")[1] || p.name) : "";
  });

  // ประมาณสตามินาสดระหว่างเกม — ใช้ค่าสตามินาก่อนแมทช์ลบตามนาทีที่ผ่านไป (แสดงผลเฉยๆ ไม่แตะ engine จำลอง)
  function liveStaminaFor(squad, xi, idx) {
    const p = squad.find((sp) => sp.id === xi[idx]);
    if (!p) return null;
    return clamp((p.stamina ?? 80) - gameMinuteDisplay * 0.25, 5, 100);
  }

  let livePlayers;
  if (ambientRef.current) {
    const { home, away } = computeAmbientLivePlayers(hSlots, aSlots, ambientRef.current, animTick, pitchToWide);
    livePlayers = [
      ...home.map((d, i) => ({
        ...d, key: "h" + i,
        shirtColor: teamShirtColor(homeTeam),
        shortsColor: teamShortsColor(homeTeam),
        gkColor: gkKitColor(homeTeam, "home"),
        name: homeNames[d.idx],
        stamina: liveStaminaFor(homeSquad, homeXI, d.idx),
      })),
      ...away.map((d, i) => ({
        ...d, key: "a" + i,
        shirtColor: teamShirtColor(awayTeam),
        shortsColor: teamShortsColor(awayTeam),
        gkColor: gkKitColor(awayTeam, "away"),
        name: awayNames[d.idx],
        stamina: liveStaminaFor(awaySquad, awayXI, d.idx),
      })),
    ].sort((a, b) => a.z - b.z);
    if (ambientRef.current.referee) {
      const refPos = pitchToWide(ambientRef.current.referee.px, ambientRef.current.referee.py);
      livePlayers.push({
        key: "ref", x: refPos.x, y: refPos.y, z: Math.round(refPos.y * 10) + 1,
        shirtColor: "#232330", shortsColor: "#0c0c10", gkColor: "#232330",
        shirtNum: "", isGK: false, isCarrier: false, isPasser: false, isReceiver: false, facing: 1,
        // ชูใบ — โชว์ใบเหลือง/แดงลอยเหนือหัวผู้ตัดสินผ่านช่องป้ายชื่อที่มีอยู่แล้ว
        name: refereeCard ? (refereeCard.kind === "red" ? "🟥" : "🟨") : "",
      });
    }
  } else {
    livePlayers = [];
  }

  // เดินออกจากอุโมง — บดบัง livePlayers ปกติชั่วคราวด้วยจุดนักเตะที่ไล่จากจุดอุโมงเข้าตำแหน่งฟอร์เมชันจริง
  if (preMatchPhase === "walkout") {
    const te = 1 - (1 - walkoutT) ** 2;
    const tunnel = { px: 50, py: 103 };
    const buildWalkers = (slots, side, team, names) => slots.map((slot, i) => {
      const anchor = slotToPitchAmbient(slot, side);
      const px = tunnel.px + (anchor.px - tunnel.px) * te;
      const py = tunnel.py + (anchor.py - tunnel.py) * te;
      const pos = pitchToWide(px, py);
      return {
        key: `${side[0]}${i}`, x: pos.x, y: pos.y, z: Math.round(pos.y * 10),
        shirtColor: teamShirtColor(team), shortsColor: teamShortsColor(team), gkColor: gkKitColor(team, side),
        shirtNum: i + 1, isGK: slot.pos === "GK", isCarrier: false, isPasser: false, isReceiver: false,
        facing: side === "home" ? 1 : -1, name: names[i],
      };
    });
    livePlayers = [
      ...buildWalkers(hSlots, "home", homeTeam, homeNames),
      ...buildWalkers(aSlots, "away", awayTeam, awayNames),
    ].sort((a, b) => a.z - b.z);
  }

  // ฉากเปลี่ยนตัว — เอาจุดเดิมของ slot ที่ถูกเปลี่ยนออก แล้ววาดตัวออก/ตัวเข้า/ผจก./ผู้ช่วยผู้ตัดสิน/ป้ายเลขแทน
  if (subScene) {
    const sc = subScene;
    const teamObj = sc.side === "home" ? homeTeam : awayTeam;
    const slots = sc.side === "home" ? hSlots : aSlots;
    const outSlot = slots[sc.outSlotIdx];
    const outAnchor = slotToPitchAmbient(outSlot, sc.side);
    // py=97 (ริมเส้นข้างสุดในกรอบที่มองเห็น) เดิม 108 หลุดขอบล่างของกล่อง overflow:hidden ไปครึ่งนึง
    const sidelinePt = { px: 46, py: 97 };
    const walkT = sc.phase === "walk" ? Math.min(1, sc.t / 2.2) : 0;
    const we = 1 - (1 - walkT) ** 2;
    const outPt = { px: outAnchor.px + (sidelinePt.px - outAnchor.px) * we, py: outAnchor.py + (sidelinePt.py - outAnchor.py) * we };
    const inPt = { px: sidelinePt.px + (outAnchor.px - sidelinePt.px) * we, py: sidelinePt.py + (outAnchor.py - sidelinePt.py) * we };
    const outPos = pitchToWide(outPt.px, outPt.py);
    const inPos = pitchToWide(inPt.px, inPt.py);
    // กระจายให้ห่างกันทั้งแนวนอน-แนวตั้ง กันป้ายชื่อ (name label ลอยเหนือหัว) ทับกันตอนยืนแน่นๆ ริมเส้น
    const coachPos = pitchToWide(sidelinePt.px - 7, sidelinePt.py + 1);
    const refPos2 = pitchToWide(sidelinePt.px + 7, sidelinePt.py + 1);
    const boardPos = pitchToWide(sidelinePt.px, sidelinePt.py - 6);
    const slotKey = sc.side === "home" ? `h${sc.outSlotIdx}` : `a${sc.outSlotIdx}`;
    livePlayers = [
      ...livePlayers.filter((p) => p.key !== slotKey),
      { key: "sub-out", x: outPos.x, y: outPos.y, z: Math.round(outPos.y * 10), shirtColor: teamShirtColor(teamObj), shortsColor: teamShortsColor(teamObj), gkColor: teamShirtColor(teamObj), shirtNum: sc.outNum, isGK: outSlot.pos === "GK", isCarrier: false, isPasser: false, isReceiver: false, facing: sc.side === "home" ? -1 : 1, name: sc.outName },
      { key: "sub-in", x: inPos.x, y: inPos.y, z: Math.round(inPos.y * 10), shirtColor: teamShirtColor(teamObj), shortsColor: teamShortsColor(teamObj), gkColor: teamShirtColor(teamObj), shirtNum: sc.inNum, isGK: false, isCarrier: false, isPasser: false, isReceiver: false, facing: sc.side === "home" ? 1 : -1, name: sc.inName },
      { key: "sub-coach", x: coachPos.x, y: coachPos.y, z: 998, shirtColor: "#2b3a4a", shortsColor: "#1a2430", gkColor: "#2b3a4a", shirtNum: "", isGK: false, isCarrier: false, isPasser: false, isReceiver: false, facing: 1, name: "ผจก." },
      { key: "sub-ref2", x: refPos2.x, y: refPos2.y, z: 999, shirtColor: "#232330", shortsColor: "#0c0c10", gkColor: "#232330", shirtNum: "", isGK: false, isCarrier: false, isPasser: false, isReceiver: false, facing: 1, name: "ผู้ช่วยฯ" },
      { key: "sub-board", x: boardPos.x, y: boardPos.y, z: 1000, shirtColor: "#4a4a52", shortsColor: "#2c2c33", gkColor: "#4a4a52", shirtNum: "", isGK: false, isCarrier: false, isPasser: false, isReceiver: false, facing: 1, name: `${sc.outNum} → ${sc.inNum}` },
    ];
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(4,10,7,.96)", zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", overflowY: "auto", padding: "8px 4px" }}>
      {matchReport && (
        <MatchReportModal
          homeTeam={homeTeam} awayTeam={awayTeam}
          homeGoals={matchReport.homeGoals} awayGoals={matchReport.awayGoals}
          scorers={matchReport.scorers} starMan={matchReport.starMan}
          onClose={closeMatchReport}
        />
      )}
      {preMatchPhase === "lineup-home" && <LineupScreen team={homeTeam} squad={homeSquad} xi={homeXI} onSkip={skipPreMatch} />}
      {preMatchPhase === "lineup-away" && <LineupScreen team={awayTeam} squad={awaySquad} xi={awayXI} onSkip={skipPreMatch} />}
      {preMatchPhase === "walkout" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 24 }}>
          <button type="button" onClick={skipPreMatch} style={{ ...btnStyle(C.steel, C.chalk), padding: "9px 22px" }}>ข้าม ▶</button>
        </div>
      )}
      {preMatchPhase === "whistle" && <KickoffWhistleBanner />}
      {halftimeOpen && (
        <HalftimeOverlay
          scoreLabel={`${homeTeam.short} ${homeGoals} - ${awayGoals} ${awayTeam.short}`}
          formation={myFormation}
          mentality={myMentality}
          instructions={myInstructions}
          onFormation={setMyFormation}
          onMentality={setMyMentality}
          onToggleInstruction={toggleInstruction}
          teamTalkHalf={teamTalkHalf}
          onSetTeamTalkHalf={setTeamTalkHalf}
          onContinue={startSecondHalf}
          myXI={myXI}
          mySquad={mySquad}
          bench={bench}
          onSub={doSub}
          subsUsed={subsUsed}
        />
      )}
      <div className="fc-live-wrap" style={{ width: "100%", opacity: halftimeOpen ? 0.35 : 1, pointerEvents: halftimeOpen ? "none" : "auto" }}>
        {!halftimeOpen && half === 1 && (
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 6, textAlign: "center" }}>แผนล็อกระหว่างเกม · ปรับได้อีกครั้งตอนพักครึ่ง</div>
        )}
        {/* สนาม tracker — จุดนักบอล FM + บอล */}
        <div style={{ marginBottom: 8, position: "relative" }}>
          <div style={{ filter: "brightness(0.97)" }}>
            <TrackerMatchView
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              homeGoals={homeGoals}
              awayGoals={awayGoals}
              half={half}
              clock={clock}
              halfSeconds={HALF_SECONDS}
              ballSim={ballSim}
              livePossSide={livePossSide}
              possHomePct={possHomePct}
              sponsorLabel={(SPONSOR_TIERS[career.sponsorTier ?? 0] || SPONSOR_TIERS[0]).name}
              animTick={animTick}
              goalFlash={goalFlash}
              players={livePlayers}
              shotPath={ambientRef.current?.shotPath || null}
            />
          </div>
          <LiveCommentaryStrip lines={commentaryFeed} minute={gameMinuteDisplay} />
          <GoalCelebrationOverlay flash={goalFlash} animTick={animTick} />
          {refereeCard && (
            <div style={{
              position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", zIndex: 45,
              display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8,
              background: "rgba(10,10,14,.85)", border: `1px solid ${refereeCard.kind === "red" ? "#e05a4e" : "#e0c458"}`,
              fontFamily: DISPLAY_FONT, fontSize: 11.5, color: "#fff", whiteSpace: "nowrap",
            }}>
              <span style={{
                display: "inline-block", width: 10, height: 14, borderRadius: 2,
                background: refereeCard.kind === "red" ? "#e0453a" : "#f0d048",
              }} />
              {refereeCard.player} — {refereeCard.kind === "red" ? "ใบแดง!" : "ใบเหลือง"}
            </div>
          )}
          {highlight && !goalFlash && (
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

        {/* ฟอร์เมชันเรา + สถิติ + ไทม์ไลน์ + ฟอร์เมชันคู่แข่ง เคียงกัน 4 ช่องแบบ FM */}
        <div className="fc-live-quad" style={{ marginBottom: 10 }}>
          <FormationMiniBoard team={isUserHome ? homeTeam : awayTeam} formationKey={isUserHome ? homeFormation : awayFormation} xi={isUserHome ? homeXI : awayXI} squad={isUserHome ? homeSquad : awaySquad} ratings={playerRatings} />

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* สกอร์บาร์แบบ FM — ทีม/สกอร์/นาที เห็นชัดแยกจากที่ทับมุมสนาม */}
            <Panel style={{ padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10.5, color: C.textDim, fontFamily: MONO_FONT }}>{gameMinuteDisplay}'</span>
              <span style={{ fontSize: 14, fontWeight: 800, fontFamily: DISPLAY_FONT }}>
                {homeTeam.short} <span style={{ color: C.gold }}>{homeGoals} - {awayGoals}</span> {awayTeam.short}
              </span>
              <span style={{ width: 30 }} />
            </Panel>

            {/* สถิติแมตช์ — กระชับ ไม่ซ้ำแถบครองบอลบนสนาม */}
            <Panel style={{ padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: C.textDim }}>โมเมนตัม</span>
              <span style={{ fontSize: 10, color: C.textDim, fontFamily: MONO_FONT }}>{possHomePct}% — {possAwayPct}%</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", height: 22, gap: 1, marginBottom: 10 }}>
              {momentum.length === 0 && <div style={{ fontSize: 10, color: C.textDim }}>รอข้อมูล...</div>}
              {momentum.slice(-18).map((v, i) => (
                <div key={i} style={{ flex: 1, height: "100%", position: "relative" }}>
                  <div style={{
                    position: "absolute", left: 0, right: 0, height: `${Math.abs(v) / 2}%`,
                    background: v >= 0 ? "#ffd54f" : "#64b5f6",
                    top: v >= 0 ? `${50 - Math.abs(v) / 2}%` : "50%",
                    borderRadius: 1,
                  }} />
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
              <StatRow label="ยิงประตู" home={stats.shotsH} away={stats.shotsA} />
              <StatRow label="ยิงตรงกรอบ" home={stats.sotH} away={stats.sotA} />
              <StatRow label="เตะมุม" home={stats.cornersH} away={stats.cornersA} />
              <StatRow label="ฟาวล์" home={stats.foulsH} away={stats.foulsA} />
              <StatRow label="ใบเหลือง/แดง" home={stats.cardsH} away={stats.cardsA} />
            </div>
            </Panel>
          </div>

          <Panel>
            <SectionLabel>ไทม์ไลน์เหตุการณ์</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 220, overflowY: "auto" }}>
              {events.slice(0, 24).map((e, i) => <div key={i} style={{ fontSize: 12, fontFamily: MONO_FONT, color: i === 0 ? C.chalk : C.textDim }}>{e}</div>)}
              {events.length === 0 && <div style={{ fontSize: 12, color: C.textDim }}>เกมเริ่มแล้ว รอลุ้นจังหวะแรก...</div>}
            </div>
          </Panel>

          <FormationMiniBoard team={isUserHome ? awayTeam : homeTeam} formationKey={isUserHome ? awayFormation : homeFormation} xi={isUserHome ? awayXI : homeXI} squad={isUserHome ? awaySquad : homeSquad} ratings={playerRatings} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <FMSquadBar squad={mySquad} xi={myXI} ratings={playerRatings} subsUsed={subsUsed} team={myTeam} />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setPaused((p) => !p)} disabled={halftimeOpen} style={{ ...btnStyle(C.steel, C.chalk), flex: 1, minWidth: 90, opacity: halftimeOpen ? 0.5 : 1 }}>{paused ? "▶ เล่นต่อ" : "⏸ หยุด"}</button>
          {!fullOnlineMode && (
            <button type="button" onClick={() => setSpeed((s) => (s === 1 ? 3 : s === 3 ? 6 : s === 6 ? 12 : 1))} disabled={halftimeOpen} style={{ ...btnStyle(C.amber, "#0b2318"), flex: 1, minWidth: 90, opacity: halftimeOpen ? 0.5 : 1 }}>ความเร็ว x{speed}</button>
          )}
          <button type="button" onClick={toggleCrowdMute} style={{ ...btnStyle(crowdMuted ? C.steel : C.good, crowdMuted ? C.textDim : "#0b2318"), flex: 1, minWidth: 90 }} title="เสียงกองเชียในสนาม">{crowdMuted ? "🔇 ปิดเสียง" : "🔊 กองเชีย"}</button>
          <button type="button" onClick={() => setShowSubs((s) => !s)} style={{ ...btnStyle(showSubs ? C.purple : C.steel, showSubs ? "#fff" : C.chalk), flex: 1, minWidth: 90 }}>{showSubs ? "ซ่อนเปลี่ยนตัว" : "เปลี่ยนตัว"} ({subsUsed}/5)</button>
          {!fullOnlineMode && (
            <button type="button" onClick={skipToFullTime} disabled={halftimeOpen} style={{ ...btnStyle(C.crimson, "#fff"), flex: 1, minWidth: 90, fontWeight: 800, opacity: halftimeOpen ? 0.5 : 1 }}>⏭ ข้ามไปดูผล</button>
          )}
        </div>
        {crowdNeedsUnlock && !crowdMuted && (
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <button type="button" onClick={unlockCrowdAudio} style={{ ...btnStyle(C.good, "#0b2318"), fontSize: 11, padding: "8px 16px" }}>
              🔊 แตะเพื่อเปิดเสียงกองเชีย
            </button>
          </div>
        )}
        <div style={{ fontSize: 9.5, color: C.textDim, textAlign: "center", marginTop: -6, marginBottom: 10 }}>
          เปลี่ยนตัวได้ตลอดแมตช์ · ปรับแผนได้ก่อนเกม + พักครึ่งเท่านั้น
        </div>

        {showSubs && !halftimeOpen && (
          <Panel style={{ marginBottom: 10 }}>
            <SectionLabel sub={`${subsUsed}/5 ครั้ง · เปลี่ยนได้ตลอดเกม`}>เปลี่ยนตัว</SectionLabel>
            <SubPicker myXI={myXI} mySquad={mySquad} bench={bench} onSub={startSubScene} disabled={subsUsed >= MAX_MATCH_SUBS || !!subScene} />
          </Panel>
        )}

        {showSubs && halftimeOpen && (
          <Panel style={{ marginBottom: 10, opacity: 0.5 }}>
            <SectionLabel>เปลี่ยนตัว — ใช้แผงพักครึ่งด้านบน</SectionLabel>
          </Panel>
        )}
      </div>
    </div>
  );
}
/* FM top-down pitch — มองจากบน ประตูซ้าย/ขวา บอลเล่นไปข้างหน้าเข้าประตู */
const PITCH = { left: 0, top: 0, width: 100, height: 100 };
const PLAY_MIN_PX = 8;
const PLAY_MAX_PX = 92;
const PITCH_REAL_M = { length: 105, width: 68, playerD: 0.52, gkD: 0.58, ballD: 0.22 };
const LIVE_DOT_SCALE = 4.5;
function realPitchRadius(diameterM) {
  return (diameterM / PITCH_REAL_M.width) * PITCH.width / 2;
}
const LIVE_PLAYER_R = realPitchRadius(PITCH_REAL_M.playerD) * LIVE_DOT_SCALE;
const LIVE_GK_R = realPitchRadius(PITCH_REAL_M.gkD) * LIVE_DOT_SCALE;
const LIVE_BALL_R = realPitchRadius(PITCH_REAL_M.ballD) * LIVE_DOT_SCALE * 1.15;
/* สนาม + หญ้า — กรอบหญ้าต้องอยู่ใน cutout กลางสนาม ไม่ทับป้ายโฆษณารอบสนาม */
const STADIUM_ASSETS = {
  stadium: "/stadium/local-pitch-stadium.png",
  grass: "/stadium/green-pitch.png",
  aspect: 1536 / 1024,
};
/* ปรับให้ตรง cutout ของ Local Pitch stadium (Progression stadium/) */
const GRASS_FRAME = { left: 15.8, top: 21.8, width: 67.0, height: 55.5 };

function teamShirtColor(team) {
  return team?.shirtColor || team?.color || "#888";
}

function teamShortsColor(team) {
  return team?.shortsColor || team?.secondaryColor || "#1a1a1a";
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

/* ---------- referee whistle (WebAudio สังเคราะห์ ไม่ใช้ไฟล์เสียง) ---------- */
let whistleCtx = null;
function playWhistle(long = false) {
  if (isCrowdMuted()) return;
  try {
    whistleCtx = whistleCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = whistleCtx;
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime;
    const burst = (start, dur) => {
      const osc = ctx.createOscillator();
      const trem = ctx.createOscillator();
      const tremGain = ctx.createGain();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 2300;
      trem.type = "sine";
      trem.frequency.value = 42; // ลูกกลิ้งในนกหวีด (pea) — สั่นความถี่ให้เสียง "ปรี๊ด" สมจริง
      tremGain.gain.value = 350;
      trem.connect(tremGain);
      tremGain.connect(osc.frequency);
      gain.gain.setValueAtTime(0.0001, t0 + start);
      gain.gain.exponentialRampToValueAtTime(0.09, t0 + start + 0.02);
      gain.gain.setValueAtTime(0.09, t0 + start + dur - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0 + start);
      osc.stop(t0 + start + dur + 0.02);
      trem.start(t0 + start);
      trem.stop(t0 + start + dur + 0.02);
    };
    burst(0, long ? 0.55 : 0.3);
    if (long) burst(0.65, 0.35);
  } catch { /* ไม่มีเสียงก็ไม่พังเกม */ }
}

/* ---------- live shot pacing ---------- */
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

function resolveShotResult(scoreProb, { inBox, inAttThird }) {
  const goalBoost = inBox ? 1.2 : inAttThird ? 1.05 : 1;
  if (Math.random() < scoreProb * goalBoost) return "goal";
  const onTargetChance = inBox ? 0.36 : inAttThird ? 0.46 : 0.52;
  return Math.random() < onTargetChance ? "save" : "miss";
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
  const shown = lines.slice(0, 2);
  return (
    <div style={{
      background: FM_LIVE.panel, borderRadius: 8, padding: "6px 10px",
      border: `1px solid ${FM_LIVE.bar}`, marginTop: 6,
    }}>
      <div style={{ fontSize: 9, color: FM_LIVE.dim, fontFamily: MONO_FONT, marginBottom: 3 }}>
        คอมเมนตารี · {minute}'
      </div>
      {shown.length === 0 ? (
        <div style={{ fontSize: 11, color: C.textDim }}>รอจังหวะแรก...</div>
      ) : shown.map((line, i) => (
        <div key={line.id} style={{
          fontSize: i === 0 ? 12 : 10.5, fontFamily: MONO_FONT,
          color: i === 0 ? C.chalk : C.textDim,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
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

function ensurePlayerMotion(motionStore, side, formationKey, slots) {
  const key = `${side}:${resolveFormation(formationKey)}`;
  if (!motionStore[key] || motionStore[key].length !== slots.length) {
    motionStore[key] = slots.map((slot) => ({ ...slotToPitch(slot, side), vx: 0, vy: 0 }));
  }
  return motionStore[key];
}

/** FM — block เลื่อนตามลูกบอล แต่ละแถว/ตำแหน่งขยับไม่เท่ากัน */
function fmBlockShift(slot, ball, side, hasBall) {
  const bx = ball.px - 50;
  const by = ball.py - 50;
  const grp = slot.pos || "MF";
  const depth = clamp(slot.y / 92, 0, 1);
  const fwd = side === "home" ? 1 : -1;

  let shiftX = bx;
  let shiftY = by * 0.32;

  if (grp === "GK") {
    shiftX *= 0.12;
    shiftY *= 0.22;
  } else if (grp === "DF") {
    shiftX *= hasBall ? 0.2 : 0.16;
    shiftY *= 0.1;
  } else if (grp === "MF") {
    shiftX *= hasBall ? 0.32 : 0.26;
    shiftY *= 0.16;
  } else {
    shiftX *= hasBall ? 0.4 : 0.3;
    shiftY *= 0.2;
  }

  if (hasBall) {
    shiftX += fwd * (2.2 + depth * 1.8);
  } else {
    shiftX -= fwd * (1.4 + (1 - depth) * 0.8);
    shiftX *= 0.88;
  }

  return { shiftX, shiftY };
}

/** FM — เลื่อนทีละนิด มี max speed ต่อเฟรม (ไม่วาป) */
function advanceFmMotion(prev, targetPx, targetPy, maxStep) {
  let dx = targetPx - prev.px;
  let dy = targetPy - prev.py;
  const dist = Math.hypot(dx, dy);
  if (dist > maxStep && dist > 0.001) {
    const s = maxStep / dist;
    dx *= s;
    dy *= s;
  }
  return {
    px: prev.px + dx,
    py: prev.py + dy,
    vx: dx,
    vy: dy,
  };
}

function fmMaxStep(slot, { isGK, isCarrier, isPasser, isReceiver, hasBall, running }) {
  if (isCarrier) return 0.48;
  if (isReceiver) return 0.38;
  if (isPasser) return 0.07;
  if (isGK) return 0.16;
  const grp = slot.pos || "MF";
  if (grp === "DF") return running ? 0.26 : 0.2;
  if (grp === "MF") return running ? 0.32 : 0.24;
  if (grp === "FW") return running ? 0.36 : 0.28;
  return running ? 0.28 : 0.22;
}

function advanceBallVisual(prev, dt, { pressure, homeFormation, awayFormation, tick, homePressure = 0.5 }) {
  const activeSide = prev.side || "home";
  const formation = activeSide === "home" ? homeFormation : awayFormation;
  const slots = FORMATIONS[resolveFormation(formation)].slots;
  let next = { ...prev, side: activeSide };
  const fwdSign = activeSide === "home" ? 1 : -1;
  const isPassPhase = ["pass", "through", "safe", "contest"].includes(next.phase);
  const speed = next.phase === "shot" ? 2.6
    : next.phase === "dribble" ? 1.15
    : isPassPhase ? 2.65
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

  next.t = Math.min(1, next.t + speed * dt);

  if (isPassPhase && next.t < 1) {
    const arcLift = next.phase === "through" ? 4.5 : next.phase === "pass" ? 2.8 : 1.4;
    const e = easeOut(next.t);
    const midPx = (next.fromPx + next.toPx) / 2 + fwdSign * (next.phase === "through" ? 3 : 1.2);
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
      const hold = fwdSign * 1.6;
      next.toPx = clamp(next.px + hold, PLAY_MIN_PX, PLAY_MAX_PX);
      next.toPy = next.py;
      return next;
    }

    const defendStr = activeSide === "home" ? (1 - homePressure) : homePressure;
    if (Math.random() < 0.032 + defendStr * 0.045 + Math.abs(pressure) * 0.02) {
      const newSide = activeSide === "home" ? "away" : "home";
      const newForm = newSide === "home" ? homeFormation : awayFormation;
      const newSlots = FORMATIONS[resolveFormation(newForm)].slots;
      const stealIdx = 1 + Math.floor(Math.random() * Math.max(1, newSlots.length - 1));
      const stealPos = slotToPitch(newSlots[stealIdx], newSide);
      return {
        ...next,
        side: newSide,
        carrier: stealIdx,
        fromCarrier: next.carrier,
        toCarrier: stealIdx,
        phase: "contest",
        fromPx: next.px,
        fromPy: next.py,
        toPx: stealPos.px,
        toPy: stealPos.py,
        t: 0,
      };
    }

    const roll = tick % 10;
    if (roll <= 7) next.phase = "pass";
    else if (roll === 8) next.phase = "through";
    else next.phase = "dribble";

    if (next.phase === "dribble") {
      const fwd = fwdSign * (3.2 + pressure * 1.8);
      next.fromPx = next.px; next.fromPy = next.py;
      next.toPx = clamp(next.px + fwd, PLAY_MIN_PX, PLAY_MAX_PX);
      next.toPy = clamp(next.py + (Math.sin(tick * 0.3) * 1.2), 12, 88);
      next.fromCarrier = null;
      next.toCarrier = null;
      next.t = 0;
    } else {
      const fromIdx = next.carrier;
      const target = pickPassTarget(slots, activeSide, fromIdx, next.phase);
      const recvPos = slotToPitch(slots[target.i], activeSide);
      next.fromCarrier = fromIdx;
      next.toCarrier = target.i;
      next.fromPx = next.px;
      next.fromPy = next.py;
      next.toPx = recvPos.px - fwdSign * 1.8;
      next.toPy = recvPos.py + (Math.random() - 0.5) * 2;
      next.t = 0;
    }
    next.side = activeSide;
  }

  const e = easeOut(next.t);
  next.px = lerp(next.fromPx, next.toPx, e);
  next.py = lerp(next.fromPy, next.toPy, e);
  return next;
}

function computeLivePlayers(formationKey, side, ball, possSide, animTick, project = pitchToScreen, motionStore = null) {
  const slots = FORMATIONS[resolveFormation(formationKey)].slots;
  const teamSide = ball?.side ?? possSide;
  const hasBall = side === teamSide;
  const isPassPhase = ball && ["pass", "through", "safe", "contest"].includes(ball.phase) && ball.t < 1;
  const positions = motionStore ? ensurePlayerMotion(motionStore, side, formationKey, slots) : null;
  const fwd = side === "home" ? 1 : -1;

  return slots.map((slot, i) => {
    const anchor = slotToPitch(slot, side);
    const block = fmBlockShift(slot, ball, side, hasBall);
    let targetPx = anchor.px + block.shiftX * (hasBall ? 0.28 : 0.22);
    let targetPy = anchor.py + block.shiftY * (hasBall ? 0.14 : 0.11);

    const isGK = slot.pos === "GK";
    const isPasser = hasBall && isPassPhase && ball.fromCarrier === i;
    const isReceiver = hasBall && isPassPhase && ball.toCarrier === i;
    const isCarrier = hasBall && i === ball.carrier && !isPassPhase;

    if (isGK) {
      targetPx = side === "home" ? 10 : 90;
      targetPy = clamp(ball.py * 0.5 + anchor.py * 0.5 + block.shiftY * 0.08, 32, 68);
      if ((side === "home" && ball.px < 28) || (side === "away" && ball.px > 72)) {
        targetPy += Math.sin(animTick * 0.08 + i) * 0.9;
      }
    } else if (isCarrier) {
      if (ball.phase === "shot" && ball.highlightType) {
        targetPx = ball.fromPx + fwd * -2.4;
        targetPy = ball.fromPy;
      } else {
        targetPx = ball.px + fwd * -2.6;
        targetPy = ball.py;
      }
    } else if (isPasser) {
      targetPx = ball.fromPx + fwd * -2.0;
      targetPy = ball.fromPy;
    } else if (isReceiver) {
      const lead = clamp(ball.t ?? 0, 0, 1);
      targetPx = lerp(ball.fromPx, ball.toPx, 0.55 + lead * 0.4) + fwd * -1.6;
      targetPy = lerp(ball.fromPy, ball.toPy, 0.55 + lead * 0.4);
    } else if (hasBall) {
      targetPx += (ball.px - targetPx) * 0.28;
      targetPy += (ball.py - targetPy) * 0.22;
    } else {
      targetPx += (ball.px - targetPx) * 0.12;
      targetPy += (ball.py - targetPy) * 0.09;
    }

    const dist = Math.hypot(targetPx - ball.px, targetPy - ball.py);
    const running = !isGK && (isCarrier || isReceiver || dist < 24);

    let px = targetPx;
    let py = targetPy;
    let facing = side === "home" ? 1 : -1;
    let vx = 0;
    let vy = 0;

    if (positions) {
      const prev = positions[i];
      const maxStep = fmMaxStep(slot, { isGK, isCarrier, isPasser, isReceiver, hasBall, running });
      const next = advanceFmMotion(prev, targetPx, targetPy, maxStep);
      px = next.px;
      py = next.py;
      vx = next.vx;
      vy = next.vy;
      if (Math.abs(vx) > 0.025) facing = vx > 0 ? 1 : -1;
      else if (hasBall || isReceiver) facing = fwd;
      positions[i] = { px, py, vx, vy };
    }

    px = clamp(px, PLAY_MIN_PX, PLAY_MAX_PX);
    py = clamp(py, 8, 92);
    const pos = project(px, py);
    const diving = isGK && ((side === "home" && ball.px < 22) || (side === "away" && ball.px > 78));
    return {
      x: pos.x, y: pos.y, z: Math.round(pos.y * 10),
      pos: slot.pos, facing,
      running, isCarrier, isGK, diving, isPasser, isReceiver,
      idx: i, shirtNum: i + 1,
    };
  });
}

function FMPlayerDot({ x, y, shirtColor, gkColor, num, isGK, isCarrier, isPasser, isReceiver, side }) {
  const fill = isGK ? gkColor : shirtColor;
  const r = isGK ? LIVE_GK_R : LIVE_PLAYER_R;
  const textCol = (0.299 * parseInt(fill.slice(1, 3), 16) + 0.587 * parseInt(fill.slice(3, 5), 16) + 0.114 * parseInt(fill.slice(5, 7), 16)) > 145 ? "#1a1a1a" : "#fff";
  const strokeCol = isCarrier ? "#fff" : isPasser ? "#ffe566" : isReceiver ? "#a8e6ff" : "rgba(255,255,255,0.92)";
  const strokeW = isCarrier || isPasser || isReceiver ? r * 0.38 : r * 0.24;
  return (
    <g>
      <circle cx={x} cy={y} r={r * 1.4} fill="rgba(0,0,0,0.4)" />
      <circle cx={x} cy={y} r={r} fill={fill} stroke={strokeCol} strokeWidth={strokeW} />
      {isCarrier && <circle cx={x} cy={y} r={r * 1.5} fill="none" stroke="#fff" strokeWidth={r * 0.2} opacity="0.85" />}
      {num != null && (
        <text x={x} y={y + r * 0.38} textAnchor="middle" fontSize={r * 1.05} fontWeight="800"
          fill={textCol} stroke="rgba(0,0,0,0.35)" strokeWidth={r * 0.06}
          fontFamily="Arial,sans-serif">{num}</text>
      )}
    </g>
  );
}

function SoccerBall({ x, y, phase, spin = 0 }) {
  const r = LIVE_BALL_R;
  const rot = spin + (phase === "shot" ? 220 : phase === "pass" || phase === "through" ? 140 : 60);
  return (
    <g transform={`translate(${x},${y}) rotate(${rot})`}>
      <circle r={r * 1.15} fill="rgba(0,0,0,0.25)" />
      <circle r={r} fill="#f8f8f2" stroke="#1c1c1c" strokeWidth={r * 0.14} />
      <circle r={r * 0.28} cx={r * 0.35} cy={-r * 0.35} fill="#fff" opacity="0.55" />
    </g>
  );
}

const PITCH_PORTRAIT_AR = `${PITCH_REAL_M.width} / ${PITCH_REAL_M.length}`;
const PITCH_LANDSCAPE_AR = `${PITCH_REAL_M.length} / ${PITCH_REAL_M.width}`;
const PITCH_GRASS_STRIPES_PORTRAIT = `repeating-linear-gradient(90deg, ${C.pitch} 0%, ${C.pitch} 5.5%, #163526 5.5%, #163526 11%)`;
const PITCH_GRASS_STRIPES_LANDSCAPE = `repeating-linear-gradient(0deg, ${C.pitch} 0%, ${C.pitch} 5.5%, #163526 5.5%, #163526 11%)`;
const LIVE_PITCH_BG = PITCH_GRASS_STRIPES_LANDSCAPE;

function PitchMarkingsSVG({ layout = "portrait", opacity = 0.42 }) {
  const portrait = layout === "portrait";
  const w = portrait ? PITCH_REAL_M.width : PITCH_REAL_M.length;
  const h = portrait ? PITCH_REAL_M.length : PITCH_REAL_M.width;
  const line = C.pitchLine;
  const sw = 0.26;
  const m = 1.15;
  const cx = w / 2;
  const cy = h / 2;
  const penD = 16.5;
  const penW = 40.32;
  const goalD = 5.5;
  const goalW = 18.32;
  const cr = 9.15;
  const px1 = (w - penW) / 2;
  const gx1 = (w - goalW) / 2;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", display: "block" }}>
      <rect x={m} y={m} width={w - m * 2} height={h - m * 2} fill="none" stroke={line} strokeWidth={sw} opacity={opacity} />
      {portrait ? (
        <>
          <line x1={m} y1={cy} x2={w - m} y2={cy} stroke={line} strokeWidth={sw} opacity={opacity} />
          <rect x={px1} y={m} width={penW} height={penD} fill="none" stroke={line} strokeWidth={sw} opacity={opacity} />
          <rect x={gx1} y={m} width={goalW} height={goalD} fill="none" stroke={line} strokeWidth={sw} opacity={opacity} />
          <rect x={px1} y={h - m - penD} width={penW} height={penD} fill="none" stroke={line} strokeWidth={sw} opacity={opacity} />
          <rect x={gx1} y={h - m - goalD} width={goalW} height={goalD} fill="none" stroke={line} strokeWidth={sw} opacity={opacity} />
        </>
      ) : (
        <>
          <line x1={cx} y1={m} x2={cx} y2={h - m} stroke={line} strokeWidth={sw} opacity={opacity} />
          <rect x={m} y={px1} width={penD} height={penW} fill="none" stroke={line} strokeWidth={sw} opacity={opacity} />
          <rect x={m} y={gx1} width={goalD} height={goalW} fill="none" stroke={line} strokeWidth={sw} opacity={opacity} />
          <rect x={w - m - penD} y={px1} width={penD} height={penW} fill="none" stroke={line} strokeWidth={sw} opacity={opacity} />
          <rect x={w - m - goalD} y={gx1} width={goalD} height={goalW} fill="none" stroke={line} strokeWidth={sw} opacity={opacity} />
        </>
      )}
      <circle cx={cx} cy={cy} r={cr} fill="none" stroke={line} strokeWidth={sw} opacity={opacity} />
      <circle cx={cx} cy={cy} r={0.35} fill={line} opacity={opacity * 0.85} />
    </svg>
  );
}

function LivePlayerDotHtml({ x, y, shirtColor, gkColor, num, isGK, isCarrier }) {
  const fill = isGK ? gkColor : shirtColor;
  const r = isGK ? LIVE_GK_R : LIVE_PLAYER_R;
  const d = `${r * 2 * 0.92}%`;
  const lum = 0.299 * parseInt(fill.slice(1, 3), 16) + 0.587 * parseInt(fill.slice(3, 5), 16) + 0.114 * parseInt(fill.slice(5, 7), 16);
  const textCol = lum > 145 ? "#1a1a1a" : "#fff";
  const strokeCol = isCarrier ? "#fff" : "rgba(255,255,255,0.92)";
  const strokeW = isCarrier ? "2.5px" : "1.5px";
  return (
    <div style={{
      position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)",
      width: d, aspectRatio: "1", borderRadius: "50%",
      background: fill, border: `${strokeW} solid ${strokeCol}`,
      boxShadow: isCarrier ? "0 0 0 2px rgba(255,255,255,.55), 0 2px 6px rgba(0,0,0,.45)" : "0 2px 5px rgba(0,0,0,.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "clamp(7px, 42%, 13px)", fontWeight: 800, color: textCol,
      fontFamily: "Arial,sans-serif", lineHeight: 1, zIndex: Math.round(y),
    }}>
      {num}
    </div>
  );
}

function LiveBallHtml({ x, y }) {
  const d = `${LIVE_BALL_R * 2 * 0.95}%`;
  return (
    <div style={{
      position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)",
      width: d, aspectRatio: "1", borderRadius: "50%",
      background: "radial-gradient(circle at 35% 30%, #fff 0%, #f4f4ee 55%, #ddd 100%)",
      border: "1.5px solid #1c1c1c",
      boxShadow: "0 2px 5px rgba(0,0,0,.35)",
      zIndex: 999,
    }} />
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
  const gf = GRASS_FRAME;

  return (
    <div style={{
      borderRadius: 12, overflow: "hidden", border: `2px solid ${C.steel}`,
      boxShadow: "0 8px 28px rgba(0,0,0,.45)", background: C.pitchDark,
    }}>
      <div style={{
        position: "relative", width: "100%", aspectRatio: `${STADIUM_ASSETS.aspect}`,
        background: LIVE_PITCH_BG,
      }}>
        {/* สนามรอบนอก — letterbox ด้านข้าง/บนล่างเป็นสีหญ้าเกม ไม่ขาว */}
        <img
          src={STADIUM_ASSETS.stadium}
          alt=""
          draggable={false}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none", userSelect: "none" }}
        />
        {/* หญ้า + เส้นสนาม + จุดผู้เล่น — สัดส่วน 105×68 ม. เต็ม cutout */}
        <div style={{
          position: "absolute",
          left: `${gf.left}%`, top: `${gf.top}%`, width: `${gf.width}%`, height: `${gf.height}%`,
          overflow: "hidden", borderRadius: "2.5% 2.5% 1.8% 1.8%",
          background: LIVE_PITCH_BG,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            position: "relative", width: "100%", maxHeight: "100%",
            aspectRatio: PITCH_LANDSCAPE_AR, background: LIVE_PITCH_BG,
          }}>
            <PitchMarkingsSVG layout="landscape" />
            {allPlayers.map((p) => (
              <LivePlayerDotHtml key={p.key} x={p.x} y={p.y}
                shirtColor={teamShirtColor(p.team)}
                gkColor={gkKitColor(p.team, p.side)}
                num={p.shirtNum}
                isGK={p.isGK} isCarrier={p.isCarrier} />
            ))}
            <LiveBallHtml x={ballScreen.x} y={ballScreen.y} />
          </div>
        </div>
      </div>
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
          <button key={p.id} onClick={() => setOutId(p.id)} style={{ fontSize: 11, padding: "5px 8px", borderRadius: 6, border: `1px solid ${outId === p.id ? C.crimson : C.steel}`, background: outId === p.id ? "rgba(193,68,14,.2)" : "transparent", color: C.chalk, cursor: "pointer" }}>{p.name} ({playerPosCode(p)})</button>
        ))}
      </div>
      {outId && (
        <>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4 }}>ตัวสำรอง ({playerPosTH(mySquad.find((p) => p.id === outId))}) — แตะเพื่อส่งลง</div>
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
/* ---------- บอร์ดซ้อมรายตำแหน่ง (สไตล์ Top Eleven) ---------- */
function DrillCard({ drillId, onRemove }) {
  const d = DRILLS[drillId];
  if (!d) return null;
  return (
    <div style={{ position: "relative", flex: "0 0 auto", width: 84, borderRadius: 8, padding: "8px 5px 6px", background: "linear-gradient(160deg,#1d4a2a,#12331d)", border: "1px solid #2f6b3f", textAlign: "center" }}>
      {onRemove && (
        <button type="button" onClick={onRemove} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: 9, border: "1px solid #6b2c2c", background: "#3a1717", color: "#e08a8a", fontSize: 10, lineHeight: "15px", cursor: "pointer", padding: 0 }}>✕</button>
      )}
      <div style={{ fontSize: 20 }}>{d.icon}</div>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: "#dff0e2", marginTop: 3, lineHeight: 1.25, minHeight: 24 }}>{d.name}</div>
      <div style={{ fontSize: 7.5, color: "#9fc7a8", marginTop: 1 }}>{d.attrs.map((a) => ATTR_TH[a]).join("·")}</div>
      <div style={{ fontSize: 8.5, color: C.amber, marginTop: 2, fontFamily: MONO_FONT }}>-{d.cond}%</div>
    </div>
  );
}
function DrillBoard({ drillPlans, drillDoneDay, currentDay, squad, staff, onSetDrillPlan, onAutoDrills, onRunDrills, onAutoAnalystDrills, hasAnalyst }) {
  const [pickerGroup, setPickerGroup] = useState(null);
  return (
    <Panel style={{ border: `1px solid ${C.good}` }}>
      <SectionLabel style={{ color: C.good }} sub="จัดคิวท่าซ้อมแยกตามกลุ่มตำแหน่ง สูงสุด 6 ท่า/กลุ่ม · ซ้อมวันละ 1 เซสชัน (ไม่กดเอง = ซ้อมอัตโนมัติตอนจบวัน)">🏟️ บอร์ดซ้อมรายตำแหน่ง</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {DRILL_GROUPS.map((g) => {
          const plan = (drillPlans[g] || []).filter((id) => DRILLS[id]);
          const cost = drillPlanCost(plan);
          const doneToday = drillDoneDay[g] === currentDay;
          const ready = (squad || []).filter((p) => p.position === g && p.injuryDays <= 0).length;
          const coach = (staff || {})[g];
          const pickerOpen = pickerGroup === g;
          return (
            <div key={g} style={{ borderRadius: 10, border: `1px solid ${C.steel}`, background: C.panel2, padding: "8px 8px 8px 0", display: "flex", alignItems: "stretch", gap: 8 }}>
              <div style={{ flex: "0 0 54px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, borderRight: `1px solid ${C.steel}`, padding: "0 4px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#08150e", background: POS_COLOR[g], borderRadius: 6, padding: "3px 8px", fontFamily: MONO_FONT }}>{g}</div>
                <div style={{ fontSize: 8.5, color: C.textDim, textAlign: "center" }}>{ready} คนพร้อม</div>
                {coach && <div style={{ fontSize: 8.5, color: C.good }}>⚡ โค้ช</div>}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                <DragScroll style={{ display: "flex", gap: 6, paddingTop: 7, paddingBottom: 2 }}>
                  {plan.map((id, idx) => (
                    <DrillCard key={`${id}_${idx}`} drillId={id} onRemove={() => onSetDrillPlan(g, plan.filter((_, i) => i !== idx))} />
                  ))}
                  {plan.length < MAX_DRILLS_PER_GROUP && (
                    <button type="button" onClick={() => setPickerGroup(pickerOpen ? null : g)} style={{ flex: "0 0 auto", width: 84, borderRadius: 8, border: `1.5px dashed ${pickerOpen ? C.good : C.steel}`, background: "transparent", color: pickerOpen ? C.good : C.textDim, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                      {pickerOpen ? "ปิด" : "+ เพิ่มท่า"}
                    </button>
                  )}
                  {plan.length === 0 && (
                    <>
                      <button type="button" onClick={() => onAutoDrills(g)} style={{ flex: "0 0 auto", padding: "0 12px", borderRadius: 8, border: `1px solid ${C.purple}`, background: "transparent", color: C.purple, cursor: "pointer", fontSize: 10.5, fontWeight: 700 }}>ให้โค้ชจัดให้</button>
                      {hasAnalyst && onAutoAnalystDrills && (
                        <button type="button" onClick={() => onAutoAnalystDrills(g)} style={{ flex: "0 0 auto", padding: "0 10px", borderRadius: 8, border: `1px solid ${C.blue}`, background: "rgba(90,155,213,.12)", color: C.blue, cursor: "pointer", fontSize: 10, fontWeight: 700 }}>📊 Analyst</button>
                      )}
                    </>
                  )}
                </DragScroll>
                {pickerOpen && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", padding: "6px 6px", borderRadius: 8, background: "rgba(0,0,0,.22)", border: `1px solid ${C.steel}` }}>
                    {Object.entries(DRILLS).filter(([, d]) => d.groups.includes(g)).map(([id, d]) => (
                      <button key={id} type="button" onClick={() => { onSetDrillPlan(g, [...plan, id]); if (plan.length + 1 >= MAX_DRILLS_PER_GROUP) setPickerGroup(null); }} style={{ fontSize: 9.5, padding: "4px 8px", borderRadius: 6, border: `1px solid #2f6b3f`, background: "#12331d", color: "#dff0e2", cursor: "pointer" }}>
                        {d.icon} {d.name} <span style={{ color: C.amber }}>-{d.cond}%</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ flex: "0 0 92px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 5 }}>
                <div style={{ fontSize: 8.5, color: C.textDim, textAlign: "center", lineHeight: 1.3 }}>คอนดิชัน<br /><b style={{ color: cost > 0 ? C.amber : C.textDim, fontFamily: MONO_FONT, fontSize: 11 }}>-{cost}%</b></div>
                <button type="button" disabled={doneToday || plan.length === 0 || ready === 0} onClick={() => onRunDrills(g)} style={{
                  fontSize: 10.5, fontWeight: 800, padding: "7px 4px", borderRadius: 7, border: "none", cursor: doneToday || plan.length === 0 || ready === 0 ? "default" : "pointer",
                  background: doneToday ? "#22352a" : plan.length === 0 || ready === 0 ? "#2b332f" : C.good,
                  color: doneToday ? C.good : plan.length === 0 || ready === 0 ? C.textDim : "#08150e",
                }}>{doneToday ? "ซ้อมแล้ว ✓" : "ซ้อมเลย!"}</button>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: C.textDim, marginTop: 8, lineHeight: 1.5 }}>ทุกท่าบอกสเตตที่ได้ + แรงที่ใช้ · ⚡ = มีโค้ชสายนั้น ได้ผลซ้อมเพิ่ม · นักเตะเจ็บไม่ร่วมซ้อม · ซ้อมนอกเหนือจากปฏิทินฝึกทีม 10 วันด้านล่าง</div>
    </Panel>
  );
}

function TrainingAnalystPanel({ squad, staffBonuses, onSetFocus, onAutoAnalystAll }) {
  const pack = buildSquadTrainingRecommendations(
    (squad || []).filter((p) => p.injuryDays <= 0),
    DRILLS,
    staffBonuses || {},
    { attrLabel: (k) => ATTR_TH[k] || k },
  );
  const { recs, hasAnalyst, analystName } = pack;
  return (
    <Panel style={{ border: `1px solid ${hasAnalyst ? C.blue : C.steel}` }}>
      <SectionLabel style={{ color: hasAnalyst ? C.blue : C.textDim }} sub={hasAnalyst ? `${analystName || "Data Analyst"} วิเคราะห์จุดอ่อนรายคน · กดใส่โฟกัสหรือจัดบอร์ดซ้อม` : "จ้าง Data Analyst จากการ์ดสตาฟเพื่อเห็นรายละเอียดและคำแนะนำมากขึ้น"}>
        📊 แนะนำการฝึก{hasAnalyst ? " (Analyst)" : ""}
      </SectionLabel>
      {hasAnalyst && onAutoAnalystAll && (
        <button type="button" onClick={onAutoAnalystAll} style={{ ...btnStyle(C.blue, "#08150e"), width: "100%", marginBottom: 10, fontSize: 11, padding: "8px 0" }}>
          จัดบอร์ดซ้อมทุกตำแหน่งตาม Analyst
        </button>
      )}
      {recs.length === 0 ? (
        <div style={{ fontSize: 11, color: C.textDim }}>ทีมฟิตดี — ไม่มีจุดที่ต้องเร่งซ้อมเร่งด่วน</div>
      ) : (
        <CardListScroll style={{ maxHeight: 220, gap: 6 }}>
          {recs.map((rec) => (
            <div key={rec.playerId} style={{ padding: "8px 10px", borderRadius: 8, background: C.panel2, border: `1px solid ${C.steel}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{rec.name} <span style={{ color: C.textDim, fontSize: 10 }}>{rec.pos || rec.position}</span></div>
                {onSetFocus && (
                  <button type="button" onClick={() => onSetFocus(rec.playerId, rec.focusType)} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 5, border: `1px solid ${TRAINING_COLOR[rec.focusType]}`, background: TRAINING_COLOR[rec.focusType], color: "#08150e", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                    โฟกัส {TRAINING_TH[rec.focusType]}
                  </button>
                )}
              </div>
              <div style={{ fontSize: 10, color: C.textDim, lineHeight: 1.45 }}>{rec.reason}</div>
              {hasAnalyst && rec.drillIds?.length > 0 && (
                <div style={{ fontSize: 9, color: C.blue, marginTop: 4 }}>
                  ท่าแนะนำ: {rec.drillIds.map((d) => `${d.icon || ""}${d.name}`).join(" · ")}
                </div>
              )}
            </div>
          ))}
        </CardListScroll>
      )}
    </Panel>
  );
}

function TrainingReportPanel({ reports, currentDay }) {
  const [openDay, setOpenDay] = useState(null);
  const list = (reports || []).slice(0, 7);
  const today = list.find((r) => r.day === currentDay) || list[0];
  const shown = openDay != null ? list.find((r) => r.day === openDay) : today;
  return (
    <Panel style={{ border: `1px solid ${C.amber}` }}>
      <SectionLabel style={{ color: C.amber }} sub={`เก็บย้อนหลัง ${list.length} วัน · สรุปสเตตที่ขึ้นหลังฝึก`}>📋 รายงานการฝึกซ้อม</SectionLabel>
      {list.length === 0 ? (
        <div style={{ fontSize: 11, color: C.textDim }}>ยังไม่มีรายงาน — จะสร้างอัตโนมัติทุกวันหลังฝึก</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {list.map((r) => (
              <button key={`${r.season}_${r.day}`} type="button" onClick={() => setOpenDay(r.day === openDay ? null : r.day)} style={{
                fontSize: 9.5, padding: "4px 8px", borderRadius: 6, cursor: "pointer",
                border: `1px solid ${shown?.day === r.day ? C.amber : C.steel}`,
                background: shown?.day === r.day ? "rgba(212,175,55,.15)" : "transparent",
                color: shown?.day === r.day ? C.amber : C.textDim, fontWeight: shown?.day === r.day ? 700 : 500,
              }}>ว.{r.day}{r.day === currentDay ? " · วันนี้" : ""}</button>
            ))}
          </div>
          {shown && (
            <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.55 }}>
              <div style={{ marginBottom: 6 }}>
                <b style={{ color: TRAINING_COLOR[shown.trainingType] || C.chalk }}>{shown.trainingLabel || shown.trainingType}</b>
                {shown.isRestDay ? " · วันพัก" : ` · ช่อง ${(shown.slotIdx ?? 0) + 1}/10`}
                {shown.skippedMatchCount > 0 && ` · ข้ามตัวจริง ${shown.skippedMatchCount} คน`}
              </div>
              {shown.drillSummary?.length > 0 && (
                <div style={{ marginBottom: 6 }}>🏟️ ซ้อมรายตำแหน่ง: {shown.drillSummary.join(" · ")}</div>
              )}
              {shown.topGainers?.length > 0 ? (
                <CardListScroll style={{ maxHeight: 160, gap: 4 }}>
                  {shown.topGainers.map((row) => (
                    <div key={row.id} style={{ fontSize: 10.5, padding: "4px 0", borderTop: `1px solid ${C.steel}` }}>
                      <span style={{ fontWeight: 700, color: C.chalk }}>{row.name}</span>
                      <span style={{ color: C.good, fontFamily: MONO_FONT, marginLeft: 6 }}>{formatDeltaSummary(row.deltas, (k) => ATTR_TH[k], 4)}</span>
                    </div>
                  ))}
                </CardListScroll>
              ) : (
                <div>ไม่มีสเตตขึ้นเด่นชัดวันนี้{shown.isRestDay ? " (วันพัก)" : ""}</div>
              )}
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

function TrainingView({
  trainingPlan, autoTraining, currentSlot, onSetDay, onToggleAuto, onAutoAssign, facilities, budget, onUpgradeFacility, globalFanbase,
  squad, staff, individualFocus, onSetFocus, campCooldownDay, currentDay, onRunCamp,
  drillPlans, drillDoneDay, onSetDrillPlan, onAutoDrills, onRunDrills,
  trainingReports, staffBonuses, onAutoAnalystDrills, onAutoAnalystAll, constructionQueue,
}) {
  const focusSlots = (facilities || {}).techLab || 1;
  const focusUsed = Object.keys(individualFocus || {}).length;
  const campCost = trainingCampCost(facilities);
  const campReady = currentDay >= (campCooldownDay || 0);
  const campDaysLeft = campReady ? 0 : (campCooldownDay || 0) - currentDay;
  const eligibleFocusPlayers = (squad || []).filter((p) => p.injuryDays <= 0).sort((a, b) => b.rating - a.rating);
  return (
    <div className="fc-training-split">
      <div className="fc-training-side" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Panel>
          <SectionLabel sub="ห้องพยาบาลย้ายไปแท็บ 🏥 ห้องพยาบาล (เมนูเพิ่มเติม) แล้ว">ศูนย์ฝึกสโมสร</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FACILITY_TYPES.filter((type) => type !== "medical").map((type) => {
              const level = (facilities || {})[type] || 1;
              const cost = facilityUpgradeCost(level);
              const tierCap = getMaxRoomLevel(globalFanbase || 0);
              const maxed = level >= Math.min(9, tierCap);
              const queued = (constructionQueue || []).find((q) => q.kind === "facility" && q.facilityType === type);
              return (
                <div key={type} style={{ padding: "8px 10px", borderRadius: 8, background: C.panel2, border: `1px solid ${queued ? C.amber : C.steel}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{FACILITY_TH[type]} <span style={{ color: C.amber, fontFamily: MONO_FONT }}>Lv.{level}/{tierCap}</span></div>
                    {queued ? null : !maxed ? (
                      <button disabled={budget < cost} onClick={() => onUpgradeFacility(type)} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, border: "none", background: budget >= cost ? C.good : "#2b332f", color: budget >= cost ? "#08150e" : C.textDim, cursor: budget >= cost ? "pointer" : "not-allowed", fontWeight: 700 }}>อัปเกรด {formatMoney(cost)}</button>
                    ) : level >= 9 ? (
                      <span style={{ fontSize: 9.5, color: C.gold }}>สูงสุดแล้ว</span>
                    ) : (
                      <span style={{ fontSize: 9.5, color: C.textDim }}>🔒 Club Tier {level + 1}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10.5, color: C.textDim, marginBottom: 4 }}>{FACILITY_DESC[type]}</div>
                  {queued ? <ConstructionBadge queued={queued} /> : <MiniBar value={(level / 9) * 100} color={C.amber} />}
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel style={{ border: `1px solid ${C.purple}` }}>
          <SectionLabel style={{ color: C.purple }}>โปรแกรมฝึก 10 วัน</SectionLabel>
          <div style={{ fontSize: 12, color: C.textDim, marginBottom: 10 }}>1 วันแข่ง ≈ 1 ช่องฝึกในรอบนี้ ถึงวันที่ 10 แล้ววนกลับมาวันที่ 1 ใหม่ วางแผนล่วงหน้าได้ว่าวันไหนพัก วันไหนซ้อมหนัก</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={onToggleAuto} style={{ ...btnStyle(autoTraining ? C.purple : C.steel, autoTraining ? "#fff" : C.chalk), flex: 1, minWidth: 140 }}>{autoTraining ? "ปิดออโต้ (จัดเอง)" : "เปิดให้โค้ชจัดอัตโนมัติ"}</button>
            <button type="button" onClick={onAutoAssign} style={{ ...btnStyle(C.purple, "#fff"), flex: 1, minWidth: 140 }}>จัดโปรแกรมใหม่</button>
          </div>
        </Panel>
        {onRunCamp && (
          <Panel style={{ border: `1px solid ${C.gold}` }}>
            <SectionLabel style={{ color: C.gold }} sub={`คูลดาวน์ ${TRAINING_CAMP_COOLDOWN_DAYS} วัน`}>🏕️ แคมป์ฝึกพิเศษ</SectionLabel>
            <div style={{ fontSize: 11, color: C.textDim, marginBottom: 8, lineHeight: 1.5 }}>ทีมชุดใหญ่ทั้งหมดได้พัฒนาการทันที + สตามินาเต็ม + มูดพุ่ง เหมาะใช้ก่อนช่วงลีกสำคัญ</div>
            {campReady ? (
              <button disabled={budget < campCost} onClick={onRunCamp} style={{ ...btnStyle(budget >= campCost ? C.gold : "#2b332f", budget >= campCost ? "#0a1210" : C.textDim), width: "100%", cursor: budget >= campCost ? "pointer" : "not-allowed" }}>
                จัดแคมป์ · {formatMoney(campCost)}
              </button>
            ) : (
              <div style={{ fontSize: 11, color: C.textDim, textAlign: "center", padding: "8px 0" }}>พักฟื้นระบบอีก {campDaysLeft} วัน</div>
            )}
          </Panel>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <TrainingAnalystPanel squad={squad} staffBonuses={staffBonuses} onSetFocus={onSetFocus} onAutoAnalystAll={onAutoAnalystAll} />
        <TrainingReportPanel reports={trainingReports} currentDay={currentDay} />
        <DrillBoard drillPlans={drillPlans || {}} drillDoneDay={drillDoneDay || {}} currentDay={currentDay}
          squad={squad} staff={staff} onSetDrillPlan={onSetDrillPlan} onAutoDrills={onAutoDrills} onRunDrills={onRunDrills}
          onAutoAnalystDrills={onAutoAnalystDrills} hasAnalyst={staffBonuses?.hasAnalyst} />
        <Panel>
          <SectionLabel>ปฏิทินฝึกซ้อม</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {trainingPlan.map((type, idx) => {
              const synergySpecs = Object.entries(COACH_TRAINING_SYNERGY[type] || {}).filter(([spec]) => staff && staff[spec]);
              return (
                <button key={idx} onClick={() => { if (!autoTraining) onSetDay(idx, TRAINING_TYPES[(TRAINING_TYPES.indexOf(type) + 1) % TRAINING_TYPES.length]); }} style={{
                  textAlign: "left", padding: "10px 12px", borderRadius: 10, cursor: autoTraining ? "default" : "pointer",
                  border: `2px solid ${idx === currentSlot ? C.amber : C.steel}`, background: idx === currentSlot ? "rgba(224,164,88,.12)" : C.panel2,
                }}>
                  <div style={{ fontSize: 10, color: C.textDim }}>วันที่ {idx + 1} {idx === currentSlot && "· วันนี้"}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: TRAINING_COLOR[type], marginTop: 2 }}>{TRAINING_TH[type]}</div>
                  {synergySpecs.length > 0 && (
                    <div style={{ fontSize: 9, color: C.good, marginTop: 2 }}>⚡ ตรงสาย {synergySpecs.map(([spec]) => STAFF_TH[spec]).join(", ")}</div>
                  )}
                </button>
              );
            })}
          </div>
          {!autoTraining && <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 10 }}>แตะการ์ดเพื่อวนเปลี่ยนประเภทการฝึกของวันนั้น · ⚡ = ตรงสายโค้ชที่มี ได้ผลฝึกเพิ่มขึ้น</div>}
        </Panel>
        <Panel>
          <SectionLabel>ผลของแต่ละประเภท</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5, color: C.textDim }}>
            <div><b style={{ color: TRAINING_COLOR.REST }}>พักฟื้น</b> — ฟื้นสตามินา +22 งดซ้อมรายตำแหน่ง ฟื้นตัวเพิ่มอีก +10 มูดดีขึ้น · ตัวจริงหลังแข่งจะพักอัตโนมัติแม้ไม่ใช่วันพัก</div>
            <div><b style={{ color: TRAINING_COLOR.FITNESS }}>ฟิตเนส</b> — เพิ่มความเร็ว/พละกำลัง/ความคล่องตัว · ตรงสายโค้ชฟิตเนส</div>
            <div><b style={{ color: TRAINING_COLOR.SHOOTING }}>ซ้อมยิงประตู</b> — เพิ่มยิงประตู/เลี้ยงบอล/ความนิ่ง · ตรงสายโค้ชกองหน้า</div>
            <div><b style={{ color: TRAINING_COLOR.DEFENDING }}>ซ้อมเกมรับ</b> — เพิ่มการตัดสินใจ/โหม่ง/วิสัยทัศน์ · ตรงสายโค้ช GK/กองหลัง</div>
            <div><b style={{ color: TRAINING_COLOR.TACKLING }}>ซ้อมสกัด/ปะทะ</b> — เพิ่มปะทะ-สกัด/พละกำลัง/ความมุ่งมั่น · ตรงสายโค้ชกองหลัง/กองกลาง</div>
            <div>ทุกประเภท (ยกเว้นพักฟื้น) ใช้สตามินาเพิ่มเล็กน้อย · อาจมีเหตุการณ์สุ่มเกิดขึ้นระหว่างฝึกได้</div>
          </div>
        </Panel>
        {onSetFocus && (
          <Panel style={{ border: `1px solid ${C.blue}` }}>
            <SectionLabel style={{ color: C.blue }} sub={`ใช้ช่อง ${focusUsed}/${focusSlots} · ปลดล็อกช่องเพิ่มโดยอัปเกรดเทคโนโลยีฝึกซ้อม`}>🎯 โฟกัสฝึกรายบุคคล</SectionLabel>
            <div style={{ fontSize: 11, color: C.textDim, marginBottom: 8, lineHeight: 1.5 }}>เลือกหมวดฝึกพิเศษให้นักเตะรายคน ได้ผลเพิ่มทุกวันโดยไม่ต้องรอตารางทีม</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
              {eligibleFocusPlayers.map((p) => {
                const current = (individualFocus || {})[p.id];
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: `1px solid ${C.steel}` }}>
                    <div style={{ flex: 1, fontSize: 12, fontWeight: current ? 700 : 500 }}>{p.name} <span style={{ color: C.textDim, fontSize: 10 }}>{playerPosCode(p)}</span></div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {INDIVIDUAL_FOCUS_TYPES.map((ft) => (
                        <button key={ft} type="button" onClick={() => onSetFocus(p.id, ft)} style={{
                          fontSize: 9, padding: "3px 6px", borderRadius: 5, cursor: "pointer",
                          border: `1px solid ${current === ft ? TRAINING_COLOR[ft] : C.steel}`,
                          background: current === ft ? TRAINING_COLOR[ft] : "transparent",
                          color: current === ft ? "#08150e" : C.textDim, fontWeight: current === ft ? 700 : 500,
                        }}>{TRAINING_TH[ft]}</button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

/* ============================== MEDICAL ROOM ============================== */
function MedicalRoomView({ career, squad, budget, inventory, onUseItemFromBag, onUpgradeFacility, onHireCoach, onHireCard }) {
  const injured = squad.filter((p) => p.injuryDays > 0).sort((a, b) => b.injuryDays - a.injuryDays);
  const fragile = squad.filter((p) => p.injuryDays <= 0 && isPlayerFragile(p, career.day));
  const packCount = inventory?.injury_pack || 0;
  const doctor = career.staff?.[career.userTeamId]?.PHYSIO;
  const physio = career.staff?.[career.userTeamId]?.PHYSIOTHERAPIST;
  const headMed = career.staff?.[career.userTeamId]?.HEAD_MEDICAL;
  const medicalLevel = (career.facilities || {}).medical || 1;
  const medicalCost = facilityUpgradeCost(medicalLevel);
  const medicalTierCap = getMaxRoomLevel(career.globalFanbase || 0);
  const medicalMaxed = medicalLevel >= medicalTierCap;
  const medicalCards = (career.staffCardBag || []).filter((c) => c.type === "DOCTOR");
  const medicalQueued = (career.constructionQueue || []).find((q) => q.kind === "facility" && q.facilityType === "medical");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel accent={injured.length > 0 ? C.crimson : C.good}>
        <SectionLabel sub={`${injured.length} คนบาดเจ็บ · ${packCount} ชุดปฐมพยาบาลในกระเป๋า`}>🏥 ห้องพยาบาล</SectionLabel>
        {injured.length === 0 ? (
          <div style={{ fontSize: 12, color: C.textDim }}>ไม่มีนักเตะบาดเจ็บตอนนี้ ✅</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {injured.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderTop: `1px solid ${C.steel}` }}>
                <RatingBadge value={p.rating} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: C.crimson, fontFamily: MONO_FONT }}>
                    {p.injuryType && (INJURY_TYPES[p.injurySeverity] || []).find((t) => t.id === p.injuryType)?.label}อีก {p.injuryDays} วัน
                  </div>
                </div>
                <button type="button" disabled={packCount <= 0} onClick={() => onUseItemFromBag("injury_pack", p.id)} style={{ fontSize: 10, padding: "6px 10px", borderRadius: 6, border: "none", fontWeight: 700, background: packCount > 0 ? C.good : "#2b332f", color: packCount > 0 ? "#08150e" : C.textDim, cursor: packCount > 0 ? "pointer" : "not-allowed" }}>
                  ใช้ 🩹
                </button>
              </div>
            ))}
          </div>
        )}
        {packCount === 0 && <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 8 }}>ไม่มีชุดปฐมพยาบาล — ไปซื้อที่ร้านค้า (10 เหรียญ · ซื้อได้วันละ 5 ครั้ง)</div>}
      </Panel>

      {fragile.length > 0 && (
        <Panel accent={C.amber}>
          <SectionLabel sub="เพิ่งหายเจ็บ — เสี่ยงกลับมาเจ็บซ้ำสูงกว่าปกติถ้าลงเล่นตอนนี้">⚠️ ช่วงเปราะบาง</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {fragile.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderTop: `1px solid ${C.steel}` }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 10.5, color: C.amber, fontFamily: MONO_FONT }}>เสี่ยงอีก {p.fragileUntilDay - career.day} วัน</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <StaffCardPickerRow cards={medicalCards} title="การ์ดหมอ/นักกายภาพที่สุ่มได้" career={career} onHire={onHireCard} />

      <Panel>
        <SectionLabel sub="หมอลดโอกาส/ความรุนแรงบาดเจ็บ · นักกายภาพเร่งพักฟื้นหลังบาดเจ็บ">ทีมแพทย์ — ผู้สมัครรายสัปดาห์</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <StaffOfferCard spec="PHYSIO" co={doctor} offer={career.coachOffers ? career.coachOffers.PHYSIO : null} locked={isStaffRoleLocked(doctor, career.season)} budget={budget} onHire={onHireCoach} />
          <StaffOfferCard spec="PHYSIOTHERAPIST" co={physio} offer={career.coachOffers ? career.coachOffers.PHYSIOTHERAPIST : null} locked={isStaffRoleLocked(physio, career.season)} budget={budget} onHire={onHireCoach} />
        </div>
        {headMed && (
          <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 6, background: "rgba(46,204,113,.08)", border: `1px solid ${C.good}`, fontSize: 11, lineHeight: 1.5 }}>
            ⚕️ หัวหน้าแพทย์: <b>{headMed.name}</b> ({headMed.cardStars || "?"}★)
            <div style={{ color: C.textDim, marginTop: 4 }}>{EXTRA_STAFF_EFFECTS.HEAD_MEDICAL.th}</div>
          </div>
        )}
      </Panel>

      <Panel>
        <SectionLabel>{FACILITY_TH.medical} <span style={{ color: C.amber, fontFamily: MONO_FONT }}>Lv.{medicalLevel}/{medicalTierCap}</span></SectionLabel>
        <div style={{ fontSize: 11.5, color: C.textDim, marginBottom: 8 }}>{FACILITY_DESC.medical}</div>
        {medicalQueued ? <ConstructionBadge queued={medicalQueued} /> : <MiniBar value={(medicalLevel / 9) * 100} color={C.amber} />}
        {!medicalQueued && (
          <div style={{ marginTop: 10 }}>
            {medicalMaxed ? (
              medicalLevel >= 9
                ? <span style={{ fontSize: 11, color: C.gold }}>อัปเกรดสูงสุดแล้ว</span>
                : <span style={{ fontSize: 11, color: C.textDim }}>🔒 ต้อง Club Tier {medicalLevel + 1} ก่อน (ดูที่แท็บสโมสร)</span>
            ) : (
              <button disabled={budget < medicalCost} onClick={() => onUpgradeFacility("medical")} style={{ fontSize: 11, padding: "7px 12px", borderRadius: 6, border: "none", background: budget >= medicalCost ? C.good : "#2b332f", color: budget >= medicalCost ? "#08150e" : C.textDim, cursor: budget >= medicalCost ? "pointer" : "not-allowed", fontWeight: 700 }}>
                อัปเกรด {formatMoney(medicalCost)}
              </button>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ============================== YOUTH ACADEMY ============================== */
function AcademyView({ career, budget, onHireScout, onHireScoutCard, onHireAcademyManager, onSignProspect, onLoanOut, onSellAcademy, onPromote }) {
  const scoutCards = (career?.staffCardBag || []).filter((c) => c.type === "SCOUT");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="fc-academy-grid">
        <Panel>
          <SectionLabel sub="แยกจากแมวมองทีมชุดใหญ่ในแท็บตลาด">แมวมองเยาวชน</SectionLabel>
          {career.youthScout ? (
            <div>
              <div style={{ fontSize: 12.5, fontFamily: MONO_FONT, color: C.textDim }}>{career.youthScout.name} · เกรด {career.youthScout.grade}/5 · ค่าเหนื่อย {formatMoney(career.youthScout.weeklyWage)}/วัน</div>
              {isStaffRoleLocked(career.youthScout, career.season) && (
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>🔒 เปลี่ยนแมวมองคนนี้ได้ตอนขึ้นฤดูกาลหน้า</div>
              )}
            </div>
          ) : career.youthScoutOffer ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{career.youthScoutOffer.name} (เกรด {career.youthScoutOffer.grade}/5)</div>
              <div style={{ fontSize: 11, color: C.textDim, fontFamily: MONO_FONT, margin: "4px 0 10px" }}>ค่าแรกเข้า {formatMoney(career.youthScoutOffer.signingCost)} · ค่าเหนื่อย {formatMoney(career.youthScoutOffer.weeklyWage)}/วัน</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={onHireScout} style={{ ...btnStyle(C.good, "#08150e"), flex: 1 }}>จ้าง</button>
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
              </div>
            </div>
          ) : <div style={{ fontSize: 12, color: C.textDim }}>รอผู้สมัครใหม่สัปดาห์หน้า</div>}
        </Panel>
      </div>

      <StaffCardPickerRow cards={scoutCards} title="การ์ดแมวมองที่สุ่มได้" career={career} onHire={onHireScoutCard} />

      <Panel>
        <SectionLabel>ดาวรุ่งที่แมวมองเยาวชนพบ ({career.youthProspects.length})</SectionLabel>
        {career.youthProspects.length === 0 && <div style={{ fontSize: 12, color: C.textDim }}>ยังไม่มี — จ้างแมวมองเยาวชนเพื่อเริ่มค้นหา</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {career.youthProspects.map((p) => (
            <div key={p.prospectId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.steel}` }}>
              <RatingBadge value={p.rating} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name} <span style={{ fontSize: 10, color: playerPosColor(p) }}>{playerPosTH(p)}</span>
                  {p.wonderkid && <span style={{ fontSize: 9, color: C.purple, marginLeft: 4 }}>🌟</span>}
                </div>
                <div style={{ fontSize: 11, color: C.textDim, fontFamily: MONO_FONT }}>อายุ {p.age} · ศักยภาพ {bandOf(p.potential)}{p.hype ? ` · ฮายป์ ${p.hype}` : ""}</div>
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
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name} <span style={{ fontSize: 10, color: playerPosColor(p) }}>{playerPosTH(p)}</span></div>
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
/** ตั้งค่าเสียง UI ทั่วเกม (แยกจากเสียงกองเชียในสนาม ซึ่งมีปุ่มปิด/เปิดของตัวเองในหน้า Live match) */
function SoundSettingsPanel() {
  const [muted, setMutedState] = useState(() => isSfxMuted());
  const [volume, setVolumeState] = useState(() => getSfxVolume());
  return (
    <Panel accent={C.purple}>
      <SectionLabel sub="เสียงกดปุ่ม/แจ้งเตือน/เงิน — แยกจากเสียงกองเชียในสนามแข่ง">🔊 เสียง UI</SectionLabel>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: C.chalk }}>เปิดเสียง UI</span>
        <button
          type="button"
          onClick={() => { const next = !muted; setSfxMuted(next); setMutedState(next); if (!next) playUiSound("confirm"); }}
          style={{ ...btnStyle(muted ? C.steel : C.good, muted ? C.textDim : "#08150e"), width: "auto", padding: "6px 16px", fontSize: 11, fontWeight: 700 }}
        >
          {muted ? "ปิดอยู่" : "เปิดอยู่"}
        </button>
      </div>
      <div style={{ opacity: muted ? 0.4 : 1, pointerEvents: muted ? "none" : "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: C.textDim, marginBottom: 4 }}>
          <span>ระดับเสียง</span>
          <span style={{ fontFamily: MONO_FONT }}>{volume}%</span>
        </div>
        <input
          type="range" min={0} max={100} value={volume}
          onChange={(e) => setVolumeState(Number(e.target.value))}
          onMouseUp={() => { setSfxVolume(volume); playUiSound("click"); }}
          onTouchEnd={() => { setSfxVolume(volume); playUiSound("click"); }}
          style={{ width: "100%" }}
        />
      </div>
    </Panel>
  );
}

function SettingsView({ career, onReset, onEnterOnline, onExitOnline, uiLang = "th", onSetUiLang, accountUser, onOpenAuth, onOpenOnlinePortal, onLogout }) {
  const [confirming, setConfirming] = useState(false);
  const fin = computeTeamFinances(career);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel accent={accountUser ? C.good : C.purple}>
        <SectionLabel>บัญชีออนไลน์</SectionLabel>
        {accountUser ? (
          <>
            <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.65, marginBottom: 10 }}>
              {accountUser.displayName || accountUser.username || accountUser.email}
              {accountUser.username && (
                <>
                  <br />
                  <span style={{ fontFamily: MONO_FONT, fontSize: 11, color: C.amber }}>@{accountUser.username}</span>
                </>
              )}
              {accountUser.email && !accountUser.username && (
                <>
                  <br />
                  <span style={{ fontFamily: MONO_FONT, fontSize: 11 }}>{accountUser.email}</span>
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => onEnterOnline?.()} style={{ ...btnStyle(C.good, "#08150e"), flex: 1, minWidth: 140 }}>
                🌐 ลีกออนไลน์
              </button>
              <button type="button" onClick={() => onLogout?.()} style={{ ...btnStyle(C.crimson, C.chalk), flex: 1, minWidth: 120 }}>
                ออกจากระบบ
              </button>
            </div>
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 8, lineHeight: 1.5 }}>
              ออกจากระบบแล้วกลับหน้าแรก · เซฟเกมยังอยู่ในเบราว์เซอร์ — ล็อกอิน Game ID เดิมเพื่อเล่นต่อ
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11.5, color: C.textDim, lineHeight: 1.65, marginBottom: 10 }}>
              บัญชี Game ID จำเป็นสำหรับการเล่น · ออกจากระบบแล้วต้อง login ใหม่เพื่อเข้าเกม
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => onOpenAuth?.(false)} style={{ ...btnStyle(C.steel, C.chalk), flex: 1 }}>เข้าสู่ระบบ</button>
              <button type="button" onClick={() => onOpenAuth?.(true)} style={{ ...btnStyle(C.amber, "#050608"), flex: 1 }}>สมัคร Game ID</button>
            </div>
          </>
        )}
      </Panel>
      <SandboxModePanel career={career} onEnterOnline={onEnterOnline} onExitOnline={onExitOnline} />
      <Panel accent={C.good}>
        <SectionLabel>{t(uiLang, "settings.language")}</SectionLabel>
        <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10, lineHeight: 1.55 }}>{t(uiLang, "settings.languageHint")}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {UI_LANGS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSetUiLang?.(opt.id)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 4,
                border: `1px solid ${uiLang === opt.id ? C.good : C.steel}`,
                background: uiLang === opt.id ? "rgba(61,186,106,.15)" : "transparent",
                color: uiLang === opt.id ? C.good : C.chalk,
                fontFamily: DISPLAY_FONT,
                fontWeight: 700,
                letterSpacing: 0.08,
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Panel>
      <SoundSettingsPanel />
      <Panel accent={C.blue}>
        <SectionLabel>Discord · Feedback</SectionLabel>
        <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10, lineHeight: 1.55 }}>{GAME_DISCORD_HINT}</div>
        <a
          href={GAME_DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...btnStyle("#5865F2", "#fff"), display: "inline-block", textDecoration: "none", textAlign: "center" }}
        >
          {GAME_DISCORD_LABEL}
        </a>
      </Panel>
      <Panel>
        <SectionLabel>{t(uiLang, "settings.careerInfo")}</SectionLabel>
        <div style={{ fontSize: 12.5, color: C.textDim, lineHeight: 1.8, fontFamily: MONO_FONT }}>
          {uiLang === "en" ? "Team" : "ทีม"}: {career.teams.find((t) => t.id === career.userTeamId).name}<br />
          {uiLang === "en" ? "Mode" : "โหมด"}: {career.playMode === "online" ? t(uiLang, "mode.online") : t(uiLang, "mode.sandboxFull")}<br />
          มูลค่าสโมสรรวม: {formatMoney(fin.teamValue)}<br />
          (นักเตะ {formatMoney(fin.squadValue)} · อคาเดมี {formatMoney(fin.academyValue)} · ศูนย์ฝึก {formatMoney(fin.facilitiesValue)} · งบ {formatMoney(fin.budget)})<br />
          ฤดูกาล: {career.season} · วันที่: {career.day}<br />
          ตลาดเปิด: 12:00-14:00 และ 18:00-22:00 (ตามเวลาเครื่องนี้)<br />
          ข้อมูลถูกบันทึกอัตโนมัติในเบราว์เซอร์นี้
        </div>
      </Panel>
      <Panel>
        <SectionLabel style={{ color: C.textDim }}>{t(uiLang, "settings.sandboxVsOnline")}</SectionLabel>
        <div style={{ fontSize: 11.5, color: C.textDim, lineHeight: 1.7 }}>
          โลกจำลอง = เล่นคนเดียวกับบอท ฝึกบริหารทีมโดยไม่กระทบผู้เล่นจริง
          <br />ปลดล็อกออนไลน์เมื่อมูลค่าสโมสรรวมทุกอย่าง ≥ 50M฿ และไม่ติดลบ
        </div>
      </Panel>
      <Panel>
        <SectionLabel>{t(uiLang, "settings.newCareer")}</SectionLabel>
        <div style={{ fontSize: 12, color: C.textDim, marginBottom: 10 }}>{t(uiLang, "settings.newCareerWarn")}</div>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} style={{ ...btnStyle("transparent", C.crimson), border: `1px solid ${C.crimson}` }}>{t(uiLang, "settings.resetBtn")}</button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onReset} style={{ ...btnStyle(C.crimson, "#fff"), flex: 1 }}>{t(uiLang, "settings.confirmDelete")}</button>
            <button onClick={() => setConfirming(false)} style={{ ...btnStyle(C.steel, C.chalk), flex: 1 }}>{t(uiLang, "settings.cancel")}</button>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ============================== SHOP ============================== */
function ShopView({ sockerCoins, inventory, shopBuyCount, onPurchasePack, onBuyItemToBag }) {
  const canBuyToday = shopBuyCount < SHOP_DAILY_BUY_LIMIT;
  const buysLeft = SHOP_DAILY_BUY_LIMIT - shopBuyCount;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel accent={C.gold}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <SectionLabel>ยอด Socker Coin</SectionLabel>
            <div style={{ fontFamily: MONO_FONT, fontSize: 28, fontWeight: 800, color: C.gold }}>🪙 {sockerCoins}</div>
          </div>
          <div style={{ fontSize: 10, color: C.textDim, textAlign: "right", maxWidth: 140, lineHeight: 1.5 }}>
            เหรียญพรีเมียม<br />ใช้ซื้อไอเทมในเกม
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionLabel sub="ชำระเงินจริง — เวอร์ชันทดลองกดซื้อได้ทันที">ซื้อ Socker Coin</SectionLabel>
        <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10, lineHeight: 1.55 }}>
          ระบบชำระเงินจริง (บัตร/พร้อมเพย์) จะเชื่อมในเวอร์ชันเปิดตัว — ตอนนี้กดเพื่อทดสอบในเกม
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {COIN_PACKAGES.map((pack) => (
            <button
              key={pack.id}
              type="button"
              onClick={() => onPurchasePack(pack.id)}
              style={{
                textAlign: "left", padding: "12px 10px", borderRadius: 8, cursor: "pointer",
                background: "rgba(212,175,55,.08)", border: `1px solid ${C.gold}`, color: C.chalk,
              }}
            >
              {pack.tag && <div style={{ fontSize: 9, color: C.gold, fontWeight: 700, marginBottom: 4 }}>{pack.tag}</div>}
              <div style={{ fontFamily: MONO_FONT, fontSize: 16, fontWeight: 800, color: C.gold }}>🪙 {pack.coins}</div>
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>{pack.priceLabel}</div>
            </button>
          ))}
        </div>
      </Panel>

      {SHOP_ITEMS.map((item) => {
        const canAfford = sockerCoins >= item.coinCost;
        const inBag = inventory?.[item.id] || 0;
        const canBuy = canAfford && canBuyToday;
        return (
          <Panel key={item.id} accent={C.blue}>
            <SectionLabel sub={`ราคา ${item.coinCost} เหรียญ · ซื้อได้วันละ ${SHOP_DAILY_BUY_LIMIT} ครั้ง`}>{item.name}</SectionLabel>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ fontSize: 36 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11.5, color: C.textDim, marginTop: 4, lineHeight: 1.55 }}>{item.desc}</div>
                {!item.instant && (
                  <div style={{ fontSize: 11, color: C.blue, marginTop: 8 }}>ในกระเป๋า: <b>{inBag}</b> ชิ้น · ซื้อได้อีก <b>{buysLeft}</b> ครั้งวันนี้</div>
                )}
              </div>
            </div>
            <button
              type="button"
              disabled={!canBuy}
              onClick={() => onBuyItemToBag(item.id)}
              style={{
                ...btnStyle(canBuy ? C.good : "#2b332f", canBuy ? "#08150e" : C.textDim),
                width: "100%", cursor: canBuy ? "pointer" : "not-allowed",
              }}
            >
              {!canBuyToday ? "ซื้อครบโควต้าวันนี้แล้ว" : !canAfford ? `เหรียญไม่พอ (ต้องการ ${item.coinCost})` : item.instant ? `ใช้ทันที 🪙${item.coinCost}` : `ซื้อเข้ากระเป๋า 🪙${item.coinCost}`}
            </button>
            {!item.instant && (
              <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 10, lineHeight: 1.55 }}>
                ใช้ไอเทมได้ที่ <b style={{ color: C.chalk }}>ตลาด → จัดการทีม → กระเป๋าไอเทม</b>
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}

/* ============================== STAFF CARDS (GACHA) ============================== */

/** ภาพยิ่งดาวต่ำยิ่งมืด/หม่น (เหมือนเงาลึกลับ) — มีแค่ 7★ เท่านั้นที่เห็นหน้าเต็มสีชัดเจน เป็นรางวัล
 * ของดาวสูงสุด. คืน filter CSS + ความเข้มของออร่าหลังภาพ (สีตาม starColor เดียวกับกรอบการ์ด) */
function staffPortraitTreatment(stars) {
  if (stars >= 7) return { filter: "none", auraAlpha: "cc" };
  const t = clamp((7 - stars) / 5, 0, 1); // 0 ที่ 6★ ... 1 ที่ 1★
  const brightness = (0.82 - t * 0.42).toFixed(2);
  const saturate = (0.55 - t * 0.42).toFixed(2);
  const contrast = (1.12 + t * 0.24).toFixed(2);
  return { filter: `brightness(${brightness}) saturate(${saturate}) contrast(${contrast})`, auraAlpha: "99" };
}

/** keyframes สำหรับอนิเมชันเปิดซอง — ฝังครั้งเดียว (ไฟล์นี้ไม่เคยมี <style> เลย จำเป็นเพราะ
 * inline style ทำ @keyframes ไม่ได้) ไม่กระทบส่วนอื่นของเกมที่ยังใช้ inline style ล้วนตามเดิม */
function PackOpenKeyframes() {
  return (
    <style>{`
      @keyframes pkShake {
        10%, 90% { transform: translateX(-2px) rotate(-1deg); }
        20%, 80% { transform: translateX(3px) rotate(1deg); }
        30%, 50%, 70% { transform: translateX(-5px) rotate(-2deg); }
        40%, 60% { transform: translateX(5px) rotate(2deg); }
      }
      @keyframes pkBurstOut {
        0% { transform: scale(1); opacity: 1; filter: brightness(1); }
        60% { transform: scale(1.15); opacity: 1; filter: brightness(2.4); }
        100% { transform: scale(0.2); opacity: 0; filter: brightness(3); }
      }
      @keyframes pkFlash {
        0% { opacity: 0; transform: scale(.2); }
        35% { opacity: 1; transform: scale(1.3); }
        100% { opacity: 0; transform: scale(2.2); }
      }
      @keyframes pkFlipIn {
        0% { opacity: 0; transform: rotateY(-100deg) translateY(14px) scale(.92); }
        55% { opacity: 1; }
        100% { opacity: 1; transform: rotateY(0deg) translateY(0) scale(1); }
      }
      @keyframes pkRingPop {
        0% { opacity: 0; transform: scale(.6); }
        45% { opacity: .9; transform: scale(1.15); }
        100% { opacity: 0; transform: scale(1.5); }
      }
      @media (prefers-reduced-motion: reduce) {
        .pk-shake, .pk-burst, .pk-flash, .pk-flip, .pk-ring { animation: none !important; }
      }
    `}</style>
  );
}

/** ซีเควนซ์เปิดซอง: สั่น/เรืองแสง (900ms) → ระเบิดแสง (450ms) → การ์ดพลิกทีละใบ (180ms/ใบ) → onDone
 * tierDef = STAFF_PACK_TIERS[key] (เอาสี/label), cards = ผลที่สุ่มมาแล้วจริงจาก onPull */
function StaffPackOpenSequence({ tierDef, cards, onDone }) {
  // แช่ชุดการ์ดไว้ตอนเมาท์ครั้งเดียว — กัน career/lastPull เปลี่ยนระหว่างเล่นอนิเมชัน (เช่น
  // ระบบรวมการ์ดอัตโนมัติทำงานพร้อมกัน) ทำให้ cards.length ขยับจนตัวนับเปิดใบไม่ถึงเงื่อนไขจบ
  // (บั๊กที่เจอจริง: โชว์ 9/10 ใบค้าง แล้วปุ่มปิดไม่โผล่เพราะ phase ไปไม่ถึง "done")
  const [snapshotCards] = useState(cards);
  const [phase, setPhase] = useState("charging"); // charging -> bursting -> revealing -> done
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("bursting"), 900);
    const t2 = setTimeout(() => setPhase("revealing"), 1350);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (phase !== "revealing") return;
    if (revealedCount >= snapshotCards.length) {
      const t = setTimeout(() => setPhase("done"), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRevealedCount((n) => n + 1), 180);
    return () => clearTimeout(t);
  }, [phase, revealedCount, snapshotCards.length]);

  // กันเหนียว: ถ้ามีสาเหตุอะไรก็ตามทำให้ phase ไม่ไปถึง "done" เอง (เช่นบั๊กที่ยังไม่รู้จัก)
  // บังคับให้ปุ่ม "ปิด" โผล่แน่ๆ หลังผ่านไป 7 วิ จะได้ไม่มีทางค้างจนกดปิดไม่ได้อีก
  useEffect(() => {
    const t = setTimeout(() => setPhase((p) => (p === "done" ? p : "done")), 7000);
    return () => clearTimeout(t);
  }, []);

  const charging = phase === "charging";
  const bursting = phase === "bursting";
  const showCards = phase === "revealing" || phase === "done";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <PackOpenKeyframes />
      {!showCards && (
        <div style={{ position: "relative", width: 240, height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {bursting && (
            <div className="pk-flash" style={{
              position: "absolute", inset: -60, borderRadius: "50%",
              background: `radial-gradient(circle, ${tierDef.color}f0 0%, ${tierDef.color}80 35%, transparent 70%)`,
              animation: "pkFlash .5s ease-out forwards",
            }} />
          )}
          <div className={charging ? "pk-shake" : bursting ? "pk-burst" : ""} style={{
            width: 168, height: 244,
            background: `linear-gradient(155deg, ${tierDef.color}, ${C.panel2} 130%)`,
            clipPath: "polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)",
            boxShadow: charging
              ? `0 20px 44px -14px rgba(0,0,0,.75), 0 0 40px 6px ${tierDef.color}aa`
              : "0 20px 44px -14px rgba(0,0,0,.75)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
            animation: charging ? "pkShake .55s cubic-bezier(.36,.07,.19,.97) infinite"
              : bursting ? "pkBurstOut .38s ease-in forwards" : "none",
          }}>
            <div style={{
              width: 74, height: 74, borderRadius: "50%",
              background: `radial-gradient(circle at 34% 28%, ${C.steelLight}, ${C.panel} 70%)`,
              border: `3px solid ${C.pitchDark}`, boxShadow: `0 0 0 3px ${tierDef.color}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30,
            }}>🎴</div>
            <div style={{ fontFamily: "'Arial Black','Segoe UI Black',sans-serif", fontStyle: "italic", fontSize: 15, letterSpacing: 1.5, color: C.pitchDark }}>
              {tierDef.label.toUpperCase()}
            </div>
          </div>
        </div>
      )}

      {showCards && (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", perspective: 1000 }}>
            {snapshotCards.map((card, i) => (
              <div key={card.cardId} style={{
                opacity: i < revealedCount ? 1 : 0,
                transform: i < revealedCount ? "none" : "rotateY(-100deg) translateY(14px) scale(.92)",
                animation: i < revealedCount ? "pkFlipIn .55s cubic-bezier(.2,.8,.3,1)" : "none",
                position: "relative",
              }}>
                {i < revealedCount && (
                  <div style={{
                    position: "absolute", inset: -10, borderRadius: "50%", filter: "blur(16px)",
                    background: `radial-gradient(circle, ${starColor(card.stars)}aa 0%, transparent 70%)`,
                    animation: "pkRingPop .7s ease-out .3s forwards", opacity: 0,
                  }} />
                )}
                <StaffPackCardFace card={card} />
              </div>
            ))}
          </div>
          {phase === "done" ? (
            <button type="button" onClick={onDone} style={{ ...btnStyle(C.amber, "#0b2318"), width: "auto", padding: "10px 24px" }}>
              ปิด
            </button>
          ) : (
            <button type="button" onClick={() => setPhase("done")} style={{ ...btnStyle("transparent", C.textDim), border: `1px solid ${C.steel}`, width: "auto", padding: "6px 14px", fontSize: 10.5 }}>
              ข้ามอนิเมชัน
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** การ์ดโชว์ผลตอนเปิดซอง (foil card ทรงเหรียญตัดมุม) — กรอบสีตามดาวของการ์ดนั้นๆ (starColor)
 * ใช้เฉพาะโซน "ผลการเปิด" เพื่อความตื่นเต้น ส่วนลิสต์จ้าง/กระเป๋ายังใช้ StaffCardTile แบบเดิม */
function StaffPackCardFace({ card }) {
  const stars = card.stars || 1;
  const tier = starColor(stars);
  const icon = STAFF_CARD_TYPE_ICON[card.type];
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const { filter: photoFilter, auraAlpha } = staffPortraitTreatment(stars);

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (0.5 - py) * 14, y: (px - 0.5) * 18 });
  }
  function handleMouseLeave() { setTilt({ x: 0, y: 0 }); }

  let roleLine, statRows;
  if (card.type === "MANAGER") {
    roleLine = `ผู้จัดการทีม · ถนัด ${card.preferredFormation}`;
    const entries = Object.entries(MANAGER_STAT_TH).map(([key, label]) => ({ key, label, val: card.stats?.[key] ?? 0 }));
    entries.sort((a, b) => b.val - a.val);
    statRows = entries.map((e, i) => ({ label: e.label, val: e.val, max: 99, strong: i < 2 }));
  } else if (card.type === "SCOUT") {
    roleLine = `สเกาต์ · ถนัด ${POS_TH[card.specialtyPos]}`;
    statRows = [
      { label: "โอกาสพบนักเตะ", val: Math.round((card.findChance || 0) * 100), max: 100, strong: true, suffix: "%" },
      { label: "คุณภาพที่พบ", val: card.qualityBoost || 0, max: 21, strong: false, suffix: "" },
      { label: "เกรด", val: card.grade || 1, max: 7, strong: false, suffix: "/7" },
    ];
  } else if (card.type === "COACH") {
    const c = ensureCoachProfile({ ...card }, card.specialty);
    roleLine = `${STAFF_CARD_TYPE_TH.COACH} · ${STAFF_TH[c.specialty]} · ${COACHING_STYLES[c.coachingStyle]?.th || ""}`;
    statRows = coachCardStatRows(c);
  } else if (EXTRA_STAFF_TYPES.includes(card.type)) {
    roleLine = STAFF_CARD_TYPE_TH[card.type];
    statRows = [
      { label: "โบนัสเฉพาะทาง", val: card.boost || 0, max: 1.1, strong: true, suffix: "" },
      { label: "เกรด", val: card.grade || 1, max: 7, strong: false, suffix: "/7" },
    ];
  } else if (card.type === "DOCTOR") {
    roleLine = `${STAFF_CARD_TYPE_TH[card.type]} · ${STAFF_TH[card.specialty]}`;
    statRows = [
      { label: "โบนัสเฉพาะทาง", val: card.boost || 0, max: 1.1, strong: true, suffix: "" },
      { label: "เกรด", val: card.grade || 1, max: 7, strong: false, suffix: "/7" },
    ];
  } else {
    roleLine = STAFF_CARD_TYPE_TH[card.type] || card.type;
    statRows = [
      { label: "เกรด", val: card.grade || 1, max: 7, strong: false, suffix: "/7" },
    ];
  }

  const tilting = tilt.x !== 0 || tilt.y !== 0;
  return (
    <div
      className="staff-pack-card"
      data-no-drag-scroll
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
      position: "relative", width: 168, height: 244, flexShrink: 0,
      background: `linear-gradient(155deg, ${tier}, ${C.panel2} 130%)`,
      clipPath: "polygon(18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%, 0 18px)",
      boxShadow: tilting
        ? "0 18px 34px -10px rgba(0,0,0,.75), inset 0 1px 0 rgba(255,255,255,.3)"
        : "0 10px 22px -8px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.25)",
      transform: `perspective(700px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${tilting ? 1.045 : 1})`,
      transition: "transform 0.15s ease-out, box-shadow 0.15s ease-out",
      willChange: "transform",
      overflow: "hidden",
    }}>
      {card.portrait && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 150, zIndex: 0,
          borderRadius: "50%", filter: "blur(20px)", opacity: 0.85,
          background: `radial-gradient(circle, ${tier}${auraAlpha} 0%, transparent 70%)`,
        }} />
      )}
      {card.portrait && (
        <img
          src={card.portrait}
          alt=""
          draggable={false}
          style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 128, width: "100%",
            objectFit: "cover", objectPosition: "center 18%", zIndex: 1,
            filter: photoFilter, pointerEvents: "none",
          }}
        />
      )}
      {card.portrait && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 128, zIndex: 2,
          background: "linear-gradient(180deg, rgba(7,21,16,.1) 0%, rgba(7,21,16,0) 34%, rgba(7,21,16,.7) 82%, rgba(7,21,16,.92) 100%)",
          pointerEvents: "none",
        }} />
      )}
      <div style={{ position: "relative", zIndex: 3, height: "100%", display: "flex", flexDirection: "column", padding: "12px 12px 10px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ lineHeight: 0.85, color: card.portrait ? tier : C.pitchDark, textShadow: card.portrait ? "0 2px 6px rgba(0,0,0,.7)" : "none" }}>
            <div style={{ fontSize: 22, fontWeight: 900, fontStyle: "italic" }}>{stars}</div>
            <div style={{ fontSize: 8, marginTop: 3, letterSpacing: 1 }}>{"★".repeat(stars)}</div>
          </div>
          <div style={{ fontSize: 15 }}>{icon}</div>
        </div>

        {!card.portrait && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{
              width: 62, height: 62, borderRadius: "50%",
              background: `radial-gradient(circle at 34% 28%, ${C.steelLight}, ${C.panel} 70%)`,
              border: `2px solid ${C.pitchDark}`, boxShadow: `0 0 0 2px ${tier}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
            }}>{icon}</div>
          </div>
        )}
        {card.portrait && <div style={{ flex: 1 }} />}

        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div style={{
            fontSize: 12.5, fontWeight: 700, color: card.portrait ? C.chalk : C.pitchDark,
            textShadow: card.portrait ? "0 2px 6px rgba(0,0,0,.6)" : "none",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{card.name}</div>
          <div style={{
            fontSize: 8.5, marginTop: 1,
            color: card.portrait ? tier : C.pitchDark, opacity: card.portrait ? 1 : 0.75,
            textShadow: card.portrait ? "0 1px 4px rgba(0,0,0,.7)" : "none",
          }}>{roleLine}</div>
        </div>

        <div style={{ height: 1, background: "rgba(7,21,16,.3)", margin: "0 2px 6px" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {statRows.map((s) => (
            <div key={s.label} style={{ display: "grid", gridTemplateColumns: "56px 1fr 24px", alignItems: "center", gap: 5 }}>
              <div style={{
                fontSize: 7.5, color: C.pitchDark, opacity: s.strong ? 1 : 0.75, fontWeight: s.strong ? 700 : 400,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{s.label}{s.strong ? " ★" : ""}</div>
              <div style={{ height: 3, borderRadius: 2, background: "rgba(7,21,16,.22)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, background: C.pitchDark, width: `${Math.min(100, (s.val / s.max) * 100)}%` }} />
              </div>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: C.pitchDark, textAlign: "right", fontFamily: MONO_FONT }}>
                {s.val}{s.suffix ?? ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** กองการ์ดในกระเป๋า (type+stars เดียวกัน) — ย่อเหลือ 1 ใบ + ป้าย ×N, กด "ดูทั้งหมด" เพื่อกางดูทุกใบ
 * (จำเป็นเพราะการ์ด MANAGER แต่ละใบสุ่มสเตตัสต่างกันในช่วงเดียวกัน — ใบไหนดีกว่าเลือกจ้างเองได้) */
function StaffCardStack({ group, career, onHire, onToggleLock }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? group.cards : group.cards.slice(0, 1);
  return (
    <div>
      <DragScroll style={{ display: "flex", gap: 10, paddingBottom: 2 }}>
        {shown.map((card) => {
          const lock = staffCardLockInfo(career, card);
          const canAfford = lock.afford !== false;
          return (
            <div key={card.cardId} style={{ position: "relative", flexShrink: 0 }}>
              <StaffPackCardFace card={card} />
              {onToggleLock && (
                <button type="button" onClick={() => onToggleLock(card.cardId)} title={card.locked ? "ปลดล็อก (กันไม่ให้รวม)" : "ล็อกกันรวม"} style={{
                  position: "absolute", top: 6, left: 6, width: 22, height: 22, borderRadius: "50%", padding: 0,
                  border: `1px solid ${card.locked ? C.amber : C.steel}`, cursor: "pointer",
                  background: card.locked ? "rgba(230,180,80,.9)" : "rgba(0,0,0,.55)",
                  color: card.locked ? "#1a1200" : C.chalk, fontSize: 11, lineHeight: "20px",
                }}>{card.locked ? "🔒" : "🔓"}</button>
              )}
              {!expanded && group.count > 1 && (
                <div style={{
                  position: "absolute", top: 6, right: 6, background: C.pitchDark, color: C.chalk,
                  fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999,
                  border: `1px solid ${C.steel}`, fontFamily: MONO_FONT,
                }}>×{group.count}</div>
              )}
              {onHire && (
                lock.locked ? (
                  <div style={{ marginTop: 6, fontSize: 8.5, color: C.textDim, textAlign: "center" }}>🔒 ล็อกฤดูกาลนี้</div>
                ) : (
                  <button type="button" disabled={!canAfford} onClick={() => onHire(card.cardId)} style={{
                    ...btnStyle(canAfford ? C.good : "#2b332f", canAfford ? "#08150e" : C.textDim),
                    width: 168, marginTop: 6, padding: "5px 0", fontSize: 9.5, cursor: canAfford ? "pointer" : "not-allowed",
                  }}>จ้าง{lock.fee > 0 ? ` · ค่าปรับ ${formatMoney(lock.fee)}` : ""}</button>
                )
              )}
            </div>
          );
        })}
      </DragScroll>
      {group.count > 1 && (
        <button type="button" onClick={() => setExpanded((v) => !v)} style={{
          background: "none", border: "none", color: C.blue, fontSize: 10.5,
          fontFamily: MONO_FONT, cursor: "pointer", padding: "4px 0",
        }}>{expanded ? "▲ ย่อกลับ" : `▼ ดูทั้งหมด (${group.count} ใบ)`}</button>
      )}
    </div>
  );
}

function StaffCardTile({ card, compact, onHire, locked, fee, afford }) {
  const sub = card.type === "COACH" || card.type === "DOCTOR"
    ? STAFF_TH[card.specialty]
    : card.type === "SCOUT"
      ? `ถนัด ${POS_TH[card.specialtyPos]}`
      : card.type === "MANAGER"
        ? card.preferredFormation
        : `เกรด ${card.grade}/7`;
  const statLine = staffCardStatLine(card);
  const canAfford = afford !== false;
  return (
    <div style={{
      padding: compact ? "6px 8px" : "8px 10px", borderRadius: 8,
      background: C.panel2, border: `1px solid ${starColor(card.stars)}`,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <div style={{ fontSize: compact ? 16 : 20, width: 28, textAlign: "center" }}>{STAFF_CARD_TYPE_ICON[card.type]}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: compact ? 11 : 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.name}</div>
        <div style={{ fontSize: 9.5, color: C.textDim, fontFamily: MONO_FONT }}>{STAFF_CARD_TYPE_TH[card.type]} · {sub}</div>
        {statLine && <div style={{ fontSize: 9.5, color: C.amber, fontFamily: MONO_FONT, marginTop: 1 }}>{statLine}</div>}
        {card.type === "MANAGER" && card.stars >= 1 && (
          <ManagerTierPerksList stars={card.stars} compact accent={starColor(card.stars)} />
        )}
        {fee > 0 && <div style={{ fontSize: 9, color: canAfford ? C.textDim : C.crimson, fontFamily: MONO_FONT, marginTop: 1 }}>ค่าปรับเลิกจ้างคนเดิม {formatMoney(fee)}{!canAfford ? " · งบไม่พอ" : ""}</div>}
        <StarGlyphs count={card.stars} size={compact ? 8 : 9} />
      </div>
      {onHire && (
        locked ? (
          <div style={{ fontSize: 8.5, color: C.textDim, textAlign: "center", flexShrink: 0, lineHeight: 1.3, padding: "3px 4px" }}>🔒 ล็อก<br />ฤดูกาลนี้</div>
        ) : (
          <button type="button" disabled={!canAfford} onClick={() => onHire(card.cardId)} style={{ ...btnStyle(canAfford ? C.good : "#2b332f", canAfford ? "#08150e" : C.textDim), width: "auto", padding: "5px 8px", fontSize: 9.5, flexShrink: 0, cursor: canAfford ? "pointer" : "not-allowed" }}>จ้าง</button>
        )
      )}
    </div>
  );
}

/** แถวการ์ดสตาฟแบบกดปุ่ม "เปลี่ยนการ์ด" แล้วเปิด modal เลือก — แทนที่ CardListScroll แนวนอนที่โชว์ทุกใบค้างอยู่ตลอด */
function StaffCardPickerRow({ cards, icon = "🎴", title, career, onHire }) {
  const [open, setOpen] = useState(false);
  if (!cards.length) return null;
  return (
    <>
      <Panel style={{ border: `1px solid ${C.blue}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <SectionLabel style={{ color: C.blue }} sub={`มี ${cards.length} ใบในกระเป๋า`}>{icon} {title}</SectionLabel>
          <button type="button" onClick={() => { setOpen(true); playUiSound("modalOpen"); }} style={{ ...btnStyle(C.blue, "#fff"), width: "auto", padding: "8px 14px", fontSize: 11, flexShrink: 0, whiteSpace: "nowrap" }}>
            เปลี่ยนการ์ด
          </button>
        </div>
      </Panel>
      {open && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 65, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => { setOpen(false); playUiSound("modalClose"); }}
        >
          <div style={{ background: C.panel, border: `1px solid ${C.blue}`, borderRadius: 10, padding: 16, maxWidth: 960, width: "95vw", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <SectionLabel style={{ color: C.blue }}>{icon} เลือกการ์ด — {title}</SectionLabel>
              <button onClick={() => { setOpen(false); playUiSound("modalClose"); }} style={{
                background: C.panel2, border: `1px solid ${C.steel}`, borderRadius: "50%",
                width: 32, height: 32, color: C.chalk, fontSize: 16, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>✕</button>
            </div>
            <div className="fc-scroll-x fc-hide-scrollbar" style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 10, paddingBottom: 4 }}>
              {cards.map((card) => (
                <div key={card.cardId} style={{ width: 240, flexShrink: 0 }}>
                  <StaffCardTile card={card} onHire={(id) => { onHire(id); setOpen(false); }} {...staffCardLockInfo(career, card)} />
                </div>
              ))}
            </div>
            <button onClick={() => setOpen(false)} style={{
              marginTop: 14, width: "100%", padding: "10px 0", borderRadius: 8,
              border: `1px solid ${C.steel}`, background: "transparent", color: C.textDim, fontSize: 12, cursor: "pointer",
            }}>ปิดหน้าต่าง</button>
          </div>
        </div>
      )}
    </>
  );
}

function MergeResultModal({ report, onClose }) {
  if (!report) return null;
  const ok = report.attempts.filter((a) => a.success).length;
  const fail = report.attempts.length - ok;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: C.panel, border: `1px solid ${C.purple}`, borderRadius: 10, padding: 16, maxWidth: 380, width: "100%", maxHeight: "80vh", overflowY: "auto" }}>
        <SectionLabel style={{ color: C.purple }} sub={report.auto ? "รวมอัตโนมัติ" : "รวมด้วยตัวเอง"}>✨ ผลการรวมการ์ด</SectionLabel>
        <div style={{ fontSize: 11.5, fontFamily: MONO_FONT, color: C.textDim, marginBottom: 10 }}>
          รวมทั้งหมด {report.attempts.length} ชุด · <span style={{ color: C.good }}>สำเร็จ {ok}</span> · <span style={{ color: C.crimson }}>ไม่สำเร็จ {fail}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {report.attempts.map((a, i) => (
            <div key={i} style={{ padding: "8px 10px", borderRadius: 8, background: C.panel2, border: `1px solid ${a.success ? C.good : C.steel}` }}>
              <div style={{ fontSize: 11, fontFamily: MONO_FONT, color: C.textDim, marginBottom: a.card ? 6 : 0 }}>
                {STAFF_CARD_TYPE_ICON[a.type]} {STAFF_CARD_TYPE_TH[a.type]} {a.stars}★ ×{MERGE_CARD_COUNT} → {a.success
                  ? <span style={{ color: C.good, fontWeight: 700 }}>สำเร็จ! ได้ {a.stars + 1}★</span>
                  : <span style={{ color: C.crimson }}>ไม่สำเร็จ (โอกาส {Math.round(a.chance * 100)}%)</span>}
              </div>
              {a.card && <StaffCardTile card={a.card} compact />}
            </div>
          ))}
        </div>
        <button type="button" onClick={onClose} style={{ ...btnStyle(C.purple, "#fff"), width: "100%", marginTop: 12 }}>ปิด</button>
      </div>
    </div>
  );
}

function ManagerHireConfirmModal({ name, stars, preferredFormation, weeklyWage, signingCost, terminationFee, daysLeft, currentName, budget, onConfirm, onCancel }) {
  const totalCost = (signingCost || 0) + (terminationFee || 0);
  const canAfford = totalCost === 0 || budget >= totalCost;
  const tier = stars ? managerTierDef(stars) : null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: C.panel, border: `1px solid ${C.gold}`, borderRadius: 10, padding: 16, maxWidth: 360, width: "100%" }}>
        <SectionLabel style={{ color: C.gold }}>ยืนยันแต่งตั้งผจก.</SectionLabel>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{name} {stars ? <StarGlyphs count={stars} size={9} /> : null}</div>
        <div style={{ fontSize: 11, color: C.textDim, fontFamily: MONO_FONT, marginBottom: 10 }}>
          ถนัด {preferredFormation} · ค่าเหนื่อย {formatMoney(weeklyWage)}/วัน
          {signingCost > 0 ? ` · ค่าแต่งตั้ง ${formatMoney(signingCost)}` : ""}
        </div>
        {tier && <ManagerTierPerksList stars={stars} perks={tier.perks} compact={false} />}
        {currentName && terminationFee > 0 && (
          <div style={{ fontSize: 11, color: C.crimson, marginBottom: 8, lineHeight: 1.55 }}>
            ⚠️ {currentName} ยังติดสัญญาเหลือ {daysLeft} วัน — ค่าปรับ {formatMoney(terminationFee)}
          </div>
        )}
        {totalCost > 0 && (
          <div style={{ fontSize: 11, color: C.amber, fontFamily: MONO_FONT, marginBottom: 10 }}>
            รวมจ่าย {formatMoney(totalCost)}
          </div>
        )}
        {!canAfford && totalCost > 0 && (
          <div style={{ fontSize: 11, color: C.crimson, marginBottom: 10 }}>งบไม่พอ</div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onCancel} style={{ ...fmBtnGhost(), flex: 1 }}>ยกเลิก</button>
          <button type="button" disabled={!canAfford} onClick={onConfirm} style={{ ...btnStyle(canAfford ? C.purple : "#2b332f", canAfford ? "#fff" : C.textDim), flex: 1 }}>ยืนยัน</button>
        </div>
      </div>
    </div>
  );
}

function StaffGuideView({ career, uiLang = "th" }) {
  const categories = staffGuideCategories(uiLang);
  const [cat, setCat] = useState("manager");
  const roles = staffGuideRolesByCategory(cat, uiLang);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Panel accent={C.blue}>
        <SectionLabel sub={t(uiLang, "staff.guideSub")}>📖 {t(uiLang, "staff.guideTitle")}</SectionLabel>
        <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.55 }}>
          {uiLang === "en"
            ? "Stars (★) and grade affect strength. Coach/doctor roles lock until season end if replaced mid-season."
            : "ดาว (★) และเกรดยิ่งสูงยิ่งแรง · โค้ช/หมอเปลี่ยนกลางฤดูกาลมีค่าปรับและล็อกจนจบฤดูกาล"}
        </div>
      </Panel>

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {categories.map((c) => {
          const active = cat === c.id;
          return (
            <button key={c.id} type="button" onClick={() => setCat(c.id)} style={{
              padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 10, fontWeight: 700,
              background: active ? "rgba(91,141,184,.2)" : C.panel2,
              border: `1px solid ${active ? C.blue : C.steel}`,
              color: active ? C.blue : C.textDim,
            }}>
              {c.icon} {c.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {roles.map((role) => {
          const hired = isStaffGuideRoleHired(career, role) || isStaffGuideSpecialHired(career, role.id);
          return (
            <Panel key={role.id} style={{ border: hired ? `1px solid ${C.good}` : undefined }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.chalk }}>
                    {role.icon} {role.title}
                  </div>
                  {role.subtitle && <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{role.subtitle}</div>}
                </div>
                {hired && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: C.good, background: "rgba(46,204,113,.12)",
                    border: `1px solid ${C.good}`, borderRadius: 4, padding: "2px 6px", flexShrink: 0,
                  }}>{t(uiLang, "staff.guideHired")}</span>
                )}
              </div>
              <div style={{ fontSize: 10, color: C.amber, fontWeight: 600, marginBottom: 4, letterSpacing: 0.5 }}>
                {t(uiLang, "staff.guideEffects")}
              </div>
              <ul style={{ margin: "0 0 8px 0", paddingLeft: 18, fontSize: 11, color: C.textDim, lineHeight: 1.55 }}>
                {role.effects.map((line, i) => <li key={i} style={{ marginBottom: 3 }}>{line}</li>)}
              </ul>
              <div style={{ fontSize: 10, color: C.textDim, borderTop: `1px solid ${C.steel}`, paddingTop: 6 }}>
                <span style={{ color: C.blue, fontWeight: 600 }}>{t(uiLang, "staff.guideWhere")}: </span>
                {role.hire}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

function StaffCardsView({ career, uiLang = "th", onPull, onPullOnline, onOpenPlatinum, onMerge, onHire, onAutoMerge, onToggleAutoTier, onToggleLock }) {
  const [sub, setSub] = useState("draw");
  const [openingTier, setOpeningTier] = useState(null);
  const [onlinePullBusy, setOnlinePullBusy] = useState(false);
  const [onlineDraws, setOnlineDraws] = useState(null);
  // เลือกการ์ดเองสำหรับรวม — key "type_stars" -> Set ของ cardId ที่ติ๊กไว้ (เฉพาะกลุ่มที่มีเกิน MERGE_CARD_COUNT
  // ใบ ถึงจะมีอะไรให้เลือก ไม่งั้นต้องใช้ทั้งหมดอยู่แล้วไม่มีทางเลือก)
  const [pickMode, setPickMode] = useState(() => new Set());
  const [pickedIds, setPickedIds] = useState(() => ({}));
  // สลับออกจากแท็บ "เปิดการ์ด" ระหว่างที่อนิเมชันเปิดซองค้างอยู่ → ถือว่าปิดไปแล้ว กันปัญหากลับมาแท็บ
  // เดิมแล้วอนิเมชันเล่นซ้ำ/ค้าง เพราะ openingTier ยังไม่ถูกเคลียร์ตอนสลับแท็บ
  useEffect(() => { if (sub !== "draw") setOpeningTier(null); }, [sub]);
  const isOnline = career.playMode === "online";
  // ออนไลน์: เซิร์ฟเวอร์เป็นคนคุมโควต้าฟรี/เหรียญตู้ (fetch ครั้งแรกตอนหยอดครั้งแรก เพื่อโชว์ตัวเลขจริง)
  useEffect(() => {
    if (!isOnline) return;
    fetchMyShardClub().then((c) => { if (c?.staffDraws) setOnlineDraws(c.staffDraws); }).catch(() => {});
  }, [isOnline]);
  const machineCoins = isOnline ? (onlineDraws?.tickets ?? 0) : (career.machineCoins ?? 0);
  const onlineFreeLeft = isOnline ? (onlineDraws?.freeLeft ?? 0) : 0;
  const onlineDailyLimit = isOnline ? (onlineDraws?.dailyLimit ?? DAILY_STAFF_CARD_DRAWS) : 0;
  const canPullMachine = isOnline ? (onlineFreeLeft > 0 || machineCoins > 0) : machineCoins >= MACHINE_PULL_COST;
  const platinumPacks = career.staffPlatinumPacks || 0;
  const bag = career.staffCardBag || [];
  const groups = groupStaffCards(bag);
  const bagIds = new Set(bag.map((c) => c.cardId));
  // Only show cards from the last pull that are still unused (not hired/merged away) so the list reflects the bag.
  const lastPull = (career.lastStaffPull || []).filter((c) => bagIds.has(c.cardId));
  const bagByType = STAFF_CARD_TYPES.map((type) => ({
    type,
    groups: groups.filter((g) => g.type === type),
    total: bag.filter((c) => c.type === type).length,
  }));

  const subTabs = [
    { id: "draw", label: uiLang === "en" ? "Draw" : "เปิดการ์ด", icon: "🎴" },
    { id: "bag", label: uiLang === "en" ? "Bag" : "กระเป๋า", icon: "🎒" },
    { id: "merge", label: uiLang === "en" ? "Merge" : "รวมการ์ด", icon: "✨" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel style={{ border: `1px solid ${C.amber}` }}>
        <SectionLabel style={{ color: C.amber }} sub={`${CARDS_PER_STAFF_PULL} ใบ/ซอง · จบลีกอันดับ 1-3 ได้ซอง Platinum`}>การ์ดสตาฟ</SectionLabel>
        <div style={{ display: "flex", gap: 12, fontSize: 11.5, fontFamily: MONO_FONT, color: C.textDim }}>
          {isOnline && <span>ฟรีวันนี้ <b style={{ color: C.good }}>{onlineFreeLeft}</b>/{onlineDailyLimit}</span>}
          <span>เหรียญตู้ <b style={{ color: C.gold }}>🪙 {machineCoins}</b></span>
          <span>ซอง Platinum <b style={{ color: "#b9e6ff" }}>{platinumPacks}</b></span>
          <span>กระเป๋า <b style={{ color: C.chalk }}>{bag.length}</b></span>
        </div>
        <div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>
          {isOnline
            ? "หยอดฟรีวันละ 3 ครั้ง — เกินโควต้าใช้เหรียญตู้ (หาได้จาก Battle Pass + จบฤดูกาลอันดับดี)"
            : `ได้เหรียญตู้วันละ ${DAILY_MACHINE_COIN_GRANT} + จบฤดูกาลอีก ${SEASON_END_MACHINE_COINS} (สะสมข้ามวันได้)`}
        </div>
      </Panel>

      <div style={{ display: "flex", gap: 6 }}>
        {subTabs.map((st) => {
          const active = sub === st.id;
          return (
            <button key={st.id} type="button" onClick={() => setSub(st.id)} style={{
              flex: 1, padding: "9px 4px", borderRadius: 8, cursor: "pointer", fontSize: 10.5, fontWeight: 700,
              background: active ? "rgba(224,164,88,.15)" : C.panel2,
              border: `2px solid ${active ? C.amber : C.steel}`,
              color: active ? C.amber : C.textDim,
            }}>
              <div style={{ fontSize: 14 }}>{st.icon}</div>{st.label}
            </button>
          );
        })}
      </div>

      {sub === "draw" && (
        <Panel style={{ position: "relative" }}>
          {openingTier ? (
            <>
              <button
                type="button"
                onClick={() => setOpeningTier(null)}
                style={{
                  position: "absolute", top: 8, right: 8, zIndex: 5,
                  background: C.panel2, border: `1px solid ${C.steel}`, borderRadius: "50%",
                  width: 30, height: 30, color: C.chalk, fontSize: 15, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >✕</button>
              <StaffPackOpenSequence
                key={openingTier.key + (lastPull[0]?.cardId || "")}
                tierDef={openingTier}
                cards={lastPull}
                onDone={() => setOpeningTier(null)}
              />
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 12, lineHeight: 1.6 }}>
                หยอดตู้ 1 ครั้ง (🪙{MACHINE_PULL_COST}) = สุ่มซอง Bronze/Silver/Gold ({CARDS_PER_STAFF_PULL} ใบ) — Bronze ออกบ่อยสุด, Gold หายากสุด (สูงสุด 5★)
              </div>
              <button
                type="button"
                disabled={!canPullMachine || onlinePullBusy}
                onClick={async () => {
                  if (isOnline) {
                    setOnlinePullBusy(true);
                    try {
                      const res = await onPullOnline();
                      if (res) { setOnlineDraws(res.staffDraws); setOpeningTier(res.tier); }
                    } finally {
                      setOnlinePullBusy(false);
                    }
                  } else {
                    const tier = onPull();
                    if (tier) setOpeningTier(tier);
                  }
                }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "14px 16px", borderRadius: 10, cursor: canPullMachine ? "pointer" : "not-allowed",
                  background: canPullMachine ? "linear-gradient(135deg, rgba(224,164,88,.25), rgba(224,164,88,.08))" : "#1a221c",
                  border: `2px solid ${canPullMachine ? C.amber : C.steel}`,
                  opacity: canPullMachine ? 1 : 0.55,
                }}
              >
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: canPullMachine ? C.amber : C.textDim }}>🎰 หยอดตู้การ์ดสตาฟ</div>
                  <div style={{ fontSize: 10, color: C.textDim, fontFamily: MONO_FONT, marginTop: 2 }}>Bronze 60% · Silver 30% · Gold 10%</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: canPullMachine ? C.chalk : C.textDim, fontFamily: MONO_FONT }}>
                  {onlinePullBusy ? "..." : isOnline
                    ? (onlineFreeLeft > 0 ? "ฟรี" : canPullMachine ? `🪙 ${machineCoins}` : "หมดโควต้า")
                    : (canPullMachine ? `🪙 ${machineCoins}` : "เหรียญไม่พอ")}
                </div>
              </button>
              {platinumPacks > 0 && (
                <button
                  type="button"
                  onClick={() => { const tier = onOpenPlatinum(); if (tier) setOpeningTier(tier); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", marginTop: 8, padding: "14px 16px", borderRadius: 10, cursor: "pointer",
                    background: "linear-gradient(135deg, rgba(185,230,255,.25), rgba(185,230,255,.08))",
                    border: `2px solid #b9e6ff`,
                  }}
                >
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#b9e6ff" }}>✨ เปิดซอง Platinum</div>
                    <div style={{ fontSize: 10, color: C.textDim, fontFamily: MONO_FONT, marginTop: 2 }}>การันตี 5-7★ · รางวัลจบลีกท็อป 3</div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: "#b9e6ff", fontFamily: MONO_FONT }}>
                    มี {platinumPacks} ใบ
                  </div>
                </button>
              )}
              {lastPull.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <SectionLabel sub="เลื่อนดูการ์ดที่ได้">ผลการเปิด</SectionLabel>
                  <DragScroll style={{ display: "flex", gap: 10, paddingBottom: 2, marginBottom: 10 }}>
                    {lastPull.map((card) => <StaffPackCardFace key={card.cardId} card={card} />)}
                  </DragScroll>
                  <SectionLabel sub={`จ้างจากที่เพิ่งได้${lastPull.length > 3 ? " · เลื่อนดูที่เหลือ" : ""}`}>รายการจ้างงาน</SectionLabel>
                  <CardListScroll style={{ gap: 6 }}>
                    {lastPull.map((card) => <StaffCardTile key={card.cardId} card={card} compact onHire={onHire} {...staffCardLockInfo(career, card)} />)}
                  </CardListScroll>
                </div>
              )}
            </>
          )}
        </Panel>
      )}

      {sub === "bag" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {bagByType.map(({ type, groups: typeGroups, total }) => (
            <Panel key={type}>
              <SectionLabel sub={`${total} ใบ`}>{STAFF_CARD_TYPE_ICON[type]} {STAFF_CARD_TYPE_TH[type]}</SectionLabel>
              {typeGroups.length === 0 ? (
                <div style={{ fontSize: 11.5, color: C.textDim }}>ยังไม่มีการ์ด</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {typeGroups.map((g) => (
                    <StaffCardStack key={`${g.type}_${g.stars}`} group={g} career={career} onHire={onHire} onToggleLock={onToggleLock} />
                  ))}
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}

      {sub === "merge" && (
        <>
          <Panel style={{ border: `1px solid ${C.purple}` }}>
            <SectionLabel style={{ color: C.purple }} sub="เปิดสวิตช์ tier ที่อยากให้รวมเองหลังเปิดการ์ดทุกครั้ง — 5★-7★ ต้องกดรวมเองเท่านั้น">🤖 รวมการ์ดอัตโนมัติ</SectionLabel>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {[1, 2, 3, 4].map((s) => {
                const on = !!(career.autoMergeTiers || {})[s];
                return (
                  <button key={s} type="button" onClick={() => onToggleAutoTier(s)} style={{
                    flex: 1, padding: "8px 4px", borderRadius: 8, cursor: "pointer", fontSize: 10.5, fontWeight: 700,
                    border: `2px solid ${on ? C.purple : C.steel}`,
                    background: on ? "rgba(157,111,224,.15)" : C.panel2,
                    color: on ? C.purple : C.textDim,
                  }}>{s}★→{s + 1}★<div style={{ fontSize: 8.5, fontWeight: 400, marginTop: 2 }}>{on ? "เปิด ✓" : "ปิด"}</div></button>
                );
              })}
            </div>
            <button type="button" onClick={onAutoMerge} style={{ ...btnStyle(C.purple, "#fff"), width: "100%" }}>✨ รวมอัตโนมัติตอนนี้ (ทุกชุดที่ครบใน tier ที่เปิด)</button>
            <div style={{ fontSize: 9.5, color: C.textDim, marginTop: 6 }}>ระบบจะรวมซ้ำจนไม่เหลือชุดครบ {MERGE_CARD_COUNT} ใบ แล้วสรุปผลทั้งหมดบนหน้าจอ</div>
          </Panel>

          <Panel>
            <div style={{ fontSize: 12, color: C.textDim, marginBottom: 12, lineHeight: 1.6 }}>
              ใช้การ์ดประเภทเดียวกัน ดาวเดียวกัน <b style={{ color: C.chalk }}>{MERGE_CARD_COUNT} ใบ</b> รวมกัน — ลุ้นเลื่อน 1 ดาว (ไม่ 100%) · 7★ รวมต่อไม่ได้
            </div>
            {groups.filter((g) => g.cards.filter((c) => !c.locked).length >= MERGE_CARD_COUNT && g.stars < 7).length === 0 ? (
              <div style={{ fontSize: 12, color: C.textDim }}>ยังไม่มีชุดที่รวมได้ (ต้องมีครบ {MERGE_CARD_COUNT} ใบที่ไม่ได้ล็อก)</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {groups.filter((g) => g.cards.filter((c) => !c.locked).length >= MERGE_CARD_COUNT && g.stars < 7).map((g) => {
                  const key = `${g.type}_${g.stars}`;
                  const picking = pickMode.has(key);
                  const rawPicked = pickedIds[key] || new Set();
                  // เช็คว่าการ์ดที่เคยติ๊กไว้ยังอยู่ในกลุ่มจริงไหม (เผื่อมีรวมอัตโนมัติ/เปิดซองใหม่มาแทรกระหว่างที่
                  // หน้าต่างนี้เปิดค้างไว้) กันบั๊กที่เจอจริง: เลือกครบ 10 ใบไว้ แต่พอกด "รวม" ระบบไปหยิบ
                  // การ์ดคนละชุดมารวมแทนแบบเงียบๆ เพราะ id ที่เลือกไว้ค้างไม่ตรงของจริงแล้ว
                  const liveIds = new Set(g.cards.map((c) => c.cardId));
                  const picked = new Set([...rawPicked].filter((id) => liveIds.has(id)));
                  const pickStale = picked.size !== rawPicked.size;
                  const canConfirmPick = picked.size === MERGE_CARD_COUNT && !pickStale;
                  const lockedCount = g.cards.filter((c) => c.locked).length;
                  function togglePicking() {
                    setPickMode((prev) => {
                      const next = new Set(prev);
                      if (next.has(key)) next.delete(key); else next.add(key);
                      return next;
                    });
                    setPickedIds((prev) => ({ ...prev, [key]: new Set() }));
                  }
                  function toggleCard(card) {
                    if (card.locked) return;
                    setPickedIds((prev) => {
                      // ใช้ liveIds กรอง prev[key] ทุกครั้งก่อนแก้ไข กัน id เก่าที่หายไปแล้วค้างอยู่ถาวร
                      const set = new Set([...(prev[key] || [])].filter((id) => liveIds.has(id)));
                      if (set.has(card.cardId)) {
                        set.delete(card.cardId);
                      } else if (set.size < MERGE_CARD_COUNT) {
                        set.add(card.cardId);
                      }
                      return { ...prev, [key]: set };
                    });
                  }
                  function doMerge() {
                    if (picking && canConfirmPick) {
                      onMerge(g.type, g.stars, Array.from(picked));
                    } else {
                      onMerge(g.type, g.stars);
                    }
                    setPickMode((prev) => { const next = new Set(prev); next.delete(key); return next; });
                    setPickedIds((prev) => ({ ...prev, [key]: new Set() }));
                  }
                  return (
                    <div key={key} style={{ borderRadius: 8, background: C.panel2, border: `1px solid ${C.steel}`, overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{STAFF_CARD_TYPE_TH[g.type]} {g.stars}★ → {g.stars + 1}★</div>
                          <div style={{ fontSize: 10.5, color: C.textDim, fontFamily: MONO_FONT }}>มี {g.count} ใบ{lockedCount > 0 ? ` (ล็อก ${lockedCount})` : ""} · โอกาส {Math.round(mergeSuccessChance(g.stars) * 100)}%</div>
                        </div>
                        <button type="button" onClick={togglePicking} style={{ ...btnStyle(picking ? C.amber : C.steel, picking ? "#000" : C.chalk), width: "auto", padding: "7px 10px", fontSize: 10 }}>{picking ? "ยกเลิกเลือก" : "เลือกเอง"}</button>
                        <button type="button" disabled={picking && !canConfirmPick} onClick={doMerge} style={{ ...btnStyle(C.purple, "#fff"), width: "auto", padding: "7px 12px", fontSize: 10.5, opacity: picking && !canConfirmPick ? 0.45 : 1, cursor: picking && !canConfirmPick ? "not-allowed" : "pointer" }}>รวม</button>
                      </div>
                      {picking && (
                        <div style={{ padding: "0 10px 10px" }}>
                          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 6 }}>ติ๊กเลือก {picked.size}/{MERGE_CARD_COUNT} ใบ</div>
                          {pickStale && (
                            <div style={{ fontSize: 9.5, color: C.crimson, marginBottom: 6 }}>⚠️ การ์ดที่เลือกไว้บางใบหายไปแล้ว (ถูกรวม/ใช้ไปแล้ว) — กรุณาเลือกใหม่</div>
                          )}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {g.cards.map((card) => {
                              const on = picked.has(card.cardId);
                              return (
                                <label key={card.cardId} style={{
                                  display: "flex", alignItems: "center", gap: 5, padding: "5px 8px", borderRadius: 6,
                                  cursor: card.locked ? "not-allowed" : "pointer",
                                  border: `1px solid ${card.locked ? C.steel : on ? C.amber : C.steel}`,
                                  background: card.locked ? "rgba(255,255,255,.03)" : on ? "rgba(230,180,80,.15)" : C.panel1 || C.panel2,
                                  fontSize: 10, fontFamily: MONO_FONT, color: card.locked ? C.textDim : on ? C.amber : C.textDim,
                                  opacity: card.locked ? 0.55 : 1,
                                }}>
                                  <input type="checkbox" checked={on} disabled={card.locked} onChange={() => toggleCard(card)} style={{ margin: 0 }} />
                                  {card.locked ? "🔒 " : ""}{card.name}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

/* ============================== CLUB PROFILE ============================== */
function ProfileView({ career, uTeam, standings }) {
  const history = career.seasonHistory || [];
  const trophies = career.trophyCabinet || [];
  const posNow = standings.findIndex((s) => s.team.id === uTeam.id) + 1;
  const rowNow = standings.find((s) => s.team.id === uTeam.id);
  const mgr = uTeam.manager;

  // all-time aggregates (จบไปแล้ว + ฤดูกาลปัจจุบัน)
  const agg = history.reduce((a, h) => ({
    w: a.w + h.w, d: a.d + h.d, l: a.l + h.l, gf: a.gf + h.gf, ga: a.ga + h.ga,
  }), { w: rowNow?.w ?? 0, d: rowNow?.d ?? 0, l: rowNow?.l ?? 0, gf: rowNow?.gf ?? 0, ga: rowNow?.ga ?? 0 });
  const bestFinish = history.length
    ? history.reduce((best, h) => {
        if (!best) return h;
        if (h.division < best.division) return h;
        if (h.division === best.division && h.pos < best.pos) return h;
        return best;
      }, null)
    : null;

  // group trophies by type
  const trophyGroups = Object.keys(TROPHY_DEFS)
    .map((id) => ({ id, def: TROPHY_DEFS[id], items: trophies.filter((t) => t.id === id) }))
    .filter((g) => g.items.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel accent={C.gold}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ClubBadge team={uTeam} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: DISPLAY_FONT }}>{uTeam.name}</div>
            <div style={{ fontSize: 10.5, color: C.textDim, fontFamily: MONO_FONT }}>
              ฤดูกาลที่ {career.season} · {uTeam.division === 0 ? "Master League" : "Challenger League"} · อันดับ #{posNow || "-"}
            </div>
            {mgr && <div style={{ fontSize: 10.5, color: C.purple, marginTop: 2 }}>ผจก. {mgr.name}{mgr.cardStars ? ` (${mgr.cardStars}★)` : ""}</div>}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 12 }}>
          {[
            ["ถ้วยรางวัล", trophies.length, C.gold],
            ["ฤดูกาลที่เล่น", career.season, C.chalk],
            ["แฟนบอล", (career.fanBase || 0).toLocaleString(), C.amber],
            ["งบ", formatMoney(career.budget), C.good],
          ].map(([label, val, color]) => (
            <div key={label} style={{ background: C.panel2, borderRadius: 6, padding: 8, border: `1px solid ${C.steel}`, textAlign: "center" }}>
              <div style={{ fontSize: 8.5, color: C.textDim }}>{label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color, fontFamily: MONO_FONT, marginTop: 2 }}>{val}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel style={{ border: `1px solid ${C.gold}` }}>
        <SectionLabel style={{ color: C.gold }} sub={trophies.length ? `${trophies.length} ใบ` : undefined}>🏆 ตู้โชว์ถ้วยรางวัล</SectionLabel>
        {trophyGroups.length === 0 ? (
          <div style={{ fontSize: 11.5, color: C.textDim }}>ยังไม่มีถ้วยรางวัล — คว้าแชมป์ลีก, Socker Cup หรือ Champ Master เพื่อสะสม</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {trophyGroups.map(({ id, def, items }) => (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: C.panel2, border: `1px solid ${def.color}44` }}>
                <div style={{ fontSize: 22, width: 32, textAlign: "center" }}>{def.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: def.color }}>{def.label} {items.length > 1 ? `×${items.length}` : ""}</div>
                  <div style={{ fontSize: 9.5, color: C.textDim, fontFamily: MONO_FONT }}>ฤดูกาล {items.map((t) => t.season).join(", ")}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <SectionLabel sub="รวมทุกฤดูกาล (นับฤดูกาลปัจจุบันด้วย)">สถิติตลอดกาล</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {[
            ["ชนะ", agg.w, C.good], ["เสมอ", agg.d, C.amber], ["แพ้", agg.l, C.crimson],
            ["ยิงได้", agg.gf, C.chalk], ["เสีย", agg.ga, C.textDim], ["ผลต่าง", (agg.gf - agg.ga > 0 ? "+" : "") + (agg.gf - agg.ga), agg.gf - agg.ga >= 0 ? C.good : C.crimson],
          ].map(([label, val, color]) => (
            <div key={label} style={{ background: C.panel2, borderRadius: 6, padding: 8, border: `1px solid ${C.steel}`, textAlign: "center" }}>
              <div style={{ fontSize: 8.5, color: C.textDim }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color, fontFamily: MONO_FONT }}>{val}</div>
            </div>
          ))}
        </div>
        {bestFinish && (
          <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 8 }}>
            ผลงานดีที่สุด: อันดับ {bestFinish.pos} {bestFinish.division === 0 ? "Master" : "Challenger"} League (ฤดูกาล {bestFinish.season})
          </div>
        )}
      </Panel>

      <Panel style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 14, paddingBottom: 0 }}><SectionLabel sub={history.length ? `${history.length} ฤดูกาล` : undefined}>📜 สถิติฤดูกาลที่ผ่านมา</SectionLabel></div>
        {history.length === 0 ? (
          <div style={{ fontSize: 11.5, color: C.textDim, padding: "0 14px 14px" }}>ยังไม่มีฤดูกาลที่จบ — ข้อมูลจะบันทึกอัตโนมัติเมื่อจบแต่ละฤดูกาล</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
            <thead><tr style={{ color: C.textDim, textAlign: "left" }}>
              <th style={{ padding: "6px 8px" }}>ซีซัน</th><th style={{ padding: "6px 4px" }}>ลีก</th>
              <th style={{ padding: "6px 4px", textAlign: "center" }}>อันดับ</th>
              <th style={{ padding: "6px 4px", textAlign: "center" }}>W-D-L</th>
              <th style={{ padding: "6px 4px", textAlign: "center" }}>GF-GA</th>
              <th style={{ padding: "6px 4px", textAlign: "center" }}>Pts</th>
              <th style={{ padding: "6px 8px" }}>ดาวซัลโว</th>
            </tr></thead>
            <tbody style={{ fontFamily: MONO_FONT }}>
              {[...history].reverse().map((h) => (
                <tr key={h.season} style={{ borderTop: `1px solid ${C.steel}`, background: h.pos === 1 ? "rgba(212,175,55,.08)" : "transparent" }}>
                  <td style={{ padding: "5px 8px" }}>S{h.season}{h.trophies?.length ? " 🏆" : ""}</td>
                  <td style={{ padding: "5px 4px", fontSize: 9.5 }}>{h.division === 0 ? "Master" : "Chall."}</td>
                  <td style={{ textAlign: "center", color: h.pos <= 3 ? C.gold : C.chalk, fontWeight: h.pos === 1 ? 700 : 400 }}>#{h.pos}</td>
                  <td style={{ textAlign: "center" }}>{h.w}-{h.d}-{h.l}</td>
                  <td style={{ textAlign: "center" }}>{h.gf}-{h.ga}</td>
                  <td style={{ textAlign: "center", fontWeight: 700 }}>{h.pts}</td>
                  <td style={{ padding: "5px 8px", fontSize: 9.5, fontFamily: "'Segoe UI', sans-serif" }}>{h.topScorerName ? `${h.topScorerName.split(" ")[1] || h.topScorerName} (${h.topScorerGoals})` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

/* ============================== FEEDBACK ============================== */
function FeedbackView({ uiLang = "th" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel accent={C.blue}>
        <SectionLabel>{uiLang === "en" ? "Player feedback" : "Feedback จากผู้เล่น"}</SectionLabel>
        <FeedbackBoard
          variant="game"
          title={uiLang === "en" ? "Tell us what you think" : "บอกเราว่าชอบ / ไม่ชอบอะไร"}
          subtitle={uiLang === "en"
            ? "Comments are shared with the dev team. Join Discord for live chat."
            : "ความคิดเห็นถูกแชร์กับทีมพัฒนา — เข้า Discord คุยสดได้"}
        />
      </Panel>
    </div>
  );
}

/* ============================== ตลาดออนไลน์ (เสนอซื้อนักเตะตรง สไตล์ Top Eleven) ============================== */
/** ปุ่มใหญ่ ชัด สีสื่อความหมาย — เขียว=เสนอ/รับ, แดง=ปฏิเสธ, ส้ม=ต่อรอง (ตามที่ user ขอ) */
function OnlineActionBtn({ tone = "good", children, ...props }) {
  const color = tone === "good" ? C.good : tone === "bad" ? C.crimson : C.amber;
  return (
    <button type="button" {...props} style={{
      flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer",
      fontSize: 12, fontWeight: 800, border: "none",
      background: color, color: tone === "warn" ? "#2b1c00" : "#08150e",
      opacity: props.disabled ? 0.5 : 1,
    }}>
      {children}
    </button>
  );
}

function OnlinePlayerRow({ player, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: C.panel2, border: `1px solid ${C.steel}` }}>
      <div style={{ width: 30, textAlign: "center", fontSize: 12, fontWeight: 800, color: starColor(Math.max(1, Math.round((player.rating || 50) / 15))) }}>{player.rating}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.name}</div>
        <div style={{ fontSize: 9.5, color: C.textDim, fontFamily: MONO_FONT }}>{playerPosTH ? playerPosTH(player) : player.position} · อายุ {player.age}</div>
      </div>
      {right}
    </div>
  );
}

function OnlineOfferForm({ player, onSubmit, onCancel }) {
  const [fee, setFee] = useState(String(player.value || 0));
  const [wage, setWage] = useState(String(player.wage || 0));
  return (
    <div style={{ padding: 10, borderRadius: 8, background: C.panel1 || "#0e1712", border: `1px solid ${C.amber}`, marginTop: 6 }}>
      <div style={{ fontSize: 11, color: C.textDim, marginBottom: 6 }}>เสนอซื้อ {player.name}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9.5, color: C.textDim, marginBottom: 3 }}>ค่าตัว (฿)</div>
          <input value={fee} onChange={(e) => setFee(e.target.value.replace(/[^0-9]/g, ""))} style={{ width: "100%", padding: "7px 8px", borderRadius: 6, border: `1px solid ${C.steel}`, background: C.panel2, color: C.chalk, fontSize: 12 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9.5, color: C.textDim, marginBottom: 3 }}>ค่าเหนื่อย/วัน (฿)</div>
          <input value={wage} onChange={(e) => setWage(e.target.value.replace(/[^0-9]/g, ""))} style={{ width: "100%", padding: "7px 8px", borderRadius: 6, border: `1px solid ${C.steel}`, background: C.panel2, color: C.chalk, fontSize: 12 }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <OnlineActionBtn tone="neutral" onClick={onCancel} style={{ background: C.steel, color: C.chalk }}>ยกเลิก</OnlineActionBtn>
        <OnlineActionBtn tone="good" onClick={() => onSubmit({ feeOffer: Number(fee) || 0, wageOffer: Number(wage) || 0 })}>ส่งข้อเสนอ</OnlineActionBtn>
      </div>
    </div>
  );
}

function OnlineMarketView({ uiLang = "th" }) {
  const [myClub, setMyClub] = useState(null);
  const [roster, setRoster] = useState([]);
  const [offers, setOffers] = useState({ sent: [], received: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [offeringPlayerId, setOfferingPlayerId] = useState(null);
  const [counteringId, setCounteringId] = useState(null);
  const [expandedClub, setExpandedClub] = useState(null);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const club = await fetchMyShardClub();
      setMyClub(club);
      if (club) {
        const [r, o] = await Promise.all([fetchShardRoster(club.shardId), fetchMyOffers()]);
        setRoster(r);
        setOffers(o);
      }
    } catch (e) {
      setError(e.message || "โหลดตลาดออนไลน์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadAll(); }, []);

  async function runAction(id, fn) {
    setBusyId(id);
    setError("");
    try {
      await fn();
      await loadAll();
    } catch (e) {
      setError(e.message || "ทำรายการไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Panel><div style={{ fontSize: 12, color: C.textDim, textAlign: "center", padding: 20 }}>กำลังโหลดตลาดออนไลน์...</div></Panel>;

  if (!myClub) {
    return (
      <Panel>
        <SectionLabel sub="ต้องเข้าสู่โลกออนไลน์ก่อนถึงจะเสนอซื้อนักเตะทีมอื่นได้">🤝 ตลาดออนไลน์</SectionLabel>
        <div style={{ fontSize: 12, color: C.textDim }}>ยังไม่ได้เชื่อมต่อสโมสรออนไลน์ — ไปที่ "ตั้งค่า" แล้วกด "เข้าสู่โลกออนไลน์" ก่อนครับ</div>
      </Panel>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel style={{ border: `1px solid ${C.amber}` }}>
        <SectionLabel style={{ color: C.amber }} sub="เสนอซื้อนักเตะทีมอื่นได้ตรงๆ แม้ไม่ได้ประกาศขาย · เจรจาได้ตลอดวัน ดีลที่ตกลงกันจะย้ายทีมจริงพร้อมกันตอน 20:00 น.">🤝 ตลาดออนไลน์</SectionLabel>
        <div style={{ fontSize: 11.5, fontFamily: MONO_FONT, color: C.textDim }}>งบสโมสรออนไลน์ <b style={{ color: C.good }}>{formatMoney(myClub.budget)}</b></div>
      </Panel>

      {error && <div style={{ fontSize: 11, color: C.crimson, padding: "8px 10px", borderRadius: 8, background: "rgba(193,68,14,.15)" }}>{error}</div>}

      {offers.received.length > 0 && (
        <Panel style={{ border: `1px solid ${C.good}` }}>
          <SectionLabel style={{ color: C.good }}>📥 ข้อเสนอที่ได้รับ ({offers.received.length})</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {offers.received.map((o) => (
              <div key={o.id}>
                <OnlinePlayerRow player={o.player} right={
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: C.good }}>{formatMoney(o.status === "countered" ? o.counterFee : o.feeOffer)}</div>
                    <div style={{ fontSize: 9, color: C.textDim }}>จาก {o.fromClub?.name}</div>
                  </div>
                } />
                {o.status === "accepted_pending" ? (
                  <div style={{ fontSize: 10.5, color: C.good, marginTop: 6 }}>✅ ตกลงแล้ว — รอย้ายทีมจริงตอน 20:00 น.</div>
                ) : (
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <OnlineActionBtn tone="good" disabled={busyId === o.id} onClick={() => runAction(o.id, () => acceptOnlineOffer(o.id))}>✅ รับข้อเสนอ</OnlineActionBtn>
                    <OnlineActionBtn tone="warn" disabled={busyId === o.id} onClick={() => setCounteringId(counteringId === o.id ? null : o.id)}>🔁 ต่อรอง</OnlineActionBtn>
                    <OnlineActionBtn tone="bad" disabled={busyId === o.id} onClick={() => runAction(o.id, () => rejectOnlineOffer(o.id))}>❌ ปฏิเสธ</OnlineActionBtn>
                  </div>
                )}
                {counteringId === o.id && (
                  <OnlineOfferForm
                    player={{ ...o.player, value: o.feeOffer, wage: o.wageOffer }}
                    onCancel={() => setCounteringId(null)}
                    onSubmit={({ feeOffer, wageOffer }) => {
                      setCounteringId(null);
                      runAction(o.id, () => counterOnlineOffer(o.id, { counterFee: feeOffer, counterWage: wageOffer }));
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {offers.sent.length > 0 && (
        <Panel>
          <SectionLabel sub="รอทีมเจ้าของตอบรับ/ปฏิเสธ/ต่อรอง">📤 ข้อเสนอที่ส่งไป ({offers.sent.length})</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {offers.sent.map((o) => (
              <div key={o.id}>
                <OnlinePlayerRow player={o.player} right={
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: C.amber }}>{formatMoney(o.status === "countered" ? o.counterFee : o.feeOffer)}</div>
                    <div style={{ fontSize: 9, color: C.textDim }}>
                      {o.status === "accepted_pending" ? "ตกลงแล้ว" : o.status === "countered" ? "โดนต่อรอง" : "รอตอบรับ"} · {o.toClub?.name}
                    </div>
                  </div>
                } />
                {o.status === "accepted_pending" ? (
                  <div style={{ fontSize: 10.5, color: C.good, marginTop: 6 }}>✅ ตกลงแล้ว — รอย้ายทีมจริงตอน 20:00 น.</div>
                ) : (
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    {o.status === "countered" && (
                      <OnlineActionBtn tone="good" disabled={busyId === o.id} onClick={() => runAction(o.id, () => sendOnlinePlayerOffer({ playerId: o.player.id, feeOffer: o.counterFee, wageOffer: o.counterWage }))}>✅ รับราคาต่อรอง</OnlineActionBtn>
                    )}
                    <OnlineActionBtn tone="bad" disabled={busyId === o.id} onClick={() => runAction(o.id, () => cancelOnlineOffer(o.id))}>ยกเลิกข้อเสนอ</OnlineActionBtn>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel>
        <SectionLabel sub="แตะทีมเพื่อดูรายชื่อนักเตะแล้วเสนอซื้อได้เลย">🔎 หาผู้เล่นทีมอื่น</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {roster.map((club) => (
            <div key={club.id}>
              <button type="button" onClick={() => setExpandedClub(expandedClub === club.id ? null : club.id)} style={{
                width: "100%", textAlign: "left", padding: "9px 10px", borderRadius: 8, cursor: "pointer",
                background: C.panel2, border: `1px solid ${C.steel}`, color: C.chalk, display: "flex", justifyContent: "space-between",
              }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{club.isBot ? "🤖 " : "👤 "}{club.name}</span>
                <span style={{ fontSize: 10, color: C.textDim, fontFamily: MONO_FONT }}>{club.players.length} คน {expandedClub === club.id ? "▲" : "▼"}</span>
              </button>
              {expandedClub === club.id && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6, paddingLeft: 6 }}>
                  {club.players.map((p) => (
                    <div key={p.id}>
                      <OnlinePlayerRow player={p} right={
                        <OnlineActionBtn tone="good" onClick={() => setOfferingPlayerId(offeringPlayerId === p.id ? null : p.id)} style={{ flex: "none", padding: "6px 10px", fontSize: 10.5 }}>เสนอซื้อ</OnlineActionBtn>
                      } />
                      {offeringPlayerId === p.id && (
                        <OnlineOfferForm
                          player={p}
                          onCancel={() => setOfferingPlayerId(null)}
                          onSubmit={({ feeOffer, wageOffer }) => {
                            setOfferingPlayerId(null);
                            runAction(p.id, () => sendOnlinePlayerOffer({ playerId: p.id, feeOffer, wageOffer }));
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ============================== ONLINE LIVE MATCH CENTER (สเปคเทตแมทจริงบนเซิร์ฟเวอร์) ============================== */

/** นับนาทีในเกมแบบลื่นระหว่างโพล — ประมาณจากเวลาจริงที่ผ่านไปตั้งแต่โพลล่าสุด ไม่รอ query ใหม่ทุกวินาที */
function useSmoothMatchMinute(serverMinute, kickoffAt, finished) {
  const [displayMinute, setDisplayMinute] = useState(serverMinute);
  useEffect(() => {
    setDisplayMinute(serverMinute);
    if (finished || !kickoffAt) return;
    const id = setInterval(() => {
      const elapsedMs = Date.now() - new Date(kickoffAt).getTime();
      const m = Math.min(90, Math.max(0, Math.floor(elapsedMs / (GAME_MINUTE_REAL_SECONDS * 1000))));
      setDisplayMinute(m);
    }, 1000);
    return () => clearInterval(id);
  }, [serverMinute, kickoffAt, finished]);
  return displayMinute;
}

function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** แบนเนอร์เตือนก่อนแมท — โชว์บน Dashboard เมื่อทีมตัวเองยังไม่คิกอฟ (รอคิวรอบถัดไป) นับถอยหลังให้ */
function OnlineNextKickoffBanner() {
  const [info, setInfo] = useState(null); // { etaMs, fetchedAt, hasScheduledMatch }
  const [now, setNow] = useState(Date.now());

  async function poll() {
    try {
      const club = await fetchMyShardClub();
      if (!club) { setInfo(null); return; }
      const d = await fetchShardMatchesToday();
      const mine = d.matches?.find((m) => m.home?.id === club.id || m.away?.id === club.id);
      if (mine && mine.status === "scheduled") {
        setInfo({ etaMs: d.nextKickoffEtaMs, fetchedAt: Date.now(), hasScheduledMatch: true });
      } else {
        setInfo(null);
      }
    } catch {
      setInfo(null);
    }
  }
  useEffect(() => { poll(); const id = setInterval(poll, 15000); return () => clearInterval(id); }, []);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  if (!info) return null;
  // ไม่มี eta จากเซิร์ฟเวอร์ (เช่น หลังรีสตาร์ท) หรือถึงเวลาแล้วแต่ยังรอรอบคิกอฟ — โชว์ "กำลังจะเริ่ม" แทนที่จะซ่อนไปเฉยๆ
  const remaining = info.etaMs != null ? info.etaMs - (now - info.fetchedAt) : null;
  const startingSoon = remaining == null || remaining <= 0;

  return (
    <Panel style={{ border: `1px solid ${C.amber}`, background: "rgba(224,164,88,.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, color: C.amber, fontWeight: 700 }}>⏳ ทีมของคุณจะเตะในอีก...</div>
        <div style={{ fontSize: 16, fontWeight: 800, fontFamily: MONO_FONT, color: C.amber }}>
          {startingSoon ? "กำลังจะเริ่ม" : formatCountdown(remaining)}
        </div>
      </div>
    </Panel>
  );
}

/** ป้ายลอยแบบย่อ — โชว์สกอร์สดของแมทตัวเองตลอด ไม่ว่าจะอยู่แท็บไหน กดเพื่อขยายไปหน้าแข่งขันสดเต็ม */
function OnlineFloatingScoreWidget({ onOpen }) {
  const [match, setMatch] = useState(null);
  const [myClubId, setMyClubId] = useState(null);

  async function poll() {
    try {
      const club = await fetchMyShardClub();
      if (!club) return;
      setMyClubId(club.id);
      const d = await fetchShardMatchesToday();
      const mine = d.matches?.find((m) => m.home?.id === club.id || m.away?.id === club.id);
      setMatch(mine && mine.status === "live" ? mine : null);
    } catch {
      /* เงียบไว้ — ไม่ให้ป้ายลอยรบกวนด้วย error */
    }
  }
  useEffect(() => { poll(); const id = setInterval(poll, 10000); return () => clearInterval(id); }, []);

  const minute = useSmoothMatchMinute(match?.minute ?? 0, match?.kickoffAt, false);
  if (!match) return null;

  const isHome = match.home?.id === myClubId;
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        position: "fixed", bottom: 74, right: 12, zIndex: 55,
        background: "rgba(8,18,12,.92)", border: `1px solid ${C.crimson}`, borderRadius: 12,
        padding: "8px 12px", cursor: "pointer", boxShadow: "0 6px 20px rgba(0,0,0,.5)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      }}
    >
      <div style={{ fontSize: 9, color: C.crimson, fontWeight: 800 }}>🔴 {minute}'</div>
      <div style={{ fontSize: 12, fontWeight: 800, fontFamily: MONO_FONT, color: C.chalk }}>
        {isHome ? match.homeGoals : match.awayGoals} - {isHome ? match.awayGoals : match.homeGoals}
      </div>
      <div style={{ fontSize: 8, color: C.textDim }}>แตะเพื่อดู</div>
    </button>
  );
}

function OnlineLiveMatchPanel({ matchId, myClubId, mySquad, onClose }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [subOut, setSubOut] = useState("");
  const [subIn, setSubIn] = useState("");
  const [subBusy, setSubBusy] = useState(false);
  const [mentalityBusy, setMentalityBusy] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const reportShownForRef = useRef(null); // matchId ที่เคยโชว์/ปิดรายงานไปแล้ว — กันเด้งซ้ำทุกครั้งที่ poll
  const pollRef = useRef(null);

  async function poll() {
    try {
      const data = await fetchLiveMatch(matchId);
      setState(data);
    } catch (e) {
      setError(e.message || "โหลดสถานะแมทไม่สำเร็จ");
    }
  }
  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 4000);
    return () => clearInterval(pollRef.current);
  }, [matchId]);

  const isMine = state?.home?.id === myClubId || state?.away?.id === myClubId;
  useEffect(() => {
    if (isMine && state?.finished && reportShownForRef.current !== matchId) {
      reportShownForRef.current = matchId;
      setShowReport(true);
    }
  }, [isMine, state?.finished, matchId]);

  const minute = useSmoothMatchMinute(state?.minute ?? 0, state?.kickoffAt, state?.finished);

  if (!state) return <Panel><div style={{ fontSize: 12, color: C.textDim, textAlign: "center", padding: 16 }}>กำลังโหลด...</div></Panel>;

  const isHome = state.home?.id === myClubId;

  async function doSub() {
    if (!subOut || !subIn) return;
    setSubBusy(true);
    setError("");
    try {
      await substitutePlayer(matchId, { outPlayerId: subOut, inPlayerId: subIn });
      setSubOut(""); setSubIn("");
      await poll();
    } catch (e) {
      setError(e.message || "เปลี่ยนตัวไม่สำเร็จ");
    } finally {
      setSubBusy(false);
    }
  }

  async function doMentality(m) {
    setMentalityBusy(true);
    setError("");
    try {
      await setOnlineMatchMentality(matchId, m);
      await poll();
    } catch (e) {
      setError(e.message || "สั่งอารมณ์ทีมไม่สำเร็จ");
    } finally {
      setMentalityBusy(false);
    }
  }

  const isScheduled = state.status === "scheduled";
  return (
    <>
      {showReport && (
        <MatchReportModal
          homeTeam={state.home} awayTeam={state.away}
          homeGoals={state.homeGoals} awayGoals={state.awayGoals}
          scorers={state.events || []}
          onClose={() => setShowReport(false)}
        />
      )}
      <Panel style={{ border: `1px solid ${state.finished ? C.steel : isScheduled ? C.amber : C.crimson}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: state.finished ? C.textDim : isScheduled ? C.amber : C.crimson }}>
          {state.finished ? "⏹ จบการแข่งขัน" : isScheduled ? "⏳ รอคิกอฟรอบถัดไป" : `🔴 สด · นาที ${minute}'`}
        </span>
        {onClose && <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.textDim, fontSize: 16, cursor: "pointer" }}>✕</button>}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: state.home?.id === myClubId ? C.amber : C.chalk }}>{state.home?.name}</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: MONO_FONT, padding: "0 14px" }}>{state.homeGoals} - {state.awayGoals}</div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: state.away?.id === myClubId ? C.amber : C.chalk }}>{state.away?.name}</div>
        </div>
      </div>
      {state.events?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
          {state.events.map((e, i) => (
            <div key={i} style={{ fontSize: 11, color: C.textDim, fontFamily: MONO_FONT }}>
              ⚽ {e.minute}' — {e.side === "home" ? state.home?.name : state.away?.name}
            </div>
          ))}
        </div>
      )}
      {error && <div style={{ fontSize: 11, color: C.crimson, marginBottom: 8 }}>{error}</div>}
      {isMine && !state.finished && !isScheduled && (
        <div style={{ borderTop: `1px solid ${C.steel}`, paddingTop: 10, marginBottom: mySquad ? 10 : 0 }}>
          <div style={{ fontSize: 10.5, color: C.textDim, marginBottom: 6 }}>สั่งอารมณ์ทีม</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { id: "attacking", label: "⚔️ บุก" },
              { id: "balanced", label: "⚖️ สมดุล" },
              { id: "defensive", label: "🛡️ รับ" },
            ].map((opt) => {
              const current = (isHome ? state.homeMentality : state.awayMentality) || "balanced";
              const active = current === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={mentalityBusy || active}
                  onClick={() => doMentality(opt.id)}
                  style={{
                    flex: 1, fontSize: 10.5, padding: "6px 4px", borderRadius: 6, cursor: active ? "default" : "pointer",
                    background: active ? "rgba(224,164,88,.2)" : C.panel2,
                    border: `1px solid ${active ? C.amber : C.steel}`,
                    color: active ? C.amber : C.chalk, fontWeight: active ? 800 : 400,
                  }}
                >{opt.label}</button>
              );
            })}
          </div>
        </div>
      )}
      {isMine && !state.finished && !isScheduled && mySquad && (
        <div style={{ borderTop: `1px solid ${C.steel}`, paddingTop: 10 }}>
          <div style={{ fontSize: 10.5, color: C.textDim, marginBottom: 6 }}>เปลี่ยนตัว ({(isHome ? state.homeSubsUsed : state.awaySubsUsed) ?? 0}/{MAX_MATCH_SUBS})</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <select value={subOut} onChange={(e) => setSubOut(e.target.value)} style={{ flex: 1, fontSize: 11, padding: 6, borderRadius: 6, background: C.panel2, color: C.chalk, border: `1px solid ${C.steel}` }}>
              <option value="">ตัวออก...</option>
              {mySquad.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={subIn} onChange={(e) => setSubIn(e.target.value)} style={{ flex: 1, fontSize: 11, padding: 6, borderRadius: 6, background: C.panel2, color: C.chalk, border: `1px solid ${C.steel}` }}>
              <option value="">ตัวเข้า...</option>
              {mySquad.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <OnlineActionBtn tone="good" disabled={!subOut || !subIn || subBusy} onClick={doSub}>🔄 ยืนยันเปลี่ยนตัว</OnlineActionBtn>
        </div>
      )}
      </Panel>
    </>
  );
}

/** การ์ดกะทัดรัดบนหน้าหลัก (โหมดออนไลน์) — โชว์สถานะ/สกอร์ย่อ กดแล้วเปิดหน้าต่างดูแมทสดเต็มจอ */
function OnlineLiveHomeCard() {
  const [myClub, setMyClub] = useState(null);
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);

  async function poll() {
    try {
      const club = await fetchMyShardClub();
      setMyClub(club);
      if (club) setData(await fetchShardMatchesToday());
    } catch {
      /* เงียบไว้ — ไม่ให้การ์ดหน้าหลักพังเพราะโพลล้มเหลว */
    }
  }
  useEffect(() => { poll(); const id = setInterval(poll, 15000); return () => clearInterval(id); }, []);

  const myMatch = data?.matches?.find((m) => m.home?.id === myClub?.id || m.away?.id === myClub?.id);
  const isLive = myMatch?.status === "live";
  const statusLabel = !myClub
    ? "ยังไม่ได้เชื่อมต่อสโมสรออนไลน์"
    : isLive
      ? `🔴 สด — ${myMatch.homeGoals}-${myMatch.awayGoals}`
      : myMatch?.status === "scheduled"
        ? "⏳ รอคิกอฟรอบถัดไป"
        : "วันนี้ยังไม่มีแมทของทีมคุณ";

  return (
    <>
      <Panel style={{ border: `1px solid ${isLive ? C.crimson : C.amber}`, cursor: myClub ? "pointer" : "default" }} onClick={() => { if (myClub) { setOpen(true); playUiSound("modalOpen"); } }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: isLive ? C.crimson : C.amber }}>🔴 แข่งขันสด</div>
            <div style={{ fontSize: 12, color: C.chalk, marginTop: 2 }}>{statusLabel}</div>
          </div>
          {myClub && (
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(true); playUiSound("modalOpen"); }} style={{ ...btnStyle(C.crimson, "#fff"), width: "auto", padding: "8px 16px", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
              ดูแมทสด
            </button>
          )}
        </div>
      </Panel>
      {open && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 66, background: "rgba(0,0,0,.82)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, overflowY: "auto" }}
          onClick={() => { setOpen(false); playUiSound("modalClose"); }}
        >
          <div style={{ maxWidth: 640, width: "100%", marginTop: 16 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button onClick={() => { setOpen(false); playUiSound("modalClose"); }} style={{
                background: C.panel, border: `1px solid ${C.steel}`, borderRadius: "50%",
                width: 36, height: 36, color: C.chalk, fontSize: 18, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>✕</button>
            </div>
            <OnlineMatchCenterView />
          </div>
        </div>
      )}
    </>
  );
}

function OnlineMatchCenterView({ uiLang = "th" }) {
  const [myClub, setMyClub] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [openMatchId, setOpenMatchId] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const club = await fetchMyShardClub();
      setMyClub(club);
      if (club) {
        const d = await fetchShardMatchesToday();
        setData(d);
        const mine = d.matches?.find((m) => m.home?.id === club.id || m.away?.id === club.id);
        if (mine && !openMatchId) setOpenMatchId(mine.matchId);
      }
    } catch (e) {
      setError(e.message || "โหลดแมทวันนี้ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id); }, []);

  if (loading && !data) return <Panel><div style={{ fontSize: 12, color: C.textDim, textAlign: "center", padding: 20 }}>กำลังโหลด...</div></Panel>;
  if (!myClub) {
    return (
      <Panel>
        <SectionLabel sub="ต้องเข้าสู่โลกออนไลน์ก่อนถึงจะดูแมทสดได้">🔴 แข่งขันสด</SectionLabel>
        <div style={{ fontSize: 12, color: C.textDim }}>ยังไม่ได้เชื่อมต่อสโมสรออนไลน์ — ไปที่ "ตั้งค่า" แล้วกด "เข้าสู่โลกออนไลน์" ก่อนครับ</div>
      </Panel>
    );
  }

  const myMatch = data?.matches?.find((m) => m.home?.id === myClub.id || m.away?.id === myClub.id);
  const otherMatches = data?.matches?.filter((m) => m.matchId !== myMatch?.matchId) || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel style={{ border: `1px solid ${C.crimson}` }}>
        <SectionLabel style={{ color: C.crimson }} sub="เตะอัตโนมัติตามเวลาจริง 9:00-20:00 น. — ไม่มีปุ่มกดคิกอฟ ไม่มีเร่งเวลา">🔴 แข่งขันสด</SectionLabel>
        {myClub?.shard && (
          <div style={{ fontSize: 11, color: C.amber, fontWeight: 700, marginTop: 2 }}>
            🏆 {DIVISION_NAMES[myClub.shard.division] ?? `ดิวิชั่น ${myClub.shard.division}`}
          </div>
        )}
      </Panel>
      {error && <div style={{ fontSize: 11, color: C.crimson, padding: "8px 10px", borderRadius: 8, background: "rgba(193,68,14,.15)" }}>{error}</div>}
      {(!myMatch || myMatch.status === "scheduled") && <OnlineNextKickoffBanner />}

      {myMatch && (
        <OnlineLiveMatchPanel
          matchId={myMatch.matchId}
          myClubId={myClub.id}
          mySquad={myClub.players}
        />
      )}
      {!myMatch && (
        <Panel><div style={{ fontSize: 12, color: C.textDim, textAlign: "center", padding: 12 }}>วันนี้ยังไม่มีแมทของทีมคุณ (รอรอบถัดไป)</div></Panel>
      )}

      {otherMatches.length > 0 && (
        <Panel>
          <SectionLabel sub="แตะเพื่อดูสด (สเปคเทตทีมอื่น)">แมทอื่นในลีควันนี้</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {otherMatches.map((m) => (
              <div key={m.matchId}>
                <button type="button" onClick={() => setOpenMatchId(openMatchId === m.matchId ? null : m.matchId)} style={{
                  width: "100%", textAlign: "left", padding: "9px 10px", borderRadius: 8, cursor: "pointer",
                  background: C.panel2, border: `1px solid ${C.steel}`, color: C.chalk,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: 11.5 }}>{m.home?.isBot ? "🤖" : "👤"} {m.home?.name} vs {m.away?.name} {m.away?.isBot ? "🤖" : "👤"}</span>
                  <span style={{ fontSize: 10, fontFamily: MONO_FONT, color: m.finished ? C.textDim : C.crimson }}>
                    {m.finished ? `จบ ${m.homeGoals}-${m.awayGoals}` : m.status === "scheduled" ? "รอคิกอฟ" : `🔴 ${m.homeGoals}-${m.awayGoals}`}
                  </span>
                </button>
                {openMatchId === m.matchId && (
                  <div style={{ marginTop: 6 }}>
                    <OnlineLiveMatchPanel matchId={m.matchId} myClubId={myClub.id} mySquad={null} onClose={() => setOpenMatchId(null)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

const BP_REWARD_LABEL = {
  coin: (r) => `💰 Master Coin x${r.amount}`,
  cosmetic: (r) => `✨ ไอเทมตกแต่ง: ${r.id}`,
  staffCard: (r) => `🎴 การ์ดสตาฟ (${r.rarity})`,
};

function BattlePassView() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [claimingTier, setClaimingTier] = useState(null);

  async function load() {
    try {
      const d = await fetchBattlePassStatus();
      setStatus(d);
    } catch (e) {
      setError(e.message || "โหลด Battle Pass ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function handleClaim(tierNumber) {
    setClaimingTier(tierNumber);
    try {
      await claimOnlineBattlePassTier(tierNumber);
      await load();
    } catch (e) {
      setError(e.message || "รับรางวัลไม่สำเร็จ");
    } finally {
      setClaimingTier(null);
    }
  }

  if (loading) return <Panel><div style={{ fontSize: 12, color: C.textDim, textAlign: "center", padding: 20 }}>กำลังโหลด...</div></Panel>;
  if (!status) {
    return (
      <Panel>
        <SectionLabel sub="ต้องเข้าสู่โลกออนไลน์ก่อนถึงจะสะสม XP ได้">🎖️ Battle Pass</SectionLabel>
        {error && <div style={{ fontSize: 11, color: C.crimson }}>{error}</div>}
      </Panel>
    );
  }

  const progressPct = status.nextTierXp
    ? Math.min(100, Math.round((status.xp / status.nextTierXp) * 100))
    : 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel style={{ border: `1px solid ${C.amber}` }}>
        <SectionLabel style={{ color: C.amber }} sub={`รอบเดือน ${status.seasonMonth} — รีเซ็ตทุกต้นเดือน (ตารางคะแนนลีคด้วย)`}>🎖️ Battle Pass</SectionLabel>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.chalk, marginTop: 4 }}>
          Tier {status.tier} <span style={{ fontSize: 11, color: C.textDim, fontWeight: 500 }}>· {status.xp} XP</span>
        </div>
        {status.nextTierXp != null && (
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 8, borderRadius: 4, background: C.panel2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPct}%`, background: C.amber, borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>{status.xp} / {status.nextTierXp} XP ถึง tier ถัดไป</div>
          </div>
        )}
        <div style={{ fontSize: 9.5, color: C.textDim, marginTop: 8 }}>
          ได้ XP จาก: ชนะแมทลีค · เสมอ · แพ้ (น้อยกว่า) · login รายวัน
        </div>
      </Panel>

      {error && <div style={{ fontSize: 11, color: C.crimson, padding: "8px 10px", borderRadius: 8, background: "rgba(193,68,14,.15)" }}>{error}</div>}

      <Panel>
        <SectionLabel sub="ปลดล็อกตาม XP สะสม — กดรับได้ทันทีที่ถึง tier">รางวัลตาม Tier</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {status.tiers.map((row) => {
            const unlocked = status.xp >= row.xpRequired;
            const claimed = status.claimedTiers.includes(row.tier);
            return (
              <div key={row.tier} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "9px 10px", borderRadius: 8,
                background: unlocked ? C.panel2 : "rgba(255,255,255,.03)",
                border: `1px solid ${unlocked ? C.amber : C.steel}`, opacity: unlocked ? 1 : 0.55,
              }}>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: C.chalk }}>Tier {row.tier} <span style={{ fontSize: 9.5, color: C.textDim, fontWeight: 500 }}>({row.xpRequired} XP)</span></div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{(BP_REWARD_LABEL[row.reward.type] || (() => "รางวัล"))(row.reward)}</div>
                </div>
                {claimed ? (
                  <span style={{ fontSize: 10, color: C.good, fontWeight: 700 }}>✅ รับแล้ว</span>
                ) : unlocked ? (
                  <button type="button" disabled={claimingTier === row.tier} onClick={() => handleClaim(row.tier)} style={{
                    fontSize: 10.5, fontWeight: 700, padding: "6px 12px", borderRadius: 6, cursor: "pointer",
                    background: C.amber, color: "#1c1305", border: "none",
                  }}>
                    {claimingTier === row.tier ? "..." : "รับรางวัล"}
                  </button>
                ) : (
                  <span style={{ fontSize: 10, color: C.textDim }}>🔒</span>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/* ============================== MORE MENU ============================== */
function MoreView({ setTab, marketOpen, isOnline }) {
  const items = [
    ...(isOnline ? [{ id: "onlinematch", label: "แข่งขันสด", desc: "ดูแมทอัตโนมัติตามเวลาจริง + เปลี่ยนตัว", icon: "🔴" }] : []),
    ...(isOnline ? [{ id: "onlinemarket", label: "ตลาดออนไลน์", desc: "เสนอซื้อนักเตะทีมอื่นโดยตรง", icon: "🤝" }] : []),
    ...(isOnline ? [{ id: "battlepass", label: "Battle Pass", desc: "XP รายเดือน · รับรางวัลตาม tier", icon: "🎖️" }] : []),
    { id: "profile", label: "โปรไฟล์สโมสร", desc: "ถ้วยรางวัล · สถิติทุกฤดูกาล", icon: "🏆" },
    { id: "club", label: "สโมสร", desc: "แฟนบอล · สปอนเซอร์ · การเงิน", icon: "🏟️" },
    { id: "staffcards", label: "การ์ดสตาฟ", desc: "สุ่ม · กระเป๋า · รวมการ์ด", icon: "🎴" },
    { id: "staffguide", label: "คู่มือสตาฟ", desc: "บัพแต่ละตำแหน่ง · จ้างที่ไหน", icon: "📖" },
    { id: "coach", label: "ห้องโค้ช", desc: "ปรับ/เปลี่ยนโค้ชทุกตำแหน่ง", icon: "🧑‍🏫" },
    { id: "medical", label: "ห้องพยาบาล", desc: "บาดเจ็บ · หมอ/นักกายภาพ", icon: "🏥" },
    { id: "shop", label: "ร้านค้า", desc: "Socker Coin + ไอเทม", icon: "🛒" },
    { id: "table", label: "ตารางลีกเต็ม", desc: "คะแนน + ดู roster Master League", icon: "📊" },
    { id: "training", label: "ฝึกซ้อม", desc: "แผนฝึก + อัปเกรดสนาม", icon: "🏋️" },
    { id: "academy", label: "อคาเดมี", desc: "ดาวรุ่ง + แมวมองเยาวชน", icon: "🌱" },
    { id: "settings", label: "ตั้งค่า", desc: "บันทึก · รีเซ็ต · ออนไลน์", icon: "⚙" },
    { id: "feedback", label: "Feedback", desc: "เขียนความคิดเห็น · Like/Dislike", icon: "💬" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Panel>
        <SectionLabel>เมนูเพิ่มเติม</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {items.map((it) => (
            <button key={it.id} type="button" onClick={() => setTab(it.id)} style={{
              textAlign: "left", padding: "12px 10px", borderRadius: 8, cursor: "pointer",
              background: C.panel2, border: `1px solid ${C.steel}`, color: C.chalk,
            }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{it.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{it.label}</div>
              <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>{it.desc}</div>
            </button>
          ))}
        </div>
      </Panel>
      {marketOpen && (
        <div style={{ fontSize: 10, color: C.good, textAlign: "center" }}>🟢 ตลาดซื้อขายเปิดอยู่</div>
      )}
      <div style={{ fontSize: 9, color: C.textDim, textAlign: "center", fontFamily: MONO_FONT, opacity: 0.7 }}>
        v{GAME_VERSION} · save {SAVE_VERSION}
      </div>
    </div>
  );
}

/* ============================== BOTTOM NAV (FC web theme) ============================== */
function BottomNav({ tab, setTab, marketOpen, marketSub, setMarketSub, uiLang = "th" }) {
  const items = [
    { id: "dashboard", label: t(uiLang, "nav.dashboard"), icon: "⌂" },
    { id: "manager", label: t(uiLang, "nav.manager"), icon: "◆" },
    { id: "squad", label: t(uiLang, "nav.squad"), icon: "👕" },
    { id: "tactics", label: t(uiLang, "nav.tactics"), icon: "☰" },
    { id: "market", label: t(uiLang, "nav.market"), icon: marketOpen ? "●" : "¤", dot: marketOpen },
    { id: "more", label: t(uiLang, "nav.more"), icon: "⋯", active: ["table", "training", "academy", "settings", "shop", "staffcards", "coach", "medical", "club", "profile", "feedback", "battlepass"].includes(tab) },
  ];
  return (
    <nav className="fc-bottom-nav">
      {items.map((it) => {
        const active = tab === it.id || it.active;
        return (
          <button
            key={it.id}
            type="button"
            className={`fc-bottom-nav-btn${active ? " fc-bottom-nav-btn--active" : ""}`}
            onClick={() => {
              playUiSound("tabSwitch");
              if (it.id === "market") {
                setTab("market");
                if (tab !== "market") setMarketSub("trade");
              } else {
                setTab(it.id);
              }
            }}
          >
            <span className="fc-bottom-nav-icon" style={{ color: it.dot ? C.good : undefined }}>{it.icon}</span>
            <span className="fc-bottom-nav-label">{it.label}</span>
            {active && <span className="fc-bottom-nav-dot" />}
          </button>
        );
      })}
    </nav>
  );
}

export { LiveMatchModal };
