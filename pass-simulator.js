/**
 * Football pass simulator — build-up, passing lanes, pass types, flight physics
 * ใช้กับ live-pitch-ambient สำหรับภาพส่งบอลใกล้ฟุตบอลจริง
 */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOut(t) {
  return 1 - (1 - t) ** 2;
}

function hypot(dx, dy) {
  return Math.hypot(dx, dy);
}

function forwardDelta(side, fromPx, toPx) {
  return side === "home" ? toPx - fromPx : fromPx - toPx;
}

/** โซนการเล่น — build / progress / attack */
export function pitchZone(px, side) {
  const depth = side === "home" ? px : 100 - px;
  if (depth < 28) return "build";
  if (depth < 58) return "progress";
  return "attack";
}

/** ประเภทการจ่าย + ความเร็ว/โค้ง */
// speed ล่าสุด ×0.75 อีกรอบตามฟีดแบ็ก (รวมแล้ว ~0.53 ของค่าตั้งต้น) — บอลลอยช้า ตามองทัน
export const PASS_PROFILES = {
  short: { label: "สั้น", phase: "pass", speed: 1.68, arc: 0.5, minD: 3, maxD: 14, windup: 0.28 },
  medium: { label: "กลาง", phase: "pass", speed: 1.24, arc: 1.4, minD: 12, maxD: 26, windup: 0.34 },
  long: { label: "ยาว", phase: "pass", speed: 0.82, arc: 3.0, minD: 24, maxD: 42, windup: 0.42 },
  switch: { label: "สลับข้าง", phase: "pass", speed: 0.92, arc: 2.2, minD: 20, maxD: 38, windup: 0.38 },
  safe: { label: "ปลอดภัย", phase: "safe", speed: 1.05, arc: 0.35, minD: 2, maxD: 12, windup: 0.22 },
  through: { label: "ทะลุ", phase: "through", speed: 1.42, arc: 1.8, minD: 8, maxD: 22, windup: 0.3 },
  cross: { label: "เปิด", phase: "pass", speed: 0.98, arc: 4.5, minD: 16, maxD: 34, windup: 0.36 },
};

export const WINDUP_DEFAULT = 0.32;

const WING_DPOS = new Set(["DL", "DR", "ML", "MR", "WBL", "WBR", "AML", "AMR"]);

/** บทบาทละเอียด — แยกปีกออกจากกลาง */
export function slotPassRole(slot) {
  if (!slot) return "MF";
  if (slot.pos === "GK") return "GK";
  const lateral = Math.abs((slot.x ?? 50) - 50);
  const isWide = WING_DPOS.has(slot.dpos) || lateral > 24;
  if (slot.pos === "DF") return isWide ? "WING" : "DF";
  if (slot.pos === "MF") return isWide ? "WING" : "MF";
  if (slot.pos === "FW") return "FW";
  return "MF";
}

/** ลำดับ build-up: หลัง → กลาง → ปีก → กลาง → หน้า */
const BUILD_STAGES = {
  def_out: "def_out",
  mid_control: "mid_control",
  mid_wide: "mid_wide",
  wide_play: "wide_play",
  recycle: "recycle",
  final: "final",
};

export function createPassSimState() {
  return {
    zone: "build",
    chain: 0,
    lastType: null,
    lastTarget: null,
    recentTargets: [],
    lastCarrierRole: null,
    lastTargetRole: null,
    buildStage: BUILD_STAGES.def_out,
    hadWide: false,
    recycled: false,
    widthSide: "center",
  };
}

function updateBuildStage(passSim, fromRole, toRole) {
  passSim.lastCarrierRole = fromRole;
  passSim.lastTargetRole = toRole;

  if (fromRole === "GK" || fromRole === "DF") {
    passSim.buildStage = toRole === "WING" ? BUILD_STAGES.mid_wide : BUILD_STAGES.mid_control;
    passSim.hadWide = false;
    passSim.recycled = false;
  } else if (fromRole === "MF" && toRole === "WING") {
    passSim.buildStage = BUILD_STAGES.wide_play;
    passSim.hadWide = true;
    passSim.recycled = false;
  } else if (fromRole === "WING" && toRole === "MF") {
    passSim.buildStage = BUILD_STAGES.recycle;
    passSim.recycled = true;
  } else if (fromRole === "MF" && toRole === "FW") {
    passSim.buildStage = BUILD_STAGES.final;
    passSim.chain = 0;
    passSim.hadWide = false;
    passSim.recycled = false;
  } else if (fromRole === "MF" && toRole === "MF") {
    if (passSim.buildStage === BUILD_STAGES.def_out) passSim.buildStage = BUILD_STAGES.mid_control;
  }
}

