import React, { useEffect, useState } from "react";
import { api, getToken, setToken } from "./lib/api.js";
import { isSupabaseMode, supabase } from "./lib/supabase.js";

import { GAME_NAME } from "@version";

const C = {
  panel: "#132a20", amber: "#e0a458", good: "#6fae5a", steel: "#26433a", textDim: "#a9bdb1", purple: "#9d6fe0", chalk: "#f2f0e6",
};
const BRAND_SPLASH_LOGO = "/branding/master-logo.png";
const BRAND_LOGIN_BG = "/branding/login-bg.png";

function SplashScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, boxSizing: "border-box", background: "#0a0a0a" }}>
      <img
        src={BRAND_SPLASH_LOGO}
        alt={GAME_NAME}
        style={{ maxWidth: "min(420px, 88vw)", width: "100%", height: "auto", objectFit: "contain" }}
      />
    </div>
  );
}

function LoginBackdrop({ children, style }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(180deg, rgba(7,18,13,.52) 0%, rgba(7,18,13,.8) 100%), url(${BRAND_LOGIN_BG}) center/cover no-repeat fixed`,
      color: C.chalk,
      fontFamily: "'Segoe UI', Tahoma, sans-serif",
      boxSizing: "border-box",
      ...style,
    }}>
      {children}
    </div>
  );
}

function Panel({ children, style }) {
  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.steel}`, borderRadius: 14,
      padding: 16, maxWidth: 480, margin: "0 auto", ...style,
    }}>{children}</div>
  );
}

function AuthScreen({ onAuthed }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function devLogin() {
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/auth/dev-register", {
        method: "POST",
        body: JSON.stringify({ email, displayName: name || email.split("@")[0] }),
      });
      setToken(data.token);
      onAuthed(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function supabaseLogin(signUp) {
    setLoading(true);
    setError("");
    try {
      const fn = signUp
        ? () => supabase.auth.signUp({ email, password, options: { data: { display_name: name } } })
        : () => supabase.auth.signInWithPassword({ email, password });
      const { data, error: err } = await fn();
      if (err) throw err;
      const session = data.session ?? (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("เช็คอีเมลยืนยันบัญชีก่อน");
      setToken(session.access_token);
      const me = await api("/api/auth/me");
      onAuthed(me.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginBackdrop style={{ padding: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <img src={BRAND_SPLASH_LOGO} alt={GAME_NAME} style={{ maxWidth: "min(260px, 72vw)", width: "100%", height: "auto" }} />
      </div>
      <p style={{ textAlign: "center", color: C.textDim, fontSize: 14 }}>
        {isSupabaseMode ? "ล็อกอินด้วย Supabase" : "โหมดทดสอบ (dev) — ไม่ต้องมีเซิร์ฟเวอร์จ่ายเงิน"}
      </p>
      <Panel style={{ marginBottom: 12, border: `1px solid ${C.purple}` }}>
        <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.65 }}>
          <b style={{ color: C.purple }}>ผู้เล่นใหม่:</b> สร้างสโมสรแล้วเล่นใน <b>โลกจำลอง</b> (กับบอท) ได้ทันที
          <br />ปลดล็อก <b>โหมดออนไลน์จริง</b> เมื่อมูลค่าสโมสรรวม ≥ 50M฿ และไม่ติดลบ
        </div>
      </Panel>
      <Panel>
        <input placeholder="อีเมล" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        {isSupabaseMode && (
          <input type="password" placeholder="รหัสผ่าน" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        )}
        {!isSupabaseMode && (
          <input placeholder="ชื่อที่แสดง (ไม่บังคับ)" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        )}
        {error && <p style={{ color: "#c1440e", fontSize: 13 }}>{error}</p>}
        {isSupabaseMode ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btn(C.good)} disabled={loading} onClick={() => supabaseLogin(false)}>เข้าสู่ระบบ</button>
            <button style={btn(C.amber)} disabled={loading} onClick={() => supabaseLogin(true)}>สมัคร</button>
          </div>
        ) : (
          <button style={btn(C.good)} disabled={loading || !email} onClick={devLogin}>เริ่มเล่น (dev)</button>
        )}
      </Panel>
    </LoginBackdrop>
  );
}

function CreateClubScreen({ onCreated }) {
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [color, setColor] = useState("#e0a458");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/clubs", {
        method: "POST",
        body: JSON.stringify({ name, short: short.toUpperCase().slice(0, 3), primaryColor: color }),
      });
      onCreated(data.club);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ textAlign: "center", color: C.amber }}>สร้างสโมสรของคุณ</h2>
      <p style={{ textAlign: "center", fontSize: 12, color: C.textDim, marginBottom: 12 }}>🔒 โลกจำลอง — แข่งกับบอท 15 ทีม</p>
      <Panel>
        <form onSubmit={submit}>
          <input required placeholder="ชื่อสโมสร" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          <input required placeholder="ชื่อย่อ (3 ตัว)" maxLength={3} value={short} onChange={(e) => setShort(e.target.value)} style={inputStyle} />
          <label style={{ fontSize: 13, color: C.textDim }}>สีหลัก</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: "100%", height: 40, marginBottom: 12 }} />
          {error && <p style={{ color: "#c1440e" }}>{error}</p>}
          <button type="submit" style={btn(C.good)} disabled={loading}>สร้างสโมสร</button>
        </form>
      </Panel>
    </div>
  );
}

