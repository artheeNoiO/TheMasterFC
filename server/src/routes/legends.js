import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getClubForUser } from "../services/gameService.js";
import { acquireLegend, listLegendsForShard } from "../services/legendService.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const club = await getClubForUser(req.user.id);
    if (!club?.shardId) return res.json({ legends: [] });
    const legends = await listLegendsForShard(club.shardId);
    res.json({ legends, legendLeagueId: club.shard?.legendLeagueId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:legendId/acquire", requireAuth, async (req, res) => {
  try {
    const result = await acquireLegend(req.user.id, req.params.legendId);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
