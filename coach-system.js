/**
 * Coach system — profiles, training impact, UI helpers
 */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const COACHING_STYLES = {
  technical: { th: "เทคนิค", en: "Technical" },
  physical: { th: "ฟิสิคัล", en: "Physical" },
  tactical: { th: "แทคติก", en: "Tactical" },
  balanced: { th: "บาลานซ์", en: "Balanced" },
};

/** สัญชาตญาณโค้ช (trait) — สุ่มติดตัวตอนสร้างโปรไฟล์ ให้โค้ชแต่ละคนมีบุคลิก/จุดเด่นต่างกัน ไม่ใช่แค่เลขสเตต */
export const COACH_TRAITS = {
  youthGuru: { th: "กูรูดาวรุ่ง", en: "Youth Guru", descTh: "ปั้นนักเตะอายุ ≤21 ได้เร็วขึ้น 40%", descEn: "+40% growth for players aged 21 or under" },
  tactician: { th: "นักวางแผน", en: "Tactician", descTh: "ช่วยให้ทีมคุ้นเคยแผนใหม่เร็วขึ้น", descEn: "Speeds up tactic familiarity gain" },
  hardTrainer: { th: "จอมโหด", en: "Hard Trainer", descTh: "ฝึกเร็วขึ้น 20% แต่มูดนักเตะขึ้นยากกว่าเดิม", descEn: "+20% training but morale rises slower" },
  motivator: { th: "นักสร้างแรงบันดาลใจ", en: "Motivator", descTh: "โอกาสมูดขึ้นหลังซ้อมสูงกว่าปกติมาก", descEn: "Much higher chance of morale boost after training" },
  fitnessFocus: { th: "เข้มฟิตเนส", en: "Fitness-Focused", descTh: "ฟื้นสตามินาให้ทีมเพิ่มอีก 25%", descEn: "+25% extra stamina recovery for the squad" },
};
const TRAIT_POOL_BY_SPEC = {
  GK: ["tactician", "hardTrainer", "motivator"],
  DF: ["tactician", "hardTrainer", "motivator"],
  MF: ["tactician", "youthGuru", "motivator"],
  FW: ["youthGuru", "hardTrainer", "motivator"],
  FITNESS: ["fitnessFocus", "hardTrainer", "motivator"],
};

export const COACH_SPECIALTY_DEF = {
  GK: {
    icon: "🧤",
    stylePool: ["technical", "tactical", "balanced"],
    focusTh: ["การตัดสินใจ", "ความคล่องตัว", "สมาธิ"],
    focusEn: ["Decisions", "Agility", "Composure"],
    attrs: ["decisions", "agility", "composure"],
    synergyTh: { DEFENDING: "×1.5 วันซ้อมเกมรับ", TACKLING: "×1.3 วันสกัด", BALANCED: "×1.2 ทั่วไป" },
    synergyEn: { DEFENDING: "×1.5 defending day", TACKLING: "×1.3 tackling day", BALANCED: "×1.2 balanced" },
    roleTh: "ปั้น GK รายวัน + บอร์ดซ้อม GK",
    roleEn: "Daily GK growth + GK drill board",
  },
  DF: {
    icon: "🛡",
    stylePool: ["tactical", "physical", "balanced"],
    focusTh: ["สกัด", "โหม่ง", "ความแข็งแรง"],
    focusEn: ["Tackling", "Heading", "Strength"],
    attrs: ["tackling", "heading", "strength"],
    synergyTh: { DEFENDING: "×3 วันซ้อมเกมรับ", TACKLING: "×2.5 วันสกัด", BALANCED: "×1.2 ทั่วไป" },
    synergyEn: { DEFENDING: "×3 defending day", TACKLING: "×2.5 tackling day", BALANCED: "×1.2 balanced" },
    roleTh: "ปั้น DF รายวัน + บอร์ดซ้อม DF",
    roleEn: "Daily DF growth + DF drill board",
  },
  MF: {
    icon: "⚙",
    stylePool: ["technical", "tactical", "balanced"],
    focusTh: ["Passing", "Vision", "Work rate"],
    focusEn: ["Passing", "Vision", "Work rate"],
    attrs: ["passing", "vision", "workRate"],
    synergyTh: { SHOOTING: "×1.5 วันซ้อมยิง", TACKLING: "×2 วันสกัด", BALANCED: "×1.2 ทั่วไป" },
    synergyEn: { SHOOTING: "×1.5 shooting day", TACKLING: "×2 tackling day", BALANCED: "×1.2 balanced" },
    roleTh: "ปั้น MF รายวัน + บอร์ดซ้อม MF",
    roleEn: "Daily MF growth + MF drill board",
  },
  FW: {
    icon: "⚽",
    stylePool: ["technical", "physical", "balanced"],
    focusTh: ["Finishing", "Dribbling", "Composure"],
    focusEn: ["Finishing", "Dribbling", "Composure"],
    attrs: ["finishing", "dribbling", "composure"],
    synergyTh: { SHOOTING: "×3 วันซ้อมยิง", BALANCED: "×1.2 ทั่วไป" },
    synergyEn: { SHOOTING: "×3 shooting day", BALANCED: "×1.2 balanced" },
    roleTh: "ปั้น FW รายวัน + บอร์ดซ้อม FW",
    roleEn: "Daily FW growth + FW drill board",
  },
  FITNESS: {
    icon: "💪",
    stylePool: ["physical", "balanced"],
    focusTh: ["Pace", "Strength", "Stamina recovery"],
    focusEn: ["Pace", "Strength", "Stamina recovery"],
    attrs: ["pace", "strength", "acceleration"],
    synergyTh: { FITNESS: "×2 วันฟิตเนส", BALANCED: "×1.1 ทั่วไป" },
    synergyEn: { FITNESS: "×2 fitness day", BALANCED: "×1.1 balanced" },
    roleTh: "ฟื้นสตามินาทั้งทีม + บัพวันฟิตเนส",
    roleEn: "Squad stamina recovery + fitness day boost",
  },
};

