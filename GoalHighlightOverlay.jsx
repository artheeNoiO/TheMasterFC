import React, { useEffect, useId, useRef, useState } from "react";
import { V0PitchSVG, TrackerPlayerDots, TrackerBall, pitchToWide } from "./tracker-pitch.jsx";

/**
 * ฉากรีเพลย์สโลโมชั่นตอนมีจังหวะยิงดราม่า — mount ทับ TrackerMatchView ชั่วคราว
 * ไม่วาดภาพสนาม/นักเตะเอง — ใช้ V0PitchSVG/TrackerPlayerDots/TrackerBall ตัวจริงจาก tracker-pitch.jsx
 * ทั้งหมด แค่ครอบด้วยกล้องซูม (CSS transform) + เลตเตอร์บ็อกซ์ + ข้อความผล เป็น "ระบบ" ที่เพิ่มเข้ามา
 */

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp01(t) {
  return Math.max(0, Math.min(1, t));
}

function easeOutQ(t) {
  return 1 - (1 - t) * (1 - t);
}

function lerpPt(a, b, t) {
  if (!a || !b) return a || b || { px: 50, py: 50 };
  return { px: lerp(a.px, b.px, t), py: lerp(a.py, b.py, t) };
}

const OUTCOME_COLOR = { goal: "#5ad06a", save: "#ffd54f", wide: "#ff6b5e", post: "#ff8f5e", blocked: "#b28fff" };

function RingPulse({ pt, pulse }) {
  const p = pitchToWide(pt.px, pt.py);
  const size = 30 + pulse * 12;
  return (
    <div style={{
      position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
      width: `${size}px`, height: `${size}px`, transform: "translate(-50%, -50%)",
      borderRadius: "50%", border: "2px solid rgba(255,255,255,.85)",
      opacity: 0.8 - pulse * 0.35, pointerEvents: "none", zIndex: 40,
    }} />
  );
}

