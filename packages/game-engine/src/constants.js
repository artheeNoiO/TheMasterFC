export const FIRST_NAMES = ["กันต์","ชัย","ธนา","วิชัย","สมชาย","อนันต์","ปิติ","ณัฐ","กิตติ","สุรศักดิ์","เอกชัย","ภูมิ","ธีระ","วรุตม์","ชนะ","อดิศักดิ์","ปกรณ์","ศักดิ์ดา","พีระ","จักรพันธ์"];
export const LAST_NAMES = ["แสงทอง","ศรีสุข","บุญมี","วงศ์ษา","ทองดี","พงษ์พันธุ์","รุ่งเรือง","ชัยมงคล","สายชล","เพชรรัตน์","อินทร์แก้ว","ธนากร","จันทร์เพ็ญ","ไพศาล","ศรีวิไล"];

export const BOT_TEAM_DEFS = [
  { name: "ลำปาง ไอรอนเกท", short: "LPI", color: "#7a5c3e", tier: -3 },
  { name: "แพร่ ซิลค์ ซิตี้", short: "PSC", color: "#9d6fe0", tier: -4 },
  { name: "กาญจนบุรี ริเวอร์แลนด์ส", short: "KRL", color: "#2f6690", tier: -4 },
  { name: "สุพรรณบุรี บูล", short: "SPB", color: "#1b4965", tier: -5 },
  { name: "ตาก บอร์เดอร์ แรงเจอร์ส", short: "TBR", color: "#6b705c", tier: -5 },
  { name: "กระบี่ อันดามัน โคฟ", short: "KAC", color: "#0a9396", tier: -6 },
  { name: "เพชรบุรี ซอลท์ ซิตี้", short: "PSS", color: "#ee9b00", tier: -6 },
  { name: "บุรีรัมย์ เอิร์ธ เอฟซี", short: "BRE", color: "#9b2226", tier: -7 },
  { name: "เลย ไฮแลนด์ เอฟซี", short: "LHF", color: "#606c38", tier: -7 },
  { name: "ชุมพร เกทเวย์", short: "CPG", color: "#283618", tier: -8 },
  { name: "สตูล เซาท์เทิร์น สตาร์", short: "SSS", color: "#5f0f40", tier: -8 },
  { name: "มุกดาหาร เมคอง ยูไนเต็ด", short: "MMU", color: "#0f4c5c", tier: -9 },
  { name: "ปราจีนบุรี พาวเวอร์", short: "PJP", color: "#e36414", tier: -9 },
  { name: "สิงห์บุรี สโตนคัตเตอร์ส", short: "SBS", color: "#3a5a40", tier: -10 },
  { name: "อุตรดิตถ์ ธันเดอร์โบลท์", short: "UTB", color: "#4a4e69", tier: -10 },
];

export const FORMATIONS = {
  "4-4-2": { label: "4-4-2", counts: { GK: 1, DF: 4, MF: 4, FW: 2 } },
  "4-3-3": { label: "4-3-3", counts: { GK: 1, DF: 4, MF: 3, FW: 3 } },
  "3-5-2": { label: "3-5-2", counts: { GK: 1, DF: 3, MF: 5, FW: 2 } },
  "5-3-2": { label: "5-3-2", counts: { GK: 1, DF: 5, MF: 3, FW: 2 } },
};

export const FORMATION_KEYS = Object.keys(FORMATIONS);
export const MATCHUP_CYCLE = ["4-3-3", "4-4-2", "5-3-2", "3-5-2"];
export const SQUAD_TEMPLATE = ["GK","GK","DF","DF","DF","DF","DF","DF","MF","MF","MF","MF","MF","MF","FW","FW","FW","FW"];

export const ATTR_GROUPS = {
  technical: ["finishing", "passing", "tackling", "dribbling", "crossing", "heading"],
  mental: ["vision", "decisions", "composure", "determination", "workRate"],
  physical: ["pace", "acceleration", "strength", "agility"],
};

export const ATK_ATTRS = ["finishing", "dribbling", "crossing", "pace", "composure"];
export const DEF_ATTRS = ["tackling", "heading", "strength", "decisions", "determination"];
export const ALL_ATTRS = [...ATTR_GROUPS.technical, ...ATTR_GROUPS.mental, ...ATTR_GROUPS.physical];

export const LEAGUE_NAME = "Challenger League";
export const TEAMS_PER_SHARD = 16;
export const MATCH_DAYS_PER_SEASON = 15;
