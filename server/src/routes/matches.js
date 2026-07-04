import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  finishUserLiveMatch,
  getUserMatchToday,
  prepareUserLiveMatch,
} from "../services/gameService.js";

const router = Router();

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
