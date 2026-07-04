import React, { useMemo, useState } from "react";
import { GAME_NAME_SHORT } from "@version";

const MATCH_LOG_RE = /^[A-Z0-9]{2,4} \d+ - \d+/;

const CATEGORY_FROM_LINE = [
  { test: (l) => l.includes("[โลก TMFC]") || l.startsWith("📰"), cat: "โลก TMFC", type: "world" },
  { test: (l) => /^🏆|^🥈|^🎉|^🍺/.test(l), cat: "ลีก & ถ้วย", type: "league" },
  { test: (l) => l.startsWith("⭐"), cat: "ซูเปอร์สตาร์", type: "legend" },
  { test: (l) => /^💰|^📈|^📉|^💼/.test(l), cat: "การเงิน", type: "finance" },
  { test: (l) => /^🏋️|^😴|^✨/.test(l), cat: "ฝึกซ้อม", type: "training" },
  { test: (l) => /^🆕|^📄|^👋/.test(l), cat: "ตลาดนักเตะ", type: "transfer" },
];

function inferNewsMeta(line) {
  for (const row of CATEGORY_FROM_LINE) {
    if (row.test(line)) return { category: row.cat, type: row.type };
  }
  return { category: "สโมสร", type: "club" };
}

function logToNewsItem(line, career, index) {
  const { category, type } = inferNewsMeta(line);
  return {
    id: `clublog_s${career.season}d${career.day}_${index}`,
    day: career.day,
    season: career.season,
    category,
    type,
    headline: line.length > 72 ? `${line.slice(0, 69)}…` : line,
    body: line,
    unread: false,
  };
}

/** รวมข่าวโลก + log สโมสร สำหรับหน้าหลัก */
export function buildHomeNewsFeed(career, limit = 10) {
  const world = (career.worldNews || []).map((w) => ({ ...w, source: "world" }));
  const club = (career.log || [])
    .filter((l) => typeof l === "string" && !MATCH_LOG_RE.test(l) && !l.includes("ลงสนาม") && !l.includes("⚽"))
    .filter((l) => !l.startsWith("📰 [โลก TMFC]"))
    .slice(0, 12)
    .map((line, i) => ({ ...logToNewsItem(line, career, i), source: "club" }));
  return [...world, ...club].slice(0, limit);
}

/** ข่าวโลก — สโมสรใหม่เข้าร่วม The Master FC Online */
export function buildNewClubWorldNews({ season, day, clubName, managerName }) {
  const id = `wn_newclub_s${season}d${day}_${Date.now()}`;
  return {
    id,
    day,
    season,
    category: "The Master FC Online",
    type: "world",
    headline: `จัดตั้งสโมสรใหม่ — ${clubName}`,
    body: `มีรายงานการจัดตั้งสโมสรใหม่ในโลก ${GAME_NAME_SHORT} Online โลกจำลองได้ต้อนรับ ${clubName} ภายใต้การคุมทีมของ ${managerName} สโมสรจะเริ่มต้นใน Challenger League ฤดูกาลที่ ${season} และตั้งเป้าขยับขึ้นสู่ Master League`,
    unread: true,
  };
}

export function WorldNewsFlash({ item, onClose }) {
  if (!item) return null;
  return (
    <div className="fc-world-news-overlay" role="dialog" aria-modal="true" aria-labelledby="fc-world-news-headline">
      <div className="fc-world-news-sheet">
        <div className="fc-world-news-masthead">
          <span className="fc-world-news-brand">{GAME_NAME_SHORT} NEWS</span>
          <span className="fc-world-news-meta">ฤดูกาล {item.season} · วันที่ {item.day}</span>
        </div>
        <div className="fc-world-news-category">{item.category}</div>
        <h2 id="fc-world-news-headline" className="fc-world-news-headline">{item.headline}</h2>
        <p className="fc-world-news-body">{item.body}</p>
        <button type="button" className="fc-world-news-cta" onClick={onClose}>
          ดำเนินการต่อ
        </button>
      </div>
    </div>
  );
}

export function WorldNewsLine({ item, highlight }) {
  return (
    <div className={`fc-world-news-line ${highlight ? "fc-world-news-line--hi" : ""}`}>
      <div className="fc-world-news-line-tag">{item.type === "world" ? "โลก TMFC" : item.category}</div>
      <div className="fc-world-news-line-head">{item.headline}</div>
      {item.body && item.body !== item.headline && (
        <div className="fc-world-news-line-body">{item.body}</div>
      )}
    </div>
  );
}

const FEED_TABS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "world", label: "โลก TMFC" },
  { id: "club", label: "สโมสร" },
];

/** แผงข่าวสารหน้าหลัก — แบบ FM Mobile */
export function HomeNewsPanel({ career, onMarkRead }) {
  const [tab, setTab] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  const allItems = useMemo(() => buildHomeNewsFeed(career, 12), [career]);
  const items = useMemo(() => {
    if (tab === "world") return allItems.filter((i) => i.type === "world");
    if (tab === "club") return allItems.filter((i) => i.type !== "world");
    return allItems;
  }, [allItems, tab]);

  const unreadCount = (career.worldNews || []).filter((w) => w.unread).length;
  const featured = items[0];

  function openItem(item) {
    setExpandedId((prev) => (prev === item.id ? null : item.id));
    if (item.unread && onMarkRead) onMarkRead(item.id);
  }

  return (
    <div className="fc-home-news">
      <div className="fc-home-news-header">
        <div>
          <div className="fc-home-news-title">📰 ข่าวสาร</div>
          <div className="fc-home-news-sub">ฤดูกาล {career.season} · วันที่ {career.day}</div>
        </div>
        {unreadCount > 0 && (
          <span className="fc-home-news-badge">{unreadCount} ใหม่</span>
        )}
      </div>

      <div className="fc-home-news-tabs">
        {FEED_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`fc-home-news-tab ${tab === t.id ? "fc-home-news-tab--on" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="fc-home-news-empty">ยังไม่มีข่าวในหมวดนี้</div>
      ) : (
        <>
          {featured && (
            <button
              type="button"
              className={`fc-home-news-featured ${featured.unread ? "fc-home-news-featured--unread" : ""}`}
              onClick={() => openItem(featured)}
            >
              <div className="fc-home-news-featured-tag">
                {featured.type === "world" ? "โลก TMFC" : featured.category}
              </div>
              <div className="fc-home-news-featured-head">{featured.headline}</div>
              <div className="fc-home-news-featured-body">
                {expandedId === featured.id ? featured.body : (featured.body || featured.headline).slice(0, 120)}
                {(featured.body || featured.headline).length > 120 && expandedId !== featured.id ? "…" : ""}
              </div>
              <div className="fc-home-news-featured-meta">S{featured.season} · D{featured.day}</div>
            </button>
          )}

          <div className="fc-home-news-list">
            {items.slice(featured ? 1 : 0).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`fc-home-news-row ${item.unread ? "fc-home-news-row--unread" : ""} ${expandedId === item.id ? "fc-home-news-row--open" : ""}`}
                onClick={() => openItem(item)}
              >
                <div className="fc-home-news-row-top">
                  <span className="fc-home-news-row-cat">
                    {item.type === "world" ? "โลก" : item.category}
                  </span>
                  <span className="fc-home-news-row-date">D{item.day}</span>
                </div>
                <div className="fc-home-news-row-head">{item.headline}</div>
                {expandedId === item.id && item.body && item.body !== item.headline && (
                  <div className="fc-home-news-row-body">{item.body}</div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
