import React, { useEffect } from "react";
import {
  GAME_NAME, GAME_NAME_SHORT, GAME_SITE_URL, GAME_TAGLINE, GAME_VERSION,
  GAME_DONATE_URL, GAME_DONATE_LABEL, MASTER_COIN_LABEL,
} from "@version";
import {
  WORLD_CUP_EVENT_NAME,
  WORLD_CUP_INTERVAL_MONTHS,
  WORLD_CUP_REAL_DURATION_DAYS,
  WORLD_CUP_REGISTRATION_DAYS,
  WORLD_CUP_NOMINEES_MAX,
  WORLD_CUP_PHASES,
} from "@worldcup";
import {
  TIER_A_FEATURES,
  TIER_B_FEATURES,
  TIER_C_REJECTED,
} from "@roadmap";
import "./LandingPage.css";

const LOGO = "/branding/master-logo.png";
const BG = "/branding/login-bg.png";

const NAV = [
  { id: "features", label: "Features" },
  { id: "systems", label: "Systems" },
  { id: "worldcup", label: "World Cup" },
  { id: "roadmap", label: "Roadmap" },
  { id: "donate", label: "Donate" },
];

const FEATURES = [
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

const SYSTEMS = [
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

const ROADMAP = [
  { status: "live", label: "Live now", items: [
    "Live Match + สนาม ambient",
    "แทคติก 14 ตำแหน่ง ลากจัดทีม · roles · match prep",
    "ฝึกซ้อม + บอร์ดซ้อมรายตำแหน่ง",
    "อคาเดมี · ตลาด · Legends · การ์ดสตาช์",
    "Socker Cup · Champ Master · Stake League",
  ]},
  { status: "building", label: "In progress", items: [
    "Stadium Progression + Stadium economy (Tier A)",
    "ออนไลน์เต็มรูปแบบ (ลีกชาร์ด + ตลาดจริง)",
    "UI สไตล์ FC Premium ในเกม",
    "Manager Live Challenges · Unexpected Events · Manager Market",
  ]},
  { status: "planned", label: "Planned — Tier A", items: TIER_A_FEATURES.map((f) => f.title) },
  { status: "planned", label: "Planned — Tier B", items: TIER_B_FEATURES.map((f) => f.title) },
  { status: "backlog", label: "Backlog", items: [
    "Club Alliance / Co-op (ไอเดียเก็บไว้)",
  ]},
  { status: "skip", label: "Not planned", items: [
    "Women's football",
    ...TIER_C_REJECTED,
    "หน้าเลือกโหมด Hub",
    "Player Career / เล่นเป็นนักเตะคนเดียว",
    "โหมดทีมชาติแบบ EA (The World's Game)",
  ]},
];

const STATS = [
  { value: "FREE", label: "Browser play" },
  { value: "LIVE", label: "Pitch view" },
  { value: "ONLINE", label: "Core mode" },
];

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function LandingPage({ onPlay }) {
  useEffect(() => {
    document.title = `${GAME_NAME} — ${GAME_TAGLINE}`;
    document.body.style.background = "#050608";
    return () => {
      document.body.style.background = "";
    };
  }, []);

  return (
    <div className="landing-root">
      <div className="landing-bg" style={{ backgroundImage: `url(${BG})` }} aria-hidden />
      <div className="landing-noise" aria-hidden />

      <header className="landing-nav">
        <span className="landing-nav-brand">{GAME_NAME_SHORT}</span>
        <nav className="landing-nav-links" aria-label="Sections">
          {NAV.map((n) => (
            <button key={n.id} type="button" className="landing-nav-link" onClick={() => scrollTo(n.id)}>
              {n.label}
            </button>
          ))}
        </nav>
        <button type="button" className="landing-nav-cta" onClick={onPlay}>
          Play Now
        </button>
      </header>

      <main className="landing-hero">
        <div className="landing-hero-inner">
          <span className="landing-eyebrow">Playtest · Free on browser</span>
          <div className="landing-logo-wrap">
            <img src={LOGO} alt={GAME_NAME} className="landing-hero-logo" />
          </div>
          <h1 className="landing-title">Football Club</h1>
          <p className="landing-tagline">{GAME_TAGLINE}</p>
          <p className="landing-sub">
            เกมจัดการฟุตบอลบนเว็บ — สร้างสโมสร วางแทคติก ซื้อขายนักเตะ แข่งออนไลน์
            <br />
            ไม่ต้องดาวน์โหลด · เซฟอัตโนมัติในเบราว์เซอร์
          </p>

          <div className="landing-actions">
            <button type="button" className="landing-btn-primary" onClick={onPlay}>
              Play Now
            </button>
            <button type="button" className="landing-btn-secondary" onClick={() => scrollTo("systems")}>
              How it works
            </button>
          </div>
          <p className="landing-hint">ไม่ต้องสมัคร · เปิดแล้วเล่นได้ทันที · โหมดหลักคือ Online League</p>
        </div>
      </main>

      <div className="landing-stats">
        {STATS.map((s) => (
          <div key={s.label} className="landing-stat">
            <div className="landing-stat-value">{s.value}</div>
            <div className="landing-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="landing-section" id="features">
        <div className="landing-section-head">
          <h2>Game Features</h2>
          <p>ฟีเจอร์ที่มีในเกมตอนนี้และที่กำลังมา</p>
        </div>
        <div className="landing-features-grid">
          {FEATURES.map((f) => (
            <article key={f.title} className="landing-feature-card">
              <span className="landing-feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-systems" id="systems">
        <div className="landing-section-head">
          <h2>How It Works</h2>
          <p>ระบบหลักของ {GAME_NAME_SHORT} — เข้าใจใน 2 นาที</p>
        </div>
        <div className="landing-systems-grid">
          {SYSTEMS.map((sys) => (
            <article key={sys.title} className="landing-system-card">
              <h3>{sys.title}</h3>
              <ol>
                {sys.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-worldcup" id="worldcup">
        <div className="landing-section-head">
          <span className="landing-worldcup-soon-badge">Planned · ยังไม่เปิดในเกม</span>
          <h2>{WORLD_CUP_EVENT_NAME}</h2>
          <p>
            อีเวนต์ถ่ายทอดสดราย {WORLD_CUP_INTERVAL_MONTHS} เดือน · ใช้เวลา {WORLD_CUP_REAL_DURATION_DAYS} วันจริง
            · ผู้เล่นส่งนักเตะเข้าทีมชาติ — ไม่ใช่แค่ดูอย่างเดียว
          </p>
        </div>

        <div className="landing-worldcup-meta">
          <div className="landing-worldcup-pill">
            <span className="landing-worldcup-pill-label">สมัคร</span>
            <span>{WORLD_CUP_REGISTRATION_DAYS} วัน</span>
          </div>
          <div className="landing-worldcup-pill">
            <span className="landing-worldcup-pill-label">ส่งได้</span>
            <span>{WORLD_CUP_NOMINEES_MAX} คน / สโมสร</span>
          </div>
          <div className="landing-worldcup-pill">
            <span className="landing-worldcup-pill-label">ทายแชมป์</span>
            <span>1 ประเทศ → {MASTER_COIN_LABEL}</span>
          </div>
          <div className="landing-worldcup-pill">
            <span className="landing-worldcup-pill-label">เดิมพันนัด</span>
            <span>เงินในเกม · {MASTER_COIN_LABEL}</span>
          </div>
        </div>

        <div className="landing-worldcup-phases">
          {WORLD_CUP_PHASES.map((phase, i) => (
            <article key={phase.id} className="landing-worldcup-phase">
              <div className="landing-worldcup-phase-num">{i + 1}</div>
              <div>
                <h3>{phase.title}</h3>
                <p className="landing-worldcup-phase-when">{phase.duration}</p>
                <p className="landing-worldcup-phase-desc">{phase.desc}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="landing-worldcup-note">
          <strong>หมายเหตุ:</strong> คุณไม่ได้ควบคุมทีมชาติเอง — คุณ <em>เสนอชื่อ</em> นักเตะตามสัญชาติ
          ระบบสุ่มคัดรายชื่อทีมชาติจาก pool ทั้งเซิร์ฟเวอร์ ประกาศก่อนแข่ง
          ระหว่างถ่ายทอดสดทายผลรายนัดได้ ก่อนเริ่มแข่งเลือก <em>1 ประเทศแชมป์โลก</em> — ทายถูกได้ {MASTER_COIN_LABEL}
          หลังจบนักเตะฟอร์มดีจะโดดเด่นบนระบบ และเจ้าของสโมสรสามารถปล่อยขายตลาดได้
        </div>
      </section>

      <section className="landing-section landing-roadmap" id="roadmap">
        <div className="landing-section-head">
          <h2>Roadmap</h2>
          <p>แผนพัฒนาเกม — อัปเดตตามทิศทางทีม</p>
        </div>
        <div className="landing-roadmap-grid">
          {ROADMAP.map((col) => (
            <article key={col.label} className={`landing-roadmap-col landing-roadmap-${col.status}`}>
              <h3>{col.label}</h3>
              <ul>
                {col.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-donate" id="donate">
        <div className="landing-donate-inner">
          <div className="landing-section-head">
            <h2>Support {GAME_NAME_SHORT}</h2>
            <p>เกมเล่นฟรี — Donate ช่วยค่าเซิร์ฟเวอร์ โดเมน และเวลาพัฒนาต่อ</p>
          </div>
          <p className="landing-donate-text">
            เราเปิดรับการสนับสนุนจากชุมชน ทุกบาทช่วยให้พัฒนาออนไลน์เต็มรูปแบบ
            Live Challenges และสนามใหม่ได้เร็วขึ้น ขอบคุณที่เล่นและแชร์ให้เพื่อน
          </p>
          {GAME_DONATE_URL ? (
            <a
              href={GAME_DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-btn-primary landing-donate-btn"
            >
              {GAME_DONATE_LABEL}
            </a>
          ) : (
            <div className="landing-donate-soon">
              <span className="landing-donate-badge">Opening soon</span>
              <p>ลิงก์ Donate กำลังเตรียม — ติดตามที่เว็บนี้หรือเล่นเกมแล้วแชร์ให้เพื่อนก็ช่วยเราได้มาก</p>
              <button type="button" className="landing-btn-secondary" onClick={onPlay}>
                Play &amp; share instead
              </button>
            </div>
          )}
        </div>
      </section>

      <footer className="landing-footer">
        <p className="landing-footer-brand">{GAME_NAME}</p>
        <nav className="landing-footer-nav">
          {NAV.map((n) => (
            <button key={n.id} type="button" onClick={() => scrollTo(n.id)}>
              {n.label}
            </button>
          ))}
        </nav>
        <p>
          <a href={GAME_SITE_URL}>{GAME_SITE_URL.replace("https://", "")}</a>
          {" · "}
          <a href={`${GAME_SITE_URL}/play`}>Play game</a>
        </p>
        <p className="landing-footer-ver">v{GAME_VERSION} · © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