export default function GoalHighlightOverlay({
  plan, active, onDone, scorerName, teamShort, sponsorLabel = "",
  attackerColor = "#c0392b", attackerShortsColor = "#1a1a1a", defenderGkColor = "#2ecc71", wallColor = "#34495e",
  backgroundPlayers = [],
}) {
  const uid = useId().replace(/:/g, "");
  const rafRef = useRef(null);
  const elapsedRef = useRef(0);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [, forceTick] = useState(0);
  const [barsIn, setBarsIn] = useState(false);

  useEffect(() => {
    if (!active || !plan) return undefined;
    elapsedRef.current = 0;
    doneRef.current = false;
    setBarsIn(false);
    const barTimer = setTimeout(() => setBarsIn(true), 16);

    const total = plan.stages.reduce((s, st) => s + st.duration, 0);
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsedRef.current += dt;
      forceTick((n) => n + 1);
      if (elapsedRef.current >= total && !doneRef.current) {
        doneRef.current = true;
        onDoneRef.current?.(plan.outcome);
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      clearTimeout(barTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, plan]);

  if (!active || !plan) return null;

  // หา stage ปัจจุบัน + progress ภายในสเตจนั้น
  let t = elapsedRef.current;
  let stageIdx = 0;
  for (; stageIdx < plan.stages.length - 1; stageIdx += 1) {
    if (t < plan.stages[stageIdx].duration) break;
    t -= plan.stages[stageIdx].duration;
  }
  const stage = plan.stages[stageIdx];
  const progress = clamp01(t / Math.max(0.001, stage.duration));
  // ตัดกล้องซูม/แพนออกทั้งหมดตามที่ผู้ใช้แจ้ง — ซูมเข้า/ออกทำให้บังจังหวะยิงเอง
  // มองสนามเต็มจอคงที่ตลอดฉากรีเพลย์แทน

  // บอล — bezier โค้ง (perpendicular offset) + arcHeight เดียวกับที่ pass-simulator/TrackerBall ใช้อยู่แล้ว
  let ballPt;
  let ballPhase = "dribble";
  let airHeight = 0;
  if (stage.ballFrom && stage.ballTo) {
    const e = easeOutQ(progress);
    const dx = stage.ballTo.px - stage.ballFrom.px;
    const dy = stage.ballTo.py - stage.ballFrom.py;
    const len = Math.hypot(dx, dy) || 1;
    const perpX = -dy / len;
    const perpY = dx / len;
    const bend = stage.curveMag || 0;
    const midPx = (stage.ballFrom.px + stage.ballTo.px) / 2 + perpX * bend;
    const midPy = (stage.ballFrom.py + stage.ballTo.py) / 2 + perpY * bend;
    const bx = (1 - e) ** 2 * stage.ballFrom.px + 2 * (1 - e) * e * midPx + e ** 2 * stage.ballTo.px;
    const by = (1 - e) ** 2 * stage.ballFrom.py + 2 * (1 - e) * e * midPy + e ** 2 * stage.ballTo.py;
    ballPt = { px: bx, py: by };
    airHeight = (stage.arcHeight || 0) * Math.sin(Math.PI * e);
    ballPhase = stage.name === "shot" ? "shot" : "pass";
  } else if (stage.hold) {
    ballPt = stage.hold;
    ballPhase = plan.outcome === "goal" ? "shot" : "dribble";
  } else {
    ballPt = stage.shooter || { px: 50, py: 50 };
  }
  // ต่อความสูงลอยจากภาพเกมจริง (airFrom) ค่อยๆ ลดถึงพื้น — กันบอล "หล่นวูบ" ตอนตัดเข้าฉาก
  if (stage.airFrom) airHeight += stage.airFrom * (1 - easeOutQ(progress));

  const gkDefault = plan.goalPx != null ? { px: plan.goalPx - plan.fwd * 2, py: 50 } : null;
  const gkPt = stage.gkFrom && stage.gkTo ? lerpPt(stage.gkFrom, stage.gkTo, easeOutQ(progress)) : gkDefault;
  // ตำแหน่งคนยิงตามลำดับความสำคัญ:
  //  celebrate = วิ่งดีใจไปมุมธง · followBall = วิ่งประกบบอลตอนเลี้ยง (หลุดเดี่ยว)
  //  shooterFrom/To = วิ่งเข้าหาบอลก่อนยิง · shooter = ยืนจุดยิง (ท่าจบสวิง)
  //  ไม่มีสักอย่าง → ย้อนหาสเตจก่อนหน้า (กันวาปไปหาบอลตอน result)
  let shooterPt;
  if (stage.celebrateFrom && stage.celebrateTo) {
    shooterPt = lerpPt(stage.celebrateFrom, stage.celebrateTo, easeOutQ(progress));
  } else if (stage.followBall) {
    shooterPt = { px: ballPt.px - plan.fwd * 1.6, py: ballPt.py };
  } else if (stage.shooterFrom && stage.shooterTo) {
    shooterPt = lerpPt(stage.shooterFrom, stage.shooterTo, easeOutQ(progress));
  } else {
    shooterPt = stage.shooter || stage.ballFrom;
  }
  if (!shooterPt) {
    for (let i = stageIdx - 1; i >= 0; i -= 1) {
      const prev = plan.stages[i];
      const cand = prev.shooter || prev.shooterTo || prev.celebrateTo || prev.ballFrom;
      if (cand) { shooterPt = cand; break; }
    }
  }
  shooterPt = shooterPt || ballPt;
  const ringPulse = 0.5 + 0.5 * Math.sin(elapsedRef.current * 9);

  const players = [];
  if (shooterPt) {
    const p = pitchToWide(shooterPt.px, shooterPt.py);
    players.push({
      key: "shooter", x: p.x, y: p.y, shirtColor: attackerColor, shortsColor: attackerShortsColor,
      gkColor: attackerColor, shirtNum: 9, isGK: false, isCarrier: true, isPasser: false, isReceiver: false, facing: plan.fwd,
    });
  }
  if (gkPt) {
    const p = pitchToWide(gkPt.px, gkPt.py);
    players.push({
      key: "gk", x: p.x, y: p.y, shirtColor: defenderGkColor, shortsColor: "#1a1a1a",
      gkColor: defenderGkColor, shirtNum: 1, isGK: true, isCarrier: false, isPasser: false, isReceiver: false, facing: -plan.fwd,
    });
  }
  if (stage.wall) {
    stage.wall.forEach((w, i) => {
      const p = pitchToWide(w.px, w.py);
      players.push({
        key: `wall${i}`, x: p.x, y: p.y, shirtColor: wallColor, shortsColor: "#1a1a1a",
        gkColor: wallColor, shirtNum: 5 + i, isGK: false, isCarrier: false, isPasser: false, isReceiver: false, facing: -plan.fwd,
      });
    });
  }

  // เส้นปะบอกทางเดินบอล — โค้ง quadratic เดียวกับที่บอลบินจริง (โชว์เฉพาะสเตจที่เริ่มแล้ว)
  const trailPaths = plan.stages.map((st, i) => {
    if (i > stageIdx || !st.ballFrom || !st.ballTo) return null;
    const dx = st.ballTo.px - st.ballFrom.px;
    const dy = st.ballTo.py - st.ballFrom.py;
    const len = Math.hypot(dx, dy) || 1;
    const bend = st.curveMag || 0;
    const midPx = (st.ballFrom.px + st.ballTo.px) / 2 + (-dy / len) * bend;
    const midPy = (st.ballFrom.py + st.ballTo.py) / 2 + (dx / len) * bend;
    const a = pitchToWide(st.ballFrom.px, st.ballFrom.py);
    const c = pitchToWide(midPx, midPy);
    const z = pitchToWide(st.ballTo.px, st.ballTo.py);
    return <path key={i} d={`M ${a.x} ${a.y} Q ${c.x} ${c.y} ${z.x} ${z.y}`} fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="0.4" strokeDasharray="1.5 1.3" />;
  });

  const shooterScreen = pitchToWide(shooterPt.px, shooterPt.py);
  // นักเตะที่เหลือทั้งสนามจาก ambient (แช่แข็งระหว่างรีเพลย์) — ปิดวงแหวนสถานะกันสับสนกับตัวเอกของฉาก
  const bgPlayers = backgroundPlayers.map((p) => ({ ...p, isCarrier: false, isPasser: false, isReceiver: false }));

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 20, borderRadius: 12, overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,.6)" }}>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <V0PitchSVG uid={uid} ballPx={ballPt.px} ballPy={ballPt.py} sponsorLabel={sponsorLabel} highlightSeq={null} />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 30, pointerEvents: "none" }}>
          {trailPaths}
        </svg>
        {stage.ring && shooterPt && <RingPulse pt={shooterPt} pulse={ringPulse} />}
        <div style={{ opacity: 0.85 }}>
          <TrackerPlayerDots players={bgPlayers} />
        </div>
        <TrackerPlayerDots players={players} />
        {stage.emo && (
          <div style={{
            position: "absolute", left: `${shooterScreen.x}%`, top: `${shooterScreen.y}%`, zIndex: 42,
            transform: `translate(-50%, -${185 + Math.sin(elapsedRef.current * 8) * 20}%)`,
            fontSize: "clamp(13px, 2.4vw, 20px)", pointerEvents: "none", textShadow: "0 2px 6px rgba(0,0,0,.6)",
          }}>🎉</div>
        )}
        <TrackerBall px={ballPt.px} py={ballPt.py} animTick={0} phase={ballPhase} airHeight={airHeight} />
      </div>

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: barsIn ? "13%" : 0, background: "#000", transition: "height .35s ease", zIndex: 5 }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: barsIn ? "13%" : 0, background: "#000", transition: "height .35s ease", zIndex: 5 }} />

      <div style={{ position: "absolute", top: 6, left: 10, zIndex: 6, fontFamily: "Arial, sans-serif", fontSize: 11, fontWeight: 700, color: "#ffd54f", letterSpacing: 1, textShadow: "0 1px 3px rgba(0,0,0,.8)" }}>
        SLOW MO · {plan.label}
      </div>

      {stage.flash && (
        <div style={{ position: "absolute", inset: 0, zIndex: 7, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{
            fontFamily: "Arial Black, Arial, sans-serif", fontSize: "clamp(28px, 7vw, 52px)", fontWeight: 900,
            color: OUTCOME_COLOR[plan.outcome] || "#fff", letterSpacing: 2,
            textShadow: "0 4px 0 rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.7)",
          }}>
            {plan.flashLabel}
          </div>
          {plan.outcome === "goal" && scorerName && (
            <div style={{ fontFamily: "Arial, sans-serif", fontSize: 15, color: "#fff", marginTop: 8, textShadow: "0 2px 6px rgba(0,0,0,.8)" }}>
              ⚽ {scorerName} · {teamShort}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
