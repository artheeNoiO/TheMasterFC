import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.js";
import { createClubForUser, getClubForUser, updateClubTactics, patchUserRoadmap } from "../services/gameService.js";

const router = Router();

const createClubLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "ส่งคำขอถี่เกินไป กรุณาลองใหม่ภายหลัง" },
});

router.get("/me", requireAuth, async (req, res) => {
  const club = await getClubForUser(req.user.id);
  res.json({
    club,
    staffDraws: club?.staffDraws,
    roadmap: club?.roadmap,
    playMode: req.user.playMode,
    onlineUnlocked: req.user.onlineUnlocked,
  });
});

router.post("/me/roadmap", requireAuth, async (req, res) => {
  try {
    const { action, ...payload } = req.body ?? {};
    if (!action) return res.status(400).json({ error: "ต้องมี action" });
    const roadmap = await patchUserRoadmap(req.user.id, action, payload);
    res.json({ roadmap });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/", requireAuth, createClubLimiter, async (req, res) => {
  try {
    const { name, short, primaryColor, secondaryColor, shirtColor, shortsColor, logoIndex } = req.body ?? {};
    if (!name || !short || !primaryColor) {
      return res.status(400).json({ error: "ต้องมี name, short, primaryColor" });
    }
    const club = await createClubForUser(req.user.id, {
      name, short, primaryColor,
      secondaryColor: secondaryColor ?? "#f2f0e6",
      shirtColor, shortsColor,
      logoIndex: logoIndex ?? 0,
    });
    res.status(201).json({ club });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/me/tactics", requireAuth, async (req, res) => {
  try {
    const club = await updateClubTactics(req.user.id, req.body ?? {});
    res.json({ club });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
