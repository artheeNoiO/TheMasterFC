import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getClubForUser, getLeagueTable, getTodayMatches, runDayTickForShard } from "../services/gameService.js";

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

export default router;
