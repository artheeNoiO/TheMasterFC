import React, { useEffect, useMemo, useState } from "react";
import {
  GAME_NAME, GAME_NAME_SHORT, GAME_SITE_URL, GAME_TAGLINE, GAME_VERSION,
  GAME_DONATE_URL, GAME_DONATE_LABEL, BETA_TEST, GAME_DISCORD_URL,
} from "@version";
import { BetaStrip, BetaHeroCard } from "@beta";
import "./LandingPage.css";
import FeedbackBoard from "@feedback";
import { useAccount, accountDisplayLabel } from "./AccountContext.jsx";
import { SiteLangToggle, useSiteLocale } from "./SiteLocaleContext.jsx";
import {
  getLandingNav,
  getLandingStats,
  getLandingFeatures,
  getLandingSystems,
  getLandingRoadmap,
  getWorldCupPhases,
  WORLD_CUP_EVENT_NAME,
  WORLD_CUP_INTERVAL_MONTHS,
  WORLD_CUP_REAL_DURATION_DAYS,
  WORLD_CUP_REGISTRATION_DAYS,
  WORLD_CUP_NOMINEES_MAX,
  MASTER_COIN_LABEL,
  GAME_DISCORD_LABEL,
} from "./site-i18n.js";

const LOGO = "/branding/master-logo.png";
const BG = "/branding/login-bg.png";

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function OnlineCountBadge() {
  const { t } = useSiteLocale();
  const [online, setOnline] = useState(null);
  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await fetch("/api/online-count");
        if (!res.ok) return;
        const data = await res.json();
        if (alive && typeof data.online === "number") setOnline(data.online);
      } catch {
        /* silent */
      }
    }
    poll();
    const iv = setInterval(poll, 45000);
    return () => { alive = false; clearInterval(iv); };
  }, []);
  if (online == null) return null;
  return (
    <div className="landing-online-badge">
      <span className="landing-online-badge-dot" aria-hidden />
      {t("hero.onlineCount", { n: online })}
    </div>
  );
}

