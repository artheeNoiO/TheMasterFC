import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    fs: { allow: [path.resolve(root, "..")] },
  },
  resolve: {
    alias: {
      "@game": path.resolve(root, "../football-manager.jsx"),
    },
  },
});