function Dashboard({ club, playMode, onlineUnlocked, onRefresh }) {
  const [table, setTable] = useState([]);
  const [fixtures, setFixtures] = useState(null);
  const [formation, setFormation] = useState(club.formation || "4-4-2");
  const [saving, setSaving] = useState(false);
  const fin = club.finances || {};
  const pct = fin.teamValue != null ? Math.min(100, (fin.teamValue / (fin.unlockTarget || 50000000)) * 100) : 0;

  useEffect(() => {
    (async () => {
      const [t, f] = await Promise.all([
        api(`/api/leagues/${club.shardId}/table`),
        api(`/api/leagues/${club.shardId}/fixtures/today`),
      ]);
      setTable(t.table.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga)));
      setFixtures(f);
    })();
  }, [club.shardId]);

  return (
    <div style={{ padding: 16, paddingBottom: 40 }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, color: C.amber }}>{club.name}</h1>
        <p style={{ margin: "4px 0", color: C.textDim, fontSize: 13 }}>
          {playMode === "online" ? "🌐 ออนไลน์" : "🔒 โลกจำลอง"} · {club.shard?.name} · ฤดูกาล {club.shard?.seasonNumber} วันที่ {club.shard?.dayNumber} · งบ {formatMoney(club.budget)}
        </p>
      </header>

      {playMode !== "online" && (
        <Panel style={{ maxWidth: 720, marginBottom: 16, border: `1px solid ${C.purple}` }}>
          <h3 style={{ margin: "0 0 8px", color: C.purple, fontSize: 14 }}>🔒 โลกจำลอง</h3>
          <div style={{ fontSize: 12, color: C.textDim, marginBottom: 8 }}>
            มูลค่าสโมสร: <span style={{ color: C.amber, fontFamily: "monospace" }}>{formatMoney(fin.teamValue || 0)}</span>
            {" / "}{formatMoney(fin.unlockTarget || 50000000)} เพื่อปลดล็อกออนไลน์
          </div>
          <div style={{ height: 6, background: C.steel, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? C.good : C.purple }} />
          </div>
          {onlineUnlocked && <p style={{ fontSize: 12, color: C.good, marginTop: 8 }}>✅ ปลดล็อกแล้ว — โหมดออนไลน์จริงจะเปิดเร็วๆ นี้</p>}
        </Panel>
      )}

      <StakeLeaguePanel club={club} onRefreshClub={onRefresh} />

      <Panel style={{ maxWidth: 720, marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 10px", color: C.amber }}>แมตช์วันนี้</h3>
        {!fixtures?.matches?.length && <p style={{ color: C.textDim, fontSize: 13 }}>ไม่มีแมตช์วันนี้ (หรือจบฤดูกาลแล้ว)</p>}
        {fixtures?.matches?.map((m) => (
          <div key={m.id} style={{ fontSize: 14, padding: "6px 0", borderBottom: `1px solid ${C.steel}` }}>
            {m.homeClub.shortCode} {m.played ? `${m.homeGoals} - ${m.awayGoals}` : "vs"} {m.awayClub.shortCode}
            {m.homeClubId === club.id || m.awayClubId === club.id ? " ⭐" : ""}
          </div>
        ))}
      </Panel>

      <Panel style={{ maxWidth: 720, marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 10px", color: C.amber }}>แทคติก (บันทึกบนเซิร์ฟเวอร์)</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {["4-4-2", "4-3-3", "3-5-2", "5-3-2"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormation(f)}
              style={{
                padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                border: `2px solid ${formation === f ? C.amber : C.steel}`,
                background: formation === f ? "rgba(224,164,88,.12)" : "transparent",
                color: C.chalk, fontSize: 12,
              }}
            >
              {f}
            </button>
          ))}
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await api("/api/clubs/me/tactics", { method: "PATCH", body: JSON.stringify({ formation }) });
                await onRefresh();
              } catch (e) {
                alert(e.message);
              } finally {
                setSaving(false);
              }
            }}
            style={{ ...btn(C.good), maxWidth: 140, flex: "none" }}
          >
            {saving ? "..." : "บันทึกแผน"}
          </button>
        </div>
      </Panel>

      <Panel style={{ maxWidth: 720 }}>
        <h3 style={{ margin: "0 0 10px", color: C.amber }}>ตารางคะแนน</h3>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: C.textDim, textAlign: "left" }}>
              <th>#</th><th>ทีม</th><th>แข่ง</th><th>ชนะ</th><th>เสมอ</th><th>แพ้</th><th>ได้</th><th>เสีย</th><th>แต้ม</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => (
              <tr key={row.clubId} style={{
                background: row.club.userId ? "rgba(224,164,88,.1)" : "transparent",
                borderTop: `1px solid ${C.steel}`,
              }}>
                <td>{i + 1}</td>
                <td>{row.club.name}</td>
                <td>{row.played}</td>
                <td>{row.w}</td>
                <td>{row.d}</td>
                <td>{row.l}</td>
                <td>{row.gf}</td>
                <td>{row.ga}</td>
                <td style={{ color: C.amber, fontWeight: 700 }}>{row.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <p style={{ textAlign: "center", color: C.textDim, fontSize: 12, marginTop: 20 }}>
        เกมเดินอัตโนมัติทุก 1 ชม. (cron) · กดรีเฟรชเพื่อดูผลล่าสุด
      </p>
      <button style={{ ...btn(C.steel), maxWidth: 200, margin: "0 auto", display: "block" }} onClick={onRefresh}>รีเฟรช</button>
    </div>
  );
}

