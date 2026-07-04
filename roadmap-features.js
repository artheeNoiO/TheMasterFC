/**
 * Tier A/B roadmap features — game logic (see features-roadmap.js for design spec).
 */

import {
  WORLD_CUP_EVENT_NAME,
  WORLD_CUP_NOMINEES_MAX,
  WORLD_CUP_CHAMPION_PREDICTION,
} from "./world-cup-event.js";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const uid = (pfx) => `${pfx}_${Math.random().toString(36).slice(2, 10)}`;

/* ---------- Scouting zones ---------- */
export const SCOUT_ZONES = [
  { id: "th_local", label: "ไทย · ลีกในประเทศ", leagueIds: ["thailand"], ratingRange: [42, 68] },
  { id: "sea", label: "อาเซียน", leagueIds: ["thailand", "vietnam"], ratingRange: [44, 72] },
  { id: "eu_budget", label: "ยุโรป · ลีกรอง", leagueIds: ["england", "spain", "italy"], ratingRange: [52, 78] },
  { id: "eu_top", label: "ยุโรป · ท็อป 5", leagueIds: ["england", "spain", "germany", "italy", "france"], ratingRange: [58, 88] },
  { id: "sa", label: "อเมริกาใต้", leagueIds: ["brazil", "argentina"], ratingRange: [50, 82] },
];

export const INJURY_SEVERITY = {
  light: { days: [1, 3], label: "เบา", trainBlock: false },
  medium: { days: [4, 10], label: "กลาง", trainBlock: true },
  heavy: { days: [11, 28], label: "หนัก", trainBlock: true },
};

export const PRESS_CHOICES = [
  { id: "confident", label: "มั่นใจทีม", morale: 3, fan: 2, board: 1 },
  { id: "humble", label: "ถ่อมตัว", morale: 1, fan: 3, board: 2 },
  { id: "deflect", label: "โยนให้นักเตะ", morale: 0, fan: -1, board: 0 },
];

export const PLAYER_CONVERSATIONS = [
  { id: "wage", label: "ขอขึ้นค่าเหนื่อย", moraleOnYes: 6, moraleOnNo: -8 },
  { id: "playtime", label: "ขอลงตัวจริงมากขึ้น", moraleOnYes: 5, moraleOnNo: -6 },
  { id: "leave", label: "อยากย้ายทีม", moraleOnYes: -2, moraleOnNo: -10 },
];

/** FFP: โควต้าโอน ≈ 150% รายได้ฤดูกาล */
export const FFP_TRANSFER_CAP_RATIO = 1.5;
export const BOARD_SACK_THRESHOLD = 12;
export const BOARD_WARN_THRESHOLD = 35;

export function ensureRoadmapFields(c) {
  if (!c.roadmapV12) {
    c.roadmapV12 = true;
    initRoadmapOnCareer(c);
  }
  if (!c.ffp) c.ffp = defaultFfp(c);
  if (!c.scoutNetwork) c.scoutNetwork = { assignments: [], reports: [] };
  if (!c.shadowSquad) c.shadowSquad = { targets: [], marketAlerts: [] };
  if (!c.rivals) c.rivals = [];
  if (!c.delegation) c.delegation = defaultDelegation();
  if (!c.worldCupEvent) c.worldCupEvent = defaultWorldCupState();
  if (c.youthIntakeCeremonySeason == null) c.youthIntakeCeremonySeason = 0;
  if (c.preSeasonDone == null) c.preSeasonDone = false;
  if (!c.bTeam) c.bTeam = { reserveIds: [], autoLoan: true };
  return c;
}

function defaultDelegation() {
  return { market: "auto", training: "auto", press: "manual", analyst: true };
}

function defaultFfp(c) {
  const budget = c?.budget || 0;
  return {
    seasonSpend: 0,
    seasonRevenue: Math.round(budget * 0.4),
    cap: Math.round(budget * FFP_TRANSFER_CAP_RATIO),
    warned: false,
    blocked: false,
  };
}

