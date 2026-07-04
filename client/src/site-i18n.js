import {
  TIER_A_FEATURES,
  TIER_B_FEATURES,
  TIER_C_REJECTED,
} from "@roadmap";
import {
  WORLD_CUP_EVENT_NAME,
  WORLD_CUP_INTERVAL_MONTHS,
  WORLD_CUP_REAL_DURATION_DAYS,
  WORLD_CUP_REGISTRATION_DAYS,
  WORLD_CUP_NOMINEES_MAX,
} from "@worldcup";
import {
  BETA_TEST,
  BETA_LABEL,
  BETA_HEADLINE,
  BETA_MESSAGE,
  BETA_PERKS,
  BETA_MASTER_REWARD,
  BETA_MASTER_REWARD_SHORT,
  GAME_NAME,
  GAME_NAME_SHORT,
  GAME_TAGLINE,
  GAME_DISCORD_LABEL,
  GAME_DONATE_LABEL,
  MASTER_COIN_LABEL,
} from "@version";

const STRINGS = {
  en: {
    "lang.en": "EN",
    "lang.th": "ไทย",
    "nav.features": "Features",
    "nav.systems": "Systems",
    "nav.worldcup": "World Cup",
    "nav.roadmap": "Roadmap",
    "nav.feedback": "Feedback",
    "nav.donate": "Donate",
    "nav.logout": "Log out",
    "nav.login": "Log in",
    "nav.signupFree": "Sign up free",
    "nav.startGame": "Play",
    "nav.playAs": "Play — @{user}",
    "confirm.logout": "Log out?",
    "hero.eyebrowBeta": "TEST BETA · Free sign-up · Play in browser",
    "hero.eyebrow": "Free sign-up · Play in browser",
    "hero.onlineCount": "{n} online now",
    "hero.title": "Football Club",
    "hero.sub":
      "Browser football manager — build your club, set tactics, trade players, compete online.\nNo download · Auto-save in your browser",
    "hero.startGame": "▶ Play — @{user}",
    "hero.signupToPlay": "Sign up with Game ID to play",
    "hero.howItWorks": "How it works",
    "hero.hintReady": "Account ready — hit Play to build your club",
    "hero.hintNeedAccount": "Game ID required · No anonymous play",
    "hero.discordHint":
      "Love it or hate it — leave feedback here or on Discord. We read every message.",
    "stats.beta": "Open test",
    "stats.budget": "Starter budget",
    "stats.free": "Browser play",
    "stats.live": "Pitch view",
    "stats.online": "Core mode",
    "features.title": "Game Features",
    "features.sub": "What's in the game now and what's coming",
    "systems.title": "How It Works",
    "systems.sub": "Core systems of {short} — understand in 2 minutes",
    "worldcup.badge": "Planned · Not in game yet",
    "worldcup.sub":
      "Live broadcast event every {months} month(s) · {days} real days · Nominate players for national teams — not just watch",
    "worldcup.regLabel": "Register",
    "worldcup.regValue": "{days} day(s)",
    "worldcup.nomLabel": "Nominate",
    "worldcup.nomValue": "{max} players / club",
    "worldcup.pickLabel": "Pick champion",
    "worldcup.pickValue": "1 country → {coin}",
    "worldcup.betLabel": "Match bets",
    "worldcup.betValue": "In-game cash · {coin}",
    "worldcup.note":
      "You don't control the national team — you nominate players by nationality. The system randomly picks squads from the server pool before kickoff. During the broadcast you can bet on match results. Before kickoff pick one World Cup winner — correct picks earn {coin}. After the event, in-form players stand out and club owners can list them on the market.",
    "roadmap.title": "Roadmap",
    "roadmap.sub": "Development plan — updated as we ship",
    "roadmap.live": "Live now",
    "roadmap.building": "In progress",
    "roadmap.plannedA": "Planned — Tier A",
    "roadmap.plannedB": "Planned — Tier B",
    "roadmap.backlog": "Backlog",
    "roadmap.skip": "Not planned",
    "feedback.title": "Feedback & Community",
    "feedback.sub": "Tell us what you think — likes, dislikes, or ideas",
    "donate.title": "Support {short}",
    "donate.sub": "Free to play — Donations help servers, domain, and dev time",
    "donate.text":
      "We welcome community support. Every bit helps us ship full online mode, Live Challenges, and new stadiums faster. Thanks for playing and sharing with friends.",
    "donate.soonBadge": "Opening soon",
    "donate.soonText": "Donate link coming soon — signing up and sharing helps us too",
    "donate.signupPlay": "Sign up to play",
    "footer.play": "Play",
    "footer.signup": "Sign up",
    "footer.discord": "Discord",
    "title.home": "{name} — {suffix}",
    "title.beta": "TEST BETA",
    "title.play": "Play",
    "beta.discordCta": "{label} — Report bugs / Feedback",
    "beta.aria": "Beta Test announcement",
    "auth.loading": "Checking account...",
    "auth.titleReturn": "Log in to continue",
    "auth.titleNew": "Account required to play",
    "auth.returnDesc1": "Previously played as @{user} on this device.",
    "auth.returnDesc2": "Log in with the same Game ID — your save is still here.",
    "auth.newDesc1": "Free Game ID (username + password) — create your club right away.",
    "auth.newDesc2": "Saves are tied to your account and stored in this browser.",
    "auth.loginAs": "Log in — @{user}",
    "auth.signupNew": "Create new account",
    "auth.signupFree": "Sign up — free Game ID",
    "auth.login": "Log in",
    "auth.home": "← Back to home",
    "auth.ver": "v{ver} · Log out and log back in to continue",
    "auth.modal.signupTitle": "Create Game ID",
    "auth.modal.loginTitle": "Log in — Game ID",
    "auth.modal.close": "Close",
    "auth.modal.signupHint": "Pick a username + password · Free",
    "auth.modal.loginHint": "Log in with your Game ID — save stays in this browser",
    "auth.modal.displayName": "Display name (optional)",
    "auth.modal.username": "Username ({hint})",
    "auth.modal.usernameHint": "a-z, 0-9, _ · 3–16 chars",
    "auth.modal.password": "Password (min 6 characters)",
    "auth.modal.submitSignup": "Create Game ID",
    "auth.modal.submitLogin": "Log in",
    "auth.modal.loading": "Working...",
    "auth.modal.hasAccount": "Already have an account?",
    "auth.modal.noAccount": "No account yet?",
    "auth.modal.switchLogin": "Log in",
    "auth.modal.switchSignup": "Sign up free",
    "auth.modal.fail": "Sign-in failed",
    "auth.modal.aria": "Account sign-in",
    "shell.loading": "Checking account...",
    "shell.logoutConfirm":
      "Log out?\n\nYour save stays in this browser — log in with the same Game ID to continue.",
    "error.title": "Game failed to load",
    "error.hint": "Close any old server window, then double-click Play-Game.bat again. Or open",
    "error.reset": "Reset and retry",
  },
  th: {
    "lang.en": "EN",
    "lang.th": "ไทย",
    "nav.features": "ฟีเจอร์",
    "nav.systems": "ระบบ",
    "nav.worldcup": "World Cup",
    "nav.roadmap": "Roadmap",
    "nav.feedback": "Feedback",
    "nav.donate": "Donate",
    "nav.logout": "ออกจากระบบ",
    "nav.login": "เข้าสู่ระบบ",
    "nav.signupFree": "สมัครฟรี",
    "nav.startGame": "เริ่มเกม",
    "nav.playAs": "เริ่มเกม — @{user}",
    "confirm.logout": "ออกจากระบบ?",
    "hero.eyebrowBeta": "TEST BETA · สมัครฟรี · เล่นบนเบราว์เซอร์",
    "hero.eyebrow": "สมัครฟรี · เล่นบนเบราว์เซอร์",
    "hero.onlineCount": "{n} คนออนไลน์ตอนนี้",
    "hero.title": "Football Club",
    "hero.sub":
      "เกมจัดการฟุตบอลบนเว็บ — สร้างสโมสร วางแทคติก ซื้อขายนักเตะ แข่งออนไลน์\nไม่ต้องดาวน์โหลด · เซฟอัตโนมัติในเบราว์เซอร์",
    "hero.startGame": "▶ เริ่มเกม — @{user}",
    "hero.signupToPlay": "สมัคร Game ID เพื่อเล่น",
    "hero.howItWorks": "How it works",
    "hero.hintReady": "บัญชีพร้อมแล้ว — กดเริ่มเกมเพื่อสร้างสโมสร",
    "hero.hintNeedAccount": "ต้องสมัคร Game ID ก่อนเล่น · ไม่มีโหมดเล่นฟรีโดยไม่สมัคร",
    "hero.discordHint":
      "เล่นแล้วชอบหรือไม่ชอบอะไร — เขียน feedback ได้ที่นี่หรือใน Discord ทีมอ่านทุกข้อความ",
    "stats.beta": "Open test",
    "stats.budget": "Starter budget",
    "stats.free": "Browser play",
    "stats.live": "Pitch view",
    "stats.online": "Core mode",
    "features.title": "Game Features",
    "features.sub": "ฟีเจอร์ที่มีในเกมตอนนี้และที่กำลังมา",
    "systems.title": "How It Works",
    "systems.sub": "ระบบหลักของ {short} — เข้าใจใน 2 นาที",
    "worldcup.badge": "Planned · ยังไม่เปิดในเกม",
    "worldcup.sub":
      "อีเวนต์ถ่ายทอดสดราย {months} เดือน · ใช้เวลา {days} วันจริง · ผู้เล่นส่งนักเตะเข้าทีมชาติ — ไม่ใช่แค่ดูอย่างเดียว",
    "worldcup.regLabel": "สมัคร",
    "worldcup.regValue": "{days} วัน",
    "worldcup.nomLabel": "ส่งได้",
    "worldcup.nomValue": "{max} คน / สโมสร",
    "worldcup.pickLabel": "ทายแชมป์",
    "worldcup.pickValue": "1 ประเทศ → {coin}",
    "worldcup.betLabel": "เดิมพันนัด",
    "worldcup.betValue": "เงินในเกม · {coin}",
    "worldcup.note":
      "คุณไม่ได้ควบคุมทีมชาติเอง — คุณเสนอชื่อนักเตะตามสัญชาติ ระบบสุ่มคัดรายชื่อทีมชาติจาก pool ทั้งเซิร์ฟเวอร์ ประกาศก่อนแข่ง ระหว่างถ่ายทอดสดทายผลรายนัดได้ ก่อนเริ่มแข่งเลือก 1 ประเทศแชมป์โลก — ทายถูกได้ {coin} หลังจบนักเตะฟอร์มดีจะโดดเด่นบนระบบ และเจ้าของสโมสรสามารถปล่อยขายตลาดได้",
    "roadmap.title": "Roadmap",
    "roadmap.sub": "แผนพัฒนาเกม — อัปเดตตามทิศทางทีม",
    "roadmap.live": "Live now",
    "roadmap.building": "In progress",
    "roadmap.plannedA": "Planned — Tier A",
    "roadmap.plannedB": "Planned — Tier B",
    "roadmap.backlog": "Backlog",
    "roadmap.skip": "Not planned",
    "feedback.title": "Feedback & Community",
    "feedback.sub": "เล่นแล้วบอกเราได้ — ชอบ ไม่ชอบ หรืออยากให้ปรับอะไร",
    "donate.title": "Support {short}",
    "donate.sub": "เกมเล่นฟรี — Donate ช่วยค่าเซิร์ฟเวอร์ โดเมน และเวลาพัฒนาต่อ",
    "donate.text":
      "เราเปิดรับการสนับสนุนจากชุมชน ทุกบาทช่วยให้พัฒนาออนไลน์เต็มรูปแบบ Live Challenges และสนามใหม่ได้เร็วขึ้น ขอบคุณที่เล่นและแชร์ให้เพื่อน",
    "donate.soonBadge": "Opening soon",
    "donate.soonText": "ลิงก์ Donate กำลังเตรียม — สมัครแล้วแชร์ให้เพื่อนก็ช่วยเราได้มาก",
    "donate.signupPlay": "สมัครเพื่อเล่น",
    "footer.play": "เริ่มเกม",
    "footer.signup": "สมัครเล่น",
    "footer.discord": "Discord",
    "title.home": "{name} — {suffix}",
    "title.beta": "TEST BETA",
    "title.play": "เล่น",
    "beta.discordCta": "{label} — แจ้งบั๊ก / Feedback",
    "beta.aria": "ประกาศ Beta Test",
    "auth.loading": "กำลังตรวจสอบบัญชี...",
    "auth.titleReturn": "เข้าสู่ระบบเพื่อเล่นต่อ",
    "auth.titleNew": "ต้องมีบัญชีก่อนเล่น",
    "auth.returnDesc1": "เคยเล่นด้วย @{user} ในเครื่องนี้แล้ว",
    "auth.returnDesc2": "เข้าสู่ระบบ Game ID เดิม — เซฟยังอยู่ ไม่ต้องเริ่มใหม่",
    "auth.newDesc1": "สมัคร Game ID ฟรี (ชื่อผู้ใช้ + รหัสผ่าน) แล้วเริ่มสร้างสโมสรได้ทันที",
    "auth.newDesc2": "ข้อมูลเซฟผูกกับบัญชีและเก็บในเบราว์เซอร์นี้",
    "auth.loginAs": "เข้าสู่ระบบ — @{user}",
    "auth.signupNew": "สมัครบัญชีใหม่",
    "auth.signupFree": "สมัคร Game ID ฟรี",
    "auth.login": "เข้าสู่ระบบ",
    "auth.home": "← กลับหน้าแรก",
    "auth.ver": "v{ver} · Log out แล้ว login กลับมาเล่นต่อได้",
    "auth.modal.signupTitle": "สมัคร Game ID",
    "auth.modal.loginTitle": "เข้าสู่ระบบ Game ID",
    "auth.modal.close": "ปิด",
    "auth.modal.signupHint": "ตั้งชื่อผู้ใช้ + รหัสผ่าน · สมัครฟรี",
    "auth.modal.loginHint": "เข้าสู่ระบบ Game ID เดิม — เซฟเกมยังอยู่ในเบราว์เซอร์นี้",
    "auth.modal.displayName": "ชื่อที่แสดง (ไม่บังคับ)",
    "auth.modal.username": "ชื่อผู้ใช้ ({hint})",
    "auth.modal.usernameHint": "a-z, 0-9, _ · 3–16 ตัว",
    "auth.modal.password": "รหัสผ่าน (อย่างน้อย 6 ตัว)",
    "auth.modal.submitSignup": "สมัคร Game ID",
    "auth.modal.submitLogin": "เข้าสู่ระบบ",
    "auth.modal.loading": "กำลังดำเนินการ...",
    "auth.modal.hasAccount": "มีบัญชีแล้ว?",
    "auth.modal.noAccount": "ยังไม่มีบัญชี?",
    "auth.modal.switchLogin": "เข้าสู่ระบบ",
    "auth.modal.switchSignup": "สมัคร Game ID ฟรี",
    "auth.modal.fail": "เข้าสู่ระบบไม่สำเร็จ",
    "auth.modal.aria": "เข้าสู่ระบบ",
    "shell.loading": "กำลังตรวจสอบบัญชี...",
    "shell.logoutConfirm":
      "ออกจากระบบ?\n\nเซฟเกมยังอยู่ในเบราว์เซอร์นี้ — ล็อกอิน Game ID เดิมเพื่อเล่นต่อ",
    "error.title": "เกมโหลดไม่สำเร็จ",
    "error.hint": "ลองปิดหน้าต่าง Server เก่า แล้วดับเบิลคลิก Play-Game.bat อีกครั้ง หรือเปิด",
    "error.reset": "รีเซ็ตและลองใหม่",
  },
};