/* ============================== STAKE LEAGUE — ลีคเดิมพัน ============================== */

/* อ่านการ์ด ผจก. จากเซฟ sandbox ในเครื่อง (กระเป๋าการ์ด) */
function readSandboxManagerCards() {
  try {
    const raw = localStorage.getItem("career_v3");
    if (!raw) return [];
    const save = JSON.parse(raw);
    return (save.staffCardBag || []).filter((c) => c.type === "MANAGER");
  } catch {
    return [];
  }
}

function Countdown({ target, prefix }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return <span style={{ color: C.good }}>{prefix} กำลังแข่ง/รอผล...</span>;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const urgent = ms <= 10 * 60000;
  return (
    <span style={{ color: urgent ? "#c1440e" : C.amber, fontWeight: urgent ? 700 : 400 }}>
      {prefix} {m}:{String(s).padStart(2, "0")} นาที{urgent ? " ⚠️ เตรียมทีมด่วน!" : ""}
    </span>
  );
}

function StakeLeaguePanel({ club, onRefreshClub }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // join form state
  const [showJoin, setShowJoin] = useState(false);
  const [selPlayers, setSelPlayers] = useState([]);
  const [selCard, setSelCard] = useState(null);
  const [joinFormation, setJoinFormation] = useState(club.formation || "4-4-2");
  // lineup editor state
  const [showLineup, setShowLineup] = useState(false);
  const [lineup, setLineup] = useState([]);

  const managerCards = readSandboxManagerCards();

  async function load() {
    try {
      const s = await api("/api/stake/status");
      setStatus(s);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 20000); // poll ทุก 20 วิ — ลีคเดินตามเวลาจริง
    return () => clearInterval(t);
  }, []);

  if (!status) return null;
  const cfg = status.config || {};
  const my = status.my;
  const lg = my?.league;
  const activeLeague = lg && lg.status !== "finished";

  const players = club.players || [];
  const selValue = players.filter((p) => selPlayers.includes(p.id)).reduce((s, p) => s + (p.value || 0), 0);
  const cardValue = (selCard?.stars || 0) * (cfg.managerValuePerStar || 15000000);
  const totalValue = selValue + cardValue;
  const overCap = totalValue > (cfg.valueCap || 500000000);

  function togglePlayer(id) {
    setSelPlayers((prev) => prev.includes(id)
      ? prev.filter((x) => x !== id)
      : prev.length >= (cfg.maxSquad || 22) ? prev : [...prev, id]);
  }

  async function doJoin() {
    setBusy(true);
    setError("");
    try {
      await api("/api/stake/join", {
        method: "POST",
        body: JSON.stringify({ playerIds: selPlayers, managerCard: selCard, formation: joinFormation }),
      });
      setShowJoin(false);
      await load();
      await onRefreshClub();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function doFillBots() {
    setBusy(true);
    setError("");
    try {
      await api("/api/stake/fill-bots", { method: "POST" });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveLineup(auto) {
    setBusy(true);
    setError("");
    try {
      await api("/api/stake/lineup", {
        method: "PATCH",
        body: JSON.stringify(auto != null ? { autoMode: auto } : { lineup, autoMode: false }),
      });
      setShowLineup(false);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const border = activeLeague ? "#c1440e" : C.purple;

  return (
    <Panel style={{ maxWidth: 720, marginBottom: 16, border: `1px solid ${border}` }}>
      <h3 style={{ margin: "0 0 4px", color: border, fontSize: 15 }}>
        🎲 Stake League — ลีคเดิมพัน
      </h3>
      <p style={{ margin: "0 0 10px", fontSize: 11.5, color: C.textDim }}>
        ค่าสมัคร {formatMoney(cfg.entryFee || 0)} · 16 ทีม · เงินรางวัลรวม {formatMoney((cfg.entryFee || 0) * 16)} (ที่ 1 ได้ {formatMoney(cfg.prizeTable?.[0] || 0)}) · แข่งรอบละ {cfg.roundMinutes || 10} นาทีตามเวลาจริง
      </p>
      {error && <p style={{ color: "#c1440e", fontSize: 12 }}>{error}</p>}

      {/* ----- ยังไม่ได้อยู่ในลีค (หรือลีคก่อนจบแล้ว) → สมัคร ----- */}
      {!activeLeague && (
        <>
          {lg?.status === "finished" && (
            <div style={{ marginBottom: 10, padding: 10, borderRadius: 8, background: "rgba(224,164,88,.08)", border: `1px solid ${C.steel}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.amber }}>
                ลีคก่อนหน้า: จบอันดับ {my.entry.finalPos} — รับเงินรางวัล {formatMoney(my.entry.prize || 0)}
              </div>
              <div style={{ fontSize: 11, color: C.textDim }}>ผล {my.entry.w}W {my.entry.d}D {my.entry.l}L · {my.entry.pts} แต้ม</div>
            </div>
          )}
          {status.open && (
            <div style={{ fontSize: 12, color: C.textDim, marginBottom: 8 }}>
              ลีคเปิดรับสมัคร: {status.open.entryCount}/{status.open.maxTeams} ทีมแล้ว
            </div>
          )}
          {!showJoin ? (
            <button style={btn(border)} disabled={busy || club.budget < (cfg.entryFee || 0)} onClick={() => setShowJoin(true)}>
              {club.budget < (cfg.entryFee || 0) ? `งบไม่พอ (ต้องมี ${formatMoney(cfg.entryFee || 0)})` : "สมัครเข้าลีคเดิมพัน"}
            </button>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: C.chalk, marginBottom: 6 }}>
                1) เลือกนักเตะลงทะเบียน (11-{cfg.maxSquad || 22} คน) — เลือกแล้ว {selPlayers.length} คน
              </div>
              <div style={{ maxHeight: 220, overflowY: "auto", border: `1px solid ${C.steel}`, borderRadius: 8, padding: 6, marginBottom: 8 }}>
                {players.map((p) => (
                  <label key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, padding: "3px 4px", cursor: "pointer" }}>
                    <input type="checkbox" checked={selPlayers.includes(p.id)} onChange={() => togglePlayer(p.id)} />
                    <span style={{ width: 26, color: C.textDim }}>{p.position}</span>
                    <span style={{ flex: 1 }}>{p.name}</span>
                    <span style={{ color: C.amber }}>{p.rating}</span>
                    <span style={{ color: C.textDim, fontFamily: "monospace" }}>{formatMoney(p.value || 0)}</span>
                  </label>
                ))}
              </div>
              <div style={{ fontSize: 12, color: C.chalk, marginBottom: 6 }}>2) เลือกการ์ด ผจก. จากกระเป๋า (จากโหมด sandbox)</div>
              {managerCards.length === 0 ? (
                <div style={{ fontSize: 11.5, color: C.textDim, marginBottom: 8 }}>
                  ไม่พบการ์ด ผจก. ในกระเป๋า — ระบบจะสุ่ม ผจก. พื้นฐานให้
                </div>
              ) : (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {managerCards.map((c) => (
                    <button key={c.cardId} type="button" onClick={() => setSelCard(selCard?.cardId === c.cardId ? null : c)}
                      style={{
                        padding: "6px 10px", borderRadius: 8, fontSize: 11.5, cursor: "pointer",
                        border: `2px solid ${selCard?.cardId === c.cardId ? C.amber : C.steel}`,
                        background: selCard?.cardId === c.cardId ? "rgba(224,164,88,.15)" : "transparent", color: C.chalk,
                      }}>
                      {c.name} {"★".repeat(c.stars)}<br />
                      <span style={{ color: C.textDim, fontSize: 10 }}>มูลค่า {formatMoney(c.stars * (cfg.managerValuePerStar || 15000000))}</span>
                    </button>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 12, color: C.chalk, marginBottom: 6 }}>3) แผนการเล่น</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {["4-4-2", "4-3-3", "3-5-2", "5-3-2"].map((f) => (
                  <button key={f} type="button" onClick={() => setJoinFormation(f)}
                    style={{
                      padding: "6px 10px", borderRadius: 8, fontSize: 11.5, cursor: "pointer",
                      border: `2px solid ${joinFormation === f ? C.amber : C.steel}`,
                      background: joinFormation === f ? "rgba(224,164,88,.12)" : "transparent", color: C.chalk,
                    }}>{f}</button>
                ))}
              </div>
              <div style={{ fontSize: 12, marginBottom: 8, fontFamily: "monospace", color: overCap ? "#c1440e" : C.good }}>
                มูลค่าทีมรวม {formatMoney(totalValue)} / เพดาน {formatMoney(cfg.valueCap || 0)} {overCap ? "— เกินเพดาน!" : "✓"}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={btn(C.good)} disabled={busy || selPlayers.length < 11 || overCap} onClick={doJoin}>
                  ยืนยันสมัคร (จ่าย {formatMoney(cfg.entryFee || 0)})
                </button>
                <button style={btn(C.steel)} disabled={busy} onClick={() => setShowJoin(false)}>ยกเลิก</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ----- อยู่ในลีคที่เปิดรับสมัคร ----- */}
      {activeLeague && lg.status === "recruiting" && (
        <div>
          <div style={{ fontSize: 13, color: C.chalk, marginBottom: 8 }}>
            ✅ สมัครแล้ว — รอผู้เล่นครบ {lg.maxTeams} ทีม ({lg.entryCount}/{lg.maxTeams})
          </div>
          <div style={{ fontSize: 11.5, color: C.textDim, marginBottom: 10 }}>
            เมื่อครบ ระบบจะจัดตารางแข่งอัตโนมัติ และรอบแรกเริ่มหลังจากนั้น {lg.roundMinutes} นาที
          </div>
          <button style={btn(C.amber)} disabled={busy} onClick={doFillBots}>
            ไม่อยากรอ — เติมบอทให้ครบแล้วเริ่มเลย
          </button>
        </div>
      )}

      {/* ----- ลีคกำลังแข่ง ----- */}
      {activeLeague && lg.status === "running" && (
        <div>
          <div style={{ padding: 10, borderRadius: 8, background: "rgba(193,68,14,.08)", border: `1px solid ${C.steel}`, marginBottom: 10 }}>
            <div style={{ fontSize: 12.5, marginBottom: 4 }}>
              รอบ {lg.currentRound}/{lg.totalRounds} · <Countdown target={lg.nextRoundAt} prefix="รอบถัดไปใน" />
            </div>
            {my.nextMatch && (
              <div style={{ fontSize: 12.5, color: C.chalk }}>
                นัดต่อไปของคุณ (รอบ {my.nextMatch.round}): {my.nextMatch.isHome ? "เหย้า" : "เยือน"} vs <b>{my.nextMatch.opponent?.name}</b>
                {my.nextMatch.startsAt && <> · <Countdown target={my.nextMatch.startsAt} prefix="เริ่มใน" /></>}
              </div>
            )}
            <div style={{ fontSize: 11.5, color: C.textDim, marginTop: 4 }}>
              โหมด: {my.entry.autoMode ? `🤖 อัตโนมัติ (ผจก. ${my.entry.manager?.name || ""} คุมให้)` : "👤 จัดทีมเอง"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button style={btn(C.steel)} disabled={busy} onClick={() => saveLineup(!my.entry.autoMode)}>
              {my.entry.autoMode ? "สลับเป็นจัดทีมเอง" : "สลับเป็นออโต้"}
            </button>
            <button style={btn(C.amber)} disabled={busy} onClick={() => { setLineup(my.entry.lineup?.length ? my.entry.lineup : []); setShowLineup((v) => !v); }}>
              จัดตัวจริง 11 คน
            </button>
          </div>

          {showLineup && (
            <div style={{ border: `1px solid ${C.steel}`, borderRadius: 8, padding: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: C.chalk, marginBottom: 6 }}>เลือกตัวจริง {lineup.length}/11 จากนักเตะที่ลงทะเบียน</div>
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {(my.entry.squad || []).map((p) => (
                  <label key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, padding: "3px 4px", cursor: "pointer" }}>
                    <input type="checkbox" checked={lineup.includes(p.id)}
                      onChange={() => setLineup((prev) => prev.includes(p.id) ? prev.filter((x) => x !== p.id) : prev.length >= 11 ? prev : [...prev, p.id])} />
                    <span style={{ width: 26, color: C.textDim }}>{p.position}</span>
                    <span style={{ flex: 1 }}>{p.name}</span>
                    <span style={{ color: C.amber }}>{p.rating}</span>
                    <span style={{ color: C.textDim, fontSize: 10.5 }}>💪{p.stamina}{p.injuryDays > 0 ? " 🤕" : ""}</span>
                  </label>
                ))}
              </div>
              <button style={{ ...btn(C.good), marginTop: 8 }} disabled={busy || lineup.length !== 11} onClick={() => saveLineup(null)}>
                บันทึกตัวจริง (ปิดออโต้)
              </button>
            </div>
          )}

          {my.lastResults?.length > 0 && (
            <div style={{ fontSize: 11.5, color: C.textDim, marginBottom: 10 }}>
              ผลล่าสุด: {my.lastResults.map((r, i) => (
                <span key={i} style={{ marginRight: 8, fontFamily: "monospace" }}>
                  {r.home} {r.homeGoals}-{r.awayGoals} {r.away}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ----- ตารางคะแนน (running + finished) ----- */}
      {my && lg.status !== "recruiting" && (
        <table style={{ width: "100%", fontSize: 11.5, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: C.textDim, textAlign: "left" }}>
              <th>#</th><th>ทีม</th><th>แข่ง</th><th>W</th><th>D</th><th>L</th><th>+/-</th><th>แต้ม</th>
              {lg.status === "finished" && <th>รางวัล</th>}
            </tr>
          </thead>
          <tbody>
            {my.standings.map((row) => (
              <tr key={row.entryId} style={{
                background: row.userId && !row.isBot && row.entryId === my.entry.id ? "rgba(224,164,88,.12)" : "transparent",
                borderTop: `1px solid ${C.steel}`,
              }}>
                <td>{row.pos}</td>
                <td>{row.name}{row.isBot ? " 🤖" : ""}</td>
                <td>{row.played}</td><td>{row.w}</td><td>{row.d}</td><td>{row.l}</td>
                <td>{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                <td style={{ color: C.amber, fontWeight: 700 }}>{row.pts}</td>
                {lg.status === "finished" && <td style={{ fontFamily: "monospace", color: C.good }}>{formatMoney(row.prize || 0)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

function formatMoney(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M฿`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K฿`;
  return `${n}฿`;
}

const inputStyle = { width: "100%", padding: 10, marginBottom: 10, borderRadius: 8, border: `1px solid ${C.steel}`, background: "#0f2119", color: "#f2f0e6" };
function btn(bg) {
  return { flex: 1, width: "100%", padding: "12px 0", border: "none", borderRadius: 10, background: bg, color: bg === C.amber ? "#08150e" : "#fff", fontWeight: 700 };
}

export default function App() {
  const [user, setUser] = useState(null);
  const [club, setClub] = useState(null);
  const [playMode, setPlayMode] = useState("sandbox");
  const [onlineUnlocked, setOnlineUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [splashDone, setSplashDone] = useState(false);

  async function loadClub() {
    const data = await api("/api/clubs/me");
    setClub(data.club);
    setPlayMode(data.playMode || "sandbox");
    setOnlineUnlocked(Boolean(data.onlineUnlocked));
  }

  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) { setLoading(false); return; }
      try {
        const me = await api("/api/auth/me");
        setUser(me.user);
        await loadClub();
      } catch {
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => setSplashDone(true), 2000);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading) return <p style={{ textAlign: "center", padding: 40, color: C.textDim }}>กำลังโหลด...</p>;
  if (!splashDone) return <SplashScreen />;
  if (!user) return <AuthScreen onAuthed={(u) => { setUser(u); loadClub().catch(() => {}); }} />;
  if (!club) return <CreateClubScreen onCreated={(c) => { setClub(c); setPlayMode("sandbox"); }} />;
  return <Dashboard club={club} playMode={playMode} onlineUnlocked={onlineUnlocked} onRefresh={loadClub} />;
}
