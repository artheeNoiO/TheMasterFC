import React, { useId, useRef, useMemo } from "react";
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
function TrackerPlayerFigure({ x, y, shirtColor, shortsColor, gkColor, num, isGK, isCarrier, isPasser, isReceiver, facing, name, stamina }) {
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
          position: "absolute", left: "18%", right: "18%", top: "-22%", height: "9%",
          minHeight: 2, background: "rgba(0,0,0,0.5)", borderRadius: 2, overflow: "hidden",
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
          {/* ขา */}
          <rect x="6.5" y="22" width="2.8" height="5" rx="1" fill="#2a2a2a" />
          <rect x="10.7" y="22" width="2.8" height="5" rx="1" fill="#2a2a2a" />
          {/* กางเกง */}
          <rect x="5.5" y="17.5" width="9" height="5.2" rx="1.2" fill={shorts} stroke="rgba(0,0,0,0.25)" strokeWidth="0.4" />
          {/* เสื้อ */}
          <path
            d="M5 9.5 L15 9.5 L16.2 17.8 L3.8 17.8 Z"
            fill={shirt} stroke="rgba(0,0,0,0.28)" strokeWidth="0.45" strokeLinejoin="round"
          />
          {/* แขน */}
          <rect x="2.2" y="10.5" width="2.6" height="6.5" rx="1.1" fill={shirt} stroke="rgba(0,0,0,0.2)" strokeWidth="0.35" />
          <rect x="15.2" y="10.5" width="2.6" height="6.5" rx="1.1" fill={shirt} stroke="rgba(0,0,0,0.2)" strokeWidth="0.35" />
          {/* หัว */}
          <circle cx="10" cy="6" r="3.6" fill="#e8b88a" stroke="rgba(0,0,0,0.25)" strokeWidth="0.4" />
          {/* เลขเสื้อ */}
          {!isGK && (
            <text x="10" y="15.5" textAnchor="middle" fontSize="4.2" fontWeight="800"
              fill={numCol} fontFamily="Arial,sans-serif">{num}</text>
          )}
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
        />
      ))}
    </>
  );
}

function TrackerBall({ px, py, animTick, phase, airHeight = 0 }) {
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
  const footY = baseFootY - liftPct * footDrop * 1.6;

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
  void animTick;

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

export { formatMatchClock, TRACKER, V0PitchSVG, TrackerPlayerDots, TrackerBall };
