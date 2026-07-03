/**
 * Live score pitch — ambient layer (bet365/FM style)
 * ใช้ pass-simulator สำหรับ build-up / ส่งบอลแบบฟุตบอลจริง
 *
 * ระบบซีนต่อเนื่อง (ไม่มีรีเพลย์แยก — ทุกอย่างเกิดในจอเดียว):
 * - shotSeq: จังหวะยิงพร้อมสโลว์โมชั่น (เงื้อ→ยิง) + วิถีเส้นปะ (shotPath)
 * - setPiece corner: บอลออกหลัง → วิ่งไปเตะมุม → ออกันหน้าโกล → เปิด → จบช็อต → กลับตำแหน่ง
 * - setPiece freekick: เดินมาตั้งกำแพง → ยิง (สโลว์โม) → กลับตำแหน่ง
 * - celebration: ยิงเข้า ทั้งทีมวิ่งดีใจมุมธง + กระโดดค้าง
 * - GK เปิดเกมใหม่ สั้น/ยาว สุ่ม หลังได้บอลจากช็อต
 */

import {
  createPassSimState,
  planNextPass,
  beginWindup,
  beginPass,
  beginShot,
  tickPassFlight,
  dribbleHoldTime,
  receiverRunTarget,
  supportRunTarget,
  aimPassAtReceiver,
  resetPassChain,
  pitchZone,
  slotPassRole,
  PASS_PROFILES,
} from "./pass-simulator.js";

const PLAY_MIN = 8;
const PLAY_MAX = 92;
const ROLL_SPEED = 30; // เพดานความเร็วบอลกลิ้ง (หน่วยสนาม/วินาที) — ระยะไกลแค่ไหนก็กลิ้ง ไม่วาป
const GOAL_HALF_W = 10;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** เลื่อนบอลเข้าหาเป้าแบบมีเพดานความเร็ว — หัวใจของ "บอลกลิ้ง ไม่วาป" */
function rollBallToward(b, tx, ty, dt, k = 9) {
  const ddx = tx - b.px;
  const ddy = ty - b.py;
  let mx = ddx * Math.min(1, dt * k);
  let my = ddy * Math.min(1, dt * k);
  const md = Math.hypot(mx, my);
  const cap = ROLL_SPEED * dt;
  if (md > cap && md > 0.0001) {
    mx *= cap / md;
    my *= cap / md;
  }
  b.px += mx;
  b.py += my;
}

/** จุดจบช็อตตามผลที่ตัดสินแล้ว (เข้า = ก้นตาข่าย ลึก 3 หน่วยตามภาพตาข่ายจริง) */
function shotOutcomePoint(outcome, goalPx, fwd) {
  const cy = 50;
  const side = Math.random() < 0.5 ? -1 : 1;
  if (outcome === "goal") {
    return { px: goalPx + fwd * 3, py: clamp(cy + side * (5.5 + Math.random() * 3.5), cy - GOAL_HALF_W + 1, cy + GOAL_HALF_W - 1) };
  }
  if (outcome === "save") {
    return { px: goalPx - fwd * 2, py: clamp(cy + side * (4 + Math.random() * 4.5), cy - GOAL_HALF_W + 1, cy + GOAL_HALF_W - 1) };
  }
  if (outcome === "post") {
    return { px: goalPx, py: cy + side * GOAL_HALF_W };
  }
  // wide — ออกหลังเส้น นอกเสา
  return { px: goalPx + fwd * 1.5, py: cy + side * (GOAL_HALF_W + 3 + Math.random() * 6) };
}

export function slotToPitchAmbient(slot, side) {
  const py = slot.x;
  const advance = (100 - slot.y) / 88;
  const px = side === "home" ? 8 + advance * 78 : 92 - advance * 78;
  return { px, py };
}

function initTeamAmbient(slots, side) {
  return slots.map((slot, i) => {
    const a = slotToPitchAmbient(slot, side);
    return { px: a.px, py: a.py, phase: i * 0.83 + (side === "home" ? 0 : 1.7) };
  });
}

/** target = home + (ballPos - center) * shiftFactor — ทั้งบล็อกขยับเป็นแผงตามบอล */
function fmBlockShift(slot, ball, side, hasBall) {
  const bx = ball.px - 50;
  const by = ball.py - 50;
  const grp = slot.pos || "MF";
  const depth = clamp(slot.y / 92, 0, 1);
  const fwd = side === "home" ? 1 : -1;

  const shiftFactor = {
    GK: 0.045,
    DF: hasBall ? 0.13 : 0.15,
    MF: hasBall ? 0.16 : 0.14,
    FW: hasBall ? 0.16 : 0.11,
  }[grp] ?? 0.14;

  let shiftX = bx * shiftFactor;
  let shiftY = by * shiftFactor * 0.55;

  if (hasBall) {
    shiftX += fwd * (0.65 + depth * 0.5);
  } else {
    shiftX -= fwd * (0.4 + (1 - depth) * 0.28);
  }

  return { shiftX, shiftY };
}

function carrierIdx(state) {
  return state.possSide === "home" ? state.carrierHome : state.carrierAway;
}

function setCarrier(state, idx) {
  if (state.possSide === "home") state.carrierHome = idx;
  else state.carrierAway = idx;
}

function oppTeam(state, possSide) {
  return possSide === "home"
    ? { positions: state.away, slots: state.awaySlots }
    : { positions: state.home, slots: state.homeSlots };
}

function dribbleBallAtCarrier(teamArr, side, idx) {
  const p = teamArr[idx];
  if (!p) return { px: 50, py: 50 };
  const fwd = side === "home" ? 1 : -1;
  return {
    // ขยายขอบเขตให้ครอบคลุม GK ยืนกรอบเล็ก (เดิม 22..78 ทำให้บอลลอยห่างมือ GK)
    px: clamp(p.px + fwd * 2.0, 4, 96),
    py: clamp(p.py, 8, 92),
  };
}

function gkIndexOf(slots) {
  const i = slots.findIndex((sl) => sl.pos === "GK");
  return i >= 0 ? i : 0;
}

function emptyBall(x = 46, y = 50) {
  return {
    px: x, py: y,
    fromPx: x, fromPy: y,
    toPx: x, toPy: y,
    t: 1,
    phase: "dribble",
    fromCarrier: null,
    toCarrier: null,
    passType: null,
    passSpeed: null,
    passArc: null,
    windupT: 0,
    windupDur: 0.32,
    airHeight: 0,
    curveSign: 1,
  };
}

