import React, { useId, useRef, useMemo, useState, useEffect } from "react";
import { HexTeamBadge } from "./club-badge.jsx";

/** v0 live football pitch — The Master Football Club */
const VB = { w: 1600, h: 900 };
const AD_BG = "#45c47a";
const AD_TEXT = "#0a2818";

function pitchToSvg(px, py) {
  const u = py / 100;
  return [
    800 + ((px - 50) / 50) * (560 + 210 * u),
    300 + 520 * u,
  ];
}

export function pitchToWide(px, py) {
  const [x, y] = pitchToSvg(px, py);
  return { x: (x / VB.w) * 100, y: (y / VB.h) * 100 };
}

/** จุดใน SVG ตัวนักเตะ (viewBox 20×28) → pitch px/py — ให้บอล overlay ตรงหัว/มือ */
function svgPointToPitch(px, py, svgX, svgY) {
  const pos = pitchToWide(px, py);
  const { playerH: h, playerW: w } = trackerScaleAt(pos.y);
  const targetScreenX = pos.x + ((svgX - 10) / 20) * w;
  const targetScreenY = pos.y + ((svgY - 14) / 28) * h;
  const ballPy = ((targetScreenY / 100) * VB.h - 300) / 520 * 100;
  const u = ballPy / 100;
  const ballPx = 50 + ((targetScreenX / 100) * VB.w - 800) * 50 / (560 + 210 * u);
  return { ballPx, ballPy };
}

function applyBodyTransform(localX, localY, shiftX, shiftY, leanDeg, pivotX = 10, pivotY = 18) {
  let x = localX - pivotX;
  let y = localY - pivotY;
  const rad = (leanDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: x * cos - y * sin + pivotX + shiftX,
    y: x * sin + y * cos + pivotY + shiftY,
  };
}

/** ปลายเท้าใน SVG — sync กับ AnimatedPlayerBody leg() */
function legFootTip(hipX, angleDeg, extend = 0, shiftX = 0, shiftY = 0, lean = 0) {
  const legLen = 5.2 + extend * 4.5;
  const rad = (angleDeg * Math.PI) / 180;
  const lx = hipX + legLen * Math.sin(rad);
  const ly = 22 + legLen * Math.cos(rad);
  return applyBodyTransform(lx, ly, shiftX, shiftY, lean);
}

function footToPitch(px, py, pt) {
  return svgPointToPitch(px, py, pt.x, pt.y);
}

/** มุมขา/เอียงตัวตามจังหวะเตะ — mirror AnimatedPlayerBody */
function resolveKickPose(kind, ap) {
  const stage = ap?.stage ?? "windup";
  const w = ap?.w ?? 0;
  const contact = ap?.contact ?? 0;
  const follow = ap?.follow ?? 0;
  let kickFront = 14;
  let kickBack = -14;
  let shiftX = 0;
  let shiftY = 0;
  let lean = 0;

  const isPass = kind === "pass" || kind === "through";
  const isCross = kind === "cross" || kind === "corner";
  const isVolley = kind === "volley";
  const isBackheel = kind === "backheel";
  const isSetPiece = kind === "freekick" || kind === "penalty";
  const isLong = kind === "longball" || kind === "clearance" || kind === "gk-kick-long";
  const isGkShort = kind === "gk-kick-short";
  const isChip = kind === "chip";

  if (isVolley && stage === "windup") {
    kickFront = 35 + w * 20; kickBack = -8; lean = -12 - w * 8; shiftY = -0.5 - w * 0.8;
  } else if (isVolley && stage === "contact") {
    kickFront = 55 + contact * 25; kickBack = -8; lean = -20 - contact * 6; shiftY = -1.3;
  } else if (isVolley && stage === "follow") {
    kickFront = 80 - follow * 35; kickBack = -8 + follow * 12; lean = -26 + follow * 18;
  } else if (isBackheel && stage === "windup") {
    lean = 15 + w * 20; shiftX = w * 3;
    kickBack = 15 + w * 55; kickFront = 10 - w * 8;
  } else if (isBackheel && stage === "contact") {
    lean = 35; shiftX = 3; kickBack = 70 + contact * 20; kickFront = 2;
  } else if (isBackheel && stage === "follow") {
    lean = 35 - follow * 25; kickBack = 90 - follow * 40;
  } else if (isCross && stage === "windup") {
    kickBack = 5 + w * 18; kickFront = 18 - w * 30; lean = -8 - w * 12; shiftY = w * 0.5;
  } else if (isCross && stage === "contact") {
    kickBack = 23; kickFront = -12 - contact * 45; lean = -20 - contact * 5;
  } else if (isCross && stage === "follow") {
    kickBack = 23 - follow * 12; kickFront = -57 + follow * 25; lean = -25 + follow * 15;
  } else if (isSetPiece && stage === "windup") {
    kickBack = 8 + w * (kind === "freekick" ? 32 : 22);
    kickFront = 10 - w * (kind === "freekick" ? 26 : 18);
    lean = -w * (kind === "freekick" ? 10 : 6); shiftY = -w * 0.8;
  } else if (isSetPiece && stage === "contact") {
    kickBack = kind === "freekick" ? 40 : 30;
    kickFront = -18 - contact * (kind === "freekick" ? 50 : 42);
    shiftY = -1 - contact * 0.6; lean = -8 - contact * 5;
  } else if (isSetPiece && stage === "follow") {
    kickBack = (kind === "freekick" ? 40 : 30) - follow * 18;
    kickFront = (kind === "freekick" ? -68 : -60) + follow * 28; lean = -13 + follow * 10;
  } else if (isLong && stage === "windup") {
    kickBack = 14 + w * 32; kickFront = 4 - w * 26; lean = -w * 14; shiftY = -w * 0.7;
  } else if (isLong && stage === "contact") {
    kickBack = 44; kickFront = -22 - contact * 52; lean = -14 - contact * 8;
  } else if (isLong && stage === "follow") {
    kickBack = 44 - follow * 22; kickFront = -74 + follow * 32; lean = -22 + follow * 14;
  } else if (isChip && stage === "windup") {
    kickBack = 8 + w * 14; kickFront = 16 - w * 10; lean = 10 + w * 8;
  } else if (isChip && stage === "contact") {
    kickBack = 22; kickFront = 6 - contact * 28; lean = 18;
  } else if (isChip && stage === "follow") {
    kickFront = -22 + follow * 18; kickBack = 22 - follow * 10; lean = 18 - follow * 12;
  } else if (isGkShort && stage === "windup") {
    kickBack = 6 + w * 10; kickFront = 12 - w * 8; lean = w * 4;
  } else if (isGkShort && stage === "contact") {
    kickBack = 16; kickFront = 4 - contact * 22; lean = 4 + contact * 4;
  } else if (isGkShort && stage === "follow") {
    kickFront = -18 + follow * 12; kickBack = 16 - follow * 8;
  } else if (isPass) {
    if (stage === "windup") {
      kickBack = 8 + w * 14; kickFront = 12 - w * 22; shiftY = w * 0.4; lean = w * 4;
    } else if (stage === "contact") {
      kickBack = 22; kickFront = -10 - contact * 38; shiftY = 0.4 + contact * 0.3; lean = 4 + contact * 6;
    } else {
      kickBack = 18 - follow * 10; kickFront = -48 + follow * 20; lean = 10 - follow * 8;
    }
  } else if (stage === "windup") {
    kickBack = 10 + w * 28; kickFront = 8 - w * 28; shiftY = -0.2 - w * 1.2; lean = -w * 8;
  } else if (stage === "contact") {
    kickBack = 38; kickFront = -20 - contact * 55; shiftY = -1.2 - contact * 0.8; lean = -8 - contact * 4;
  } else {
    kickBack = 38 - follow * 18; kickFront = -75 + follow * 28; shiftY = -2 + follow * 1.2; lean = -12 + follow * 10;
  }

  if (isBackheel) return { hipX: 7.8, angle: kickBack, shiftX, shiftY, lean, extend: 0 };
  return { hipX: 12.2, angle: kickFront, shiftX, shiftY, lean, extend: 0 };
}

function kickFootSvgPoint(kind, ap) {
  const p = resolveKickPose(kind, ap);
  return legFootTip(p.hipX, p.angle, p.extend, p.shiftX, p.shiftY, p.lean);
}

function standingFootSvg(p = 0.5) {
  return legFootTip(12.2, 14 + p * 4, 0, 0, 0, 0);
}

/** จุด contact บน SVG — sync กับ AnimatedPlayerBody */
function animContactSvg(actionKind, ap, isGK) {
  if (!ap) return { x: 10, y: 6 };
  const p = ap.p ?? 0;

  if (actionKind === "header") {
    let shiftX = 0;
    let shiftY = 0;
    let lean = 0;
    let headY = 6;
    if (ap.stage === "crouch") {
      shiftY = p * 1.8;
      headY = 6 + p * 0.5;
    } else if (ap.stage === "jump") {
      const peak = Math.sin(p * Math.PI);
      shiftY = -13 * peak;
      lean = 18 * peak;
      headY = 6 - 4.5 * peak;
    } else {
      shiftY = -1 * (1 - p);
      lean = 18 * (1 - p);
      headY = 6 + p * 0.8;
    }
    return applyBodyTransform(10, headY - 0.8, shiftX, shiftY, lean);
  }

  if (actionKind === "gk-punch" && isGK) {
    let shiftY = 0;
    let lean = 0;
    if (ap.stage === "ready") {
      return applyBodyTransform(12, 8, 0, 0, 0);
    }
    if (ap.stage === "punch") {
      const peak = Math.sin(p * Math.PI);
      shiftY = -11 * peak;
      lean = -8 * p;
    } else {
      shiftY = -2 * (1 - p);
      lean = -8 * (1 - p);
    }
    return applyBodyTransform(12, 4, 0, shiftY, lean);
  }

  if (actionKind === "gk-save" && isGK) {
    let shiftX = 0;
    let shiftY = 0;
    let lean = 0;
    if (ap.stage === "ready") {
      return applyBodyTransform(11, 7, 0, p * 0.5, 0);
    }
    if (ap.stage === "save") {
      const peak = Math.sin(p * Math.PI);
      shiftX = -5 * p;
      shiftY = -9 * peak;
      lean = -55 * p;
    } else {
      shiftX = -5 * (1 - p * 0.5);
      shiftY = -2 * (1 - p);
      lean = -55 * (1 - p);
    }
    return applyBodyTransform(11, 4, shiftX, shiftY, lean);
  }

  if (actionKind === "gk-catch" && isGK) {
    let shiftY = 0;
    if (ap.stage === "ready") return applyBodyTransform(10, 8, 0, 0, 0);
    if (ap.stage === "catch") {
      const peak = Math.sin(p * Math.PI);
      shiftY = -6 * peak;
    } else {
      shiftY = -1 * (1 - p);
    }
    return applyBodyTransform(10, 7, 0, shiftY, 0);
  }

  if (actionKind === "bicycle") {
    let shiftX = 0;
    let jumpY = 0;
    let lean = 0;
    let kickBack = 15;
    if (ap.stage === "jump") {
      jumpY = -6 - p * 8;
      lean = 35 + p * 45;
      kickBack = 15 + p * 70;
    } else if (ap.stage === "kick") {
      const peak = Math.sin(p * Math.PI);
      jumpY = -14;
      lean = 88 + peak * 12;
      kickBack = 85 + peak * 20;
      shiftX = -5;
    } else {
      lean = 100 * (1 - p);
      jumpY = -14 + p * 12;
      kickBack = 105 - p * 70;
      shiftX = -5 * (1 - p);
    }
    return legFootTip(7.8, kickBack, 0, shiftX, jumpY, lean);
  }

  if (actionKind === "rainbow") {
    if (ap.stage === "flick") {
      return legFootTip(7.8, 30 + p * 45, 0, -1, 0, -8);
    }
    if (ap.stage === "catch") {
      return legFootTip(12.2, 18 + p * 10, 0, 0, 0, 0);
    }
    return legFootTip(12.2, 14, 0, 0, 0, 0);
  }

  return { x: 10, y: 6 };
}

const KICK_ACTIONS = new Set([
  "pass", "shot", "cross", "volley", "backheel", "freekick", "penalty",
  "longball", "through", "chip", "corner", "clearance",
  "gk-kick-short", "gk-kick-long",
  "shot-near", "shot-far", "shot-curve", "shot-long-outside", "shot-power",
  "shot-pbox-top", "shot-pbox-bottom",
]);
const KICK_BALL = {
  pass: { reach: 9, lift: 1.4, phase: "pass" },
  shot: { reach: 14, lift: 2.2, phase: "shot" },
  cross: { reach: 18, lift: 4.8, phase: "pass" },
  volley: { reach: 15, lift: 2.6, phase: "shot" },
  backheel: { reach: -8, lift: 1.2, phase: "pass" },
  freekick: { reach: 17, lift: 3.0, phase: "shot" },
  penalty: { reach: 15, lift: 2.0, phase: "shot" },
  longball: { reach: 22, lift: 3.2, phase: "pass" },
  through: { reach: 18, lift: 1.8, phase: "through" },
  chip: { reach: 10, lift: 3.5, phase: "pass" },
  corner: { reach: 17, lift: 4.5, phase: "pass" },
  clearance: { reach: 20, lift: 3.8, phase: "pass" },
  "gk-kick-short": { reach: 14, lift: 0.6, phase: "pass" },
  "gk-kick-long": { reach: 28, lift: 4.5, phase: "pass" },
  "shot-near": { reach: 10, lift: 0.9, phase: "shot" },
  "shot-far": { reach: 24, lift: 2.6, phase: "shot" },
  "shot-curve": { reach: 20, lift: 2.4, phase: "shot", curve: 5.5 },
  "shot-long-outside": { reach: 28, lift: 3.2, phase: "shot" },
  "shot-power": { reach: 14, lift: 0.5, phase: "shot" },
  "shot-pbox-top": { reach: 18, lift: 2.5, phase: "shot", curve: 6 },
  "shot-pbox-bottom": { reach: 18, lift: 2.5, phase: "shot", curve: 6 },
};

function poseCycle3(kind, animTick, cycle, windEnd, hitEnd) {
  const c = animTick % cycle;
  if (c < windEnd) return { kind, stage: "windup", w: c / windEnd, contact: 0 };
  if (c < hitEnd) return { kind, stage: "contact", w: 1, contact: (c - windEnd) / (hitEnd - windEnd) };
  return { kind, stage: "follow", w: 1, contact: 1, follow: (c - hitEnd) / (cycle - hitEnd) };
}

function poseStages(kind, animTick, cycle, cuts) {
  const c = animTick % cycle;
  let acc = 0;
  for (let i = 0; i < cuts.length; i++) {
    const [stage, len] = cuts[i];
    if (c < acc + len) return { kind, stage, p: (c - acc) / len };
    acc += len;
  }
  const last = cuts[cuts.length - 1];
  return { kind, stage: last[0], p: 1 };
}

function demoKickBall(ap, px, py, action) {
  const cfg = KICK_BALL[action] || KICK_BALL.pass;
  const lofted = ["cross", "corner", "longball", "clearance", "gk-kick-long"].includes(action);
  const liftMul = lofted ? 1.45 : 1;
  const smooth = (u) => u * u * (3 - 2 * u);
  const toFoot = (ap2) => footToPitch(px, py, kickFootSvgPoint(action, { kind: action, ...ap2 }));

  if (!ap || ap.stage === "windup") {
    const w = ap?.w ?? 0;
    const f = toFoot({ stage: "windup", w: Math.max(w, 0.01) });
    const high = lofted || action === "volley" || action === "freekick";
    return {
      ballPx: f.ballPx,
      ballPy: f.ballPy,
      ballPhase: high && w > 0.55 ? "pass" : "dribble",
      airH: high ? w * 1.6 : 0,
      contactAnchor: w > 0.3,
    };
  }
  if (ap.stage === "contact") {
    const pinEnd = action === "volley" ? 0.24 : 0.34;
    const f = toFoot(ap);
    if (ap.contact < pinEnd) {
      return {
        ballPx: f.ballPx,
        ballPy: f.ballPy,
        ballPhase: cfg.phase,
        airH: ap.contact * cfg.lift * 0.18,
        contactAnchor: true,
      };
    }
    const t = smooth((ap.contact - pinEnd) / (1 - pinEnd));
    const start = toFoot({ stage: "contact", contact: pinEnd, w: 1 });
    return {
      ballPx: start.ballPx + cfg.reach * t,
      ballPy: start.ballPy - cfg.lift * t * (lofted ? 0.55 : 0.42),
      ballPhase: cfg.phase,
      airH: cfg.lift * t * liftMul,
      contactAnchor: false,
    };
  }
  const t = 0.5 + (ap.follow || 0) * 0.5;
  const start = toFoot({ stage: "contact", contact: 1, w: 1 });
  return {
    ballPx: start.ballPx + cfg.reach * t,
    ballPy: start.ballPy - cfg.lift * t * (lofted ? 0.55 : 0.42),
    ballPhase: cfg.phase,
    airH: cfg.lift * t * liftMul,
    contactAnchor: false,
  };
}

/** สเกลบนสนาม tracker — ลูกบอลและตัวนักเตะใช้สัดส่วนเดียวกัน */
function trackerScaleAt(screenY) {
  const playerH = 2.6 + (screenY / 100) * 2.4;
  const playerW = playerH * 0.72;
  const ballW = playerW * 0.44;
  const footDrop = playerH * 0.34;
  return { playerH, playerW, ballW, footDrop };
}

function polyNorm(pts) {
  return pts.map(([px, py]) => pitchToSvg(px, py).join(",")).join(" ");
}

function depthScale(py) {
  return 0.5 + (py / 100) * 0.6;
}

function centerCirclePath(segs = 48) {
  let d = "";
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const [x, y] = pitchToSvg(50 + 7 * Math.cos(a), 50 + 15 * Math.sin(a));
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return `${d}Z`;
}

function GoalFrame({ endPx, halfWp, baseH, depthDir }) {
  const a = 50 - halfWp;
  const c = 50 + halfWp;
  const [d, f] = pitchToSvg(endPx, a);
  const [h, p] = pitchToSvg(endPx, c);
  const x = baseH * depthScale(a);
  const j = baseH * depthScale(c);
  const yOff = 0.55 * baseH * depthScale(a) * depthDir;
  const gOff = 0.55 * baseH * depthScale(c) * depthDir;

  const u = [d, f];
  const m = [d, f - x];
  const b = [h, p];
  const M = [h, p - j];
  const v = [d + yOff, f];
  const S = [d + yOff, f - 0.92 * x];
  const k = [h + gOff, p];
  const w = [h + gOff, p - 0.92 * j];

  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const line = (p, q, key) => <line key={key} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} />;

  const net = [];
  for (let i = 1; i <= 4; i++) {
    const t = i / 5;
    net.push(line(lerp(S, w, t), lerp(v, k, t), `nv${i}`));
  }
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    net.push(line(lerp(S, v, t), lerp(w, k, t), `nh${i}`));
  }

  return (
    <g>
      <g stroke="#8b95a6" strokeWidth="1" opacity="0.55" fill="none">
        {net}
        {line(m, S, "sf")}{line(M, w, "sn")}
        {line(u, v, "bf")}{line(b, k, "bn")}
      </g>
      <g stroke="#f4f8f5" strokeWidth="3.5" strokeLinecap="round" fill="none">
        {line(u, m, "pf")}{line(b, M, "pn")}{line(m, M, "cb")}
      </g>
      <g stroke="#cdd6de" strokeWidth="2" strokeLinecap="round" fill="none">
        {line(v, S, "pfb")}{line(k, w, "pnb")}{line(S, w, "cbb")}
      </g>
    </g>
  );
}

function AdBoardSide({ clipId, points, cx, cy, angle, label, dur, dir, fontSize }) {
  const text = ` ${label}   •   `.repeat(Math.ceil(1940 / Math.max(140, (label.length + 3) * fontSize * 0.62)));
  const unit = Math.max(140, (label.length + 3) * fontSize * 0.62);
  return (
    <g clipPath={`url(#${clipId})`}>
      <polygon points={points} fill={AD_BG} opacity={0.95} />
      <g transform={`rotate(${angle} ${cx} ${cy})`}>
        <g style={{ "--u": `${dir * unit}px`, animation: `v0Ad ${dur}s linear infinite` }}>
          <text
            x={cx - 970} y={cy} fontSize={fontSize} fontWeight="800"
            fontFamily="Arial, system-ui, sans-serif" letterSpacing="1.2"
            fill={AD_TEXT} dominantBaseline="middle"
          >
            {text}
          </text>
        </g>
      </g>
    </g>
  );
}