function L(lang) {
  return lang === "en" ? "en" : "th";
}

export function siteT(lang, key, vars = {}) {
  const bucket = STRINGS[L(lang)] || STRINGS.en;
  let text = bucket[key] ?? STRINGS.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}

const FEATURES_EN = [
  { icon: "⚽", title: "Live Match", desc: "On-pitch live view, in-match tactics, speed and crowd audio controls" },
  { icon: "🧠", title: "Tactics & Squad", desc: "14 FM-style roles, drag-and-drop XI, auto-pick by manager" },
  { icon: "🏋️", title: "Training", desc: "10-day calendar + position boards (GK/DF/MF/FW), 17 drills, coach bonuses" },
  { icon: "🎓", title: "Academy", desc: "Youth prospects, scouts, academy manager, loans, sales, first-team promotions" },
  { icon: "💰", title: "Transfer Market", desc: "Buy/sell, auctions, contracts, wages — timed market (online) or always open (sandbox)" },
  { icon: "⭐", title: "Legends", desc: "Master League superstars — one per server per club under league rules" },
  { icon: "🃏", title: "Staff Cards", desc: "Gacha manager/coach/scout cards — merge then hire into your club" },
  { icon: "🏆", title: "Leagues & Cups", desc: "Challenger → Master League promotion, Socker Cup, Champ Master, seasonal trophies" },
  { icon: "👔", title: "Manager Career", desc: "Hire/fire managers, season goals, weekly quests, sponsors, fans, club value" },
  { icon: "🏟️", title: "Stadium Progression", desc: "Upgrade Local Pitch → Village → Town as your club grows (in development)" },
  { icon: "🌐", title: "Online League", desc: "Core mode — compete in shard leagues with real players and market (rolling out)" },
  { icon: "🌍", title: WORLD_CUP_EVENT_NAME, desc: `Monthly event — nominate ${WORLD_CUP_NOMINEES_MAX} players · pick a champion nation · live bets · post-event bonuses (in development)` },
];

