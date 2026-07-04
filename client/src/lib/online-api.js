import { GAME_API_URL } from "@version";

const ONLINE_TOKEN_KEY = "siam_online_token";

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** Base URL ของ game API (Express/Render) — แยกจาก auth บน Cloudflare */
export function getGameApiBase() {
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (isLocalHost(hostname)) {
      const local = import.meta.env.VITE_GAME_API_URL || import.meta.env.VITE_API_URL;
      return (local || "http://localhost:3001").replace(/\/$/, "");
    }
  }
  const envUrl = import.meta.env.VITE_GAME_API_URL || import.meta.env.VITE_API_URL;
  if (envUrl) return String(envUrl).replace(/\/$/, "");
  return GAME_API_URL.replace(/\/$/, "");
}

export function getOnlineToken() {
  return localStorage.getItem(ONLINE_TOKEN_KEY);
}

export function setOnlineToken(token) {
  if (token) localStorage.setItem(ONLINE_TOKEN_KEY, token);
  else localStorage.removeItem(ONLINE_TOKEN_KEY);
}

export function clearOnlineToken() {
  localStorage.removeItem(ONLINE_TOKEN_KEY);
}

export async function onlineApi(path, options = {}) {
  const base = getGameApiBase();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getOnlineToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export function isGameApiConfigured() {
  if (typeof window === "undefined") return false;
  if (isLocalHost(window.location.hostname)) return true;
  if (import.meta.env.VITE_GAME_API_URL || import.meta.env.VITE_API_URL) return true;
  return Boolean(GAME_API_URL);
}
