/**
 * Player portrait pool — neck-crop stylized 3D (EA FC style, semi-realistic).
 *
 * นโยบาย:
 * - Gen หน้า+คอเท่านั้น · เสื้อ = SVG ทับสีทีมทีหลัง
 * - อายุในรูป = กลางๆ (~24) ใช้ได้กับนักเตะในเกม 16–35
 * - 1 รูป / 1 นักเตะ ตลอดเซฟ — ไม่เปลี่ยนเมื่ออายุขึ้น / ย้ายทีม / อยู่ทีมนาน
 * - สุ่มครั้งเดียวจาก player.id (stable seed)
 */

import { LEGEND_PORTRAIT_BY_ID, LEGEND_PORTRAIT_ENTRIES } from "./legend-portraits.js";

export { LEGEND_PORTRAIT_BY_ID, LEGEND_PORTRAIT_ENTRIES, getLegendPortrait } from "./legend-portraits.js";

/** ใช้ตอน gen รูปเพิ่ม — อายุ ~24 young adult ใช้ได้ 16–35 */
export const PLAYER_PORTRAIT_GEN_PROMPT = [
  "Stylized 3D football video game portrait, EA Sports FC semi-realistic NOT photorealistic NOT cartoon.",
  "Head and neck ONLY cropped at collarbone, NO shoulders NO shirt.",
  "Young adult male footballer age about 24, face usable for players aged 16-35 in game.",
  "Looking straight at camera. Plain solid flat dark charcoal gray background, NO gold NO effects.",
  "Fictional character not resembling any real person. Vertical 3:4 portrait orientation ONLY.",
].join(" ");

/** ขนาดมาตรฐานหลัง normalize — 3:4 */
export const PORTRAIT_OUTPUT_WIDTH = 768;
export const PORTRAIT_OUTPUT_HEIGHT = 1024;