const FEATURES_TH = [
  { icon: "⚽", title: "Live Match", desc: "ลงสนามสด ดูบอลวิ่งบนสนาม ปรับแทคติกกลางเกม ควบคุมความเร็วและเสียงกองเชีย" },
  { icon: "🧠", title: "Tactics & Squad", desc: "14 ตำแหน่งแบบ FM บทบาทนักเตะ ลากจัดทีมบนสนาม โหมดออโต้ให้ผจก.จัดให้" },
  { icon: "🏋️", title: "Training", desc: "ปฏิทินฝึก 10 วัน + บอร์ดซ้อมรายตำแหน่ง (GK/DF/MF/FW) 17 ท่าซ้อม โบนัสจากโค้ช" },
  { icon: "🎓", title: "Academy", desc: "ดาวรุ่ง แมวมองเยาวชน ผจก.อคาเดมี ปล่อยยืม ขาย ดึงขึ้นทีมชุดใหญ่" },
  { icon: "💰", title: "Transfer Market", desc: "ซื้อขายนักเตะ ประมูล สัญญา ค่าเหนื่อย ตลาดเปิดตามเวลา (ออนไลน์) หรือตลอด (โลกจำลอง)" },
  { icon: "⭐", title: "Legends", desc: "ซูเปอร์สตาร์ใน Master League ซื้อครอบครองได้ตามกติกาลีก — ทีมละตัวต่อเซิร์ฟเวอร์" },
  { icon: "🃏", title: "Staff Cards", desc: "สุ่มการ์ดผู้จัดการ โค้ช แมวมอง รวมการ์ด (merge) แล้วจ้างเข้าสโมสร" },
  { icon: "🏆", title: "Leagues & Cups", desc: "Challenger → Master League เลื่อนชั้น Socker Cup Champ Master ถ้วยรายฤดูกาล" },
  { icon: "👔", title: "Manager Career", desc: "จ้าง/ไล่ผจก. เป้าฤดูกาล เควสรายสัปดาห์ สปอนเซอร์ ฐานแฟน มูลค่าสโมสร" },
  { icon: "🏟️", title: "Stadium Progression", desc: "อัปเกรดสนาม Local Pitch → Village → Town ตามความก้าวหน้าสโมสร (กำลังพัฒนา)" },
  { icon: "🌐", title: "Online League", desc: "โหมดหลัก — แข่งกับผู้เล่นจริงในลีกชาร์ด ตลาดซื้อขายจริง (กำลังเปิดเต็มรูปแบบ)" },
  { icon: "🌍", title: WORLD_CUP_EVENT_NAME, desc: `อีเวนต์รายเดือน — ส่งนักเตะ ${WORLD_CUP_NOMINEES_MAX} คน · ทายแชมป์ประเทศ · ดูสด · เดิมพัน · โบนัสหลังจบ (กำลังพัฒนา)` },
];