function V0PitchSVG({ uid, ballPx, ballPy, sponsorLabel, highlightSeq }) {
  const py = Math.max(2, Math.min(98, ballPy));
  const px = Math.max(2, Math.min(98, ballPx));
  const [bx, by] = pitchToSvg(px, py);

  const stripes = Array.from({ length: 14 }, (_, e) => {
    const x0 = (e / 14) * 100;
    const x1 = ((e + 1) / 14) * 100;
    return (
      <polygon key={e} points={polyNorm([[x0, 0], [x1, 0], [x1, 100], [x0, 100]])} fill={e % 2 ? "#268345" : "#2f8a4f"} />
    );
  });

  const topAd = polyNorm([[0, 0], [100, 0], [100, -6], [0, -6]]);
  const botAd = polyNorm([[0, 100], [100, 100], [100, 108], [0, 108]]);
  const leftAd = polyNorm([[0, 0], [0, 100], [-5, 100], [-5, 0]]);
  const rightAd = polyNorm([[100, 0], [100, 100], [105, 100], [105, 0]]);

  const ang = (a, b) => (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const pTL = pitchToSvg(-2, 0);
  const pBL = pitchToSvg(-2, 100);
  const pTR = pitchToSvg(102, 0);
  const pBR = pitchToSvg(102, 100);
  const topC = pitchToSvg(50, -3);
  const botC = pitchToSvg(50, 103);

  const shotGlow = highlightSeq?.stage === "shot";

  return (
    <svg viewBox={`0 0 ${VB.w} ${VB.h}`} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ display: "block" }}>
      <defs>
        <pattern id={`crowd-${uid}`} width="13" height="13" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.8" fill="#fff" opacity="0.16" />
          <circle cx="9.5" cy="9.5" r="1.8" fill="#fff" opacity="0.16" />
        </pattern>
        <radialGradient id={`vign-${uid}`} cx="50%" cy="34%" r="75%">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
        <clipPath id={`clipTop-${uid}`}><polygon points={topAd} /></clipPath>
        <clipPath id={`clipBot-${uid}`}><polygon points={botAd} /></clipPath>
        <clipPath id={`clipLeft-${uid}`}><polygon points={leftAd} /></clipPath>
        <clipPath id={`clipRight-${uid}`}><polygon points={rightAd} /></clipPath>
        <clipPath id={`pitchClip-${uid}`}><polygon points={polyNorm([[0, 0], [100, 0], [100, 100], [0, 100]])} /></clipPath>
      </defs>

      <rect width={VB.w} height={VB.h} fill="#070b12" />

      <clipPath id={`standL-${uid}`}><rect x="0" y="0" width="800" height="310" /></clipPath>
      <clipPath id={`standR-${uid}`}><rect x="800" y="0" width="800" height="310" /></clipPath>
      <path id={`standShape-${uid}`} d="M -40,255 Q 800,-70 1640,255 L 1640,288 Q 800,80 -40,288 Z" />
      <g clipPath={`url(#standL-${uid})`}>
        <use href={`#standShape-${uid}`} fill="#39404e" />
        <use href={`#standShape-${uid}`} fill={`url(#crowd-${uid})`} />
      </g>
      <g clipPath={`url(#standR-${uid})`}>
        <use href={`#standShape-${uid}`} fill="#1f4f8f" />
        <use href={`#standShape-${uid}`} fill={`url(#crowd-${uid})`} />
      </g>
      <path d="M -40,285 Q 800,78 1640,285 L 1640,318 Q 800,120 -40,318 Z" fill="#0c1119" />

      <g clipPath={`url(#pitchClip-${uid})`}>
        <rect width={VB.w} height={VB.h} fill="#2f8a4f" />
        {stripes}
      </g>

      <g fill="none" stroke="#eef5ef" strokeWidth="2.2" opacity="0.9">
        <polygon points={polyNorm([[0, 0], [100, 0], [100, 100], [0, 100]])} />
        <line x1={pitchToSvg(50, 0)[0]} y1={pitchToSvg(50, 0)[1]} x2={pitchToSvg(50, 100)[0]} y2={pitchToSvg(50, 100)[1]} />
        <path d={centerCirclePath()} />
        <polygon points={polyNorm([[0, 22], [16, 22], [16, 78], [0, 78]])} />
        <polygon points={polyNorm([[0, 38], [6, 38], [6, 62], [0, 62]])} />
        <polygon points={polyNorm([[100, 22], [84, 22], [84, 78], [100, 78]])} />
        <polygon points={polyNorm([[100, 38], [94, 38], [94, 62], [100, 62]])} />
      </g>

      <AdBoardSide clipId={`clipTop-${uid}`} points={topAd} cx={topC[0]} cy={topC[1]} angle={0} label={sponsorLabel} dur={26} dir={-1} fontSize={18} />
      <AdBoardSide clipId={`clipBot-${uid}`} points={botAd} cx={botC[0]} cy={botC[1]} angle={0} label={sponsorLabel} dur={18} dir={-1} fontSize={30} />
      <AdBoardSide clipId={`clipLeft-${uid}`} points={leftAd} cx={mid(pTL, pBL)[0]} cy={mid(pTL, pBL)[1]} angle={ang(pTL, pBL)} label={sponsorLabel} dur={22} dir={-1} fontSize={17} />
      <AdBoardSide clipId={`clipRight-${uid}`} points={rightAd} cx={mid(pTR, pBR)[0]} cy={mid(pTR, pBR)[1]} angle={ang(pTR, pBR)} label={sponsorLabel} dur={22} dir={1} fontSize={17} />

      <GoalFrame endPx={0} halfWp={10} baseH={120} depthDir={-1} />
      <GoalFrame endPx={100} halfWp={10} baseH={120} depthDir={1} />

      {shotGlow && (
        <circle cx={bx} cy={by} r={28} fill="none" stroke="#fff" strokeWidth="2.5" opacity="0.7">
          <animate attributeName="r" values="18;42;18" dur="0.55s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0.2;0.8" dur="0.55s" repeatCount="indefinite" />
        </circle>
      )}

      <rect width={VB.w} height={VB.h} fill={`url(#vign-${uid})`} pointerEvents="none" />
    </svg>
  );
}

/** ลูกบอล SVG — ลาย Telstar ขาว-ดำ + shading 3D */
function SoccerBallSvg({ uid, spin, shooting }) {
  const gid = uid || "ball";
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" style={{ display: "block", transform: `rotate(${spin}deg)` }}>
      <defs>
        <radialGradient id={`${gid}-shine`} cx="34%" cy="28%" r="62%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#f7f7f7" />
          <stop offset="72%" stopColor="#e2e2e2" />
          <stop offset="100%" stopColor="#a5a5a5" />
        </radialGradient>
        <radialGradient id={`${gid}-rim`} cx="50%" cy="50%" r="50%">
          <stop offset="88%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
        </radialGradient>
        <clipPath id={`${gid}-clip`}>
          <circle cx="32" cy="32" r="29.5" />
        </clipPath>
      </defs>

      <ellipse cx="32" cy="33" rx="29" ry="28.5" fill="#888" opacity="0.12" />
      <circle cx="32" cy="32" r="29.5" fill={`url(#${gid}-shine)`} />
      <circle cx="32" cy="32" r="29.5" fill={`url(#${gid}-rim)`} />

      <g clipPath={`url(#${gid}-clip)`} fill="#141414">
        <polygon points="32,14 40.8,20.4 37.6,30.6 26.4,30.6 23.2,20.4" />
        <polygon points="32,2 37.2,7.5 32,11 26.8,7.5" />
        <polygon points="52,12 56,18 50,20 46,14" />
        <polygon points="54,38 58,44 52,48 48,42" />
        <polygon points="32,52 37.5,58 32,62 26.5,58" />
        <polygon points="10,38 14,44 8,48 4,42" />
        <polygon points="12,12 16,18 10,20 6,14" />
        <polygon points="44,28 50,32 44,36 38,32" opacity="0.95" />
        <polygon points="20,28 26,32 20,36 14,32" opacity="0.95" />
        <polygon points="32,38 36,42 32,46 28,42" opacity="0.9" />
      </g>

      <g clipPath={`url(#${gid}-clip)`} fill="none" stroke="#bdbdbd" strokeWidth="0.45" opacity="0.55">
        <polygon points="32,14 40.8,20.4 37.6,30.6 26.4,30.6 23.2,20.4" />
        <line x1="32" y1="14" x2="32" y2="2" />
        <line x1="40.8" y1="20.4" x2="52" y2="12" />
        <line x1="37.6" y1="30.6" x2="54" y2="38" />
        <line x1="26.4" y1="30.6" x2="10" y2="38" />
        <line x1="23.2" y1="20.4" x2="12" y2="12" />
      </g>

      <ellipse cx="24" cy="22" rx="7" ry="5" fill="#fff" opacity="0.38" />
      <ellipse cx="22" cy="20" rx="3" ry="2" fill="#fff" opacity="0.55" />
      <circle cx="32" cy="32" r="29.5" fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="0.8" />
      {shooting && (
        <circle cx="32" cy="32" r="31" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.65" />
      )}
    </svg>
  );
}

/** FM — แสดงตำแหน่งจาก engine โดยตรง (ไม่ใช้ CSS transition ซ้อน) */
function staminaColor(v) {
  if (v >= 65) return "#3dba6a";
  if (v >= 35) return "#e0a458";
  return "#e05a4a";
}

/** ท่า action — จังหวะฟุตบอลจริง (demo) */
function actionPose(kind, animTick) {
  if (!kind) return null;

  const kickCfg = {
    pass: [28, 6, 11], shot: [28, 10, 15], cross: [32, 9, 14],
    volley: [30, 6, 13], backheel: [28, 7, 12], freekick: [36, 14, 19], penalty: [34, 10, 14],
    longball: [32, 8, 14], through: [28, 5, 10], chip: [26, 7, 12], corner: [34, 10, 16],
    clearance: [30, 7, 13], "gk-kick-short": [28, 6, 11], "gk-kick-long": [36, 12, 18],
    "shot-near": [24, 5, 9], "shot-far": [32, 9, 14], "shot-curve": [30, 10, 14],
    "shot-long-outside": [34, 10, 16], "shot-power": [26, 7, 12],
    "shot-pbox-top": [30, 10, 14], "shot-pbox-bottom": [30, 10, 14],
    rabona: [30, 9, 15],
  };
  if (kickCfg[kind]) {
    const [cycle, windEnd, hitEnd] = kickCfg[kind];
    const c = animTick % cycle;
    if (c < windEnd) return { kind, stage: "windup", w: c / windEnd, contact: 0 };
    if (c < hitEnd) return { kind, stage: "contact", w: 1, contact: (c - windEnd) / (hitEnd - windEnd) };
    return { kind, stage: "follow", w: 1, contact: 1, follow: (c - hitEnd) / (cycle - hitEnd) };
  }

  const cycle = 32;
  const c = animTick % cycle;

  if (kind === "gk-save" || kind === "gk-save-left" || kind === "gk-save-right") {
    if (c < 6) return { kind, stage: "ready", p: c / 6 };
    if (c < 16) return { kind, stage: "save", p: (c - 6) / 10 };
    return { kind, stage: "recover", p: (c - 16) / (cycle - 16) };
  }
  if (kind === "gk-dive-tipover") {
    // ปัดข้ามคาน — เอื้อมสูงเป็นหลัก ไม่ใช่พุ่งขนานพื้นแบบเซฟข้าง
    if (c < 6) return { kind, stage: "ready", p: c / 6 };
    if (c < 17) return { kind, stage: "reach", p: (c - 6) / 11 };
    return { kind, stage: "recover", p: (c - 17) / (cycle - 17) };
  }
  if (kind === "gk-jump-save") {
    // กระโดดตรงขึ้น (ลูกยิงกลางไม่กว้างมาก) ต่างจากพุ่งขนานพื้น
    if (c < 5) return { kind, stage: "ready", p: c / 5 };
    if (c < 15) return { kind, stage: "jump", p: (c - 5) / 10 };
    return { kind, stage: "recover", p: (c - 15) / (cycle - 15) };
  }
  if (kind === "gk-punch") {
    if (c < 5) return { kind, stage: "ready", p: c / 5 };
    if (c < 14) return { kind, stage: "punch", p: (c - 5) / 9 };
    return { kind, stage: "recover", p: (c - 14) / (cycle - 14) };
  }
  if (kind === "gk-catch") {
    if (c < 6) return { kind, stage: "ready", p: c / 6 };
    if (c < 15) return { kind, stage: "catch", p: (c - 6) / 9 };
    return { kind, stage: "hold", p: (c - 15) / (cycle - 15) };
  }
  if (kind === "header") {
    if (c < 5) return { kind, stage: "crouch", p: c / 5 };
    if (c < 18) return { kind, stage: "jump", p: (c - 5) / 13 };
    return { kind, stage: "land", p: (c - 18) / (cycle - 18) };
  }
  if (kind === "header-diving") {
    // โหม่งพุ่งดิ่ง — ลำตัวเหยียดขนานพื้นแทนกระโดดตรง (บอลอยู่นอกระยะเอื้อมยืนโหม่งปกติ)
    if (c < 5) return { kind, stage: "crouch", p: c / 5 };
    if (c < 17) return { kind, stage: "dive", p: (c - 5) / 12 };
    return { kind, stage: "land", p: (c - 17) / (cycle - 17) };
  }
  if (kind === "slide") {
    const sc = 34;
    const s = animTick % sc;
    if (s < 5) return { kind, stage: "approach", p: s / 5 };
    if (s < 22) return { kind, stage: "slide", p: (s - 5) / 17 };
    return { kind, stage: "recover", p: (s - 22) / (sc - 22) };
  }
  if (kind === "dribble") {
    const dc = 38;
    const d = animTick % dc;
    if (d < 7) return { kind, stage: "carry", p: d / 7 };
    if (d < 15) return { kind, stage: "feint", p: (d - 7) / 8 };
    if (d < 26) return { kind, stage: "cut", p: (d - 15) / 11 };
    return { kind, stage: "burst", p: (d - 26) / (dc - 26) };
  }
  if (kind === "receive") {
    const rc = 30;
    const r = animTick % rc;
    if (r < 9) return { kind, stage: "wait", p: r / 9 };
    if (r < 17) return { kind, stage: "touch", p: (r - 9) / 8 };
    return { kind, stage: "control", p: (r - 17) / (rc - 17) };
  }
  if (kind === "tackle") {
    const tc = 32;
    const r = animTick % tc;
    if (r < 6) return { kind, stage: "approach", p: r / 6 };
    if (r < 16) return { kind, stage: "lunge", p: (r - 6) / 10 };
    return { kind, stage: "recover", p: (r - 16) / (tc - 16) };
  }
  if (kind === "block") {
    const bc = 28;
    const r = animTick % bc;
    if (r < 5) return { kind, stage: "set", p: r / 5 };
    if (r < 14) return { kind, stage: "block", p: (r - 5) / 9 };
    return { kind, stage: "stagger", p: (r - 14) / (bc - 14) };
  }
  if (kind === "chest") {
    const cc = 30;
    const r = animTick % cc;
    if (r < 8) return { kind, stage: "incoming", p: r / 8 };
    if (r < 16) return { kind, stage: "trap", p: (r - 8) / 8 };
    return { kind, stage: "drop", p: (r - 16) / (cc - 16) };
  }
  if (kind === "shield") {
    const sc = 32;
    const s = animTick % sc;
    if (s < 8) return { kind, stage: "hold", p: s / 8 };
    if (s < 20) return { kind, stage: "push", p: (s - 8) / 12 };
    return { kind, stage: "turn", p: (s - 20) / (sc - 20) };
  }
  if (kind === "celebrate") {
    const cc = 34;
    const r = animTick % cc;
    if (r < 8) return { kind, stage: "raise", p: r / 8 };
    if (r < 18) return { kind, stage: "jump", p: (r - 8) / 10 };
    return { kind, stage: "pump", p: (r - 18) / (cc - 18) };
  }
  if (kind === "throwin") return poseStages(kind, animTick, 32, [["ready", 6], ["throw", 10], ["recover", 16]]);
  if (kind === "touchline-dribble") return poseStages(kind, animTick, 36, [["run", 12], ["touch", 10], ["burst", 14]]);
  if (kind === "touchline-cross") return poseStages(kind, animTick, 40, [["run", 11], ["cross", 13], ["recover", 16]]);
  if (kind === "header-goal") {
    const base = poseStages("header", animTick, 32, [["crouch", 5], ["jump", 13], ["land", 14]]);
    return base ? { ...base, kind: "header-goal" } : null;
  }
  if (kind === "stepover") return poseStages("dribble", animTick, 22, [["feint", 12], ["cut", 10]]);
  if (kind === "nutmeg") return poseStages("dribble", animTick, 24, [["feint", 8], ["cut", 16]]);
  // ครัฟฟ์เทิร์น — ดึงบอลกลับหลังขาหลักแล้วหมุนตัวกลับทิศ (หมุนเต็ม 360° ในช่วง "spin" พอดีรอบ ไม่มีจังหวะสะดุดตอนวนไซเคิลใหม่)
  if (kind === "cruyff-turn") return poseStages(kind, animTick, 42, [["carry", 10], ["spin", 24], ["carry2", 8]]);
  // ซีดานเทิร์น/มาร์กเซยรูเล็ต — หมุนตัว 360° รอบบอลแต่เร็ว-กระชับกว่าครัฟฟ์เทิร์น
  if (kind === "zidane-turn") return poseStages(kind, animTick, 30, [["carry", 6], ["spin", 18], ["carry2", 6]]);
  // เอลาสติโก้ — เท้าแตะบอลออกด้านนอกแล้วสะบัดกลับเข้าในเร็วๆ ไม่มีการหมุนตัว
  if (kind === "elastico") return poseStages(kind, animTick, 26, [["carry", 6], ["flick", 14], ["carry2", 6]]);
  if (kind === "bicycle") return poseStages(kind, animTick, 36, [["jump", 10], ["kick", 12], ["land", 14]]);
  if (kind === "rainbow") return poseStages(kind, animTick, 32, [["flick", 10], ["arc", 12], ["catch", 10]]);
  if (kind === "intercept") return poseStages(kind, animTick, 30, [["read", 7], ["cut", 11], ["recover", 12]]);
  if (kind === "jockey") return poseStages(kind, animTick, 32, [["shuffle", 14], ["engage", 10], ["recover", 8]]);
  if (kind === "gk-throw") return poseStages(kind, animTick, 32, [["ready", 5], ["throw", 11], ["recover", 16]]);
  if (kind === "gk-throw-short" || kind === "gk-throw-long") {
    const base = poseStages("gk-throw", animTick, 32, [["ready", 5], ["throw", 11], ["recover", 16]]);
    return base ? { ...base, kind } : null;
  }
  if (kind === "onetwo") return poseStages(kind, animTick, 34, [["give", 9], ["run", 12], ["return", 13]]);
  if (kind === "stumble") return poseStages(kind, animTick, 26, [["hit", 8], ["fall", 18]]);
  if (kind === "ref-card") return poseStages(kind, animTick, 40, [["reach", 8], ["raise", 14], ["hold", 18]]);
  // บาดเจ็บหนัก — ล้มแล้วนอนนิ่งค้างนาน (ต่างจาก stumble ที่ลุกเร็ว) รอหมอนวดเข้ามาดู
  if (kind === "injury-down") return poseStages(kind, animTick, 70, [["hit", 8], ["fall", 14], ["lie", 48]]);
  if (kind === "flag-raise") return poseStages(kind, animTick, 50, [["raise", 8], ["hold", 34], ["lower", 8]]);
  // กัปตันจับมือก่อนเขี่ย — ยื่นแขนออกแล้วค้าง (วนซ้ำช้าๆ เพราะฉากนี้ยืนค้างยาว ไม่ต้องมีจังหวะจบ)
  if (kind === "handshake") return poseStages(kind, animTick, 30, [["reach", 10], ["hold", 20]]);
  return null;
}

