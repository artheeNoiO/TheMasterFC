import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  finishUserLiveMatch,
  getUserMatchToday,
  prepareUserLiveMatch,
  getClubForUser,
  getShardNextKickoffEtaMs,
} from "../services/gameService.js";
import {
  getShardMatchesToday,
  computeLiveState,
  submitSubstitution,
} from "../services/liveMatchService.js";
import { prisma } from "../db.js";

const router = Router();

/** รายชื่อแมทวันนี้ทั้งชาร์ด (ของตัวเองปนคนอื่น) — ใครก็ดูได้ ใช้เลือกว่าจะสเปคเทตแมทไหน */
router.get("/shard-today", requireAuth, async (req, res) => {
  try {
    const club = await getClubForUser(req.user.id);
    if (!club) return res.json({ matches: [] });
    const matches = await getShardMatchesToday(club.shardId, club.shard.dayNumber);
    const nextKickoffEtaMs = getShardNextKickoffEtaMs(club.shardId);
    res.json({ day: club.shard.dayNumber, matches, nextKickoffEtaMs });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** สถานะสดของแมทไหนก็ได้ในชาร์ดเดียวกับตัวเอง — สำหรับสเปคเทต (ไม่ต้องเป็นเจ้าของแมทนั้น) */
router.get("/live/:matchId", requireAuth, async (req, res) => {
  try {
    const club = await getClubForUser(req.user.id);
    if (!club) return res.status(404).json({ error: "ไม่พบสโมสร" });
    const match = await prisma.match.findUnique({
      where: { id: req.params.matchId },
      include: {
        homeClub: { select: { id: true, name: true, shortCode: true, primaryColor: true, isBot: true } },
        awayClub: { select: { id: true, name: true, shortCode: true, primaryColor: true, isBot: true } },
      },
    });
    if (!match || match.shardId !== club.shardId) return res.status(404).json({ error: "ไม่พบแมตช์" });
    res.json({
      matchId: match.id,
      home: match.homeClub,
      away: match.awayClub,
      ...computeLiveState(match),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** เปลี่ยนตัวระหว่างแมทสด — เฉพาะแมทของทีมตัวเอง จำกัด MAX_SUBS_PER_MATCH ครั้ง */
router.post("/:matchId/substitute", requireAuth, async (req, res) => {
  try {
    const { outPlayerId, inPlayerId } = req.body || {};
    if (!outPlayerId || !inPlayerId) return res.status(400).json({ error: "ต้องระบุ outPlayerId และ inPlayerId" });
    const result = await submitSubstitution(req.user.id, req.params.matchId, { outPlayerId, inPlayerId });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/my-today", requireAuth, async (req, res) => {
  try {
    const state = await getUserMatchToday(req.user.id);
    if (!state) return res.json({ club: null, match: null });
    res.json({
      club: state.club,
      day: state.day,
      season: state.season,
      match: state.match
        ? {
            id: state.match.id,
            played: state.match.played,
            homeGoals: state.match.homeGoals,
            awayGoals: state.match.awayGoals,
            isHome: state.isHome,
            homeClubId: state.match.homeClubId,
            awayClubId: state.match.awayClubId,
          }
        : null,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/kickoff", requireAuth, async (req, res) => {
  try {
    const payload = await prepareUserLiveMatch(req.user.id);
    res.json(payload);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:matchId/finish", requireAuth, async (req, res) => {
  try {
    // ไม่รับ/ไม่อ่านค่าใดๆ จาก req.body อีกต่อไป — ผลแมตช์ต้องมาจากที่เซิร์ฟเวอร์ล็อกไว้ตอน kickoff เท่านั้น
    const result = await finishUserLiveMatch(req.user.id, req.params.matchId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