const SYSTEMS_EN = [
  {
    title: "Manager career loop",
    steps: [
      "Create profile + club → start in Challenger League",
      "Each day: training · market · lineup → kick off when a match is due",
      "End of season: promotion/relegation, league rewards, new goals, cup runs",
    ],
  },
  {
    title: "Sandbox → Online",
    steps: [
      "Sandbox: play vs bots, build your club, always-open market, learn systems",
      "Total club value (squad + academy + training + staff + budget) hits 50M → unlock online",
      "Online is the core mode — shard leagues with real players",
    ],
  },
  {
    title: "Before kickoff",
    steps: [
      "Pick XI (drag or auto) · choose 4-4-2, 4-3-3, etc.",
      "Match Prep: tempo, defensive line, instructions, team talk, scout report",
      "Kickoff → Live Match or sim result",
    ],
  },
  {
    title: "Economy & cards",
    steps: [
      "Budget · daily wages · sponsors · sell players/youth",
      "Socker Coins: shop, staff card tickets",
      "1–5★ cards, merge, then hire as manager/coach/scout",
    ],
  },
];

const SYSTEMS_TH = [
  {
    title: "ลูปอาชีพผู้จัดการ",
    steps: [
      "สร้างโปรไฟล์ + สโมสร → เริ่มใน Challenger League",
      "แต่ละวัน: ฝึกซ้อม · ตลาด · จัดทีม → กดลงสนามเมื่อมีนัด",
      "จบฤดูกาล: เลื่อนชั้น/ตกชั้น รางวัลลีก เป้าใหม่ ถ้วยพิเศษ",
    ],
  },
  {
    title: "Sandbox → Online",
    steps: [
      "โลกจำลอง: เล่นกับบอท ปั้นสโมสร ตลาดเปิดตลอด ฝึกระบบ",
      "มูลค่าสโมสรรวม (นักเตะ+อคาเดมี+ศูนย์ฝึก+สตาฟ+งบ) ถึง 50M → ปลดล็อกออนไลน์",
      "ออนไลน์เป็นโหมดหลัก — แข่งในลีกชาร์ดกับผู้เล่นจริง",
    ],
  },
  {
    title: "ก่อนลงสนาม",
    steps: [
      "จัด XI 11 คน (ลากวาง / ออโต้) · เลือกแผน 4-4-2, 4-3-3 ฯลฯ",
      "Match Prep: จังหวะเกม แนวรับ คำสั่ง ทีม talk scout คู่แข่ง",
      "Kickoff → Live Match หรือข้ามผล (sim)",
    ],
  },
  {
    title: "เศรษฐกิจ & การ์ด",
    steps: [
      "งบ · ค่าเหนื่อยรายวัน · สปอนเซอร์ · ขายนักเตะ/ดาวรุ่ง",
      "Socker Coins: ร้านค้า ตั๋วสุ่มการ์ดสตาช์",
      "การ์ด 1–5 ดาว รวม (merge) แล้วจ้างเป็นผจก./โค้ช/แมวมอง",
    ],
  },
];

