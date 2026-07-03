/**
 * Team Staff role guide — อธิบายบัพแต่ละตำแหน่ง (TH/EN)
 * ใช้ในแท็บคู่มือสตาฟ — sync กับ logic จริงใน football-manager + club-systems
 */

export const STAFF_GUIDE_CATEGORIES = [
  { id: "manager", icon: "◆", th: "ผู้จัดการทีม", en: "Manager" },
  { id: "coaches", icon: "🧢", th: "โค้ช", en: "Coaches" },
  { id: "medical", icon: "🏥", th: "ทีมแพทย์", en: "Medical" },
  { id: "scouts", icon: "🔭", th: "แมวมอง", en: "Scouts" },
  { id: "support", icon: "🤝", th: "สตาฟสนับสนุน", en: "Support staff" },
];

/** @typedef {{ id: string, category: string, icon: string, titleTh: string, titleEn: string, subtitleTh?: string, subtitleEn?: string, effectsTh: string[], effectsEn: string[], hireTh: string, hireEn: string, staffKey?: string, cardType?: string }} StaffGuideRole */

/** @type {StaffGuideRole[]} */
export const STAFF_GUIDE_ROLES = [
  {
    id: "MANAGER",
    category: "manager",
    icon: "◆",
    cardType: "MANAGER",
    titleTh: "ผู้จัดการทีม (Manager)",
    titleEn: "Manager",
    subtitleTh: "การ์ด 1–7★ · เปลี่ยนได้ตลอด (ไม่ล็อกฤดูกาล)",
    subtitleEn: "1–7★ card · can be replaced anytime (no season lock)",
    effectsTh: [
      "รายงานก่อนเกม + คำแนะนำ XI / แผน (ยิ่งดาวสูง ละเอียดและแม่นขึ้น)",
      "โหมดออโต้: วางแผนก่อนเกมอัตโนมัติ (ตั้งแต่ 3★ ขึ้นไป)",
      "ปั้นนักเตะจากแผนฝึกรายวัน (devMult ตามดาว)",
      "ขวัญกำลังใจหลังเกม / หลังแพ้ (moraleBonus)",
      "คุ้นแผนเร็วขึ้นเมื่อใช้ formation เดิม (famBonus)",
      "เจรจาซื้อนักเตะถูกลง (negotiationPct)",
      "EXP ผจก. + โบนัสพลังทีมตามดาว",
    ],
    effectsEn: [
      "Pre-match report + XI / tactic advice (richer at higher stars)",
      "Auto mode: auto match prep from 3★+",
      "Training-day player development boost (devMult by stars)",
      "Post-match morale swing (moraleBonus)",
      "Faster tactic familiarity on same formation (famBonus)",
      "Cheaper transfer fees (negotiationPct)",
      "Manager XP gain + team performance bonus by stars",
    ],
    hireTh: "แท็บ ผจก. · การ์ดสตาฟประเภท MANAGER · ผู้สมัครรายสัปดาห์",
    hireEn: "Mgr tab · MANAGER staff cards · weekly applicants",
  },
  {
    id: "COACH_GK",
    category: "coaches",
    icon: "🧤",
    cardType: "COACH",
    staffKey: "GK",
    titleTh: "โค้ช GK",
    titleEn: "GK Coach",
    effectsTh: [
      "ปั้นสเตตนักเตะ GK ทุกวันฝึก (ยิ่งเกรด/ดาวสูง ยิ่งแรง)",
      "ซ้อมรายตำแหน่ง GK ใช้งบ drill ได้",
      "สิ่งอำนวยความสะดวกสนามฝึก Lv. สูง → โบนัสเพิ่ม",
    ],
    effectsEn: [
      "Daily training attr bump for GK players (grade/star scaled)",
      "Position drill sessions for GK",
      "Training facility level boosts coach output",
    ],
    hireTh: "เมนูเพิ่มเติม → ห้องโค้ช · การ์ด COACH สาย GK",
    hireEn: "More → Coach room · COACH card (GK)",
  },
  {
    id: "COACH_DF",
    category: "coaches",
    icon: "🛡",
    cardType: "COACH",
    staffKey: "DF",
    titleTh: "โค้ชกองหลัง",
    titleEn: "Defence Coach",
    effectsTh: ["ปั้นสเตต DF ทุกวันฝึก", "ซ้อมรายตำแหน่ง DF", "สนามฝึก Lv. สูง → โบนัสเพิ่ม"],
    effectsEn: ["Daily DF training bump", "DF position drills", "Training facility boosts output"],
    hireTh: "ห้องโค้ช · การ์ด COACH สาย DF",
    hireEn: "Coach room · COACH card (DF)",
  },
  {
    id: "COACH_MF",
    category: "coaches",
    icon: "⚙",
    cardType: "COACH",
    staffKey: "MF",
    titleTh: "โค้ชกองกลาง",
    titleEn: "Midfield Coach",
    effectsTh: ["ปั้นสเตต MF ทุกวันฝึก", "ซ้อมรายตำแหน่ง MF", "สนามฝึก Lv. สูง → โบนัสเพิ่ม"],
    effectsEn: ["Daily MF training bump", "MF position drills", "Training facility boosts output"],
    hireTh: "ห้องโค้ช · การ์ด COACH สาย MF",
    hireEn: "Coach room · COACH card (MF)",
  },
  {
    id: "COACH_FW",
    category: "coaches",
    icon: "⚽",
    cardType: "COACH",
    staffKey: "FW",
    titleTh: "โค้ชกองหน้า",
    titleEn: "Attack Coach",
    effectsTh: ["ปั้นสเตต FW ทุกวันฝึก", "ซ้อมรายตำแหน่ง FW", "สนามฝึก Lv. สูง → โบนัสเพิ่ม"],
    effectsEn: ["Daily FW training bump", "FW position drills", "Training facility boosts output"],
    hireTh: "ห้องโค้ช · การ์ด COACH สาย FW",
    hireEn: "Coach room · COACH card (FW)",
  },
  {
    id: "COACH_FITNESS",
    category: "coaches",
    icon: "💪",
    cardType: "COACH",
    staffKey: "FITNESS",
    titleTh: "โค้ชฟิตเนส",
    titleEn: "Fitness Coach",
    effectsTh: [
      "ฟื้นสตามินารายวันให้ทั้งทีม (boost ×10 ต่อวัน)",
      "วันฝึกสาย FITNESS ได้ synergy พิเศษ",
    ],
    effectsEn: [
      "Daily squad stamina recovery (boost ×10 per day)",
      "Extra synergy on FITNESS training days",
    ],
    hireTh: "ห้องโค้ช · การ์ด COACH สาย FITNESS",
    hireEn: "Coach room · COACH card (FITNESS)",
  },
  {
    id: "PHYSIO",
    category: "medical",
    icon: "🩺",
    cardType: "DOCTOR",
    staffKey: "PHYSIO",
    titleTh: "หมอ (Physio)",
    titleEn: "Physio",
    effectsTh: [
      "ลดโอกาสบาดเจ็บหลังลงสนaments",
      "ลดจำนวนวันพักเมื่อเจ็บครั้งแรก",
      "ฟื้นวันพักรายวัน: โอกาสตัด +1 วัน (ยิ่งเกรดสูงยิ่งสูง)",
      "มีหัวหน้าแพทย์ → บัพ boost หมอให้แรงขึ้น (ลดบาดเจ็บ + ฟื้นเร็วขึ้น)",
    ],
    effectsEn: [
      "Lower injury chance after matches",
      "Shorter initial injury duration",
      "Daily recovery: chance for +1 day cut (grade scaled)",
      "Head medical boosts physio effectiveness",
    ],
    hireTh: "ห้องพยาบาล · การ์ด DOCTOR · ผู้สมัครรายสัปดาห์",
    hireEn: "Medical room · DOCTOR card · weekly applicants",
  },
  {
    id: "PHYSIOTHERAPIST",
    category: "medical",
    icon: "🦵",
    cardType: "DOCTOR",
    staffKey: "PHYSIOTHERAPIST",
    titleTh: "นักกายภาพ",
    titleEn: "Physiotherapist",
    effectsTh: [
      "ฟื้นวันพักรายวัน: โอกาสตัด +1 วัน (boost × 0.5)",
      "มีหัวหน้าแพทย์ → บัพ boost นักกายภาพให้โอกาสสูงขึ้น",
    ],
    effectsEn: [
      "Daily recovery: chance for +1 day cut (boost × 0.5)",
      "Head medical boosts therapist effectiveness",
    ],
    hireTh: "ห้องพยาบาล · การ์ด DOCTOR · ผู้สมัครรายสัปดาห์",
    hireEn: "Medical room · DOCTOR card · weekly applicants",
  },
  {
    id: "HEAD_MEDICAL",
    category: "medical",
    icon: "⚕️",
    cardType: "HEAD_MEDICAL",
    staffKey: "HEAD_MEDICAL",
    titleTh: "หัวหน้าแพทย์",
    titleEn: "Head of Medical",
    effectsTh: [
      "บัพเสริมหมอ + นักกายภาพ (ไม่สุ่มตัดวันแยก — เพิ่มประสิทธิ์ของทั้งคู่)",
      "เจ็บเกิน 5 วัน (เหลือ 6+ วัน): สุ่มตัด 1–3 วัน · 7★=15% · 6★=10% · 5★=5% · 4★=3% · 3★=2% · 2★=1% · 1★=0.5%",
      "บัพพลังงานเล็กน้อย (+1 ถึง +3) ระหว่างพักฟื้น",
    ],
    effectsEn: [
      "Buffs physio & therapist (no separate daily roll — amplifies both)",
      "6+ injury days left: random 1–3 day cut · 7★=15% · 6★=10% · 5★=5% · 4★=3% · 3★=2% · 2★=1% · 1★=0.5%",
      "Small stamina rehab bonus (+1 to +3) while injured",
    ],
    hireTh: "แท็บ สโมสร → สตาฟสนับสนุน · การ์ด HEAD_MEDICAL",
    hireEn: "Club tab → Support staff · HEAD_MEDICAL card",
  },
  {
    id: "SCOUT_MARKET",
    category: "scouts",
    icon: "🔭",
    cardType: "SCOUT",
    titleTh: "แมวมองตลาด (ทีมชุดใหญ่)",
    titleEn: "First-team Scout",
    effectsTh: [
      "ค้นหานักเตะพร้อมซื้อในแท็บตลาดทุกวัน (findChance ตามเกรด)",
      "เรต / ราคาที่พบขึ้นกับเกรดแมวมอง",
      "มี Sporting Director → เรตที่พบดีขึ้น + ซื้อถูกลง",
    ],
    effectsEn: [
      "Daily market finds (findChance by grade)",
      "Find quality & fees scale with scout grade",
      "Sporting Director improves find rating + buy discount",
    ],
    hireTh: "ตลาด → Scout · การ์ด SCOUT (ช่องแรก = ทีมชุดใหญ่)",
    hireEn: "Market → Scout · SCOUT card (first slot = first team)",
  },
  {
    id: "SCOUT_YOUTH",
    category: "scouts",
    icon: "🔎",
    cardType: "SCOUT",
    titleTh: "แมวมองเยาวชน",
    titleEn: "Youth Scout",
    effectsTh: [
      "ค้นหาดาวรุ่งในอคาเดมี (คุณภาพ / ตำแหน่งถนัด)",
      "เทคแล็บฝึกซ้อม Lv. สูง → ดาวรุ่งเก่งขึ้น",
    ],
    effectsEn: [
      "Youth prospect finds in academy",
      "Tech lab level improves prospect quality",
    ],
    hireTh: "อคาเดมี · การ์ด SCOUT (ช่องที่สอง = เยาวชน)",
    hireEn: "Academy · SCOUT card (second slot = youth)",
  },
  {
    id: "ASSISTANT",
    category: "support",
    icon: "📋",
    cardType: "ASSISTANT",
    staffKey: "ASSISTANT",
    titleTh: "ผู้ช่วยผู้จัดการทีม",
    titleEn: "Assistant Manager",
    effectsTh: [
      "ขวักำลังใจหลังเกมดีขึ้น (moraleBonus ตาม boost)",
      "คุ้นแผน formation เร็วขึ้น (famBonus)",
      "ปั้นนักเตะจากแผนฝึกแรงขึ้น (devMult)",
    ],
    effectsEn: [
      "Better post-match morale (moraleBonus)",
      "Faster tactic familiarity (famBonus)",
      "Stronger training development (devMult)",
    ],
    hireTh: "แท็บ สโมสร → สตาฟสนับสนุน · การ์ด ASSISTANT",
    hireEn: "Club tab → Support staff · ASSISTANT card",
  },
  {
    id: "ANALYST",
    category: "support",
    icon: "📊",
    cardType: "ANALYST",
    staffKey: "ANALYST",
    titleTh: "Data Analyst",
    titleEn: "Data Analyst",
    effectsTh: [
      "รายงานก่อนเกมละเอียดขึ้น (insight / prep / mark)",
      "ส่งแผนลงสนาม + ประกบตัวอันตรายใน scout report",
      "แท็บฝึกซ้อม: แนะนำสเตตที่ควรซ้อม + จัดบอร์ดท่าซ้อมตามตำแหน่ง",
    ],
    effectsEn: [
      "Richer pre-match scout report (insight / prep / mark)",
      "Better match prep & opposition marking in briefing",
      "Training tab: per-player drill advice & position drill presets",
    ],
    hireTh: "แท็บ สโมสร · การ์ด ANALYST",
    hireEn: "Club tab · ANALYST card",
  },
  {
    id: "DIRECTOR",
    category: "support",
    icon: "🤝",
    cardType: "DIRECTOR",
    staffKey: "DIRECTOR",
    titleTh: "Sporting Director",
    titleEn: "Sporting Director",
    effectsTh: [
      "ซื้อนักเตะถูกลง (negotiationPct / buyDiscount)",
      "ขายนักเตะได้ราคาดีขึ้น (sellBonus)",
      "แมวมองเจอเรตสูงขึ้น (scoutRatingBonus)",
    ],
    effectsEn: [
      "Cheaper signings (buy discount)",
      "Better sell prices (sell bonus)",
      "Scout finds higher ratings",
    ],
    hireTh: "แท็บ สโมสร · การ์ด DIRECTOR",
    hireEn: "Club tab · DIRECTOR card",
  },
];

