const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function setToken(token) {
  if (token) localStorage.setItem("siam_token", token);
  else localStorage.removeItem("siam_token");
}

export function getToken() {
  return localStorage.getItem("siam_token");
}

export async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}