function firstBuildCarrier(slots) {
  const centralDf = slots.findIndex((s) => s.pos === "DF" && Math.abs((s.x ?? 50) - 50) < 20);
  if (centralDf >= 0) return centralDf;
  const anyDf = slots.findIndex((s) => s.pos === "DF");
  if (anyDf >= 0) return anyDf;
  const dm = slots.findIndex((s) => s.dpos === "DM" || (s.pos === "MF" && Math.abs((s.x ?? 50) - 50) < 16));
  return dm >= 0 ? dm : 2;
}

/** สถานะ ambient — อัปเดตทุก rAF */
export function createAmbientPitchState(homeSlots, awaySlots) {
  return {
    ball: emptyBall(),
    possSide: "home",
    t: 0,
    dribbleHold: 0,
    stallCycles: 0,
    carrierHome: firstBuildCarrier(homeSlots),
    carrierAway: firstBuildCarrier(awaySlots),
    homeSlots,
    awaySlots,
    passSim: createPassSimState(),
    pendingPass: null,
    home: initTeamAmbient(homeSlots, "home"),
    away: initTeamAmbient(awaySlots, "away"),
    referee: { px: 50, py: 65 },
    // ระบบซีน
    timeScale: 1,
    shotSeq: null,
    setPiece: null,
    celebration: null,
    restart: null,
    shotPath: null,
    gkHold: 0,
    forceGkLaunch: null,
    pendingEvents: [],
  };
}

/* ============================ จังหวะยิง (สโลว์โมชั่น) ============================ */

/**
 * เริ่มจังหวะยิงในจอปกติ — สโลว์โมตั้งแต่เงื้อ (aim) จนบอลถึงปลายทาง
 * ยิงเข้า → สโลว์ต่อจนบอลถึงก้นตาข่ายแล้วเริ่มฉลอง / ไม่เข้า → คืนความเร็วทันทีที่บอลจบ
 * counted: ช็อตที่ React นับสถิติ/สกอร์ไปแล้ว = true; ช็อตที่เกิดในซีน (เตะมุม/ฟรีคิก) = false ให้ React นับตอน resolve
 */
export function beginAmbientShot(state, { shotSide, outcome, counted = true, aimTime = 0.35 }) {
  const s = state;
  if (!s || s.shotSeq || s.celebration || s.restart) return s;
  // ตัวครองบอลล่าสุดที่บันทึกไว้ของฝั่งนี้อาจ "ค้าง" เป็น GK จากตอนเพิ่งรับเซฟ/ลูกตั้งเตะ
  // ยังไม่ทันจ่ายต่อ — ถ้าปล่อยยิงจากตรงนี้จะกลายเป็นยิงข้ามสนามทั้งลูก (ไม่มีจริงในฟุตบอล)
  // ผู้รักษาประตูทำได้แค่เปิดยาว/ส่งสั้นเท่านั้น ไม่มีสิทธิ์เป็นคนยิงในซีนนี้ — ยกเลิกจังหวะยิงนี้ไปเลยถ้าเจอ
  const preSlots = shotSide === "home" ? s.homeSlots : s.awaySlots;
  const preIdx = shotSide === "home" ? s.carrierHome : s.carrierAway;
  if (preSlots?.[preIdx]?.pos === "GK") return s;

  s.possSide = shotSide;
  s.pendingPass = null;
  s.ball.phase = "dribble";
  s.ball.t = 1;
  const fwd = shotSide === "home" ? 1 : -1;
  const goalPx = shotSide === "home" ? 100 : 0;
  const outPt = shotOutcomePoint(outcome, goalPx, fwd);
  s.shotSeq = {
    phase: "aim", t: 0, outcome, shotSide, outPt, fwd, goalPx, counted,
    aimTime, shooterIdx: carrierIdx(s),
  };
  s.timeScale = 0.35;
  s.shotPath = {
    fromPx: s.ball.px, fromPy: s.ball.py, toPx: outPt.px, toPy: outPt.py,
    arc: 1.2, curveSign: Math.random() < 0.5 ? 1 : -1, fwdSign: fwd,
  };
  return s;
}

function advanceShotSeq(s, dt) {
  const q = s.shotSeq;
  const b = s.ball;
  q.t += dt;
  if (q.phase === "aim") {
    const teamArr = q.shotSide === "home" ? s.home : s.away;
    const pos = dribbleBallAtCarrier(teamArr, q.shotSide, q.shooterIdx);
    rollBallToward(b, pos.px, pos.py, dt);
    b.fromPx = b.toPx = b.px;
    b.fromPy = b.toPy = b.py;
    b.t = 1;
    b.airHeight = 0;
    if (q.t >= q.aimTime) {
      q.phase = "fly";
      s.shotPath.fromPx = b.px;
      s.shotPath.fromPy = b.py;
      beginShot(b, {
        fromPx: b.px, fromPy: b.py, toPx: q.outPt.px, toPy: q.outPt.py,
        fromCarrier: q.shooterIdx, speed: 2.1, arc: 1.2,
      });
      b.curveSign = s.shotPath.curveSign; // ให้บอลบินตรงกับเส้นปะที่วาดไว้
    }
  } else if (q.phase === "fly") {
    const done = tickPassFlight(b, q.shotSide, dt);
    if (done) resolveShotSeq(s);
  }
}

function resolveShotSeq(s) {
  const q = s.shotSeq;
  const b = s.ball;
  s.shotSeq = null;
  s.setPiece = null; // ซีนแม่ (เตะมุม/ฟรีคิก) จบพร้อมช็อต — ทุกคนวิ่งกลับตำแหน่งเอง
  s.shotPath = null;
  s.timeScale = 1;
  b.phase = "dribble";
  b.t = 1;
  b.fromCarrier = null;
  b.toCarrier = null;
  b.passType = null;
  b.airHeight = 0;
  s.pendingEvents.push({ type: "shotResolved", outcome: q.outcome, shotSide: q.shotSide, counted: q.counted });
  if (q.outcome === "goal") {
    startCelebration(s, q);
  } else {
    // เซฟ/หลุดกรอบ/ชนเสา — GK ฝั่งรับเก็บบอล (บอลกลิ้งเข้ามือด้วย ROLL_SPEED) แล้วตั้งเปิดเกมใหม่
    const gkSide = q.shotSide === "home" ? "away" : "home";
    const gkSlots = gkSide === "home" ? s.homeSlots : s.awaySlots;
    setAmbientPossession(s, gkSide, gkIndexOf(gkSlots));
    s.gkHold = 0.9;
    s.forceGkLaunch = Math.random() < 0.5 ? "long" : "short";
  }
}

/* ============================ ฉลองประตู ============================ */