/** SVG ตัวนักเตะ — วิ่ง · เตะ · โหม่ง · GK เซฟ/ปัด */
function AnimatedPlayerBody({ shirt, shorts, numCol, num, isGK, running, actionKind = null, animTick = 0 }) {
  const t = animTick;
  const phase = (t * 0.52) % (Math.PI * 2);
  const swing = Math.sin(phase) * 24;
  const armSwing = Math.sin(phase) * 18;
  const ap = actionPose(actionKind, t);

  let kickFront = swing;
  let kickBack = -swing;
  let leftArm = -armSwing;
  let rightArm = armSwing;
  let bodyBob = running ? Math.sin(phase * 2) * 0.35 : 0;
  let bodyLean = 0;
  let jumpY = 0;
  let shiftX = 0;
  let headY = 6;
  let headRx = 3.6;
  let showBallAtFoot = false;
  let ballFootX = 14.2;
  let ballFootY = 24.8;
  let showGloveFlash = false;
  let slideExtend = 0;

  const kickKinds = ["pass", "shot", "cross", "volley", "backheel", "freekick", "penalty", "longball", "through", "chip", "corner", "clearance", "gk-kick-short", "gk-kick-long", "shot-near", "shot-far", "shot-curve", "shot-long-outside", "shot-power", "shot-pbox-top", "shot-pbox-bottom", "rabona"];
  if (kickKinds.includes(ap?.kind)) {
    const { stage, w, contact, follow, kind: k } = ap;
    const isPass = k === "pass" || k === "through";
    const isCross = k === "cross" || k === "corner";
    const isVolley = k === "volley";
    const isBackheel = k === "backheel";
    const isSetPiece = k === "freekick" || k === "penalty";
    const isLong = k === "longball" || k === "clearance" || k === "gk-kick-long";
    const isGkShort = k === "gk-kick-short";
    const isChip = k === "chip";
    const isPower = k === "shot-power";
    const isRabona = k === "rabona";

    if (isVolley && stage === "windup") {
      kickFront = 35 + w * 20; kickBack = -8;
      leftArm = -35 - w * 15; rightArm = 30 + w * 10;
      bodyLean = -12 - w * 8; bodyBob = -0.5 - w * 0.8;
    } else if (isVolley && stage === "contact") {
      kickFront = 55 + contact * 25; kickBack = -8;
      leftArm = -50; rightArm = 40;
      bodyLean = -20 - contact * 6; bodyBob = -1.3;
      showGloveFlash = contact > 0.35 && contact < 0.75;
    } else if (isVolley && stage === "follow") {
      kickFront = 80 - follow * 35; kickBack = -8 + follow * 12;
      leftArm = -50 + follow * 15; bodyLean = -26 + follow * 18;
    } else if (isBackheel && stage === "windup") {
      bodyLean = 15 + w * 20; shiftX = w * 3;
      kickBack = 15 + w * 55; kickFront = 10 - w * 8;
      leftArm = -10 - w * 15; rightArm = 35 + w * 8;
      showBallAtFoot = true; ballFootX = 8.5 - w * 0.5; ballFootY = 25;
    } else if (isBackheel && stage === "contact") {
      bodyLean = 35; shiftX = 3;
      kickBack = 70 + contact * 20; kickFront = 2;
      leftArm = -25; rightArm = 43;
      showBallAtFoot = contact < 0.4; ballFootX = 7.5;
      showGloveFlash = contact > 0.3 && contact < 0.7;
    } else if (isBackheel && stage === "follow") {
      bodyLean = 35 - follow * 25; kickBack = 90 - follow * 40;
      leftArm = -25 + follow * 10; rightArm = 43 - follow * 15;
    } else if (isCross && stage === "windup") {
      kickBack = 5 + w * 18; kickFront = 18 - w * 30;
      leftArm = -5 - w * 25; rightArm = 35 + w * 12;
      bodyLean = -8 - w * 12; bodyBob = w * 0.5; showBallAtFoot = true;
    } else if (isCross && stage === "contact") {
      kickBack = 23; kickFront = -12 - contact * 45;
      leftArm = -30; rightArm = 47 + contact * 8;
      bodyLean = -20 - contact * 5;
      showBallAtFoot = contact < 0.4; ballFootX = 13.5 + contact * 2;
    } else if (isCross && stage === "follow") {
      kickBack = 23 - follow * 12; kickFront = -57 + follow * 25;
      leftArm = -30 + follow * 10; bodyLean = -25 + follow * 15;
    } else if (isSetPiece && stage === "windup") {
      kickBack = 8 + w * (k === "freekick" ? 32 : 22);
      kickFront = 10 - w * (k === "freekick" ? 26 : 18);
      leftArm = -10 - w * 20; rightArm = 8 + w * 18;
      bodyLean = -w * (k === "freekick" ? 10 : 6);
      bodyBob = -w * 0.8; showBallAtFoot = true;
    } else if (isSetPiece && stage === "contact") {
      kickBack = k === "freekick" ? 40 : 30;
      kickFront = -18 - contact * (k === "freekick" ? 50 : 42);
      leftArm = -30 - contact * 8; rightArm = 26 + contact * 10;
      bodyBob = -1 - contact * 0.6; bodyLean = -8 - contact * 5;
      showBallAtFoot = contact < 0.35;
      showGloveFlash = contact > 0.35 && contact < 0.75;
    } else if (isSetPiece && stage === "follow") {
      kickBack = (k === "freekick" ? 40 : 30) - follow * 18;
      kickFront = (k === "freekick" ? -68 : -60) + follow * 28;
      bodyLean = -13 + follow * 10;
    } else if (isLong && stage === "windup") {
      kickBack = 14 + w * 32; kickFront = 4 - w * 26;
      leftArm = -18 - w * 20; rightArm = 10 + w * 16;
      bodyLean = -w * 14; bodyBob = -w * 0.7; showBallAtFoot = true;
    } else if (isLong && stage === "contact") {
      kickBack = 44; kickFront = -22 - contact * 52;
      leftArm = -34; rightArm = 26;
      bodyLean = -14 - contact * 8;
      showGloveFlash = contact > 0.35 && contact < 0.75;
    } else if (isLong && stage === "follow") {
      kickBack = 44 - follow * 22; kickFront = -74 + follow * 32;
      bodyLean = -22 + follow * 14;
    } else if (isChip && stage === "windup") {
      kickBack = 8 + w * 14; kickFront = 16 - w * 10;
      leftArm = -20; rightArm = 24 + w * 10;
      bodyLean = 10 + w * 8; showBallAtFoot = true;
    } else if (isChip && stage === "contact") {
      kickBack = 22; kickFront = 6 - contact * 28;
      leftArm = -30; rightArm = 32;
      bodyLean = 18; showBallAtFoot = contact < 0.35;
      showGloveFlash = contact > 0.4 && contact < 0.7;
    } else if (isChip && stage === "follow") {
      kickFront = -22 + follow * 18; kickBack = 22 - follow * 10; bodyLean = 18 - follow * 12;
    } else if (isPower && stage === "windup") {
      kickBack = 12 + w * 38; kickFront = 8 - w * 26;
      leftArm = -15 - w * 18; rightArm = 10 + w * 14;
      bodyLean = -14 - w * 12; bodyBob = -w * 1.4; showBallAtFoot = true;
    } else if (isPower && stage === "contact") {
      kickBack = 48; kickFront = -32 - contact * 48;
      leftArm = -38; rightArm = 28 + contact * 10;
      bodyLean = -26 - contact * 8; bodyBob = -2.2;
      showGloveFlash = contact > 0.32 && contact < 0.78;
    } else if (isPower && stage === "follow") {
      kickBack = 48 - follow * 22; kickFront = -80 + follow * 35; bodyLean = -34 + follow * 18;
    } else if (isRabona && stage === "windup") {
      // ราโบน่า — ไขว้ขาเตะไปด้านหลังขาหลักก่อนสะบัดออก จำลองด้วยขาหลัง (kickBack) งอไขว้ผ่านแนวกลางตัวแรงกว่าเตะปกติ + เอียงตัวชดเชยสมดุล
      kickBack = 10 + w * 34; kickFront = -8 - w * 20;
      bodyLean = 18 + w * 10; shiftX = -w * 2;
      leftArm = -40 - w * 10; rightArm = 40 + w * 10;
    } else if (isRabona && stage === "contact") {
      kickBack = 44; kickFront = -28 - contact * 42;
      bodyLean = 28; shiftX = -2;
      leftArm = -50; rightArm = 50;
      showGloveFlash = contact > 0.3 && contact < 0.7;
    } else if (isRabona && stage === "follow") {
      kickBack = 44 - follow * 20; kickFront = -70 + follow * 30;
      bodyLean = 28 - follow * 16; shiftX = -2 + follow * 2;
    } else if (isGkShort && stage === "windup") {
      kickBack = 6 + w * 10; kickFront = 12 - w * 8;
      leftArm = -12; rightArm = 18 + w * 8; bodyLean = w * 4; showBallAtFoot = true;
    } else if (isGkShort && stage === "contact") {
      kickBack = 16; kickFront = 4 - contact * 22;
      leftArm = -18; rightArm = 24; bodyLean = 4 + contact * 4;
      showBallAtFoot = contact < 0.4;
    } else if (isGkShort && stage === "follow") {
      kickFront = -18 + follow * 12; kickBack = 16 - follow * 8;
    } else if (isPass) {
      if (stage === "windup") {
        kickBack = 8 + w * 14; kickFront = 12 - w * 22;
        leftArm = -12 - w * 10; rightArm = 18 + w * 6;
        bodyBob = w * 0.4; bodyLean = w * 4; showBallAtFoot = true;
      } else if (stage === "contact") {
        kickBack = 22; kickFront = -10 - contact * 38;
        leftArm = -22; rightArm = 24 + contact * 8;
        bodyBob = 0.4 + contact * 0.3; bodyLean = 4 + contact * 6;
        showBallAtFoot = contact < 0.45; ballFootX = 14.2 + contact * 2.5;
      } else {
        kickBack = 18 - follow * 10; kickFront = -48 + follow * 20;
        leftArm = -22 + follow * 8; rightArm = 32 - follow * 14; bodyLean = 10 - follow * 8;
      }
    } else if (stage === "windup") {
      kickBack = 10 + w * 28; kickFront = 8 - w * 28;
      leftArm = -8 - w * 22; rightArm = 6 + w * 14;
      bodyBob = -0.2 - w * 1.2; bodyLean = -w * 8; showBallAtFoot = true;
    } else if (stage === "contact") {
      kickBack = 38; kickFront = -20 - contact * 55;
      leftArm = -30 - contact * 8; rightArm = 20 + contact * 12;
      bodyBob = -1.2 - contact * 0.8; bodyLean = -8 - contact * 4;
      showBallAtFoot = contact < 0.35; ballFootX = 14.5 + contact * 3; ballFootY = 24.5 - contact * 0.8;
    } else {
      kickBack = 38 - follow * 18; kickFront = -75 + follow * 28;
      leftArm = -38 + follow * 12; rightArm = 32 - follow * 18;
      bodyBob = -2 + follow * 1.2; bodyLean = -12 + follow * 10;
    }
  } else if (ap?.kind === "gk-save" || ap?.kind === "gk-save-left" || ap?.kind === "gk-save-right") {
    // ทิศพุ่ง — ปัดซ้าย/ขวาจริงตามด้าน ไม่ใช่พุ่งทางเดียวตายตัวเหมือนเดิม (dirSign=+1 ขวา, -1 ซ้าย/กลาง)
    const dirSign = ap.kind === "gk-save-right" ? 1 : -1;
    const { stage, p } = ap;
    if (stage === "ready") {
      kickFront = 5 + p * 4; kickBack = -5 - p * 4;
      leftArm = -20 - p * 15; rightArm = -15 - p * 20;
      bodyBob = p * 0.5;
    } else if (stage === "save") {
      const peak = Math.sin(p * Math.PI);
      jumpY = -9 * peak;
      shiftX = 5 * dirSign * p;
      bodyLean = 55 * dirSign * p;
      kickFront = 35 * p; kickBack = -25 * p;
      leftArm = -95 * p; rightArm = -110 * p;
      showGloveFlash = p > 0.35 && p < 0.75;
    } else {
      jumpY = -2 * (1 - p); shiftX = 5 * dirSign * (1 - p * 0.5); bodyLean = 55 * dirSign * (1 - p);
      leftArm = -95 * (1 - p); rightArm = -110 * (1 - p);
      kickFront = 35 * (1 - p); kickBack = -25 * (1 - p);
    }
  } else if (ap?.kind === "gk-dive-tipover") {
    // ปัดข้ามคาน — เอื้อมแขนขึ้นสูงสุดเป็นหลัก ลำตัวลอยแนวตั้งมากกว่าแนวนอน (ต่างจาก gk-save ที่ลอยขนานพื้น)
    const { stage, p } = ap;
    if (stage === "ready") {
      leftArm = -30 - p * 20; rightArm = -25 - p * 25; bodyBob = p * 0.5;
    } else if (stage === "reach") {
      const peak = Math.sin(p * Math.PI);
      jumpY = -16 * peak;
      bodyLean = -20 * p;
      leftArm = -150 * p; rightArm = -160 * p;
      showGloveFlash = p > 0.3 && p < 0.7;
    } else {
      jumpY = -3 * (1 - p); bodyLean = -20 * (1 - p);
      leftArm = -150 * (1 - p); rightArm = -160 * (1 - p);
    }
  } else if (ap?.kind === "gk-jump-save") {
    // กระโดดตรงขึ้น (ลูกยิงกลางแรง ไม่กว้างมาก) — ไม่มี shiftX/bodyLean ข้าง เพราะไม่ได้พุ่งข้าง
    const { stage, p } = ap;
    if (stage === "ready") {
      kickFront = 4; kickBack = -4; leftArm = -15; rightArm = -12; bodyBob = p * 0.6;
    } else if (stage === "jump") {
      const peak = Math.sin(p * Math.PI);
      jumpY = -14 * peak;
      leftArm = -100 * p; rightArm = -100 * p;
      kickFront = 10 * p; kickBack = -10 * p;
      showGloveFlash = p > 0.35 && p < 0.75;
    } else {
      jumpY = -2 * (1 - p); leftArm = -100 * (1 - p); rightArm = -100 * (1 - p);
    }
  } else if (ap?.kind === "gk-punch") {
    const { stage, p } = ap;
    if (stage === "ready") {
      leftArm = -15; rightArm = -10; kickFront = 4; kickBack = -4;
    } else if (stage === "punch") {
      const peak = Math.sin(p * Math.PI);
      jumpY = -11 * peak;
      bodyLean = -8 * p;
      leftArm = -40 - p * 30;
      rightArm = -130 * p;
      kickFront = 8 + p * 12; kickBack = -12;
      showGloveFlash = p > 0.4 && p < 0.85;
    } else {
      jumpY = -2 * (1 - p); rightArm = -130 * (1 - p); bodyLean = -8 * (1 - p);
    }
  } else if (ap?.kind === "gk-catch") {
    const { stage, p } = ap;
    if (stage === "ready") {
      leftArm = -25 - p * 20; rightArm = -20 - p * 25;
      kickFront = 5; kickBack = -5;
    } else if (stage === "catch") {
      const peak = Math.sin(p * Math.PI);
      jumpY = -6 * peak;
      leftArm = -75 * p; rightArm = -85 * p;
      kickFront = 12 * p; kickBack = -10 * p;
      showGloveFlash = p > 0.35 && p < 0.75;
    } else {
      leftArm = -75 * (1 - p * 0.3); rightArm = -85 * (1 - p * 0.3);
      jumpY = -1 * (1 - p);
    }
  } else if (ap?.kind === "header" || ap?.kind === "header-goal") {
    const { stage, p } = ap;
    if (stage === "crouch") {
      bodyBob = p * 1.8; kickFront = 12 + p * 8; kickBack = -8 - p * 6;
      leftArm = -25 - p * 10; rightArm = 25 + p * 10; headY = 6 + p * 0.5;
    } else if (stage === "jump") {
      const peak = Math.sin(p * Math.PI);
      jumpY = -13 * peak;
      bodyLean = 18 * peak;
      kickFront = 22 * peak; kickBack = -18 * peak;
      leftArm = -55 * peak; rightArm = 55 * peak;
      headY = 6 - 4.5 * peak;
      showGloveFlash = p > 0.42 && p < 0.62;
    } else {
      jumpY = -1 * (1 - p); bodyLean = 18 * (1 - p);
      kickFront = 22 * (1 - p); headY = 6 + p * 0.8;
    }
  } else if (ap?.kind === "header-diving") {
    const { stage, p } = ap;
    if (stage === "crouch") {
      bodyBob = p * 1.2; kickFront = 10 + p * 10; kickBack = -6 - p * 10;
      leftArm = -20 - p * 15; rightArm = 20 + p * 15; headY = 6 + p * 0.4;
    } else if (stage === "dive") {
      const peak = Math.sin(p * Math.PI);
      jumpY = -7 * peak;
      shiftX = p * 6;
      bodyLean = 78 * p; // เกือบขนานพื้น ต่างจาก header ยืนที่ lean แค่ ~18*peak
      kickFront = 6 * p; kickBack = -30 * p; // ขาหลังเหยียดตามแรงพุ่ง
      leftArm = -60 * p; rightArm = 15 + p * 10;
      headY = 6 - 5 * peak;
      showGloveFlash = p > 0.4 && p < 0.62;
    } else {
      jumpY = -1.5 * (1 - p); bodyLean = 78 * (1 - p); shiftX = 6 * (1 - p);
      kickBack = -30 * (1 - p); headY = 6 + p * 0.6;
    }
  } else if (ap?.kind === "slide") {
    const { stage, p } = ap;
    if (stage === "approach") {
      kickFront = swing * 0.6 + p * 8;
      kickBack = -swing * 0.6 - p * 6;
      leftArm = -armSwing - p * 8;
      rightArm = armSwing + p * 12;
      bodyLean = 8 + p * 12;
      bodyBob = p * 0.6;
    } else if (stage === "slide") {
      bodyLean = 72 + p * 8;
      bodyBob = 3.5 + p * 1.2;
      shiftX = 2 + p * 7;
      kickFront = 78 + p * 6;
      kickBack = -42;
      leftArm = -75;
      rightArm = 35;
      headY = 8.5 + p * 1.2;
      headRx = 3.4;
      slideExtend = 1;
      showGloveFlash = p > 0.35 && p < 0.65;
      showBallAtFoot = p > 0.3 && p < 0.7;
      ballFootX = 16.5 + p * 2;
      ballFootY = 25.5;
    } else {
      bodyLean = 80 * (1 - p);
      bodyBob = 4.5 * (1 - p);
      shiftX = 9 * (1 - p * 0.5);
      kickFront = 84 - p * 50;
      kickBack = -42 + p * 20;
      leftArm = -75 + p * 40;
      rightArm = 35 - p * 20;
      headY = 9.5 - p * 2;
      slideExtend = 1 - p;
    }
  } else if (ap?.kind === "dribble") {
    const { stage, p } = ap;
    const feintWave = Math.sin(p * Math.PI);
    if (stage === "carry") {
      kickFront = 16 + swing * 0.45;
      kickBack = -12 - swing * 0.45;
      leftArm = -18 - swing * 0.3;
      rightArm = 22 + swing * 0.3;
      bodyLean = 8;
      bodyBob = Math.sin(phase * 2) * 0.45;
      showBallAtFoot = true;
      ballFootX = 14.3;
      ballFootY = 24.7;
    } else if (stage === "feint") {
      bodyLean = -26 * feintWave;
      shiftX = -3 + p * 2.5;
      kickFront = 42;
      kickBack = -6;
      leftArm = -42;
      rightArm = 48;
      headY = 6.8;
      showBallAtFoot = true;
      ballFootX = 16.8 + p * 1.2;
      ballFootY = 25.1;
    } else if (stage === "cut") {
      const snap = Math.sin(p * Math.PI);
      bodyLean = -26 + snap * 44;
      shiftX = 1 + p * 4;
      kickFront = 18 + p * 42;
      kickBack = -20;
      leftArm = -12;
      rightArm = 38 - p * 8;
      bodyBob = snap * 0.5;
      showBallAtFoot = p < 0.7;
      ballFootX = 14.8 + p * 3.2;
      ballFootY = 24.4;
      showGloveFlash = p > 0.28 && p < 0.58;
    } else {
      kickFront = 14 + swing * 0.9;
      kickBack = -14 - swing * 0.9;
      leftArm = -armSwing * 1.15;
      rightArm = armSwing * 1.15;
      bodyLean = 14 + p * 4;
      bodyBob = Math.sin(phase * 2.2) * 0.65;
      shiftX = p * 2;
      showBallAtFoot = true;
      ballFootX = 15.8 + p * 2.5;
      ballFootY = 24.5;
    }
  } else if (ap?.kind === "cruyff-turn" || ap?.kind === "zidane-turn") {
    // ครัฟฟ์เทิร์น/ซีดานเทิร์น — วิ่งเลี้ยงปกติ แล้วหมุนทั้งตัวครบ 360° รอบตัวเอง (rotate 360°≡0° พอดี กันจังหวะสะดุดตอนวนไซเคิลใหม่)
    const { stage, p } = ap;
    if (stage === "carry" || stage === "carry2") {
      kickFront = 16 + swing * 0.4; kickBack = -12 - swing * 0.4;
      leftArm = -18; rightArm = 22; bodyLean = 8;
      showBallAtFoot = true;
    } else {
      bodyLean = p * 360;
      leftArm = -30 - Math.sin(p * Math.PI) * 14;
      rightArm = 30 + Math.sin(p * Math.PI) * 14;
      kickFront = 10 - Math.sin(p * Math.PI) * 6;
      kickBack = -10 + Math.sin(p * Math.PI) * 6;
      showBallAtFoot = true;
    }
  } else if (ap?.kind === "elastico") {
    // เอลาสติโก้ — ไม่หมุนตัว แค่สะบัดเท้าออกด้านนอกแล้วหยับกลับเข้าในเร็วๆ (double-touch)
    const { stage, p } = ap;
    if (stage === "carry" || stage === "carry2") {
      kickFront = 16; kickBack = -12; leftArm = -18; rightArm = 22; bodyLean = 6;
      showBallAtFoot = true;
    } else {
      const snap = Math.sin(p * Math.PI);
      kickFront = 20 + snap * 40; kickBack = -14;
      bodyLean = -10 * snap; shiftX = snap * 3;
      leftArm = -20 - snap * 10; rightArm = 26 + snap * 14;
      showBallAtFoot = true; ballFootX = 15 + snap * 4;
    }
  } else if (ap?.kind === "touchline-dribble") {
    const { stage, p } = ap;
    if (stage === "run") {
      kickFront = 12 + swing * 0.35; kickBack = -10 - swing * 0.35;
      bodyLean = 24; bodyBob = Math.sin(phase * 2) * 0.3;
      showBallAtFoot = true; ballFootX = 15.2; shiftX = p * 1.2;
    } else if (stage === "touch") {
      kickFront = 18 + p * 16; kickBack = -8;
      bodyLean = 28; bodyBob = Math.sin(p * Math.PI * 4) * 0.32;
      showBallAtFoot = true; ballFootX = 15.5 + p * 0.8;
    } else {
      kickFront = 14 + p * 18; bodyLean = 26; shiftX = 2 + p * 3.5;
      showBallAtFoot = p < 0.55; ballFootX = 16 + p * 2;
    }
  } else if (ap?.kind === "touchline-cross") {
    const { stage, p } = ap;
    if (stage === "run") {
      kickFront = 14 + swing * 0.3; kickBack = -10; bodyLean = 26;
      showBallAtFoot = true; ballFootX = 15; shiftX = p;
    } else if (stage === "cross") {
      kickBack = 20; kickFront = -14 - p * 50;
      leftArm = -32; rightArm = 52 + p * 6;
      bodyLean = -20 - p * 6; showGloveFlash = p > 0.35 && p < 0.72;
      showBallAtFoot = p < 0.22;
    } else {
      bodyLean = -26 * (1 - p); kickFront = -64 + p * 28;
    }
  } else if (ap?.kind === "receive") {
    const { stage, p } = ap;
    if (stage === "wait") {
      kickFront = 14; kickBack = -10;
      leftArm = -15 - p * 8; rightArm = 20 + p * 10;
      bodyLean = 4 + p * 4;
    } else if (stage === "touch") {
      kickFront = 28 + p * 18; kickBack = -12;
      leftArm = -22; rightArm = 28;
      bodyLean = 8; showBallAtFoot = p > 0.4;
      ballFootX = 15 + p * 2; ballFootY = 24.6;
      showGloveFlash = p > 0.45 && p < 0.75;
    } else {
      kickFront = 46 - p * 20; kickBack = -14;
      showBallAtFoot = true; ballFootX = 14.5; ballFootY = 24.7;
    }
  } else if (ap?.kind === "tackle") {
    const { stage, p } = ap;
    if (stage === "approach") {
      kickFront = swing * 0.5 + 10 + p * 8;
      kickBack = -swing * 0.5 - 8;
      bodyLean = 10 + p * 15;
    } else if (stage === "lunge") {
      bodyLean = 25 + p * 35;
      shiftX = p * 5;
      kickFront = 55 + p * 20;
      kickBack = -18;
      leftArm = -40; rightArm = 35;
      showGloveFlash = p > 0.3 && p < 0.65;
    } else {
      bodyLean = 60 * (1 - p);
      shiftX = 5 * (1 - p);
      kickFront = 75 - p * 45;
    }
  } else if (ap?.kind === "block") {
    const { stage, p } = ap;
    if (stage === "set") {
      kickFront = 8; kickBack = -8;
      leftArm = -55 - p * 15; rightArm = -50 - p * 15;
      bodyLean = -5 - p * 8;
    } else if (stage === "block") {
      kickFront = 18; kickBack = -12;
      leftArm = -70; rightArm = -68;
      bodyLean = -18 * Math.sin(p * Math.PI);
      jumpY = -2 * Math.sin(p * Math.PI);
      showGloveFlash = p > 0.35 && p < 0.7;
    } else {
      leftArm = -70 * (1 - p); bodyLean = -18 * (1 - p);
      kickFront = 18 - p * 8;
    }
  } else if (ap?.kind === "chest") {
    const { stage, p } = ap;
    if (stage === "incoming") {
      leftArm = -30 - p * 15; rightArm = -28 - p * 15;
      bodyLean = -12 - p * 8; headY = 6.5 + p * 0.5;
    } else if (stage === "trap") {
      leftArm = -45; rightArm = -42;
      bodyLean = -20; bodyBob = -0.5;
      showGloveFlash = p > 0.35 && p < 0.7;
    } else {
      bodyLean = -20 * (1 - p);
      kickFront = 16 + p * 8; showBallAtFoot = p > 0.4;
      ballFootX = 14.3; ballFootY = 24.8;
    }
  } else if (ap?.kind === "shield") {
    const { stage, p } = ap;
    if (stage === "hold") {
      bodyLean = -18; shiftX = -2;
      leftArm = -35 - p * 10; rightArm = 40 + p * 12;
      kickFront = 12; kickBack = -10;
      showBallAtFoot = true; ballFootX = 13.5; ballFootY = 24.8;
    } else if (stage === "push") {
      bodyLean = -22; shiftX = -3 + p * 2;
      leftArm = -45; rightArm = 52;
      kickFront = 18 + p * 8; kickBack = -14;
      showBallAtFoot = true; ballFootX = 12.8 - p * 0.5;
    } else {
      bodyLean = -22 + p * 15; shiftX = -1 + p * 3;
      leftArm = -45 + p * 20; rightArm = 52 - p * 15;
      showBallAtFoot = true;
    }
  } else if (ap?.kind === "celebrate") {
    const { stage, p } = ap;
    if (stage === "raise") {
      leftArm = -70 * p; rightArm = -75 * p;
      kickFront = 8; kickBack = -8;
      bodyBob = -p * 0.5;
    } else if (stage === "jump") {
      const peak = Math.sin(p * Math.PI);
      jumpY = -14 * peak;
      leftArm = -110; rightArm = -115;
      kickFront = 12 * peak; kickBack = -12 * peak;
    } else {
      jumpY = -1 * (1 - p);
      leftArm = -110 + p * 30; rightArm = -115 + p * 35;
      bodyBob = Math.sin(p * Math.PI * 2) * 0.4;
    }
  } else if (ap?.kind === "throwin") {
    const { stage, p } = ap;
    if (stage === "ready") {
      leftArm = -118 - p * 12; rightArm = -115 - p * 12;
      kickFront = 5; kickBack = -5; bodyLean = -4;
      headY = 5.5;
    } else if (stage === "throw") {
      leftArm = -128; rightArm = -125;
      bodyLean = -10 - p * 6; bodyBob = -0.6;
      showGloveFlash = p > 0.35 && p < 0.75;
    } else {
      leftArm = -128 * (1 - p); rightArm = -125 * (1 - p); bodyLean = -16 * (1 - p);
    }
  } else if (ap?.kind === "bicycle") {
    const { stage, p } = ap;
    if (stage === "jump") {
      jumpY = -6 - p * 8;
      bodyLean = 35 + p * 45;
      kickBack = 15 + p * 70;
      kickFront = 8;
      leftArm = -35 - p * 25; rightArm = 30 + p * 20;
      headY = 7 + p * 3;
    } else if (stage === "kick") {
      const peak = Math.sin(p * Math.PI);
      jumpY = -14;
      bodyLean = 88 + peak * 12;
      kickBack = 85 + peak * 20;
      kickFront = 5;
      leftArm = -60; rightArm = 45;
      headY = 11;
      shiftX = -5;
      showGloveFlash = p > 0.35 && p < 0.72;
    } else {
      bodyLean = 100 * (1 - p);
      jumpY = -14 + p * 12;
      kickBack = 105 - p * 70;
      headY = 11 - p * 4;
    }
  } else if (ap?.kind === "rainbow") {
    const { stage, p } = ap;
    if (stage === "flick") {
      kickBack = 30 + p * 45; kickFront = 6;
      bodyLean = -8; shiftX = -1;
      showBallAtFoot = p < 0.55;
      ballFootX = 8.5; ballFootY = 25.8;
    } else if (stage === "arc") {
      leftArm = -35; rightArm = 40;
      bodyLean = 6; headY = 5.5;
    } else {
      kickFront = 18 + p * 10; kickBack = -12;
      showBallAtFoot = p > 0.35;
      ballFootX = 15; ballFootY = 24.6;
    }
  } else if (ap?.kind === "stumble") {
    const { stage, p } = ap;
    if (stage === "hit") {
      bodyLean = 18 * p; shiftX = -p * 3;
      kickFront = 14 + p * 10; leftArm = -20; rightArm = 35;
    } else {
      bodyLean = 18 + p * 48; shiftX = -3 - p * 5;
      kickFront = 24; kickBack = -8; headY = 8 + p * 2;
      leftArm = -15; rightArm = 50;
    }
  } else if (ap?.kind === "injury-down") {
    // เหมือน stumble ตอนล้ม แต่ "lie" นอนนิ่งค้างยาว (ไม่ลุกเร็วเหมือน stumble) รอหมอนวด
    const { stage, p } = ap;
    if (stage === "hit") {
      bodyLean = 20 * p; shiftX = -p * 3;
      kickFront = 14 + p * 10; leftArm = -20; rightArm = 35;
    } else if (stage === "fall") {
      bodyLean = 20 + p * 70; shiftX = -3 - p * 6;
      kickFront = 24; kickBack = -8; headY = 8 + p * 2;
      leftArm = -15; rightArm = 50;
    } else {
      // lie — นอนนิ่งเกือบราบกับพื้น มือกุมขา (จำลองด้วยแขนงอเข้าหาตัว)
      bodyLean = 88; shiftX = -9;
      kickFront = 20; kickBack = -6; headY = 10;
      leftArm = -10; rightArm = 15;
    }
  } else if (ap?.kind === "ref-card") {
    // ผู้ตัดสินชูใบเหลือง/แดง — ยกแขนขวาขึ้นเหนือหัวตรงๆ ค้างไว้ (ท่าจริงที่คนดูบอลคุ้นตาที่สุด)
    const { stage, p } = ap;
    if (stage === "reach") {
      rightArm = -40 - p * 60; bodyLean = 4;
    } else if (stage === "raise") {
      rightArm = -100 - p * 65; bodyLean = 4 + p * 3;
    } else {
      rightArm = -165; bodyLean = 7;
    }
  } else if (ap?.kind === "flag-raise") {
    // ผู้ช่วยผู้ตัดสินยกธงล้ำหน้า — ท่าเดียวกับชูใบแต่ยกแขนไม่สูงเท่า (ธงสั้นกว่าแขนยกใบ) แล้วค้างนานกว่า
    const { stage, p } = ap;
    if (stage === "raise") {
      rightArm = -30 - p * 80; bodyLean = 2;
    } else if (stage === "hold") {
      rightArm = -110; bodyLean = 3;
    } else {
      rightArm = -110 + p * 100;
    }
  } else if (ap?.kind === "handshake") {
    // กัปตันยื่นมือขวาออกไปข้างหน้าจับมือคู่แข่ง — ค้างท่าเอียงตัวไปข้างหน้าเล็กน้อย
    const { stage, p } = ap;
    if (stage === "reach") {
      rightArm = -20 - p * 50; bodyLean = p * 6;
    } else {
      rightArm = -70; bodyLean = 6;
    }
  } else if (ap?.kind === "intercept") {
    const { stage, p } = ap;
    if (stage === "read") {
      kickFront = 10; kickBack = -8; bodyLean = 6 + p * 6;
      leftArm = -25 - p * 15; rightArm = 20 + p * 10;
    } else if (stage === "cut") {
      shiftX = p * 4; bodyLean = 12 + p * 20;
      kickFront = 35 + p * 25; kickBack = -14;
      showGloveFlash = p > 0.35 && p < 0.7;
    } else {
      shiftX = 4 * (1 - p); bodyLean = 32 * (1 - p);
    }
  } else if (ap?.kind === "jockey") {
    const { stage, p } = ap;
    if (stage === "shuffle") {
      kickFront = 10 + swing * 0.3; kickBack = -10 - swing * 0.3;
      bodyLean = -8; leftArm = -35; rightArm = 35;
      bodyBob = Math.sin(phase * 3) * 0.25;
    } else if (stage === "engage") {
      bodyLean = -12 - p * 8; kickFront = 18 + p * 10;
      leftArm = -45; rightArm = 42;
    } else {
      bodyLean = -20 * (1 - p);
    }
  } else if (ap?.kind === "gk-throw" || ap?.kind === "gk-throw-short" || ap?.kind === "gk-throw-long") {
    const { stage, p } = ap;
    if (stage === "ready") {
      leftArm = -50 - p * 20; rightArm = -45 - p * 20;
    } else if (stage === "throw") {
      leftArm = -100; rightArm = -95;
      bodyLean = -10; shiftX = p * 3;
      showGloveFlash = p > 0.35 && p < 0.75;
    } else {
      leftArm = -100 * (1 - p); rightArm = -95 * (1 - p);
    }
  } else if (ap?.kind === "onetwo") {
    const { stage, p } = ap;
    if (stage === "give") {
      kickFront = 12 - p * 20; kickBack = 10 + p * 12;
      leftArm = -15; rightArm = 22 + p * 8;
      showBallAtFoot = p < 0.55; ballFootX = 14.5;
      showGloveFlash = p > 0.4 && p < 0.65;
    } else if (stage === "run") {
      kickFront = 16 + swing * 0.7; kickBack = -14 - swing * 0.7;
      leftArm = -armSwing; rightArm = armSwing;
      bodyLean = 12 + p * 6; shiftX = p * 5;
    } else {
      kickFront = 28 + p * 15; kickBack = -12;
      leftArm = -22; rightArm = 26;
      showBallAtFoot = p > 0.45; ballFootX = 15 + p;
    }
  }

  const leg = (hipX, angle, extend = 0) => (
    <g transform={`rotate(${angle} ${hipX} 22)`}>
      <rect x={hipX - 1.4} y={22} width="2.8" height={5.2 + extend * 4.5} rx="1" fill="#2a2a2a" />
    </g>
  );
  const arm = (x, angle, glove = false) => (
    <g transform={`rotate(${angle} ${x + 1.3} 10.5)`}>
      <rect x={x} y={10.5} width="2.6" height="6.5" rx="1.1"
        fill={glove ? "#f0e040" : shirt} stroke="rgba(0,0,0,0.2)" strokeWidth="0.35" />
    </g>
  );

  return (
    <g transform={`translate(${shiftX} ${bodyBob + jumpY}) rotate(${bodyLean} 10 18)`}>
      {leg(7.8, kickBack, slideExtend * 0.3)}
      {leg(12.2, kickFront, slideExtend)}
      <rect x="5.5" y="17.5" width="9" height="5.2" rx="1.2" fill={shorts} stroke="rgba(0,0,0,0.25)" strokeWidth="0.4" />
      <path
        d="M5 9.5 L15 9.5 L16.2 17.8 L3.8 17.8 Z"
        fill={shirt} stroke="rgba(0,0,0,0.28)" strokeWidth="0.45" strokeLinejoin="round"
      />
      {arm(2.2, leftArm, isGK)}
      {arm(15.2, rightArm, isGK)}
      <circle cx="10" cy={headY} r={headRx} fill="#e8b88a" stroke="rgba(0,0,0,0.25)" strokeWidth="0.4" />
      {!isGK && (
        <text x="10" y="15.5" textAnchor="middle" fontSize="4.2" fontWeight="800"
          fill={numCol} fontFamily="Arial,sans-serif">{num}</text>
      )}
      {showBallAtFoot && (
        <ellipse cx={ballFootX} cy={ballFootY} rx="1.15" ry="0.58"
          fill="#f8f8f2" stroke="#333" strokeWidth="0.28" opacity="0.98" />
      )}
      {showGloveFlash && (
        <circle
          cx={ap?.kind === "slide" ? 17.5 : ap?.kind === "dribble" ? ballFootX : (isGK ? 12 : 10)}
          cy={ap?.kind === "slide" ? 25.5 : ap?.kind === "dribble" ? ballFootY : (isGK ? 4 : headY - 1)}
          r="2.2"
          fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.5" opacity="0.9"
        />
      )}
      {slideExtend > 0.4 && (
        <ellipse cx="11" cy="26.8" rx="7" ry="1.1" fill="rgba(255,255,255,0.08)" />
      )}
    </g>
  );
}