export function staffGuideCategories(lang = "th") {
  const en = lang === "en";
  return STAFF_GUIDE_CATEGORIES.map((c) => ({
    id: c.id,
    icon: c.icon,
    label: en ? c.en : c.th,
  }));
}

export function staffGuideRolesByCategory(categoryId, lang = "th") {
  const en = lang === "en";
  return STAFF_GUIDE_ROLES.filter((r) => r.category === categoryId).map((r) => ({
    id: r.id,
    icon: r.icon,
    title: en ? r.titleEn : r.titleTh,
    subtitle: en ? r.subtitleEn : r.subtitleTh,
    effects: en ? r.effectsEn : r.effectsTh,
    hire: en ? r.hireEn : r.hireTh,
    staffKey: r.staffKey,
    cardType: r.cardType,
  }));
}

/** ตรวจว่าจ้างตำแหน่งนี้แล้วหรือยัง */
export function isStaffGuideRoleHired(career, role) {
  if (!career || !role.staffKey) return false;
  const st = career.staff?.[career.userTeamId] || {};
  if (role.staffKey === "HEAD_MEDICAL" || ["ASSISTANT", "ANALYST", "DIRECTOR"].includes(role.staffKey)) {
    return Boolean(st[role.staffKey]);
  }
  return Boolean(st[role.staffKey]);
}

export function isStaffGuideSpecialHired(career, roleId) {
  if (!career) return false;
  if (roleId === "MANAGER") return Boolean(career.teams?.find((t) => t.id === career.userTeamId)?.manager);
  if (roleId === "SCOUT_MARKET") return Boolean(career.marketScout);
  if (roleId === "SCOUT_YOUTH") return Boolean(career.youthScout);
  return false;
}