function startCelebration(s, q) {
  const cornerPy = q.outPt.py >= 50 ? 94 : 6;
  // อีกฝั่งเตรียมเขี่ยกลาง — บอลกลิ้งจากตาข่ายไปหาตัวเขี่ยระหว่างฉลอง (ต่อเนื่อง ไม่วาป)
  const kickSide = q.shotSide === "home" ? "away" : "home";
  const kickSlots = kickSide === "home" ? s.homeSlots : s.awaySlots;
  let idx = kickSlots.findIndex((sl) => sl.pos === "FW");
  if (idx < 0) idx = kickSlots.findIndex((sl) => sl.pos === "MF");
  s.celebration = {
    t: 0, side: q.shotSide, runDur: 1.4, dur: 3.6, kickSide,
    targetPx: clamp(q.goalPx - q.fwd * 5, 4, 96),
    targetPy: cornerPy,
    scorerIdx: q.shooterIdx,
  };
  setAmbientPossession(s, kickSide, Math.max(0, idx));
  s.gkHold = 0;
  s.forceGkLaunch = null;
}

function advanceCelebration(s, dt) {
  const c = s.celebration;
  const b = s.ball;
  c.t += dt;
  const teamArr = s.possSide === "home" ? s.home : s.away;
  const pos = dribbleBallAtCarrier(teamArr, s.possSide, carrierIdx(s));
  rollBallToward(b, pos.px, pos.py, dt);
  b.fromPx = b.toPx = b.px;
  b.fromPy = b.toPy = b.py;
  b.t = 1;
  b.airHeight = 0;
  if (c.t >= c.dur) {
    // ฉลองจบแล้ว ยังเล่นต่อไม่ได้ทันที — ต้องกลับตำแหน่งครบก่อนแล้วรอนกหวีด (ดู advanceRestart)
    s.celebration = null;
    s.restart = { t: 0, kickSide: c.kickSide, resetDur: 1.8, whistleDur: 0.5, whistled: false };
  }
}

/** หลังฉลองประตูจบ — ทั้ง 2 ทีมกลับเข้าตำแหน่งฟอร์เมชันจริง (ไม่ใช่ตำแหน่งขยับตามบอล) แล้วรอนกหวีดก่อนเขี่ยกลาง */
function advanceRestart(s, dt) {
  const r = s.restart;
  r.t += dt;
  if (r.t >= r.resetDur) {
    if (!r.whistled) {
      r.whistled = true;
      s.pendingEvents.push({ type: "kickoffWhistle" });
    }
    if (r.t >= r.resetDur + r.whistleDur) s.restart = null;
  }
}

/* ============================ เตะมุม ============================ */

/** เตะมุม: บอลออกหลัง → 1-2 คนวิ่งไปมุมธง → ออกันหน้าโกล → เปิด → โหม่ง/เคลียร์/GK จับ → กลับตำแหน่ง */
export function startCornerScene(state, attackSide) {
  const s = state;
  if (!s || s.shotSeq || s.setPiece || s.celebration || s.restart) return s;
  const fwd = attackSide === "home" ? 1 : -1;
  const goalPx = attackSide === "home" ? 100 : 0;
  const cornerPy = s.ball.py >= 50 ? 96 : 4;
  const slots = attackSide === "home" ? s.homeSlots : s.awaySlots;
  const defSide = attackSide === "home" ? "away" : "home";
  const defSlots = defSide === "home" ? s.homeSlots : s.awaySlots;

  // คนเตะมุม: ปีกฝั่งเดียวกับมุมถ้ามี ไม่งั้นกองกลาง / ตัวส่งสั้น: อีกคนใกล้ๆ
  let takerIdx = slots.findIndex((sl) => slotPassRole(sl) === "WING" && ((sl.x ?? 50) > 50) === (cornerPy > 50));
  if (takerIdx < 0) takerIdx = slots.findIndex((sl) => slotPassRole(sl) === "WING");
  if (takerIdx < 0) takerIdx = slots.findIndex((sl) => sl.pos === "MF");
  if (takerIdx < 0) takerIdx = 5;
  let shortIdx = slots.findIndex((sl, i) => i !== takerIdx && sl.pos === "MF");
  if (shortIdx < 0) shortIdx = -1;

  // คนเข้าไปออหน้าโกล: FW ก่อน เติมด้วย MF/DF สูงสุด 5 คน
  const pool = slots
    .map((sl, i) => ({ sl, i }))
    .filter(({ sl, i }) => i !== takerIdx && i !== shortIdx && sl.pos !== "GK");
  pool.sort((a, b) => (b.sl.pos === "FW" ? 2 : b.sl.pos === "MF" ? 1 : 0) - (a.sl.pos === "FW" ? 2 : a.sl.pos === "MF" ? 1 : 0));
  const raiders = pool.slice(0, 5).map(({ i }) => i);
  const boxTargets = {};
  raiders.forEach((i, k) => {
    boxTargets[i] = { px: goalPx - fwd * (5 + (k % 3) * 3.2), py: 41 + ((k * 7) % 19) };
  });
  // ฝั่งรับถอยมาประกบในกรอบตัวต่อตัว
  const defPool = defSlots
    .map((sl, i) => ({ sl, i }))
    .filter(({ sl }) => sl.pos !== "GK")
    .slice(0, 6);
  const markTargets = {};
  defPool.forEach(({ i }, k) => {
    markTargets[i] = { px: goalPx - fwd * (4 + (k % 3) * 3), py: 43 + ((k * 5) % 15) };
  });

  s.possSide = attackSide;
  s.pendingPass = null;
  s.ball.phase = "dribble";
  s.ball.t = 1;
  s.setPiece = {
    type: "corner", phase: "out", t: 0,
    attackSide, defSide, fwd, goalPx, cornerPy,
    outPt: { px: clamp(goalPx + fwd * 2, 1, 99), py: cornerPy > 50 ? 74 : 26 },
    cornerPt: { px: clamp(goalPx - fwd * 1, 2, 98), py: cornerPy },
    headerPt: { px: goalPx - fwd * (6 + Math.random() * 3), py: 44 + Math.random() * 12 },
    takerIdx, shortIdx, raiders, boxTargets, markTargets,
    headerIdx: raiders[0] ?? takerIdx,
  };
  return s;
}

