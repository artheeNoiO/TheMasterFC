import React, { useCallback, useEffect, useState } from "react";
import { LiveMatchModal } from "@game";
import { onlineApi, getGameApiBase, isGameApiConfigured } from "./lib/online-api.js";
import { ensureOnlineSession } from "./lib/online-session.js";
import { buildOnlineCareer } from "./lib/online-career-adapter.js";
import OnlineRoadmapPanel from "./OnlineRoadmapPanel.jsx";
import { DAILY_STAFF_CARD_DRAWS, MINUTES_PER_GAME_DAY, MATCH_DAYS_PER_SEASON, GAME_VERSION } from "@version";

const C = {
  panel: "#132a20", amber: "#e0a458", good: "#6fae5a", steel: "#26433a",
  textDim: "#a9bdb1", chalk: "#f2f0e6", crimson: "#c1440e",
};

function formatMoney(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

function CreateClubForm({ onCreated }) {
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [color, setColor] = useState("#c1440e");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onlineApi("/api/clubs", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          short: short.trim().toUpperCase().slice(0, 3),
          primaryColor: color,
        }),
      });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <h2 style={{ color: C.amber, textAlign: "center" }}>สร้างสโมสรออนไลน์</h2>
      <p style={{ color: C.textDim, fontSize: 13, textAlign: "center", marginBottom: 16 }}>
        เข้า Challenger League ชาร์ด 16 ทีม · บอทเติมที่ว่าง · แข่ง 1 นัด/วัน
      </p>
      <form onSubmit={submit} style={{ background: C.panel, border: `1px solid ${C.steel}`, borderRadius: 12, padding: 16 }}>
        <input required placeholder="ชื่อสโมสร" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        <input required placeholder="ชื่อย่อ 3 ตัว" maxLength={3} value={short} onChange={(e) => setShort(e.target.value)} style={inputStyle} />
        <label style={{ fontSize: 12, color: C.textDim }}>สีหลัก</label>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: "100%", height: 40, marginBottom: 12 }} />
        {error && <p style={{ color: C.crimson, fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={loading} style={btn(C.good)}>{loading ? "..." : "สร้างสโมสร & เข้าลีก"}</button>
      </form>
    </div>
  );
}

export default function OnlineMvpApp({ bootError, onRetryBoot }) {
  const [club, setClub] = useState(null);
  const [table, setTable] = useState([]);
  const [fixtures, setFixtures] = useState(null);
  const [myMatch, setMyMatch] = useState(null);
  const [staffDraws, setStaffDraws] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [roadmapBusy, setRoadmapBusy] = useState(false);
  const [formation, setFormation] = useState("4-4-2");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(bootError || "");
  const [statusMsg, setStatusMsg] = useState("");
  const [kickoffLoading, setKickoffLoading] = useState(false);
  const [liveSession, setLiveSession] = useState(null);
  const [staffPullBusy, setStaffPullBusy] = useState(false);
  const [lastStaffPull, setLastStaffPull] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await ensureOnlineSession();
      const me = await onlineApi("/api/clubs/me");
      setClub(me.club);
      setStaffDraws(me.staffDraws || me.club?.staffDraws || null);
      setRoadmap(me.roadmap || me.club?.roadmap || null);
      if (me.club) {
        setFormation(me.club.formation || "4-4-2");
        const [t, f, mt] = await Promise.all([
          onlineApi(`/api/leagues/${me.club.shardId}/table`),
          onlineApi(`/api/leagues/${me.club.shardId}/fixtures/today`),
          onlineApi("/api/matches/my-today"),
        ]);
        setTable(t.table || []);
        setFixtures(f);
        setMyMatch(mt.match);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function saveTactics() {
    try {
      await onlineApi("/api/clubs/me/tactics", {
        method: "PATCH",
        body: JSON.stringify({ formation }),
      });
      setStatusMsg("บันทึกแผนแล้ว");
    } catch (e) {
      setError(e.message);
    }
  }

  async function startLiveMatch() {
    setKickoffLoading(true);
    setError("");
    try {
      const payload = await onlineApi("/api/matches/kickoff", { method: "POST" });
      const career = buildOnlineCareer({
        userClubId: club.id,
        homeClub: payload.homeClub,
        awayClub: payload.awayClub,
        liveMatch: payload.liveMatch,
        day: payload.day,
      });
      setLiveSession({
        career,
        liveMatch: payload.liveMatch,
        matchId: payload.matchId,
        userAutoMode: club.autoMode !== false,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setKickoffLoading(false);
    }
  }

  // หมายเหตุ: อนิเมชันแมตช์สด (LiveMatchModal จาก @game) จำลองสกอร์ของตัวเองฝั่ง client ล้วนๆ
  // เพื่อความตื่นเต้น แต่ผลที่ "นับจริง" ต้องยึดตามที่เซิร์ฟเวอร์ตัดสิน+ล็อกไว้แล้วตอนกด kickoff เท่านั้น
  // (เคยเป็นช่องโหว่: ส่ง homeGoals/awayGoals จากอนิเมชันไปให้เซิร์ฟเวอร์เชื่อตรงๆ ปลอมสกอร์ได้) — จึงไม่ส่ง
  // ค่าใดๆ จาก client ไปที่ /finish อีกต่อไป แล้วใช้ score ที่เซิร์ฟเวอร์ตอบกลับมาแสดงผลแทน
  async function finishLiveMatch() {
    if (!liveSession) return;
    try {
      const result = await onlineApi(`/api/matches/${liveSession.matchId}/finish`, {
        method: "POST",
      });
      setLiveSession(null);
      setStatusMsg(`จบแมตช์ ${result.score.homeGoals} - ${result.score.awayGoals} · รอ cron ขึ้นวันถัดไป`);
      if (result.roadmap) setRoadmap(result.roadmap);
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function pullStaffMachine() {
    setStaffPullBusy(true);
    setError("");
    try {
      const res = await onlineApi("/api/clubs/me/staff-machine/pull", { method: "POST" });
      setStaffDraws(res.staffDraws);
      setLastStaffPull(res);
      setStatusMsg(`หยอดตู้ได้ซอง ${res.tier.label}! การ์ด ${res.cards.length} ใบ (${res.source === "free" ? "สิทธิ์ฟรี" : "ใช้เหรียญตู้"})`);
    } catch (e) {
      setError(e.message);
    } finally {
      setStaffPullBusy(false);
    }
  }

  async function roadmapAction(action, payload = {}) {
    setRoadmapBusy(true);
    setError("");
    try {
      const res = await onlineApi("/api/clubs/me/roadmap", {
        method: "POST",
        body: JSON.stringify({ action, ...payload }),
      });
      setRoadmap(res.roadmap);
      setStatusMsg("อัปเดตระบบสโมสรแล้ว");
    } catch (e) {
      setError(e.message);
    } finally {
      setRoadmapBusy(false);
    }
  }

  if (!isGameApiConfigured()) {
    return (
      <div style={{ padding: 24, color: C.textDim, textAlign: "center" }}>
        <p>ยังไม่ได้ตั้งค่า game API — local dev ใช้ <code>VITE_API_URL=http://localhost:3001</code></p>
      </div>
    );
  }

  if (loading && !club) {
    return <p style={{ textAlign: "center", padding: 40, color: C.textDim }}>กำลังโหลดโลกออนไลน์...</p>;
  }

  if (error && !club) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p style={{ color: C.crimson }}>{error}</p>
        {onRetryBoot && (
          <button type="button" onClick={onRetryBoot} style={{ ...btn(C.amber), maxWidth: 200, margin: "12px auto" }}>
            ลองใหม่
          </button>
        )}
        <button type="button" onClick={loadAll} style={{ ...btn(C.steel), maxWidth: 200, margin: "8px auto" }}>
          รีเฟรช
        </button>
      </div>
    );
  }

  if (!club) {
    return <CreateClubForm onCreated={loadAll} />;
  }

  if (liveSession) {
    return (
      <LiveMatchModal
        career={liveSession.career}
        liveMatch={liveSession.liveMatch}
        userAutoMode={liveSession.userAutoMode}
        onFinish={finishLiveMatch}
        suggestTacticSwitch={() => null}
        fullOnlineMode
      />
    );
  }

  const fin = club.finances || {};
  const userFixture = fixtures?.matches?.find(
    (m) => m.homeClubId === club.id || m.awayClubId === club.id,
  );
  const canKickoff = myMatch && !myMatch.played;

  return (
    <div style={{ padding: 16, paddingBottom: 48, maxWidth: 720, margin: "0 auto" }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, color: C.amber }}>{club.name}</h1>
        <p style={{ margin: "4px 0", color: C.textDim, fontSize: 13 }}>
          🌐 Full Online · {club.shard?.name} · ฤดูกาล {club.shard?.seasonNumber} วัน {club.shard?.dayNumber}
          · งบ {formatMoney(club.budget)}
        </p>
        <p style={{ fontSize: 11, color: C.textDim }}>
          v{GAME_VERSION} · ฤดูกาล {MATCH_DAYS_PER_SEASON} นัด จบใน 24 ชม. (~{MINUTES_PER_GAME_DAY} นาที/นัด) · แมตช์สด ไม่ข้าม ไม่เร่ง
        </p>
        {staffDraws && (
          <p style={{ fontSize: 11, color: C.amber, marginTop: 4 }}>
            🎴 เปิดการ์ดวันนี้ {staffDraws.freeLeft}/{staffDraws.dailyLimit ?? DAILY_STAFF_CARD_DRAWS}
            {staffDraws.tickets > 0 ? ` · ตั๋วสำรอง ${staffDraws.tickets}` : ""}
          </p>
        )}
      </header>

      {error && <p style={{ color: C.crimson, fontSize: 13 }}>{error}</p>}
      {statusMsg && <p style={{ color: C.good, fontSize: 12 }}>{statusMsg}</p>}

      <OnlineRoadmapPanel roadmap={roadmap} onAction={roadmapAction} busy={roadmapBusy} />

      {staffDraws && (
        <Panel title="🎰 ตู้หยอดซองการ์ดสตาฟ">
          <p style={{ fontSize: 12, color: C.textDim, marginBottom: 8 }}>
            หยอดฟรีวันนี้ {staffDraws.freeLeft}/{staffDraws.dailyLimit ?? DAILY_STAFF_CARD_DRAWS}
            {staffDraws.tickets > 0 ? ` · เหรียญตู้ ${staffDraws.tickets}` : ""}
          </p>
          <p style={{ fontSize: 10.5, color: C.textDim, marginBottom: 10 }}>
            เกินโควต้าฟรีใช้ "เหรียญตู้" แทน (1 เหรียญ/ครั้ง) — หาเพิ่มได้จาก Battle Pass และจบฤดูกาลอันดับดี
          </p>
          <button
            type="button"
            disabled={staffPullBusy || (staffDraws.freeLeft <= 0 && staffDraws.tickets <= 0)}
            onClick={pullStaffMachine}
            style={btn(staffDraws.freeLeft > 0 || staffDraws.tickets > 0 ? C.amber : C.steel)}
          >
            {staffPullBusy ? "..." : "หยอดตู้"}
          </button>
          {lastStaffPull && (
            <div style={{ marginTop: 10, fontSize: 12 }}>
              <b style={{ color: C.amber }}>ซอง {lastStaffPull.tier.label}</b>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: C.textDim }}>
                {lastStaffPull.cards.map((c) => (
                  <li key={c.cardId}>{c.name} — {c.type === "MANAGER" ? "ผู้จัดการ" : `โค้ช ${c.specialty}`} {"★".repeat(c.stars)}</li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      )}

      <Panel title="แมตช์ของคุณวันนี้">
        {!userFixture && <p style={{ color: C.textDim, fontSize: 13 }}>ไม่มีแมตช์วันนี้</p>}
        {userFixture && (
          <div style={{ fontSize: 14, padding: "8px 0" }}>
            {userFixture.homeClub?.shortCode || "???"} {userFixture.played ? `${userFixture.homeGoals} - ${userFixture.awayGoals}` : "vs"} {userFixture.awayClub?.shortCode || "???"}
            {userFixture.played ? (
              <span style={{ color: C.textDim, fontSize: 12, marginLeft: 8 }}>จบแล้ว — รอวันถัดไป</span>
            ) : (
              <button
                type="button"
                onClick={startLiveMatch}
                disabled={kickoffLoading || !canKickoff}
                style={{ ...btn(C.good), maxWidth: 220, marginTop: 10, fontSize: 13 }}
              >
                {kickoffLoading ? "กำลังเตรียม..." : "⚽ เข้าสู่แมตช์สด"}
              </button>
            )}
          </div>
        )}
      </Panel>

      <Panel title="ผลลีกวันนี้ (บอทแข่งเอง)">
        {!fixtures?.matches?.length && <p style={{ color: C.textDim, fontSize: 13 }}>ไม่มีแมตช์</p>}
        {fixtures?.matches?.map((m) => (
          <div key={m.id} style={{ fontSize: 13, padding: "4px 0", borderBottom: `1px solid ${C.steel}`, color: m.played ? C.chalk : C.textDim }}>
            {m.homeClub.shortCode} {m.played ? `${m.homeGoals} - ${m.awayGoals}` : "vs"} {m.awayClub.shortCode}
            {(m.homeClubId === club.id || m.awayClubId === club.id) ? " ⭐" : ""}
          </div>
        ))}
      </Panel>

      <Panel title="แทคติก">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["4-4-2", "4-3-3", "3-5-2", "5-3-2"].map((f) => (
            <button key={f} type="button" onClick={() => setFormation(f)} style={{
              padding: "8px 12px", borderRadius: 8, cursor: "pointer",
              border: `2px solid ${formation === f ? C.amber : C.steel}`,
              background: formation === f ? "rgba(224,164,88,.12)" : "transparent",
              color: C.chalk, fontSize: 12,
            }}>{f}</button>
          ))}
          <button type="button" onClick={saveTactics} style={{ ...btn(C.good), flex: "none", maxWidth: 120 }}>บันทึก</button>
        </div>
      </Panel>

      <Panel title="ตารางคะแนน">
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: C.textDim, textAlign: "left" }}>
              <th>#</th><th>ทีม</th><th>น</th><th>ช</th><th>+/-</th><th>คะแนน</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => (
              <tr key={row.clubId || row.club?.id} style={{
                background: row.club?.isYou ? "rgba(224,164,88,.1)" : "transparent",
                borderTop: `1px solid ${C.steel}`,
              }}>
                <td>{i + 1}</td>
                <td>{row.club?.name}{row.club?.isBot ? " 🤖" : ""}</td>
                <td>{row.played}</td>
                <td>{row.w}</td>
                <td>{row.gd}</td>
                <td style={{ color: C.amber, fontWeight: 700 }}>{row.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <button type="button" onClick={loadAll} style={{ ...btn(C.steel), maxWidth: 160, marginTop: 8 }}>รีเฟรช</button>

      <p style={{ textAlign: "center", color: C.textDim, fontSize: 11, marginTop: 20 }}>
        Full Online · {getGameApiBase()} · มูลค่าสโมสร {formatMoney(fin.teamValue || 0)}
      </p>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.steel}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
      <h3 style={{ margin: "0 0 10px", color: C.amber, fontSize: 14 }}>{title}</h3>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: 10, marginBottom: 10, borderRadius: 8,
  border: `1px solid ${C.steel}`, background: "#0f2119", color: C.chalk, boxSizing: "border-box",
};

function btn(bg) {
  return {
    display: "block", width: "100%", padding: "12px 0", border: "none", borderRadius: 10,
    background: bg, color: bg === C.amber ? "#08150e" : "#fff", fontWeight: 700, cursor: "pointer",
  };
}