function TrackerPlayerFigure({ x, y, shirtColor, shortsColor, gkColor, num, isGK, isCarrier, isPasser, isReceiver, facing, name, stamina, actionKind = null, animTick = 0, running = false }) {
  const shirt = isGK ? gkColor : shirtColor;
  const shorts = isGK ? "#1e1e1e" : (shortsColor || "#1a1a1a");
  const { playerH: h, playerW: w } = trackerScaleAt(y);
  const z = 8 + Math.round(y * 0.4);
  const flip = facing < 0 ? "scaleX(-1)" : "none";
  const lum = 0.299 * parseInt(shirt.slice(1, 3), 16) + 0.587 * parseInt(shirt.slice(3, 5), 16) + 0.114 * parseInt(shirt.slice(5, 7), 16);
  const numCol = lum > 145 ? "#1a1a1a" : "#fff";

  return (
    <div style={{
      position: "absolute", left: `${x}%`, top: `${y}%`,
      transform: "translate(-50%, -50%)",
      width: `${w}%`, height: `${h}%`, zIndex: z, pointerEvents: "none",
    }}>
      {name && (
        <div style={{
          position: "absolute", left: "50%", top: "-42%", transform: "translateX(-50%)",
          fontSize: "clamp(6.5px, 0.8vw, 9.5px)", fontWeight: 700, color: "#fff",
          background: "rgba(0,0,0,0.55)", borderRadius: 3, padding: "0 3px",
          whiteSpace: "nowrap", letterSpacing: 0.2, textShadow: "0 1px 1px rgba(0,0,0,.6)",
        }}>{name}</div>
      )}
      {stamina != null && (
        <div style={{
          position: "absolute", left: "14%", right: "14%", bottom: "-16%", height: "8%",
          minHeight: 2, background: "rgba(0,0,0,0.55)", borderRadius: 2, overflow: "hidden",
        }}>
          <div style={{ width: `${stamina}%`, height: "100%", background: staminaColor(stamina) }} />
        </div>
      )}
      <div style={{ position: "relative", width: "100%", height: "100%", transform: flip }}>
        <div style={{
          position: "absolute", left: "10%", right: "10%", bottom: "-8%", height: "22%",
          background: "rgba(0,0,0,0.35)", borderRadius: "50%", filter: "blur(1px)",
        }} />
        {isCarrier && (
          <div style={{
            position: "absolute", inset: "-14% -10%", borderRadius: "4px",
            border: "2px solid rgba(255,255,255,0.8)", boxShadow: "0 0 6px rgba(255,255,255,.45)",
          }} />
        )}
        {isPasser && !isCarrier && (
          <div style={{
            position: "absolute", inset: "-12% -8%", borderRadius: "4px",
            border: "2px solid rgba(255,229,102,0.95)", boxShadow: "0 0 5px rgba(255,229,102,.4)",
          }} />
        )}
        {isReceiver && (
          <div style={{
            position: "absolute", inset: "-12% -8%", borderRadius: "4px",
            border: "2px solid rgba(168,230,255,0.95)", boxShadow: "0 0 5px rgba(168,230,255,.4)",
          }} />
        )}
        <svg viewBox="0 0 20 28" width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
          <AnimatedPlayerBody
            shirt={shirt} shorts={shorts} numCol={numCol} num={num} isGK={isGK}
            running={running} actionKind={actionKind} animTick={animTick}
          />
        </svg>
      </div>
    </div>
  );
}

function TrackerPlayerDots({ players }) {
  if (!players?.length) return null;
  // กันซ้ำท้ายทาง — ต้นตอที่แท้จริงยังไล่ไม่เจอ (เกิดเฉพาะตอนเตะมุม/ฟาวล์ถี่ๆ ที่ความเร็วสูง)
  // แต่ยืนยันแล้วว่าจำนวนจุดบนสนามจริงไม่เคยเกิน 23 พอดี ไม่มีอะไรเสียหาย — ทำให้ปลอดภัยแน่นอนไว้ก่อน
  const seen = new Set();
  const unique = players.filter((p) => {
    if (seen.has(p.key)) return false;
    seen.add(p.key);
    return true;
  });
  return (
    <>
      {unique.map((p) => (
        <TrackerPlayerFigure
          key={p.key}
          x={p.x}
          y={p.y}
          shirtColor={p.shirtColor}
          shortsColor={p.shortsColor}
          gkColor={p.gkColor}
          num={p.shirtNum}
          isGK={p.isGK}
          isCarrier={p.isCarrier}
          isPasser={p.isPasser}
          isReceiver={p.isReceiver}
          facing={p.facing ?? 1}
          name={p.name}
          stamina={p.stamina}
          actionKind={p.actionKind ?? null}
          animTick={p.poseTick ?? 0}
          running={p.running ?? false}
        />
      ))}
    </>
  );
}

