import React, { useEffect } from "react";

import { GAME_NAME, GAME_TAGLINE, GAME_VERSION } from "@version";

import { BetaHeroCard } from "@beta";
import { useSiteLocale, SiteLangToggle } from "./SiteLocaleContext.jsx";
import { useAccount, accountDisplayLabel } from "./AccountContext.jsx";

import { getLastUsername, hasSaveForUsername } from "./lib/save-keys.js";

import "./AuthRequiredScreen.css";



const LOGO = "/branding/master-logo.png";

const BG = "/branding/login-bg.png";



export default function AuthRequiredScreen() {

  const { user, loading, openAuth } = useAccount();
  const { t } = useSiteLocale();

  const lastUser = getLastUsername();

  const returning = Boolean(lastUser && hasSaveForUsername(lastUser));



  useEffect(() => {

    if (!loading && !user) {

      openAuth(!returning);

    }

  }, [loading, user, returning, openAuth]);



  if (loading) {

    return (

      <div className="auth-gate">

        <div className="auth-gate-inner">

          <p className="auth-gate-loading">{t("auth.loading")}</p>

        </div>

      </div>

    );

  }



  if (user) return null;



  return (

    <div className="auth-gate">

      <div className="auth-gate-bg" style={{ backgroundImage: `url(${BG})` }} aria-hidden />

      <div className="auth-gate-inner">

        <div className="auth-gate-lang-row">

          <SiteLangToggle />

        </div>

        <BetaHeroCard compact onDiscord />

        <img src={LOGO} alt={GAME_NAME} className="auth-gate-logo" />

        <h1 className="auth-gate-title">

          {returning ? t("auth.titleReturn") : t("auth.titleNew")}

        </h1>

        <p className="auth-gate-tagline">{GAME_TAGLINE}</p>

        <p className="auth-gate-desc">

          {returning ? (

            <>

              {t("auth.returnDesc1", { user: lastUser })}

              <br />

              {t("auth.returnDesc2")}

            </>

          ) : (

            <>

              {t("auth.newDesc1")}

              <br />

              {t("auth.newDesc2")}

            </>

          )}

        </p>

        <div className="auth-gate-actions">

          {returning ? (

            <>

              <button type="button" className="auth-gate-btn auth-gate-btn--primary" onClick={() => openAuth(false)}>

                {t("auth.loginAs", { user: lastUser })}

              </button>

              <button type="button" className="auth-gate-btn auth-gate-btn--ghost" onClick={() => openAuth(true)}>

                {t("auth.signupNew")}

              </button>

            </>

          ) : (

            <>

              <button type="button" className="auth-gate-btn auth-gate-btn--primary" onClick={() => openAuth(true)}>

                {t("auth.signupFree")}

              </button>

              <button type="button" className="auth-gate-btn auth-gate-btn--ghost" onClick={() => openAuth(false)}>

                {t("auth.login")}

              </button>

            </>

          )}

        </div>

        <a href="/" className="auth-gate-home">{t("auth.home")}</a>

        <p className="auth-gate-ver">{t("auth.ver", { ver: GAME_VERSION })}</p>

      </div>

    </div>

  );

}



/** แสดงชื่อผู้เล่นที่ล็อกอินแล้ว (ใช้ใน header เกม) */

export function AuthUserChip({ user }) {

  if (!user) return null;

  return (

    <span className="auth-user-chip" title={accountDisplayLabel(user)}>

      @{user.username || accountDisplayLabel(user)}

    </span>

  );

}
