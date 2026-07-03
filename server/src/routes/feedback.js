import { Router } from "express";
import { createFeedback, listFeedback, voteFeedback } from "../services/feedbackService.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const voterKey = String(req.query.voterKey || "");
    const entries = await listFeedback(voterKey);
    res.json({ entries });
  } catch (e) {
    res.status(500).json({ error: e.message || "โหลด feedback ไม่สำเร็จ" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { author, body } = req.body ?? {};
    const entry = await createFeedback({ author, body });
    res.status(201).json({ entry });
  } catch (e) {
    res.status(400).json({ error: e.message || "ส่ง feedback ไม่สำเร็จ" });
  }
});

router.post("/:id/vote", async (req, res) => {
  try {
    const { voterKey, vote } = req.body ?? {};
    const entry = await voteFeedback(req.params.id, voterKey, vote);
    res.json({ entry });
  } catch (e) {
    res.status(400).json({ error: e.message || "โหวตไม่สำเร็จ" });
  }
});

export default router;
