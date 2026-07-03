import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getStakeStatus,
  joinStakeLeague,
  fillBotsAndStart,
  setStakeLineup,
} from "../services/stakeService.js";
import { prisma } from "../db.js";

const router = Router();

/* สถานะลีคเดิมพันของฉัน + ลีคที่เปิดรับสมัคร */
router.get("/status", requireAuth, async (req, res) => {
  try {
    res.json(await getStakeStatus(req.user.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* สมัครเข้าลีค: { playerIds: string[], managerCard: {...}, formation } */
router.post("/join", requireAuth, async (req, res) => {
  try {
    res.json(await joinStakeLeague(req.user.id, req.body || {}));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* เติมบอทให้ครบ 16 ทีมแล้วเริ่มเลย */
router.post("/fill-bots", requireAuth, async (req, res) => {
  try {
    res.json(await fillBotsAndStart(req.user.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* จัดทีม: { lineup: string[], formation, autoMode } */
router.patch("/lineup", requireAuth, async (req, res) => {
  try {
    res.json(await setStakeLineup(req.user.id, req.body || {}));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ผลการแข่งขันของรอบใดรอบหนึ่ง */
router.get("/:leagueId/matches", requireAuth, async (req, res) => {
  try {
    const round = req.query.round ? Number(req.query.round) : undefined;
    const matches = await prisma.stakeMatch.findMany({
      where: { leagueId: req.params.leagueId, ...(round ? { round } : {}) },
      orderBy: [{ round: "asc" }],
    });
    const entries = await prisma.stakeEntry.findMany({
      where: { leagueId: req.params.leagueId },
      select: { id: true, name: true, shortCode: true, primaryColor: true },
    });
    const byId = Object.fromEntries(entries.map((e) => [e.id, e]));
    res.json({
      matches: matches.map((m) => ({
        round: m.round, played: m.played,
        home: byId[m.homeEntryId], away: byId[m.awayEntryId],
        homeGoals: m.homeGoals, awayGoals: m.awayGoals,
      })),
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
