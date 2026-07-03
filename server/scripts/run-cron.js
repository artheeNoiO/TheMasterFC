/**
 * เรียก cron บน API ที่รันอยู่บนเครื่อง (ใช้กับ Task Scheduler / Run-Game-Cron.bat)
 * Usage: node server/scripts/run-cron.js day-tick
 *        node server/scripts/run-cron.js stake-tick
 *        node server/scripts/run-cron.js all
 */
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
config({ path: path.join(root, ".env") });

const job = process.argv[2] || "day-tick";
const port = Number(process.env.PORT) || 3001;
const secret = process.env.CRON_SECRET;
const base = `http://127.0.0.1:${port}/api/cron`;

if (!secret || secret === "change-me-to-a-long-random-string") {
  console.error("[ERROR] ตั้ง CRON_SECRET ใน server/.env ก่อน (ค่าสุ่มยาวๆ)");
  process.exit(1);
}

async function hit(name) {
  const res = await fetch(`${base}/${name}`, {
    method: "POST",
    headers: { "x-cron-secret": secret },
  });
  const text = await res.text();
  console.log(`[${name}] ${res.status} ${text}`);
  if (!res.ok) process.exitCode = 1;
}

const jobs = job === "all" ? ["day-tick", "stake-tick"] : [job];
for (const name of jobs) {
  await hit(name);
}