function advanceCorner(s, dt) {
  const sp = s.setPiece;
  const b = s.ball;
  sp.t += dt;
  if (sp.phase === "out") {
    // บอลกลิ้งออกหลังเส้นให้เห็นก่อน
    rollBallToward(b, sp.outPt.px, sp.outPt.py, dt);
    b.fromPx = b.toPx = b.px;
    b.fromPy = b.toPy = b.py;
    b.airHeight = 0;
    if (sp.t >= 0.8) {
      sp.phase = "walk";
      sp.t = 0;
    }
  } else if (sp.phase === "walk") {
    // บอลถูกพาไปตั้งที่มุมธง ระหว่างที่นักเตะวิ่งเข้าจุด
    rollBallToward(b, sp.cornerPt.px, sp.cornerPt.py, dt, 6);
    b.fromPx = b.toPx = b.px;
    b.fromPy = b.toPy = b.py;
    if (sp.t >= 2.0) {
      sp.phase = "cross";
      sp.t = 0;
      beginShot(b, {
        fromPx: b.px, fromPy: b.py, toPx: sp.headerPt.px, toPy: sp.headerPt.py,
        fromCarrier: sp.takerIdx, speed: 1.15, arc: 5.5,
      });
    }
  } else if (sp.phase === "cross") {
    const done = tickPassFlight(b, sp.attackSide, dt);
    if (done) {
      const r = Math.random();
      if (r < 0.55) {
        // โหม่ง! — ต่อเข้าจังหวะยิงสโลว์โม (ซีนคนออกันหน้าโกลคงอยู่จนช็อตจบ)
        setCarrier(s, sp.headerIdx);
        sp.phase = "header";
        const roll = Math.random();
        const outcome = roll < 0.18 ? "goal" : roll < 0.55 ? "save" : roll < 0.88 ? "wide" : "post";
        const keepSp = sp;
        s.setPiece = null; // beginAmbientShot กันซีนซ้อน — ปล่อยผ่านแล้วคืน setPiece ให้คนยังออกันอยู่
        beginAmbientShot(s, { shotSide: sp.attackSide, outcome, counted: false, aimTime: 0.2 });
        s.setPiece = keepSp;
      } else if (r < 0.8) {
        // กองหลังโขกเคลียร์ออกมากลางสนาม
        const defSlots = sp.defSide === "home" ? s.homeSlots : s.awaySlots;
        const dfIdx = Math.max(0, defSlots.findIndex((sl) => sl.pos === "MF"));
        s.possSide = sp.defSide;
        setCarrier(s, dfIdx);
        beginPass(b, {
          fromCarrier: null, toCarrier: dfIdx,
          toPx: clamp(sp.goalPx - sp.fwd * (28 + Math.random() * 14), 10, 90),
          toPy: 25 + Math.random() * 50,
          passType: "long", phase: "pass", speed: 0.95, arc: 3.2,
        }, { px: b.px, py: b.py });
        s.setPiece = null;
        resetPassChain(s.passSim);
        s.dribbleHold = 0;
      } else {
        // GK ออกมาจับ แล้วเปิดเกมใหม่
        const gkSlots = sp.defSide === "home" ? s.homeSlots : s.awaySlots;
        setAmbientPossession(s, sp.defSide, gkIndexOf(gkSlots));
        s.setPiece = null;
        s.gkHold = 1.0;
        s.forceGkLaunch = Math.random() < 0.5 ? "long" : "short";
        b.phase = "dribble";
        b.t = 1;
      }
    }
  }
  // phase "header": shotSeq เดินเรื่องแทน (dispatcher เรียก advanceShotSeq ก่อน) — ที่นี่ไม่ต้องทำอะไร
}

/* ============================ ฟรีคิก ============================ */

/** ฟรีคิก: นักเตะเดินมาตั้งกำแพง → ยิง (สโลว์โม+เส้นปะ) → ทุกคนกลับตำแหน่ง */
export function startFreekickScene(state, attackSide) {
  const s = state;
  if (!s || s.shotSeq || s.setPiece || s.celebration || s.restart) return s;
  const fwd = attackSide === "home" ? 1 : -1;
  const goalPx = attackSide === "home" ? 100 : 0;
  const defSide = attackSide === "home" ? "away" : "home";
  const defSlots = defSide === "home" ? s.homeSlots : s.awaySlots;
  const slots = attackSide === "home" ? s.homeSlots : s.awaySlots;

  const spot = {
    px: clamp(goalPx - fwd * (24 + Math.random() * 8), 12, 88),
    py: 50 + (Math.random() < 0.5 ? -1 : 1) * (12 + Math.random() * 16),
  };
  // กำแพง 4 คนขวางแนวบอล→ประตู ห่างบอล 8 หน่วย
  const dirPx = goalPx - spot.px;
  const dirPy = 50 - spot.py;
  const dirLen = Math.hypot(dirPx, dirPy) || 1;
  const ux = dirPx / dirLen;
  const uy = dirPy / dirLen;
  const wallCenter = { px: spot.px + ux * 8, py: spot.py + uy * 8 };
  const wallPool = defSlots
    .map((sl, i) => ({ sl, i }))
    .filter(({ sl }) => sl.pos === "MF" || sl.pos === "FW")
    .slice(0, 4);
  const wallTargets = {};
  wallPool.forEach(({ i }, k) => {
    const off = (k - (wallPool.length - 1) / 2) * 2.3;
    wallTargets[i] = { px: wallCenter.px + (-uy) * off, py: wallCenter.py + ux * off };
  });

  let takerIdx = slots.findIndex((sl) => sl.pos === "MF");
  if (takerIdx < 0) takerIdx = slots.findIndex((sl) => sl.pos === "FW");
  if (takerIdx < 0) takerIdx = 5;

  s.possSide = attackSide;
  s.pendingPass = null;
  s.ball.phase = "dribble";
  s.ball.t = 1;
  s.setPiece = {
    type: "freekick", phase: "setup", t: 0,
    attackSide, defSide, fwd, goalPx, spot, takerIdx, wallTargets,
  };
  return s;
}

function advanceFreekick(s, dt) {
  const sp = s.setPiece;
  const b = s.ball;
  sp.t += dt;
  if (sp.phase === "setup") {
    // บอลถูกวางที่จุดฟรีคิก นักเตะเดินเข้ากำแพง/จุดยิง
    rollBallToward(b, sp.spot.px, sp.spot.py, dt, 6);
    b.fromPx = b.toPx = b.px;
    b.fromPy = b.toPy = b.py;
    b.airHeight = 0;
    if (sp.t >= 2.2) {
      sp.phase = "shot";
      setCarrier(s, sp.takerIdx);
      const roll = Math.random();
      const outcome = roll < 0.15 ? "goal" : roll < 0.5 ? "save" : roll < 0.88 ? "wide" : "post";
      const keepSp = sp;
      s.setPiece = null;
      beginAmbientShot(s, { shotSide: sp.attackSide, outcome, counted: false, aimTime: 0.5 });
      s.setPiece = keepSp; // กำแพงยืนค้างจนช็อตจบ (resolveShotSeq เคลียร์ setPiece ให้)
    }
  }
  // phase "shot": shotSeq เดินเรื่องแทน
}

/* ============================ จุดโทษ ============================ */

