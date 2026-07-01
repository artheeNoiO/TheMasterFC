import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import clubRoutes from "./routes/clubs.js";
import leagueRoutes from "./routes/leagues.js";
import cronRoutes from "./routes/cron.js";

const app = express();
const port = Number(process.env.PORT) || 3001;
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({ origin: [clientUrl, "http://localhost:5173"], credentials: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/leagues", leagueRoutes);
app.use("/api/cron", cronRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(port, () => {
  console.log(`The Socker Manager API → http://localhost:${port}`);
  console.log(`Auth mode: ${process.env.SUPABASE_URL ? "Supabase" : "dev (local)"}`);
});