/**
 * คะแนนตามลำดับการเล่นจริง
 * หลัง→กลาง → กลาง→ปีก → ปีก→กลาง → กลาง→หน้า (เมื่อมีช่อง)
 */
function buildUpPassScore(fromRole, toRole, passSim, zone, carrier, target, lateral, fwd, blocked, pressure = 0) {
  let score = 0;
  const stage = passSim.buildStage;

  if (blocked) return -30;

  if (fromRole === "GK") {
    if (toRole === "DF") score += 28;
    else score -= 40;
    return score;
  }

  if (fromRole === "DF") {
    if (toRole === "MF") score += 26;
    else if (toRole === "DF") score += 6;
    // จ่ายกลับผู้รักษาประตู — เรื่องปกติของกองหลังตอนโดนกดดัน/ไม่มีช่องไปข้างหน้า ไม่ควรโดนแบนเหมือนจ่ายมั่วมั่ว
    else if (toRole === "GK") score += pressure > 0.3 ? 22 : 10;
    else if (toRole === "WING") score -= 4;
    else score -= 35;
    if (fwd > 14) score -= 12;
    return score;
  }

  if (fromRole === "MF") {
    if (toRole === "WING") {
      score += stage === BUILD_STAGES.recycle ? 4 : 22;
      if (zone === "build") score += 6;
    } else if (toRole === "MF") {
      score += 10;
    } else if (toRole === "FW") {
      const canFinal = passSim.recycled || (passSim.hadWide && passSim.chain >= 2);
      if (canFinal && zone !== "build") score += 24;
      else if (canFinal && zone === "build") score += 4;
      else score -= 28;
      if (fwd > 4 && zone === "attack") score += 8;
    } else if (toRole === "DF") {
      score += zone === "build" ? 8 : 2;
    } else {
      score -= 20;
    }
    return score;
  }

  if (fromRole === "WING") {
    if (toRole === "MF") score += 26;
    else if (toRole === "WING" && lateral > 20) score += 5;
    else if (toRole === "FW" && zone === "attack" && fwd > 2) score += 10;
    // ปีกโดนบีบแล้วจ่ายกลับแบ็คตัวเอง — เกิดได้จริงบ่อยๆ ไม่ควรโดนหักหนักเท่าเดิม (เดิม -18 แทบตัดโอกาสทิ้งไปเลย)
    else if (toRole === "DF") score -= 6;
    else score -= 12;
    return score;
  }

  if (fromRole === "FW") {
    if (toRole === "MF") score += 16;
    else if (toRole === "WING") score += 8;
    else score -= 15;
    return score;
  }

  return score;
}

function roleLinkScore(fromPos, toPos) {
  if (fromPos === toPos) return 4;
  // มีแต่ลิงก์ "เดินหน้า" (DF->MF->WING->FW) แบบเดียว ไม่มีลิงก์ "ถอยหลัง" เลย (MF->DF, WING->DF, FW->WING)
  // เลยตกไปโดนโทษ -8 (?? -8) ทุกครั้งที่จะจ่ายกลับ ทำให้กองหลังแทบไม่เคยได้บอลคืนหลังบอลข้ามแดนกลางไปแล้ว
  const direct = {
    GK: { DF: 10 },
    DF: { MF: 10, DF: 4, GK: 6 },
    MF: { WING: 8, MF: 6, FW: 4, DF: 6 },
    WING: { MF: 10, WING: 3, DF: 4 },
    FW: { MF: 8, WING: 4 },
  };
  return direct[fromPos]?.[toPos] ?? -8;
}

function footPos(anchor, side, role = "out") {
  const fwd = side === "home" ? 1 : -1;
  const off = role === "in" ? fwd * -2 : fwd * 2;
  return { px: anchor.px + off, py: anchor.py };
}

