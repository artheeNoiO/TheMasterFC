import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getBattlePassStatus, claimBattlePassTier } from "../services/battlePassService.js";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  try {
    const status = await getBattlePassStatus(req.user.id);
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: e.message || "โหลด Battle Pass ไม่สำเร็จ" });
  }
});

router.post("/claim", requireAuth, async (req, res) => {
  try {
    const { tier } = req.body ?? {};
    if (!Number.isInteger(tier)) return res.status(400).json({ error: "ต้องมี tier" });
    const reward = await claimBattlePassTier(req.user.id, tier);
    res.json({ reward });
  } catch (e) {
    res.status(400).json({ error: e.message || "รับรางวัลไม่สำเร็จ" });
  }
});

export default router;
