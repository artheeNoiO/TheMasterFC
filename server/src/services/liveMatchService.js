import { getBestXI, simulateInstant } from "@siam/game-engine";
import { prisma } from "../db.js";
import { GAME_MINUTE_REAL_SECONDS, MATCH_REAL_DURATION_MS, MAX_SUBS_PER_MATCH, isMatchWindowOpen } from "../../../game-version.js";
import { awardMatchXp } from "./battlePassService.js";

/** อารมณ์ทีมสั่งกลางแมท — คูณเข้ากับจำนวนประตูที่เหลือของทีมตัวเอง (ง่ายและปลอดภัยกว่าไปแก้ formula ใน game-engine) */
const MENTALITY_OWN_MULT = { attacking: 1.2, balanced: 1, defensive: 0.8 };
export const MATCH_MENTALITIES = Object.keys(MENTALITY_OWN_MULT);

/** สุ่มนาทีประตู — ครึ่งหลังมีโอกาสถี่กว่าครึ่งแรกเล็กน้อย (t^0.85 เอนไปทาง fromMinute+span) เหมือนจังหวะฟุตบอลจริง */
function randomGoalMinute(fromMinute) {
  const span = Math.max(1, 90 - fromMinute);
  const biased = Math.random() ** 0.85;
  return Math.min(90, Math.max(fromMinute + 1, Math.round(fromMinute + biased * span)));
}

/** สร้างสคริปต์เหตุการณ์ประตู [{minute, side}] จากจำนวนประตูที่ตัดสินไว้แล้ว ในช่วง (fromMinute, 90] */
export function generateEventScript({ homeGoals, awayGoals, fromMinute = 0 }) {
  const events = [];
  for (let i = 0; i < homeGoals; i += 1) events.push({ minute: randomGoalMinute(fromMinute), side: "home" });
  for (let i = 0; i < awayGoals; i += 1) events.push({ minute: randomGoalMinute(fromMinute), side: "away" });
  events.sort((a, b) => a.minute - b.minute);
  return events;
}

/** สถานะสด ณ ตอนนี้ คำนวณจาก kickoffAt + eventsJson ล้วนๆ (ไม่มีโพรเซสรันค้าง — ปลอดภัยต่อ cron/รีสตาร์ท) */
export function computeLiveState(match, now = Date.now()) {
  if (!match.kickoffAt) {
    return { status: "scheduled", minute: 0, homeGoals: 0, awayGoals: 0, events: [], finished: false };
  }
  const elapsedMs = now - new Date(match.kickoffAt).getTime();
  const minute = Math.min(90, Math.max(0, Math.floor(elapsedMs / (GAME_MINUTE_REAL_SECONDS * 1000))));
  const finished = elapsedMs >= MATCH_REAL_DURATION_MS;
  const events = match.eventsJson ? JSON.parse(match.eventsJson) : [];
  const upToNow = events.filter((e) => e.minute <= minute);
  return {
    status: finished ? "finished" : "live",
    minute,
    homeGoals: upToNow.filter((e) => e.side === "home").length,
    awayGoals: upToNow.filter((e) => e.side === "away").length,
    events: upToNow,
    finished,
  };
}

function resolveXI(club, players) {
  const lineup = club.lineupJson ? JSON.parse(club.lineupJson) : [];
  return lineup.length ? lineup.slice(0, 11) : getBestXI(players, club.formation);
}

function clubToEngine(club) {
  return {
    id: club.id,
    formation: club.formation,
    chemistry: club.chemistry,
    manager: club.managerJson ? JSON.parse(club.managerJson) : null,
    tier: club.tier,
  };
}

function playerToEngine(p) {
  return { ...p, clubId: p.clubId, attrs: JSON.parse(p.attrs), teamId: p.clubId };
}

