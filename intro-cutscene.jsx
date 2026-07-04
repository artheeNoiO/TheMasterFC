import React, { useEffect, useState, useCallback } from "react";
import { GAME_NAME, GAME_TAGLINE } from "@version";

const BG = "/branding/login-bg.png";
const LOGO = "/branding/master-logo.png";
export const INTRO_SEEN_KEY = "tmfc_intro_seen";

const SLIDES = [
  {
    eyebrow: "The Master Football Club",
    title: "ยินดีต้อนรับ",
    body: "เกมจัดการสโมสรฟุตบอลที่คุณเป็นทั้งผู้จัดการ โค้ช และเจ้าของทีม",
  },
  {
    eyebrow: "ภารกิจแรก",
    title: "รับช่วงสโมสรเล็กๆ",
    body: "เริ่มจากลีกจำลอง สร้างทีมจากศูนย์ คัดนักเตะ วางแผนแทคติก และเติบโตทีละนัด",
  },
  {
    eyebrow: "เติบโตอย่างมีระบบ",
    title: "ปั้นทีม · สตาฟ · สนาม",
    body: "ฝึกซ้อม จ้างสตาฟ อัปเกรดสนาม — ขยายมูลค่าสโมสรรวมให้ถึง 50M เพื่อปลดล็อกโหมดออนไลน์",
  },
  {
    eyebrow: "พร้อมแล้ว",
    title: "เส้นทางสู่แชมป์เริ่มที่นี่",
    body: GAME_TAGLINE,
    final: true,
  },
];

export default function IntroCutscene({ onComplete, username, introStorageKey = INTRO_SEEN_KEY }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const slide = SLIDES[index];
  const isLast = index >= SLIDES.length - 1;

  const goNext = useCallback(() => {
    if (isLast) {
      try { localStorage.setItem(introStorageKey, "1"); } catch { /* ignore */ }
      onComplete?.();
      return;
    }
    setVisible(false);
    setTimeout(() => {
      setIndex((i) => i + 1);
      setVisible(true);
    }, 380);
  }, [isLast, onComplete, introStorageKey]);

  const skipAll = useCallback(() => {
    try { localStorage.setItem(introStorageKey, "1"); } catch { /* ignore */ }
    onComplete?.();
  }, [onComplete, introStorageKey]);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(t);
  }, [index]);

  useEffect(() => {
    if (isLast) return undefined;
    const t = setTimeout(goNext, 5200);
    return () => clearTimeout(t);
  }, [index, isLast, goNext]);

  return (
    <div className="fc-intro-cutscene" onClick={goNext} role="presentation">
      <div
        className="fc-intro-cutscene-bg"
        style={{ backgroundImage: `url(${BG})` }}
        aria-hidden
      />
      <div className="fc-game-noise" aria-hidden />

      <button
        type="button"
        className="fc-intro-skip"
        onClick={(e) => { e.stopPropagation(); skipAll(); }}
      >
        ข้าม
      </button>

      <div className={`fc-intro-panel ${visible ? "fc-intro-panel--in" : ""}`}>
        <img src={LOGO} alt={GAME_NAME} className="fc-intro-logo" />
        {username && (
          <p className="fc-intro-user">@{username}</p>
        )}
        <span className="fc-eyebrow">{slide.eyebrow}</span>
        <h1 className="fc-intro-title">{slide.title}</h1>
        <p className="fc-intro-body">{slide.body}</p>

        <div className="fc-intro-dots" aria-hidden>
          {SLIDES.map((_, i) => (
            <span key={i} className={`fc-intro-dot ${i === index ? "fc-intro-dot--on" : ""}`} />
          ))}
        </div>

        {isLast ? (
          <button
            type="button"
            className="fc-intro-cta"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
          >
            เริ่มต้นอาชีพ
          </button>
        ) : (
          <p className="fc-intro-hint">แตะหน้าจอเพื่อไปต่อ · ข้ามได้ที่มุมขวา</p>
        )}
      </div>
    </div>
  );
}
