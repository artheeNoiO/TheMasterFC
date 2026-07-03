/** Deterministic parody name from real name (legal-safe display). */

const VOWEL_SWAP = { a: "e", e: "a", i: "y", o: "u", u: "o", A: "E", E: "A", I: "Y", O: "U", U: "O" };

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function parodyPart(part) {
  if (!part || part.length <= 2) return part;
  const h = hashStr(part);
  let out = "";
  for (let i = 0; i < part.length; i++) {
    const ch = part[i];
    if (VOWEL_SWAP[ch] && (h + i) % 3 === 0) out += VOWEL_SWAP[ch];
    else out += ch;
  }
  if (h % 4 === 0 && !out.endsWith("z") && !out.endsWith("Z")) out += "z";
  if (h % 5 === 0 && out.length > 4) out = out.slice(0, -1) + "x";
  return out.charAt(0).toUpperCase() + out.slice(1);
}

export function parodyName(realName) {
  return String(realName || "")
    .trim()
    .split(/\s+/)
    .map(parodyPart)
    .join(" ");
}

export function slugId(leagueId, teamKey, realName) {
  const base = `${leagueId}_${teamKey}_${realName}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return base.slice(0, 48);
}

export function acquireCostFromRating(rating) {
  return Math.round((rating * rating * 5200) / 1000) * 1000;
}

/** Top stars acquirable via legend market (unique per server). */
export function isLegendStar(rating, rankInTeam) {
  return rating >= 84 || (rating >= 82 && rankInTeam <= 2);
}