function defaultWorldCupState() {
  const now = new Date();
  return {
    eventKey: `${now.getFullYear()}-${now.getMonth() + 1}`,
    phase: "idle",
    nominations: [],
    championPick: null,
    registered: false,
  };
}

export function initRoadmapOnCareer(c) {
  const uT = c.teams?.find((t) => t.id === c.userTeamId);
  c.ffp = defaultFfp(c);
  c.scoutNetwork = { assignments: [{ zoneId: "th_local", active: true }], reports: [] };
  c.shadowSquad = { targets: [], marketAlerts: [] };
  c.rivals = pickDerbyRivals(c, uT);
  c.delegation = defaultDelegation();
  c.worldCupEvent = defaultWorldCupState();
  c.youthIntakeCeremonySeason = 0;
  c.preSeasonDone = false;
  c.bTeam = { reserveIds: [], autoLoan: true };
  c.pendingPress = null;
  c.pendingConversation = null;
  c.lastMatchXg = null;
  c.xgHistory = [];
  if (c.board) {
    c.board.sackRisk = 0;
    c.board.seasonsFailed = 0;
  }
  return c;
}

/** สุ่มคู่แข่งในลีกเดียวกัน 1–2 ทีม */
export function pickDerbyRivals(c, uTeam) {
  if (!uTeam || !c.teams) return [];
  const sameDiv = c.teams.filter((t) => t.id !== uTeam.id && t.division === uTeam.division);
  const shuffled = [...sameDiv].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2).map((t, i) => ({
    teamId: t.id,
    name: t.name,
    short: t.short,
    intensity: i === 0 ? 3 : 2,
  }));
}

export function isDerbyMatch(c, homeId, awayId) {
  const ids = new Set((c.rivals || []).map((r) => r.teamId));
  const userId = c.userTeamId;
  if (homeId !== userId && awayId !== userId) return false;
  const opp = homeId === userId ? awayId : homeId;
  return ids.has(opp);
}

export function derbyMoraleBonus(c, homeId, awayId, userWon) {
  if (!isDerbyMatch(c, homeId, awayId)) return 0;
  return userWon ? 8 : -5;
}

/** บอร์ด — ความเสี่ยงถูกไล่ออก */
export function evaluateBoardSack(c, uTeam, { seasonEnd = false, finalPos = null } = {}) {
  if (!c.board || !uTeam) return { sacked: false };
  const b = c.board;
  if (b.satisfaction <= BOARD_SACK_THRESHOLD) {
    b.sackRisk = clamp((b.sackRisk || 0) + 25, 0, 100);
  } else if (b.satisfaction < BOARD_WARN_THRESHOLD) {
    b.sackRisk = clamp((b.sackRisk || 0) + 8, 0, 100);
  } else {
    b.sackRisk = clamp((b.sackRisk || 0) - 5, 0, 100);
  }
  if (seasonEnd && finalPos != null) {
    if (finalPos > b.targetPos + 5) b.seasonsFailed = (b.seasonsFailed || 0) + 1;
    else if (finalPos <= b.targetPos) b.seasonsFailed = 0;
    if (b.seasonsFailed >= 2 || (finalPos > b.targetPos + 8 && b.satisfaction < 30)) {
      return { sacked: true, reason: `บอร์ดไล่ออก — ไม่ถึงเป้า ${b.seasonsFailed} ฤดูกาลติด · อันดับ ${finalPos}` };
    }
  }
  if (b.sackRisk >= 100 || (b.satisfaction <= 8 && !seasonEnd)) {
    return { sacked: true, reason: `บอร์ดไล่ออก — ความพอใจ ${b.satisfaction}% · ความเสี่ยง ${b.sackRisk}%` };
  }
  return { sacked: false, sackRisk: b.sackRisk };
}

/** FFP — บันทึกรายจ่ายโอน */
export function recordTransferSpend(c, amount) {
  ensureRoadmapFields(c);
  c.ffp.seasonSpend = (c.ffp.seasonSpend || 0) + amount;
  const cap = c.ffp.cap || defaultFfp(c).cap;
  if (c.ffp.seasonSpend > cap && !c.ffp.warned) {
    c.ffp.warned = true;
    c.log = [`⚠️ FFP: ใกล้เกินโควต้าโอน (${formatNum(c.ffp.seasonSpend)}/${formatNum(cap)})`, ...(c.log || [])];
  }
  if (c.ffp.seasonSpend > cap * 1.1) c.ffp.blocked = true;
}

