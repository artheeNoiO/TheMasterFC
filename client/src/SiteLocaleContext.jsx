import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  detectSiteLang,
  guessSiteLangSync,
  normalizeSiteLang,
  setStoredSiteLang,
} from "./lib/site-locale.js";
import { siteT } from "./site-i18n.js";

const SiteLocaleContext = createContext(null);

export function SiteLocaleProvider({ children }) {
  const [lang, setLangState] = useState(guessSiteLangSync);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    detectSiteLang().then((detected) => {
      if (!alive) return;
      const next = normalizeSiteLang(detected);
      setLangState(next);
      document.documentElement.lang = next === "th" ? "th" : "en";
      setReady(true);
    });
    return () => { alive = false; };
  }, []);

  const setLang = useCallback((next) => {
    const v = normalizeSiteLang(next);
    setStoredSiteLang(v);
    setLangState(v);
    document.documentElement.lang = v === "th" ? "th" : "en";
  }, []);

  const t = useCallback((key, vars) => siteT(lang, key, vars), [lang]);

  const value = useMemo(
    () => ({ lang, setLang, ready, t }),
    [lang, setLang, ready, t],
  );

  return (
    <SiteLocaleContext.Provider value={value}>
      {children}
    </SiteLocaleContext.Provider>
  );
}

export function useSiteLocale() {
  const ctx = useContext(SiteLocaleContext);
  if (!ctx) throw new Error("useSiteLocale must be used within SiteLocaleProvider");
  return ctx;
}

/** Language toggle — EN | ไทย */
export function SiteLangToggle({ className = "" }) {
  const { lang, setLang } = useSiteLocale();
  return (
    <div className={`site-lang-toggle ${className}`.trim()} role="group" aria-label="Language">
      <button
        type="button"
        className={`site-lang-toggle-btn ${lang === "en" ? "site-lang-toggle-btn--active" : ""}`}
        onClick={() => setLang("en")}
      >
        EN
      </button>
      <button
        type="button"
        className={`site-lang-toggle-btn ${lang === "th" ? "site-lang-toggle-btn--active" : ""}`}
        onClick={() => setLang("th")}
      >
        ไทย
      </button>
    </div>
  );
}
