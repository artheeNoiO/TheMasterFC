import React from "react";
import { BETA_TEST, GAME_VERSION, GAME_DISCORD_URL, GAME_DISCORD_LABEL } from "@version";
import { useSiteLocale } from "./SiteLocaleContext.jsx";
import { getBetaCopy } from "./site-i18n.js";

/** แถบประกาศ Beta ด้านบน (ทุกหน้า) */
export function BetaStrip({ className = "" }) {
  const { lang, t } = useSiteLocale();
  if (!BETA_TEST) return null;
  const beta = getBetaCopy(lang);
  return (
    <div className={`fc-beta-strip ${className}`.trim()} role="status" aria-live="polite">
      <span className="fc-beta-strip-badge">{beta.label}</span>
      <span className="fc-beta-strip-title">{beta.headline}</span>
      <span className="fc-beta-strip-msg">{beta.message}</span>
      <span className="fc-beta-strip-reward">🏆 {beta.masterRewardShort}</span>
      <span className="fc-beta-strip-ver">v{GAME_VERSION}</span>
    </div>
  );
}

/** การ์ดประกาศ Beta หน้า Landing / Auth */
export function BetaHeroCard({ onDiscord, compact = false }) {
  const { lang, t } = useSiteLocale();
  if (!BETA_TEST) return null;
  const beta = getBetaCopy(lang);
  return (
    <section className={`fc-beta-hero ${compact ? "fc-beta-hero--compact" : ""}`} aria-label={t("beta.aria")}>
      <div className="fc-beta-hero-badge">{beta.label}</div>
      <h2 className="fc-beta-hero-title">{beta.headline}</h2>
      <p className="fc-beta-hero-msg">{beta.message}</p>
      <p className="fc-beta-hero-reward">
        <span className="fc-beta-hero-reward-icon" aria-hidden>🏆</span>
        {compact ? beta.masterRewardShort : beta.masterReward}
      </p>
      {!compact && <p className="fc-beta-hero-perks">{beta.perks}</p>}
      {onDiscord && (
        <a
          href={GAME_DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="fc-beta-hero-discord"
        >
          {t("beta.discordCta", { label: GAME_DISCORD_LABEL })}
        </a>
      )}
    </section>
  );
}

export default BetaStrip;
