import { timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../db.js";
import { toPublicUser } from "../lib/auth-utils.js";
import { signAuthToken, verifyAuthToken } from "../lib/auth-token.js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

async function loadUserById(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return toPublicUser(user);
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "ต้องล็อกอินก่อน" });
  }
  const token = header.slice(7);

  try {
    // Signed, expiring token — เดิมออกโดยเซิร์ฟเวอร์นี้เอง (register/login/dev-register) หรือโดย
    // Cloudflare Pages Function (client/functions/lib/auth-cf.js) ซึ่งเซ็นด้วย AUTH_TOKEN_SECRET
    // ตัวเดียวกัน จึง verify ผ่านจุดเดียวกันนี้ได้ตรงๆ — เอา fallback "game:<userId>" แบบไม่เซ็น
    // ออกแล้ว (เคยเป็นช่องโหว่ปลอม token ได้ทุกคน กันไว้ตอน Cloudflare ยังไม่เซ็น token)
    const userId = verifyAuthToken(token);
    if (userId) {
      const user = await loadUserById(userId);
      if (!user) return res.status(401).json({ error: "ไม่พบผู้ใช้" });
      req.user = user;
      return next();
    }

    if (supabase) {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        return res.status(401).json({ error: "โทเคนไม่ถูกต้อง" });
      }
      const row = await prisma.user.upsert({
        where: { id: data.user.id },
        update: { email: data.user.email ?? undefined },
        create: {
          id: data.user.id,
          email: data.user.email ?? `${data.user.id}@user.local`,
          displayName: data.user.user_metadata?.display_name ?? null,
          authProvider: "supabase",
        },
      });
      req.user = toPublicUser(row);
      return next();
    }

    return res.status(401).json({ error: "โทเคนไม่ถูกต้อง" });
  } catch (err) {
    console.error("auth error", err);
    return res.status(500).json({ error: "ตรวจสอบ auth ไม่สำเร็จ" });
  }
}

export function requireCronSecret(req, res, next) {
  const provided = String(req.headers["x-cron-secret"] || req.query.secret || "");
  const expected = String(process.env.CRON_SECRET || "");

  if (!expected) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Timing-safe comparison — timingSafeEqual throws on length mismatch,
  // so compare fixed-length buffers padded/hashed to equal size instead
  // of bailing out early on a length check (which itself leaks length via timing).
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  const maxLen = Math.max(providedBuf.length, expectedBuf.length, 1);
  const providedPadded = Buffer.concat([providedBuf], maxLen);
  const expectedPadded = Buffer.concat([expectedBuf], maxLen);

  const equal =
    providedBuf.length === expectedBuf.length &&
    timingSafeEqual(providedPadded, expectedPadded);

  if (!equal) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

export function requireProvisionSecret(req, res, next) {
  const provided = String(req.headers["x-provision-secret"] || "");
  const expected = String(process.env.GAME_PROVISION_SECRET || "");

  if (!expected) {
    return res.status(503).json({ error: "GAME_PROVISION_SECRET not configured" });
  }

  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  const maxLen = Math.max(providedBuf.length, expectedBuf.length, 1);
  const providedPadded = Buffer.concat([providedBuf], maxLen);
  const expectedPadded = Buffer.concat([expectedBuf], maxLen);

  const equal =
    providedBuf.length === expectedBuf.length &&
    timingSafeEqual(providedPadded, expectedPadded);

  if (!equal) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}
