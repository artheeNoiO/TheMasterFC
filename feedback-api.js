/**
 * Public feedback board API helpers (landing + in-game).
 */
import { GAME_API_URL } from "./game-version.js";

const VOTER_KEY = "tmfc-feedback-voter";
const LOCAL_KEY = "tmfc-feedback-local";

export function getFeedbackVoterKey() {
  if (typeof localStorage === "undefined") return "anon";
  let v = localStorage.getItem(VOTER_KEY);
  if (!v) {
    v = `v_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem(VOTER_KEY, v);
  }
  return v;
}

export function getFeedbackApiBase() {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) {
    return String(import.meta.env.VITE_API_URL).replace(/\/$/, "");
  }
  return GAME_API_URL.replace(/\/$/, "");
}

function readLocalEntries() {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalEntries(entries) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(entries.slice(0, 50)));
}

async function feedbackFetch(path, options = {}) {
  const base = getFeedbackApiBase();
  const res = await fetch(`${base}/api/feedback${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText || "Request failed");
  return data;
}

export async function fetchFeedbackPosts() {
  const voterKey = getFeedbackVoterKey();
  try {
    const data = await feedbackFetch(`?voterKey=${encodeURIComponent(voterKey)}`);
    return { entries: data.entries || [], source: "api" };
  } catch {
    const entries = readLocalEntries().map((e) => ({
      ...e,
      myVote: e.myVote || 0,
      local: true,
    }));
    return { entries, source: "local" };
  }
}

export async function postFeedback({ author, body }) {
  const voterKey = getFeedbackVoterKey();
  const trimmed = String(body || "").trim();
  if (!trimmed) throw new Error("กรุณาเขียนความคิดเห็น");
  try {
    const data = await feedbackFetch("", {
      method: "POST",
      body: JSON.stringify({ author: author?.trim() || "ผู้เล่น", body: trimmed, voterKey }),
    });
    return { entry: data.entry, source: "api" };
  } catch (err) {
    const entry = {
      id: `local_${Date.now()}`,
      author: String(author || "ผู้เล่น").slice(0, 40),
      body: trimmed.slice(0, 500),
      likes: 0,
      dislikes: 0,
      myVote: 0,
      createdAt: new Date().toISOString(),
      local: true,
    };
    writeLocalEntries([entry, ...readLocalEntries()]);
    throw new Error(`${err.message} — บันทึกไว้ในเครื่องนี้แล้ว แนะนำแชร์ใน Discord ด้วย`);
  }
}

export async function voteFeedback(entryId, vote) {
  const voterKey = getFeedbackVoterKey();
  try {
    const data = await feedbackFetch(`/${encodeURIComponent(entryId)}/vote`, {
      method: "POST",
      body: JSON.stringify({ voterKey, vote }),
    });
    return data.entry;
  } catch {
    const entries = readLocalEntries();
    const idx = entries.findIndex((e) => e.id === entryId);
    if (idx < 0) throw new Error("ไม่พบความคิดเห็น");
    const e = { ...entries[idx] };
    const prev = e.myVote || 0;
    const next = vote === "like" ? 1 : vote === "dislike" ? -1 : 0;
    if (prev === 1) e.likes = Math.max(0, (e.likes || 0) - 1);
    if (prev === -1) e.dislikes = Math.max(0, (e.dislikes || 0) - 1);
    if (next === 1) e.likes = (e.likes || 0) + 1;
    if (next === -1) e.dislikes = (e.dislikes || 0) + 1;
    e.myVote = next;
    entries[idx] = e;
    writeLocalEntries(entries);
    return e;
  }
}

export function voteFeedbackLocalOnly(entryId, vote) {
  const entries = readLocalEntries();
  const idx = entries.findIndex((e) => e.id === entryId);
  if (idx < 0) return null;
  const e = { ...entries[idx] };
  const prev = e.myVote || 0;
  const next = vote === "like" ? 1 : vote === "dislike" ? -1 : 0;
  if (prev === 1) e.likes = Math.max(0, (e.likes || 0) - 1);
  if (prev === -1) e.dislikes = Math.max(0, (e.dislikes || 0) - 1);
  if (next === 1) e.likes = (e.likes || 0) + 1;
  if (next === -1) e.dislikes = (e.dislikes || 0) + 1;
  e.myVote = next;
  entries[idx] = e;
  writeLocalEntries(entries);
  return e;
}
