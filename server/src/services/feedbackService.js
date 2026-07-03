import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const DATA_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../data/feedback.json");

async function loadStore() {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      votes: parsed.votes && typeof parsed.votes === "object" ? parsed.votes : {},
    };
  } catch {
    return { entries: [], votes: {} };
  }
}

async function saveStore(store) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf8");
}

function voteKey(entryId, voterKey) {
  return `${entryId}:${voterKey}`;
}

function serializeEntry(entry, store, voterKey) {
  const vk = voterKey ? store.votes[voteKey(entry.id, voterKey)] || 0 : 0;
  return {
    id: entry.id,
    author: entry.author,
    body: entry.body,
    likes: entry.likes || 0,
    dislikes: entry.dislikes || 0,
    createdAt: entry.createdAt,
    myVote: vk,
  };
}

export async function listFeedback(voterKey = "") {
  const store = await loadStore();
  const entries = [...store.entries]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 100)
    .map((e) => serializeEntry(e, store, voterKey));
  return entries;
}

export async function createFeedback({ author, body }) {
  const trimmed = String(body || "").trim();
  if (!trimmed) throw new Error("ต้องมีข้อความ feedback");
  if (trimmed.length > 500) throw new Error("ข้อความยาวเกิน 500 ตัวอักษร");

  const store = await loadStore();
  const entry = {
    id: crypto.randomUUID(),
    author: String(author || "ผู้เล่น").trim().slice(0, 40) || "ผู้เล่น",
    body: trimmed,
    likes: 0,
    dislikes: 0,
    createdAt: new Date().toISOString(),
  };
  store.entries.push(entry);
  if (store.entries.length > 500) store.entries = store.entries.slice(-500);
  await saveStore(store);
  return entry;
}

export async function voteFeedback(entryId, voterKey, vote) {
  if (!voterKey || typeof voterKey !== "string") throw new Error("ต้องมี voterKey");
  const store = await loadStore();
  const idx = store.entries.findIndex((e) => e.id === entryId);
  if (idx < 0) throw new Error("ไม่พบ feedback");

  const key = voteKey(entryId, voterKey.slice(0, 64));
  const prev = store.votes[key] || 0;
  const next = vote === "like" ? 1 : vote === "dislike" ? -1 : 0;

  const entry = { ...store.entries[idx] };
  if (prev === 1) entry.likes = Math.max(0, (entry.likes || 0) - 1);
  if (prev === -1) entry.dislikes = Math.max(0, (entry.dislikes || 0) - 1);
  if (next === 1) entry.likes = (entry.likes || 0) + 1;
  if (next === -1) entry.dislikes = (entry.dislikes || 0) + 1;

  if (next === 0) delete store.votes[key];
  else store.votes[key] = next;

  store.entries[idx] = entry;
  await saveStore(store);
  return serializeEntry(entry, store, voterKey);
}