/** สร้างสเตตโค้ชจากดาว/เกรด */
export function buildCoachProfile(specialty, stars, grade, boost) {
  const def = COACH_SPECIALTY_DEF[specialty] || COACH_SPECIALTY_DEF.MF;
  const s = clamp(stars ?? grade ?? 3, 1, 7);
  const g = clamp(grade ?? s, 1, 7);
  const technique = clamp(Math.round(42 + s * 7 + g * 2 + (boost || 0.5) * 8), 38, 99);
  const motivation = clamp(Math.round(40 + s * 6 + g * 2 + (boost || 0.5) * 6), 35, 96);
  const drillSkill = clamp(Math.round(44 + s * 6 + g * 3 + (boost || 0.5) * 10), 40, 98);
  const coachingStyle = choice(def.stylePool || ["balanced"]);
  const trait = choice(TRAIT_POOL_BY_SPEC[specialty] || ["motivator"]);
  return {
    specialty,
    grade: g,
    boost: boost ?? Math.round((0.1 + g * 0.14) * 100) / 100,
    technique,
    motivation,
    drillSkill,
    coachingStyle,
    trait,
    seasonsServed: 0,
    focusAttrs: [...def.attrs],
  };
}

export function ensureCoachProfile(co, specialty) {
  if (!co) return co;
  const spec = specialty || co.specialty || "MF";
  if (co.technique == null) return { ...co, ...buildCoachProfile(spec, co.cardStars ?? co.grade ?? 3, co.grade, co.boost) };
  // เซฟเก่าก่อนมีระบบ trait/seasonsServed — เติมย้อนหลังโดยไม่แตะสเตตเดิม
  if (co.trait == null) return { ...co, trait: choice(TRAIT_POOL_BY_SPEC[spec] || ["motivator"]), seasonsServed: co.seasonsServed ?? 0 };
  return co;
}

/** เพิ่มปีประสบการณ์ให้โค้ช — เรียกตอนขึ้นฤดูกาลใหม่ ทุก 2 ฤดูกาลที่ทำงานต่อเนื่องได้ +1 เทคนิค/ทักษะซ้อม (เพดาน 99) */
export function applyCoachSeasonXp(co) {
  if (!co) return co;
  const c = ensureCoachProfile(co, co.specialty);
  const seasonsServed = (c.seasonsServed || 0) + 1;
  if (seasonsServed % 2 !== 0) return { ...c, seasonsServed };
  return {
    ...c,
    seasonsServed,
    technique: clamp(c.technique + 1, 38, 99),
    drillSkill: clamp(c.drillSkill + 1, 40, 99),
  };
}

/** ตัวคูณจากสัญชาตญาณ — ใช้ในสูตรฝึก/มูด/สตามินาที่เกี่ยวข้อง */
export function coachTraitDailyMult(co) {
  return co?.trait === "hardTrainer" ? 1.2 : 1;
}
export function coachTraitYouthMult(co, playerAge) {
  return co?.trait === "youthGuru" && (playerAge || 99) <= 21 ? 1.4 : 1;
}
export function coachTraitMoraleMult(co) {
  if (co?.trait === "motivator") return 2.2;
  if (co?.trait === "hardTrainer") return 0.5;
  return 1;
}
export function coachTraitFitnessMult(co) {
  return co?.trait === "fitnessFocus" ? 1.25 : 1;
}
export function coachTraitFamiliarityMult(co) {
  return co?.trait === "tactician" ? 1.35 : 1;
}

/** การปั้นสเตตรายวัน (ก่อนคูณสนามฝึก/synergy) — playerAge (ถ้าส่งมา) ใช้เช็คบัพกูรูดาวรุ่ง */
export function coachDailyAttrBump(co, playerAge = null) {
  const c = ensureCoachProfile(co, co?.specialty);
  const base = (c.boost || 0.1) * 0.085 + ((c.technique || 50) / 100) * 0.055;
  return base * coachTraitDailyMult(c) * (playerAge != null ? coachTraitYouthMult(c, playerAge) : 1);
}

