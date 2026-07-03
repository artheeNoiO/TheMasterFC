import "./lib/storage-shim.js";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import ShellApp from "./ShellApp.jsx";
import LandingPage from "./LandingPage.jsx";
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
      return (
        <div style={{ minHeight: "100vh", background: "#0b2318", color: "#f2f0e6", padding: 24, fontFamily: "Segoe UI, sans-serif" }}>
          <h1 style={{ color: "#e0a458" }}>⚽ เกมโหลดไม่สำเร็จ</h1>
          <p style={{ color: "#a9bdb1", lineHeight: 1.6 }}>
            ลองปิดหน้าต่าง Server เก่า แล้วดับเบิลคลิก <b>Play-Game.bat</b> อีกครั้ง
            <br />หรือเปิด <a href="/play" style={{ color: "#e0a458" }}>/play</a>
          </p>
          <pre style={{ fontSize: 11, color: "#c1440e", overflow: "auto", marginTop: 16 }}>{String(this.state.error?.message || this.state.error)}</pre>
          <button
            type="button"
            onClick={() => { localStorage.removeItem("siam_play_mode"); window.location.href = "/play"; }}
            style={{ marginTop: 16, padding: "12px 20px", background: "#e0a458", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}
          >
            รีเซ็ตและลองใหม่
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRouter() {
  const [route, setRoute] = useState(currentRoute);

  useEffect(() => {
    const sync = () => setRoute(currentRoute());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const goPlay = () => {
    window.history.pushState({}, "", "/play");
    setRoute("play");
    document.title = `${GAME_NAME} — เล่น`;
  };

  if (route === "play") {
    return <ShellApp />;
  }
  return <LandingPage onPlay={goPlay} />;
}

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <AppRouter />
  </ErrorBoundary>,
);
