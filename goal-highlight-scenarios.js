/**
 * Goal highlight replay — ตรรกะล้วน ไม่ผูกกับ React
 * ใช้พิกัด px/py (0-100) เดียวกับที่ pass-simulator/live-pitch-ambient/tracker-pitch ใช้อยู่แล้ว
 * เพื่อให้ตำแหน่งที่คำนวณที่นี่ เอาไปวาดด้วย V0PitchSVG/TrackerPlayerDots/TrackerBall ตัวจริงได้ตรงๆ
 * ไม่ต้องประดิษฐ์ภาพสนาม/นักเตะใหม่ — ไฟล์นี้แค่บอก "ใครอยู่ตรงไหน กล้องมองจุดไหน" ตามเวลา
 */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export const SCENARIO_META = {
  longrange: { label: "ยิงไกลนอกกรอบ!", windup: 0.8, shot: 1.7, result: 2.2 },
  corner_header: { label: "เตะมุม โหม่งเข้า!", windup: 0.7, delivery: 1.3, header: 1.1, result: 2.2 },
  penalty: { label: "จุดโทษ!", windup: 2.1, shot: 1.0, result: 2.2 },
  breakaway: { label: "หลุดเดี่ยวกับผู้รักษาประตู!", windup: 1.6, shot: 1.1, result: 2.2 },
  freekick: { label: "ฟรีคิกโค้งข้ามกำแพง!", windup: 1.2, shot: 1.5, result: 2.2 },
};

/** เลือก scenario แบบ weighted จาก context เท่าที่มี — ไม่มีข้อมูลละเอียดพอก็ตกไปสุ่มเกือบเท่าๆ กัน (ขยายเป็น weighted เพิ่มได้ทีหลัง) */
export function pickScenario(context = {}) {
  const { scorerPos, zone = {}, buildStage } = context;
  const weights = { longrange: 1, corner_header: 1, penalty: 0.4, breakaway: 1, freekick: 0.7 };

  if (scorerPos === "DF") {
    weights.corner_header += 1.2;
    weights.longrange += 0.6;
    weights.breakaway *= 0.3;
  }
  if (scorerPos === "FW") {
    weights.breakaway += 0.8;
    weights.penalty += 0.3;
  }
  if (zone.inBox === false) {
    weights.longrange += 1;
    weights.penalty = 0;
  }
  if (buildStage === "wide_play" || buildStage === "recycle") weights.corner_header += 0.8;

  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [type, w] of entries) {
    r -= w;
    if (r <= 0) return type;
  }
  return entries[0][0];
}

/**
 * ผล goal/save/miss ตัดสินโดย engine หลัก (xG จริง) มาแล้ว — ฟังก์ชันนี้แค่ "แต่งลีลา" ภาพ
 * ให้ miss บางส่วนกลายเป็น "ชนเสา/คาน" (post) หรือ (เฉพาะฟรีคิก) "กำแพงสกัด" (blocked)
 */
export function refineOutcome(scenarioType, shotResult) {
  if (shotResult === "goal") return "goal";
  if (shotResult === "save") return "save";
  const r = Math.random();
  if (scenarioType === "freekick") {
    if (r < 0.3) return "blocked";
    if (r < 0.55) return "post";
    return "wide";
  }
  if (r < 0.3) return "post";
  return "wide";
}

const FLASH_LABEL = { goal: "GOAL!", save: "SAVE!", wide: "MISS", post: "OFF THE POST!", blocked: "BLOCKED!" };
const GOAL_HALF_W = 10; // py — ตรงกับ GoalFrame halfWp={10} ใน tracker-pitch.jsx