function TrackerBall({ px, py, animTick, phase, airHeight = 0, contactAnchor = false }) {
  const uid = useId().replace(/:/g, "");
  const pos = pitchToWide(px, py);
  const { ballW, footDrop } = trackerScaleAt(pos.y);
  const prev = useRef({ px, py, spin: 0 });
  const spin = useMemo(() => {
    const p = prev.current;
    const dist = Math.hypot(px - p.px, py - p.py);
    const delta = dist > 0.015 ? dist * 180 : animTick * 2.5;
    const next = p.spin + delta;
    prev.current = { px, py, spin: next };
    return next;
  }, [px, py, animTick]);

  const inAir = ["pass", "through", "safe", "contest"].includes(phase);
  const shooting = phase === "shot";
  // liftPct มาจาก arc ของ pass profile จริง (ผ่าน airHeight) — โด่งกลางทาง แตะพื้นตอนต้น/ปลาย
  const liftPct = Math.max(0, Math.min(1, airHeight / 4.5));
  const baseFootY = shooting ? footDrop * 0.05 : inAir ? -footDrop * 0.22 : footDrop;
  const footY = contactAnchor ? 0 : baseFootY - liftPct * footDrop * 1.6;

  return (
    <>
      {inAir && (
        <div style={{
          position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`,
          width: `${ballW * (1 - liftPct * 0.3)}%`,
          transform: `translate(-50%, calc(-50% + ${footDrop}%))`,
          aspectRatio: "2.2 / 1", borderRadius: "50%",
          background: "rgba(0,0,0,0.42)", filter: "blur(1.2px)",
          opacity: 0.55 - liftPct * 0.28,
          zIndex: 54, pointerEvents: "none",
        }} />
      )}
      <div style={{
        position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`,
        width: `${ballW}%`,
        transform: `translate(-50%, calc(-50% + ${footY}%))`,
        aspectRatio: "1", zIndex: 55, pointerEvents: "none",
        // ตำแหน่งอัปเดตจาก simulation ทุกเฟรม (60fps) อยู่แล้ว — ห้ามใส่ CSS transition ที่นี่
        // เดิมมี transition หน่วง ~0.22s ตอนบอลลอย พอ phase เปลี่ยนเป็นเลี้ยงแล้วถอด transition ทันที
        // สไปรต์เลย "กระโดด" ปิดระยะที่ยังค้างอยู่ในพริบตา = วาปทุกครั้งที่จบการส่ง (เงาไม่มี transition เลยไม่เคยวาป)
        willChange: "left, top, transform",
        filter: shooting
          ? "drop-shadow(0 0 6px rgba(255,255,255,.85)) drop-shadow(0 2px 4px rgba(0,0,0,.45))"
          : "drop-shadow(0 2px 4px rgba(0,0,0,.55))",
      }}>
        <SoccerBallSvg uid={uid} spin={spin} shooting={shooting} />
      </div>
    </>
  );
}

/** สีสกอร์บอร์ด — ตรงธีมเกม (pitchDark / panel / steel) */
const SB = {
  header: "#0a1210",
  teamBar: "#1a2e24",
  teamEdge: "#2d4a3a",
  shield: "#e8ece9",
  digit: "#d45a3a",
  label: "#8fa396",
  hex: "#15261e",
  divider: "#3a5c48",
};


function ScoreShield({ score, flash }) {
  return (
    <div style={{
      background: SB.shield,
      borderRadius: "5px 5px 7px 7px",
      minWidth: "clamp(18px, 3.2vw, 30px)",
      padding: "0.08em 0.22em",
      boxShadow: "inset 0 -2px 0 rgba(0,0,0,.07), 0 2px 5px rgba(0,0,0,.4)",
      transform: flash ? "scale(1.1)" : "scale(1)",
      transition: "transform .15s",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{
        color: SB.digit, fontWeight: 900, lineHeight: 1,
        fontSize: "clamp(13px, 2.1vw, 22px)",
        fontFamily: "Arial Black, Arial, sans-serif",
      }}>
        {score}
      </span>
    </div>
  );
}

function V0Scoreboard({ homeTeam, awayTeam, homeGoals, awayGoals, clockStr, homeFlash, awayFlash }) {
  const home = homeTeam.short || homeTeam.name;
  const away = awayTeam.short || awayTeam.name;
  const homeAccent = homeTeam.color || homeTeam.primaryColor || "#4caf6a";
  const awayAccent = awayTeam.color || awayTeam.primaryColor || "#5a9bd5";

  return (
    <div style={{
      position: "absolute", top: "1.5%", left: "50%", transform: "translateX(-50%) scale(0.92)",
      transformOrigin: "top center",
      width: "min(92%, 640px)", zIndex: 10,
    }}>
      {/* แท็บกลาง — เวลาแมตช์ */}
      <div style={{
        margin: "0 auto", width: "fit-content", maxWidth: "100%",
        background: SB.header, color: SB.label,
        padding: "2px 12px", borderRadius: "5px 5px 0 0",
        fontSize: "clamp(7px, 1.05vw, 10px)", fontWeight: 700,
        letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center",
        border: `1px solid ${SB.teamEdge}`, borderBottom: "none",
      }}>
        {clockStr}
      </div>

      <div style={{
        display: "flex", alignItems: "center",
        filter: "drop-shadow(0 5px 12px rgba(0,0,0,.5))",
      }}>
        <HexTeamBadge key={`home-${homeTeam?.id}`} team={homeTeam} hexFill={SB.hex} hexStroke={SB.teamEdge} />

        {/* ทีมเจ้าบ้าน */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          background: SB.teamBar, color: "#e8ece9",
          padding: "0.28em 0.5em",
          minHeight: "clamp(26px, 4.2vw, 34px)",
          borderTop: `2px solid ${homeAccent}`,
          borderBottom: `1px solid ${SB.teamEdge}`,
          borderLeft: `1px solid ${SB.teamEdge}`,
          fontWeight: 800, fontSize: "clamp(9px, 1.45vw, 14px)",
          letterSpacing: "0.04em", textTransform: "uppercase",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {home}
        </div>

        {/* สกอร์กลาง */}
        <div style={{
          flex: "0 0 auto", display: "flex", alignItems: "center", gap: "0.35em",
          background: SB.header, padding: "0.22em 0.4em",
          borderTop: `1px solid ${SB.teamEdge}`,
          borderBottom: `1px solid ${SB.teamEdge}`,
        }}>
          <ScoreShield score={homeGoals} flash={homeFlash} />
          <div style={{
            width: 3, alignSelf: "stretch", minHeight: 20,
            background: SB.divider, borderRadius: 1, opacity: 0.8,
          }} />
          <ScoreShield score={awayGoals} flash={awayFlash} />
        </div>

        {/* ทีมเยือน */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          background: SB.teamBar, color: "#e8ece9",
          padding: "0.28em 0.5em",
          minHeight: "clamp(26px, 4.2vw, 34px)",
          borderTop: `2px solid ${awayAccent}`,
          borderBottom: `1px solid ${SB.teamEdge}`,
          borderRight: `1px solid ${SB.teamEdge}`,
          fontWeight: 800, fontSize: "clamp(9px, 1.45vw, 14px)",
          letterSpacing: "0.04em", textTransform: "uppercase",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {away}
        </div>

        <HexTeamBadge key={`away-${awayTeam?.id}`} team={awayTeam} hexFill={SB.hex} hexStroke={SB.teamEdge} />
      </div>
    </div>
  );
}

function ShotBanner({ highlightSeq }) {
  if (!highlightSeq || highlightSeq.stage === "celebrate") return null;
  const holdLabel = highlightSeq.shotResult === "save" ? "🧤 เซฟไว้ได้!" : "📐 ยิงหลุดกรอบ!";
  const labels = { buildup: "⚡ บุก!", shot: "🎯 ยิง!", hold: holdLabel };
  const label = labels[highlightSeq.stage] || "จังหวะอันตราย!";
  return (
    <div style={{
      position: "absolute", bottom: "8%", left: "50%", transform: "translateX(-50%)",
      zIndex: 11, padding: "8px 20px", borderRadius: 8,
      background: "rgba(0,0,0,.78)", border: "2px solid rgba(255,213,79,.7)",
      boxShadow: "0 4px 20px rgba(0,0,0,.5)",
      fontSize: "clamp(13px, 2.2vw, 18px)", fontWeight: 800, color: "#ffd54f",
      letterSpacing: 0.5,
    }}>
      {highlightSeq.stage === "shot" ? label : `${label}`}
    </div>
  );
}

function PassPlayOverlay({ ballSim }) {
  const phase = ballSim?.phase;
  const show = phase === "windup" || ["pass", "through", "safe"].includes(phase);
  if (!show || ballSim?.toPx == null) return null;

  const from = pitchToWide(ballSim.px ?? 50, ballSim.py ?? 50);
  const to = pitchToWide(ballSim.toPx, ballSim.toPy);
  const windup = phase === "windup";
  const labels = {
    short: "สั้น", medium: "กลาง", long: "ยาว", switch: "สลับ", safe: "ชิลด์", through: "ทะลุ", cross: "เปิด",
  };
  const stageLabels = {
    def_out: "หลัง→กลาง",
    mid_control: "กลาง",
    mid_wide: "ออกปีก",
    wide_play: "ปีก",
    recycle: "ปีก→กลาง",
    final: "กลาง→หน้า",
  };
  const tag = stageLabels[ballSim.buildStage] || labels[ballSim.passType] || "จ่าย";

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{
      position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 4, pointerEvents: "none",
    }}>
      <line
        x1={from.x} y1={from.y} x2={to.x} y2={to.y}
        stroke={windup ? "rgba(255,229,102,0.7)" : "rgba(168,230,255,0.75)"}
        strokeWidth={windup ? "0.22" : "0.28"}
        strokeDasharray={windup ? "1.4 1" : "none"}
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={to.x} cy={to.y} r="0.9" fill="none"
        stroke="rgba(168,230,255,0.85)" strokeWidth="0.18" vectorEffect="non-scaling-stroke" />
      {windup && (
        <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 1.2}
          textAnchor="middle" fontSize="2.2" fill="rgba(255,240,180,0.9)" fontWeight="700"
          fontFamily="Arial,sans-serif">{tag}</text>
      )}
    </svg>
  );
}

function formatMatchClock(half, clock, halfSeconds = 180) {
  const s = Math.floor((half === 1 ? 0 : 45) * 60 + (clock / halfSeconds) * 45 * 60);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const TRACKER = { bg: "#070b12", score: "#f5d000", timer: "#e5223b" };

/** เส้นปะวิถียิง — โค้ง quadratic สูตรเดียวกับที่บอลบินจริง (tickPassFlight) ให้เส้นกับบอลทับกันพอดี */
function ShotPathLine({ shotPath }) {
  if (!shotPath) return null;
  const dx = shotPath.toPx - shotPath.fromPx;
  const dy = shotPath.toPy - shotPath.fromPy;
  const len = Math.hypot(dx, dy) || 1;
  const bend = (shotPath.arc ?? 1.2) * 0.32 * (shotPath.curveSign ?? 1);
  const midPx = (shotPath.fromPx + shotPath.toPx) / 2 + (-dy / len) * bend + (shotPath.fwdSign ?? 1) * 0.5;
  const midPy = (shotPath.fromPy + shotPath.toPy) / 2 + (dx / len) * bend;
  const a = pitchToWide(shotPath.fromPx, shotPath.fromPy);
  const c = pitchToWide(midPx, midPy);
  const z = pitchToWide(shotPath.toPx, shotPath.toPy);
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 9, pointerEvents: "none" }}>
      <path d={`M ${a.x} ${a.y} Q ${c.x} ${c.y} ${z.x} ${z.y}`} fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="0.45" strokeDasharray="1.6 1.4" />
    </svg>
  );
}

/** โซนสีทีมจาง ๆ + เลข % ครองบอลลางบนพื้นสนามแต่ละฝั่ง (เห็นแล้วรู้ทันทีไม่ต้องมองแถบสถิติด้านล่าง) */
function PossessionGroundOverlay({ possHomePct, homeColor, awayColor }) {
  const possAwayPct = 100 - possHomePct;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: "30%", bottom: "30%", width: "50%", background: `linear-gradient(90deg, ${homeColor}22, transparent)` }} />
      <div style={{ position: "absolute", right: 0, top: "30%", bottom: "30%", width: "50%", background: `linear-gradient(270deg, ${awayColor}22, transparent)` }} />
      <div style={{
        position: "absolute", left: "25%", top: "50%", transform: "translate(-50%, -50%)",
        fontFamily: "ui-monospace, monospace", fontWeight: 900, fontSize: "clamp(16px, 4vw, 32px)",
        color: "rgba(255,255,255,.13)", letterSpacing: 1, userSelect: "none", whiteSpace: "nowrap",
      }}>{possHomePct}%</div>
      <div style={{
        position: "absolute", right: "25%", top: "50%", transform: "translate(50%, -50%)",
        fontFamily: "ui-monospace, monospace", fontWeight: 900, fontSize: "clamp(16px, 4vw, 32px)",
        color: "rgba(255,255,255,.13)", letterSpacing: 1, userSelect: "none", whiteSpace: "nowrap",
      }}>{possAwayPct}%</div>
    </div>
  );
}

export function TrackerMatchView({
  homeTeam, awayTeam, homeGoals, awayGoals, half, clock, halfSeconds = 180,
  ballSim, possHomePct = 50, sponsorLabel, animTick = 0, goalFlash, highlightSeq, players, shotPath = null,
}) {
  const uid = useId().replace(/:/g, "");
  const label = sponsorLabel || "The Master FC";

  const targetPx = ballSim?.px ?? 50;
  const targetPy = ballSim?.py ?? 50;
  const phase = ballSim?.phase ?? "dribble";
  const isPass = ["pass", "through", "safe", "contest", "shot"].includes(phase);
  const isWindup = phase === "windup";
  const isDribble = phase === "dribble";
  const ballSmoothRef = useRef({ px: targetPx, py: targetPy, phase });
  const prevPhaseRef = useRef(phase);

  if (prevPhaseRef.current !== phase) {
    ballSmoothRef.current.px = targetPx;
    ballSmoothRef.current.py = targetPy;
    prevPhaseRef.current = phase;
  }

  const jump = Math.hypot(targetPx - ballSmoothRef.current.px, targetPy - ballSmoothRef.current.py);
  if (jump > 6) {
    ballSmoothRef.current.px = targetPx;
    ballSmoothRef.current.py = targetPy;
  } else if (!isPass && !isDribble && !isWindup) {
    ballSmoothRef.current.px += (targetPx - ballSmoothRef.current.px) * 0.35;
    ballSmoothRef.current.py += (targetPy - ballSmoothRef.current.py) * 0.35;
  }

  const ballPx = isPass || isDribble || isWindup ? targetPx : ballSmoothRef.current.px;
  const ballPy = isPass || isDribble || isWindup ? targetPy : ballSmoothRef.current.py;

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 28px rgba(0,0,0,.5)" }}>
      <style>{`@keyframes v0Ad { to { transform: translateX(var(--u)); } }`}</style>
      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: TRACKER.bg }}>
        <V0PitchSVG
          uid={uid}
          ballPx={ballPx}
          ballPy={ballPy}
          sponsorLabel={label}
          highlightSeq={highlightSeq}
        />
        <PossessionGroundOverlay possHomePct={possHomePct} homeColor={homeTeam?.shirtColor || homeTeam?.color || "#3dba6a"} awayColor={awayTeam?.shirtColor || awayTeam?.color || "#3a6ec4"} />
        <PassPlayOverlay ballSim={ballSim} />
        <ShotPathLine shotPath={shotPath} />
        <TrackerPlayerDots players={players} />
        <TrackerBall px={ballPx} py={ballPy} animTick={animTick} phase={ballSim?.phase} airHeight={ballSim?.airHeight ?? 0} />
        <V0Scoreboard
          homeTeam={homeTeam} awayTeam={awayTeam}
          homeGoals={homeGoals} awayGoals={awayGoals}
          clockStr={formatMatchClock(half, clock, halfSeconds)}
          homeFlash={goalFlash?.team === "home"} awayFlash={goalFlash?.team === "away"}
        />
        <ShotBanner highlightSeq={highlightSeq} />
      </div>
    </div>
  );
}

/** ตัวนักเตะ animated — ใช้เฉพาะ TrackerAnimDemo (ไม่แตะ live match) */
function AnimDemoPlayerFigure({
  x, y, shirtColor, shortsColor, gkColor, num, isGK = false, isCarrier, isPasser, isReceiver, isVictim, facing, name,
  running = false, actionKind = null, animTick = 0,
}) {
  const shirt = isGK ? (gkColor || "#f0e040") : shirtColor;
  const shorts = isGK ? "#1e1e1e" : (shortsColor || "#1a1a1a");
  const { playerH: h, playerW: w } = trackerScaleAt(y);
  const z = 8 + Math.round(y * 0.4);
  const flip = facing < 0 ? "scaleX(-1)" : "none";
  const lum = 0.299 * parseInt(shirt.slice(1, 3), 16) + 0.587 * parseInt(shirt.slice(3, 5), 16) + 0.114 * parseInt(shirt.slice(5, 7), 16);
  const numCol = lum > 145 ? "#1a1a1a" : "#fff";

  return (
    <div style={{
      position: "absolute", left: `${x}%`, top: `${y}%`,
      transform: "translate(-50%, -50%)",
      width: `${w}%`, height: `${h}%`, zIndex: z, pointerEvents: "none",
    }}>
      {name && (
        <div style={{
          position: "absolute", left: "50%", top: "-42%", transform: "translateX(-50%)",
          fontSize: "clamp(6.5px, 0.8vw, 9.5px)", fontWeight: 700, color: "#fff",
          background: "rgba(0,0,0,0.55)", borderRadius: 3, padding: "0 3px",
          whiteSpace: "nowrap",
        }}>{name}</div>
      )}
      <div style={{ position: "relative", width: "100%", height: "100%", transform: flip }}>
        <div style={{
          position: "absolute", left: "10%", right: "10%", bottom: "-8%", height: "22%",
          background: "rgba(0,0,0,0.35)", borderRadius: "50%", filter: "blur(1px)",
        }} />
        {isCarrier && (
          <div style={{
            position: "absolute", inset: "-14% -10%", borderRadius: "4px",
            border: "2px solid rgba(255,255,255,0.8)",
          }} />
        )}
        {isPasser && !isCarrier && (
          <div style={{
            position: "absolute", inset: "-12% -8%", borderRadius: "4px",
            border: "2px solid rgba(255,229,102,0.95)",
          }} />
        )}
        {isReceiver && !isCarrier && (
          <div style={{
            position: "absolute", inset: "-12% -8%", borderRadius: "4px",
            border: "2px solid rgba(100,220,255,0.95)",
            boxShadow: "0 0 6px rgba(100,220,255,.4)",
          }} />
        )}
        {isVictim && (
          <div style={{
            position: "absolute", inset: "-12% -8%", borderRadius: "4px",
            border: "2px solid rgba(255,80,80,0.95)",
            boxShadow: "0 0 8px rgba(255,60,60,.45)",
          }} />
        )}
        <svg viewBox="0 0 20 28" width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
          <AnimatedPlayerBody
            shirt={shirt}
            shorts={shorts}
            numCol={numCol}
            num={num}
            isGK={isGK}
            running={running}
            actionKind={actionKind}
            animTick={animTick}
          />
        </svg>
      </div>
    </div>
  );
}

const PASS_CHAIN_SQUAD = [
  { num: 6, name: "#6", px: 28, py: 54 },
  { num: 8, name: "#8", px: 44, py: 50 },
  { num: 10, name: "#10", px: 58, py: 54 },
  { num: 9, name: "#9", px: 72, py: 51 },
];
const PASS_CHAIN_SEQ = [
  { type: "pass", from: 0, to: 1 },
  { type: "pass", from: 1, to: 2 },
  { type: "pass", from: 2, to: 3 },
  { type: "through", from: 2, to: 3 },
  { type: "onetwo", giver: 2, partner: 1 },
  { type: "pass", from: 3, to: 2 },
  { type: "pass", from: 2, to: 0 },
];
const PASS_CHAIN_SEG = 56;
const OPP_SHIRT = "#c44a4a";
const OPP_SHORTS = "#2a2a2a";
const TEAM_SHIRT = "#3dba6a";
const TEAM_SHORTS = "#f2f0e6";

