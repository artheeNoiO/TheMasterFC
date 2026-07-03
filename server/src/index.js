import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import clubRoutes from "./routes/clubs.js";
import leagueRoutes from "./routes/leagues.js";
import cronRoutes from "./routes/cron.js";
import legendRoutes from "./routes/legends.js";
import stakeRoutes from "./routes/stake.js";
import { runStakeTick } from "./services/stakeService.js";

const app = express();
const port = Number(process.env.PORT) || 3001;

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
app.use("/api/cron", cronRoutes);
app.use("/api/legends", legendRoutes);
app.use("/api/stake", stakeRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(port, () => {
  console.log(`The Socker Manager API → http://localhost:${port}`);
  console.log(`Auth mode: ${process.env.SUPABASE_URL ? "Supabase" : "dev (local)"}`);
});

/* Stake League real-time tick — เช็คทุก 30 วิ ว่ามีรอบที่ถึงเวลาแข่งหรือยัง
   (production ที่ instance หลับได้ ควรตั้ง cron ภายนอกยิง /api/cron/stake-tick เสริม) */
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
