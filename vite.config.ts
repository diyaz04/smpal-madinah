import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare(),
    VitePWA({
      registerType: "prompt",
      injectRegister: null,
      includeAssets: ["icons/*.png"],
      manifest: {
        name: "SMP Al-Madinah",
        short_name: "Al-Madinah",
        description: "Aplikasi administrasi SMP Al-Madinah",
        lang: "id",
        start_url: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#ffffff",
        theme_color: "#4f46e5",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [],
      },
      workbox: {
        navigateFallback: "/offline.html",
        navigateFallbackDenylist: [/^\/api\//],
        // @vladmandic/human (~1.5MB) hanya dipakai di halaman kiosk & Data
        // Wajah lewat dynamic import — dikeluarkan dari precache supaya TIDAK
        // ikut terunduh di install SW untuk semua pengguna, cukup di-cache
        // saat pertama kali benar-benar diminta (lihat runtimeCaching di bawah).
        // jsPDF + plugin-nya (termasuk html2canvas/purify bawaannya) sama —
        // cuma dipakai saat tombol "Export PDF" ditekan, bukan tiap buka app.
        globIgnores: ["**/human.esm-*.js", "**/jspdf*.js", "**/html2canvas-*.js", "**/purify.es-*.js"],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^\/files\/.*/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "smpam-files-cache",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Model wajah (~10MB) tidak pernah berubah per rilis — CacheFirst
            // supaya cuma diunduh sekali, bukan precache saat install SW.
            urlPattern: /^\/models\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "smpam-face-models-cache",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // Chunk @vladmandic/human sendiri — sama alasan dengan model di atas.
            urlPattern: /\/assets\/human\.esm-.*\.js$/,
            handler: "CacheFirst",
            options: {
              cacheName: "smpam-human-lib-cache",
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // jsPDF + dependensinya — cuma diunduh saat export PDF pertama kali dipakai.
            urlPattern: /\/assets\/(jspdf|html2canvas|purify\.es)-?.*\.js$/,
            handler: "CacheFirst",
            options: {
              cacheName: "smpam-pdf-lib-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": `${import.meta.dirname}/src/client`,
      "@shared": `${import.meta.dirname}/src/shared`,
    },
  },
});