const WC_PHASES_EN = [
  { id: "registration", title: "Register & nominate", duration: "Day 1 (full day)", desc: `Send up to ${WORLD_CUP_NOMINEES_MAX} of your best players — by each player's nationality` },
  { id: "selection", title: "Squad announcement", duration: "Before kickoff", desc: "Random selection from the server pool, then national squads are published" },
  { id: "champion_pick", title: "Pick World Cup winner", duration: "Before kickoff (locks at first match)", desc: "Choose 1 country you think wins — correct picks earn Master Coin after the final" },
  { id: "tournament", title: "Live broadcast & bets", duration: "Match days (within the 2-day event)", desc: "Watch live, bet match results with in-game cash or Master Coin" },
  { id: "aftermath", title: "After the tournament", duration: "Permanent", desc: "Champion pick payouts · hot players get stat highlights · owners can list them on the market" },
];

const WC_PHASES_TH = [
  { id: "registration", title: "สมัคร & ส่งรายชื่อ", duration: "วันที่ 1 (1 วันเต็ม)", desc: "ส่งนักเตะที่ดีที่สุดของคุณได้สูงสุด 10 คน — อิงสัญชาติของนักเตะแต่ละคน" },
  { id: "selection", title: "ประกาศรายชื่อ", duration: "ก่อนเริ่มแข่ง", desc: "ระบบสุ่มคัดเลือกจาก pool ทั้งเซิร์ฟเวอร์ แล้วประกาศทีมชาติที่ได้ลงจริง" },
  { id: "champion_pick", title: "ทายแชมป์โลก", duration: "ก่อนเริ่มแข่ง (ปิดเมื่อ kickoff นัดแรก)", desc: "เลือก 1 ประเทศที่คิดว่าจะได้แชมป์ — ทายถูกได้รางวัล Master Coin หลังประกาศผล" },
  { id: "tournament", title: "ถ่ายทอดสด & เดิมพัน", duration: "วันแข่ง (ภายใน 2 วันอีเวนต์)", desc: "ดูแมตช์สด ทายผลแพ้ชนะรายนัดด้วยเงินในเกมหรือ Master Coin" },
  { id: "aftermath", title: "หลังจบการแข่ง", duration: "ถาวร", desc: "จ่ายรางวัลทายแชมป์ถูก · นักเตะคะแนนดีโชว์สถิติพิเศษ · เจ้าของสโมสรปล่อยขายตลาดได้" },
];