export default function LandingPage({ onPlay }) {
  const { user, openAuth, logout } = useAccount();
  const { lang, t } = useSiteLocale();

  const nav = useMemo(() => getLandingNav(lang), [lang]);
  const stats = useMemo(() => getLandingStats(lang), [lang]);
  const features = useMemo(() => getLandingFeatures(lang), [lang]);
  const systems = useMemo(() => getLandingSystems(lang), [lang]);
  const roadmap = useMemo(() => getLandingRoadmap(lang), [lang]);
  const wcPhases = useMemo(() => getWorldCupPhases(lang), [lang]);
  const heroSubLines = t("hero.sub").split("\n");

  function handleLogout() {
    if (!window.confirm(t("confirm.logout"))) return;
    logout();
  }

  useEffect(() => {
    document.title = BETA_TEST
      ? t("title.home", { name: GAME_NAME, suffix: t("title.beta") })
      : t("title.home", { name: GAME_NAME, suffix: GAME_TAGLINE });
    document.body.style.background = "#050608";
    return () => {
      document.body.style.background = "";
    };
  }, [t]);

  const displayUser = user?.username || accountDisplayLabel(user);

  return (
    <div className="landing-root">
      <BetaStrip />
      <div className="landing-bg" style={{ backgroundImage: `url(${BG})` }} aria-hidden />
      <div className="landing-noise" aria-hidden />

      <header className="landing-nav">
        <span className="landing-nav-brand">{GAME_NAME_SHORT}</span>
        <nav className="landing-nav-links" aria-label="Sections">
          {nav.map((n) => (
            <button key={n.id} type="button" className="landing-nav-link" onClick={() => scrollTo(n.id)}>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="landing-nav-actions">
          <SiteLangToggle className="landing-nav-lang" />
          {user ? (
            <>
              <span className="landing-nav-user" title={accountDisplayLabel(user)}>
                ✓ @{displayUser}
              </span>
              <button type="button" className="landing-nav-logout" onClick={handleLogout}>
                {t("nav.logout")}
              </button>
              <button type="button" className="landing-nav-cta" onClick={onPlay}>
                {t("nav.startGame")}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="landing-nav-auth" onClick={() => openAuth(false, onPlay)}>
                {t("nav.login")}
              </button>
              <button type="button" className="landing-nav-cta landing-nav-cta--signup" onClick={() => openAuth(true, onPlay)}>
                {t("nav.signupFree")}
              </button>
            </>
          )}
        </div>
      </header>

      <a
        href={GAME_DISCORD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="landing-discord-float"
        title={t("hero.discordHint")}
      >
        <span aria-hidden>💬</span>
        Discord
      </a>

      <main className="landing-hero">
        <div className="landing-hero-inner">
          <span className="landing-eyebrow">
            {BETA_TEST ? t("hero.eyebrowBeta") : t("hero.eyebrow")}
          </span>
          <OnlineCountBadge />
          <BetaHeroCard onDiscord />
          <div className="landing-logo-wrap">
            <img src={LOGO} alt={GAME_NAME} className="landing-hero-logo" />
          </div>
          <h1 className="landing-title">{t("hero.title")}</h1>
          <p className="landing-tagline">{GAME_TAGLINE}</p>
          <p className="landing-sub">
            {heroSubLines.map((line, i) => (
              <React.Fragment key={line}>
                {i > 0 && <br />}
                {line}
              </React.Fragment>
            ))}
          </p>

          <div className="landing-actions">
            {user ? (
              <button type="button" className="landing-btn-primary" onClick={onPlay}>
                {t("hero.startGame", { user: displayUser })}
              </button>
            ) : (
              <>
                <button type="button" className="landing-btn-signup" onClick={() => openAuth(true, onPlay)}>
                  {t("hero.signupToPlay")}
                </button>
                <button type="button" className="landing-btn-secondary" onClick={() => openAuth(false, onPlay)}>
                  {t("nav.login")}
                </button>
              </>
            )}
            <button type="button" className="landing-btn-secondary" onClick={() => scrollTo("systems")}>
              {t("hero.howItWorks")}
            </button>
          </div>
          <p className="landing-hint">
            {user ? t("hero.hintReady") : t("hero.hintNeedAccount")}
          </p>

          <div className="landing-hero-discord">
            <p>{t("hero.discordHint")}</p>
            <a href={GAME_DISCORD_URL} target="_blank" rel="noopener noreferrer" className="landing-discord-btn landing-discord-btn--hero">
              {GAME_DISCORD_LABEL}
            </a>
          </div>
        </div>
      </main>

      <div className="landing-stats">
        {stats.map((s) => (
          <div key={s.label} className="landing-stat">
            <div className="landing-stat-value">{s.value}</div>
            <div className="landing-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="landing-section" id="features">
        <div className="landing-section-head">
          <h2>{t("features.title")}</h2>
          <p>{t("features.sub")}</p>
        </div>
        <div className="landing-features-grid">
          {features.map((f) => (
            <article key={f.title} className="landing-feature-card">
              <span className="landing-feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-systems" id="systems">
        <div className="landing-section-head">
          <h2>{t("systems.title")}</h2>
          <p>{t("systems.sub", { short: GAME_NAME_SHORT })}</p>
        </div>
        <div className="landing-systems-grid">
          {systems.map((sys) => (
            <article key={sys.title} className="landing-system-card">
              <h3>{sys.title}</h3>
              <ol>
                {sys.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-worldcup" id="worldcup">
        <div className="landing-section-head">
          <span className="landing-worldcup-soon-badge">{t("worldcup.badge")}</span>
          <h2>{WORLD_CUP_EVENT_NAME}</h2>
          <p>
            {t("worldcup.sub", {
              months: WORLD_CUP_INTERVAL_MONTHS,
              days: WORLD_CUP_REAL_DURATION_DAYS,
            })}
          </p>
        </div>

        <div className="landing-worldcup-meta">
          <div className="landing-worldcup-pill">
            <span className="landing-worldcup-pill-label">{t("worldcup.regLabel")}</span>
            <span>{t("worldcup.regValue", { days: WORLD_CUP_REGISTRATION_DAYS })}</span>
          </div>
          <div className="landing-worldcup-pill">
            <span className="landing-worldcup-pill-label">{t("worldcup.nomLabel")}</span>
            <span>{t("worldcup.nomValue", { max: WORLD_CUP_NOMINEES_MAX })}</span>
          </div>
          <div className="landing-worldcup-pill">
            <span className="landing-worldcup-pill-label">{t("worldcup.pickLabel")}</span>
            <span>{t("worldcup.pickValue", { coin: MASTER_COIN_LABEL })}</span>
          </div>
          <div className="landing-worldcup-pill">
            <span className="landing-worldcup-pill-label">{t("worldcup.betLabel")}</span>
            <span>{t("worldcup.betValue", { coin: MASTER_COIN_LABEL })}</span>
          </div>
        </div>

        <div className="landing-worldcup-phases">
          {wcPhases.map((phase, i) => (
            <article key={phase.id} className="landing-worldcup-phase">
              <div className="landing-worldcup-phase-num">{i + 1}</div>
              <div>
                <h3>{phase.title}</h3>
                <p className="landing-worldcup-phase-when">{phase.duration}</p>
                <p className="landing-worldcup-phase-desc">{phase.desc}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="landing-worldcup-note">
          {t("worldcup.note", { coin: MASTER_COIN_LABEL })}
        </div>
      </section>

      <section className="landing-section landing-roadmap" id="roadmap">
        <div className="landing-section-head">
          <h2>{t("roadmap.title")}</h2>
          <p>{t("roadmap.sub")}</p>
        </div>
        <div className="landing-roadmap-grid">
          {roadmap.map((col) => (
            <article key={col.label} className={`landing-roadmap-col landing-roadmap-${col.status}`}>
              <h3>{col.label}</h3>
              <ul>
                {col.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-feedback-section" id="feedback">
        <div className="landing-section-head">
          <h2>{t("feedback.title")}</h2>
          <p>{t("feedback.sub")}</p>
        </div>
        <div className="landing-feedback-wrap">
          <FeedbackBoard variant="landing" />
        </div>
      </section>

      <section className="landing-section landing-donate" id="donate">
        <div className="landing-donate-inner">
          <div className="landing-section-head">
            <h2>{t("donate.title", { short: GAME_NAME_SHORT })}</h2>
            <p>{t("donate.sub")}</p>
          </div>
          <p className="landing-donate-text">{t("donate.text")}</p>
          {GAME_DONATE_URL ? (
            <a
              href={GAME_DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-btn-primary landing-donate-btn"
            >
              {GAME_DONATE_LABEL}
            </a>
          ) : (
            <div className="landing-donate-soon">
              <span className="landing-donate-badge">{t("donate.soonBadge")}</span>
              <p>{t("donate.soonText")}</p>
              {user ? (
                <button type="button" className="landing-btn-secondary" onClick={onPlay}>
                  {t("nav.startGame")}
                </button>
              ) : (
                <button type="button" className="landing-btn-signup" onClick={() => openAuth(true, onPlay)}>
                  {t("donate.signupPlay")}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <footer className="landing-footer">
        <p className="landing-footer-brand">{GAME_NAME}</p>
        <nav className="landing-footer-nav">
          {nav.map((n) => (
            <button key={n.id} type="button" onClick={() => scrollTo(n.id)}>
              {n.label}
            </button>
          ))}
        </nav>
        <p>
          <a href={GAME_SITE_URL}>{GAME_SITE_URL.replace("https://", "")}</a>
          {" · "}
          {user ? (
            <button type="button" className="landing-footer-play" onClick={onPlay}>{t("footer.play")}</button>
          ) : (
            <button type="button" className="landing-footer-play" onClick={() => openAuth(true, onPlay)}>{t("footer.signup")}</button>
          )}
          {" · "}
          <a href={GAME_DISCORD_URL} target="_blank" rel="noopener noreferrer">{t("footer.discord")}</a>
        </p>
        <p className="landing-footer-ver">v{GAME_VERSION} · © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