function arcBall(from, to, u, lift = 2.4) {
  const ease = u * u * (3 - 2 * u);
  return {
    ballPx: from.ballPx + (to.ballPx - from.ballPx) * ease,
    ballPy: from.ballPy + (to.ballPy - from.ballPy) * ease,
    airH: Math.sin(u * Math.PI) * lift,
  };
}

function duelFoot(pl, facing = 1) {
  return { ballPx: pl.px + (facing < 0 ? -2.8 : 2.5), ballPy: pl.py + 0.22 };
}

function duelMix(a, b, u) {
  return {
    ballPx: a.ballPx + (b.ballPx - a.ballPx) * u,
    ballPy: a.ballPy + (b.ballPy - a.ballPy) * u,
  };
}

function curveBall(from, to, u, lift, curveSign = 1, curveAmt = 4) {
  const b = arcBall(from, to, u, lift);
  const dx = to.ballPx - from.ballPx;
  const dy = to.ballPy - from.ballPy;
  const len = Math.hypot(dx, dy) || 1;
  const bend = Math.sin(u * Math.PI) * curveAmt * curveSign;
  b.ballPx += (-dy / len) * bend;
  b.ballPy += (dx / len) * bend;
  return b;
}

/** โค้งเข้าเสา — ยิงออกนอกแล้วโค้งเข้ามุมสามเหลี่ยม */
function curlToPost(from, to, u, lift, curveSign = 1, curveAmt = 9) {
  const b = arcBall(from, to, u, lift);
  const dx = to.ballPx - from.ballPx;
  const dy = to.ballPy - from.ballPy;
  const len = Math.hypot(dx, dy) || 1;
  const bend = (u * u) * curveAmt * curveSign;
  b.ballPx += (-dy / len) * bend;
  b.ballPy += (dx / len) * bend;
  return b;
}

/** เปิดบอลโค้งจากริมเส้นเข้ากรอบ */
function crossBall(from, to, u, lift = 5.2, curveSign = 1) {
  return curlToPost(from, to, u, lift, curveSign, 11);
}

const TOUCHLINE_PY = 7;
const GOAL_TOP_POST = { px: 99.2, py: 39.5 };
const GOAL_BOT_POST = { px: 99.2, py: 60.5 };
const GOAL_FAR_POST = GOAL_TOP_POST;
const GOAL_NEAR_CENTER = { px: 97, py: 51 };
const PBOX_TOP_CORNER = { px: 86, py: 24 };
const PBOX_BOT_CORNER = { px: 86, py: 76 };
const CROSS_TARGET = { ballPx: 90, ballPy: 48 };

function skillShotAtFoot(px, py, action, ap) {
  const stage = ap?.stage ?? "windup";
  const p = stage === "windup" ? (ap?.w ?? 0) : stage === "contact" ? (ap?.contact ?? 0) : 1;
  const pt = kickFootSvgPoint(action, { kind: action, stage, w: ap?.w ?? 0, contact: ap?.contact ?? 0, follow: ap?.follow ?? 0 });
  return footToPitch(px, py, pt);
}

function skillShotFlight(ap, px, py, action, goal, smooth, opts = {}) {
  const hitAt = 0.36;
  const from = skillShotAtFoot(px, py, action, { kind: action, stage: "windup", w: 1 });
  const to = { ballPx: goal.px, ballPy: goal.py };

  if (!ap || ap.stage === "windup") {
    const w = ap?.w ?? 0;
    const f = skillShotAtFoot(px, py, action, { kind: action, stage: "windup", w: Math.max(w, 0.04) });
    return {
      ballPx: f.ballPx, ballPy: f.ballPy, ballPhase: w > 0.55 ? "shot" : "dribble",
      airH: 0, contactAnchor: w < 0.72,
    };
  }
  if (ap.stage === "contact" && ap.contact < hitAt) {
    const f = skillShotAtFoot(px, py, action, ap);
    return { ballPx: f.ballPx, ballPy: f.ballPy, ballPhase: "dribble", airH: 0, contactAnchor: true };
  }

  const flyU = ap.stage === "follow"
    ? 0.2 + (ap.follow || 0) * 0.8
    : smooth((ap.contact - hitAt) / (1 - hitAt));
  const lift = opts.lift ?? (KICK_BALL[action]?.lift ?? 2);
  const b = opts.curl
    ? curlToPost(from, to, flyU, lift, opts.curveSign ?? 1, opts.curveAmt ?? 9)
    : arcBall(from, to, flyU, lift * (opts.low ? 0.35 : 1));

  return {
    ballPx: b.ballPx, ballPy: b.ballPy, ballPhase: "shot",
    airH: b.airH, contactAnchor: false,
    shotPath: {
      fromPx: from.ballPx, fromPy: from.ballPy, toPx: to.ballPx, toPy: to.ballPy,
      arc: opts.curl ? 2.8 : lift * 0.4,
      curveSign: opts.curveSign ?? 0,
    },
  };
}

const SKILL_LIST = [
  { cat: "dribble", label: "เลี้ยงริมเส้น", action: "touchline-dribble", num: 7, name: "#7" },
  { cat: "dribble", label: "ริมเส้น→เปิด", action: "touchline-cross", num: 7, name: "#7" },
  { cat: "shot", label: "ยิงใกล้", action: "shot-near", num: 9, name: "#9", goal: { px: 97.5, py: 51 }, box: true, lift: 0.7 },
  { cat: "shot", label: "ยิงไกล", action: "shot-far", num: 10, name: "#10", goal: { px: 97, py: 50.5 }, box: false, lift: 3.2 },
  { cat: "shot", label: "ปั่นโค้งเข้าเสา", action: "shot-curve", num: 10, name: "#10", goal: GOAL_TOP_POST, curveSign: -1, curveAmt: 10, box: false, lift: 2.8, curl: true },
  { cat: "shot", label: "มุมกรอบบน→เสาล่าง", action: "shot-pbox-top", num: 10, name: "#10", shooter: PBOX_TOP_CORNER, goal: GOAL_BOT_POST, curveSign: 1, curveAmt: 13, box: true, lift: 2.5, curl: true, pboxCorner: "top" },
  { cat: "shot", label: "มุมกรอบล่าง→เสาบน", action: "shot-pbox-bottom", num: 10, name: "#10", shooter: PBOX_BOT_CORNER, goal: GOAL_TOP_POST, curveSign: -1, curveAmt: 13, box: true, lift: 2.5, curl: true, pboxCorner: "bottom" },
  { cat: "shot", label: "ยิงไกลนอกกรอบ", action: "shot-long-outside", num: 8, name: "#8", goal: { px: 97, py: 52 }, box: false, lift: 3.8 },
  { cat: "shot", label: "ชาร์จเข้าประตู", action: "shot-power", num: 9, name: "#9", goal: GOAL_NEAR_CENTER, box: true, lift: 0.4, low: true },
  { cat: "shot", label: "โหม่งเข้าประตู", action: "header-goal", num: 9, name: "#9", goal: { px: 97, py: 50 }, box: true },
];
const SKILL_SEG = 56;

/** Demo ทักษะเลี้ยง + ยิงแบบต่างๆ */
export function TrackerSkillDemo() {
  const [tick, setTick] = useState(0);
  const [skillIdx, setSkillIdx] = useState(0);
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 50);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setSkillIdx((i) => (i + 1) % SKILL_LIST.length), 3200);
    return () => clearInterval(id);
  }, []);

  const skill = SKILL_LIST[skillIdx];
  const ap = actionPose(skill.action, tick);
  const smooth = (u) => u * u * (3 - 2 * u);

  let px = 42;
  let py = 54;
  let ballPx = 50;
  let ballPy = 54;
  let ballPhase = "dribble";
  let airH = 0;
  let ballContactAnchor = false;
  let shotPath = null;

  const foot = (x, y, facing = 1) => ({ ballPx: x + (facing < 0 ? -2.8 : 2.5), ballPy: y + 0.22 });

  if (skill.action === "touchline-dribble") {
    py = TOUCHLINE_PY;
    if (ap?.stage === "run") { px = 22 + ap.p * 14; }
    else if (ap?.stage === "touch") { px = 36 + ap.p * 4; }
    else { px = 40 + ap.p * 18; }
    const f = foot(px, py);
    ballPx = f.ballPx; ballPy = f.ballPy; ballPhase = "dribble"; ballContactAnchor = true;
  } else if (skill.action === "touchline-cross") {
    py = TOUCHLINE_PY;
    if (ap?.stage === "run") {
      px = 52 + ap.p * 18;
      const f = foot(px, py);
      ballPx = f.ballPx; ballPy = f.ballPy; ballPhase = "dribble"; ballContactAnchor = true;
    } else if (ap?.stage === "cross") {
      px = 72;
      const from = foot(px, py);
      const u = smooth(ap.p);
      const b = crossBall(from, CROSS_TARGET, u, 5.5, 1);
      ballPx = b.ballPx; ballPy = b.ballPy; airH = b.airH; ballPhase = "pass";
      shotPath = {
        fromPx: from.ballPx, fromPy: from.ballPy,
        toPx: CROSS_TARGET.ballPx, toPy: CROSS_TARGET.ballPy,
        arc: 3.5, curveSign: 1,
      };
    } else {
      px = 72 + ap.p * 2;
      const u = smooth(ap.p);
      const b = crossBall(foot(72, py), CROSS_TARGET, 0.85 + u * 0.15, 4.5, 1);
      ballPx = b.ballPx; ballPy = b.ballPy; airH = b.airH; ballPhase = "pass";
    }
  } else if (skill.action === "header-goal") {
    px = 72; py = 52;
    const crossIn = { ballPx: px + 14, ballPy: py - 10 };
    const headPt = foot(px, py - 3);
    const goal = skill.goal;
    if (ap?.stage === "crouch") {
      const u = smooth(ap.p);
      const b = arcBall(crossIn, headPt, u * 0.85, 2.4);
      ballPx = b.ballPx; ballPy = b.ballPy; airH = b.airH; ballPhase = "pass";
    } else if (ap?.stage === "jump") {
      const hitAt = 0.48;
      if (ap.p < hitAt) {
        const u = smooth(ap.p / hitAt);
        const b = duelMix(crossIn, headPt, 0.55 + u * 0.45);
        ballPx = b.ballPx; ballPy = b.ballPy; airH = 1.6 * (1 - u * 0.5); ballPhase = "pass";
        ballContactAnchor = u > 0.88;
      } else {
        const u = smooth((ap.p - hitAt) / (1 - hitAt));
        const b = curveBall(headPt, { ballPx: goal.px, ballPy: goal.py }, u, 1.8, -1, 2);
        ballPx = b.ballPx; ballPy = b.ballPy; airH = b.airH; ballPhase = "shot";
        shotPath = { fromPx: headPt.ballPx, fromPy: headPt.ballPy, toPx: goal.px, toPy: goal.py, arc: 1.2, curveSign: -1 };
      }
    } else {
      const u = smooth(ap.p);
      ballPx = goal.px - 4 + u * 2; ballPy = goal.py; airH = 1.2; ballPhase = "shot";
    }
  } else if (KICK_ACTIONS.has(skill.action)) {
    if (skill.shooter) {
      px = skill.shooter.px;
      py = skill.shooter.py;
    } else {
      px = skill.box ? 80 : (skill.action === "shot-curve" ? 64 : skill.action === "shot-long-outside" ? 58 : 68);
      py = skill.action === "shot-curve" ? 58 : skill.action === "shot-long-outside" ? 62 : skill.action === "shot-near" ? 54 : 52;
    }
    const goal = skill.goal || GOAL_NEAR_CENTER;
    const fly = skillShotFlight(ap, px, py, skill.action, goal, smooth, {
      lift: skill.lift,
      low: skill.low,
      curl: skill.curl,
      curveSign: skill.curveSign,
      curveAmt: skill.curveAmt,
    });
    ballPx = fly.ballPx; ballPy = fly.ballPy; ballPhase = fly.ballPhase;
    airH = fly.airH; ballContactAnchor = fly.contactAnchor;
    if (fly.shotPath) shotPath = fly.shotPath;
    else if (ap?.stage === "windup" || ap?.stage === "contact") {
      const f = skillShotAtFoot(px, py, skill.action, ap);
      shotPath = { fromPx: f.ballPx, fromPy: f.ballPy, toPx: goal.px, toPy: goal.py, arc: skill.curl ? 2.5 : 1.2, curveSign: skill.curveSign ?? 0 };
    }
  }

  const pos = pitchToWide(px, py);
  const catLabel = skill.cat === "dribble" ? "เลี้ยงบอล" : "ยิงบอล";

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 6px 20px rgba(0,0,0,.45)", marginBottom: 10 }}>
      <div style={{ padding: "6px 10px", background: "#0a1218", color: "#9ab", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>
        ⚡ ทักษะ {catLabel} — {skill.label} · {skillIdx + 1}/{SKILL_LIST.length}
      </div>
      <div style={{ display: "flex", gap: 4, padding: "5px 8px", background: "#0d1814", overflowX: "auto", flexWrap: "wrap" }}>
        {SKILL_LIST.map((s, i) => (
          <button
            key={s.action}
            type="button"
            onClick={() => setSkillIdx(i)}
            style={{
              flex: "0 0 auto", padding: "3px 7px", fontSize: 10, cursor: "pointer", whiteSpace: "nowrap",
              background: i === skillIdx ? (s.cat === "shot" ? "#3a2a1a" : "#1a3a28") : "#15261e",
              color: i === skillIdx ? "#fff" : "#8fa396",
              border: i === skillIdx ? "1px solid #6a8a72" : "1px solid #2a4034",
              borderRadius: 4,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: TRACKER.bg }}>
        <V0PitchSVG uid={`${uid}-skill`} ballPx={ballPx} ballPy={ballPy} sponsorLabel="Skills" />
        <ShotPathLine shotPath={shotPath} />
        {skill.pboxCorner && (() => {
          const c = pitchToWide(skill.shooter.px, skill.shooter.py);
          const g = pitchToWide(skill.goal.px, skill.goal.py);
          return (
            <>
              <div style={{
                position: "absolute", left: `${c.x}%`, top: `${c.y}%`,
                width: 8, height: 8, marginLeft: -4, marginTop: -4,
                borderRadius: "50%", background: "rgba(255,220,80,0.85)",
                boxShadow: "0 0 6px rgba(255,220,80,0.6)", pointerEvents: "none", zIndex: 7,
              }} title="มุมกรอบเขตโทษ" />
              <div style={{
                position: "absolute", left: `${g.x}%`, top: `${g.y}%`,
                width: 7, height: 7, marginLeft: -3.5, marginTop: -3.5,
                borderRadius: "50%", border: "2px solid rgba(255,255,255,0.7)",
                pointerEvents: "none", zIndex: 7,
              }} title="เสาเป้าหมาย" />
            </>
          );
        })()}
        {skill.cat === "shot" && skill.box === false && !skill.pboxCorner && (
          <div style={{
            position: "absolute", left: "84%", top: "36%", width: "3%", height: "28%",
            border: "1.5px dashed rgba(255,220,100,0.45)", borderRadius: 2, pointerEvents: "none",
          }} title="เสาสามเหลี่ยม" />
        )}
        {skill.action === "touchline-dribble" || skill.action === "touchline-cross" ? (
          <div style={{
            position: "absolute", left: 0, top: 0, width: "100%", height: "8%",
            borderBottom: "2px solid rgba(255,255,255,0.18)", pointerEvents: "none",
          }} title="ริมเส้น" />
        ) : null}
        <AnimDemoPlayerFigure
          x={pos.x}
          y={pos.y}
          shirtColor={TEAM_SHIRT}
          shortsColor={TEAM_SHORTS}
          num={skill.num}
          name={skill.name}
          isCarrier={skill.cat === "dribble" || (ap?.stage === "windup" && KICK_ACTIONS.has(skill.action))}
          isPasser={KICK_ACTIONS.has(skill.action) || skill.action === "touchline-cross"}
          facing={1}
          running={skill.cat === "dribble" && ap?.stage === "run"}
          actionKind={skill.action === "header-goal" ? "header-goal" : skill.action}
          animTick={tick}
        />
        <TrackerBall px={ballPx} py={ballPy} animTick={tick} phase={ballPhase} airHeight={airH} contactAnchor={ballContactAnchor} />
      </div>
    </div>
  );
}

const DUEL_SEG = 80;
export function TrackerPassChainDemo() {
  const [tick, setTick] = useState(0);
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 50);
    return () => clearInterval(id);
  }, []);

  const segIdx = Math.floor(tick / PASS_CHAIN_SEG) % PASS_CHAIN_SEQ.length;
  const t = (tick % PASS_CHAIN_SEG) / PASS_CHAIN_SEG;
  const seg = PASS_CHAIN_SEQ[segIdx];
  const foot = (pl) => ({ ballPx: pl.px + 2.5, ballPy: pl.py + 0.25 });

  const squad = PASS_CHAIN_SQUAD.map((p) => ({ ...p }));
  let ballPx = 50;
  let ballPy = 54;
  let ballPhase = "dribble";
  let airH = 0;
  let label = "";

  if (seg.type === "onetwo") {
    const giver = squad[seg.giver];
    const partner = squad[seg.partner];
    label = `${giver.name} ↔ ${partner.name} (One-two)`;
    const giverRunPx = giver.px + 10;
    if (t < 0.28) {
      const u = t / 0.28;
      const b = arcBall(foot(giver), foot(partner), u, 1.6);
      ballPx = b.ballPx; ballPy = b.ballPy; airH = b.airH; ballPhase = "pass";
    } else if (t < 0.55) {
      giver.px += (giverRunPx - giver.px) * ((t - 0.28) / 0.27);
      ballPx = foot(partner).ballPx; ballPy = foot(partner).ballPy; ballPhase = "dribble";
    } else {
      const u = (t - 0.55) / 0.45;
      const target = { ballPx: giver.px + 2.5, ballPy: giver.py + 0.25 };
      const b = arcBall(foot(partner), target, u, 1.8);
      ballPx = b.ballPx; ballPy = b.ballPy; airH = b.airH; ballPhase = "pass";
    }
  } else {
    const passer = squad[seg.from];
    const receiver = squad[seg.to];
    label = `${passer.name} → ${receiver.name}${seg.type === "through" ? " (ทะลุแนว)" : ""}`;
    if (t < 0.2) {
      ballPx = foot(passer).ballPx; ballPy = foot(passer).ballPy;
    } else if (t < 0.78) {
      const b = arcBall(foot(passer), foot(receiver), (t - 0.2) / 0.58, seg.type === "through" ? 1.4 : 2.4);
      ballPx = b.ballPx; ballPy = b.ballPy; airH = b.airH;
      ballPhase = seg.type === "through" ? "through" : "pass";
    } else {
      ballPx = foot(receiver).ballPx; ballPy = foot(receiver).ballPy;
    }
  }

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 6px 20px rgba(0,0,0,.45)", marginBottom: 10 }}>
      <div style={{ padding: "6px 10px", background: "#0a1210", color: "#9ab", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>
        ⚽ ส่งบอลทีมเดียวกัน — {label} · {segIdx + 1}/{PASS_CHAIN_SEQ.length}
      </div>
      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: TRACKER.bg }}>
        <V0PitchSVG uid={`${uid}-chain`} ballPx={ballPx} ballPy={ballPy} sponsorLabel="Pass Chain" />
        {squad.map((pl, i) => {
          const pos = pitchToWide(pl.px, pl.py);
          let action = null;
          let isPasser = false;
          let isReceiver = false;
          let isCarrier = false;
          if (seg.type === "onetwo") {
            if (i === seg.giver && t < 0.3) { action = "pass"; isPasser = true; isCarrier = t < 0.12; }
            else if (i === seg.partner && t > 0.52 && t < 0.88) { action = "pass"; isPasser = true; isCarrier = t < 0.62; }
            else if (i === seg.partner && t >= 0.28 && t < 0.55) isCarrier = true;
            else if (i === seg.giver && t > 0.82) { action = "receive"; isReceiver = true; isCarrier = true; }
            else if (i === seg.giver && t >= 0.55 && t < 0.82) { action = null; isReceiver = false; }
          } else {
            isPasser = i === seg.from && t < 0.32;
            isReceiver = i === seg.to && t > 0.62;
            isCarrier = (i === seg.from && t < 0.18) || (i === seg.to && t > 0.82);
            if (isPasser) action = seg.type === "through" ? "through" : "pass";
            else if (isReceiver) action = "receive";
          }
          return (
            <AnimDemoPlayerFigure
              key={pl.num}
              x={pos.x}
              y={pos.y}
              shirtColor={TEAM_SHIRT}
              shortsColor={TEAM_SHORTS}
              num={pl.num}
              name={pl.name}
              isCarrier={isCarrier}
              isPasser={isPasser}
              isReceiver={isReceiver}
              facing={1}
              actionKind={action}
              animTick={tick}
            />
          );
        })}
        <TrackerBall px={ballPx} py={ballPy} animTick={tick} phase={ballPhase} airHeight={airH} />
      </div>
    </div>
  );
}

