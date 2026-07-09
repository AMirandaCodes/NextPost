import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// In docker compose the proxy target is the backend service; on a bare host it
// falls back to the published backend port.
const proxyTarget = process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8001";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": { target: proxyTarget, changeOrigin: true },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    clearMocks: true,
    setupFiles: "./src/test/setup.ts",
  },
});
