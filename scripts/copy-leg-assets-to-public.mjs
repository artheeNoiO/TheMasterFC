/** คัดลอก neck-leg-*.png จาก assets → public (ทับ pool clone) */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = process.env.CURSOR_ASSETS ||
  "C:/Users/arnlo/.cursor/projects/c-Users-arnlo-OneDrive-Desktop-OLARN-Projects-Made-your-club/assets";
const pub = path.join(root, "client/public/player-portraits");

const from = Number(process.env.FROM || 251);
const to = Number(process.env.TO || 550);

let n = 0;
for (let i = from; i <= to; i++) {
  const f = `neck-leg-${String(i).padStart(3, "0")}.png`;
  const src = path.join(assets, f);
  if (!fs.existsSync(src)) continue;
  fs.copyFileSync(src, path.join(pub, f));
  n++;
}
console.log(`Copied ${n} files (${from}-${to})`);
