import { defineConfig } from "vitest/config";

// Config Vitest terpisah dari vite.config.ts: @cloudflare/vite-plugin
// mengelola siklus hidup server Vite sendiri dan bentrok kalau dipakai
// bersamaan dengan server yang dibuat Vitest untuk testing. Unit test di
// proyek ini murni testing modul TypeScript (parser jadwal), jadi plugin
// Cloudflare/PWA/React tidak diperlukan sama sekali di sini.
export default defineConfig({
  test: {
    environment: "node",
  },
});
