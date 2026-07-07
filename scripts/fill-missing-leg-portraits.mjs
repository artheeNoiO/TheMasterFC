/**
 * เติม neck-leg-*.png ที่ยังไม่มี — คัดลอกจาก pool ตาม hash (ไฟล์แยกต่อ rosterId)
 * รัน: node scripts/fill-missing-leg-portraits.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PLAYER_PORTRAIT_POOL } from "../client/src/lib/player-portraits.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "client/public/player-portraits");
const assetsDir = path.join(
  process.env.CURSOR_ASSETS ||
    "C:/Users/arnlo/.cursor/projects/c-Users-arnlo-OneDrive-Desktop-OLARN-Projects-Made-your-club/assets",
);

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const batchPath = path.join(root, "scripts/legend-portrait-new-batch.json");
if (!fs.existsSync(batchPath)) {
  console.log("No new batch file");
  process.exit(0);
}

const batch = JSON.parse(fs.readFileSync(batchPath, "utf8"));
let fromAssets = 0;
let fromPool = 0;
let skipped = 0;

for (const { file } of batch) {
  const pub = path.join(publicDir, file);
  if (fs.existsSync(pub)) {
    skipped++;
    continue;
  }
  const asset = path.join(assetsDir, file);
  if (fs.existsSync(asset)) {
    fs.copyFileSync(asset, pub);
    fromAssets++;
    continue;
  }
  const poolFile = PLAYER_PORTRAIT_POOL[hashStr(file) % PLAYER_PORTRAIT_POOL.length].file;
  const poolSrc = path.join(publicDir, poolFile);
  if (!fs.existsSync(poolSrc)) {
    console.warn("Missing pool:", poolFile);
    continue;
  }
  fs.copyFileSync(poolSrc, pub);
  fromPool++;
}

console.log(`Done — assets:${fromAssets} pool:${fromPool} skipped:${skipped}`);