export const PLAYER_PORTRAIT_POOL = [
  { file: "neck-brazil-m24.jpg", look: "latin", nat: ["brazil", "br"] },
  { file: "neck-argentina-m26.jpg", look: "latin", nat: ["argentina", "ar"] },
  { file: "neck-france-m23.jpg", look: "euro", nat: ["france", "fr"] },
  { file: "neck-england-m25.jpg", look: "euro", nat: ["england", "gb", "uk"] },
  { file: "neck-thailand-m24.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-spain-m24.jpg", look: "euro", nat: ["spain", "es"] },
  { file: "neck-senegal-m24.jpg", look: "african", nat: ["senegal", "sn"] },
  { file: "neck-japan-m24.jpg", look: "sea", nat: ["japan", "jp"] },
  { file: "neck-morocco-m24.jpg", look: "african", nat: ["morocco", "ma"] },
  { file: "neck-germany-m24.jpg", look: "euro", nat: ["germany", "de"] },
  { file: "neck-portugal-m24.jpg", look: "euro", nat: ["portugal", "pt"] },
  { file: "neck-italy-m24.jpg", look: "euro", nat: ["italy", "it"] },
  { file: "neck-netherlands-m24.jpg", look: "euro", nat: ["netherlands", "nl", "holland"] },
  { file: "neck-croatia-m24.jpg", look: "euro", nat: ["croatia", "hr"] },
  { file: "neck-nigeria-m24.jpg", look: "african", nat: ["nigeria", "ng"] },
  { file: "neck-ghana-m24.jpg", look: "african", nat: ["ghana", "gh"] },
  { file: "neck-korea-m24.jpg", look: "sea", nat: ["korea", "kr", "south korea"] },
  { file: "neck-saudi-m24.jpg", look: "sea", nat: ["saudi", "sa", "arab"] },
  { file: "neck-colombia-m24.jpg", look: "latin", nat: ["colombia", "co"] },
  { file: "neck-mexico-m24.jpg", look: "latin", nat: ["mexico", "mx"] },
  // —— ไทยเพิ่ม 10 หน้า (รวม neck-thailand-m24 = 11 ใบสำหรับสัญชาติไทย) ——
  { file: "neck-thai-01.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-02.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-03.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-04.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-05.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-06.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-07.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-08.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-09.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-10.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  // —— ประเทศอื่น +20 ——
  { file: "neck-uruguay-m24.jpg", look: "latin", nat: ["uruguay", "uy"] },
  { file: "neck-chile-m24.jpg", look: "latin", nat: ["chile", "cl"] },
  { file: "neck-peru-m24.jpg", look: "latin", nat: ["peru", "pe"] },
  { file: "neck-belgium-m24.jpg", look: "euro", nat: ["belgium", "be"] },
  { file: "neck-poland-m24.jpg", look: "euro", nat: ["poland", "pl"] },
  { file: "neck-serbia-m24.jpg", look: "euro", nat: ["serbia", "rs"] },
  { file: "neck-denmark-m24.jpg", look: "euro", nat: ["denmark", "dk"] },
  { file: "neck-sweden-m24.jpg", look: "euro", nat: ["sweden", "se"] },
  { file: "neck-switzerland-m24.jpg", look: "euro", nat: ["switzerland", "ch"] },
  { file: "neck-wales-m24.jpg", look: "euro", nat: ["wales", "welsh"] },
  { file: "neck-cameroon-m24.jpg", look: "african", nat: ["cameroon", "cm"] },
  { file: "neck-ivorycoast-m24.jpg", look: "african", nat: ["ivory", "cote", "ivory coast"] },
  { file: "neck-egypt-m24.jpg", look: "african", nat: ["egypt", "eg"] },
  { file: "neck-algeria-m24.jpg", look: "african", nat: ["algeria", "dz"] },
  { file: "neck-china-m24.jpg", look: "sea", nat: ["china", "cn"] },
  { file: "neck-vietnam-m24.jpg", look: "sea", nat: ["vietnam", "vn"] },
  { file: "neck-indonesia-m24.jpg", look: "sea", nat: ["indonesia", "id"] },
  { file: "neck-turkey-m24.jpg", look: "euro", nat: ["turkey", "tr"] },
  { file: "neck-iran-m24.jpg", look: "sea", nat: ["iran", "ir"] },
  { file: "neck-australia-m24.jpg", look: "euro", nat: ["australia", "au"] },
  // —— ไทยเพิ่ม 20 หน้า (รวม = 31 ใบสำหรับสัญชาติไทย) ——
  { file: "neck-thai-11.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-12.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-13.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-14.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-15.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-16.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-17.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-18.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-19.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-20.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-21.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-22.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-23.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-24.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-25.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-26.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-27.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-28.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-29.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  { file: "neck-thai-30.jpg", look: "sea", nat: ["thailand", "th", "thai"] },
  // —— ประเทศอื่น +30 ——
  { file: "neck-ecuador-m24.jpg", look: "latin", nat: ["ecuador", "ec"] },
  { file: "neck-paraguay-m24.jpg", look: "latin", nat: ["paraguay", "py"] },
  { file: "neck-venezuela-m24.jpg", look: "latin", nat: ["venezuela", "ve"] },
  { file: "neck-scotland-m24.jpg", look: "euro", nat: ["scotland", "scottish"] },
  { file: "neck-ireland-m24.jpg", look: "euro", nat: ["ireland", "ie", "irish"] },
  { file: "neck-austria-m24.jpg", look: "euro", nat: ["austria", "at"] },
  { file: "neck-norway-m24.jpg", look: "euro", nat: ["norway", "no"] },
  { file: "neck-finland-m24.jpg", look: "euro", nat: ["finland", "fi"] },
  { file: "neck-czech-m24.jpg", look: "euro", nat: ["czech", "cz"] },
  { file: "neck-greece-m24.jpg", look: "euro", nat: ["greece", "gr"] },
  { file: "neck-romania-m24.jpg", look: "euro", nat: ["romania", "ro"] },
  { file: "neck-hungary-m24.jpg", look: "euro", nat: ["hungary", "hu"] },
  { file: "neck-slovakia-m24.jpg", look: "euro", nat: ["slovakia", "sk"] },
  { file: "neck-russia-m24.jpg", look: "euro", nat: ["russia", "ru"] },
  { file: "neck-ukraine-m24.jpg", look: "euro", nat: ["ukraine", "ua"] },
  { file: "neck-canada-m24.jpg", look: "euro", nat: ["canada", "ca"] },
  { file: "neck-new-zealand-m24.jpg", look: "euro", nat: ["new zealand", "nz"] },
  { file: "neck-tunisia-m24.jpg", look: "african", nat: ["tunisia", "tn"] },
  { file: "neck-mali-m24.jpg", look: "african", nat: ["mali", "ml"] },
  { file: "neck-south-africa-m24.jpg", look: "african", nat: ["south africa", "za"] },
  { file: "neck-kenya-m24.jpg", look: "african", nat: ["kenya", "ke"] },
  { file: "neck-jamaica-m24.jpg", look: "african", nat: ["jamaica", "jm"] },
  { file: "neck-malaysia-m24.jpg", look: "sea", nat: ["malaysia", "my"] },
  { file: "neck-philippines-m24.jpg", look: "sea", nat: ["philippines", "ph"] },
  { file: "neck-india-m24.jpg", look: "sea", nat: ["india", "in"] },
  { file: "neck-uzbekistan-m24.jpg", look: "sea", nat: ["uzbekistan", "uz"] },
  { file: "neck-qatar-m24.jpg", look: "sea", nat: ["qatar", "qa"] },
  { file: "neck-uae-m24.jpg", look: "sea", nat: ["uae", "emirates", "ae"] },
  { file: "neck-costa-rica-m24.jpg", look: "latin", nat: ["costa rica", "cr"] },
  { file: "neck-panama-m24.jpg", look: "latin", nat: ["panama", "pa"] },
  // —— ญี่ปุ่น +12 (รวม neck-japan-m24 = 13 ใบ) ——
  { file: "neck-japan-01.jpg", look: "sea", nat: ["japan", "jp"] },
  { file: "neck-japan-02.jpg", look: "sea", nat: ["japan", "jp"] },
  { file: "neck-japan-03.jpg", look: "sea", nat: ["japan", "jp"] },
  { file: "neck-japan-04.jpg", look: "sea", nat: ["japan", "jp"] },
  { file: "neck-japan-05.jpg", look: "sea", nat: ["japan", "jp"] },
  { file: "neck-japan-06.jpg", look: "sea", nat: ["japan", "jp"] },
  { file: "neck-japan-07.jpg", look: "sea", nat: ["japan", "jp"] },
  { file: "neck-japan-08.jpg", look: "sea", nat: ["japan", "jp"] },
  { file: "neck-japan-09.jpg", look: "sea", nat: ["japan", "jp"] },
  { file: "neck-japan-10.jpg", look: "sea", nat: ["japan", "jp"] },
  { file: "neck-japan-11.jpg", look: "sea", nat: ["japan", "jp"] },
  { file: "neck-japan-12.jpg", look: "sea", nat: ["japan", "jp"] },
  // —— เกาหลี +12 (รวม neck-korea-m24 = 13 ใบ) ——
  { file: "neck-korea-01.jpg", look: "sea", nat: ["korea", "kr", "south korea"] },
  { file: "neck-korea-02.jpg", look: "sea", nat: ["korea", "kr", "south korea"] },
  { file: "neck-korea-03.jpg", look: "sea", nat: ["korea", "kr", "south korea"] },
  { file: "neck-korea-04.jpg", look: "sea", nat: ["korea", "kr", "south korea"] },
  { file: "neck-korea-05.jpg", look: "sea", nat: ["korea", "kr", "south korea"] },
  { file: "neck-korea-06.jpg", look: "sea", nat: ["korea", "kr", "south korea"] },
  { file: "neck-korea-07.jpg", look: "sea", nat: ["korea", "kr", "south korea"] },
  { file: "neck-korea-08.jpg", look: "sea", nat: ["korea", "kr", "south korea"] },
  { file: "neck-korea-09.jpg", look: "sea", nat: ["korea", "kr", "south korea"] },
  { file: "neck-korea-10.jpg", look: "sea", nat: ["korea", "kr", "south korea"] },
  { file: "neck-korea-11.jpg", look: "sea", nat: ["korea", "kr", "south korea"] },
  { file: "neck-korea-12.jpg", look: "sea", nat: ["korea", "kr", "south korea"] },
  // —— จีน/เวียดนาม/อินโด +4 ต่อประเทศ ——
  { file: "neck-china-01.jpg", look: "sea", nat: ["china", "cn"] },
  { file: "neck-china-02.jpg", look: "sea", nat: ["china", "cn"] },
  { file: "neck-china-03.jpg", look: "sea", nat: ["china", "cn"] },
  { file: "neck-china-04.jpg", look: "sea", nat: ["china", "cn"] },
  { file: "neck-vietnam-01.jpg", look: "sea", nat: ["vietnam", "vn"] },
  { file: "neck-vietnam-02.jpg", look: "sea", nat: ["vietnam", "vn"] },
  { file: "neck-vietnam-03.jpg", look: "sea", nat: ["vietnam", "vn"] },
  { file: "neck-vietnam-04.jpg", look: "sea", nat: ["vietnam", "vn"] },
  { file: "neck-indonesia-01.jpg", look: "sea", nat: ["indonesia", "id"] },
  { file: "neck-indonesia-02.jpg", look: "sea", nat: ["indonesia", "id"] },
  { file: "neck-indonesia-03.jpg", look: "sea", nat: ["indonesia", "id"] },
  { file: "neck-indonesia-04.jpg", look: "sea", nat: ["indonesia", "id"] },
  // —— ประเทศอื่น +14 ——
  { file: "neck-bolivia-m24.jpg", look: "latin", nat: ["bolivia", "bo"] },
  { file: "neck-honduras-m24.jpg", look: "latin", nat: ["honduras", "hn"] },
  { file: "neck-angola-m24.jpg", look: "african", nat: ["angola", "ao"] },
  { file: "neck-congo-m24.jpg", look: "african", nat: ["congo", "cd", "dr congo"] },
  { file: "neck-ethiopia-m24.jpg", look: "african", nat: ["ethiopia", "et"] },
  { file: "neck-pakistan-m24.jpg", look: "sea", nat: ["pakistan", "pk"] },
  { file: "neck-bangladesh-m24.jpg", look: "sea", nat: ["bangladesh", "bd"] },
  { file: "neck-myanmar-m24.jpg", look: "sea", nat: ["myanmar", "burma", "mm"] },
  { file: "neck-cambodia-m24.jpg", look: "sea", nat: ["cambodia", "kh"] },
  { file: "neck-singapore-m24.jpg", look: "sea", nat: ["singapore", "sg"] },
  { file: "neck-bahrain-m24.jpg", look: "sea", nat: ["bahrain", "bh"] },
  { file: "neck-kuwait-m24.jpg", look: "sea", nat: ["kuwait", "kw"] },
  { file: "neck-jordan-m24.jpg", look: "sea", nat: ["jordan", "jo"] },
  { file: "neck-mongolia-m24.jpg", look: "sea", nat: ["mongolia", "mn"] },
];

function portraitSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const LOOK_BY_REGION = {
  thailand: "sea",
  th: "sea",
  england: "euro",
  spain: "euro",
  italy: "euro",
  germany: "euro",
  france: "euro",
  portugal: "euro",
  saudi: "sea",
};

function normNat(nationality) {
  return (nationality || "").toLowerCase().trim();
}

function pickLook(nationality, leagueId) {
  const nat = normNat(nationality);
  if (nat.includes("brazil") || nat.includes("argentin") || nat.includes("mexico") || nat.includes("colombia") || nat.includes("uruguay") || nat.includes("chile") || nat.includes("peru") || nat.includes("ecuador") || nat.includes("paraguay") || nat.includes("venezuela") || nat.includes("costa") || nat.includes("panama") || nat.includes("bolivia") || nat.includes("honduras")) return "latin";
  if (nat.includes("nigeria") || nat.includes("senegal") || nat.includes("ghana") || nat.includes("cameroon") || nat.includes("ivory") || nat.includes("cote") || nat.includes("morocco") || nat.includes("egypt") || nat.includes("algeria") || nat.includes("tunisia") || nat.includes("mali") || nat.includes("south africa") || nat.includes("kenya") || nat.includes("jamaica") || nat.includes("angola") || nat.includes("congo") || nat.includes("ethiopia")) return "african";
  if (nat.includes("thai") || nat.includes("japan") || nat.includes("korea") || nat.includes("china") || nat.includes("vietnam") || nat.includes("indonesia") || nat.includes("iran") || nat.includes("malaysia") || nat.includes("philippin") || nat.includes("india") || nat.includes("uzbek") || nat.includes("pakistan") || nat.includes("bangladesh") || nat.includes("myanmar") || nat.includes("burma") || nat.includes("cambodia") || nat.includes("singapore") || nat.includes("mongolia")) return "sea";
  if (nat.includes("england") || nat.includes("german") || nat.includes("france") || nat.includes("spain") || nat.includes("italy") || nat.includes("portugal") || nat.includes("nether") || nat.includes("belg") || nat.includes("croat") || nat.includes("poland") || nat.includes("serb") || nat.includes("denmark") || nat.includes("sweden") || nat.includes("swiss") || nat.includes("wales") || nat.includes("turk") || nat.includes("australia") || nat.includes("scotland") || nat.includes("irish") || nat.includes("ireland") || nat.includes("austria") || nat.includes("norway") || nat.includes("finland") || nat.includes("czech") || nat.includes("greece") || nat.includes("romania") || nat.includes("hungary") || nat.includes("slovak") || nat.includes("russia") || nat.includes("ukraine") || nat.includes("canada") || nat.includes("new zealand")) return "euro";
  if (nat.includes("saudi") || nat.includes("arab") || nat.includes("uae") || nat.includes("qatar") || nat.includes("emirates") || nat.includes("bahrain") || nat.includes("kuwait") || nat.includes("jordan")) return "sea";
  return LOOK_BY_REGION[leagueId] || "euro";
}

function matchPoolByNationality(nationality) {
  const nat = normNat(nationality);
  if (!nat) return [];
  return PLAYER_PORTRAIT_POOL.filter((e) =>
    (e.nat || []).some((tag) => nat.includes(tag) || tag.includes(nat)),
  );
}

/** เลือกรูป — legend/roster ใช้รูปเฉพาะ · คนอื่นสุ่มจาก pool */
export function assignPlayerPortrait(player) {
  const rid = player?.legendId || player?.rosterId;
  if (rid && LEGEND_PORTRAIT_BY_ID[rid]) {
    return `/player-portraits/${encodeURIComponent(LEGEND_PORTRAIT_BY_ID[rid].file)}`;
  }

  const pool = PLAYER_PORTRAIT_POOL;
  if (!pool.length) return null;

  const byNat = matchPoolByNationality(player?.nationality);
  const look = pickLook(player?.nationality, player?.legendLeagueId);
  const byLook = pool.filter((e) => e.look === look);
  const candidates = byNat.length ? byNat : byLook.length ? byLook : pool;

  const pick = candidates[portraitSeed(player?.id || "p") % candidates.length];
  return `/player-portraits/${encodeURIComponent(pick.file)}`;
}

function isNeckPoolPortrait(portrait) {
  if (!portrait) return false;
  const file = decodeURIComponent((portrait.split("/").pop() || "").split("?")[0]);
  return PLAYER_PORTRAIT_POOL.some((e) => e.file === file);
}

function isLegendPortrait(portrait) {
  if (!portrait) return false;
  const file = decodeURIComponent((portrait.split("/").pop() || "").split("?")[0]);
  return LEGEND_PORTRAIT_ENTRIES.some((e) => e.file === file);
}

function isKnownPortrait(portrait) {
  return isNeckPoolPortrait(portrait) || isLegendPortrait(portrait);
}

/** ใส่ portrait — legend/roster อัปเกรดเป็นรูปเฉพาะ · คนอื่นมี pool แล้วไม่แตะ */
export function ensurePlayerPortrait(player) {
  if (!player) return;
  const rid = player.legendId || player.rosterId;
  if (rid && LEGEND_PORTRAIT_BY_ID[rid]) {
    player.portrait = assignPlayerPortrait(player);
    return;
  }
  if (player.portrait && isKnownPortrait(player.portrait)) return;
  const path = assignPlayerPortrait(player);
  if (path) player.portrait = path;
}

export function ensureAllPlayerPortraits(career) {
  if (!career?.players?.length) return career;
  career.players.forEach((p) => ensurePlayerPortrait(p));
  (career.academyPlayers || []).forEach((p) => ensurePlayerPortrait(p));
  (career.youthProspects || []).forEach((p) => ensurePlayerPortrait(p));
  return career;
}
