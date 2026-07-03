/**
 * Training reports, Analyst recommendations, drill presets (non-live-match).
 */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const TRAINING_REPORT_MAX = 14;

/** สเตตหลักตามตำแหน่งละเอียด — mirror ของ DPOS_KEY_ATTRS ใน football-manager */
export const POSITION_KEY_ATTRS = {
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

const GROUP_KEY_ATTRS = {
  GK: ["decisions", "composure", "agility"],
  DF: ["tackling", "heading", "strength", "decisions"],
  MF: ["passing", "vision", "workRate", "tackling"],
  FW: ["finishing", "dribbling", "pace", "composure"],
};

const ATTR_TO_FOCUS = {
  finishing: "SHOOTING", dribbling: "SHOOTING", composure: "SHOOTING", crossing: "SHOOTING",
  passing: "DEFENDING", vision: "DEFENDING", decisions: "DEFENDING", heading: "DEFENDING",
  tackling: "TACKLING", strength: "TACKLING", determination: "TACKLING", workRate: "TACKLING",
  pace: "FITNESS", acceleration: "FITNESS", agility: "FITNESS",
};

const FOCUS_PRIORITY = { TACKLING: 0, DEFENDING: 1, SHOOTING: 2, FITNESS: 3 };

export function snapshotPlayerAttrs(players) {
  const snap = {};
  (players || []).forEach((p) => {
    snap[p.id] = { ...(p.attrs || {}) };
  });
  return snap;
}

export function computePlayerAttrDeltas(beforeSnap, players) {
  return (players || []).map((p) => {
    const prev = beforeSnap[p.id] || {};
    const deltas = {};
    Object.keys(p.attrs || {}).forEach((k) => {
      const d = (p.attrs[k] || 0) - (prev[k] || 0);
      if (Math.abs(d) > 0.001) deltas[k] = Math.round(d * 1000) / 1000;
    });
    const totalGain = Object.values(deltas).reduce((s, v) => s + v, 0);
    return {
      id: p.id, name: p.name, position: p.position, pos: p.pos,
      deltas, totalGain: Math.round(totalGain * 1000) / 1000,
    };
  }).filter((row) => Object.keys(row.deltas).length > 0);
}

export function appendTrainingReport(c, report) {
  if (!c.trainingReports) c.trainingReports = [];
  const idx = c.trainingReports.findIndex((r) => r.day === report.day && r.season === report.season);
  if (idx >= 0) c.trainingReports[idx] = { ...c.trainingReports[idx], ...report };
  else c.trainingReports.unshift(report);
  c.trainingReports = c.trainingReports.slice(0, TRAINING_REPORT_MAX);
}

export function buildTrainingDayReport({
  day, season, trainingType, trainingLabel, slotIdx, isRestDay,
  drillSummary, playerDeltas, individualFocus, skippedMatchIds, events,
}) {
  const topGainers = [...(playerDeltas || [])]
    .sort((a, b) => b.totalGain - a.totalGain)
    .slice(0, 5);
  return {
    day, season, trainingType, trainingLabel, slotIdx, isRestDay,
    drillSummary: drillSummary || [],
    playerDeltas: playerDeltas || [],
    topGainers,
    individualFocus: individualFocus || {},
    skippedMatchCount: skippedMatchIds?.size || 0,
    events: events || [],
    at: Date.now(),
  };
}

function keyAttrsForPlayer(player) {
  const detailed = player?.pos;
  if (detailed && POSITION_KEY_ATTRS[detailed]) return POSITION_KEY_ATTRS[detailed];
  return GROUP_KEY_ATTRS[player?.position] || ["passing", "decisions", "workRate"];
}

function positionTarget(player, squad) {
  const group = player.position;
  const peers = (squad || []).filter((p) => p.position === group && p.injuryDays <= 0);
  const peerAvg = peers.length
    ? peers.reduce((s, p) => s + (p.rating || 60), 0) / peers.length
    : 62;
  return clamp(Math.round(peerAvg / 5 + 10), 11, 16);
}

function drillsForAttr(attr, group, drillsMap, max = 2) {
  return Object.entries(drillsMap || {})
    .filter(([, d]) => d.groups?.includes(group) && d.attrs?.includes(attr))
    .slice(0, max)
    .map(([id, d]) => ({ id, name: d.name, icon: d.icon }));
}

export function analyzePlayerTrainingNeed(player, squad, drillsMap, opts = {}) {
  const target = positionTarget(player, squad);
  const keys = keyAttrsForPlayer(player);
  const gaps = keys
    .map((attr) => ({
      attr,
      val: player.attrs?.[attr] ?? 10,
      gap: target - (player.attrs?.[attr] ?? 10),
    }))
    .filter((g) => g.gap > 0.4)
    .sort((a, b) => b.gap - a.gap);

  if (!gaps.length) return null;

  const primary = gaps[0];
  const secondary = gaps[1];
  const focusType = ATTR_TO_FOCUS[primary.attr] || "BALANCED";
  const group = player.position;
  const drillIds = drillsForAttr(primary.attr, group, drillsMap, 3);
  if (secondary) {
    drillsForAttr(secondary.attr, group, drillsMap, 1).forEach((d) => {
      if (!drillIds.find((x) => x.id === d.id)) drillIds.push(d);
    });
  }

  const attrLabel = opts.attrLabel?.(primary.attr) || primary.attr;
  const reason = secondary
    ? `${attrLabel} ต่ำ (${primary.val.toFixed(1)}/${target}) · รอง ${opts.attrLabel?.(secondary.attr) || secondary.attr}`
    : `${attrLabel} ต่ำ (${primary.val.toFixed(1)}/${target})`;

  return {
    playerId: player.id,
    name: player.name,
    position: player.position,
    pos: player.pos,
    weakAttrs: gaps.slice(0, 3),
    focusType: focusType === "BALANCED" ? "DEFENDING" : focusType,
    drillIds: drillIds.slice(0, 4),
    reason,
    priority: (gaps[0].gap * 10) + (FOCUS_PRIORITY[focusType] ?? 5),
  };
}

/** แนะนำฝึกทั้งทีม — Analyst ยิ่งดาว/เกรดสูง ยิ่งเห็นรายละเอียดและจำนวนมากขึ้น */
export function buildSquadTrainingRecommendations(squad, drillsMap, staffBonuses, opts = {}) {
  const insight = (staffBonuses?.scoutInsightBonus || 0) + (staffBonuses?.hasAnalyst ? 0.08 : 0);
  const limit = clamp(Math.round(4 + insight * 18), 3, staffBonuses?.hasAnalyst ? 10 : 5);
  const eligible = (squad || []).filter((p) => p.injuryDays <= 0);
  const recs = eligible
    .map((p) => analyzePlayerTrainingNeed(p, eligible, drillsMap, opts))
    .filter(Boolean)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);

  return {
    recs,
    hasAnalyst: Boolean(staffBonuses?.hasAnalyst),
    analystName: staffBonuses?.analystName || null,
    detailLevel: staffBonuses?.hasAnalyst ? "full" : "basic",
  };
}