/** เช็คว่ามีฝ่ายตรงข้ามบัง lane หรือไม่ */
export function isLaneBlocked(from, to, defenders, margin = 4.2) {
  const steps = 6;
  for (let s = 1; s < steps; s += 1) {
    const t = s / steps;
    const px = lerp(from.px, to.px, t);
    const py = lerp(from.py, to.py, t);
    for (const d of defenders) {
      if (d.pos === "GK") continue;
      if (hypot(px - d.px, py - d.py) < margin) return true;
    }
  }
  return false;
}

function classifyPass(dist, lateral, fwd, fromRole, toRole, pressure, zone, passSim) {
  const wide = lateral > 14;
  const inBox = toRole === "FW" && zone === "attack";

  if (pressure > 0.55 && fwd < 2) return "safe";
  if (pressure > 0.35 && fwd < 0 && dist < 16) return "safe";
  if (fromRole === "WING" && toRole === "MF") return lateral > 18 ? "medium" : "short";
  if (fromRole === "DF" && toRole === "MF") return dist > 18 ? "medium" : "short";
  if (fromRole === "MF" && toRole === "WING") return lateral > 16 ? "medium" : "short";
  if (wide && fromRole === "WING" && toRole === "FW" && zone === "attack") return "cross";
  if (wide && lateral > 18 && dist > 16 && fromRole === "MF") return "switch";
  if (inBox && fwd > 6 && dist < 20 && passSim?.recycled) return "through";
  if (fromRole === "MF" && toRole === "FW" && fwd > 6 && dist < 22) return "through";
  if (dist > 26 && fromRole === "DF") return "long";
  if (dist > 12) return "medium";
  return "short";
}

function triangleBonus(targetIdx, slots, side, slotToPitch, carrierIdx) {
  let bonus = 0;
  const tPos = slotToPitch(slots[targetIdx], side);
  for (let i = 0; i < slots.length; i += 1) {
    if (i === carrierIdx || i === targetIdx || slots[i].pos === "GK") continue;
    const p = slotToPitch(slots[i], side);
    const d1 = hypot(p.px - tPos.px, p.py - tPos.py);
    const fwd = forwardDelta(side, tPos.px, p.px);
    if (d1 > 5 && d1 < 22 && fwd > 0) bonus += 1.5;
  }
  return Math.min(bonus, 6);
}

/**
 * วางแผนการจ่ายครั้งถัดไป
 * @returns {object|null} pass plan
 */