/** คิกอฟทุกแมทของวันนั้นในชาร์ดพร้อมกัน — ล็อก XI, สุ่มจำนวนประตูด้วยโมเดลเดิม (simulateInstant), แจกเป็นนาทีเพื่อเล่นแบบเรียลไทม์ */
export async function kickOffRoundMatches(shardId, dayNumber) {
  const matches = await prisma.match.findMany({
    where: { shardId, dayNumber, played: false, status: "scheduled" },
  });
  if (matches.length === 0) return { kicked: 0 };

  const clubs = await prisma.club.findMany({ where: { shardId }, include: { players: true } });
  const clubsById = Object.fromEntries(clubs.map((c) => [c.id, c]));
  const now = new Date();

  for (const match of matches) {
    const homeClub = clubsById[match.homeClubId];
    const awayClub = clubsById[match.awayClubId];
    const homePlayers = homeClub.players.map(playerToEngine);
    const awayPlayers = awayClub.players.map(playerToEngine);
    const homeXI = resolveXI(homeClub, homePlayers);
    const awayXI = resolveXI(awayClub, awayPlayers);
    const { homeGoals, awayGoals, xgHome, xgAway } = simulateInstant(
      clubToEngine(homeClub), homePlayers, homeXI,
      clubToEngine(awayClub), awayPlayers, awayXI,
      homeClub.chemistry, awayClub.chemistry,
    );
    const events = generateEventScript({ homeGoals, awayGoals, fromMinute: 0 });
    await prisma.match.update({
      where: { id: match.id },
      data: {
        status: "live",
        kickoffAt: now,
        eventsJson: JSON.stringify(events),
        homeXIJson: JSON.stringify(homeXI),
        awayXIJson: JSON.stringify(awayXI),
        homeGoals,
        awayGoals,
        // เก็บ xG ไว้ใน events ชั่วคราวไม่ได้ (ใช้ที่อื่นผ่าน roadmap เดิม) — ปล่อยให้ finalize อ่านจาก homeGoals/awayGoals ที่ล็อกไว้ตรงนี้
      },
    });
    void xgHome; void xgAway; // xG ไม่ได้ persist ในรอบนี้ — ของเดิม (finishUserLiveMatch) เก็บผ่าน pendingXg คนละกลไก ไม่ผูกกับ auto-kickoff รอบแรก
  }
  return { kicked: matches.length };
}

function applyStandingResult(standing, gf, ga) {
  const next = { ...standing };
  next.played += 1;
  next.gf += gf;
  next.ga += ga;
  if (gf > ga) { next.w += 1; next.pts += 3; }
  else if (gf < ga) { next.l += 1; }
  else { next.d += 1; next.pts += 1; }
  return { played: next.played, w: next.w, d: next.d, l: next.l, gf: next.gf, ga: next.ga, pts: next.pts };
}

function applyMatchWearLocal(squad, xiIds) {
  squad.forEach((p) => {
    if (xiIds.includes(p.id)) {
      p.stamina = Math.max(5, Math.min(100, p.stamina - Math.floor(Math.random() * 9) - 10));
      p.careerApps = (p.careerApps || 0) + 1;
      if (Math.random() < Math.min(0.07, Math.max(0.003, (100 - p.stamina) / 100 * 0.06 + 0.004))) {
        p.injuryDays = Math.max(1, Math.floor(Math.random() * 7) + 1);
      }
    }
  });
}

/** ปิดจบแมทที่เตะครบ 90 นาที (ตามเวลาจริง) แล้ว — สกอร์ล็อกไว้ตั้งแต่ตอนคิกอฟแล้ว แค่บันทึกผลลงตาราง/สภาพนักเตะ
 * เรียกจาก day-tick ทุกครั้ง เป็น idempotent (เช็ค status==="live" && finished เท่านั้น ไม่แตะแมทที่ finalize ไปแล้ว) */
export async function finalizeFinishedMatches(shardId, dayNumber) {
  const liveMatches = await prisma.match.findMany({ where: { shardId, dayNumber, status: "live", played: false } });
  const toFinalize = liveMatches.filter((m) => computeLiveState(m).finished);
  if (toFinalize.length === 0) return { finalized: 0 };

  const clubs = await prisma.club.findMany({ where: { shardId }, include: { players: true, standing: true } });
  const clubsById = Object.fromEntries(clubs.map((c) => [c.id, c]));
  const dirtyPlayers = new Map();

  for (const match of toFinalize) {
    const homeClub = clubsById[match.homeClubId];
    const awayClub = clubsById[match.awayClubId];
    const homeXI = match.homeXIJson ? JSON.parse(match.homeXIJson) : [];
    const awayXI = match.awayXIJson ? JSON.parse(match.awayXIJson) : [];

    await prisma.match.update({ where: { id: match.id }, data: { played: true, status: "finished" } });
    await prisma.standing.update({ where: { id: homeClub.standing.id }, data: applyStandingResult(homeClub.standing, match.homeGoals, match.awayGoals) });
    await prisma.standing.update({ where: { id: awayClub.standing.id }, data: applyStandingResult(awayClub.standing, match.awayGoals, match.homeGoals) });

    const homeResult = match.homeGoals > match.awayGoals ? "win" : match.homeGoals < match.awayGoals ? "loss" : "draw";
    const awayResult = homeResult === "win" ? "loss" : homeResult === "loss" ? "win" : "draw";
    if (homeClub.userId) await awardMatchXp(homeClub.userId, homeResult);
    if (awayClub.userId) await awardMatchXp(awayClub.userId, awayResult);

    const homeSquad = homeClub.players.map(playerToEngine);
    const awaySquad = awayClub.players.map(playerToEngine);
    applyMatchWearLocal(homeSquad, homeXI);
    applyMatchWearLocal(awaySquad, awayXI);
    homeSquad.forEach((p) => dirtyPlayers.set(p.id, p));
    awaySquad.forEach((p) => dirtyPlayers.set(p.id, p));
  }

  for (const p of dirtyPlayers.values()) {
    await prisma.player.update({
      where: { id: p.id },
      data: { stamina: p.stamina, injuryDays: p.injuryDays, careerApps: p.careerApps },
    });
  }

  return { finalized: toFinalize.length };
}

