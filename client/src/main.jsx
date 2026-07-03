import "./lib/storage-shim.js";
import React from "react";
import { createRoot } from "react-dom/client";
import ShellApp from "./ShellApp.jsx";
import "./index.css";

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
            <br />หรือเปิด <a href="http://localhost:5173" style={{ color: "#e0a458" }}>http://localhost:5173</a>
          </p>
          <pre style={{ fontSize: 11, color: "#c1440e", overflow: "auto", marginTop: 16 }}>{String(this.state.error?.message || this.state.error)}</pre>
          <button
            type="button"
            onClick={() => { localStorage.removeItem("siam_play_mode"); window.location.reload(); }}
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

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <ShellApp />
  </ErrorBoundary>,
);
