import "./lib/storage-shim.js";

import React, { useEffect, useState } from "react";

import { createRoot } from "react-dom/client";

import ShellApp from "./ShellApp.jsx";

import LandingPage from "./LandingPage.jsx";

import { AccountProvider, useAccount } from "./AccountContext.jsx";

import { SiteLocaleProvider, useSiteLocale } from "./SiteLocaleContext.jsx";

import { GAME_NAME } from "@version";

import "./index.css";



function currentRoute() {

  const p = window.location.pathname.replace(/\/+$/, "") || "/";

  return p === "/play" ? "play" : "home";

}



class ErrorBoundary extends React.Component {

  constructor(props) {

    super(props);

    this.state = { error: null };

  }

  static getDerivedStateFromError(error) {

    return { error };

  }

  render() {

    if (this.state.error) {

      return <ErrorFallback error={this.state.error} />;

    }

    return this.props.children;

  }

}



function ErrorFallback({ error }) {
  const { t } = useSiteLocale();
  return (
    <div style={{ minHeight: "100vh", background: "#0b2318", color: "#f2f0e6", padding: 24, fontFamily: "Segoe UI, sans-serif" }}>
      <h1 style={{ color: "#e0a458" }}>⚽ {t("error.title")}</h1>
      <p style={{ color: "#a9bdb1", lineHeight: 1.6 }}>
        {t("error.hint")}{" "}
        <a href="/play" style={{ color: "#e0a458" }}>/play</a>
      </p>

      <pre style={{ fontSize: 11, color: "#c1440e", overflow: "auto", marginTop: 16 }}>{String(error?.message || error)}</pre>

      <button

        type="button"

        onClick={() => { localStorage.removeItem("siam_play_mode"); window.location.href = "/play"; }}

        style={{ marginTop: 16, padding: "12px 20px", background: "#e0a458", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}

      >

        {t("error.reset")}

      </button>

    </div>

  );

}



function AppRouter() {

  const { user, openAuth } = useAccount();

  const { t } = useSiteLocale();

  const [route, setRoute] = useState(currentRoute);



  useEffect(() => {

    const sync = () => setRoute(currentRoute());

    window.addEventListener("popstate", sync);

    return () => window.removeEventListener("popstate", sync);

  }, []);



  const goPlay = () => {

    const enter = () => {

      window.history.pushState({}, "", "/play");

      setRoute("play");

      document.title = `${GAME_NAME} — ${t("title.play")}`;

    };

    if (!user) {

      openAuth(true, enter);

      return;

    }

    enter();

  };



  if (route === "play") {

    return <ShellApp />;

  }

  return <LandingPage onPlay={goPlay} />;

}



createRoot(document.getElementById("root")).render(
  <SiteLocaleProvider>
    <ErrorBoundary>
      <AccountProvider>
        <AppRouter />
      </AccountProvider>
    </ErrorBoundary>
  </SiteLocaleProvider>,
);

