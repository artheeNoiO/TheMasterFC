/**
 * Legend Universe — ทีม/นักเตะอิงโลกจริง (ชื่อล้อเลียน parody)
 * 8 ลีก legend: roster ครบ ~23 คน/ทีม จาก roster-database
 * ซูเปอร์สตาร์ (rating สูง): ตัวเดียวต่อ legendId ต่อเซิร์ฟเวอร์ (ออนไลน์)
 */

import {
  ROSTER_PLAYERS,
  LEGEND_PLAYERS as ROSTER_LEGEND_PLAYERS,
  getRosterForTeam,
  getRosterForLeague,
  hasFullRosterLeague,
  isBigFiveLeague,
  ROSTER_STATS,
} from "./roster-database/index.js";

export {
  ROSTER_PLAYERS, ROSTER_STATS, getRosterForTeam, getRosterForLeague,
  hasFullRosterLeague, isBigFiveLeague,
};

export const LEGEND_LEAGUES = [
  { id: "england", name: "ลีกอังกฤษ", emoji: "🏴", region: "อังกฤษ" },
  { id: "spain", name: "ลาลีกา", emoji: "🇪🇸", region: "สเปน" },
  { id: "italy", name: "เซเรียอา", emoji: "🇮🇹", region: "อิตาลี" },
  { id: "france", name: "ลีกฝรั่งเศส", emoji: "🇫🇷", region: "ฝรั่งเศส" },
  { id: "germany", name: "บุนเดสลีกา", emoji: "🇩🇪", region: "เยอรมัน" },
  { id: "portugal", name: "ลีกโปรตุเกส", emoji: "🇵🇹", region: "โปรตุเกส" },
  { id: "saudi", name: "ลีกซาอุ", emoji: "🇸🇦", region: "ซาอุดีอาระเบีย" },
  { id: "thailand", name: "ลีกไทย", emoji: "🇹🇭", region: "ไทย" },
];

export const LEGEND_INACTIVE_DAYS = 30;
/** Min total club value (squad + budget) to bid for legends */
export const LEGEND_ACQUIRE_MIN_TEAM_VALUE = 35_000_000;

/** Must be in Master League — division 1 after the 5-tier pyramid renumbering
 * (0 is now Master Legend League itself; a legend club can't acquire another legend into itself) */
export function canBidForLegend(division) {
  return division === 1;
}