/** Demo สกัด/ดวลกับฝ่ายตรงข้าม */
export function TrackerDuelDemo() {
  const [tick, setTick] = useState(0);
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 50);
    return () => clearInterval(id);
  }, []);

  const scenarios = ["tackle", "intercept", "slide-behind", "slide-front"];
  const scenIdx = Math.floor(tick / DUEL_SEG) % scenarios.length;
  const t = (tick % DUEL_SEG) / DUEL_SEG;
  const scen = scenarios[scenIdx];
  const smooth = (u) => u * u * (3 - 2 * u);

  let ballPx = 50;
  let ballPy = 54;
  let ballPhase = "dribble";
  let airH = 0;
  let label = "";
  const players = [];

  if (scen === "tackle") {
    label = "แย่งจากเท้า — #4 สกัดบอลจาก #11";
    const attPx = t < 0.50 ? 58 - t * 10 : 53 - (t - 0.50) * 6;
    const att = { num: 11, name: "#11", px: attPx, py: 54, shirt: OPP_SHIRT, shorts: OPP_SHORTS };
    const defPx = t < 0.36 ? 30 : t < 0.54 ? 30 + smooth((t - 0.36) / 0.18) * 16 : 46;
    const def = { num: 4, name: "#4", px: defPx, py: 54, shirt: TEAM_SHIRT, shorts: TEAM_SHORTS };
    const attF = duelFoot(att, -1);
    const defF = duelFoot(def, 1);

    if (t < 0.50) {
      ballPx = attF.ballPx; ballPy = attF.ballPy;
      ballPhase = t > 0.36 ? "contest" : "dribble";
    } else if (t < 0.62) {
      const u = smooth((t - 0.50) / 0.12);
      const b = duelMix(attF, defF, u);
      ballPx = b.ballPx; ballPy = b.ballPy; ballPhase = "contest";
    } else {
      ballPx = defF.ballPx; ballPy = defF.ballPy; ballPhase = "dribble";
    }

    players.push(
      {
        ...def,
        action: t >= 0.34 && t < 0.58 ? "tackle" : null,
        isCarrier: t >= 0.58,
        facing: 1,
        running: t >= 0.28 && t < 0.38,
      },
      {
        ...att,
        action: t >= 0.58 ? "stumble" : "dribble",
        isVictim: t >= 0.52,
        isCarrier: t < 0.54,
        facing: -1,
        running: t < 0.42,
      },
    );
  } else if (scen === "intercept") {
    label = "ตัดบอลกลางทาง — #6 แทรก pass #8 → #14";
    const passer = { num: 8, name: "#8", px: 64, py: 51, shirt: OPP_SHIRT, shorts: OPP_SHORTS };
    const target = { num: 14, name: "#14", px: 80, py: 52.5, shirt: OPP_SHIRT, shorts: OPP_SHORTS };
    const from = duelFoot(passer, -1);
    const to = duelFoot(target, -1);
    const PASS_LIFT = 2.2;
    const INTERCEPT_U = 0.44;
    const interceptPt = arcBall(from, to, INTERCEPT_U, PASS_LIFT);

    let cutPx = 38;
    let cutPy = 53;
    if (t < 0.06) {
      cutPx = 38; cutPy = 53;
    } else if (t < 0.50) {
      const u = smooth((t - 0.06) / 0.44);
      cutPx = 38 + u * (interceptPt.ballPx - 3.2 - 38);
      cutPy = 53 + u * (interceptPt.ballPy - 0.5 - 53);
    } else if (t < 0.68) {
      cutPx = interceptPt.ballPx - 3.2;
      cutPy = interceptPt.ballPy - 0.5;
    } else {
      const u = smooth((t - 0.68) / 0.32);
      cutPx = interceptPt.ballPx - 3.2 + u * 5;
      cutPy = interceptPt.ballPy - 0.5;
    }
    const cut = { num: 6, name: "#6", px: cutPx, py: cutPy, shirt: TEAM_SHIRT, shorts: TEAM_SHORTS };
    const cutF = duelFoot(cut, 1);

    if (t < 0.10) {
      ballPx = from.ballPx; ballPy = from.ballPy; ballPhase = "dribble";
    } else if (t < 0.50) {
      const u = smooth((t - 0.10) / 0.40) * INTERCEPT_U;
      const b = arcBall(from, to, u, PASS_LIFT);
      ballPx = b.ballPx; ballPy = b.ballPy; airH = b.airH; ballPhase = "pass";
    } else if (t < 0.64) {
      const u = smooth((t - 0.50) / 0.14);
      const b = duelMix(interceptPt, cutF, u);
      ballPx = b.ballPx; ballPy = b.ballPy;
      airH = interceptPt.airH * (1 - u);
      ballPhase = u > 0.5 ? "dribble" : "pass";
    } else {
      ballPx = cutF.ballPx; ballPy = cutF.ballPy; ballPhase = "dribble"; airH = 0;
    }

    if (t < 0.50) target.px = 80 + smooth(t / 0.50) * 2;
    else if (t < 0.62) target.px = 82;
    else target.px = 82 - smooth((t - 0.62) / 0.18) * 2;

    players.push(
      {
        ...cut,
        action: t >= 0.08 && t < 0.38 ? "jockey" : t >= 0.38 && t < 0.66 ? "intercept" : null,
        isCarrier: t >= 0.60,
        facing: 1,
        running: t >= 0.06 && t < 0.52,
      },
      {
        ...passer,
        action: t >= 0.08 && t < 0.28 ? "pass" : null,
        isPasser: t >= 0.08 && t < 0.28,
        isCarrier: t < 0.10,
        facing: -1,
      },
      {
        ...target,
        action: t >= 0.36 && t < 0.56 ? "receive" : t >= 0.56 && t < 0.78 ? "stumble" : null,
        isReceiver: t >= 0.36 && t < 0.52,
        isVictim: t >= 0.50 && t < 0.82,
        facing: -1,
        running: t >= 0.10 && t < 0.52,
      },
    );
  } else if (scen === "slide-behind") {
    label = "สไลด์จากด้านหลัง — #4 ไล่จากหลังปัดบอล";
    const attPx = t < 0.56 ? 60 - t * 11 : 53.8 - (t - 0.56) * 3;
    const att = { num: 11, name: "#11", px: attPx, py: 54, shirt: OPP_SHIRT, shorts: OPP_SHORTS };

    let defPx;
    if (t < 0.18) defPx = 68 - t * 10;
    else if (t < 0.28) defPx = 66.2 - (t - 0.18) / 0.10 * 8;
    else if (t < 0.56) {
      const u = smooth((t - 0.28) / 0.28);
      defPx = 58.2 - u * 8;
    } else if (t < 0.74) defPx = 50.2 + smooth((t - 0.56) / 0.18) * 2.5;
    else defPx = 52.7 + (t - 0.74) * 2;
    const def = { num: 4, name: "#4", px: defPx, py: 54, shirt: TEAM_SHIRT, shorts: TEAM_SHORTS };

    const attF = duelFoot(att, -1);
    const defF = duelFoot(def, -1);
    const loose = { ballPx: attF.ballPx - 1.8, ballPy: attF.ballPy + 0.12 };

    if (t < 0.40) {
      ballPx = attF.ballPx; ballPy = attF.ballPy;
      ballPhase = t > 0.28 ? "contest" : "dribble";
    } else if (t < 0.47) {
      const u = smooth((t - 0.40) / 0.07);
      const b = duelMix(attF, loose, u);
      ballPx = b.ballPx; ballPy = b.ballPy; ballPhase = "contest";
    } else if (t < 0.58) {
      const u = smooth((t - 0.47) / 0.11);
      const b = duelMix(loose, defF, u);
      ballPx = b.ballPx; ballPy = b.ballPy;
      ballPhase = u > 0.5 ? "dribble" : "contest";
    } else {
      ballPx = defF.ballPx; ballPy = defF.ballPy; ballPhase = "dribble";
    }

    players.push(
      {
        ...def,
        action: t >= 0.28 && t < 0.74 ? "slide" : null,
        isCarrier: t >= 0.54,
        facing: -1,
        running: t >= 0.10 && t < 0.26,
      },
      {
        ...att,
        action: t >= 0.48 ? "stumble" : "dribble",
        isVictim: t >= 0.44,
        isCarrier: t < 0.42,
        facing: -1,
        running: t < 0.36,
      },
    );
  } else {
    label = "สไลด์จากด้านหน้า — #4 สไลด์ขวางหน้า #11";
    const attPx = t < 0.56 ? 54 - t * 14 : 46.2 - (t - 0.56) * 2;
    const att = { num: 11, name: "#11", px: attPx, py: 54, shirt: OPP_SHIRT, shorts: OPP_SHORTS };

    let defPx;
    if (t < 0.16) defPx = 26 + t * 8;
    else if (t < 0.26) defPx = 27.3 + (t - 0.16) / 0.10 * 5;
    else if (t < 0.54) {
      const u = smooth((t - 0.26) / 0.28);
      defPx = 32.3 + u * 12;
    } else if (t < 0.72) defPx = 44.3 + smooth((t - 0.54) / 0.18) * 3;
    else defPx = 47.3 + (t - 0.72) * 2;
    const def = { num: 4, name: "#4", px: defPx, py: 54, shirt: TEAM_SHIRT, shorts: TEAM_SHORTS };

    const attF = duelFoot(att, -1);
    const defF = duelFoot(def, 1);
    const loose = { ballPx: attF.ballPx + 1.6, ballPy: attF.ballPy + 0.1 };

    if (t < 0.38) {
      ballPx = attF.ballPx; ballPy = attF.ballPy;
      ballPhase = t > 0.26 ? "contest" : "dribble";
    } else if (t < 0.46) {
      const u = smooth((t - 0.38) / 0.08);
      const b = duelMix(attF, loose, u);
      ballPx = b.ballPx; ballPy = b.ballPy; ballPhase = "contest";
    } else if (t < 0.58) {
      const u = smooth((t - 0.46) / 0.12);
      const b = duelMix(loose, defF, u);
      ballPx = b.ballPx; ballPy = b.ballPy;
      ballPhase = u > 0.5 ? "dribble" : "contest";
    } else {
      ballPx = defF.ballPx; ballPy = defF.ballPy; ballPhase = "dribble";
    }

    players.push(
      {
        ...def,
        action: t >= 0.24 && t < 0.72 ? "slide" : null,
        isCarrier: t >= 0.52,
        facing: 1,
        running: t >= 0.08 && t < 0.22,
      },
      {
        ...att,
        action: t >= 0.46 ? "stumble" : "dribble",
        isVictim: t >= 0.42,
        isCarrier: t < 0.40,
        facing: -1,
        running: t < 0.34,
      },
    );
  }

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 6px 20px rgba(0,0,0,.45)", marginBottom: 10 }}>
      <div style={{ padding: "6px 10px", background: "#1a0a0a", color: "#eab", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>
        🛡️ ดวลฝ่ายตรงข้าม — {label} · {scenIdx + 1}/{scenarios.length}
        <span style={{ marginLeft: 8, color: "#7a8a9a" }}>เขียว=เรา · แดง=ฝ่ายตรงข้าม</span>
      </div>
      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: TRACKER.bg }}>
        <V0PitchSVG uid={`${uid}-duel`} ballPx={ballPx} ballPy={ballPy} sponsorLabel="Duel Demo" />
        {players.map((pl) => {
          const pos = pitchToWide(pl.px, pl.py);
          return (
            <AnimDemoPlayerFigure
              key={`${scen}-${pl.num}`}
              x={pos.x}
              y={pos.y}
              shirtColor={pl.shirt}
              shortsColor={pl.shorts}
              num={pl.num}
              name={pl.name}
              isCarrier={!!pl.isCarrier}
              isPasser={!!pl.isPasser}
              isReceiver={!!pl.isReceiver}
              isVictim={!!pl.isVictim}
              facing={pl.facing ?? 1}
              running={!!pl.running}
              actionKind={pl.action}
              animTick={tick}
            />
          );
        })}
        <TrackerBall px={ballPx} py={ballPy} animTick={tick} phase={ballPhase} airHeight={airH} />
      </div>
    </div>
  );
}

