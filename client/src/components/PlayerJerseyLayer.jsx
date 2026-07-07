import React from "react";

/** เสื้อบอล SVG ทับใต้คอ — สีจากทีม (แปะทีหลัง) */
export default function PlayerJerseyLayer({ shirt, shorts, trim, className, style }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 120"
      preserveAspectRatio="none"
      style={{ display: "block", width: "100%", height: "100%", ...style }}
      aria-hidden
    >
      <defs>
        <linearGradient id="jerseyShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
        </linearGradient>
      </defs>
      {/* ไหล่ + อก */}
      <path
        d="M0 18 L28 0 L72 8 L100 4 L128 8 L172 0 L200 18 L200 120 L0 120 Z"
        fill={shirt}
      />
      <path
        d="M0 18 L28 0 L72 8 L100 4 L128 8 L172 0 L200 18 L200 120 L0 120 Z"
        fill="url(#jerseyShade)"
      />
      {/* คอ */}
      <path
        d="M78 8 Q100 22 122 8 L118 18 Q100 28 82 18 Z"
        fill={trim || "#1a1a1a"}
        opacity="0.95"
      />
      {/* แขน */}
      <path d="M0 22 L28 8 L32 48 L0 58 Z" fill={shirt} stroke={trim} strokeWidth="1.5" opacity="0.95" />
      <path d="M200 22 L172 8 L168 48 L200 58 Z" fill={shirt} stroke={trim} strokeWidth="1.5" opacity="0.95" />
      {/* กางเกงเบาๆ ล่างสุด */}
      <rect x="0" y="98" width="200" height="22" fill={shorts || "#1a1a1a"} />
      <line x1="0" y1="98" x2="200" y2="98" stroke={trim} strokeWidth="2" opacity="0.6" />
    </svg>
  );
}