export function outcomePointFor(outcome, goalPx, fwd) {
  const cy = 50;
  const side = Math.random() < 0.5 ? -1 : 1;
  if (outcome === "goal") {
    return {
      // ลึกหลังเส้น 3 หน่วย — ตาข่ายบนภาพลึก ~3.7 หน่วย บอลจะนอนก้นตาข่ายจริง (เดิม 2 หน่วยดูค้างปากประตู)
      px: goalPx + fwd * 3,
      py: clamp(cy + side * (GOAL_HALF_W * 0.55 + Math.random() * GOAL_HALF_W * 0.35), cy - GOAL_HALF_W + 1, cy + GOAL_HALF_W - 1),
    };
  }
  if (outcome === "save") {
    return {
      px: goalPx - fwd * 1.5,
      py: clamp(cy + side * (GOAL_HALF_W * 0.45 + Math.random() * GOAL_HALF_W * 0.4), cy - GOAL_HALF_W + 1, cy + GOAL_HALF_W - 1),
    };
  }
  if (outcome === "post") {
    return { px: goalPx, py: cy + side * GOAL_HALF_W };
  }
  // wide
  return { px: goalPx + fwd * 1, py: cy + side * (GOAL_HALF_W + 3 + Math.random() * 7) };
}

/** save = พุ่งถึงจุดบอลพอดี, ไม่ save = พุ่งไปแค่ครึ่งทาง (ดูเหมือนพุ่งผิดจังหวะ/ไม่ทัน) */
function gkReaction(gkStart, ballEnd, outcome) {
  if (outcome === "save") return { px: ballEnd.px, py: ballEnd.py };
  return { px: lerp(gkStart.px, ballEnd.px, 0.5), py: lerp(gkStart.py, ballEnd.py, 0.5) };
}

/**
 * ต่อบอลจากตำแหน่งจริงตอนเกิดช็อต (originPt — ambient sim ตอนนั้น) เข้าสู่จุดเริ่มฉากที่สคริปต์ไว้
 * กันปัญหา "ลูกวาป" ตอนตัดจากภาพเกมปกติเข้าฉากไฮไลต์ (จุดเริ่มฉากเป็นพิกัดสคริปต์ตายตัว คนละที่กับบอลจริง)
 */
function prependCarry(stages, originPt) {
  if (!originPt || !stages.length) return stages;
  const first = stages[0];
  const anchor = first.shooter || first.ballFrom;
  if (!anchor) return stages;
  // airFrom = ความสูงลอยของบอลจริงตอนตัดเข้าฉาก — ถ้าบอลกำลังลอยอยู่แล้วรีเซ็ตเป็น 0 ทันที
  // ตัวบอล (วาดยกจากพื้นตาม airHeight) จะ "หล่นวูบ" ทั้งที่เงา (ตำแหน่งพื้น) ต่อเนื่อง = ดูเหมือนวาป
  const air = originPt.air || 0;
  const dist = Math.hypot(anchor.px - originPt.px, anchor.py - originPt.py);
  if (dist < 4) {
    if (air > 0.2) return [{ ...first, airFrom: air }, ...stages.slice(1)];
    return stages; // เริ่มฉากใกล้ตำแหน่งจริงอยู่แล้ว ไม่ต้องพาเข้า
  }
  const duration = clamp(dist / 55, 0.25, 0.6);
  return [{ name: "carry", duration, ballFrom: { px: originPt.px, py: originPt.py }, ballTo: anchor, arcHeight: 0, curveMag: 0, airFrom: air }, ...stages];
}

/** ฉากวิ่งดีใจหลังยิงเข้า — คนยิงวิ่งจากจุดยิงไปมุมธงฝั่งที่ยิง พร้อม emo บนหัว บอลค้างก้นตาข่าย GK ค้างท่าพุ่ง */
function celebrateStage(strikePt, outPt, gkEnd, goalPx, fwd) {
  const cornerPy = outPt.py >= 50 ? 95 : 5;
  return {
    name: "celebrate", duration: 2.0, hold: outPt,
    gkFrom: gkEnd, gkTo: gkEnd,
    celebrateFrom: strikePt, celebrateTo: { px: clamp(goalPx - fwd * 4, 3, 97), py: cornerPy },
    emo: true, flash: true,
  };
}

