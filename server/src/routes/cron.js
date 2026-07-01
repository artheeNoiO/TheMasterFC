import { Router } from "express";
import { requireCronSecret } from "../middleware/auth.js";
import { runDayTickAll } from "../services/gameService.js";

const router = Router();

router.post("/day-tick", requireCronSecret, async (_req, res) => {
  const results = await runDayTickAll();
  res.json({ ok: true, at: new Date().toISOString(), results });
});

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "the-socker-manager-server" });
});

export default router;
