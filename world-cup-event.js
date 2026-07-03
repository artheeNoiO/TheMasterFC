/**
 * The Master World Cup — monthly live event (DESIGN SPEC ONLY)
 * Documented for roadmap + landing page. Not implemented in-game yet.
 */

export const WORLD_CUP_EVENT_NAME = "The Master World Cup";
export const WORLD_CUP_EVENT_NAME_SHORT = "Master World Cup";

/** จัดอีเวนต์ทุก 1 เดือน (ชีวิตจริง) */
export const WORLD_CUP_INTERVAL_MONTHS = 1;

/** ระยะเวลาอีเวนต์ทั้งหมด (วันจริง) */
export const WORLD_CUP_REAL_DURATION_DAYS = 2;

/** วันสมัคร / ส่งรายชื่อ (วันแรกของอีเวนต์) */
export const WORLD_CUP_REGISTRATION_DAYS = 1;

/** จำนวนนักเตะที่ผู้เล่นส่งได้ต่อครั้ง (อิงสัญชาติของนักเตะ) */
export const WORLD_CUP_NOMINEES_MAX = 10;

/** ระบบคัดเลือกทีมชาติ: สุ่มจาก pool ที่ผู้เล่นทั้งเซิร์ฟเวอร์ส่งมา */
export const WORLD_CUP_SELECTION_MODE = "nationality_pool_random";

/** สกุลเงินที่ใช้เดิมพันผลแพ้ชนะระหว่างอีเวนต์ */
export const WORLD_CUP_BET_CURRENCIES = ["budget", "master_coin"];

/** ทายประเทศแชมป์โลก — ทายถูกได้ Master Coin (หลังประกาศผล) */
export const WORLD_CUP_CHAMPION_PREDICTION = {
  /** 1 ประเทศต่อผู้เล่นต่ออีเวนต์ */
  onePickPerPlayer: true,
  /** ทายได้จนกว่าจะเริ่มแข่ง (ปิดพร้อม kickoff รอบแรก) */
  lockAt: "tournament_start",
  rewardCurrency: "master_coin",
};

/** หลังจบ: นักเตะฟอร์มดีโชว์บนระบบ + เจ้าของปล่อยขายตลาดได้ */
export const WORLD_CUP_POST_EVENT_MARKET = true;

export const WORLD_CUP_PHASES = [
  {
    id: "registration",
    title: "สมัคร & ส่งรายชื่อ",
    duration: "วันที่ 1 (1 วันเต็ม)",
    desc: "ส่งนักเตะที่ดีที่สุดของคุณได้สูงสุด 10 คน — อิงสัญชาติของนักเตะแต่ละคน",
  },
  {
    id: "selection",
    title: "ประกาศรายชื่อ",
    duration: "ก่อนเริ่มแข่ง",
    desc: "ระบบสุ่มคัดเลือกจาก pool ทั้งเซิร์ฟเวอร์ แล้วประกาศทีมชาติที่ได้ลงจริง",
  },
  {
    id: "champion_pick",
    title: "ทายแชมป์โลก",
    duration: "ก่อนเริ่มแข่ง (ปิดเมื่อ kickoff นัดแรก)",
    desc: "เลือก 1 ประเทศที่คิดว่าจะได้แชมป์ — ทายถูกได้รางวัล Master Coin หลังประกาศผล",
  },
  {
    id: "tournament",
    title: "ถ่ายทอดสด & เดิมพัน",
    duration: "วันแข่ง (ภายใน 2 วันอีเวนต์)",
    desc: "ดูแมตช์สด ทายผลแพ้ชนะรายนัดด้วยเงินในเกมหรือ Master Coin",
  },
  {
    id: "aftermath",
    title: "หลังจบการแข่ง",
    duration: "ถาวร",
    desc: "จ่ายรางวัลทายแชมป์ถูก · นักเตะคะแนนดีโชว์สถิติพิเศษ · เจ้าของสโมสรปล่อยขายตลาดได้",
  },
];
