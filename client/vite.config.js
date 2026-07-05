import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    fs: { allow: [path.resolve(root, "..")] },
  },
  resolve: {
    alias: {
      "@game": path.resolve(root, "../football-manager.jsx"),
      "@legend": path.resolve(root, "../legend-universe.js"),
      "@stars": path.resolve(root, "../player-stars.js"),
      "@version": path.resolve(root, "../game-version.js"),
      "@crowd": path.resolve(root, "../stadium-crowd.js"),
      "@tracker": path.resolve(root, "../tracker-pitch.jsx"),
      "@worldcup": path.resolve(root, "../world-cup-event.js"),
      "@roadmap": path.resolve(root, "../features-roadmap.js"),
      "@roadmapfx": path.resolve(root, "../roadmap-features.js"),
      "@nat": path.resolve(root, "../player-nationalities.js"),
      "@i18n": path.resolve(root, "../game-i18n.js"),
      "@club": path.resolve(root, "../club-systems.js"),
      "@staffguide": path.resolve(root, "../staff-guide.js"),
      "@coach": path.resolve(root, "../coach-system.js"),
      "@training": path.resolve(root, "../training-system.js"),
      "@feedback": path.resolve(root, "../feedback-board.jsx"),
      "@stadium": path.resolve(root, "../stadium-progression.js"),
      "@save": path.resolve(root, "src/lib/save-keys.js"),
      "@beta": path.resolve(root, "src/BetaBanner.jsx"),
      "@locale": path.resolve(root, "src/lib/site-locale.js"),
      "@onlineneg": path.resolve(root, "src/lib/online-negotiations.js"),
      "@onlinematch": path.resolve(root, "src/lib/online-match.js"),
      "@onlinesession": path.resolve(root, "src/lib/online-session.js"),
    },
  },
});