export function planNextPass({
  slots,
  side,
  carrierIdx,
  pressure = 0,
  passSim,
  slotToPitch,
  oppPositions = [],
  oppSlots = [],
  ballPos = null,
  forceAny = false,
}) {
  if (!slots?.length || carrierIdx == null) return null;

  const carrier = slots[carrierIdx];
  const cAnchor = slotToPitch(carrier, side);
  const cFoot = ballPos ?? footPos(cAnchor, side, "out");
  const zone = pitchZone(cFoot.px, side);
  passSim.zone = zone;

  const defenders = oppPositions.map((p, i) => ({
    px: p.px,
    py: p.py,
    pos: oppSlots[i]?.pos || "MF",
  }));

  const carrierRole = slotPassRole(carrier);

  const candidates = slots
    .map((s, i) => {
      if (i === carrierIdx || s.pos === "GK") return null;
      const targetRole = slotPassRole(s);
      const anchor = slotToPitch(s, side);
      const receive = footPos(anchor, side, "in");
      const dist = hypot(receive.px - cFoot.px, receive.py - cFoot.py);
      const fwd = forwardDelta(side, cFoot.px, receive.px);
      const lateral = Math.abs(receive.py - cFoot.py);
      const blocked = isLaneBlocked(cFoot, receive, defenders);

      const passType = classifyPass(dist, lateral, fwd, carrierRole, targetRole, pressure, zone, passSim);
      const profile = PASS_PROFILES[passType];

      let score = buildUpPassScore(
        carrierRole, targetRole, passSim, zone, carrier, s, lateral, fwd, blocked,
      );
      score += roleLinkScore(carrierRole, targetRole);
      score += triangleBonus(i, slots, side, slotToPitch, carrierIdx);
      score += fwd * (zone === "attack" && targetRole === "FW" ? 0.8 : 0.2);
      score -= lateral * 0.06;

      if (passType === "safe" && pressure > 0.3) score += 6;
      if (dist >= profile.minD && dist <= profile.maxD) score += 6;
      else score -= Math.abs(dist - (profile.minD + profile.maxD) / 2) * 0.35;

      if (fwd < -4 && zone !== "build" && passType !== "safe") score -= 12;
      // recency penalty — เพิ่งส่งให้คนนี้ไปหักคะแนนมากสุด กันบอลปิงปองวนแค่ 2-3 คนเดิม
      const recentPos = (passSim.recentTargets || []).indexOf(i);
      if (recentPos !== -1) score -= [11, 6, 3][recentPos] ?? 2;

      if (carrierRole === "DF" && targetRole === "FW") score -= 40;
      if (carrierRole === "DF" && targetRole === "MF" && dist < 28) score += 8;
      if (carrierRole === "MF" && targetRole === "WING") score += 6;
      if (carrierRole === "WING" && targetRole === "MF") score += 8;
      if (carrierRole === "MF" && targetRole === "FW" && passSim.recycled) score += 10;

      score += Math.random() * 1.4;

      return {
        i,
        anchor,
        receive,
        dist,
        fwd,
        lateral,
        blocked,
        passType,
        profile,
        targetRole,
        score,
      };
    })
    .filter(Boolean);

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  // ปกติตัวเลือกแย่เกินไปก็ไม่จ่าย (return null) แต่ถ้าถูกบังคับ (คนถือบอลติดค้างมาหลายรอบแล้วหาช่องไม่ได้จริงๆ)
  // ต้องยอมจ่ายให้ตัวที่ดีที่สุดเท่าที่มีไปเลย กันบอลค้างอยู่กับคนเดิมไม่ยอมจบเกม
  if (!forceAny && candidates[0].score < 2) return null;

  // weighted-random จาก top 3-4 ตัวเลือก แทน argmax เป๊ะ — กันวนอยู่แค่คนเดิมๆ
  const pool = candidates
    .slice(0, 4)
    .filter((c) => c.score >= candidates[0].score - 12);
  const minPoolScore = Math.min(...pool.map((c) => c.score));
  const weights = pool.map((c) => Math.max(0.5, c.score - minPoolScore + 1));
  const totalW = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalW;
  let best = pool[0];
  for (let i = 0; i < pool.length; i += 1) {
    r -= weights[i];
    if (r <= 0) { best = pool[i]; break; }
  }

  const recvAnchor = best.receive;
  const fwdSign = side === "home" ? 1 : -1;
  const lead = best.passType === "through" ? 2.8 : best.passType === "medium" ? 1.2 : 0.6;
  const toPx = clamp(recvAnchor.px + fwdSign * lead, 8, 92);
  const toPy = recvAnchor.py;

  passSim.lastType = best.passType;
  passSim.lastTarget = best.i;
  passSim.recentTargets = [best.i, ...(passSim.recentTargets || []).filter((x) => x !== best.i)].slice(0, 3);
  passSim.chain += 1;
  updateBuildStage(passSim, carrierRole, best.targetRole);
  if (best.lateral > 16) passSim.widthSide = recvAnchor.py > cFoot.py ? "right" : "left";

  return {
    fromCarrier: carrierIdx,
    toCarrier: best.i,
    fromPx: cFoot.px,
    fromPy: cFoot.py,
    toPx,
    toPy,
    passType: best.passType,
    phase: best.profile.phase,
    speed: best.profile.speed,
    arc: best.profile.arc,
    windup: best.profile.windup ?? WINDUP_DEFAULT,
    dist: best.dist,
    zone,
    fromRole: carrierRole,
    targetRole: best.targetRole,
    buildStage: passSim.buildStage,
  };
}

/** ปรับจุดรับตามตำแหน่งนักเตะจริง */
export function aimPassAtReceiver(plan, recvPos, side) {
  if (!plan || !recvPos) return plan;
  const fwd = side === "home" ? 1 : -1;
  const lead = plan.passType === "through" ? 3.2 : plan.passType === "long" ? 1.4 : 0.8;
  return {
    ...plan,
    toPx: clamp(recvPos.px + fwd * lead, 8, 92),
    toPy: recvPos.py,
  };
}