/** เปลี่ยนตัวระหว่างแมทสด — ตัดต่อสคริปต์เหตุการณ์ใหม่จากนาทีปัจจุบันด้วย XI ที่อัปเดตแล้ว (ประตูที่เกิดไปแล้วคงเดิมเสมอ) */
export async function submitSubstitution(userId, matchId, { outPlayerId, inPlayerId }) {
  const club = await prisma.club.findFirst({ where: { userId } });
  if (!club) throw new Error("ไม่พบสโมสร");

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error("ไม่พบแมตช์");
  if (match.homeClubId !== club.id && match.awayClubId !== club.id) throw new Error("ไม่ใช่แมตช์ของคุณ");

  const live = computeLiveState(match);
  if (live.status !== "live") throw new Error("แมตช์นี้ไม่ได้กำลังแข่งสดอยู่");

  const isHome = match.homeClubId === club.id;
  const subsUsed = isHome ? match.homeSubsUsed : match.awaySubsUsed;
  if (subsUsed >= MAX_SUBS_PER_MATCH) throw new Error(`เปลี่ยนตัวครบ ${MAX_SUBS_PER_MATCH} คนแล้ว`);

  const xiJson = isHome ? match.homeXIJson : match.awayXIJson;
  const xi = xiJson ? JSON.parse(xiJson) : [];
  if (!xi.includes(outPlayerId)) throw new Error("นักเตะที่จะเปลี่ยนออกไม่ได้อยู่ใน 11 ตัวจริง");
  if (xi.includes(inPlayerId)) throw new Error("นักเตะที่จะส่งลงอยู่ในสนามอยู่แล้ว");

  const squad = await prisma.player.findMany({ where: { clubId: club.id } });
  const inPlayer = squad.find((p) => p.id === inPlayerId);
  if (!inPlayer) throw new Error("ไม่พบนักเตะที่จะส่งลงในทีมนี้");
  if ((inPlayer.injuryDays || 0) > 0) throw new Error("นักเตะคนนี้บาดเจ็บอยู่ ลงสนามไม่ได้");

  const newXI = xi.map((id) => (id === outPlayerId ? inPlayerId : id));

  const opponentClubId = isHome ? match.awayClubId : match.homeClubId;
  const [myClub, oppClub, myPlayers, oppPlayers] = await Promise.all([
    prisma.club.findUnique({ where: { id: club.id } }),
    prisma.club.findUnique({ where: { id: opponentClubId } }),
    prisma.player.findMany({ where: { clubId: club.id } }),
    prisma.player.findMany({ where: { clubId: opponentClubId } }),
  ]);
  const oppXIJson = isHome ? match.awayXIJson : match.homeXIJson;
  const oppXI = oppXIJson ? JSON.parse(oppXIJson) : resolveXI(oppClub, oppPlayers.map(playerToEngine));

  // คำนวณ xG ที่เหลือใหม่ด้วย XI ที่อัปเดต แล้วสุ่มจำนวนประตู "ส่วนที่เหลือ" ใหม่ (ประตูที่เกิดไปแล้วก่อนนาทีนี้ไม่แตะ)
  const remainingFraction = Math.max(0, (90 - live.minute) / 90);
  const sim = simulateInstant(
    clubToEngine(isHome ? myClub : oppClub),
    (isHome ? myPlayers : oppPlayers).map(playerToEngine),
    isHome ? newXI : oppXI,
    clubToEngine(isHome ? oppClub : myClub),
    (isHome ? oppPlayers : myPlayers).map(playerToEngine),
    isHome ? oppXI : newXI,
    myClub.chemistry, oppClub.chemistry,
  );
  const remainingHomeGoals = Math.round((isHome ? sim.homeGoals : sim.awayGoals) * remainingFraction);
  const remainingAwayGoals = Math.round((isHome ? sim.awayGoals : sim.homeGoals) * remainingFraction);

  const pastEvents = live.events; // ประตูที่เกิดไปแล้วจนถึงนาทีปัจจุบัน คงเดิมเสมอ
  const futureEvents = generateEventScript({
    homeGoals: remainingHomeGoals, awayGoals: remainingAwayGoals, fromMinute: live.minute,
  });
  const newEvents = [...pastEvents, ...futureEvents].sort((a, b) => a.minute - b.minute);

  await prisma.match.update({
    where: { id: matchId },
    data: {
      eventsJson: JSON.stringify(newEvents),
      ...(isHome
        ? { homeXIJson: JSON.stringify(newXI), homeSubsUsed: subsUsed + 1 }
        : { awayXIJson: JSON.stringify(newXI), awaySubsUsed: subsUsed + 1 }),
    },
  });

  return { ok: true, subsUsed: subsUsed + 1, maxSubs: MAX_SUBS_PER_MATCH };
}

