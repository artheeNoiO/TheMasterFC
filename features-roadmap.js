/**
 * The Master FC — locked feature scope (DESIGN SPEC ONLY)
 * Sourced from FM24 / real-world club ops comparison. Not implemented in-game yet.
 */

/** Tier A — approved in full */
export const TIER_A_FEATURES = [
  {
    id: "ffp",
    title: "Financial Fair Play / งบจำกัด",
    desc: "โควต้าโอนรายฤดูกาล, บอร์ดเตือนใกล้ล้มละลาย, กติกาลีกออนไลน์",
  },
  {
    id: "contracts",
    title: "Contract depth",
    desc: "ค่าแต่ง, โบนัสลงสนาม, release clause, sell-on — ผูกตลาด + World Cup",
  },
  {
    id: "shadow_squad",
    title: "Shadow squad / แผน 3 ปี",
    desc: "เป้าหมายซื้อ 3–5 คน, แจ้งเตือนตลาด, วางแผน recruitment",
  },
  {
    id: "scouting_network",
    title: "Scouting network",
    desc: "ส่งแมวมองโซน/ลีก, รายงานจุดแข็ง-อ่อน-ราคา",
  },
  {
    id: "board_pressure",
    title: "Board / Job pressure",
    desc: "เป้าบอร์ด, โอกาสโดนไล่, Unexpected Events",
  },
  {
    id: "derby",
    title: "Derby / Rivalry",
    desc: "คู่แข่งใน shard — แฟน/รายได้/มูดพิเศษ",
  },
  {
    id: "stadium_economy",
    title: "Stadium economy",
    desc: "ขยายสนาม → ความจุ → fan cap → รายได้เหย้า",
  },
  {
    id: "master_world_cup",
    title: "The Master World Cup",
    desc: "อีเวนต์รายเดือน — ส่งนักเตะ, ทายแชมป์, เดิมพัน, โบนัสหลังจบ (see world-cup-event.js)",
  },
];

/** Tier B — approved except women's football */
export const TIER_B_FEATURES = [
  {
    id: "press_media",
    title: "Press / Media (สั้น)",
    desc: "2 ทางเลือกบน Dashboard — มูด/แฟน/บอร์ด ไม่ทำแถลงข่าวยาว",
  },
  {
    id: "player_conversations",
    title: "Player conversations",
    desc: "event card — ขอขึ้นเดือน, ขอลง, ไม่มีัติ (ไม่ใช่ chat ลึก)",
  },
  {
    id: "staff_delegation",
    title: "Staff delegation",
    desc: "มอบหมายตลาด/ฝึก/แถลงข่าวให้สตาช์ — ขยาย auto mode",
  },
  {
    id: "youth_intake",
    title: "Youth intake day",
    desc: "1 ครั้ง/ฤดูกาล — รับเด็กใหม่ทั้งชุด มีพิธี/hype",
  },
  {
    id: "pre_season",
    title: "Pre-season",
    desc: "อุ่นเครื่อง 2–3 นัดก่อน day 1 ไม่กระทบ save หนัก",
  },
  {
    id: "injury_depth",
    title: "Injury depth",
    desc: "เบา/กลาง/หนัก + rehab — ห้ามซ้อมหนัก",
  },
  {
    id: "b_team",
    title: "B-team / U23",
    desc: "ลีกสำรองหรือดาวรุ่งลงยืม auto — รายละเอียด TBD",
  },
  {
    id: "xg_dashboard",
    title: "Data / xG dashboard",
    desc: "xG หลังจบแมตช์ + สรุป 1 หน้า",
  },
];

/** Tier B — explicitly rejected */
export const TIER_B_REJECTED = [
  { id: "womens_football", title: "Women's football", reason: "Out of scope" },
];

/** Tier C — all rejected */
export const TIER_C_REJECTED = [
  "Work permit / visa",
  "Agent แยกตัว",
  "Affiliate / feeder club",
  "VAR / กรรมการ / สภาพสนามละเอียด",
  "Create-a-club / Versus mode",
  "Touchline shouts แมตช์สด",
];

/** Suggested implementation order (design only) */
export const FEATURE_IMPLEMENTATION_ORDER = [
  "master_world_cup",
  "board_pressure",
  "stadium_economy",
  "ffp",
  "derby",
  "unexpected_events_bundle",
  "scouting_network",
  "shadow_squad",
  "contracts",
  "youth_intake",
  "pre_season",
  "injury_depth",
  "press_media",
  "player_conversations",
  "staff_delegation",
  "xg_dashboard",
  "b_team",
];
