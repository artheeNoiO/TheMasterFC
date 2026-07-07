import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dir = path.join(root, "client/public/player-portraits");

const files = fs.readdirSync(dir).filter((f) => f.endsWith(".png"));
let done = 0, beforeTotal = 0, afterTotal = 0;

for (const file of files) {
  const fp = path.join(dir, file);
  const outFp = fp.replace(/\.png$/, ".jpg");
  const before = fs.statSync(fp).size;
  await sharp(fp).jpeg({ quality: 82, mozjpeg: true }).toFile(outFp);
  const after = fs.statSync(outFp).size;
  fs.unlinkSync(fp);
  beforeTotal += before;
  afterTotal += after;
  done++;
  if (done % 100 === 0) console.log(`... ${done}/${files.length}`);
}

console.log(`Converted ${done} files`);
console.log(`Before: ${(beforeTotal / 1e6).toFixed(1)} MB, After: ${(afterTotal / 1e6).toFixed(1)} MB`);
