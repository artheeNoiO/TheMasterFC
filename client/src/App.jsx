import React, { useEffect, useState } from "react";
import { api, getToken, setToken } from "./lib/api.js";
import { isSupabaseMode, supabase } from "./lib/supabase.js";

const C = {
  panel: "#132a20", amber: "#e0a458", good: "#6fae5a", steel: "#26433a", textDim: "#a9bdb1", purple: "#9d6fe0",
};

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
    <div style={{ padding: 24 }}>
      <h1 style={{ textAlign: "center", color: C.amber }}>The Socker Manager</h1>
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
    </div>
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

  if (loading) return <p style={{ textAlign: "center", padding: 40, color: C.textDim }}>กำลังโหลด...</p>;
  if (!user) return <AuthScreen onAuthed={(u) => { setUser(u); loadClub().catch(() => {}); }} />;
  if (!club) return <CreateClubScreen onCreated={(c) => { setClub(c); setPlayMode("sandbox"); }} />;
  return <Dashboard club={club} playMode={playMode} onlineUnlocked={onlineUnlocked} onRefresh={loadClub} />;
}