/** สร้างเรขาคณิต (px/py 0-100) + ไทม์ไลน์ของฉากตาม scenario/outcome ที่ตัดสินไว้แล้ว
 * ไม่มีกล้องซูม/แพน มองสนามเต็มจอคงที่เสมอ
 * originPt (ถ้ามี) = ตำแหน่งบอลจริงจาก ambient sim ตอนเกิดช็อต ใช้ต่อบอลให้ลื่นไม่วาป (ดู prependCarry)
 * หลักอ่านง่าย: บอลรออยู่จุดยิง คนวิ่งเข้าหาบอล (shooterFrom→shooterTo) แล้วบอลค่อยออกจากเท้า
 * result ทุกฉากตรึง GK ไว้ที่ท่าพุ่ง (gkFrom=gkTo=gkEnd) — เดิมไม่ใส่แล้ว GK เด้งกลับกลางประตู ทำให้เซฟแล้วบอลดูห่างมือ
 */
export function buildScenarioPlan({ scenarioType, outcome, shotSide, originPt }) {
  const fwd = shotSide === "home" ? 1 : -1;
  const goalPx = shotSide === "home" ? 100 : 0;
  const cy = 50;
  const gkStart = { px: goalPx - fwd * 2, py: cy };
  const meta = SCENARIO_META[scenarioType] || SCENARIO_META.longrange;
  const flashLabel = FLASH_LABEL[outcome] || "MISS";
  const isGoal = outcome === "goal";

  if (scenarioType === "corner_header") {
    const cornerY = Math.random() < 0.5 ? 3 : 97;
    const cornerPt = { px: goalPx - fwd * 1, py: cornerY };
    const headerPt = { px: goalPx - fwd * 12, py: cy + (Math.random() - 0.5) * 34 };
    const outPt = outcomePointFor(outcome, goalPx, fwd);
    const gkEnd = gkReaction(gkStart, outPt, outcome);
    const runnerFrom = { px: headerPt.px - fwd * 7, py: headerPt.py + (headerPt.py > cy ? 4 : -4) };
    return {
      scenarioType, outcome, shotSide, label: meta.label, flashLabel, goalPx, fwd,
      stages: prependCarry([
        { name: "windup", duration: meta.windup, shooter: cornerPt, ring: true },
        { name: "delivery", duration: meta.delivery, ballFrom: cornerPt, ballTo: headerPt, arcHeight: 11, curveMag: 3, shooterFrom: runnerFrom, shooterTo: headerPt },
        { name: "header", duration: meta.header, ballFrom: headerPt, ballTo: outPt, arcHeight: 3, curveMag: 1, shooter: headerPt, gkFrom: gkStart, gkTo: gkEnd },
        { name: "result", duration: meta.result, hold: outPt, shooter: headerPt, gkFrom: gkEnd, gkTo: gkEnd, flash: true },
        ...(isGoal ? [celebrateStage(headerPt, outPt, gkEnd, goalPx, fwd)] : []),
      ], originPt),
    };
  }

  if (scenarioType === "penalty") {
    const spot = { px: goalPx - fwd * 15, py: cy };
    const outPt = outcomePointFor(outcome, goalPx, fwd);
    const gkEnd = gkReaction(gkStart, outPt, outcome);
    return {
      scenarioType, outcome, shotSide, label: meta.label, flashLabel, goalPx, fwd,
      stages: prependCarry([
        { name: "windup", duration: meta.windup, shooter: spot, shooterFrom: { px: spot.px - fwd * 5, py: spot.py + 3 }, shooterTo: spot, ring: true },
        { name: "shot", duration: meta.shot, ballFrom: spot, ballTo: outPt, arcHeight: 1.5, curveMag: 0.8, shooter: spot, gkFrom: gkStart, gkTo: gkEnd },
        { name: "result", duration: meta.result, hold: outPt, shooter: spot, gkFrom: gkEnd, gkTo: gkEnd, flash: true },
        ...(isGoal ? [celebrateStage(spot, outPt, gkEnd, goalPx, fwd)] : []),
      ], originPt),
    };
  }

  if (scenarioType === "breakaway") {
    const start = { px: goalPx - fwd * 42, py: cy + (Math.random() - 0.5) * 12 };
    const approach = { px: goalPx - fwd * 18, py: cy + (Math.random() - 0.5) * 16 };
    const outPt = outcomePointFor(outcome, goalPx, fwd);
    const gkOut = { px: lerp(gkStart.px, approach.px, 0.35), py: lerp(gkStart.py, approach.py, 0.35) };
    const gkEnd = gkReaction(gkOut, outPt, outcome);
    return {
      scenarioType, outcome, shotSide, label: meta.label, flashLabel, goalPx, fwd,
      stages: prependCarry([
        // followBall = คนยิงวิ่งประกบบอลตอนเลี้ยงหลุดเดี่ยว (เดิมยืนแช่ที่จุดสตาร์ทแล้ววาปทีหลัง)
        { name: "windup", duration: meta.windup, ballFrom: start, ballTo: approach, arcHeight: 0, curveMag: 0, gkFrom: gkStart, gkTo: gkOut, dribble: true, followBall: true },
        { name: "shot", duration: meta.shot, ballFrom: approach, ballTo: outPt, arcHeight: 1.5, curveMag: 0.6, shooter: approach, gkFrom: gkOut, gkTo: gkEnd },
        { name: "result", duration: meta.result, hold: outPt, shooter: approach, gkFrom: gkEnd, gkTo: gkEnd, flash: true },
        ...(isGoal ? [celebrateStage(approach, outPt, gkEnd, goalPx, fwd)] : []),
      ], originPt),
    };
  }

  if (scenarioType === "freekick") {
    const spot = { px: goalPx - fwd * 28, py: cy + (Math.random() < 0.5 ? -1 : 1) * (18 + Math.random() * 12) };
    const dirPx = goalPx - spot.px;
    const dirPy = cy - spot.py;
    const dirLen = Math.hypot(dirPx, dirPy) || 1;
    const ux = dirPx / dirLen;
    const uy = dirPy / dirLen;
    const wallCenter = { px: spot.px + ux * 9, py: spot.py + uy * 9 };
    const perpX = -uy;
    const perpY = ux;
    const wallCount = 4;
    const wallPts = Array.from({ length: wallCount }, (_, i) => {
      const off = (i - (wallCount - 1) / 2) * 2.4;
      return { px: wallCenter.px + perpX * off, py: wallCenter.py + perpY * off };
    });
    const outPt = outcome === "blocked" ? wallPts[Math.floor(wallCount / 2)] : outcomePointFor(outcome, goalPx, fwd);
    const gkEnd = gkReaction(gkStart, outPt, outcome === "blocked" ? "save" : outcome);
    return {
      scenarioType, outcome, shotSide, label: meta.label, flashLabel, goalPx, fwd,
      stages: prependCarry([
        { name: "windup", duration: meta.windup, shooter: spot, shooterFrom: { px: spot.px - fwd * 4, py: spot.py - uy * 3 }, shooterTo: spot, wall: wallPts, ring: true },
        { name: "shot", duration: meta.shot, ballFrom: spot, ballTo: outPt, arcHeight: 3.5, curveMag: 4.2, shooter: spot, wall: wallPts, gkFrom: gkStart, gkTo: gkEnd },
        { name: "result", duration: meta.result, hold: outPt, shooter: spot, gkFrom: gkEnd, gkTo: gkEnd, flash: true, wall: wallPts },
        ...(isGoal ? [celebrateStage(spot, outPt, gkEnd, goalPx, fwd)] : []),
      ], originPt),
    };
  }

  // longrange (default)
  const shooter = { px: goalPx - fwd * 38, py: cy + (Math.random() - 0.5) * 22 };
  const outPt = outcomePointFor(outcome, goalPx, fwd);
  const gkEnd = gkReaction(gkStart, outPt, outcome);
  return {
    scenarioType: "longrange", outcome, shotSide, label: meta.label, flashLabel, goalPx, fwd,
    stages: prependCarry([
      { name: "windup", duration: meta.windup, shooter, shooterFrom: { px: shooter.px - fwd * 5, py: shooter.py + 2 }, shooterTo: shooter, ring: true },
      { name: "shot", duration: meta.shot, ballFrom: shooter, ballTo: outPt, arcHeight: 5, curveMag: 1.8, shooter, gkFrom: gkStart, gkTo: gkEnd },
      { name: "result", duration: meta.result, hold: outPt, shooter, gkFrom: gkEnd, gkTo: gkEnd, flash: true },
      ...(isGoal ? [celebrateStage(shooter, outPt, gkEnd, goalPx, fwd)] : []),
    ], originPt),
  };
}