/** จุดโทษ: ไม่มีกำแพง วางบอล 11 หน่วยหน้าประตู → ยิง (สโลว์โม+เส้นปะ) → ทุกคนกลับตำแหน่ง */
export function startPenaltyScene(state, attackSide) {
  const s = state;
  if (!s || s.shotSeq || s.setPiece || s.celebration || s.restart) return s;
  const fwd = attackSide === "home" ? 1 : -1;
  const goalPx = attackSide === "home" ? 100 : 0;
  const defSide = attackSide === "home" ? "away" : "home";
  const slots = attackSide === "home" ? s.homeSlots : s.awaySlots;

  const spot = { px: goalPx - fwd * 11, py: 50 };

  let takerIdx = slots.findIndex((sl) => sl.pos === "FW");
  if (takerIdx < 0) takerIdx = slots.findIndex((sl) => sl.pos === "MF");
  if (takerIdx < 0) takerIdx = 5;

  s.possSide = attackSide;
  s.pendingPass = null;
  s.ball.phase = "dribble";
  s.ball.t = 1;
  s.setPiece = {
    type: "penalty", phase: "setup", t: 0,
    attackSide, defSide, fwd, goalPx, spot, takerIdx,
  };
  return s;
}

function advancePenalty(s, dt) {
  const sp = s.setPiece;
  const b = s.ball;
  sp.t += dt;
  if (sp.phase === "setup") {
    // บอลถูกวางที่จุดโทษ นักเตะเดินมายืนเตรียมยิง (ไม่มีกำแพง)
    rollBallToward(b, sp.spot.px, sp.spot.py, dt, 6);
    b.fromPx = b.toPx = b.px;
    b.fromPy = b.toPy = b.py;
    b.airHeight = 0;
    if (sp.t >= 2.2) {
      sp.phase = "shot";
      setCarrier(s, sp.takerIdx);
      const roll = Math.random();
      const outcome = roll < 0.76 ? "goal" : roll < 0.92 ? "save" : "post";
      const keepSp = sp;
      s.setPiece = null;
      beginAmbientShot(s, { shotSide: sp.attackSide, outcome, counted: false, aimTime: 0.4 });
      s.setPiece = keepSp; // นักเตะยืนค้างจนช็อตจบ (resolveShotSeq เคลียร์ setPiece ให้)
    }
  }
  // phase "shot": shotSeq เดินเรื่องแทน
}

/* ============================ main advance ============================ */

/** อัปเดต ambient + pass simulator — ครอบครองบอลภายใน engine ไม่สลับทุก tick */
export function advanceAmbientPitch(state, dt, { pressure = 0, homeSlots, awaySlots } = {}) {
  const s = state;
  s.t += dt;
  if (homeSlots) s.homeSlots = homeSlots;
  if (awaySlots) s.awaySlots = awaySlots;

  if (s.shotSeq) {
    advanceShotSeq(s, dt);
  } else if (s.setPiece?.type === "corner") {
    advanceCorner(s, dt);
  } else if (s.setPiece?.type === "freekick") {
    advanceFreekick(s, dt);
  } else if (s.setPiece?.type === "penalty") {
    advancePenalty(s, dt);
  } else if (s.celebration) {
    advanceCelebration(s, dt);
  } else if (s.restart) {
    advanceRestart(s, dt);
  } else {
    advanceOpenPlay(s, dt, pressure);
  }

  // ผู้ตัดสิน — วิ่งตามเกมห่างๆ มีระยะหน่วง ไม่ประกบติดบอล
  const b = s.ball;
  const refTargetPx = clamp(b.px, 16, 84);
  const refTargetPy = clamp(b.py + (b.py > 50 ? -13 : 13), 22, 78);
  if (!s.referee) s.referee = { px: refTargetPx, py: refTargetPy };
  s.referee.px = lerp(s.referee.px, refTargetPx, Math.min(1, dt * 1.1));
  s.referee.py = lerp(s.referee.py, refTargetPy, Math.min(1, dt * 1.1));

  return s;
}

function advanceOpenPlay(s, dt, pressure) {
  const possSide = s.possSide;
  const slots = possSide === "home" ? s.homeSlots : s.awaySlots;
  const teamArr = possSide === "home" ? s.home : s.away;
  const b = s.ball;
  const pr = clamp(pressure, -1, 1);
  const cIdx = carrierIdx(s);
  const carrierSlot = slots[cIdx];
  const zone = pitchZone(slotToPitchAmbient(carrierSlot, possSide).px, possSide);

  if (b.phase === "dribble") {
    s.dribbleHold += dt;
    const pos = dribbleBallAtCarrier(teamArr, possSide, cIdx);
    rollBallToward(b, pos.px + pr * 0.4, pos.py, dt);
    b.fromPx = b.toPx = b.px;
    b.fromPy = b.toPy = b.py;
    b.t = 1;
    b.fromCarrier = null;
    b.toCarrier = null;
    b.airHeight = 0;

    // GK เพิ่งได้บอลจากช็อต — ถือนิ่งครู่หนึ่งก่อนเปิดสั้น/ยาวตามที่สุ่มไว้
    if (carrierSlot?.pos === "GK" && s.gkHold > 0) {
      s.gkHold -= dt;
      s.dribbleHold = 0;
      return;
    }

    let hold = dribbleHoldTime(carrierSlot?.pos || "MF", zone, Math.max(0, pr));
    // ปีกถือบอลนานขึ้น — จะได้เห็นการพาบอลเลี้ยงริมเส้น (updateTeamAmbient สั่งวิ่งให้)
    if (slotPassRole(carrierSlot) === "WING") hold += 0.9;
    const windupLead = (PASS_PROFILES.medium?.windup ?? 0.32) + 0.08;

    if (!s.pendingPass && s.dribbleHold >= hold - windupLead) {
      // GK เปิดยาว — ข้าม AI เลือกเป้า พุ่งไปหน้าเลย
      if (carrierSlot?.pos === "GK" && s.forceGkLaunch === "long") {
        const targets = slots
          .map((sl, i) => ({ sl, i }))
          .filter(({ sl, i }) => i !== cIdx && (sl.pos === "FW" || sl.pos === "MF"));
        const pick = targets[Math.floor(Math.random() * targets.length)];
        if (pick) {
          const anchor = slotToPitchAmbient(pick.sl, possSide);
          const plan = {
            fromCarrier: cIdx, toCarrier: pick.i,
            fromPx: b.px, fromPy: b.py, toPx: anchor.px, toPy: anchor.py,
            passType: "long", phase: "pass",
            speed: PASS_PROFILES.long.speed, arc: PASS_PROFILES.long.arc,
            windup: PASS_PROFILES.long.windup, dist: 0, zone,
            fromRole: "GK", targetRole: pick.sl.pos === "FW" ? "FW" : "MF",
            buildStage: s.passSim.buildStage,
          };
          s.pendingPass = aimPassAtReceiver(plan, teamArr[pick.i], possSide);
        }
        s.forceGkLaunch = null;
      } else {
        if (carrierSlot?.pos === "GK" && s.forceGkLaunch === "short") s.forceGkLaunch = null;
        const opp = oppTeam(s, possSide);
        const plan = planNextPass({
          slots,
          side: possSide,
          carrierIdx: cIdx,
          pressure: Math.max(0, pr),
          passSim: s.passSim,
          slotToPitch: slotToPitchAmbient,
          oppPositions: opp.positions,
          oppSlots: opp.slots,
          ballPos: { px: b.px, py: b.py },
          // ตัวเลือกแย่หมดมาแล้ว 1 รอบเต็ม — บังคับจ่ายตัวที่ดีที่สุดเท่าที่มี กันบอลค้างจนจบเกม
          forceAny: (s.stallCycles || 0) >= 1,
        });
        if (plan) {
          const recv = teamArr[plan.toCarrier];
          s.pendingPass = aimPassAtReceiver(plan, recv, possSide);
        }
      }
    }

    if (s.pendingPass && s.dribbleHold >= hold - windupLead) {
      beginWindup(b, s.pendingPass);
      b.fromPx = b.px;
      b.fromPy = b.py;
      s.stallCycles = 0;
    } else if (s.dribbleHold >= hold && !s.pendingPass) {
      s.stallCycles = (s.stallCycles || 0) + 1;
      s.dribbleHold = hold * 0.35;
    }
  } else if (b.phase === "windup") {
    b.windupT += dt;
    const pos = dribbleBallAtCarrier(teamArr, possSide, cIdx);
    rollBallToward(b, pos.px, pos.py, dt);
    b.fromPx = b.px;
    b.fromPy = b.py;
    b.airHeight = 0;

    if (s.pendingPass && b.windupT >= (b.windupDur ?? 0.32)) {
      const recv = teamArr[s.pendingPass.toCarrier];
      const plan = aimPassAtReceiver(s.pendingPass, recv, possSide);
      beginPass(b, plan, { px: b.px, py: b.py });
      s.pendingPass = null;
    }
  } else if (["pass", "through", "safe"].includes(b.phase)) {
    const done = tickPassFlight(b, possSide, dt);
    if (done) {
      setCarrier(s, b.toCarrier);
      b.phase = "dribble";
      b.t = 1;
      b.px = b.toPx;
      b.py = b.toPy;
      b.fromPx = b.toPx;
      b.fromPy = b.toPy;
      b.fromCarrier = null;
      b.toCarrier = null;
      b.passType = null;
      b.windupT = 0;
      s.pendingPass = null;
      s.dribbleHold = 0;
    }
  } else if (b.phase === "shot") {
    // ช็อตหลงมานอก shotSeq (ไม่ควรเกิด) — เก็บกลับเป็น dribble
    const done = tickPassFlight(b, possSide, dt);
    if (done) {
      b.phase = "dribble";
      b.t = 1;
    }
  }
}

