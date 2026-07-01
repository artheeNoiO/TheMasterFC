import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createClubForUser, getClubForUser } from "../services/gameService.js";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  const club = await getClubForUser(req.user.id);
  res.json({
    club,
    playMode: req.user.playMode,
    onlineUnlocked: req.user.onlineUnlocked,
  });
});

router.post("/", requireAuth, async (req, res) => {
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

export default router;
