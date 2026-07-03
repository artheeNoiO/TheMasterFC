import React, { useCallback, useEffect, useState } from "react";
import { GAME_DISCORD_URL, GAME_DISCORD_HINT, GAME_DISCORD_LABEL } from "./game-version.js";
import { fetchFeedbackPosts, postFeedback, voteFeedback } from "./feedback-api.js";

function formatWhen(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

export function DiscordBanner({ variant = "landing", className = "" }) {
  const isLanding = variant === "landing";
  return (
    <div className={isLanding ? `landing-discord-banner ${className}`.trim() : className} style={!isLanding ? {
      padding: "14px 12px",
      borderRadius: 8,
      background: "rgba(88,101,242,0.12)",
      border: "1px solid rgba(88,101,242,0.35)",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    } : undefined}>
      {isLanding ? (
        <>
          <div className="landing-discord-left">
            <span className="landing-discord-icon" aria-hidden>💬</span>
            <div className="landing-discord-copy">
              <strong>Community Discord</strong>
              <p>{GAME_DISCORD_HINT}</p>
            </div>
          </div>
          <a
            href={GAME_DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="landing-discord-btn"
          >
            {GAME_DISCORD_LABEL}
          </a>
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 22 }} aria-hidden>💬</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Discord — ชุมชนผู้เล่น</div>
              <div style={{ fontSize: 11, color: "#9aa3ad", lineHeight: 1.55 }}>{GAME_DISCORD_HINT}</div>
            </div>
          </div>
          <a
            href={GAME_DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 6,
              background: "#5865F2",
              color: "#fff",
              fontWeight: 700,
              fontSize: 12,
              textDecoration: "none",
              letterSpacing: 0.04,
            }}
          >
            🔗 {GAME_DISCORD_LABEL}
          </a>
        </>
      )}
    </div>
  );
}

function VoteButtons({ entry, onVote, variant, disabled }) {
  const isLanding = variant === "landing";
  const likeActive = entry.myVote === 1;
  const dislikeActive = entry.myVote === -1;
  const baseClass = isLanding ? "landing-feedback-vote" : "";
  const activeLike = isLanding ? " landing-feedback-vote--like-active" : "";
  const activeDislike = isLanding ? " landing-feedback-vote--dislike-active" : "";

  const gameBtn = (active, kind) => ({
    padding: "4px 10px",
    borderRadius: 4,
    border: `1px solid ${active ? (kind === "like" ? "#3dba6a" : "#d45a3a") : "rgba(255,255,255,0.12)"}`,
    background: active ? (kind === "like" ? "rgba(61,186,106,.15)" : "rgba(212,90,58,.15)") : "transparent",
    color: active ? (kind === "like" ? "#3dba6a" : "#d45a3a") : "#9aa3ad",
    fontSize: 11,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.6 : 1,
  });

  return (
    <div className={isLanding ? "landing-feedback-votes" : undefined} style={!isLanding ? { display: "flex", gap: 6 } : undefined}>
      <button
        type="button"
        className={`${baseClass}${likeActive ? activeLike : ""}`.trim()}
        style={!isLanding ? gameBtn(likeActive, "like") : undefined}
        disabled={disabled}
        onClick={() => onVote(entry.id, likeActive ? "clear" : "like")}
        aria-pressed={likeActive}
      >
        👍 {entry.likes || 0}
      </button>
      <button
        type="button"
        className={`${baseClass}${dislikeActive ? activeDislike : ""}`.trim()}
        style={!isLanding ? gameBtn(dislikeActive, "dislike") : undefined}
        disabled={disabled}
        onClick={() => onVote(entry.id, dislikeActive ? "clear" : "dislike")}
        aria-pressed={dislikeActive}
      >
        👎 {entry.dislikes || 0}
      </button>
    </div>
  );
}