function roadmapFor(lang) {
  const th = L(lang) === "th";
  return [
    {
      status: "live",
      label: siteT(lang, "roadmap.live"),
      items: th
        ? [
            "Live Match + สนาม ambient",
            "แทคติก 14 ตำแหน่ง ลากจัดทีม · roles · match prep",
            "ฝึกซ้อม + บอร์ดซ้อมรายตำแหน่ง",
            "อคาเดมี · ตลาด · Legends · การ์ดสตาช์",
            "Socker Cup · Champ Master · Stake League",
          ]
        : [
            "Live Match + pitch ambient",
            "14-role tactics, drag XI · roles · match prep",
            "Training + position drill boards",
            "Academy · market · Legends · staff cards",
            "Socker Cup · Champ Master · Stake League",
          ],
    },
    {
      status: "building",
      label: siteT(lang, "roadmap.building"),
      items: th
        ? [
            "Stadium Progression + Stadium economy (Tier A)",
            "ออนไลน์เต็มรูปแบบ (ลีกชาร์ด + ตลาดจริง)",
            "UI สไตล์ FC Premium ในเกม",
            "Manager Live Challenges · Unexpected Events · Manager Market",
          ]
        : [
            "Stadium Progression + Stadium economy (Tier A)",
            "Full online (shard leagues + live market)",
            "FC Premium in-game UI",
            "Manager Live Challenges · Unexpected Events · Manager Market",
          ],
    },
    {
      status: "planned",
      label: siteT(lang, "roadmap.plannedA"),
      items: TIER_A_FEATURES.map((f) => f.title),
    },
    {
      status: "planned",
      label: siteT(lang, "roadmap.plannedB"),
      items: TIER_B_FEATURES.map((f) => f.title),
    },
    {
      status: "backlog",
      label: siteT(lang, "roadmap.backlog"),
      items: th ? ["Club Alliance / Co-op (ไอเดียเก็บไว้)"] : ["Club Alliance / Co-op (idea on hold)"],
    },
    {
      status: "skip",
      label: siteT(lang, "roadmap.skip"),
      items: th
        ? [
            "Women's football",
            ...TIER_C_REJECTED,
            "หน้าเลือกโหมด Hub",
            "Player Career / เล่นเป็นนักเตะคนเดียว",
            "โหมดทีมชาติแบบ EA (The World's Game)",
          ]
        : [
            "Women's football",
            ...TIER_C_REJECTED,
            "Mode-select hub page",
            "Player Career / single-player mode",
            "EA-style national teams (The World's Game)",
          ],
    },
  ];
}

