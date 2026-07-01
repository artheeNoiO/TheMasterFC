import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/dev-register", async (req, res) => {
  if (process.env.SUPABASE_URL) {
    return res.status(400).json({ error: "ใช้ Supabase Auth แทนใน production" });
  }
  const { email, displayName } = req.body ?? {};
  if (!email) return res.status(400).json({ error: "ต้องมี email" });
  const id = `dev_${Buffer.from(email).toString("base64url").slice(0, 16)}`;
  const user = await prisma.user.upsert({
    where: { email },
    update: { displayName: displayName ?? null },
    create: { id, email, displayName: displayName ?? null },
  });
  res.json({ user, token: `dev:${user.id}` });
});

router.get("/me", requireAuth, async (req, res) => {
  res.json({
    user: req.user,
    unlock: {
      onlineUnlocked: req.user.onlineUnlocked,
      playMode: req.user.playMode,
      requiredTeamValue: 50_000_000,
    },
  });
});

router.post("/unlock-online", requireAuth, async (req, res) => {
  const { teamValue } = req.body ?? {};
  if (typeof teamValue !== "number") {
    return res.status(400).json({ error: "ต้องส่ง teamValue (มูลค่าสโมสรรวมทุกอย่าง)" });
  }
  if (teamValue < 50_000_000) {
    return res.status(400).json({ error: "มูลค่าสโมสรรวมยังไม่ถึง 50M" });
  }
  if (teamValue < 0) {
    return res.status(400).json({ error: "มูลค่าสโมสรรวมติดลบ" });
  }
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { onlineUnlocked: true, onlineUnlockedAt: new Date(), playMode: "online" },
  });
  res.json({ user, ok: true });
});

export default router;