/** @type {Record<string, Array<{key:string,name:string,short:string,color:string,tier:number,formation?:string}>>} */
export const LEGEND_TEAMS = {
  england: [
    { key: "reddog", name: "เรดด็อก ยูไนเต็ด", short: "RDG", color: "#c1440e", tier: 9, formation: "4-2-3-1" },
    { key: "duckred", name: "ดั๊กเรด เอฟซี", short: "DKR", color: "#c8102e", tier: 9, formation: "4-3-3" },
    { key: "hoiblue", name: "หอยบลู สิงห์ทะเล", short: "HBL", color: "#034694", tier: 8, formation: "4-2-3-1" },
    { key: "biggun", name: "ปืนใหญ่ แอร์เซนอล", short: "BGN", color: "#ef0107", tier: 8, formation: "4-3-3" },
    { key: "mooncity", name: "มูนซิตี้ เอฟซี", short: "MNC", color: "#6cabdd", tier: 10, formation: "4-1-4-1" },
    { key: "lilywhite", name: "ลิลลี่ไวท์ ฮ็อทสเปอร์", short: "LLW", color: "#132257", tier: 7, formation: "4-2-3-1" },
    { key: "villalion", name: "วิลล่าไลออน เอฟซี", short: "VLA", color: "#95bfe5", tier: 7, formation: "4-4-2" },
    { key: "magpie", name: "นกกางเขน นิวคาสเซิล", short: "MGP", color: "#241f20", tier: 7, formation: "4-3-3" },
    { key: "hammer", name: "ค้อนเหล็ก เวสต์แฮม", short: "HMR", color: "#7a263a", tier: 6, formation: "4-2-3-1" },
    { key: "seagull", name: "นางนวล ไบรท์ตัน", short: "SGL", color: "#0057b8", tier: 6, formation: "4-4-2" },
    { key: "wolfpack", name: "ฝูงหมาป่า วูล์ฟส์", short: "WLF", color: "#fdb913", tier: 5, formation: "3-5-2" },
    { key: "toffee", name: "ท็อฟฟี่ เอฟตัน", short: "TFF", color: "#003399", tier: 5, formation: "4-4-2" },
    { key: "forest", name: "ป่าไม้ น็อตติงแฮม", short: "FOR", color: "#dd0000", tier: 5, formation: "4-2-3-1" },
    { key: "eagle", name: "อินทรี คริสตัล", short: "EGL", color: "#1b458f", tier: 4, formation: "4-3-3" },
    { key: "bee", name: "ผึ้ง เบรนท์ฟอร์ด", short: "BEE", color: "#e30613", tier: 4, formation: "4-3-3" },
    { key: "cherry", name: "เชอร์รี่ บอร์นมัธ", short: "CHR", color: "#da291c", tier: 4, formation: "4-2-3-1" },
  ],
  spain: [
    { key: "whobear", name: "หมีขาว มาดริด", short: "WBR", color: "#fefefe", tier: 10, formation: "4-3-3" },
    { key: "barbeat", name: "จังหวะบาร์เซลอนา", short: "BBT", color: "#a50044", tier: 9, formation: "4-3-3" },
    { key: "rojiblanco", name: "แดงขาว มาดริด", short: "RJB", color: "#cb3524", tier: 8, formation: "3-5-2" },
    { key: "seville", name: "สีส้ม เซบีญา", short: "SVL", color: "#f43333", tier: 7, formation: "4-2-3-1" },
    { key: "bat", name: "ค้างคาว บาเลนเซีย", short: "BAT", color: "#ff6600", tier: 6, formation: "4-4-2" },
    { key: "lion", name: "สิงโต แอธเลติก", short: "LIO", color: "#ee2523", tier: 7, formation: "4-2-3-1" },
    { key: "sociedad", name: "สังคม เรอัล", short: "SOC", color: "#0067b1", tier: 7, formation: "4-1-4-1" },
    { key: "villar", name: "เรือดำ บิญาร์", short: "VIL", color: "#ffe114", tier: 6, formation: "4-4-2" },
    { key: "betis", name: "เขียวขาว เบติส", short: "BET", color: "#00954c", tier: 6, formation: "4-2-3-1" },
    { key: "celta", name: "ลมหวล เซลตา", short: "CEL", color: "#8ac3ee", tier: 5, formation: "4-3-3" },
    { key: "girona", name: "จิโรน่า เอฟซี", short: "GIR", color: "#ce1e2d", tier: 6, formation: "4-4-2" },
    { key: "mallorca", name: "มายอร์กา เอฟซี", short: "MAL", color: "#e20613", tier: 5, formation: "5-3-2" },
    { key: "getafe", name: "เกตาเฟ่ เอฟซี", short: "GET", color: "#005999", tier: 4, formation: "4-4-2" },
    { key: "osasuna", name: "โอซาซูน่า", short: "OSA", color: "#ba1719", tier: 5, formation: "4-4-2" },
    { key: "rayo", name: "สายฟ้า ราโย", short: "RAY", color: "#e53027", tier: 4, formation: "4-2-3-1" },
    { key: "alaves", name: "อลาเบส", short: "ALA", color: "#022ea4", tier: 4, formation: "4-4-2" },
  ],
  france: [
    { key: "parblue", name: "ปารีส บลู เอฟซี", short: "PSB", color: "#004170", tier: 10, formation: "4-3-3" },
    { key: "olym", name: "โอลิมปิก มาร์กเซย", short: "OLM", color: "#2faee0", tier: 7, formation: "4-3-3" },
    { key: "ol", name: "โอล ลียง", short: "OLY", color: "#d7001e", tier: 7, formation: "4-3-3" },
    { key: "monaco", name: "โมนาโก เอฟซี", short: "MON", color: "#e30613", tier: 7, formation: "4-4-2" },
    { key: "lille", name: "ลีลล์ เอฟซี", short: "LIL", color: "#e01e13", tier: 6, formation: "4-2-3-1" },
    { key: "nice", name: "นีซ เอฟซี", short: "NIC", color: "#c8102e", tier: 6, formation: "3-5-2" },
    { key: "lens", name: "เลนส์ เอฟซี", short: "LEN", color: "#d4a017", tier: 6, formation: "3-4-3" },
    { key: "rennes", name: "แรนส์", short: "REN", color: "#e13327", tier: 5, formation: "4-3-3" },
    { key: "marseille", name: "มาร์กเซย เอฟซี", short: "MAR", color: "#2faee0", tier: 6, formation: "4-2-3-1" },
    { key: "stras", name: "สตราส์บูร์ก", short: "STR", color: "#0055a4", tier: 5, formation: "4-2-3-1" },
    { key: "nantes", name: "น็องต์", short: "NAN", color: "#ffdc00", tier: 4, formation: "4-2-3-1" },
    { key: "reims", name: "แรนส์ ชัมเปญ", short: "REI", color: "#e30613", tier: 4, formation: "4-4-2" },
    { key: "toulouse", name: "ตูลูส", short: "TOU", color: "#582c83", tier: 4, formation: "4-2-3-1" },
    { key: "brest", name: "เบรสต์", short: "BRE", color: "#e30613", tier: 5, formation: "4-3-3" },
    { key: "lorient", name: "ลอริองต์", short: "LOR", color: "#f5811e", tier: 4, formation: "4-4-2" },
    { key: "montp", name: "มงเปลลิเย่", short: "MTP", color: "#1e3a8a", tier: 4, formation: "4-2-3-1" },
  ],
  germany: [
    { key: "bayern", name: "เสือใต้ บาเยิร์น", short: "BAY", color: "#dc052d", tier: 10, formation: "4-2-3-1" },
    { key: "dort", name: "เหลืองดำ ดอร์ทมุนด์", short: "BVB", color: "#fde100", tier: 8, formation: "4-2-3-1" },
    { key: "lever", name: "ไบเออร์ เลเวอร์", short: "LEV", color: "#e32221", tier: 8, formation: "3-4-3" },
    { key: "leipzig", name: "กระต่าย ไลป์ซิก", short: "RBL", color: "#dd0741", tier: 7, formation: "4-2-3-1" },
    { key: "stuttgart", name: "สตุตการ์ท", short: "STU", color: "#e32219", tier: 7, formation: "4-2-3-1" },
    { key: "frank", name: "อินทรี แฟรงค์เฟิร์ต", short: "SGE", color: "#e1000f", tier: 6, formation: "3-4-2-1" },
    { key: "wolfs", name: "หมาป่า ว็อล์ฟส์", short: "WOB", color: "#65b32e", tier: 6, formation: "4-2-3-1" },
    { key: "gladb", name: "ม้า เสือ กลัดบัค", short: "BMG", color: "#000000", tier: 6, formation: "3-5-2" },
    { key: "union", name: "ยูเนียน เบอร์ลิน", short: "UNB", color: "#eb1923", tier: 5, formation: "3-5-2" },
    { key: "freiburg", name: "ไฟรบูร์ก", short: "SCF", color: "#e2001a", tier: 5, formation: "4-2-3-1" },
    { key: "hoff", name: "ฮอฟเฟ่นไฮม์", short: "TSG", color: "#1f5da0", tier: 5, formation: "4-3-3" },
    { key: "werder", name: "เวอร์เดอร์ เบรเมน", short: "SVW", color: "#1d9053", tier: 4, formation: "4-3-3" },
    { key: "augs", name: "เอาก์สบูร์ก", short: "AUG", color: "#ba3733", tier: 4, formation: "4-2-3-1" },
    { key: "mainz", name: "ไมนซ์ 05", short: "M05", color: "#c3141e", tier: 4, formation: "3-4-3" },
    { key: "bochum", name: "โบคุม", short: "BOC", color: "#005ca9", tier: 3, formation: "4-4-2" },
    { key: "koln", name: "โคโลญจน์", short: "KOE", color: "#ed1c24", tier: 4, formation: "4-2-3-1" },
  ],
  italy: [
    { key: "neroazz", name: "ดำน้ำเงิน อินเตอร์", short: "INT", color: "#010e80", tier: 9, formation: "3-5-2" },
    { key: "rossoneri", name: "แดงดำ มิลาน", short: "MIL", color: "#fb090b", tier: 8, formation: "4-2-3-1" },
    { key: "biancon", name: "ขาวดำ ยูเว", short: "JUV", color: "#ffffff", tier: 7, formation: "3-5-2" },
    { key: "azzurro", name: "ฟ้าขาว นาโปลี", short: "NAP", color: "#12a0d7", tier: 8, formation: "4-3-3" },
    { key: "giallor", name: "เหลืองแดง โรoma", short: "ROM", color: "#8e1f2f", tier: 7, formation: "4-3-3" },
    { key: "biancoce", name: "ฟ้าขาว ลาซio", short: "LAZ", color: "#87d8f7", tier: 7, formation: "4-3-3" },
    { key: "oroblu", name: "น้ำเงินดำ อatalanta", short: "ATA", color: "#1e71b8", tier: 7, formation: "3-4-2-1" },
    { key: "viola", name: "ม่วง ฟio", short: "FIO", color: "#482d8c", tier: 6, formation: "4-2-3-1" },
    { key: "rossoblu", name: "แดงน้ำเงิn โbologna", short: "BOL", color: "#1a2958", tier: 6, formation: "4-2-3-1" },
    { key: "granata", name: "แกranata ทorino", short: "TOR", color: "#8b0015", tier: 5, formation: "3-5-2" },
    { key: "verona", name: "hellas เวrโนa", short: "VER", color: "#003082", tier: 4, formation: "3-4-2-1" },
    { key: "friuli", name: "Udinese", short: "UDI", color: "#000000", tier: 5, formation: "3-5-2" },
    { key: "grifone", name: "Grifone เจนoa", short: "GEN", color: "#8b0000", tier: 4, formation: "4-3-3" },
    { key: "cagliari", name: "Cagliari", short: "CAG", color: "#00205b", tier: 4, formation: "4-3-3" },
    { key: "empoli", name: "Empoli", short: "EMP", color: "#0066cc", tier: 4, formation: "4-3-3" },
    { key: "lecce", name: "Lecce", short: "LEC", color: "#f6c304", tier: 4, formation: "4-3-3" },
  ],
  portugal: [
    { key: "porto", name: "มังกรน้ำเงิน ปอร์โต้", short: "POR", color: "#003893", tier: 8, formation: "4-3-3" },
    { key: "benfica", name: "นกอินทรี เบนฟิกา", short: "BEN", color: "#e30613", tier: 8, formation: "4-3-3" },
    { key: "sporting", name: "สปอร์ติ้ง ลิสบอน", short: "SCP", color: "#008057", tier: 7, formation: "3-4-3" },
    { key: "braga", name: "บราก้า", short: "BRA", color: "#c8102e", tier: 6, formation: "4-2-3-1" },
    { key: "guimaraes", name: "กิมาไรช์", short: "GUI", color: "#ffffff", tier: 5, formation: "4-3-3" },
    { key: "boavista", name: "โบอาวิชตา", short: "BOA", color: "#000000", tier: 4, formation: "4-4-2" },
    { key: "famalicao", name: "ฟามาลิเกา", short: "FAM", color: "#005baa", tier: 4, formation: "4-2-3-1" },
    { key: "rioave", name: "ริโออาวี", short: "RAV", color: "#006633", tier: 4, formation: "4-4-2" },
    { key: "estoril", name: "เอสโตริล", short: "EST", color: "#ffcc00", tier: 3, formation: "4-3-3" },
    { key: "arouca", name: "อาโรก้า", short: "ARO", color: "#ffcc00", tier: 3, formation: "4-4-2" },
    { key: "vizela", name: "วิเซล่า", short: "VIZ", color: "#005baa", tier: 3, formation: "4-2-3-1" },
    { key: "chaves", name: "ชาเวส", short: "CHA", color: "#e30613", tier: 3, formation: "4-4-2" },
    { key: "casa", name: "คาซ่า เปีย", short: "CAS", color: "#000000", tier: 3, formation: "4-3-3" },
    { key: "portimon", name: "ปอร์ติมาเนนส์", short: "PTM", color: "#000000", tier: 3, formation: "4-2-3-1" },
    { key: "farense", name: "ฟาเรนเซ่", short: "FAR", color: "#ffffff", tier: 2, formation: "4-4-2" },
    { key: "moreirense", name: "โมไรเรนเซ่", short: "MOR", color: "#006633", tier: 3, formation: "4-2-3-1" },
  ],
  saudi: [
    { key: "hilal", name: "พระจันทร์ ฮิลาล", short: "HIL", color: "#005baa", tier: 8, formation: "4-3-3" },
    { key: "nassr", name: "วิคตอรี่ นาสร์", short: "NAS", color: "#ffcc00", tier: 8, formation: "4-2-3-1" },
    { key: "ittihad", name: "อิตติฮัด", short: "ITT", color: "#ffcc00", tier: 7, formation: "4-3-3" },
    { key: "ahli", name: "อัลอาห์ลี", short: "AHL", color: "#006633", tier: 7, formation: "4-2-3-1" },
    { key: "shabab", name: "ชาบาบ", short: "SHB", color: "#ffffff", tier: 6, formation: "4-4-2" },
    { key: "ettifaq", name: "เอตติฟัก", short: "ETF", color: "#006633", tier: 5, formation: "4-2-3-1" },
    { key: "fateh", name: "ฟาเตห์", short: "FAT", color: "#005baa", tier: 5, formation: "4-4-2" },
    { key: "taawon", name: "ตะอวון", short: "TAA", color: "#ffcc00", tier: 5, formation: "4-3-3" },
    { key: "khaleej", name: "คาลีจ", short: "KHA", color: "#e30613", tier: 4, formation: "4-4-2" },
    { key: "fayha", name: "ฟายฮา", short: "FAY", color: "#ff6600", tier: 4, formation: "4-2-3-1" },
    { key: "raed", name: "ราเอด", short: "RAE", color: "#e30613", tier: 4, formation: "4-4-2" },
    { key: "damac", name: "ดามัค", short: "DAM", color: "#8b0000", tier: 4, formation: "5-3-2" },
    { key: "abha", name: "อับฮา", short: "ABH", color: "#ffcc00", tier: 3, formation: "4-3-3" },
    { key: "akhdoud", name: "อัคดูด", short: "AKH", color: "#006633", tier: 3, formation: "4-2-3-1" },
    { key: "hazem", name: "ฮาเซม", short: "HAZ", color: "#005baa", tier: 3, formation: "4-4-2" },
    { key: "riyadh", name: "ริยาดห์ เอฟซี", short: "RIY", color: "#e30613", tier: 3, formation: "4-3-3" },
  ],
  thailand: [
    { key: "buriram", name: "ปราสาทเพชร บุรีรัมย์", short: "BUR", color: "#1e3a8a", tier: 7, formation: "4-3-3" },
    { key: "muangthong", name: "กิเลน เอสโซ่", short: "MTU", color: "#e30613", tier: 7, formation: "4-2-3-1" },
    { key: "port", name: "ปลาฉลาม การท่า", short: "POR", color: "#005baa", tier: 6, formation: "4-3-3" },
    { key: "bangkok", name: "กรุงเทพ ยูไนเต็ด", short: "BKK", color: "#ffd700", tier: 6, formation: "4-4-2" },
    { key: "chonburi", name: "ฉลามชล ชลบุรี", short: "CHB", color: "#005baa", tier: 5, formation: "4-4-2" },
    { key: "true", name: "ทรู แบงค็อก", short: "TRU", color: "#ff6600", tier: 6, formation: "4-3-3" },
    { key: "ratcha", name: "ราชัน บีจี", short: "RAT", color: "#006633", tier: 6, formation: "4-2-3-1" },
    { key: "nakhon", name: "นนท์ ยูไนเต็ด", short: "NKT", color: "#e30613", tier: 5, formation: "4-4-2" },
    { key: "sukhothai", name: "สุโขทัย เอฟซี", short: "SKT", color: "#ffcc00", tier: 5, formation: "4-3-3" },
    { key: "rayong", name: "ระยอง เอฟซี", short: "RYG", color: "#005baa", tier: 4, formation: "4-4-2" },
    { key: "prachuap", name: "ประจวบ เอฟซี", short: "PRC", color: "#8b0000", tier: 4, formation: "4-2-3-1" },
    { key: "lamphun", name: "ลำพูน วอริเออร์", short: "LMP", color: "#e30613", tier: 4, formation: "4-3-3" },
    { key: "uthai", name: "อุทัยธานี", short: "UTH", color: "#ff6600", tier: 3, formation: "4-4-2" },
    { key: "kanchan", name: "กาญจนบุรี", short: "KAN", color: "#006633", tier: 3, formation: "4-2-3-1" },
    { key: "police", name: "ตำรวจ เอฟซี", short: "POL", color: "#1e3a8a", tier: 3, formation: "4-4-2" },
    { key: "nongbua", name: "หนองบัว พิชัย", short: "NGB", color: "#ffcc00", tier: 3, formation: "4-3-3" },
  ],
};

/** ~2,944 นักเตะ · 8 ลีก · ~252 ซูเปอร์สตาร์ */
export const LEGEND_PLAYERS = ROSTER_LEGEND_PLAYERS;

export function getLeagueTeams(leagueId) {
  return LEGEND_TEAMS[leagueId] || [];
}

export function getLegendsForLeague(leagueId) {
  return LEGEND_PLAYERS.filter((p) => p.leagueId === leagueId);
}

export function getLegendById(legendId) {
  return LEGEND_PLAYERS.find((p) => p.legendId === legendId);
}

const LEAGUE_DEFAULT_NAT = {
  england: "EN", spain: "ES", italy: "IT", france: "FR", germany: "DE", portugal: "PT", saudi: "SA", thailand: "TH",
};

export function legendNationality(def) {
  if (!def) return "EN";
  return def.nationality || LEAGUE_DEFAULT_NAT[def.leagueId] || "EN";
}

export function getLegendsForTeam(leagueId, teamKey) {
  return LEGEND_PLAYERS.filter((p) => p.leagueId === leagueId && p.teamKey === teamKey);
}
