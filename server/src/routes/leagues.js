import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getClubForUser, getLeagueTable, getTodayMatches, getShardRoster, runDayTickForShard } from "../services/gameService.js";
import { getShardMatchesToday } from "../services/liveMatchService.js";

const router = Router();

router.post("/:shardId/advance-day", requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_MANUAL_TICK !== "1") {
    return res.status(403).json({ error: "Manual tick disabled — ใช้ cron รันวันถัดไป" });
  }
  const club = await getClubForUser(req.user.id);
  if (!club || club.shardId !== req.params.shardId) {
    return res.status(403).json({ error: "ไม่มีสิทธิ์" });
  }
  const result = await runDayTickForShard(club.shardId, { force: true });
  res.json({ ok: true, result });
});

router.get("/:shardId/table", requireAuth, async (req, res) => {
  const table = await getLeagueTable(req.params.shardId, req.user.id);
  res.json({ table });
});

router.get("/:shardId/fixtures/today", requireAuth, async (req, res) => {
  const club = await getClubForUser(req.user.id);
  if (!club || club.shardId !== req.params.shardId) {
    return res.status(403).json({ error: "ไม่มีสิทธิ์ดูลีกนี้" });
  }
  const matches = await getTodayMatches(club.shardId, club.shard.dayNumber);
  res.json({ day: club.shard.dayNumber, season: club.shard.seasonNumber, matches });
});

/* สกอร์สดของทุกแมทวันนี้ในชาร์ด (คำนวณจาก kickoffAt+eventsJson แบบ elapsed time) — ดูได้ทุกคนรวมทั้งแมทของทีมอื่น */
router.get("/:shardId/matches/live", requireAuth, async (req, res) => {
  const club = await getClubForUser(req.user.id);
  if (!club || club.shardId !== req.params.shardId) {
    return res.status(403).json({ error: "ไม่มีสิทธิ์ดูลีกนี้" });
  }
  const matches = await getShardMatchesToday(club.shardId, club.shard.dayNumber);
  res.json({ day: club.shard.dayNumber, matches });
});

/* ผู้เล่นทุกทีมในชาร์ดเดียวกัน (ยกเว้นทีมตัวเอง) — สำหรับหน้าตลาด/เสนอซื้อตรง */
router.get("/:shardId/roster", requireAuth, async (req, res) => {
  const club = await getClubForUser(req.user.id);
  if (!club || club.shardId !== req.params.shardId) {
    return res.status(403).json({ error: "ไม่มีสิทธิ์ดูลีกนี้" });
  }
  const roster = await getShardRoster(club.shardId, club.id);
  res.json({ clubs: roster });
});

export default router;