/** สั่งอารมณ์ทีมกลางแมทสด (บุก/สมดุล/รับ) — ตัดต่อสคริปต์เหตุการณ์ส่วนที่เหลือใหม่ด้วยตัวคูณอารมณ์ทีม
 * (ประตูที่เกิดไปแล้วคงเดิมเสมอ เหมือน submitSubstitution) */
export async function setMatchMentality(userId, matchId, mentality) {
  if (!MATCH_MENTALITIES.includes(mentality)) {
    throw new Error(`อารมณ์ทีมต้องเป็นหนึ่งใน ${MATCH_MENTALITIES.join(", ")}`);
  }
  const club = await prisma.club.findFirst({ where: { userId } });
  if (!club) throw new Error("ไม่พบสโมสร");

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error("ไม่พบแมตช์");
  if (match.homeClubId !== club.id && match.awayClubId !== club.id) throw new Error("ไม่ใช่แมตช์ของคุณ");

  const live = computeLiveState(match);
  if (live.status !== "live") throw new Error("แมตช์นี้ไม่ได้กำลังแข่งสดอยู่");

  const isHome = match.homeClubId === club.id;

  const [homeClub, awayClub, homePlayers, awayPlayers] = await Promise.all([
    prisma.club.findUnique({ where: { id: match.homeClubId } }),
    prisma.club.findUnique({ where: { id: match.awayClubId } }),
    prisma.player.findMany({ where: { clubId: match.homeClubId } }),
    prisma.player.findMany({ where: { clubId: match.awayClubId } }),
  ]);
  const homeXI = match.homeXIJson ? JSON.parse(match.homeXIJson) : resolveXI(homeClub, homePlayers.map(playerToEngine));
  const awayXI = match.awayXIJson ? JSON.parse(match.awayXIJson) : resolveXI(awayClub, awayPlayers.map(playerToEngine));

  const sim = simulateInstant(
    clubToEngine(homeClub), homePlayers.map(playerToEngine), homeXI,
    clubToEngine(awayClub), awayPlayers.map(playerToEngine), awayXI,
    homeClub.chemistry, awayClub.chemistry,
  );

  const remainingFraction = Math.max(0, (90 - live.minute) / 90);
  const newHomeMentality = isHome ? mentality : match.homeMentality;
  const newAwayMentality = isHome ? match.awayMentality : mentality;
  const remainingHomeGoals = Math.round(sim.homeGoals * remainingFraction * MENTALITY_OWN_MULT[newHomeMentality]);
  const remainingAwayGoals = Math.round(sim.awayGoals * remainingFraction * MENTALITY_OWN_MULT[newAwayMentality]);

  const pastEvents = live.events;
  const futureEvents = generateEventScript({
    homeGoals: remainingHomeGoals, awayGoals: remainingAwayGoals, fromMinute: live.minute,
  });
  const newEvents = [...pastEvents, ...futureEvents].sort((a, b) => a.minute - b.minute);

  await prisma.match.update({
    where: { id: matchId },
    data: {
      eventsJson: JSON.stringify(newEvents),
      ...(isHome ? { homeMentality: mentality } : { awayMentality: mentality }),
    },
  });

  return { ok: true, mentality };
}

/** รายชื่อแมทสด/รอคิกอฟวันนี้ในชาร์ด — ใครก็ดูได้ (สเปคเทตทีมอื่น) */
export async function getShardMatchesToday(shardId, dayNumber) {
  const matches = await prisma.match.findMany({
    where: { shardId, dayNumber },
    include: {
      homeClub: { select: { id: true, name: true, shortCode: true, primaryColor: true, isBot: true } },
      awayClub: { select: { id: true, name: true, shortCode: true, primaryColor: true, isBot: true } },
    },
  });
  return matches.map((m) => ({
    matchId: m.id,
    home: m.homeClub,
    away: m.awayClub,
    ...computeLiveState(m),
    kickoffAt: m.kickoffAt,
  }));
}

export { isMatchWindowOpen };
