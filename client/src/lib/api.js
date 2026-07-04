import { GAME_API_URL } from "@version";

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** โฮสต์ที่ใช้ Cloudflare Pages Functions สำหรับ /api/* (auth, heartbeat, online-count) */
function isSameOriginApiHost(hostname) {
  if (!hostname) return false;
  return (
    hostname.endsWith("themasterfc.com")
    || hostname.endsWith(".pages.dev")
    || hostname.endsWith(".cloudflarepages.com")
  );
}

export function getApiBase() {
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (isLocalHost(hostname)) {
      const local = import.meta.env.VITE_API_URL;
      return (local || "http://localhost:3001").replace(/\/$/, "");
    }
    if (protocol.startsWith("http") && isSameOriginApiHost(hostname)) {
      return "";
    }
  }
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return String(envUrl).replace(/\/$/, "");
  return GAME_API_URL.replace(/\/$/, "");
}

export function setToken(token) {
  if (token) localStorage.setItem("siam_token", token);
  else localStorage.removeItem("siam_token");
}

export function getToken() {
  return localStorage.getItem("siam_token");
}

export async function api(path, options = {}) {
  const base = getApiBase();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}
