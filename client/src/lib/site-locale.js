/** Site language preference — EN default, TH for Thailand visitors */

export const SITE_LANG_KEY = "tmfc_site_lang";

export function normalizeSiteLang(v) {
  return v === "th" ? "th" : "en";
}

export function getStoredSiteLang() {
  try {
    const v = localStorage.getItem(SITE_LANG_KEY);
    if (v === "th" || v === "en") return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function setStoredSiteLang(lang) {
  try {
    localStorage.setItem(SITE_LANG_KEY, normalizeSiteLang(lang));
  } catch {
    /* ignore */
  }
}

export function isThDomain() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host.endsWith(".th") || host === "th";
}

export function browserPrefersThai() {
  if (typeof navigator === "undefined") return false;
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  return langs.some((l) => String(l || "").toLowerCase().startsWith("th"));
}

/** Sync guess before async geo — avoids EN flash for obvious Thai cases */
export function guessSiteLangSync() {
  const stored = getStoredSiteLang();
  if (stored) return stored;
  if (isThDomain()) return "th";
  if (browserPrefersThai()) return "th";
  return "en";
}

/** Default in-game uiLang for new profiles (follows site locale) */
export function getDefaultGameUiLang() {
  return guessSiteLangSync();
}

export async function detectSiteLang() {
  const stored = getStoredSiteLang();
  if (stored) return stored;

  if (isThDomain()) return "th";

  try {
    const res = await fetch("/api/locale", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.lang === "th" || data.lang === "en") return data.lang;
    }
  } catch {
    /* offline / local dev */
  }

  if (browserPrefersThai()) return "th";
  return "en";
}