export function canAffordTransferFfp(c, fee) {
  ensureRoadmapFields(c);
  if (c.ffp?.blocked) return { ok: false, reason: "FFP บล็อก — ใช้โควต้าโอนเกินกำหนด" };
  const cap = c.ffp?.cap || Infinity;
  if ((c.ffp?.seasonSpend || 0) + fee > cap * 1.05) {
    return { ok: false, reason: "FFP: เกินโควต้าโอนฤดูกาล" };
  }
  return { ok: true };
}

function formatNum(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

/** สัญญา — release clause + sell-on */
export function enrichPlayerContract(p) {
  if (!p || p.isLegend) return p;
  if (p.releaseClause == null) {
    p.releaseClause = Math.round((p.value || 500_000) * (1.4 + Math.random() * 0.8));
  }
  if (p.sellOnPct == null) {
    p.sellOnPct = p.age <= 23 ? randInt(8, 15) : randInt(0, 8);
  }
  if (p.signingBonus == null) p.signingBonus = Math.round((p.wage || 1000) * randInt(4, 12));
  return p;
}

function randInt(a, b) {
  return a + Math.floor(Math.random() * (b - a + 1));
}

/** Shadow squad — เป้าหมายซื้อ */
export function addShadowTarget(c, { position, minRating, maxAge, note }) {
  ensureRoadmapFields(c);
  const t = {
    id: uid("sh"),
    position: position || "MF",
    minRating: minRating || 60,
    maxAge: maxAge || 28,
    note: note || "",
    addedDay: c.day,
  };
  c.shadowSquad.targets = [...(c.shadowSquad.targets || []), t].slice(-5);
  return t;
}

export function checkShadowMarketAlerts(c, listPlayer) {
  ensureRoadmapFields(c);
  const hits = (c.shadowSquad.targets || []).filter((t) => {
    if (t.position && listPlayer.position !== t.position) return false;
    if (listPlayer.rating < t.minRating) return false;
    if (listPlayer.age > t.maxAge) return false;
    return true;
  });
  hits.forEach((h) => {
    c.shadowSquad.marketAlerts = [
      { targetId: h.id, playerName: listPlayer.name, rating: listPlayer.rating, day: c.day },
      ...(c.shadowSquad.marketAlerts || []),
    ].slice(0, 8);
  });
  return hits.length;
}

/** สลับโซนที่ส่งแมวมอง */
export function assignScoutZone(c, zoneId) {
  ensureRoadmapFields(c);
  const assignments = [...(c.scoutNetwork.assignments || [])];
  const idx = assignments.findIndex((a) => a.zoneId === zoneId);
  if (idx >= 0) assignments[idx] = { ...assignments[idx], active: !assignments[idx].active };
  else assignments.push({ zoneId, active: true });
  c.scoutNetwork.assignments = assignments.slice(0, 3);
  return c.scoutNetwork.assignments;
}

/** Scouting network — รายงานจากโซน */
export function runScoutZoneReports(c, genFindFn) {
  ensureRoadmapFields(c);
  if (!c.marketScout) return [];
  const active = (c.scoutNetwork.assignments || []).filter((a) => a.active);
  const reports = [];
  active.forEach((a) => {
    const zone = SCOUT_ZONES.find((z) => z.id === a.zoneId);
    if (!zone) return;
    const leagueId = zone.leagueIds[Math.floor(Math.random() * zone.leagueIds.length)];
    const find = genFindFn(c.marketScout, c.teams?.find((t) => t.id === c.userTeamId)?.tier ?? -3, c.day, leagueId);
    if (find) {
      find.zoneId = zone.id;
      find.zoneLabel = zone.label;
      reports.push(find);
    }
  });
  c.scoutNetwork.reports = [...reports, ...(c.scoutNetwork.reports || [])].slice(0, 12);
  return reports;
}

/** xG หลังแมตช์ */
export function recordMatchXg(c, { xgUs, xgThem, homeGoals, awayGoals, day, opponent }) {
  ensureRoadmapFields(c);
  const entry = {
    day: day ?? c.day,
    xgUs: round1(xgUs),
    xgThem: round1(xgThem),
    goalsUs: homeGoals,
    goalsThem: awayGoals,
    opponent: opponent?.short || "?",
    xgDiff: round1(xgUs - xgThem),
  };
  c.lastMatchXg = entry;
  c.xgHistory = [entry, ...(c.xgHistory || [])].slice(0, 10);
  return entry;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

/** Press / Media — 2 ทางเลือก */
export function maybeGeneratePressEvent(c) {
  ensureRoadmapFields(c);
  if (c.pendingPress || c.delegation?.press === "auto") return null;
  if (Math.random() > 0.12) return null;
  c.pendingPress = {
    id: uid("press"),
    choices: PRESS_CHOICES.slice(0, 2),
    day: c.day,
  };
  return c.pendingPress;
}

export function applyPressChoice(c, choiceId) {
  const ev = c.pendingPress;
  if (!ev) return;
  const ch = ev.choices.find((x) => x.id === choiceId) || PRESS_CHOICES.find((x) => x.id === choiceId);
  if (!ch) return;
  const uSquad = (c.players || []).filter((p) => p.teamId === c.userTeamId);
  uSquad.forEach((p) => { p.morale = clamp((p.morale || 70) + (ch.morale || 0), 10, 99); });
  c.fanBase = clamp((c.fanBase || 2500) + (ch.fan || 0) * 50, 500, 500_000);
  if (c.board) c.board.satisfaction = clamp((c.board.satisfaction || 70) + (ch.board || 0), 0, 100);
  c.log = [`📰 แถลงข่าว: "${ch.label}" — มูด${ch.morale >= 0 ? "+" : ""}${ch.morale}`, ...(c.log || [])];
  c.pendingPress = null;
}

/** Player conversation event */
export function maybeGeneratePlayerConversation(c) {
  ensureRoadmapFields(c);
  if (c.pendingConversation) return null;
  if (Math.random() > 0.08) return null;
  const squad = (c.players || []).filter((p) => p.teamId === c.userTeamId && !p.isLegend);
  if (!squad.length) return null;
  const player = squad[Math.floor(Math.random() * squad.length)];
  const type = PLAYER_CONVERSATIONS[Math.floor(Math.random() * PLAYER_CONVERSATIONS.length)];
  c.pendingConversation = { playerId: player.id, playerName: player.name, ...type };
  return c.pendingConversation;
}

export function resolvePlayerConversation(c, accept) {
  const ev = c.pendingConversation;
  if (!ev) return;
  const p = (c.players || []).find((x) => x.id === ev.playerId);
  if (p) {
    p.morale = clamp((p.morale || 70) + (accept ? ev.moraleOnYes : ev.moraleOnNo), 10, 99);
    if (ev.id === "wage" && accept) p.wage = Math.round(p.wage * 1.08);
  }
  c.log = [`💬 ${ev.playerName}: ${ev.label} — ${accept ? "ตกลง" : "ปฏิเสธ"}`, ...(c.log || [])];
  c.pendingConversation = null;
}

/** บาดเจ็บ — เบา/กลาง/หนัก */
export function rollInjurySeverity() {
  const r = Math.random();
  if (r < 0.55) return "light";
  if (r < 0.88) return "medium";
  return "heavy";
}

export function applyInjuryToPlayer(p, severityKey = null) {
  const key = severityKey || rollInjurySeverity();
  const def = INJURY_SEVERITY[key] || INJURY_SEVERITY.medium;
  const days = def.days[0] + Math.floor(Math.random() * (def.days[1] - def.days[0] + 1));
  p.injuryDays = Math.max(p.injuryDays || 0, days);
  p.injurySeverity = key;
  return { severity: key, days, label: def.label };
}

export function blocksHeavyTraining(p) {
  if (!p?.injuryDays || p.injuryDays <= 0) return false;
  const key = p.injurySeverity || "medium";
  return INJURY_SEVERITY[key]?.trainBlock ?? true;
}

/** Pre-season — อุ่นเครื่อง 2–3 นัด */
export function runPreSeasonFriendlies(c, simFn) {
  if (c.preSeasonDone) return c;
  const uT = c.teams?.find((t) => t.id === c.userTeamId);
  if (!uT) return c;
  const opponents = (c.teams || []).filter((t) => t.id !== c.userTeamId && t.division === uT.division).slice(0, 3);
  const lines = [];
  opponents.forEach((opp) => {
    const res = simFn?.(c, uT, opp) || { homeGoals: randInt(0, 3), awayGoals: randInt(0, 3) };
    lines.push(`🏃 อุ่นเครื่อง vs ${opp.short}: ${res.homeGoals}-${res.awayGoals}`);
  });
  c.preSeasonDone = true;
  c.log = [...lines, ...(c.log || [])];
  return c;
}

/** Youth intake — ครั้งเดียว/ฤดูกาล */
export function canRunYouthIntakeCeremony(c) {
  return (c.youthIntakeCeremonySeason || 0) < (c.season || 1);
}

export function markYouthIntakeCeremony(c) {
  c.youthIntakeCeremonySeason = c.season || 1;
  return c;
}

/** World Cup — tick รายเดือน (stub) */
export function tickWorldCupEvent(c) {
  ensureRoadmapFields(c);
  const now = new Date();
  const key = `${now.getFullYear()}-${now.getMonth() + 1}`;
  if (c.worldCupEvent.eventKey === key) return c.worldCupEvent;
  c.worldCupEvent = {
    ...defaultWorldCupState(),
    eventKey: key,
    phase: "registration",
    name: WORLD_CUP_EVENT_NAME,
    nomineesMax: WORLD_CUP_NOMINEES_MAX,
    championPickLocked: WORLD_CUP_CHAMPION_PREDICTION.lockAt,
  };
  c.log = [`🏆 ${WORLD_CUP_EVENT_NAME} เปิดรับสมัคร — ส่งนักเตะได้ ${WORLD_CUP_NOMINEES_MAX} คน`, ...(c.log || [])];
  return c.worldCupEvent;
}

/** B-team stub — ดึงดาวรุ่งลงสำรอง */
export function syncBTeamReserve(c) {
  ensureRoadmapFields(c);
  const youth = (c.academyPlayers || []).filter((p) => p.age <= 21).slice(0, 5);
  c.bTeam.reserveIds = youth.map((p) => p.id);
  return c.bTeam;
}

/** รายวัน — เรียกจาก finalizeDayExtras */
export function runDailyRoadmapTick(c, uTeam, helpers = {}) {
  ensureRoadmapFields(c);
  const logs = [];

  if (c.delegation?.press !== "auto") maybeGeneratePressEvent(c);
  maybeGeneratePlayerConversation(c);

  let reports = [];
  if (c.marketScout && c.day % 3 === 0 && helpers.genScoutFind) {
    reports = runScoutZoneReports(c, helpers.genScoutFind);
    if (reports.length) logs.push(`🔭 สเกาต์ส่งรายงาน ${reports.length} โซน`);
  }

  tickWorldCupEvent(c);
  syncBTeamReserve(c);

  const sack = evaluateBoardSack(c, uTeam);
  if (sack.sacked) return { ...sack, logs, reports };

  return { sacked: false, logs, reports, sackRisk: c.board?.sackRisk };
}

/** หลังจบฤดูกาล */
export function runSeasonEndRoadmap(c, uTeam, finalPos) {
  ensureRoadmapFields(c);
  const sack = evaluateBoardSack(c, uTeam, { seasonEnd: true, finalPos });
  if (sack.sacked) return sack;
  c.ffp.seasonSpend = 0;
  c.ffp.warned = false;
  c.ffp.blocked = false;
  c.ffp.cap = Math.round((c.budget || 0) * FFP_TRANSFER_CAP_RATIO + (c.ffp.seasonRevenue || 0));
  return { sacked: false };
}
