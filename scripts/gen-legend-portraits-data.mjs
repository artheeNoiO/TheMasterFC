import { LEGEND_PLAYERS, ROSTER_PLAYERS } from "../roster-database/index.js";
import { starsFromRating } from "../player-stars.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const ADD_COUNT = Number(process.env.ADD_COUNT || 200);
const START_INDEX = Number(process.env.START_INDEX || 51);

const NAT_MAP = {
  EN: "euro", FR: "euro", ES: "euro", DE: "euro", IT: "euro", PT: "euro",
  BE: "euro", NL: "euro", NO: "euro", PL: "euro", SE: "euro", SI: "euro", GE: "euro",
  CH: "euro", AT: "euro", HR: "euro", RS: "euro", DK: "euro", CZ: "euro", SK: "euro",
  BR: "latin", AR: "latin", UY: "latin", CO: "latin", MX: "latin", CL: "latin",
  EG: "african", NG: "african", SN: "african", GH: "african", CM: "african", MA: "african",
  KR: "sea", JP: "sea", TH: "sea", CN: "sea", VN: "sea", ID: "sea", SA: "sea",
  US: "euro", AU: "euro", TR: "euro", GR: "euro", RO: "euro", UA: "euro", RU: "euro",
};

const NAT_TAGS = {
  EN: ["england", "en"], FR: ["france", "fr"], ES: ["spain", "es"], DE: ["germany", "de"],
  IT: ["italy", "it"], PT: ["portugal", "pt"], BE: ["belgium", "be"], NL: ["netherlands", "nl"],
  NO: ["norway", "no"], PL: ["poland", "pl"], SE: ["sweden", "se"], SI: ["slovenia", "si"],
  GE: ["georgia", "ge"], BR: ["brazil", "br"], AR: ["argentina", "ar"], UY: ["uruguay", "uy"],
  EG: ["egypt", "eg"], KR: ["korea", "kr"], CM: ["cameroon", "cm"], JP: ["japan", "jp"],
  TH: ["thailand", "th"], NG: ["nigeria", "ng"], SN: ["senegal", "sn"], CO: ["colombia", "co"],
  MX: ["mexico", "mx"], SA: ["saudi", "sa"], US: ["usa", "us"], TR: ["turkey", "tr"],
};

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const HAIR = ["short fade", "buzz cut", "side part neat", "curly medium", "textured crop", "slick back", "spiky top", "undercut", "wavy short", "clean buzz"];
const LOOK_DESC = {
  euro: "European male 24, fair to olive skin",
  latin: "Latin American male 24, tan skin",
  african: "African male 24, dark skin",
  sea: "Southeast/East Asian male 24, tan skin",
};

function autoHint(p) {
  const look = NAT_MAP[p.nationality] || "euro";
  const h = hashStr(p.rosterId || p.name);
  const hair = HAIR[h % HAIR.length];
  const pos = p.position === "GK" ? ", serious goalkeeper look" : p.position === "DF" ? ", strong defender look" : "";
  const beard = h % 3 === 0 ? ", light stubble" : h % 5 === 0 ? ", trimmed beard" : "";
  return `${LOOK_DESC[look] || LOOK_DESC.euro}, ${hair} hair${beard}${pos}`;
}

function loadExisting() {
  const fp = path.join(root, "client/src/lib/legend-portraits.js");
  if (!fs.existsSync(fp)) return [];
  const mod = fs.readFileSync(fp, "utf8");
  const m = mod.match(/export const LEGEND_PORTRAIT_ENTRIES = (\[[\s\S]*?\]);/);
  if (!m) return [];
  return JSON.parse(m[1]);
}

function pickCandidates(existing, count) {
  const byId = new Map(ROSTER_PLAYERS.map((p) => [p.rosterId, p]));
  const seenName = new Set();
  const seenId = new Set(existing.map((e) => e.legendId));
  for (const e of existing) {
    const p = byId.get(e.legendId);
    if (p?.name) seenName.add(p.name.toLowerCase());
  }
  const out = [];

  const add = (p) => {
    if (!p?.rosterId || seenId.has(p.rosterId)) return;
    const nk = (p.name || "").toLowerCase();
    if (seenName.has(nk)) return;
    seenName.add(nk);
    seenId.add(p.rosterId);
    out.push(p);
  };

  for (const p of [...LEGEND_PLAYERS].sort((a, b) => b.rating - a.rating)) {
    add(p);
    if (out.length >= count) break;
  }
  if (out.length < count) {
    for (const p of [...ROSTER_PLAYERS].filter((x) => x.rating >= 78).sort((a, b) => b.rating - a.rating)) {
      add(p);
      if (out.length >= count) break;
    }
  }
  if (out.length < count) {
    for (const p of [...ROSTER_PLAYERS].filter((x) => x.rating >= 72).sort((a, b) => b.rating - a.rating)) {
      add(p);
      if (out.length >= count) break;
    }
  }
  return out.slice(0, count);
}

const existing = loadExisting();
const candidates = pickCandidates(existing, ADD_COUNT);

const startNum = existing.length ? existing.length + 1 : START_INDEX;
const newEntries = candidates.map((p, i) => {
  const num = startNum + i;
  const look = NAT_MAP[p.nationality] || "euro";
  return {
    legendId: p.rosterId,
    file: `neck-leg-${String(num).padStart(3, "0")}.png`,
    stars: starsFromRating(p.rating),
    look,
    nat: NAT_TAGS[p.nationality] || [look],
    hint: autoHint(p),
    parodyName: p.name,
    rating: p.rating,
  };
});

const merged = [...existing, ...newEntries.map(({ hint, parodyName, rating, ...e }) => e)];
const allPrompts = [
  ...(fs.existsSync(path.join(root, "scripts/legend-portrait-prompts.json"))
    ? JSON.parse(fs.readFileSync(path.join(root, "scripts/legend-portrait-prompts.json"), "utf8"))
    : []),
  ...newEntries.map((e) => ({ file: e.file, hint: e.hint, stars: e.stars, name: e.parodyName, rating: e.rating })),
];

const js = `/**
 * Legend / roster portraits — 1:1 กับ rosterId (legendId) ใน roster-database
 * ${merged.length} คน · ดาวตรง rating · รูปเฉพาะตัว
 */
export const LEGEND_PORTRAIT_ENTRIES = ${JSON.stringify(merged, null, 2)};

export const LEGEND_PORTRAIT_BY_ID = Object.fromEntries(
  LEGEND_PORTRAIT_ENTRIES.map((e) => [e.legendId, e]),
);

export function getLegendPortrait(legendId) {
  return LEGEND_PORTRAIT_BY_ID[legendId] || null;
}
`;

fs.writeFileSync(path.join(root, "client/src/lib/legend-portraits.js"), js);
fs.writeFileSync(path.join(root, "scripts/legend-portrait-prompts.json"), JSON.stringify(allPrompts, null, 2));
fs.writeFileSync(
  path.join(root, "scripts/legend-portrait-new-batch.json"),
  JSON.stringify(newEntries.map((e) => ({ file: e.file, hint: e.hint, stars: e.stars, name: e.parodyName })), null, 2),
);
console.log(`Existing: ${existing.length}, Added: ${newEntries.length}, Total: ${merged.length}`);
console.log(`New files: ${newEntries[0]?.file} .. ${newEntries[newEntries.length - 1]?.file}`);