/** แปลงเป็น ballSim ให้ TrackerMatchView ใช้ได้ */
export function ambientAsBallSim(state) {
  const b = state.ball;
  const carrier = state.possSide === "home" ? state.carrierHome : state.carrierAway;
  return {
    px: b.px,
    py: b.py,
    fromPx: b.fromPx,
    fromPy: b.fromPy,
    toPx: b.toPx,
    toPy: b.toPy,
    t: b.t,
    side: state.possSide,
    carrier,
    phase: b.phase,
    fromCarrier: b.fromCarrier,
    toCarrier: b.toCarrier,
    passType: b.passType,
    windupT: b.windupT,
    windupDur: b.windupDur,
    airHeight: b.airHeight ?? 0,
    buildStage: state.passSim?.buildStage,
  };
}

function stepPlayer(prev, tx, ty, maxStep, ease = 0.13) {
  const dx = tx - prev.px;
  const dy = ty - prev.py;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.001) return { px: prev.px, py: prev.py, vx: 0, vy: 0 };
  // เร่งเข้าหาเป้าตามระยะ (เหมือน p += (target-p)*speedFactor) แต่ล็อกเพดานความเร็วไว้กันวิ่งเร็วเกิน
  const step = Math.min(maxStep, dist * ease);
  const sc = step / dist;
  return { px: prev.px + dx * sc, py: prev.py + dy * sc, vx: dx * sc, vy: dy * sc };
}

// ความเร็วนักเตะ — ลดรวมอีก ~28% ผ่าน SPEED_SCALE ตามฟีดแบ็ก (จูนจุดเดียว)
const SPEED_SCALE = 0.72;
function fmMaxStep(slot, { isGK, isCarrier, isPasser, isReceiver, isPresser, running }) {
  if (isCarrier) return 0.32;
  if (isReceiver) return 0.29;
  if (isPresser) return 0.27;
  if (isPasser) return 0.05;
  if (isGK) return 0.1;
  const grp = slot.pos || "MF";
  if (grp === "DF") return running ? 0.17 : 0.13;
  if (grp === "MF") return running ? 0.21 : 0.16;
  if (grp === "FW") return running ? 0.24 : 0.19;
  return running ? 0.18 : 0.14;
}

/** ผู้เล่นฝ่ายรับที่ใกล้ผู้ครองบอลที่สุด — คนเดียวเท่านั้นที่วิ่งเข้าประกบ */
function findPresserIdx(slots, teamArr, ball) {
  let idx = -1;
  let best = Infinity;
  slots.forEach((slot, i) => {
    if (slot.pos === "GK") return;
    const p = teamArr[i];
    const d = Math.hypot(p.px - ball.px, p.py - ball.py);
    if (d < best) { best = d; idx = i; }
  });
  return idx;
}