/** จุดวิ่งรับก่อนบอลถึง — เริ่มวิ่งตั้งแต่ windup */
export function receiverRunTarget(ball, side, receiverAnchor, receiverLive = null) {
  const fwd = side === "home" ? 1 : -1;
  const base = receiverLive ?? receiverAnchor;
  const destPx = ball.toPx ?? receiverAnchor.px;
  const destPy = ball.toPy ?? receiverAnchor.py;

  if (ball.phase === "windup") {
    const t = clamp((ball.windupT ?? 0) / (ball.windupDur ?? WINDUP_DEFAULT), 0, 1);
    const run = ball.passType === "through" ? 0.55 + t * 0.35
      : ball.passType === "long" || ball.passType === "switch" ? 0.25 + t * 0.45
      : 0.35 + t * 0.4;
    return {
      px: lerp(base.px, destPx, run) + fwd * -1.2,
      py: lerp(base.py, destPy, run),
    };
  }

  if (["pass", "through", "safe"].includes(ball.phase) && (ball.t ?? 1) < 1) {
    const t = clamp(ball.t ?? 0, 0, 1);
    const lead = ball.passType === "through" ? 0.78
      : ball.passType === "long" || ball.passType === "switch" ? 0.42
      : 0.58;
    return {
      px: lerp(ball.fromPx, destPx, 0.45 + t * lead) + fwd * -1.4,
      py: lerp(ball.fromPy, destPy, 0.45 + t * lead),
    };
  }

  return { px: base.px, py: base.py };
}

/** นักเตะไม่ถือบอล — เปิดมุมจ่ายตาม build-up */
export function supportRunTarget(slot, anchor, ball, side, possSide, pendingPass) {
  const hasBall = side === possSide;
  if (!hasBall || slot.pos === "GK") return anchor;

  const role = slotPassRole(slot);
  const fwd = side === "home" ? 1 : -1;
  let tx = anchor.px;
  let ty = anchor.py;
  const stage = pendingPass?.buildStage;

  if (role === "WING") {
    ty += anchor.py > 50 ? 2.5 : -2.5;
    if (ball.phase === "windup" && pendingPass?.targetRole === "WING") tx += fwd * 1.2;
  } else if (role === "MF") {
    if (stage === "recycle" || stage === "wide_play") {
      tx += fwd * 1.0;
    } else {
      tx += fwd * 0.5;
    }
  } else if (role === "FW") {
    tx += fwd * (stage === "final" ? 2.2 : 1.2);
  } else if (role === "DF") {
    tx -= fwd * 0.6;
  }

  return { px: tx, py: ty };
}

/** เริ่มจังหวะส่ง — เขียนลง ball state (from = ตำแหน่งลูกปัจจุบัน) */
export function beginWindup(ball, plan) {
  ball.fromCarrier = plan.fromCarrier;
  ball.toCarrier = plan.toCarrier;
  ball.toPx = plan.toPx;
  ball.toPy = plan.toPy;
  ball.passType = plan.passType;
  ball.passSpeed = plan.speed;
  ball.passArc = plan.arc;
  ball.windupDur = plan.windup ?? WINDUP_DEFAULT;
  ball.windupT = 0;
  ball.phase = "windup";
  ball.t = 0;
  ball.curveSign = Math.random() < 0.5 ? 1 : -1;
}

/** เริ่มจ่ายหลัง windup */
export function beginPass(ball, plan, currentPos = null) {
  const fromPx = currentPos?.px ?? plan.fromPx;
  const fromPy = currentPos?.py ?? plan.fromPy;
  ball.fromPx = fromPx;
  ball.fromPy = fromPy;
  ball.toPx = plan.toPx;
  ball.toPy = plan.toPy;
  ball.fromCarrier = plan.fromCarrier;
  ball.toCarrier = plan.toCarrier;
  ball.phase = plan.phase;
  ball.passType = plan.passType;
  ball.passSpeed = plan.speed;
  ball.passArc = plan.arc;
  ball.px = fromPx;
  ball.py = fromPy;
  ball.t = 0;
}