/** จัดคิวท่าซ้อมตามจุดอ่อนของกลุ่มตำแหน่ง (สูงสุด maxDrills) */
export function suggestDrillPlanForGroup(group, squad, drillsMap, maxDrills = 6) {
  const groupSquad = (squad || []).filter((p) => p.position === group && p.injuryDays <= 0);
  if (!groupSquad.length) return [];

  const attrScores = {};
  groupSquad.forEach((p) => {
    const need = analyzePlayerTrainingNeed(p, groupSquad, drillsMap);
    (need?.weakAttrs || []).forEach(({ attr, gap }) => {
      attrScores[attr] = (attrScores[attr] || 0) + gap;
    });
  });

  const topAttrs = Object.entries(attrScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([attr]) => attr);

  const plan = [];
  topAttrs.forEach((attr) => {
    drillsForAttr(attr, group, drillsMap, 2).forEach(({ id }) => {
      if (!plan.includes(id) && drillsMap[id]?.groups?.includes(group)) plan.push(id);
    });
  });

  if (plan.length < 3) {
    Object.keys(drillsMap || {}).forEach((id) => {
      if (plan.length >= maxDrills) return;
      if (drillsMap[id].groups?.includes(group) && !plan.includes(id)) plan.push(id);
    });
  }

  return plan.slice(0, maxDrills);
}

export function formatDeltaSummary(deltas, attrLabel, max = 3) {
  return Object.entries(deltas || {})
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, max)
    .map(([k, v]) => `${attrLabel?.(k) || k} ${v > 0 ? "+" : ""}${v.toFixed(2)}`)
    .join(" · ");
}