function updateTeamAmbient(teamArr, slots, side, ball, possSide, animTick, carrierIndex, pendingPass, ctx) {
  const hasBall = side === possSide;
  const fwd = side === "home" ? 1 : -1;
  const isPassPhase = ["pass", "through", "safe"].includes(ball.phase) && ball.t < 1;
  const isShotPhase = ball.phase === "shot" && ball.t < 1;
  const isWindup = ball.phase === "windup";
  const pressIdx = hasBall ? -1 : findPresserIdx(slots, teamArr, ball);
  const ts = ctx?.timeScale ?? 1;
  const celeb = ctx?.celebration;
  const sp = ctx?.setPiece;
  const sq = ctx?.shotSeq;
  const restart = ctx?.restart;

  return slots.map((slot, i) => {
    const anchor = slotToPitchAmbient(slot, side);
    const p = teamArr[i];
    const block = fmBlockShift(slot, ball, side, hasBall);

    let targetPx = anchor.px + block.shiftX;
    let targetPy = anchor.py + block.shiftY;

    const isGK = slot.pos === "GK";
    // ผู้ยิง/ผู้จ่ายช่วงบอลลอย นับเป็น "ผู้จ่าย" — ยืนค้างท่าจบสวิงแทนวิ่งหนีทันที
    const isPasser = hasBall && (isPassPhase || isShotPhase) && ball.fromCarrier === i;
    const isReceiver = hasBall && (isPassPhase || isWindup) && ball.toCarrier === i;
    const isCarrier = hasBall && i === carrierIndex && (ball.phase === "dribble" || ball.phase === "windup");
    const isPresser = !hasBall && i === pressIdx;

    let sceneRun = false;
    let bounceOff = 0;

    if (restart) {
      // ฉลองจบแล้ว — ทั้ง 2 ทีมเดินกลับฟอร์เมชันจริง (ไม่ขยับตามบอล) รอนกหวีดก่อนเล่นต่อ
      targetPx = anchor.px;
      targetPy = anchor.py;
      sceneRun = true;
    } else if (celeb && side === celeb.side && !isGK) {
      // ทั้งทีมวิ่งไปมุมธง แล้วกระโดดดีใจค้าง
      const col = i % 4;
      const row = Math.floor(i / 4) % 3;
      targetPx = clamp(celeb.targetPx - fwd * (col * 2.6), 3, 97);
      targetPy = clamp(celeb.targetPy + (celeb.targetPy > 50 ? -1 : 1) * (2 + row * 3), 3, 97);
      sceneRun = true;
      if (celeb.t > celeb.runDur) bounceOff = Math.abs(Math.sin((celeb.t - celeb.runDur) * 6.5 + i * 0.9)) * 1.4;
    } else if (sp?.type === "corner") {
      if (side === sp.attackSide) {
        if (i === sp.takerIdx) {
          targetPx = clamp(sp.cornerPt.px - sp.fwd * 1.5, 1, 99);
          targetPy = sp.cornerPt.py > 50 ? sp.cornerPt.py + 1.5 : sp.cornerPt.py - 1.5;
          sceneRun = true;
        } else if (i === sp.shortIdx) {
          targetPx = clamp(sp.cornerPt.px - sp.fwd * 8, 2, 98);
          targetPy = sp.cornerPt.py > 50 ? sp.cornerPt.py - 5 : sp.cornerPt.py + 5;
          sceneRun = true;
        } else if (sp.boxTargets[i]) {
          targetPx = sp.boxTargets[i].px;
          targetPy = sp.boxTargets[i].py;
          sceneRun = true;
        }
      } else if (!isGK && sp.markTargets[i]) {
        targetPx = sp.markTargets[i].px;
        targetPy = sp.markTargets[i].py;
        sceneRun = true;
      }
    } else if (sp?.type === "freekick") {
      if (side === sp.defSide && sp.wallTargets[i]) {
        // เดินมาต่อกำแพง
        targetPx = sp.wallTargets[i].px;
        targetPy = sp.wallTargets[i].py;
        sceneRun = true;
      } else if (side === sp.attackSide && i === sp.takerIdx) {
        targetPx = sp.spot.px - sp.fwd * 2.5;
        targetPy = sp.spot.py;
        sceneRun = true;
      }
    }

    if (!sceneRun && sq && isGK && side !== sq.shotSide) {
      // GK พุ่งตามแนวบอลตอนมีคนยิง
      targetPx = side === "home" ? 3 : 97;
      targetPy = clamp(sq.outPt.py, 39, 61);
      sceneRun = true;
    }

    // จิตเตอร์ idle เฉพาะคนยืนคุมพื้นที่ — งดตอนมีบทบาท/อยู่ในซีน กันสั่นทับการวิ่งจริง
    if (!isGK && !isCarrier && !isPasser && !isReceiver && !isPresser && !sceneRun) {
      targetPx += Math.sin(animTick * 0.018 + p.phase) * 0.9;
      targetPy += Math.cos(animTick * 0.016 + p.phase * 1.1) * 0.75;
    }

    if (sceneRun) {
      // เป้ามาจากซีนแล้ว — ไม่ทับด้วยตรรกะปกติ
    } else if (isGK) {
      // GK ยืนในกรอบเล็กหน้าประตู (กรอบเล็กบนภาพ: ลึก 6 หน่วย กว้าง py 38-62)
      targetPx = side === "home" ? 3.5 : 96.5;
      targetPy = clamp(ball.py * 0.35 + 50 * 0.65, 39, 61);
    } else if (isCarrier) {
      const role = slotPassRole(slot);
      if (role === "WING" && ball.phase === "dribble" && !sq && !sp) {
        // ปีกพาบอลเลี้ยงริมเส้น — px ยังอิงตำแหน่งบอลจริงเป๊ะเหมือนผู้ครองบอลทั่วไป (กันวิ่งเลยบอล)
        // py เอนเข้าเส้นข้างแค่ 35% ของช่องว่างที่เหลือ (blend กับค่าคงที่ฝั่งเส้นข้าง ไม่ใช่ทบตัวเองทุกเฟรม)
        // เดิมอิงตำแหน่งตัวเอง+9/+เดลต้าซ้ำทุกเฟรม (แครอทแขวนหน้า/ทบไม่มีจุดยึด) ไหลไม่หยุดจนวิ่งเลยบอลไป
        targetPx = ball.px + fwd * -2.2;
        const touchlinePy = anchor.py >= 50 ? 92 : 8;
        targetPy = lerp(ball.py, touchlinePy, 0.35);
      } else {
        targetPx = ball.px + fwd * -2.2;
        targetPy = ball.py;
      }
    } else if (isPasser) {
      targetPx = ball.fromPx + fwd * -1.8;
      targetPy = ball.fromPy;
    } else if (isReceiver) {
      const lead = receiverRunTarget(ball, possSide, anchor, p);
      targetPx = lead.px;
      targetPy = lead.py;
    } else if (isPresser) {
      // วิ่งเข้าประกบผู้ครองบอลตรงๆ — คนอื่นอยู่ตามฟอร์เมชั่นปกติ
      targetPx = clamp(ball.px, PLAY_MIN, PLAY_MAX);
      targetPy = ball.py;
    } else if (hasBall) {
      const support = supportRunTarget(slot, { px: targetPx, py: targetPy }, ball, side, possSide, pendingPass);
      targetPx = lerp(targetPx, support.px, 0.42);
      targetPy = lerp(targetPy, support.py, 0.42);
    }

    // กองหน้ายืนเกาะไลน์กองหลังฝ่ายตรงข้าม (offside line) — ไม่หล่นลึกตามบล็อกทีม
    if (!sceneRun && !isCarrier && !isReceiver && slot.pos === "FW" && Number.isFinite(ctx?.oppDefLinePx)) {
      targetPx = lerp(targetPx, ctx.oppDefLinePx - fwd * 1.2, 0.75);
    }

    const dist = Math.hypot(targetPx - ball.px, targetPy - ball.py);
    const running = !isGK && (sceneRun || isCarrier || isReceiver || isPresser || (hasBall && dist < 20));

    let maxStep = fmMaxStep(slot, { isGK, isCarrier, isPasser, isReceiver, isPresser, running }) * SPEED_SCALE * ts;
    if (sq && isGK && side !== sq.shotSide) maxStep = 0.6 * ts; // พุ่งเซฟไวกว่าปกติ (คูณ timeScale ให้เข้าสโลว์โม)

    const next = stepPlayer(p, targetPx, targetPy, maxStep);
    teamArr[i] = { ...p, px: next.px, py: next.py };

    let facing = side === "home" ? 1 : -1;
    if (Math.abs(next.vx) > 0.02) facing = next.vx > 0 ? 1 : -1;
    else if (isCarrier || isReceiver || isPasser) facing = hasBall ? fwd : -fwd;

    return {
      px: next.px,
      py: next.py - bounceOff, // กระโดดดีใจ — เด้งเฉพาะภาพ ไม่แตะฟิสิกส์
      facing,
      isGK,
      isCarrier,
      isPasser,
      isReceiver,
      running,
      pos: slot.pos,
      shirtNum: i + 1,
    };
  });
}

