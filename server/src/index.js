import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import clubRoutes from "./routes/clubs.js";
import leagueRoutes from "./routes/leagues.js";
import matchRoutes from "./routes/matches.js";
import cronRoutes from "./routes/cron.js";
import legendRoutes from "./routes/legends.js";
import stakeRoutes from "./routes/stake.js";
import negotiationRoutes from "./routes/negotiations.js";
import feedbackRoutes from "./routes/feedback.js";
import battlePassRoutes from "./routes/battlepass.js";
import { runStakeTick } from "./services/stakeService.js";
import { runDayTickAll, ensureLeagueSkeleton } from "./services/gameService.js";
import { runMonthlyResetIfDue } from "./services/battlePassService.js";
import {
  MINUTES_PER_GAME_DAY,
  MATCH_DAYS_PER_SEASON,
  DAILY_STAFF_CARD_DRAWS,
  ACTIVE_WINDOW_START_HOUR,
  ACTIVE_WINDOW_END_HOUR,
} from "../../game-version.js";

// Fail loudly at startup rather than silently minting tokens with a weak
// fallback secret if this ever runs with NODE_ENV=production unconfigured.
if (process.env.NODE_ENV === "production" && !process.env.AUTH_TOKEN_SECRET) {
  throw new Error(
    "AUTH_TOKEN_SECRET is not set. Set a long random value before running in production."
  );
}

const app = express();
const port = Number(process.env.PORT) || 3001;

// Deployed behind Render's reverse proxy — trust the first hop's X-Forwarded-For
// so express-rate-limit (and req.ip) see the real client IP instead of the proxy's.
app.set("trust proxy", 1);

/** รองรับหลาย origin คั่นด้วย comma — ใช้ตอน Vercel + home server */
function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGINS || process.env.CLIENT_URL || "http://localhost:5173";
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (!list.includes("http://localhost:5173")) list.push("http://localhost:5173");
  if (!list.includes("http://127.0.0.1:5173")) list.push("http://127.0.0.1:5173");
  return list;
}

app.use(cors({ origin: parseCorsOrigins(), credentials: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/leagues", leagueRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/cron", cronRoutes);
app.use("/api/legends", legendRoutes);
app.use("/api/stake", stakeRoutes);
app.use("/api/negotiations", negotiationRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/battlepass", battlePassRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

// สร้างห้อง Master Legend League (1 ห้องตายตัว) + Master League (4 ห้องตายตัว) ถ้ายังไม่มี — idempotent,
// ปลอดภัยเรียกซ้ำได้ทุกครั้งที่ deploy/restart (ดู ensureLeagueSkeleton ใน gameService.js)
try {
  await ensureLeagueSkeleton();
} catch (e) {
  console.error("ensureLeagueSkeleton failed at boot", e);
}

app.listen(port, () => {
  console.log(`The Master Football Club API → http://localhost:${port}`);
  console.log(`Auth mode: ${process.env.SUPABASE_URL ? "Supabase + Game ID" : "Game ID + dev"}`);
  console.log(`Season pace: ${MATCH_DAYS_PER_SEASON} game days / ${ACTIVE_WINDOW_START_HOUR}:00-${ACTIVE_WINDOW_END_HOUR}:00 น. ไทย (~${MINUTES_PER_GAME_DAY} min/day) · หลัง ${ACTIVE_WINDOW_END_HOUR}:00 = พักฟื้น/ตลาด`);
  console.log(`Daily staff card draws: ${DAILY_STAFF_CARD_DRAWS}/calendar day`);
});

/* League day-tick — คิกอฟ/ปิดจบแมทตามเวลาจริง (ดู liveMatchService.js) ต้อง poll ถี่กว่า MS_PER_GAME_DAY มาก
 * เพราะแมทคิกอฟแล้วจบใน ~6 นาทีจริง (MATCH_REAL_DURATION_MS) ไม่ใช่ทันทีเหมือนเดิม — ถ้า poll ทุก
 * MS_PER_GAME_DAY (~44 นาที) จะปิดจบ/คิกอฟรอบถัดไปช้าไปเกือบเท่าตัว (เคยเป็นแบบนั้นตอนยัง instant-sim
 * ทุกอย่างในทีเดียว ตอนนี้ต้อง poll ถี่ๆ แล้วปล่อยให้ throttle ภายในของ runDayTickForShard เป็นตัวคุมจังหวะแทน) */
const DAY_TICK_POLL_MS = 30_000;
console.log(`day-tick interval starting (poll every ${DAY_TICK_POLL_MS / 1000}s, disabled=${process.env.DAY_TICK_DISABLED === "1"})`);
if (process.env.DAY_TICK_DISABLED !== "1") {
  setInterval(async () => {
    try {
      const results = await runDayTickAll();
      const active = results.filter((r) => r.action && r.action !== "throttled" && r.action !== "outside_match_window");
      // heartbeat เสมอ (ไม่ใช่แค่ตอน active) — เพื่อยืนยันว่า interval ยังรันอยู่จริง แม้ไม่มีอะไรเกิดขึ้น
      console.log(`day-tick heartbeat: ${results.length} shard(s), ${active.length} active`, active.length ? JSON.stringify(active) : "");
    } catch (e) {
      console.error("day-tick error", e);
    }
    try {
      const reset = await runMonthlyResetIfDue();
      if (reset.ran) console.log("monthly-reset:", JSON.stringify(reset));
    } catch (e) {
      console.error("monthly-reset error", e);
    }
  }, DAY_TICK_POLL_MS);
}

/* Stake League real-time tick */
if (process.env.STAKE_TICK_DISABLED !== "1") {
  setInterval(async () => {
    try {
      const results = await runStakeTick();
      if (results.length) console.log("stake-tick:", JSON.stringify(results));
    } catch (e) {
      console.error("stake-tick error", e);
    }
  }, 30_000);
}