export function getLandingNav(lang) {
  return [
    { id: "features", label: siteT(lang, "nav.features") },
    { id: "systems", label: siteT(lang, "nav.systems") },
    { id: "worldcup", label: siteT(lang, "nav.worldcup") },
    { id: "roadmap", label: siteT(lang, "nav.roadmap") },
    { id: "feedback", label: siteT(lang, "nav.feedback") },
    { id: "donate", label: siteT(lang, "nav.donate") },
  ];
}

export function getLandingStats(lang) {
  if (BETA_TEST) {
    return [
      { value: "BETA", label: siteT(lang, "stats.beta") },
      { value: "500M", label: siteT(lang, "stats.budget") },
      { value: "FREE", label: siteT(lang, "stats.free") },
    ];
  }
  return [
    { value: "FREE", label: siteT(lang, "stats.free") },
    { value: "LIVE", label: siteT(lang, "stats.live") },
    { value: "ONLINE", label: siteT(lang, "stats.online") },
  ];
}

export function getLandingFeatures(lang) {
  return L(lang) === "th" ? FEATURES_TH : FEATURES_EN;
}

export function getLandingSystems(lang) {
  return L(lang) === "th" ? SYSTEMS_TH : SYSTEMS_EN;
}

export function getWorldCupPhases(lang) {
  return L(lang) === "th" ? WC_PHASES_TH : WC_PHASES_EN;
}

