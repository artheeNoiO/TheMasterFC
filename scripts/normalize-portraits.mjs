/**
 * Normalize all player portrait PNGs to 3:4 portrait (768×1024).
 * Center crop + resize — fixes landscape 1536×1024 vs portrait 1024×1536 mix.
 *
 * Usage: node scripts/normalize-portraits.mjs
 * Env: PORTRAIT_DIR, OUT_W=768, OUT_H=1024, DRY_RUN=1
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const OUT_W = Number(process.env.OUT_W || 768);
const OUT_H = Number(process.env.OUT_H || 1024);
const DRY_RUN = process.env.DRY_RUN === "1";
const dir = process.env.PORTRAIT_DIR ||
  path.join(root, "client/public/player-portraits");

const files = fs.readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
let done = 0;
let skipped = 0;
let landscape = 0;
let portrait = 0;

for (const file of files) {
  const fp = path.join(dir, file);
  const meta = await sharp(fp).metadata();
  const { width: w, height: h } = meta;
  if (!w || !h) {
    skipped++;
    continue;
  }
  if (w > h) landscape++;
  else portrait++;

  if (w === OUT_W && h === OUT_H) {
    skipped++;
    continue;
  }

  if (DRY_RUN) {
    console.log(`${file}: ${w}x${h} → ${OUT_W}x${OUT_H}`);
    done++;
    continue;
  }

  const tmp = fp + ".norm.tmp.png";
  await sharp(fp)
    .rotate()
    .resize(OUT_W, OUT_H, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(tmp);
  fs.renameSync(tmp, fp);
  done++;
  if (done % 50 === 0) console.log(`... ${done}/${files.length}`);
}

console.log(`Normalized: ${done}, already OK/skipped: ${skipped}, total: ${files.length}`);
console.log(`Before — landscape: ${landscape}, portrait/tall: ${portrait}`);
console.log(`Output size: ${OUT_W}×${OUT_H} (3:4)`);