/** เริ่มยิงประตูกลางเกม (ไม่ใช่ฉากไฮไลต์ใหญ่) — ใช้ฟิสิกส์เดินบอลเดียวกับการจ่าย (tickPassFlight)
 * แค่ไม่มีผู้รับ (toCarrier = null) ปลายทางคือจุดจบช็อต (เซฟ/หลุดกรอบ) แทนเพื่อนร่วมทีม */
export function beginShot(ball, plan) {
  ball.fromPx = plan.fromPx;
  ball.fromPy = plan.fromPy;
  ball.toPx = plan.toPx;
  ball.toPy = plan.toPy;
  ball.fromCarrier = plan.fromCarrier ?? null;
  ball.toCarrier = null;
  ball.phase = "shot";
  ball.passType = "shot";
  ball.passSpeed = plan.speed ?? 2.0;
  ball.passArc = plan.arc ?? 1.6;
  ball.curveSign = Math.random() < 0.5 ? 1 : -1;
  ball.px = plan.fromPx;
  ball.py = plan.fromPy;
  ball.t = 0;
  ball.windupT = 0;
}

/** เลื่อนลูกระหว่างจ่าย — คืน true เมื่อถึงปลายทาง */
export function tickPassFlight(ball, side, dt) {
  const speed = ball.passSpeed ?? 2.4;
  const arc = ball.passArc ?? 1.8;
  const fwdSign = side === "home" ? 1 : -1;

  ball.t = Math.min(1, ball.t + speed * dt);
  const e = easeOut(ball.t);

  // โค้งแนวตั้งฉากกับเส้นตรงจริง (ไม่ใช่ล็อกแกน py เฉยๆ) — cross/switch โค้งเยอะกว่า pass สั้น
  const dx = ball.toPx - ball.fromPx;
  const dy = ball.toPy - ball.fromPy;
  const len = hypot(dx, dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;
  const bendMag = (ball.passType === "cross" || ball.passType === "switch" ? arc * 0.75 : arc * 0.32);
  const bend = bendMag * (ball.curveSign ?? 1);

  const midPx = (ball.fromPx + ball.toPx) / 2 + perpX * bend + fwdSign * (ball.passType === "through" ? 1.4 : 0.5);
  const midPy = (ball.fromPy + ball.toPy) / 2 + perpY * bend;

  ball.px = (1 - e) ** 2 * ball.fromPx + 2 * (1 - e) * e * midPx + e ** 2 * ball.toPx;
  ball.py = (1 - e) ** 2 * ball.fromPy + 2 * (1 - e) * e * midPy + e ** 2 * ball.toPy;
  // ความสูงลอย (แยกจากตำแหน่งพื้น) — ใช้วาดเงาแยกจากลูกบอลฝั่ง UI
  ball.airHeight = arc * Math.sin(Math.PI * e);
  return ball.t >= 1;
}

/** เวลาเลี้ยงก่อนจ่าย — ตามตำแหน่ง + โซน */
export function dribbleHoldTime(carrierPos, zone, pressure) {
  const base = { GK: 1.5, DF: 1.1, MF: 0.75, FW: 0.6 }[carrierPos] ?? 0.8;
  const zoneAdd = zone === "build" ? 0.15 : zone === "attack" ? -0.08 : 0;
  const pressCut = pressure > 0.5 ? -0.2 : pressure > 0.25 ? -0.1 : 0;
  // ~35-100 เฟรม (@60fps) ระหว่างรับบอลถึงตัดสินใจใหม่ กันแผนเปลี่ยนกลางทางจนดูกระตุก
  return clamp(base + zoneAdd + pressCut + (Math.random() * 0.18 - 0.06), 0.6, 2.2);
}

/** ตำแหน่งรับบอล — วิ่ง lead ตามประเภท pass */
export function receiverTarget(ball, side, receiverAnchor, slotToPitch, slot) {
  const live = receiverAnchor;
  return receiverRunTarget(ball, side, slotToPitch(slot, side), live);
}

export function resetPassChain(passSim) {
  if (!passSim) return;
  passSim.chain = 0;
  passSim.lastTarget = null;
  passSim.recentTargets = [];
  passSim.buildStage = BUILD_STAGES.def_out;
  passSim.hadWide = false;
  passSim.recycled = false;
}