export function getLandingRoadmap(lang) {
  return roadmapFor(lang);
}

/** Beta copy by site language */
export function getBetaCopy(lang) {
  if (L(lang) === "en") {
    return {
      label: BETA_LABEL,
      headline: "Test Beta",
      message:
        "Game in active development — systems may change, data may reset. Report bugs and feedback on Discord.",
      perks: "Testers: 500M club budget · 1,000 Master Coin · Free Game ID sign-up",
      masterReward:
        "Reach Master League during Test Beta — earn a Limited Edition reward",
      masterRewardShort: "Master League in Test Beta → Limited reward",
    };
  }
  return {
    label: BETA_LABEL,
    headline: BETA_HEADLINE,
    message: BETA_MESSAGE,
    perks: BETA_PERKS,
    masterReward: BETA_MASTER_REWARD,
    masterRewardShort: BETA_MASTER_REWARD_SHORT,
  };
}

export { GAME_NAME, GAME_NAME_SHORT, GAME_TAGLINE, GAME_DISCORD_LABEL, GAME_DONATE_LABEL, MASTER_COIN_LABEL, WORLD_CUP_EVENT_NAME, WORLD_CUP_INTERVAL_MONTHS, WORLD_CUP_REAL_DURATION_DAYS, WORLD_CUP_REGISTRATION_DAYS, WORLD_CUP_NOMINEES_MAX };