/** ผลักผู้เล่นที่ยืนใกล้กันเกินไป (< minDist) ออกจากกันเบาๆ กันยืนทับกัน */
function separateOverlaps(homeRows, homeState, awayRows, awayState, minDist = 3.2, push = 0.35) {
  const all = [
    ...homeRows.map((row, i) => ({ row, phys: homeState[i] })),
    ...awayRows.map((row, i) => ({ row, phys: awayState[i] })),
  ];
  for (let i = 0; i < all.length; i += 1) {
    for (let j = i + 1; j < all.length; j += 1) {
      const a = all[i];
      const b = all[j];
      if (a.row.isGK || b.row.isGK) continue;
      const dx = b.row.px - a.row.px;
      const dy = b.row.py - a.row.py;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.0001 && dist < minDist) {
        const overlap = (minDist - dist) / dist;
        const ox = dx * overlap * push;
        const oy = dy * overlap * push;
        a.row.px -= ox; a.row.py -= oy;
        b.row.px += ox; b.row.py += oy;
        if (a.phys) { a.phys.px = a.row.px; a.phys.py = a.row.py; }
        if (b.phys) { b.phys.px = b.row.px; b.phys.py = b.row.py; }
      }
    }
  }
}

/** แนวไลน์กองหลัง (เฉลี่ย px ของ DF) ของทีมหนึ่งๆ — ให้กองหน้าฝ่ายตรงข้ามยืนเกาะ */
function defLineOf(teamArr, slots) {
  let sum = 0;
  let n = 0;
  slots.forEach((sl, i) => {
    if (sl.pos === "DF" && teamArr[i]) {
      sum += teamArr[i].px;
      n += 1;
    }
  });
  return n ? sum / n : NaN;
}

/** ตำแหน่งนักเตะ ambient */
export function computeAmbientLivePlayers(homeSlots, awaySlots, ambientState, animTick, project) {
  const ball = ambientState.ball;
  const possSide = ambientState.possSide;
  const baseCtx = {
    timeScale: ambientState.timeScale ?? 1,
    shotSeq: ambientState.shotSeq,
    setPiece: ambientState.setPiece,
    celebration: ambientState.celebration,
    restart: ambientState.restart,
  };

  const homeRaw = updateTeamAmbient(
    ambientState.home, homeSlots, "home", ball, possSide, animTick, ambientState.carrierHome, ambientState.pendingPass,
    { ...baseCtx, oppDefLinePx: defLineOf(ambientState.away, awaySlots) },
  );
  const awayRaw = updateTeamAmbient(
    ambientState.away, awaySlots, "away", ball, possSide, animTick, ambientState.carrierAway, ambientState.pendingPass,
    { ...baseCtx, oppDefLinePx: defLineOf(ambientState.home, homeSlots) },
  );
  separateOverlaps(homeRaw, ambientState.home, awayRaw, ambientState.away);

  const mapSide = (rows, side) => rows.map((r, i) => {
    // GK ได้สิทธิ์เข้าใกล้เส้นหลังกว่าคนอื่น — ยืนกรอบเล็กหน้าประตูจริง
    const px = clamp(r.px, r.isGK ? 2 : PLAY_MIN, r.isGK ? 98 : PLAY_MAX);
    const py = clamp(r.py, 6, 94);
    const pos = project(px, py);
    return {
      x: pos.x,
      y: pos.y,
      z: Math.round(pos.y * 10),
      facing: r.facing,
      running: r.running,
      isCarrier: r.isCarrier,
      isGK: r.isGK,
      isPasser: r.isPasser,
      isReceiver: r.isReceiver,
      diving: r.isGK && ((side === "home" && ball.px < 24) || (side === "away" && ball.px > 76)),
      idx: i,
      shirtNum: r.shirtNum,
      pos: r.pos,
    };
  });

  return {
    home: mapSide(homeRaw, "home"),
    away: mapSide(awayRaw, "away"),
  };
}

/** sync บอลเข้าตำแหน่งที่กำหนด (ใช้ตอน reset/กู้สถานะ) — บอลจะกลิ้งเข้าหาผู้ครองเองไม่วาป */
export function syncAmbientFromBall(state, ballSim, possSide) {
  if (!state || !ballSim) return state;
  const side = possSide || ballSim.side || "home";
  state.possSide = side;
  state.dribbleHold = 0;
  state.stallCycles = 0;
  state.pendingPass = null;
  state.ball = emptyBall(ballSim.px, ballSim.py);
  if (side === "home") state.carrierHome = ballSim.carrier ?? 4;
  else state.carrierAway = ballSim.carrier ?? 4;
  resetPassChain(state.passSim);
  return state;
}

/** เปลี่ยนครอบครอง (เช่น เซฟแล้ว GK ได้บอล) */
export function setAmbientPossession(state, side, carrierIdx = 4) {
  if (!state) return state;
  state.possSide = side;
  if (side === "home") state.carrierHome = carrierIdx;
  else state.carrierAway = carrierIdx;
  resetPassChain(state.passSim);
  state.dribbleHold = 0;
  state.stallCycles = 0;
  return state;
}

/** สำหรับ debug / UI — สถานะ simulator ปัจจุบัน */
export function getPassSimDebug(state) {
  if (!state?.passSim) return null;
  const b = state.ball;
  return {
    zone: state.passSim.zone,
    chain: state.passSim.chain,
    lastType: state.passSim.lastType,
    phase: b.phase,
    passType: b.passType,
  };
}