export default function FeedbackBoard({
  variant = "landing",
  showDiscord = true,
  title = "Feedback จากผู้เล่น",
  subtitle = "ชอบอะไร ไม่ชอบอะไร — เขียนได้เลย ทีมพัฒนาอ่านทุกข้อความ",
}) {
  const [entries, setEntries] = useState([]);
  const [source, setSource] = useState("loading");
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const isLanding = variant === "landing";

  const reload = useCallback(async () => {
    try {
      const data = await fetchFeedbackPosts();
      setEntries(data.entries);
      setSource(data.source);
    } catch {
      setSource("local");
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    reload();
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("tmfc-feedback-author");
      if (saved) setAuthor(saved);
    }
  }, [reload]);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      if (author.trim()) localStorage.setItem("tmfc-feedback-author", author.trim());
      await postFeedback({ author: author.trim() || "ผู้เล่น", body });
      setBody("");
      setMsg("ส่ง feedback แล้ว — ขอบคุณ!");
      await reload();
    } catch (ex) {
      if (String(ex.message).includes("บันทึกไว้ในเครื่อง")) {
        setMsg(ex.message);
        await reload();
      } else {
        setErr(ex.message || "ส่งไม่สำเร็จ");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleVote(id, vote) {
    setBusy(true);
    setErr("");
    try {
      const updated = await voteFeedback(id, vote);
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
    } catch (ex) {
      setErr(ex.message || "โหวตไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const rootClass = isLanding ? "landing-feedback" : "";
  const formClass = isLanding ? "landing-feedback-form" : "";

  return (
    <div className={rootClass} style={!isLanding ? { display: "flex", flexDirection: "column", gap: 12 } : undefined}>
      {showDiscord && <DiscordBanner variant={variant} />}

      <div className={isLanding ? "landing-feedback-head" : undefined}>
        <h3 style={!isLanding ? { fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 } : undefined}>{title}</h3>
        <p style={!isLanding ? { fontSize: 11, color: "#9aa3ad", margin: "6px 0 0", lineHeight: 1.55 } : undefined}>{subtitle}</p>
      </div>

      <form
        className={formClass}
        onSubmit={handleSubmit}
        style={!isLanding ? { display: "flex", flexDirection: "column", gap: 8 } : undefined}
      >
        <input
          type="text"
          className={isLanding ? "landing-feedback-input" : undefined}
          style={!isLanding ? inputStyle : undefined}
          placeholder="ชื่อเล่น / ชื่อสโมสร (ไม่บังคับ)"
          maxLength={40}
          value={author}
          onChange={(ev) => setAuthor(ev.target.value)}
        />
        <textarea
          className={isLanding ? "landing-feedback-textarea" : undefined}
          style={!isLanding ? { ...inputStyle, minHeight: 88, resize: "vertical" } : undefined}
          placeholder="เขียน feedback — ชอบ / ไม่ชอบ / อยากให้มีอะไรเพิ่ม..."
          maxLength={500}
          rows={4}
          value={body}
          onChange={(ev) => setBody(ev.target.value)}
          required
        />
        <div className={isLanding ? "landing-feedback-form-actions" : undefined} style={!isLanding ? { display: "flex", alignItems: "center", gap: 10 } : undefined}>
          <button
            type="submit"
            className={isLanding ? "landing-btn-primary landing-feedback-submit" : undefined}
            style={!isLanding ? submitStyle : undefined}
            disabled={busy || !body.trim()}
          >
            {busy ? "กำลังส่ง..." : "ส่ง Feedback"}
          </button>
          <span className={isLanding ? "landing-feedback-char" : undefined} style={!isLanding ? { fontSize: 10, color: "#9aa3ad" } : undefined}>
            {body.length}/500
          </span>
        </div>
      </form>

      {msg && <p className={isLanding ? "landing-feedback-msg" : undefined} style={!isLanding ? msgStyle("#3dba6a") : undefined}>{msg}</p>}
      {err && <p className={isLanding ? "landing-feedback-err" : undefined} style={!isLanding ? msgStyle("#d45a3a") : undefined}>{err}</p>}

      {source === "local" && (
        <p className={isLanding ? "landing-feedback-note" : undefined} style={!isLanding ? { fontSize: 10, color: "#9aa3ad", lineHeight: 1.5 } : undefined}>
          โหมดออฟไลน์ — ความคิดเห็นบางส่วนเก็บในเครื่องนี้ แนะนำแชร์ใน Discord ด้วยเพื่อให้ทีมเห็น
        </p>
      )}

      <div className={isLanding ? "landing-feedback-list" : undefined} style={!isLanding ? { display: "flex", flexDirection: "column", gap: 8 } : undefined}>
        {entries.length === 0 && !busy && (
          <p className={isLanding ? "landing-feedback-empty" : undefined} style={!isLanding ? { fontSize: 11, color: "#9aa3ad", textAlign: "center", padding: "16px 0" } : undefined}>
            ยังไม่มี feedback — เป็นคนแรกที่เขียนได้เลย
          </p>
        )}
        {entries.map((entry) => (
          <article
            key={entry.id}
            className={isLanding ? "landing-feedback-card" : undefined}
            style={!isLanding ? cardStyle : undefined}
          >
            <header className={isLanding ? "landing-feedback-card-head" : undefined} style={!isLanding ? { display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 } : undefined}>
              <strong style={!isLanding ? { fontSize: 12, color: "#fff" } : undefined}>{entry.author}</strong>
              <time style={!isLanding ? { fontSize: 9, color: "#9aa3ad" } : undefined} dateTime={entry.createdAt}>
                {formatWhen(entry.createdAt)}
                {entry.local ? " · เครื่องนี้" : ""}
              </time>
            </header>
            <p className={isLanding ? "landing-feedback-body" : undefined} style={!isLanding ? { fontSize: 12, color: "#e8ece9", lineHeight: 1.6, margin: "0 0 8px", whiteSpace: "pre-wrap" } : undefined}>
              {entry.body}
            </p>
            <VoteButtons entry={entry} onVote={handleVote} variant={variant} disabled={busy} />
          </article>
        ))}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(5,6,8,0.5)",
  color: "#fff",
  fontSize: 12,
  fontFamily: "inherit",
};

const submitStyle = {
  padding: "10px 16px",
  borderRadius: 6,
  border: "none",
  background: "#3dba6a",
  color: "#050608",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};

function msgStyle(color) {
  return { fontSize: 11, color, margin: 0, lineHeight: 1.5 };
}

const cardStyle = {
  padding: "12px 12px",
  borderRadius: 8,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
};
