import { randomUUID } from "crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../db.js";
import { requireAuth, requireProvisionSecret } from "../middleware/auth.js";
import { signAuthToken } from "../lib/auth-token.js";
import {
  hashPassword,
  normalizeUsername,
  toPublicUser,
  validatePassword,
  validateUsername,
  verifyPassword,
} from "../lib/auth-utils.js";

/* จำกัดคำขอ auth (register/login/dev-register) กันการยิงสุ่ม/brute-force */
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "ส่งคำขอถี่เกินไป กรุณาลองใหม่ภายหลัง" },
});

const router = Router();

router.post("/register", authLimiter, async (req, res) => {
  const { username: rawUsername, password, displayName } = req.body ?? {};
  const username = normalizeUsername(rawUsername);
  const userErr = validateUsername(username);
  if (userErr) return res.status(400).json({ error: userErr });
  const passErr = validatePassword(password);
  if (passErr) return res.status(400).json({ error: passErr });

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return res.status(409).json({ error: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      id: `usr_${randomUUID()}`,
      username,
      passwordHash,
      displayName: (displayName || username).trim().slice(0, 32) || username,
      authProvider: "local",
      onlineUnlocked: true,
      onlineUnlockedAt: new Date(),
      playMode: "online",
    },
  });

  res.status(201).json({ user: toPublicUser(user), token: signAuthToken(user.id) });
});

router.post("/login", authLimiter, async (req, res) => {
  const { username: rawUsername, password } = req.body ?? {};
  const username = normalizeUsername(rawUsername);
  if (!username || !password) {
    return res.status(400).json({ error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });
  }

  const row = await prisma.user.findUnique({ where: { username } });
  if (!row?.passwordHash) {
    return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
  }
  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });

  res.json({ user: toPublicUser(row), token: signAuthToken(row.id) });
});

router.post("/dev-register", authLimiter, async (req, res) => {
  // Structurally unreachable in production regardless of DB/Supabase configuration —
  // this endpoint mints an account from just an email with no password.
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }
  const { email, displayName } = req.body ?? {};
  if (!email) return res.status(400).json({ error: "ต้องมี email" });
  const id = `dev_${Buffer.from(email).toString("base64url").slice(0, 16)}`;
  const user = await prisma.user.upsert({
    where: { email },
    update: { displayName: displayName ?? null },
    create: { id, email, displayName: displayName ?? null, authProvider: "dev" },
  });
  res.json({ user: toPublicUser(user), token: signAuthToken(user.id) });
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
  const betaFree = process.env.ONLINE_BETA_FREE === "1" || process.env.ONLINE_BETA_FREE === "true";
  if (typeof teamValue !== "number") {
    return res.status(400).json({ error: "ต้องส่ง teamValue (มูลค่าสโมสรรวมทุกอย่าง)" });
  }
  if (!betaFree && teamValue < 50_000_000) {
    return res.status(400).json({ error: "มูลค่าสโมสรรวมยังไม่ถึง 50M" });
  }
  if (teamValue < 0) {
    return res.status(400).json({ error: "มูลค่าสโมสรรวมติดลบ" });
  }
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { onlineUnlocked: true, onlineUnlockedAt: new Date(), playMode: "online" },
  });
  res.json({ user: toPublicUser(user), ok: true });
});

/** Cloudflare Pages → sync Game ID user into Prisma + issue JWT */
router.post("/provision", requireProvisionSecret, async (req, res) => {
  const { id, username, displayName, onlineUnlocked, playMode } = req.body ?? {};
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "ต้องมี id" });
  }
  const user = await prisma.user.upsert({
    where: { id },
    update: {
      username: username ?? undefined,
      displayName: displayName ?? undefined,
      onlineUnlocked: onlineUnlocked ?? undefined,
      playMode: playMode ?? undefined,
      authProvider: "gameid",
    },
    create: {
      id,
      username: username ?? null,
      displayName: displayName ?? username ?? null,
      authProvider: "gameid",
      onlineUnlocked: Boolean(onlineUnlocked),
      playMode: playMode === "online" ? "online" : "sandbox",
    },
  });
  res.json({ user: toPublicUser(user), token: signAuthToken(user.id) });
});

export default router;