/** โบนัสเพิ่มวันซ้อมตรงสาย */
export function coachSynergyExtraBump(co, synergyMult) {
  if (!co || synergyMult <= 1) return 0;
  const c = ensureCoachProfile(co, co.specialty);
  return (c.boost || 0) * 0.04 * synergyMult + ((c.motivation || 50) / 100) * 0.025 * synergyMult;
}

/** ตัวคูณบอร์ดซ้อมรายตำแหน่ง */
export function coachDrillMult(co) {
  if (!co) return 1;
  const c = ensureCoachProfile(co, co.specialty);
  return 1 + (c.boost || 0) * 0.48 + ((c.drillSkill || 50) / 100) * 0.38;
}

/** ฟื้นสตามินาจากโค้ชฟิตเนส */
export function coachFitnessStaminaPerDay(co) {
  if (!co) return 0;
  const c = ensureCoachProfile(co, "FITNESS");
  return Math.round(((c.boost || 0) * 12 + (c.technique || 50) * 0.07) * coachTraitFitnessMult(c));
}

/** มูด +1 โอกาสหลังซ้อม (วันที่ synergy) */
export function coachTrainingMoraleTick(co, synergyMult) {
  if (!co || synergyMult <= 1) return 0;
  const c = ensureCoachProfile(co, co.specialty);
  return Math.random() < clamp(((c.motivation || 50) / 120) * coachTraitMoraleMult(c), 0, 0.9) ? 1 : 0;
}

/** แสดงผล UI — % โดยประมาณ */
export function coachImpactSummary(co, lang = "th") {
  const c = ensureCoachProfile(co, co?.specialty);
  const def = COACH_SPECIALTY_DEF[c.specialty] || COACH_SPECIALTY_DEF.MF;
  const en = lang === "en";
  const dailyPct = Math.round(coachDailyAttrBump(c) * 1000) / 10;
  const drillPct = Math.round((coachDrillMult(c) - 1) * 100);
  const style = COACHING_STYLES[c.coachingStyle] || COACHING_STYLES.balanced;
  const trait = COACH_TRAITS[c.trait] || null;
  const focus = en ? def.focusEn : def.focusTh;
  const synergy = en ? def.synergyEn : def.synergyTh;
  const synergyLines = Object.values(synergy);
  const lines = en ? [
    `Style: ${style.en}`,
    `Daily train: ~${dailyPct}% attrs`,
    `Drill board: +${drillPct}%`,
    `Focus: ${focus.join(", ")}`,
    `Tech ${c.technique} · Mot ${c.motivation} · Drill ${c.drillSkill}`,
  ] : [
    `สไตล์: ${style.th}`,
    `ฝึกรายวัน: ~${dailyPct}% สเตต`,
    `บอร์ดซ้อม: +${drillPct}%`,
    `โฟกัส: ${focus.join(", ")}`,
    `เทคนิค ${c.technique} · แรงจูงใจ ${c.motivation} · ซ้อม ${c.drillSkill}`,
  ];
  if (c.specialty === "FITNESS") {
    lines.splice(2, 0, en ? `Stamina/day: +${coachFitnessStaminaPerDay(c)}` : `ฟื้นสตามินา/วัน: +${coachFitnessStaminaPerDay(c)}`);
  }
  if (synergyLines.length) {
    lines.push(en ? `Synergy: ${synergyLines.join(" · ")}` : `Synergy: ${synergyLines.join(" · ")}`);
  }
  if (trait) {
    lines.push(`🌟 ${en ? trait.en : trait.th}: ${en ? trait.descEn : trait.descTh}`);
  }
  if (c.seasonsServed) {
    lines.push(en ? `${c.seasonsServed} season(s) at the club` : `ทำงานมาแล้ว ${c.seasonsServed} ฤดูกาล`);
  }
  return { lines, dailyPct, drillPct, def, style: en ? style.en : style.th, trait };
}

export function coachCardStatRows(co, lang = "th") {
  const c = ensureCoachProfile(co, co?.specialty);
  const en = lang === "en";
  return [
    { label: en ? "Technique" : "เทคนิค", val: c.technique, max: 99, strong: true },
    { label: en ? "Motivation" : "แรงจูงใจ", val: c.motivation, max: 99, strong: false },
    { label: en ? "Drill skill" : "ทักษะซ้อม", val: c.drillSkill, max: 99, strong: false },
    { label: en ? "Daily %" : "ฝึก/วัน", val: Math.round(coachDailyAttrBump(c) * 1000) / 10, max: 15, strong: true, suffix: "%" },
    { label: en ? "Drill +" : "ซ้อม +", val: Math.round((coachDrillMult(c) - 1) * 100), max: 80, strong: true, suffix: "%" },
  ];
}