/** Demo อนิเมชันวิ่ง/เตะ — หน้าแยก /anim-demo.html */
export function TrackerAnimDemo() {
  const [tick, setTick] = useState(0);
  const [mode, setMode] = useState(0);
  const [autoCycle, setAutoCycle] = useState(true);
  const modes = [
    { label: "ยืน", running: false, action: null, isGK: false, num: 10, name: "#10", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "วิ่ง", running: true, action: null, isGK: false, num: 10, name: "#10", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "ส่งบอล", running: false, action: "pass", isGK: false, num: 10, name: "#10", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "ยิง", running: false, action: "shot", isGK: false, num: 10, name: "#10", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "รับบอล", running: false, action: "receive", isGK: false, num: 8, name: "#8", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "โยนข้าม", running: false, action: "cross", isGK: false, num: 7, name: "#7", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "Volley ยิง", running: false, action: "volley", isGK: false, num: 9, name: "#9", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "ส้นถ่วง", running: false, action: "backheel", isGK: false, num: 10, name: "#10", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "ฟรีคิก", running: false, action: "freekick", isGK: false, num: 10, name: "#10", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "จุดโทษ", running: false, action: "penalty", isGK: false, num: 10, name: "#10", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "โหม่ง", running: false, action: "header", isGK: false, num: 9, name: "#9", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "เลี้ยงหลบ", running: false, action: "dribble", isGK: false, num: 11, name: "#11", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "กั้นบอล", running: false, action: "shield", isGK: false, num: 6, name: "#6", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "ควบคุมอก", running: false, action: "chest", isGK: false, num: 5, name: "#5", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "สกัดยืน", running: false, action: "tackle", isGK: false, num: 4, name: "#4", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "บล็อกยิง", running: false, action: "block", isGK: false, num: 3, name: "#3", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "สไลด์สกัด", running: false, action: "slide", isGK: false, num: 4, name: "#4", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "GK เซฟ", running: false, action: "gk-save", isGK: true, num: 1, name: "GK", shirt: "#f0e040", shorts: "#1a1a1a" },
    { label: "GK ปัดมือ", running: false, action: "gk-punch", isGK: true, num: 1, name: "GK", shirt: "#f0e040", shorts: "#1a1a1a" },
    { label: "GK รับบอล", running: false, action: "gk-catch", isGK: true, num: 1, name: "GK", shirt: "#f0e040", shorts: "#1a1a1a" },
    { label: "GK เตะสั้น", running: false, action: "gk-kick-short", isGK: true, num: 1, name: "GK", shirt: "#f0e040", shorts: "#1a1a1a" },
    { label: "GK เตะไกล", running: false, action: "gk-kick-long", isGK: true, num: 1, name: "GK", shirt: "#f0e040", shorts: "#1a1a1a" },
    { label: "GK ทุ่มสั้น", running: false, action: "gk-throw-short", isGK: true, num: 1, name: "GK", shirt: "#f0e040", shorts: "#1a1a1a" },
    { label: "GK ทุ่มไกล", running: false, action: "gk-throw-long", isGK: true, num: 1, name: "GK", shirt: "#f0e040", shorts: "#1a1a1a" },
    { label: "ดีใจ (ฉลอง)", running: false, action: "celebrate", isGK: false, num: 10, name: "#10", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "ส่งยาว", running: false, action: "longball", isGK: false, num: 6, name: "#6", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "ทะลุแนว", running: false, action: "through", isGK: false, num: 10, name: "#10", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "Chip lob", running: false, action: "chip", isGK: false, num: 10, name: "#10", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "เตะมุม", running: false, action: "corner", isGK: false, num: 7, name: "#7", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "เคลียร์", running: false, action: "clearance", isGK: false, num: 4, name: "#4", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "ทุ่ม touchline", running: false, action: "throwin", isGK: false, num: 2, name: "#2", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "สเตปโอเวอร์", running: false, action: "stepover", isGK: false, num: 11, name: "#11", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "ลอดขา", running: false, action: "nutmeg", isGK: false, num: 11, name: "#11", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "Bicycle kick", running: false, action: "bicycle", isGK: false, num: 9, name: "#9", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "Rainbow flick", running: false, action: "rainbow", isGK: false, num: 11, name: "#11", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "สกัด pass", running: false, action: "intercept", isGK: false, num: 4, name: "#4", shirt: "#3dba6a", shorts: "#f2f0e6" },
    { label: "รับมือ (Jockey)", running: false, action: "jockey", isGK: false, num: 3, name: "#3", shirt: "#3dba6a", shorts: "#f2f0e6" },
  ];
  const m = modes[mode];
  const ap = actionPose(m.action, tick);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 50);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!autoCycle) return undefined;
    const id = setInterval(() => setMode((x) => (x + 1) % modes.length), 2800);
    return () => clearInterval(id);
  }, [modes.length, autoCycle]);

  const uid = useId().replace(/:/g, "");
  const isGkMode = m.isGK;
  let px = m.running ? 38 + Math.sin(tick * 0.04) * 8 : (isGkMode ? 10 : 42);
  let py = m.running ? 52 + Math.cos(tick * 0.03) * 4 : (isGkMode ? 54 : 54);

  if (m.action === "slide" && ap) {
    if (ap.stage === "approach") px = 34 - ap.p * 4;
    else if (ap.stage === "slide") px = 30 - ap.p * 10;
    else px = 20 + ap.p * 6;
  }

  if (m.action === "dribble" && ap) {
    const base = 34;
    if (ap.stage === "carry") {
      px = base + ap.p * 2;
      py = 54;
    } else if (ap.stage === "feint") {
      px = base + 2 - ap.p * 1.5;
      py = 54 - ap.p * 4;
    } else if (ap.stage === "cut") {
      px = base + 1 + ap.p * 7;
      py = 50 + ap.p * 3;
    } else {
      px = base + 8 + ap.p * 9;
      py = 53 + ap.p * 1.5;
    }
  }

  if (m.action === "tackle" && ap) {
    if (ap.stage === "approach") px = 38 - ap.p * 4;
    else if (ap.stage === "lunge") px = 34 - ap.p * 8;
    else px = 26 + ap.p * 5;
  }

  if (m.action === "freekick" && ap) px = 58 - (ap.stage === "windup" ? ap.w * 4 : ap.stage === "contact" ? 4 : 4 - (ap.follow || 0) * 2);
  if (m.action === "penalty" && ap) px = 72 - (ap.stage === "windup" ? ap.w * 3 : 3);

  if (m.action === "gk-kick-short" || m.action === "gk-kick-long") px = 14;
  if (m.action === "gk-throw-short" || m.action === "gk-throw-long" || m.action === "gk-throw") px = 12;
  if (m.action === "throwin") { px = 8; py = 48; }

  if (m.action === "celebrate" && ap?.stage === "jump") {
    py = 54 - Math.sin(ap.p * Math.PI) * 2;
  }

  const pos = pitchToWide(px, py);

  const toPitch = (svgX, svgY) => svgPointToPitch(px, py, svgX, svgY);
  const smooth = (t) => t * t * (3 - 2 * t);
  const easeOut = (t) => 1 - (1 - t) ** 2;
  const mix = (a, b, t) => ({
    ballPx: a.ballPx + (b.ballPx - a.ballPx) * t,
    ballPy: a.ballPy + (b.ballPy - a.ballPy) * t,
  });

  /** บอลพุ่งเข้า → แตะมือ → ปัดออก */
  function gkBallPos(kind) {
    const isPunch = kind === "gk-punch";
    const hitAt = isPunch ? 0.52 : 0.5;
    const hitPt = animContactSvg(kind, { kind, stage: isPunch ? "punch" : "save", p: hitAt }, true);
    const hit = toPitch(hitPt.x, hitPt.y);
    const shotIn = { ballPx: px + (isPunch ? 20 : 26), ballPy: py + (isPunch ? -14 : -11) };
    const sideY = tick % 140 < 70 ? -15 : 13;
    const deflect = { ballPx: px + (isPunch ? 5 : 2), ballPy: py + sideY };

    if (ap?.stage === "ready") {
      const t = smooth(ap.p) * 0.4;
      const b = mix(shotIn, hit, t);
      return { ...b, airH: 2.2 - t * 0.6, phase: "shot" };
    }
    if (ap?.stage === "save" || ap?.stage === "punch") {
      const p = ap.p;
      if (p < hitAt) {
        const t = smooth(0.4 + (p / hitAt) * 0.6);
        const b = mix(shotIn, hit, t);
        return {
          ...b,
          airH: 1.6 * (1 - t * 0.5),
          phase: "shot",
          contactAnchor: t > 0.92,
        };
      }
      const t = easeOut((p - hitAt) / (1 - hitAt));
      const b = mix(hit, deflect, t);
      return { ...b, airH: 0.6 + t * 1.8, phase: "pass" };
    }
    const t = easeOut(ap?.p ?? 0);
    const b = mix(deflect, { ballPx: deflect.ballPx + 6, ballPy: deflect.ballPy - 4 }, t);
    return { ...b, airH: 2.4, phase: "pass" };
  }

  /** บอลลอยเข้า → หัวโหม่ง → พุ่งออก */
  function headerBallPos() {
    const hitPt = animContactSvg("header", { kind: "header", stage: "jump", p: 0.5 }, false);
    const hit = toPitch(hitPt.x, hitPt.y);
    const crossIn = toPitch(11, -9);
    const crossMid = toPitch(10.5, -4);
    const headerOut = { ballPx: hit.ballPx + 14, ballPy: hit.ballPy - 4 };

    if (ap?.stage === "crouch") {
      const t = smooth(ap.p);
      const b = mix(crossIn, crossMid, t);
      return { ...b, airH: 2.0 - t * 0.4, phase: "pass" };
    }
    if (ap?.stage === "jump") {
      const p = ap.p;
      const hitAt = 0.48;
      if (p < hitAt) {
        const t = smooth(p / hitAt);
        const b = mix(crossMid, hit, t);
        return {
          ...b,
          airH: 1.4 * (1 - t * 0.55),
          phase: "pass",
          contactAnchor: t > 0.93,
        };
      }
      const t = easeOut((p - hitAt) / (1 - hitAt));
      const b = mix(hit, headerOut, t);
      return { ...b, airH: 0.7 + t * 2.4, phase: "pass" };
    }
    const t = easeOut(ap?.p ?? 0);
    const b = mix(headerOut, { ballPx: headerOut.ballPx + 8, ballPy: headerOut.ballPy - 3 }, t);
    return { ...b, airH: 2.8, phase: "pass" };
  }

  /** GK รับบอล — บอลเข้ามาห่อ */
  function gkCatchBallPos() {
    const hitPt = animContactSvg("gk-catch", { kind: "gk-catch", stage: "catch", p: 0.55 }, true);
    const hit = toPitch(hitPt.x, hitPt.y);
    const shotIn = { ballPx: px + 22, ballPy: py - 12 };
    if (ap?.stage === "ready") {
      const t = smooth(ap.p) * 0.45;
      const b = mix(shotIn, hit, t);
      return { ...b, airH: 1.8 - t * 0.5, phase: "shot" };
    }
    if (ap?.stage === "catch") {
      const p = ap.p;
      const hitAt = 0.52;
      if (p < hitAt) {
        const t = smooth(p / hitAt);
        const b = mix(shotIn, hit, t);
        return { ...b, airH: 1.2 * (1 - t * 0.6), phase: "shot", contactAnchor: t > 0.92 };
      }
      return { ...hit, airH: 0.2, phase: "dribble", contactAnchor: true };
    }
    return { ...hit, airH: 0.15, phase: "dribble", contactAnchor: true };
  }

  /** จักรยานอากาศ — บอลชิดปลายเท้าตอนเตะ */
  function bicycleBallPos() {
    const footAt = (stage, fp) => {
      const pt = animContactSvg("bicycle", { kind: "bicycle", stage, p: fp }, false);
      return toPitch(pt.x, pt.y);
    };
    const kickOut = (hit) => ({
      ballPx: hit.ballPx + 12,
      ballPy: hit.ballPy - 2.5,
    });

    if (ap?.stage === "jump") {
      const foot = footAt("jump", ap.p);
      const dropFrom = { ballPx: foot.ballPx - 0.5, ballPy: foot.ballPy - 6 };
      const t = smooth(ap.p);
      const b = mix(dropFrom, foot, t);
      return { ...b, airH: 2.8 - t * 1.6, phase: "pass" };
    }
    if (ap?.stage === "kick") {
      const hit = footAt("kick", ap.p);
      const hitAt = 0.46;
      if (ap.p < hitAt) {
        const settle = footAt("kick", hitAt);
        const t = smooth(ap.p / hitAt);
        const b = mix(footAt("kick", 0), settle, t);
        return { ...b, airH: 1.4 * (1 - t * 0.4), phase: "pass", contactAnchor: t > 0.82 };
      }
      const t = easeOut((ap.p - hitAt) / (1 - hitAt));
      const b = mix(footAt("kick", hitAt), kickOut(footAt("kick", hitAt)), t);
      return { ...b, airH: 1.2 + t * 2.8, phase: "shot" };
    }
    const t = easeOut(ap?.p ?? 0);
    const last = kickOut(footAt("kick", 1));
    const b = mix(last, { ballPx: last.ballPx + 8, ballPy: last.ballPy - 2 }, t);
    return { ...b, airH: 2.6, phase: "pass" };
  }

  let ballPx = px + 2.2;
  let ballPy = py;
  let ballPhase = "dribble";
  let airH = 0;
  let ballContactAnchor = false;

  if (KICK_ACTIONS.has(m.action)) {
    const b = demoKickBall(ap, px, py, m.action);
    ballPx = b.ballPx; ballPy = b.ballPy; ballPhase = b.ballPhase; airH = b.airH;
    ballContactAnchor = !!b.contactAnchor;
  } else if (m.action === "receive") {
    const feet = () => footToPitch(px, py, standingFootSvg(ap?.p ?? 0.5));
    const from = { ballPx: px + 12, ballPy: py - 7 };
    if (ap?.stage === "wait") {
      const t = smooth(ap.p);
      const b = mix(from, feet(), t * 0.85);
      ballPx = b.ballPx; ballPy = b.ballPy; ballPhase = "pass"; airH = 1.5 - t * 0.9;
    } else if (ap?.stage === "touch") {
      const f = feet();
      ballPx = f.ballPx; ballPy = f.ballPy; ballPhase = "dribble";
      ballContactAnchor = ap.p > 0.2 && ap.p < 0.85;
    } else {
      const f = feet();
      ballPx = f.ballPx; ballPy = f.ballPy; ballPhase = "dribble";
    }
  } else if (m.action === "chest") {
    const from = { ballPx: px + 10, ballPy: py - 9 };
    const chest = toPitch(10, 11);
    const feet = { ballPx: px + 2.5, ballPy: py + 0.2 };
    if (ap?.stage === "incoming") {
      const t = smooth(ap.p);
      const b = mix(from, chest, t);
      ballPx = b.ballPx; ballPy = b.ballPy; ballPhase = "pass"; airH = 1.6 - t * 0.5;
    } else if (ap?.stage === "trap") {
      ballPx = chest.ballPx; ballPy = chest.ballPy; ballPhase = "contest"; airH = 0.3; ballContactAnchor = true;
    } else {
      const t = smooth(ap.p);
      const b = mix(chest, feet, t);
      ballPx = b.ballPx; ballPy = b.ballPy; ballPhase = "dribble"; airH = 0.1;
    }
  } else if (m.action === "tackle") {
    const foot = () => footToPitch(px, py, standingFootSvg(0.5));
    if (ap?.stage === "approach") {
      const f = foot();
      ballPx = f.ballPx + 3; ballPy = f.ballPy; ballPhase = "dribble";
    } else if (ap?.stage === "lunge") {
      const f = footToPitch(px, py, legFootTip(12.2, 28 + ap.p * 30, ap.p * 0.4, ap.p * 2, 0, 8 + ap.p * 6));
      ballPx = f.ballPx; ballPy = f.ballPy; ballPhase = "contest";
      ballContactAnchor = ap.p > 0.25 && ap.p < 0.72;
    } else {
      const f = foot();
      ballPx = f.ballPx + 4 + ap.p * 8; ballPy = f.ballPy - ap.p * 0.8; ballPhase = "pass"; airH = ap.p * 1.2;
    }
  } else if (m.action === "block") {
    const shotIn = { ballPx: px + 14, ballPy: py - 5 };
    const blockPt = { ballPx: px + 3, ballPy: py - 1 };
    const away = { ballPx: px + 6, ballPy: py - 8 };
    if (ap?.stage === "set") {
      const t = smooth(ap.p);
      const b = mix(shotIn, blockPt, t * 0.5);
      ballPx = b.ballPx; ballPy = b.ballPy; ballPhase = "shot"; airH = 1.4;
    } else if (ap?.stage === "block") {
      const p = ap.p;
      if (p < 0.5) {
        const t = smooth(p / 0.5);
        const b = mix(shotIn, blockPt, 0.5 + t * 0.5);
        ballPx = b.ballPx; ballPy = b.ballPy; ballPhase = "shot"; airH = 0.8; ballContactAnchor = t > 0.85;
      } else {
        const t = easeOut((p - 0.5) / 0.5);
        const b = mix(blockPt, away, t);
        ballPx = b.ballPx; ballPy = b.ballPy; ballPhase = "pass"; airH = 0.5 + t * 1.5;
      }
    } else {
      const b = mix(away, { ballPx: away.ballPx + 8, ballPy: away.ballPy - 4 }, smooth(ap.p));
      ballPx = b.ballPx; ballPy = b.ballPy; ballPhase = "pass"; airH = 1.8;
    }
  } else if (m.action === "shield") {
    const f = footToPitch(px, py, standingFootSvg(0.5));
    ballPx = f.ballPx + (ap?.stage === "push" ? -0.3 : 0.2);
    ballPy = f.ballPy + 0.05;
    ballPhase = "dribble";
    ballContactAnchor = true;
  } else if (m.action === "celebrate") {
    ballPx = px + 18; ballPy = py + 0.5; ballPhase = "dribble";
  } else if (m.action === "throwin") {
    const overHead = { ballPx: px + 1.5, ballPy: py - 9 };
    const land = { ballPx: px + 16, ballPy: py - 2 };
    if (ap?.stage === "ready") {
      ballPx = px + 1; ballPy = py - 7; ballPhase = "dribble";
    } else if (ap?.stage === "throw") {
      const u = smooth(ap.p);
      if (u < 0.45) {
        const b = mix({ ballPx: px + 1, ballPy: py - 7 }, overHead, u / 0.45);
        ballPx = b.ballPx; ballPy = b.ballPy; airH = u * 2.5; ballPhase = "pass";
      } else {
        const v = (u - 0.45) / 0.55;
        const b = mix(overHead, land, v);
        ballPx = b.ballPx; ballPy = b.ballPy; airH = 2.5 - v * 1.2; ballPhase = "pass";
      }
    } else {
      ballPx = land.ballPx + ap.p * 5; ballPy = land.ballPy; airH = 1.2; ballPhase = "pass";
    }
  } else if (m.action === "bicycle") {
    const b = bicycleBallPos();
    ballPx = b.ballPx; ballPy = b.ballPy; ballPhase = b.phase; airH = b.airH;
    ballContactAnchor = !!b.contactAnchor;
  } else if (m.action === "rainbow") {
    const footPt = (stage, fp) => footToPitch(px, py, animContactSvg("rainbow", { kind: "rainbow", stage, p: fp }, false));
    if (ap?.stage === "flick") {
      const f = footPt("flick", ap.p);
      ballPx = f.ballPx; ballPy = f.ballPy - ap.p * 5; ballPhase = "pass"; airH = ap.p * 2.2;
      ballContactAnchor = ap.p < 0.45;
    } else if (ap?.stage === "arc") {
      const f = footPt("flick", 1);
      ballPx = f.ballPx + 0.5; ballPy = f.ballPy - 10 - Math.sin(ap.p * Math.PI) * 2;
      ballPhase = "pass"; airH = 3.8;
    } else {
      const f = footPt("catch", ap.p);
      ballPx = f.ballPx; ballPy = f.ballPy; ballPhase = "dribble"; airH = 0.2;
      ballContactAnchor = ap.p > 0.4;
    }
  } else if (m.action === "intercept") {
    const passFrom = { ballPx: px + 20, ballPy: py - 1.5 };
    const passLane = { ballPx: px + 11, ballPy: py - 0.5 };
    const feet = () => footToPitch(px, py, standingFootSvg(ap?.p ?? 0.5));
    if (ap?.stage === "read") {
      const u = smooth(ap.p);
      const b = arcBall(passFrom, passLane, u, 1.3);
      ballPx = b.ballPx; ballPy = b.ballPy; ballPhase = "pass"; airH = b.airH;
    } else if (ap?.stage === "cut") {
      const u = smooth(ap.p);
      const f = feet();
      const b = arcBall(passLane, f, u, 0.45);
      ballPx = b.ballPx; ballPy = b.ballPy;
      ballPhase = u > 0.55 ? "dribble" : "pass";
      airH = b.airH * (1 - u * 0.9);
      ballContactAnchor = u > 0.42 && u < 0.88;
    } else {
      const f = feet();
      ballPx = f.ballPx; ballPy = f.ballPy; ballPhase = "dribble"; airH = 0;
      ballContactAnchor = true;
    }
  } else if (m.action === "jockey") {
    ballPx = px + 5; ballPy = py + 0.25; ballPhase = "dribble";
  } else if (m.action === "gk-throw" || m.action === "gk-throw-short" || m.action === "gk-throw-long") {
    const long = m.action === "gk-throw-long";
    if (ap?.stage === "throw") {
      ballPx = px + 4 + ap.p * (long ? 18 : 8);
      ballPy = py - ap.p * (long ? 6 : 2);
      ballPhase = "pass";
      airH = (long ? 2.2 : 0.8) + ap.p * (long ? 1.5 : 0.4);
    } else if (ap?.stage === "recover") {
      ballPx = px + (long ? 22 : 12) + ap.p * 4;
      ballPy = py - (long ? 4 : 1);
      ballPhase = "pass";
      airH = long ? 2 : 0.5;
    } else {
      ballPx = px + 2; ballPy = py + 0.2; ballPhase = "dribble";
    }
  } else if (m.action === "stepover" || m.action === "nutmeg") {
    const f = footToPitch(px, py, standingFootSvg(ap?.p ?? 0.5));
    if (ap?.stage === "feint") {
      ballPx = f.ballPx + 2; ballPy = f.ballPy + 0.08; ballPhase = "dribble"; ballContactAnchor = true;
    } else {
      ballPx = f.ballPx + ap.p * 5; ballPy = f.ballPy + 0.04; ballPhase = "dribble";
    }
  } else if (m.action === "gk-save") {
    const b = gkBallPos("gk-save");
    ballPx = b.ballPx; ballPy = b.ballPy; ballPhase = b.phase; airH = b.airH; ballContactAnchor = !!b.contactAnchor;
  } else if (m.action === "gk-punch") {
    const b = gkBallPos("gk-punch");
    ballPx = b.ballPx; ballPy = b.ballPy; ballPhase = b.phase; airH = b.airH; ballContactAnchor = !!b.contactAnchor;
  } else if (m.action === "gk-catch") {
    const b = gkCatchBallPos();
    ballPx = b.ballPx; ballPy = b.ballPy; ballPhase = b.phase; airH = b.airH; ballContactAnchor = !!b.contactAnchor;
  } else if (m.action === "header") {
    const b = headerBallPos();
    ballPx = b.ballPx; ballPy = b.ballPy; ballPhase = b.phase; airH = b.airH; ballContactAnchor = !!b.contactAnchor;
  } else if (m.action === "slide") {
    const foot = () => footToPitch(px, py, standingFootSvg(0.5));
    if (ap?.stage === "approach") {
      const f = foot();
      ballPx = f.ballPx + 4; ballPy = f.ballPy; ballPhase = "dribble";
    } else if (ap?.stage === "slide") {
      const f = footToPitch(px, py, legFootTip(12.2, -20 - ap.p * 40, ap.p * 0.8, -ap.p * 8, 0, -ap.p * 5));
      ballPx = f.ballPx; ballPy = f.ballPy; ballPhase = ap.p > 0.35 ? "contest" : "dribble";
      ballContactAnchor = ap.p > 0.3 && ap.p < 0.65;
    } else {
      const f = foot();
      ballPx = f.ballPx + 2 + ap.p * 6; ballPy = f.ballPy - ap.p * 0.5; ballPhase = "pass"; airH = ap.p * 0.5;
    }
  } else if (m.action === "dribble") {
    const base = () => footToPitch(px, py, standingFootSvg(ap?.p ?? 0.5));
    if (ap?.stage === "carry") {
      const f = base();
      ballPx = f.ballPx; ballPy = f.ballPy; ballPhase = "dribble"; ballContactAnchor = true;
    } else if (ap?.stage === "feint") {
      const f = base();
      ballPx = f.ballPx + 1.8 + ap.p * 0.8; ballPy = f.ballPy + 0.08; ballPhase = "dribble";
    } else if (ap?.stage === "cut") {
      const f = base();
      ballPx = f.ballPx + ap.p * 4.5; ballPy = f.ballPy + 0.02; ballPhase = "dribble";
    } else {
      const f = base();
      ballPx = f.ballPx + 1 + ap.p * 6; ballPy = f.ballPy + 0.03; ballPhase = "dribble";
    }
  }

  const prepStages = new Set(["ready", "crouch", "approach", "carry", "wait", "set", "hold", "raise", "incoming", "read", "shuffle", "give", "flick", "run"]);
  const mainStages = new Set(["save", "punch", "jump", "slide", "feint", "cut", "touch", "lunge", "block", "trap", "push", "catch", "throw", "kick", "arc", "engage", "return"]);
  const stageLabel = prepStages.has(ap?.stage) ? " · เตรียม"
    : mainStages.has(ap?.stage) ? " · จังหวะหลัก!"
    : ap?.stage === "burst" ? " · ฉีด!"
    : ap?.stage === "contact" ? " · แตะบอล!"
    : ap?.stage === "windup" ? " · เตรียมเตะ"
    : ap?.stage === "recover" || ap?.stage === "land" || ap?.stage === "stagger" || ap?.stage === "control" || ap?.stage === "drop" || ap?.stage === "turn" || ap?.stage === "pump" || ap?.stage === "hold" ? " · ลงตัว"
    : ap?.stage === "follow" ? " · ตามทัน"
    : "";

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 6px 20px rgba(0,0,0,.45)", marginBottom: 10 }}>
      <div style={{ padding: "6px 10px", background: "#0a1210", color: "#9ab", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>
        🎬 {m.label}{stageLabel} — {mode + 1}/{modes.length}
        <button
          type="button"
          onClick={() => setAutoCycle((v) => !v)}
          style={{
            marginLeft: 8, padding: "2px 8px", fontSize: 10, cursor: "pointer",
            background: autoCycle ? "#1a3a2a" : "#2a2a2a", color: "#cde", border: "1px solid #3a5a4a", borderRadius: 4,
          }}
        >
          {autoCycle ? "⏸ หยุดสลับ" : "▶ สลับอัตโนมัติ"}
        </button>
      </div>
      <div style={{
        display: "flex", gap: 4, padding: "6px 8px", overflowX: "auto", background: "#0d1512",
        borderBottom: "1px solid #1a2e24",
      }}>
        {modes.map((mo, i) => (
          <button
            key={mo.label}
            type="button"
            onClick={() => { setMode(i); setAutoCycle(false); }}
            style={{
              flex: "0 0 auto", padding: "3px 8px", fontSize: 10, cursor: "pointer", whiteSpace: "nowrap",
              background: i === mode ? "#2d5a42" : "#15261e",
              color: i === mode ? "#fff" : "#8fa396",
              border: i === mode ? "1px solid #4a8a62" : "1px solid #2a4034",
              borderRadius: 4,
            }}
          >
            {mo.label}
          </button>
        ))}
      </div>
      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: TRACKER.bg }}>
        <style>{`@keyframes v0Ad { to { transform: translateX(var(--u)); } }`}</style>
        <V0PitchSVG uid={uid} ballPx={ballPx} ballPy={ballPy} sponsorLabel="Anim Demo" />
        <AnimDemoPlayerFigure
          x={pos.x}
          y={pos.y}
          shirtColor={m.shirt}
          shortsColor={m.shorts}
          gkColor="#f0e040"
          num={m.num}
          isGK={m.isGK}
          isCarrier={!m.action || ["dribble", "shield", "receive", "stepover", "nutmeg", "jockey"].includes(m.action)}
          isPasser={KICK_ACTIONS.has(m.action) || m.action === "throwin" || m.action === "gk-throw-short" || m.action === "gk-throw-long"}
          facing={m.action === "slide" ? 1 : 1}
          name={m.name}
          running={m.running}
          actionKind={m.action}
          animTick={tick}
        />
        <TrackerBall px={ballPx} py={ballPy} animTick={tick} phase={ballPhase} airHeight={airH} contactAnchor={ballContactAnchor} />
      </div>
    </div>
  );
}

export { formatMatchClock, TRACKER, V0PitchSVG, TrackerPlayerDots, TrackerBall };
