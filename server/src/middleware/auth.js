import { createClient } from "@supabase/supabase-js";
import { prisma } from "../db.js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "ต้องล็อกอินก่อน" });
  }
  const token = header.slice(7);

  try {
    if (supabase) {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        return res.status(401).json({ error: "โทเคนไม่ถูกต้อง" });
      }
      const user = await prisma.user.upsert({
        where: { id: data.user.id },
        update: { email: data.user.email ?? "" },
        create: {
          id: data.user.id,
          email: data.user.email ?? `${data.user.id}@user.local`,
          displayName: data.user.user_metadata?.display_name ?? null,
        },
      });
      req.user = user;
      return next();
    }

    if (!token.startsWith("dev:")) {
      return res.status(401).json({ error: "โหมด dev: ใช้ Bearer dev:<userId>" });
    }
    const userId = token.slice(4);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: "ไม่พบผู้ใช้" });
    req.user = user;
    return next();
  } catch (err) {
    console.error("auth error", err);
    return res.status(500).json({ error: "ตรวจสอบ auth ไม่สำเร็จ" });
  }
}

export function requireCronSecret(req, res, next) {
  const secret = req.headers["x-cron-secret"] || req.query.secret;
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}
