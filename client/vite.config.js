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
    },
  },
});
